/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/ui/serverWidget', 'N/search', 'N/query', './moment.js', 'N/runtime', 'N/format'],
    (record, serverWidget, search, query, moment, runtime, format) => {

        const afterSubmit = (context) => {
            try {
                if (context.type !== context.UserEventType.EDIT) return;

                const newRecord = context.newRecord;
                const i_recID = newRecord.id;
                const i_recType = newRecord.type;
                const i_empID = newRecord.getValue('custrecord_hris_lve_employeename');
                const leave_type = newRecord.getValue('custrecord_hris_lve_leavetype');
                const leave_status = newRecord.getValue('custrecord_hris_lve_hrmsapprovalstatus');
                const cancel_check = newRecord.getValue('custrecord_hris_lve_cancellation');
                const appliy_encashment = newRecord.getValue('custrecord_hris_lve_applylveencashment');
                const omani_nonOmani = newRecord.getValue('custrecord_hris_lve_nation_omani_non');

                log.audit('apply Encash', appliy_encashment);
                log.debug('afterSubmit record', `i_recType: ${i_recType}, i_recID: ${i_recID}`);
                log.audit('leave_status', leave_status);

                // =====================================================
                // Standard Leave Encashment
                // =====================================================
                if (appliy_encashment === true && leave_status === '2' && cancel_check === false) {
                    let leave_from_date = newRecord.getValue('custrecord_hris_lve_fromdate');
                    leave_from_date = format.parse({ value: leave_from_date, type: format.Type.DATE });

                    const leave_get_month = leave_from_date.getMonth() + 1;
                    const leave_year = leave_from_date.getFullYear();
                    const leave_YearId = searchYear(leave_year);

                    const no_of_encash_days = parseFloat(newRecord.getValue('custrecord_hris_lve_noofencashmentdays')) || 0;
                    const payGroup = searchPaygroup(i_empID);
                    const encash_internal_id = getEncashCompId(payGroup);

                    const get_wage_date = searchWagePeriod(payGroup);
                    const w_Date = get_wage_date.split('#');
                    const end_date = w_Date[0];
                    const pay_Date = format.parse({ value: end_date, type: format.Type.DATE });

                    const wage_period = gethrisMonth(leave_get_month);
                    const wage_year_id = searchYear(leave_year);

                    const denominator = getDenominatorForLeaveEncashment(leave_type);
                    const Encash_amt_all_comps = getEncashAmount(i_empID, payGroup, encash_internal_id, omani_nonOmani);
                    log.audit('Encash All Comps', Encash_amt_all_comps);

                    const amount = (Encash_amt_all_comps / denominator) * no_of_encash_days;
                    log.audit('Encash Amount', amount);

                    const existingEncashment = searchExistingEncashment(
                        i_empID, payGroup, wage_period, wage_year_id, encash_internal_id, i_recID
                    );
                    log.audit('Existing Encashment', existingEncashment);

                    if (!existingEncashment) {
                        log.debug('Inside Encashcreat');
                        const rec_create = record.create({
                            type: 'customrecord_hris_monthlysalinput',
                            isDynamic: true
                        });

                        rec_create.setValue('custrecord_hris_mthsal_empname', i_empID);
                        rec_create.setValue('custrecord_hris_mthsal_paygroup', payGroup);
                        rec_create.setValue('custrecord_hris_mthsal_month', wage_period);
                        rec_create.setValue('custrecord_hris_mthsal_year', wage_year_id);
                        rec_create.setValue('custrecord_hris_mthsal_paycomponent', encash_internal_id);
                        rec_create.setValue('custrecord_hris_mthsal_leave_encashment', denominator);
                        rec_create.setValue('custrecord_hris_mthsal_paydt', pay_Date);
                        rec_create.setValue('custrecord_hris_mthsal_salaryamount', amount);
                        rec_create.setValue('custrecord_hris_mthsal_no_of_encashable', no_of_encash_days);
                        rec_create.setValue('custrecord_hris_mthsal_msileaverefno', i_recID);
                        rec_create.setValue('custrecord_hris_mthsal_remarks', 'This entry is auto created from Leave Application against Leave Encashment');

                        const rec_submit = rec_create.save();
                        log.debug('Encashment Record Created', `Record ID: ${rec_submit}`);
                    }
                }

                // =====================================================
                // Sequence 24 – Rotational / Special Encashment
                // =====================================================
                const seqNo = getLeaveConfigSequence(leave_type);
                const leaveBalance = newRecord.getValue('custrecord_hris_lve_leavebalance');

                if (seqNo == '24' && leave_status == '2') {
                    let leaveFromDate = newRecord.getValue('custrecord_hris_lve_expectedresumebackdt');
                    leaveFromDate = format.parse({ value: leaveFromDate, type: format.Type.DATE });

                    const leaveMonth = leaveFromDate.getMonth() + 1;
                    const leaveYear = leaveFromDate.getFullYear();
                    const leaveYearId = searchYear(leaveYear);

                    const payGroup = searchPaygroup(i_empID);
                    const encashInternalId = getEncashCompId(payGroup);
                    log.debug('Encash Internal ID', encashInternalId);

                    const encashAmount = getEncashAmount(i_empID, payGroup, encashInternalId);
                    log.debug('Encash Amount', encashAmount);

                    const denominator = getDenominatorForLeaveEncashment(leave_type);
                    const amount = (parseFloat(encashAmount) / parseFloat(denominator)) * parseFloat(leaveBalance);
                    log.debug('Calculated Amount', amount);

                    const wagePeriod = gethrisMonth(leaveMonth);
                    const wageYearId = leaveYearId;
                    const payDate = getLastDayOfMonth(leaveFromDate);

                    const leaveBalanceSearch = searchLeaveBalanceRecord(i_empID, leave_type);
                    if (leaveBalanceSearch) {
                        record.submitFields({
                            type: 'customrecord_hris_leavebalance',
                            id: leaveBalanceSearch.id,
                            values: { 'custrecord_hris_lvbal_encashment_msi': true }
                        });
                    }

                    createMonthlySalaryRecord(
                        i_empID, payGroup, wagePeriod, wageYearId, encashInternalId,
                        leaveBalance, denominator, payDate, amount, i_recID
                    );
                }

                // =====================================================
                // Sequence 6 – Rotational Leave MSI
                // =====================================================
                const leaveBalanceSearch = searchLeaveBalanceRecord(i_empID, leave_type);

                if (seqNo == 6 && leave_status == 2 && cancel_check == false && leaveBalanceSearch) {
                    processLeaveApplication(newRecord, leaveBalanceSearch);
                }

            } catch (e) {
                log.error('Error in afterSubmit', e);
            }
        };

        // =====================================================
        // Helper Functions
        // =====================================================

        const processLeaveApplication = (newRecord, leaveBalance) => {
            const i_recID = newRecord.id;
            const leaveBalCredited = leaveBalance.getValue('custrecord_hris_lvbal_leave_balance_cred') || 0;

            const expectedResumeDate = newRecord.getValue('custrecord_hris_lve_expectedresumebackdt');
            const empId = newRecord.getValue('custrecord_hris_lve_employeename');

            const payGroup = searchPaygroup(empId);
            const compId = getBasicCompId(payGroup);

            const wageMonth = gethrisMonth(expectedResumeDate.getMonth() + 1);
            const wageYearId = searchYear(expectedResumeDate.getFullYear());
            const lastDayOfMonth = new Date(expectedResumeDate.getFullYear(), expectedResumeDate.getMonth() + 1, 0);
            const payDate = format.format({ value: lastDayOfMonth, type: format.Type.DATE });

            const basicAmount = getBasic(payGroup, empId);
            const salaryAmount = (basicAmount / 30) * parseFloat(leaveBalCredited);

            createrotateMonthlySalaryRecord(
                i_recID, empId, payGroup, wageMonth, wageYearId,
                compId, payDate, salaryAmount, basicAmount, leaveBalCredited
            );
        };

        const createrotateMonthlySalaryRecord = (leaveRefId, empId, payGroup, month, year, compId, payDate, amount, basicAmt, noOfDays) => {
            const salaryRecord = record.create({
                type: 'customrecord_hris_monthlysalinput',
                isDynamic: true
            });

            salaryRecord.setValue('custrecord_hris_mthsal_empname', empId);
            salaryRecord.setValue('custrecord_hris_mthsal_paygroup', payGroup);
            salaryRecord.setValue('custrecord_hris_mthsal_month', month);
            salaryRecord.setValue('custrecord_hris_mthsal_year', year);
            salaryRecord.setValue('custrecord_hris_mthsal_paycomponent', compId);
            salaryRecord.setValue('custrecord_hris_mthsal_paydt', payDate);
            salaryRecord.setValue('custrecord_hris_mthsal_salaryamount', amount);
            salaryRecord.setValue('custrecord_hris_mthsal_fixedmonthlybasic', basicAmt);
            salaryRecord.setValue('custrecord_hris_mthsal_noofrtleavedays', noOfDays);
            salaryRecord.setValue('custrecord_hris_mthsal_msileaverefno', leaveRefId);
            salaryRecord.setValue('custrecord_hris_mthsal_remarks', 'Auto-created from leave application against rotational leave');

            salaryRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
        };

        const createMonthlySalaryRecord = (empID, payGroup, wagePeriod, wageYearId, encashInternalId, leaveBalance, denominator, payDate, amount, recID) => {
            const rec = record.create({
                type: 'customrecord_hris_monthlysalinput',
                isDynamic: true
            });

            rec.setValue('custrecord_hris_mthsal_empname', empID);
            rec.setValue('custrecord_hris_mthsal_paygroup', payGroup);
            rec.setValue('custrecord_hris_mthsal_month', wagePeriod);
            rec.setValue('custrecord_hris_mthsal_year', wageYearId);
            rec.setValue('custrecord_hris_mthsal_paycomponent', encashInternalId);
            rec.setValue('custrecord_hris_mthsal_annual_leave_bala', leaveBalance);
            rec.setValue('custrecord_hris_mthsal_leave_encashment', denominator);
            rec.setValue('custrecord_hris_mthsal_paydt', payDate);
            rec.setValue('custrecord_hris_mthsal_salaryamount', amount);
            rec.setValue('custrecord_hris_mthsal_no_of_encashable', leaveBalance);
            rec.setValue('custrecord_hris_mthsal_msileaverefno', recID);
            rec.setValue('custrecord_hris_mthsal_remarks', 'Auto created from Leave Application against Rotational Leave Encashment');

            const recSubmit = rec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            log.debug('Monthly Salary Record Created', recSubmit);
        };

        const getDenominatorForLeaveEncashment = (leave_type) => {
            const searchResult = search.lookupFields({
                type: 'customrecord_hris_leaveconfig',
                id: leave_type,
                columns: ['custrecord_hris_lveconfig_lveencashcal']
            });
            return searchResult.custrecord_hris_lveconfig_lveencashcal || 0;
        };

        const gethrisMonth = (monthParameter) => String(monthParameter);

        const searchExistingEncashment = (i_empID, payGroup, wage_period, wage_year_id, encash_internal_id, i_recID) => {
            const searchResult = search.create({
                type: 'customrecord_hris_monthlysalinput',
                filters: [
                    ['custrecord_hris_mthsal_empname', 'is', i_empID],
                    'AND', ['custrecord_hris_mthsal_paygroup', 'is', payGroup],
                    'AND', ['custrecord_hris_mthsal_month', 'is', wage_period],
                    'AND', ['custrecord_hris_mthsal_year', 'is', wage_year_id],
                    'AND', ['custrecord_hris_mthsal_paycomponent', 'is', encash_internal_id],
                    'AND', ['isinactive', 'is', false],
                    'AND', ['custrecord_hris_mthsal_msileaverefno', 'anyof', i_recID]
                ]
            }).run().getRange({ start: 0, end: 1 });

            return searchResult.length > 0;
        };

        const getLeaveConfigSequence = (Leave_type) => {
            try {
                const leavesequencesql = `select * from customrecord_hris_leaveconfig where id ='${Leave_type}' and isinactive ='F'`;
                log.debug('leavesequencesql', leavesequencesql);

                const leavesequencesqlrecords = query.runSuiteQL({ query: leavesequencesql }).asMappedResults();
                log.debug('leavesequencesqlrecords.length', leavesequencesqlrecords.length);

                if (leavesequencesqlrecords.length > 0) {
                    return leavesequencesqlrecords[0].custrecord_hris_lvecnfg_seqno;
                }
                return '';
            } catch (e) {
                log.debug('error in getLeaveConfigSequence : ' + e);
                return '';
            }
        };

        const searchPaygroup = (employee_name) => {
            const employeecompensql = `Select * from customrecord_hris_employee_compen_change 
                                       where custrecord_hris_empchange_employee_nam = ${employee_name} and isinactive ='F'`;
            log.debug('employeecompensql', employeecompensql);

            const records = getResult(employeecompensql);
            if (records.length > 0) {
                return records[0].custrecord_hris_empchange_emp_pay_pro_gp;
            }
            return null;
        };

        const searchWagePeriod = (pay_group) => {
            const wageperiodsql = `select * from customrecord_hris_wage_period_details 
                                   where custrecord_hris_pay_group = ${pay_group} and isinactive='F'`;
            log.debug('wageperiodsql', wageperiodsql);

            const records = getResult(wageperiodsql);
            if (records.length > 0) {
                const rec = records[0];
                return `${rec.custrecord_hris_end_date}#${rec.custrecord_hris_start_date}#${rec.custrecord_hris_month}#${rec.custrecord_hris_year}`;
            }
            return '###';
        };

        const searchYear = (year) => {
            year = year.toString();
            log.debug('Year in searchYear function', year);

            const searchResult = search.create({
                type: 'customlist_hris_year_master',
                filters: [
                    ['name', 'contains', year],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [search.createColumn({ name: 'internalid' })]
            }).run().getRange({ start: 0, end: 1 });

            if (searchResult.length > 0) {
                return searchResult[0].getValue('internalid');
            }
            return '';
        };

        const getBasic = (payGroup, empId) => {
            let salAmt = 0.00;

            const payCompSearch = search.create({
                type: 'customrecord_hris_payroll_component',
                filters: [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_hris_pay_process_group', 'anyof', payGroup],
                    'AND',
                    ['internalid', 'is', 1]
                ],
                columns: ['internalid']
            }).run().getRange({ start: 0, end: 1000 });

            if (payCompSearch) {
                payCompSearch.forEach((result) => {
                    const compId = result.getValue('internalid');

                    const edcSearch = search.create({
                        type: 'customrecord_hris_employee_compen_change',
                        filters: [
                            ['custrecord_hris_empchange_employee_nam', 'anyof', empId],
                            'AND',
                            ['custrecord_hris_employee_data_change.custrecord_hris_cde_payroll_component', 'anyof', compId]
                        ],
                        columns: [
                            'custrecord_hris_empchange_employee_nam',
                            { name: 'custrecord_hris_cde_monthly', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' },
                            { name: 'custrecord_hris_cde_process_group', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' }
                        ]
                    }).run().getRange({ start: 0, end: 1000 });

                    if (edcSearch) {
                        edcSearch.forEach((edcResult) => {
                            const payGrpCompDetail = edcResult.getValue({
                                name: 'custrecord_hris_cde_monthly',
                                join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE'
                            });
                            salAmt += parseFloat(payGrpCompDetail) || 0;
                        });
                    }
                });
            }
            return salAmt;
        };

        const getEncashAmount = (empName, processGrp, encashInternalId) => {
            let salAmt = 0.00;

            const searchComp = search.create({
                type: 'customrecord_hris_payroll_component',
                filters: [
                    ['custrecord_hris_pay_process_group', 'anyof', processGrp],
                    'AND',
                    ['custrecord_hris__sequence_no_', 'equalto', 40]
                ],
                columns: ['internalid']
            }).run().getRange({ start: 0, end: 1 });

            if (searchComp.length > 0) {
                const compIntID = searchComp[0].getValue('internalid');

                if (encashInternalId == compIntID) {
                    const payCompSearch = search.create({
                        type: 'customrecord_hris_payroll_component',
                        filters: [
                            ['isinactive', 'is', 'F'],
                            'AND',
                            ['custrecord_hris_pay_process_group', 'anyof', processGrp],
                            'AND',
                            ['custrecord_hris_consider_for_encashment', 'is', 'T']
                        ],
                        columns: ['internalid']
                    }).run().getRange({ start: 0, end: 1000 });

                    if (payCompSearch.length > 0) {
                        payCompSearch.forEach((result) => {
                            const compId = result.getValue('internalid');

                            const edcSearch = search.create({
                                type: 'customrecord_hris_employee_compen_change',
                                filters: [
                                    ['custrecord_hris_empchange_employee_nam', 'anyof', empName],
                                    'AND',
                                    ['custrecord_hris_employee_data_change.custrecord_hris_cde_payroll_component', 'anyof', compId]
                                ],
                                columns: [
                                    { name: 'custrecord_hris_cde_monthly', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' }
                                ]
                            }).run().getRange({ start: 0, end: 1000 });

                            if (edcSearch.length > 0) {
                                edcSearch.forEach((edcResult) => {
                                    const payGrpCompDetail = edcResult.getValue({
                                        name: 'custrecord_hris_cde_monthly',
                                        join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE'
                                    });
                                    salAmt += parseFloat(payGrpCompDetail) || 0;
                                });
                            }
                        });
                    }
                    salAmt = parseFloat(salAmt.toFixed(3));
                }
            }
            return salAmt;
        };

        const searchLeaveBalance = (employee, leaveType) => {
            let bal = 0.00;
            const leaveBalanceSearch = search.create({
                type: 'customrecord_hris_leavebalance',
                filters: [
                    ['custrecord_hris_lvbal_employee_name', 'anyof', employee],
                    'AND',
                    ['custrecord_hris_lvbal_leave_type', 'anyof', leaveType]
                ],
                columns: [
                    'custrecord_hris_lvbal_available_leave_ba',
                    'custrecord_hris_lvbal_encashable_days'
                ]
            }).run().getRange({ start: 0, end: 1 });

            if (leaveBalanceSearch.length > 0) {
                const annual = leaveBalanceSearch[0].getValue('custrecord_hris_lvbal_available_leave_ba') || 0;
                const encash = leaveBalanceSearch[0].getValue('custrecord_hris_lvbal_encashable_days') || 0;
                bal = parseFloat(annual) + parseFloat(encash);
            }
            return bal;
        };

        const searchLeaveBalanceRecord = (employee, leaveType) => {
            const results = search.create({
                type: 'customrecord_hris_leavebalance',
                filters: [
                    ['custrecord_hris_lvbal_employee_name', 'anyof', employee],
                    'AND',
                    ['custrecord_hris_lvbal_leave_type', 'anyof', leaveType]
                ],
                columns: ['internalid', 'custrecord_hris_lvbal_leave_balance_cred']
            }).run().getRange({ start: 0, end: 1 });

            return results.length > 0 ? results[0] : null;
        };

        const getEncashCompId = (id) => {
            const payrollComponentSearch = search.create({
                type: 'customrecord_hris_payroll_component',
                filters: [
                    ['custrecord_hris_pay_process_group', 'anyof', id],
                    'AND',
                    ['custrecord_hris__sequence_no_', 'equalto', '40']
                ],
                columns: [
                    'internalid',
                    search.createColumn({ name: 'custrecord_hris_component_short_name', sort: search.Sort.ASC }),
                    'custrecord_hris__sequence_no_'
                ]
            }).run().getRange({ start: 0, end: 1 });

            if (payrollComponentSearch.length > 0) {
                return payrollComponentSearch[0].id;
            }
            return id;
        };

        const getBasicCompId = (payGroup) => {
            // Placeholder – implement if needed (usually sequence 1 or basic pay component)
            return 1;
        };

        const getLastDayOfMonth = (date) => {
            return new Date(date.getFullYear(), date.getMonth() + 1, 0);
        };

        const getResult = (pSQL) => {
            return query.runSuiteQL({ query: pSQL }).asMappedResults();
        };

        return {
            afterSubmit
        };
    });