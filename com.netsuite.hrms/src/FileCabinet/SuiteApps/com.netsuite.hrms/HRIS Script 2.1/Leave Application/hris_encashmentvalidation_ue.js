/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
var QUERY;
define(['N/record', 'N/ui/serverWidget', 'N/search', 'N/query', './moment.js', 'N/runtime','N/format'], function (record, serverWidget, search, query, moment, runtime,format) {
    QUERY = query;


    function afterSubmit(context) {
        try {
            if (context.type == context.UserEventType.EDIT) {


                var newRecord = context.newRecord;
                var i_recID = newRecord.id;
                var i_recType = newRecord.type;
                var i_empID = newRecord.getValue('custrecord_hris_lve_employeename');
                var leave_type = newRecord.getValue('custrecord_hris_lve_leavetype');
                var leave_status = newRecord.getValue('custrecord_hris_lve_hrmsapprovalstatus');
                var cancel_check = newRecord.getValue('custrecord_hris_lve_cancellation');
                var appliy_encashment = newRecord.getValue('custrecord_hris_lve_applylveencashment');
                log.audit('apply Encash',appliy_encashment);
                var omani_nonOmani = newRecord.getValue('custrecord_hris_lve_nation_omani_non');


                log.debug('afterSubmit record', 'i_recType: ' + i_recType + ', i_recID: ' + i_recID);
                log.audit("leave_status",leave_status);
                if (appliy_encashment === true && leave_status === '2' && cancel_check === false) {
                    var leave_from_date = newRecord.getValue('custrecord_hris_lve_fromdate');
                    leave_from_date = format.parse({ value: leave_from_date, type: format.Type.DATE });
                    var leave_get_month = leave_from_date.getMonth() + 1;
                    var leave_year = leave_from_date.getFullYear();
                    var leave_YearId = searchYear(leave_year);
                    var to_Date = newRecord.getValue('custrecord_hris_lve_todate');
                    var no_of_encash_days = parseFloat(newRecord.getValue('custrecord_hris_lve_noofencashmentdays'));
                    var payGroup = searchPaygroup(i_empID);
                    var encash_internal_id = getEncashCompId(payGroup);
                    var get_wage_date = searchWagePeriod(payGroup);
                    var w_Date = get_wage_date.split('#');
                    var end_date = w_Date[0];
                    var start_date = w_Date[1];
                   // var pay_Date = format.format({ value: new Date(leave_year, leave_get_month, 0), type: format.Type.DATE });
                    var pay_Date=format.parse({ value: end_date, type: format.Type.DATE });
                    var wage_period = gethrisMonth(leave_get_month);
                    var wage_year_id = searchYear(leave_year);
                    var leave_balance = searchLeaveBalance(i_empID, leave_type);

                    var denominator = getDenominatorForLeaveEncashment(leave_type);
                    var Encash_amt_all_comps = getEncashAmount(i_empID, payGroup, encash_internal_id, omani_nonOmani);
                    log.audit('Encash All Comps',Encash_amt_all_comps);
                    var amount = (Encash_amt_all_comps / denominator) * no_of_encash_days;
                    log.audit('Encash Amount',amount);

                    var existingEncashment = searchExistingEncashment(i_empID, payGroup, wage_period, wage_year_id, encash_internal_id, i_recID);
                    log.audit('Existing Encashment',existingEncashment);
                    if (!existingEncashment) {
                        log.debug("Inside Encashcreat")
                        var rec_create = record.create({ type: 'customrecord_hris_monthlysalinput', isDynamic: true });
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
                        var rec_submit = rec_create.save();
                        log.debug('Encashment Record Created', 'Record ID: ' + rec_submit);
                    }
                }
                var seqNo =getLeaveConfigSequence(leave_type);
                var leaveBalance = newRecord.getValue('custrecord_hris_lve_leavebalance');

                if (seqNo == '24' && leave_status == '2') {
                    var leaveFromDate = newRecord.getValue('custrecord_hris_lve_expectedresumebackdt');
                    leaveFromDate = format.parse({ value: leaveFromDate, type: format.Type.DATE });
                    var leaveMonth = leaveFromDate.getMonth() + 1;
                    var leaveYear = leaveFromDate.getFullYear();
                    var leaveYearId = searchYear(leaveYear);

                    var payGroup = search_paygroup(i_empID);
                    var encashInternalId = getEncashCompId(payGroup);
                    log.debug('Encash Internal ID', encashInternalId);

                    var encashAmount = getEncashAmount(i_empID, payGroup, encashInternalId);
                    log.debug('Encash Amount', encashAmount);

                    var denominator = getLeaveEncashmentDenominator(leave_type);
                    var amount = (parseFloat(encashAmount) / parseFloat(denominator)) * parseFloat(leaveBalance);
                    log.debug('Calculated Amount', amount);

                    var wagePeriod = gethrisMonth(leaveMonth);
                    var wageYearId = leaveYearId;
                    var payDate = getLastDayOfMonth(leaveFromDate);
                    
                    var leaveBalanceSearch = searchLeaveBalance(i_empID, leave_type);
                    if (leaveBalanceSearch) {
                        var leaveBalanceId = leaveBalanceSearch.id;
                        record.submitFields({
                            type: 'customrecord_hris_leavebalance',
                            id: leaveBalanceId,
                            values: { 'custrecord_hris_lvbal_encashment_msi': true }
                        });
                    }
                    
                    createMonthlySalaryRecord(i_empID, payGroup, wagePeriod, wageYearId, encashInternalId, leaveBalance, denominator, payDate, amount, i_recID);
                }
                // rotational create MSI
                var leaveBalanceSearch = searchLeaveBalance(i_empID, leave_type);

                if ((seqNo == 6) && leaveStatus == 2 && cancelCheck == false && leaveBalanceSearch.length > 0) {
                    processLeaveApplication(newRecord, leaveBalanceSearch[0]);
                }
            
            }
        } catch (e) {
            log.error('Error in afterSubmit', e);
        }
    }
    function searchLeaveBalanceold(empId, leaveType) {
        return search.create({
            type: 'customrecord_hris_leavebalance',
            filters: [
                ['custrecord_hris_lvbal_employee_name.internalid', 'anyof', empId],
                'AND',
                ['custrecord_hris_lvbal_employee_name.isinactive', 'is', 'F'],
                'AND',
                ['custrecord_hris_lvbal_leave_type', 'anyof', leaveType],
                'AND',
                ['custrecord_hris_rt_basic_pay_msi_created', 'is', 'F']
            ],
            columns: ['internalid', 'custrecord_hris_lvbal_leave_balance_cred']
        }).run().getRange({ start: 0, end: 1 });
    }

    function processLeaveApplication(newRecord, leaveBalance) {
        var i_recID = newRecord.id;
        var leaveBalanceId = leaveBalance.id;
        var leaveBalCredited = leaveBalance.getValue('custrecord_hris_lvbal_leave_balance_cred') || 0;
        
        var leaveFromDate = newRecord.getValue('custrecord_hris_lve_fromdate');
        var expectedResumeDate = newRecord.getValue('custrecord_hris_lve_expectedresumebackdt');

        var payGroup = searchPayGroup(newRecord.getValue('custrecord_hris_lve_employeename'));
        var compId = getBasicCompId(payGroup);
        var wagePeriodData = searchWagePeriod(payGroup);

        var wageMonth = getHRISMonth(expectedResumeDate.getMonth() + 1);
        var wageYearId = searchYear(expectedResumeDate.getFullYear());
        var lastDayOfMonth = new Date(expectedResumeDate.getFullYear(), expectedResumeDate.getMonth() + 1, 0);
        var payDate = format.format({ value: lastDayOfMonth, type: format.Type.DATE });

        var basicAmount = getBasic(payGroup, newRecord.getValue('custrecord_hris_lve_employeename'));
        var salaryAmount = (basicAmount / 30) * parseFloat(leaveBalCredited);
        
        createrotateMonthlySalaryRecord(newRecord.id, newRecord.getValue('custrecord_hris_lve_employeename'), payGroup, wageMonth, wageYearId, compId, payDate, salaryAmount, basicAmount, leaveBalCredited);
    }
    function createrotateMonthlySalaryRecord(leaveRefId, empId, payGroup, month, year, compId, payDate, amount, basicAmt, noOfDays) {
        var salaryRecord = record.create({ type: 'customrecord_hris_monthlysalinput', isDynamic: true });
        
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
    }
    function createMonthlySalaryRecord(empID, payGroup, wagePeriod, wageYearId, encashInternalId, leaveBalance, denominator, payDate, amount, recID) {
        var rec = record.create({ type: 'customrecord_hris_monthlysalinput', isDynamic: true  });
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
        var recSubmit = rec.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });
        log.debug('Monthly Salary Record Created', recSubmit);
    }
    function getDenominatorForLeaveEncashment(leave_type) {
        var searchResult = search.lookupFields({
            type: 'customrecord_hris_leaveconfig',
            id: leave_type,
            columns: ['custrecord_hris_lveconfig_lveencashcal']
        });
        return searchResult.custrecord_hris_lveconfig_lveencashcal || 0;
    }
    function gethrisMonth(monthParameter) {
        if (monthParameter == 1) {
            return '1';
        } else if (monthParameter == 2) {
            return '2';
        } else if (monthParameter == 3) {
            return '3';
        } else if (monthParameter == 4) {
            return '4';
        } else if (monthParameter == 5) {
            return '5';
        } else if (monthParameter == 6) {
            return '6';
        } else if (monthParameter == 7) {
            return '7';
        } else if (monthParameter == 8) {
            return '8';
        } else if (monthParameter == 9) {
            return '9';
        } else if (monthParameter == 10) {
            return '10';
        } else if (monthParameter == 11) {
            return '11';
        } else if (monthParameter == 12) {
            return '12';
        }
    }
    function searchExistingEncashment(i_empID, payGroup, wage_period, wage_year_id, encash_internal_id, i_recID) {
        var searchResult = search.create({
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
    }
    function getLeaveConfigSequence(Leave_type) {
        try {

            var leavesequencesql = "select * from customrecord_hris_leaveconfig where id ='" + Leave_type + "' and isinactive ='F'"
            log.debug("leavesequencesql", leavesequencesql);
            var queryResult = query.runSuiteQL({
                query: leavesequencesql,
            });
            var leavesequencesqlrecords = queryResult.asMappedResults();


            log.debug(" leavesequencesqlrecords.length", leavesequencesqlrecords.length);
            if (leavesequencesqlrecords.length > 0) {


                var sequence_no = leavesequencesqlrecords[0].custrecord_hris_lvecnfg_seqno;
            }
            return sequence_no;
        }
        catch (e) {
            log.debug("error in get_sequence_no : " + e);

        }

    }

    function searchPaygroup(employee_name) {

        var employeecompensql = "Select * from customrecord_hris_employee_compen_change where custrecord_hris_empchange_employee_nam = " + employee_name + "  and isinactive ='F'";
        log.debug('employeecompensql', employeecompensql);
       
        var wageperiodsqlrecords = getResult(employeecompensql);

        if (wageperiodsqlrecords.length > 0) {
            var rec = wageperiodsqlrecords[0];

            var s_paygroup = rec.custrecord_hris_empchange_emp_pay_pro_gp;
        }

        return s_paygroup
    }

    function searchWagePeriod(pay_group) {

        var wageperiodsql = " select * from customrecord_hris_wage_period_details \
                           where custrecord_hris_pay_group = "+ pay_group + " and isinactive='F'"

        log.debug('wageperiodsql',wageperiodsql);
        var wageperiodsqlrecords = getResult(wageperiodsql);

        if (wageperiodsqlrecords.length > 0) {
            var rec = wageperiodsqlrecords[0];
            var WagePeriod_EndDate = rec.custrecord_hris_end_date;

            var start_date = rec.custrecord_hris_start_date;

            var month = rec.custrecord_hris_month;

            var year = rec.custrecord_hris_year;

        }//End of if(searchResult !=null)
        return WagePeriod_EndDate + "#" + start_date + "#" + month + "#" + year;
    }

    function searchPayComp(i_paygroup_earn) {
        var PTID;
        var employeecompensql = "Select * from customrecord_hris_payroll_component \
             where custrecord_hris_pay_process_group = " + i_paygroup_earn + " \
             and custrecord_hris__sequence_no_=24  and isinactive ='F'";
        log.debug('employeecompensql', employeecompensql);
        
        var employeecompensqlrecords = getResult(employeecompensql);

        if (employeecompensqlrecords.length > 0) {
            var rec = employeecompensqlrecords[0];

            PTID = rec.id;
        }

        return PTID;
    }//sea

    function searchYear(year) {
        var yearVal = '';
        year = year.toString();
        log.debug('Year in searchYear function', year);

        // Create the search filters
        var filters = [
            ['name', 'contains', year],
            'AND',
            ['isinactive', 'is', 'F']
        ];

        // Create the search columns
        var columns = [
            search.createColumn({ name: 'internalid' })
        ];

        // Perform the search
        var searchResult = search.create({
            type: 'customlist_hris_year_master',
            filters: filters,
            columns: columns
        }).run().getRange({ start: 0, end: 1 });

        // Check if there are results
        if (searchResult.length > 0) {
            yearVal = searchResult[0].getValue('internalid');
        }

        log.debug('yearVal in SearchYear Func', yearVal);
        return yearVal;
    }
    function getBasic(payGroup, empId) {
        var salAmt = 0.00;
        
        var payCompSearch = search.create({
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
            payCompSearch.forEach(function (result) {
                var compId = result.getValue('internalid');
                log.debug('payCompSearch compId', compId);
                
                var edcSearch = search.create({
                    type: 'customrecord_hris_employee_compen_change',
                    filters: [
                        ['custrecord_hris_empchange_employee_nam', 'anyof', empId],
                        'AND',
                        ['custrecord_hris_employee_data_change.custrecord_hris_cde_payroll_component', 'anyof', compId]
                    ],
                    columns: [
                        'custrecord_hris_empchange_employee_nam',
                        { name: 'custrecord_hris_cde_monthly', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' },
                        { name: 'custrecord_hris_cde_process_group', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' },
                        { name: 'internalid', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' }
                    ]
                }).run().getRange({ start: 0, end: 1000 });
                
                if (edcSearch) {
                    edcSearch.forEach(function (edcResult) {
                        var payGrpCompDetail = edcResult.getValue({ name: 'custrecord_hris_cde_monthly', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' });
                        var compValue = edcResult.getValue({ name: 'custrecord_hris_cde_process_group', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' });
                        
                        log.debug('compValue', compValue);
                        log.debug('payGrpCompDetail', payGrpCompDetail);
                        
                        salAmt += parseFloat(payGrpCompDetail) || 0;
                    });
                }
            });
        }
        
        return salAmt;
    }
    function getEncashAmount(empName, processGrp, encashInternalId) {
        var compType = encashInternalId;
        var salAmt = 0.00;

        var searchComp = search.create({
            type: 'customrecord_hris_payroll_component',
            filters: [
                ['custrecord_hris_pay_process_group', 'anyof', processGrp],
                'AND',
                ['custrecord_hris__sequence_no_', 'equalto', 40]
            ],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });

        if (searchComp.length > 0) {
            var compIntID = searchComp[0].getValue('internalid');

            if (compType == compIntID) {
                log.debug('inside LeaveType condition');

                var payCompSearch = search.create({
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
                    payCompSearch.forEach(function (result) {
                        var compId = result.getValue('internalid');

                        var edcSearch = search.create({
                            type: 'customrecord_hris_employee_compen_change',
                            filters: [
                                ['custrecord_hris_empchange_employee_nam', 'anyof', empName],
                                'AND',
                                ['custrecord_hris_employee_data_change.custrecord_hris_cde_payroll_component', 'anyof', compId]
                            ],
                            columns: [
                                'custrecord_hris_empchange_employee_nam',
                                { name: 'custrecord_hris_cde_monthly', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' },
                                { name: 'custrecord_hris_cde_process_group', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' },
                                { name: 'internalid', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' }
                            ]
                        }).run().getRange({ start: 0, end: 1000 });

                        if (edcSearch.length > 0) {
                            edcSearch.forEach(function (edcResult) {
                                var payGrpCompDetail = edcResult.getValue({ name: 'custrecord_hris_cde_monthly', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' });
                                var compValue = edcResult.getValue({ name: 'custrecord_hris_cde_process_group', join: 'CUSTRECORD_HRIS_EMPLOYEE_DATA_CHANGE' });

                                log.debug('comp_value', compValue);
                                log.debug('payGrp_Comp_Detail', payGrpCompDetail);

                                salAmt += parseFloat(payGrpCompDetail) || 0;
                            });
                        }
                    });
                }
                salAmt = salAmt.toFixed(3);
            }
        }
        return salAmt;
    }
    function searchLeaveBalance(employee, leaveType) {
        var bal = 0.00;
        var leaveBalanceSearch = search.create({
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
            var annual = leaveBalanceSearch[0].getValue('custrecord_hris_lvbal_available_leave_ba') || 0;
            var encash = leaveBalanceSearch[0].getValue('custrecord_hris_lvbal_encashable_days') || 0;
            bal = parseFloat(annual) + parseFloat(encash);
        }
        return bal;
    }

    function getEncashCompId(id) {
        var payrollComponentSearch = search.create({
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
            id = payrollComponentSearch[0].id;
        }
        return id;
    }

    function getResult(pSQL) {
        // log.debug("QUERY", pSQL);
        var queryResults = QUERY.runSuiteQL({
            query: pSQL
        });
        var records = queryResults.asMappedResults();
        return records;
    }

    return {
        afterSubmit: afterSubmit
    };

});
