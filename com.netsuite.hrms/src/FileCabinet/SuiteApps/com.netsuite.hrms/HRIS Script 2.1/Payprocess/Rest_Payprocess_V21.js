
/**
 * @NApiVersion 2.1
 * @NScriptType RESTlet
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search', 'N/query', 'N/log', 'N/error', 'N/format', 'N/runtime'],
    function(record, search, query, log, error, format, runtime) {

    const CUSTOM_RECORDS = {
        PRE_PAY_PROCESS: 'customrecord_hris_pre_pay_process_record',
        PAY_PROCESS: 'customrecord_hris_pay_process',
        EMP_COMP_CHANGE: 'customrecord_hris_employee_compen_change',
        PAYROLL_COMPONENT: 'customrecord_hris_payroll_component',
        UNPAID_LEAVE: 'customrecord_hris_unpaid_leave_entry',
        UNPAID_ARREAR: 'customrecord_hris_unpaid_arrear_entry',
        MONTHLY_SAL: 'customrecord_hris_monthlysalinput',
        SALARY_ADJ: 'customrecord_hris_salary_adjustment_entr',
        WAGE_PERIOD: 'customrecord_hris_wage_period_details',
        LOAN_APP: 'customrecord_hris_empchange_loan_applicn',
        LOAN_CHILD: 'customrecord_hris_loan_applicat_child',
        LOAN_MASTER: 'customrecord_hris_loan_master',
        GLOBAL_PARAM: 'customrecord_hris_global_parameter',
        COMPONENT_TYPE: 'customrecord_hris_component_type',
        PT_SLAB: 'customrecord_hris_pt_slap_master',
        INCOME_TAX_SLAB: 'customrecord_hris_income_tax_slab',
        SS_FIN_YEAR: 'customrecord_hris_ss_financial_year',
        MONTHLY_ATTENDANCE: 'customrecord_hrms_monthlyattendance',
        LEAVE_SETTLEMENT: 'customrecord_hrms_leavesettlement',
        YEAR_MASTER: 'customlist_hris_year_master'
    };

    function post(datain) {
        try {
            log.debug('POST Request', JSON.stringify(datain));

            var prePayProcessId = datain.Record_id;
            if (!prePayProcessId) {
                return JSON.stringify({ error: 'Record_id is required' });
            }

            var prePayRec = record.load({
                type: CUSTOM_RECORDS.PRE_PAY_PROCESS,
                id: prePayProcessId
            });

            var checked = prePayRec.getValue('custrecord_hris_pre_pay_pr_checked');
            if (checked !== 'F') {
                return JSON.stringify({ message: 'Record already processed' });
            }

            var empId = prePayRec.getValue('custrecord_hris_pre_pay_pr_employee_name');
            var payGroup = prePayRec.getValue('custrecord_hris_pre_pay_pr_pay_group');
            var wageMonth = prePayRec.getValue('custrecord_hris_pre_pay_pr_wage_month');
            var remarks = prePayRec.getValue('custrecord_hris_pre_pay_pr_remarks');

            // Get wage period details
            var wagePeriodId = getWagePeriodNo(wageMonth);
            var wagePeriodData = getWagePeriodYear(payGroup, wagePeriodId);
            var periodParts = wagePeriodData.split('#');
            var getYear = periodParts[0];
            var year = periodParts[1];
            var wEndDate = periodParts[2];

            // Get wage period month days
            var monthDays = getMonthDays(wageMonth);

            // Get SS and IT year
            var ssItYearData = searchSSandITYr(getYear);
            var ssItParts = ssItYearData.split('#');
            var ssStartMonth = ssItParts[0];
            var ssEndMonth = ssItParts[1];

            // Get employee details
            var empRec = record.load({
                type: 'employee',
                id: empId
            });

            var empCode = empRec.getValue('employeeid');
            var dept = empRec.getValue('department');
            var company = empRec.getValue('subsidiary');
            var hireDateStr = empRec.getValue('hiredate');

            // Get employee custom fields
            var esicApplicable = empRec.getValue('custentity_hris_isesiapplicable');
            var pfApplicable = empRec.getValue('custentity_hris_pfapplicable');
            var ptLoc = empRec.getValue('custentity_hris_empptlocation');
            var subDept = empRec.getValue('custentity_hris_empsubdepartment');
            var location = empRec.getValue('custentity_hris_empdlocation_new');

            // Initialize pay processing
            deleteRecInitial(empId, payGroup, wagePeriodId, 1, getYear);

            // Get arrear month days
            var arrearMonthDays = getArrearMonthDays(empId, wagePeriodId, getYear);

            // Get paid days
            var paidDays = getPaidDays(empId, wagePeriodId, monthDays, getYear);

            // Get LOP days
            var lopDaysFinal = getLOPDaysFinal(empId, wagePeriodId, getYear);

            // Get OT hours
            var otHours = getOTHours(empId, payGroup, wagePeriodId, getYear);

            // Process earning components
            var empEarnings = getEmployeeEarningComp(empId, empRec.getText('internalid'), empCode, payGroup, 
                wagePeriodId, monthDays, arrearMonthDays, hireDateStr, wEndDate, ssStartMonth, ssEndMonth, 
                getYear, dept, company, 1, empId, paidDays, lopDaysFinal, year, esicApplicable, pfApplicable, 
                'F', ptLoc, subDept, location, otHours, remarks);

            var earningParts = empEarnings.split('#');
            var actualEarning = earningParts[0];
            var grossEarn = earningParts[1];
            var componentType = earningParts[2];
            var paidDaysCalc = earningParts[3];
            var ssGross = earningParts[4];
            var itGross = earningParts[5];

            // Process deduction components
            var empDeductions = getEmployeeDeductionComp(empId, empRec.getText('internalid'), empCode, 
                payGroup, wagePeriodId, monthDays, arrearMonthDays, getYear, dept, company, 1, empId, 
                paidDays, lopDaysFinal, year, esicApplicable, ptLoc, wEndDate, subDept, location, otHours, remarks);

            var dedParts = empDeductions.split('#');
            var actualDeduction = dedParts[0];
            var grossDeduction = dedParts[1];
            var dedComponentType = dedParts[2];

            // Process other components
            getEmployeeOtherComp(wEndDate, empId, empRec.getText('internalid'), empCode, payGroup, 
                wagePeriodId, monthDays, arrearMonthDays, getYear, dept, company, 1, empId, paidDaysCalc, 
                lopDaysFinal, year, esicApplicable, ptLoc, subDept, location, otHours, remarks);

            // Get monthly variable pay
            var monthlyVarData = getMonthlyVariableComp(empId, empId, empCode, hireDateStr, payGroup, 
                wagePeriodId, wEndDate, empEarnings, empDeductions, getYear, dept, company, 1, empId, 
                paidDays, lopDaysFinal, year, esicApplicable, ptLoc, subDept, location, otHours, remarks);

            // Process loan components
            var searchLoanIds = searchLoanEntry(empId, wagePeriodId, getYear);
            createLoanComp(wEndDate, empId, empRec.getText('internalid'), empCode, 1, payGroup, empId, 
                dept, wagePeriodId, company, '', componentType, searchLoanIds, lopDaysFinal, paidDays, 
                getYear, esicApplicable, ptLoc, year, subDept, location, otHours, remarks);

            // Process PF components
            if (pfApplicable === 'T') {
                createPFComp(empId, empRec.getText('internalid'), empCode, 1, payGroup, empId, dept, 
                    wagePeriodId, company, '', componentType, 0, 0, lopDaysFinal, paidDays, getYear, 
                    esicApplicable, ptLoc, subDept, location, otHours, remarks);
            }

            // Process ESIC components
            if (esicApplicable === 'T') {
                createESICComp(empId, empRec.getText('internalid'), empCode, 1, payGroup, empId, dept, 
                    wagePeriodId, company, '', componentType, 0, 0, 0, lopDaysFinal, paidDays, getYear, 
                    esicApplicable, ptLoc, subDept, location, otHours, remarks);
            }

            // Get gross earning and deduction
            var earningTotal = getEarningGross(wEndDate, empRec.getText('internalid'), empCode, payGroup, 
                wagePeriodId, empId, componentType, getYear, dept, company, 1, empId, paidDays, 
                lopDaysFinal, esicApplicable, ptLoc, subDept, location, otHours, remarks);

            var deductionTotal = getDeductionGross(wEndDate, empRec.getText('internalid'), empCode, payGroup, 
                wagePeriodId, empId, dedComponentType, getYear, dept, company, 1, empId, paidDays, 
                lopDaysFinal, esicApplicable, ptLoc, subDept, location, otHours, remarks);

            // Get net pay
            getNetPay(wEndDate, empRec.getText('internalid'), empId, empCode, payGroup, wagePeriodId, 
                earningTotal, deductionTotal, getYear, dept, company, 1, empId, paidDays, lopDaysFinal, 
                esicApplicable, ptLoc, subDept, location, otHours, remarks);

            // Mark pre-pay process as completed
            prePayRec.setValue('custrecord_hris_pre_pay_pr_status', 'Completed');
            prePayRec.setValue('custrecord_hris_pre_pay_pr_checked', 'T');
            prePayRec.save();

            return JSON.stringify({
                success: true,
                message: 'Pay process completed successfully',
                prePayProcessId: prePayProcessId,
                actualEarning: actualEarning,
                grossEarning: grossEarn,
                actualDeduction: actualDeduction,
                grossDeduction: grossDeduction,
                netPay: (parseFloat(earningTotal) - parseFloat(deductionTotal))
            });

        } catch (e) {
            log.error('Error in POST', e.message);
            return JSON.stringify({ error: e.message, stack: e.stack });
        }
    }

    // ============== HELPER FUNCTIONS ==============

    function getEmployeeEarningComp(empId, empNameTx, empCode, payGroup, wagePeriodId, monthDays, 
        arrearMonthDays, doj, wEndDate, ssStartMonth, ssEndMonth, getYear, dept, company, 
        processType, entityId, paidDays, lopDaysFinal, year, esicApplicable, ptApplicable, 
        pfApplicable, ptLoc, subDept, location, otHours, remarks) {
        
        var actualGrossPay = 0.00;
        var grossEarning = 0.00;
        var actGrossPay = 0.00;
        var componentTypeGlobal = '';
        var ssGrossTotal = 0.00;
        var itGrossTotal = 0.00;
        var wagePeriod = parseInt(wagePeriodId);

        try {
            var compensationSearch = search.create({
                type: CUSTOM_RECORDS.EMP_COMP_CHANGE,
                filters: [
                    ['custrecord_hris_empchange_emp_pay_pro_gp', 'is', payGroup],
                    'AND',
                    ['custrecord_hris_empchange_employee_nam', 'is', empId],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'custrecord_hris_employee_data_change',
                    search.createColumn({
                        name: 'custrecord_hris_cde_payroll_component',
                        join: 'custrecord_hris_employee_data_change'
                    }),
                    search.createColumn({
                        name: 'custrecord_hris_cde_monthly',
                        join: 'custrecord_hris_employee_data_change'
                    }),
                    search.createColumn({
                        name: 'custrecord_hris_cde_annually',
                        join: 'custrecord_hris_employee_data_change'
                    })
                ]
            });

            var results = compensationSearch.run().getRange(0, 1000);

            if (results.length > 0) {
                results.forEach(function(result) {
                    try {
                        var currentMonthly = parseFloat(result.getValue({
                            name: 'custrecord_hris_cde_monthly',
                            join: 'custrecord_hris_employee_data_change'
                        }) || 0);

                        var earnComponent = result.getValue({
                            name: 'custrecord_hris_cde_payroll_component',
                            join: 'custrecord_hris_employee_data_change'
                        });

                        if (currentMonthly > 0 && earnComponent) {
                            var compRec = record.load({
                                type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                                id: earnComponent
                            });

                            var componentType = compRec.getValue('custrecord_hris_payroll_component_type');
                            var accountCode = compRec.getValue('custrecord_hris_account_name');
                            componentTypeGlobal = componentType;

                            var lopAmt = 0.00;
                            var arrearAmt = 0.00;
                            var proRataAmt = 0.00;
                            var finalDifference = 0.00;

                            // LOP Check
                            if (compRec.getValue('custrecord_hris_loss_of_pay') === 'T') {
                                var lopDays = getLOPDays(empId, wagePeriod, currentMonthly, monthDays, getYear);
                                var lopParts = lopDays.split('#');
                                lopAmt = parseFloat(lopParts[0]) || 0;
                            }

                            // Arrear Check
                            if (compRec.getValue('custrecord_hris_arrears') === 'T') {
                                var arrearData = getArrearDays(empId, currentMonthly, arrearMonthDays, wagePeriod, getYear);
                                var arrearParts = arrearData.split('#');
                                arrearAmt = Math.abs(parseFloat(arrearParts[0])) || 0;
                            }

                            // Pro-rata Check
                            if (compRec.getValue('custrecord_hris_pro_rate') === 'T') {
                                var presentDaysData = getEmployeeDateOfJoining(empId, wagePeriod, 0, getYear, payGroup);
                                var presentParts = presentDaysData.split('#');
                                var presentDays = parseFloat(presentParts[0]) || 0;
                                var monthWageDays = parseFloat(presentParts[1]) || getMonthDays(wagePeriod);
                                proRataAmt = (currentMonthly / monthWageDays) * presentDays;
                            }

                            // Calculate SS and IT gross
                            if (compRec.getValue('custrecord_hris_ss') === 'T') {
                                ssGrossTotal = parseFloat(ssGrossTotal) + currentMonthly;
                            }

                            if (compRec.getValue('custrecord_hris_income_tax') === 'T') {
                                itGrossTotal = parseFloat(itGrossTotal) + currentMonthly;
                            }

                            // Check PF
                            var pfCheck = compRec.getValue('custrecord_hris_pf_ind') === 'T';

                            // Final calculation
                            actualGrossPay = currentMonthly - Math.abs(lopAmt) + arrearAmt;
                            actGrossPay = parseFloat(actGrossPay) + parseFloat(actualGrossPay);

                            // Create pay process record
                            createPayProcessRecord(entityId, empCode, processType, payGroup, empNameTx, 
                                dept, subDept, company, wagePeriod, wEndDate, getYear, earnComponent, 
                                accountCode, componentType, lopAmt, proRataAmt, arrearAmt, 0, actualGrossPay, 
                                paidDays, lopDaysFinal, ptLoc, otHours, remarks);
                        }
                    } catch (itemError) {
                        log.error('Error Processing Earning Component', itemError.message);
                    }
                });
            }

            return actGrossPay + '#' + grossEarning + '#' + componentTypeGlobal + '#' + paidDays + '#' + ssGrossTotal + '#' + itGrossTotal;

        } catch (e) {
            log.error('getEmployeeEarningComp Error', e.message);
            return '0#0#0#0#0#0';
        }
    }

    function getEmployeeDeductionComp(empId, empNameTx, empCode, payGroup, wagePeriodId, monthDays,
        arrearMonthDays, getYear, dept, company, processType, entityId, paidDays, lopDaysFinal, 
        year, esicApplicable, ptLoc, wEndDate, subDept, location, otHours, remarks) {
        
        var actualGrossPay = 0.00;
        var deductionNetPay = 0.00;
        var grossDeduction = 0.00;
        var componentTypeGlobal = '';
        var wagePeriod = parseInt(wagePeriodId);

        try {
            var dedSearch = search.create({
                type: CUSTOM_RECORDS.EMP_COMP_CHANGE,
                filters: [
                    ['custrecord_hris_empchange_emp_pay_pro_gp', 'is', payGroup],
                    'AND',
                    ['custrecord_hris_empchange_employee_nam', 'is', empId],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'custrecord_hris_employee_datachangeint',
                    search.createColumn({
                        name: 'custrecord_hris_cdb_payroll_component',
                        join: 'custrecord_hris_employee_datachangeint'
                    }),
                    search.createColumn({
                        name: 'custrecord_hris_cdb_monthly',
                        join: 'custrecord_hris_employee_datachangeint'
                    })
                ]
            });

            var results = dedSearch.run().getRange(0, 1000);

            if (results.length > 0) {
                results.forEach(function(result) {
                    try {
                        var currentMonthly = parseFloat(result.getValue({
                            name: 'custrecord_hris_cdb_monthly',
                            join: 'custrecord_hris_employee_datachangeint'
                        }) || 0);

                        var dedComponent = result.getValue({
                            name: 'custrecord_hris_cdb_payroll_component',
                            join: 'custrecord_hris_employee_datachangeint'
                        });

                        if (currentMonthly > 0 && dedComponent) {
                            var compRec = record.load({
                                type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                                id: dedComponent
                            });

                            var componentType = compRec.getValue('custrecord_hris_payroll_component_type');
                            var accountCode = compRec.getValue('custrecord_hris_account_name');
                            componentTypeGlobal = componentType;

                            actualGrossPay = currentMonthly;
                            deductionNetPay = parseFloat(deductionNetPay) + parseFloat(actualGrossPay);
                            grossDeduction = parseFloat(grossDeduction) + parseFloat(currentMonthly);

                            createPayProcessRecord(entityId, empCode, processType, payGroup, empNameTx, 
                                dept, subDept, company, wagePeriod, wEndDate, getYear, dedComponent, 
                                accountCode, componentType, 0, 0, 0, 0, actualGrossPay, 
                                paidDays, lopDaysFinal, ptLoc, otHours, remarks);
                        }
                    } catch (itemError) {
                        log.error('Error Processing Deduction Component', itemError.message);
                    }
                });
            }

            return deductionNetPay + '#' + grossDeduction + '#' + componentTypeGlobal + '#' + paidDays;

        } catch (e) {
            log.error('getEmployeeDeductionComp Error', e.message);
            return '0#0#0#0';
        }
    }

    function getEmployeeOtherComp(wEndDate, empId, empNameTx, empCode, payGroup, wagePeriodId, monthDays, 
        arrearMonthDays, getYear, dept, company, processType, entityId, paidDays, lopDaysFinal, 
        year, esicApplicable, ptLoc, subDept, location, otHours, remarks) {
        
        var wagePeriod = parseInt(wagePeriodId);

        try {
            var otherSearch = search.create({
                type: CUSTOM_RECORDS.EMP_COMP_CHANGE,
                filters: [
                    ['custrecord_hris_empchange_emp_pay_pro_gp', 'is', payGroup],
                    'AND',
                    ['custrecord_hris_empchange_employee_nam', 'is', empId],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'custrecord_hris_employee_data_change_int',
                    search.createColumn({
                        name: 'custrecord_hris_payroll_component',
                        join: 'custrecord_hris_employee_data_change_int'
                    }),
                    search.createColumn({
                        name: 'custrecord_hris_monthly',
                        join: 'custrecord_hris_employee_data_change_int'
                    })
                ]
            });

            var results = otherSearch.run().getRange(0, 1000);

            if (results.length > 0) {
                results.forEach(function(result) {
                    try {
                        var currentMonthly = parseFloat(result.getValue({
                            name: 'custrecord_hris_monthly',
                            join: 'custrecord_hris_employee_data_change_int'
                        }) || 0);

                        var otherComponent = result.getValue({
                            name: 'custrecord_hris_payroll_component',
                            join: 'custrecord_hris_employee_data_change_int'
                        });

                        if (currentMonthly > 0 && otherComponent) {
                            var compRec = record.load({
                                type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                                id: otherComponent
                            });

                            var componentType = compRec.getValue('custrecord_hris_payroll_component_type');
                            var accountCode = compRec.getValue('custrecord_hris_account_name');

                            var actualGrossPay = currentMonthly;

                            createPayProcessRecord(entityId, empCode, processType, payGroup, empNameTx, 
                                dept, subDept, company, wagePeriod, wEndDate, getYear, otherComponent, 
                                accountCode, componentType, 0, 0, 0, 0, actualGrossPay, 
                                paidDays, lopDaysFinal, ptLoc, otHours, remarks);
                        }
                    } catch (itemError) {
                        log.error('Error Processing Other Component', itemError.message);
                    }
                });
            }

        } catch (e) {
            log.error('getEmployeeOtherComp Error', e.message);
        }
    }

    function createPayProcessRecord(entityId, empCode, processType, payGroup, empNameTx, dept, 
        subDept, company, wagePeriod, wEndDate, getYear, component, accountCode, componentType, 
        lopAmt, proRataAmt, arrearAmt, arrearDays, actualGross, paidDays, lopDaysFinal, ptLoc, otHours, remarks) {
        
        try {
            var payRec = record.create({
                type: CUSTOM_RECORDS.PAY_PROCESS
            });

            payRec.setValue('custrecord_hris_pay_proc_employee', entityId);
            payRec.setValue('custrecord_hris_pay_proc_employee_code', empCode);
            payRec.setValue('custrecord_hris_pay_proc_process_type', processType);
            payRec.setValue('custrecord_hris_pay_proc_pay_group', payGroup);
            payRec.setValue('custrecord_hris_pay_proc_employee_name', empNameTx);
            payRec.setValue('custrecord_hris_pay_proc_department', dept);
            payRec.setValue('custrecord_hris_pay_proc_subdept', subDept);

            if (company) {
                payRec.setValue('custrecord_hris_pay_proc_company_name', company);
            }

            payRec.setValue('custrecord_hris_pay_proc_pay_month', wagePeriod);
            payRec.setValue('custrecord_hris_pay_proc_pay_date', wEndDate);
            payRec.setValue('custrecord_hris_pay_proc_year', getYear);
            payRec.setValue('custrecord_hris_pay_proc_payroll_compone', component);
            if (accountCode) {
                payRec.setValue('custrecord_hris_pay_proc_account_code', accountCode);
            }
            payRec.setValue('custrecord_hris_pay_proc_component_type', componentType);
            payRec.setValue('custrecord_hris_pay_proc_lop_days', lopAmt);
            payRec.setValue('custrecord_hris_pay_proc_pro_rata_amount', proRataAmt);
            payRec.setValue('custrecord_hris_pay_proc_arrears', arrearAmt);
            payRec.setValue('custrecord_hris_pay_proc_arrear_days', arrearDays);
            payRec.setValue('custrecord_hris_pay_proc_actual_gross_ea', actualGross);
            payRec.setValue('custrecord_hris_pay_proc_value', actualGross);
            payRec.setValue('custrecord_hris_pay_proc_paid_days', paidDays);
            payRec.setValue('custrecord_hris_pay_proc_lop_days_final', lopDaysFinal);
            payRec.setValue('custrecord_hris_pay_proc_pt_location', ptLoc);
            payRec.setValue('custrecord_hris_pay_proc_othours', otHours);
            payRec.setValue('custrecord_hris_pay_proc_remark', remarks);

            var recId = payRec.save();
            log.debug('Pay Process Record Created', recId);
            return recId;

        } catch (e) {
            log.error('createPayProcessRecord Error', e.message);
            return null;
        }
    }

    function getWagePeriodYear(payGroup, wagePeriodId) {
        try {
            var wageSearch = search.create({
                type: CUSTOM_RECORDS.WAGE_PERIOD,
                filters: [
                    ['custrecord_hris_pay_group', 'is', payGroup],
                    'AND',
                    ['custrecord_hris_month', 'is', wagePeriodId],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'custrecord_hris_year',
                    'custrecord_hris_end_date'
                ]
            });

            var result = wageSearch.run().getRange(0, 1);
            if (result.length > 0) {
                var year = result[0].getValue('custrecord_hris_year');
                var yearText = result[0].getText('custrecord_hris_year');
                var endDate = result[0].getValue('custrecord_hris_end_date');
                return year + '#' + yearText + '#' + endDate;
            }
            return '';

        } catch (e) {
            log.error('getWagePeriodYear Error', e.message);
            return '';
        }
    }

    function getWagePeriodNo(wageName) {
        var monthMap = {
            'January': '1', 'February': '2', 'March': '3', 'April': '4',
            'May': '5', 'June': '6', 'July': '7', 'August': '8',
            'September': '9', 'October': '10', 'November': '11', 'December': '12'
        };
        return monthMap[wageName] || wageName;
    }

    function getMonthDays(monthNum) {
        var monthNumStr = monthNum.toString();
        if (['1', '3', '5', '7', '8', '10', '12'].indexOf(monthNumStr) !== -1) {
            return 31;
        } else if (['4', '6', '9', '11'].indexOf(monthNumStr) !== -1) {
            return 30;
        } else if (monthNumStr === '2') {
            var year = new Date().getFullYear();
            return (year % 4 === 0) ? 29 : 28;
        }
        return 30;
    }

    function getPaidDays(empId, wagePeriodId, monthDays, getYear) {
        try {
            var attSearch = search.create({
                type: CUSTOM_RECORDS.MONTHLY_ATTENDANCE,
                filters: [
                    ['custrecord_hrms_month_empid', 'anyof', empId],
                    'AND',
                    ['custrecord_hrms_month_monthid', 'anyof', wagePeriodId],
                    'AND',
                    ['custrecord_hrms_month_yearid', 'anyof', getYear],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['custrecord_hrms_month_presentdays']
            });

            var result = attSearch.run().getRange(0, 1);
            if (result.length > 0) {
                return parseFloat(result[0].getValue('custrecord_hrms_month_presentdays') || 0);
            }
            return 0.00;

        } catch (e) {
            log.error('getPaidDays Error', e.message);
            return 0.00;
        }
    }

    function getLOPDaysFinal(empId, wagePeriodId, getYear) {
        try {
            var lopSearch = search.create({
                type: CUSTOM_RECORDS.UNPAID_LEAVE,
                filters: [
                    ['custrecord_hris_ule_employee_name', 'is', empId],
                    'AND',
                    ['custrecord_hris_ule_month', 'is', wagePeriodId],
                    'AND',
                    ['custrecord_hris_ule_year', 'is', getYear],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['custrecord_hris_ule_noof_days']
            });

            var results = lopSearch.run().getRange(0, 1000);
            var totalLop = 0.00;

            results.forEach(function(result) {
                totalLop = parseFloat(totalLop) + parseFloat(result.getValue('custrecord_hris_ule_noof_days') || 0);
            });

            return totalLop;

        } catch (e) {
            log.error('getLOPDaysFinal Error', e.message);
            return 0.00;
        }
    }

    function getLOPDays(empId, wagePeriod, currentMonthly, monthDays, getYear) {
        try {
            var lopSearch = search.create({
                type: CUSTOM_RECORDS.UNPAID_LEAVE,
                filters: [
                    ['custrecord_hris_ule_employee_name', 'is', empId],
                    'AND',
                    ['custrecord_hris_ule_month', 'is', wagePeriod],
                    'AND',
                    ['custrecord_hris_ule_year', 'is', getYear],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['custrecord_hris_ule_noof_days']
            });

            var results = lopSearch.run().getRange(0, 1000);
            var totalLopAmt = 0.00;
            var totalLopDays = 0.00;

            results.forEach(function(result) {
                var lopDays = parseFloat(result.getValue('custrecord_hris_ule_noof_days') || 0);
                totalLopDays = parseFloat(totalLopDays) + lopDays;
                var lopAmt = (parseFloat(currentMonthly) / 30) * lopDays;
                totalLopAmt = parseFloat(totalLopAmt) + lopAmt;
            });

            return totalLopAmt + '#' + totalLopDays;

        } catch (e) {
            log.error('getLOPDays Error', e.message);
            return '0#0';
        }
    }

    function getArrearDays(empId, currentMonthly, arrearMonthDays, wagePeriod, getYear) {
        try {
            var arrSearch = search.create({
                type: CUSTOM_RECORDS.UNPAID_ARREAR,
                filters: [
                    ['custrecord_hris_uae_employee_name', 'is', empId],
                    'AND',
                    ['custrecord_hris_uae_month', 'is', wagePeriod],
                    'AND',
                    ['custrecord_hris_uae_year', 'is', getYear],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['custrecord_hris_uae_arrear_days']
            });

            var results = arrSearch.run().getRange(0, 1000);
            var totalArrAmt = 0.00;
            var totalArrDays = 0.00;

            results.forEach(function(result) {
                var arrDays = parseFloat(result.getValue('custrecord_hris_uae_arrear_days') || 0);
                totalArrDays = parseFloat(totalArrDays) + arrDays;
                var arrAmt = (parseFloat(currentMonthly) / parseInt(arrearMonthDays)) * arrDays;
                totalArrAmt = parseFloat(totalArrAmt) + arrAmt;
            });

            return totalArrAmt + '#' + totalArrDays;

        } catch (e) {
            log.error('getArrearDays Error', e.message);
            return '0#0';
        }
    }

    function getArrearMonthDays(empId, wagePeriodId, getYear) {
        try {
            var arrSearch = search.create({
                type: CUSTOM_RECORDS.UNPAID_ARREAR,
                filters: [
                    ['custrecord_hris_uae_employee_name', 'is', empId],
                    'AND',
                    ['custrecord_hris_uae_month', 'is', wagePeriodId],
                    'AND',
                    ['custrecord_hris_uae_year', 'is', getYear],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['custrecord_hris_uae_arrear_month']
            });

            var result = arrSearch.run().getRange(0, 1);
            if (result.length > 0) {
                var arrearMonth = result[0].getValue('custrecord_hris_uae_arrear_month');
                return getMonthDays(arrearMonth);
            }
            return 30;

        } catch (e) {
            log.error('getArrearMonthDays Error', e.message);
            return 30;
        }
    }

    function getOTHours(empId, payGroup, wagePeriodId, getYear) {
        try {
            var otSearch = search.create({
                type: CUSTOM_RECORDS.MONTHLY_SAL,
                filters: [
                    ['custrecord_hris_mthsal_paygroup', 'is', payGroup],
                    'AND',
                    ['custrecord_hris_mthsal_empname', 'is', empId],
                    'AND',
                    ['custrecord_hris_mthsal_month', 'is', wagePeriodId],
                    'AND',
                    ['custrecord_hris_mthsal_year', 'is', getYear],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    search.createColumn({ name: 'custrecord_hris_mthsal_total_hours_days', summary: 'SUM' })
                ]
            });

            var result = otSearch.run().getRange(0, 1);
            if (result.length > 0) {
                return parseFloat(result[0].getValue({
                    name: 'custrecord_hris_mthsal_total_hours_days',
                    summary: 'SUM'
                }) || 0);
            }
            return 0;

        } catch (e) {
            log.error('getOTHours Error', e.message);
            return 0;
        }
    }

    function getEmployeeDateOfJoining(empId, wagePeriod, lopDay, getYear, payGroup) {
        try {
            var empSearch = search.create({
                type: 'employee',
                filters: [['internalid', 'is', empId]],
                columns: ['hiredate']
            });

            var empResult = empSearch.run().getRange(0, 1);
            var presentDays = 0;
            var monthDays = getMonthDays(wagePeriod);
            var dojMonth = '';
            var dojYear = '';

            if (empResult.length > 0) {
                var hireDateStr = empResult[0].getValue('hiredate');
                if (hireDateStr) {
                    var hireDate = format.parse({ value: hireDateStr, type: format.Type.DATE });
                    dojMonth = (hireDate.getMonth() + 1).toString();
                    dojYear = hireDate.getFullYear().toString();
                    var dojDay = hireDate.getDate();

                    // Get present days from attendance
                    var attSearch = search.create({
                        type: CUSTOM_RECORDS.MONTHLY_ATTENDANCE,
                        filters: [
                            ['custrecord_hrms_month_empid', 'anyof', empId],
                            'AND',
                            ['custrecord_hrms_month_monthid', 'anyof', wagePeriod],
                            'AND',
                            ['custrecord_hrms_month_yearid', 'anyof', getYear]
                        ],
                        columns: ['custrecord_hrms_month_presentdays']
                    });

                    var attResult = attSearch.run().getRange(0, 1);
                    if (attResult.length > 0) {
                        presentDays = parseFloat(attResult[0].getValue('custrecord_hrms_month_presentdays') || 0);
                    } else {
                        presentDays = parseInt(monthDays) - parseInt(dojDay) - parseFloat(lopDay) + 1;
                    }
                }
            }

            return presentDays + '#' + monthDays + '#' + dojMonth + '#' + dojYear;

        } catch (e) {
            log.error('getEmployeeDateOfJoining Error', e.message);
            return '0#0#0#0';
        }
    }

    function searchSSandITYr(getYear) {
        try {
            var ssSearch = search.create({
                type: CUSTOM_RECORDS.SS_FIN_YEAR,
                filters: [
                    ['custrecord_hris_ssit_start_yr', 'is', getYear]
                ],
                columns: [
                    'custrecord_hris_ssit_startmonth',
                    'custrecord_hris_ssit_end_month'
                ]
            });

            var result = ssSearch.run().getRange(0, 1);
            if (result.length > 0) {
                return result[0].getValue('custrecord_hris_ssit_startmonth') + '#' + 
                       result[0].getValue('custrecord_hris_ssit_end_month');
            }
            return '1#12';

        } catch (e) {
            log.error('searchSSandITYr Error', e.message);
            return '1#12';
        }
    }

    function deleteRecInitial(empId, payGroup, wagePeriodId, processType, getYear) {
        try {
            var delSearch = search.create({
                type: CUSTOM_RECORDS.PAY_PROCESS,
                filters: [
                    ['custrecord_hris_pay_proc_employee', 'is', empId],
                    'AND',
                    ['custrecord_hris_pay_proc_pay_group', 'is', payGroup],
                    'AND',
                    ['custrecord_hris_pay_proc_pay_month', 'is', wagePeriodId],
                    'AND',
                    ['custrecord_hris_pay_proc_process_type', 'is', processType],
                    'AND',
                    ['custrecord_hris_pay_proc_year', 'is', getYear],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid']
            });

            var results = delSearch.run().getRange(0, 1000);
            results.forEach(function(result) {
                record.delete({ type: CUSTOM_RECORDS.PAY_PROCESS, id: result.id });
            });

            log.debug('Records Deleted', results.length + ' pay process records deleted');

        } catch (e) {
            log.error('deleteRecInitial Error', e.message);
        }
    }

    function getMonthlyVariableComp(empId, empEntity, empCode, doj, payGroup, wagePeriodId, wEndDate, 
        empEarnComp, empDedComp, getYear, dept, company, processType, entityId, paidDays, lopDaysFinal, 
        year, esicApplicable, ptLoc, subDept, location, otHours, remarks) {
        
        var wagePeriod = parseInt(wagePeriodId);
        var mthVarSalAmt = 0.00;
        var compType = '';
        var ssGrossTotal = 0.00;
        var itGrossTotal = 0.00;

        try {
            var mvSearch = search.create({
                type: CUSTOM_RECORDS.MONTHLY_SAL,
                filters: [
                    ['custrecord_hris_mthsal_paygroup', 'is', payGroup],
                    'AND',
                    ['custrecord_hris_mthsal_empname', 'is', empId],
                    'AND',
                    ['custrecord_hris_mthsal_month', 'is', wagePeriod],
                    'AND',
                    ['custrecord_hris_mthsal_year', 'is', getYear],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'internalid',
                    'custrecord_hris_mthsal_salaryamount',
                    'custrecord_hris_mthsal_paycomponent',
                    'custrecord_hris_mthsal_paygroup',
                    'custrecord_hris_mthsal_empname'
                ]
            });

            var results = mvSearch.run().getRange(0, 1000);

            if (results.length > 0) {
                results.forEach(function(result) {
                    try {
                        var monthlyAmt = parseFloat(result.getValue('custrecord_hris_mthsal_salaryamount') || 0);
                        var payComponent = result.getValue('custrecord_hris_mthsal_paycomponent');

                        if (monthlyAmt > 0 && payComponent) {
                            var compRec = record.load({
                                type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                                id: payComponent
                            });

                            compType = compRec.getValue('custrecord_hris_payroll_component_type');
                            var accountCode = compRec.getValue('custrecord_hris_account_name');

                            // Check SS and IT
                            if (compRec.getValue('custrecord_hris_ss') === 'T') {
                                ssGrossTotal = parseFloat(ssGrossTotal) + monthlyAmt;
                            }

                            if (compRec.getValue('custrecord_hris_income_tax') === 'T') {
                                itGrossTotal = parseFloat(itGrossTotal) + monthlyAmt;
                            }

                            mthVarSalAmt = monthlyAmt;

                            createPayProcessRecord(entityId, empCode, processType, payGroup, empEntity, 
                                dept, subDept, company, wagePeriod, wEndDate, getYear, payComponent, 
                                accountCode, compType, 0, 0, 0, 0, monthlyAmt, paidDays, lopDaysFinal, 
                                ptLoc, otHours, remarks);
                        }
                    } catch (itemError) {
                        log.error('Error Processing Monthly Variable Component', itemError.message);
                    }
                });
            }

            return mthVarSalAmt + '#' + compType + '#' + ssGrossTotal + '#' + itGrossTotal;

        } catch (e) {
            log.error('getMonthlyVariableComp Error', e.message);
            return '0#0#0#0';
        }
    }

    function createLoanComp(wEndDate, entityId, empNameTx, empCode, processType, payGroupEarn, 
        empName, dept, wagePeriod, company, accountCode, componentType, searchLoanIds, 
        lopDaysFinal, paidDays, getYear, esicApplicable, ptLoc, year, subDept, location, otHours, remarks) {
        
        try {
            log.debug('createLoanComp Start', {
                entityId: entityId,
                searchLoanIds: searchLoanIds
            });

            if (!searchLoanIds || searchLoanIds === '##') {
                log.debug('No Loans Found', 'Skipping loan component creation');
                return;
            }

            var loanParts = searchLoanIds.split('#');
            var loanRecordArr = loanParts[0] ? loanParts[0].split(',') : [];
            var loanCompArr = loanParts[1] ? loanParts[1].split(',') : [];
            var loanChildArr = loanParts[2] ? loanParts[2].split(',') : [];

            log.debug('Parsed Loan Data', {
                loanRecordCount: loanRecordArr.length,
                loanCompCount: loanCompArr.length,
                loanChildCount: loanChildArr.length
            });

            for (var i = 0; i < loanRecordArr.length; i++) {
                try {
                    var loanRecordId = loanRecordArr[i];
                    var loanCompId = loanCompArr[i];
                    var loanChildId = loanChildArr[i];

                    log.debug('Processing Loan ' + i, {
                        loanRecordId: loanRecordId,
                        loanCompId: loanCompId,
                        loanChildId: loanChildId
                    });

                    var childRec = record.load({
                        type: CUSTOM_RECORDS.LOAN_CHILD,
                        id: loanChildId
                    });

                    var loanEntry = childRec.getValue('custrecord_hris_loan_alloc_paidamount');

                    var compRec = record.load({
                        type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                        id: loanCompId
                    });

                    var compAccountCode = compRec.getValue('custrecord_hris_account_name');

                    var payRec = record.create({
                        type: CUSTOM_RECORDS.PAY_PROCESS
                    });

                    payRec.setValue('custrecord_hris_pay_proc_employee', entityId);
                    payRec.setValue('custrecord_hris_pay_proc_employee_code', empCode);
                    payRec.setValue('custrecord_hris_pay_proc_process_type', processType);
                    payRec.setValue('custrecord_hris_pay_proc_pay_group', payGroupEarn);
                    payRec.setValue('custrecord_hris_pay_proc_employee_name', empNameTx);
                    payRec.setValue('custrecord_hris_pay_proc_department', dept);
                    payRec.setValue('custrecord_hris_pay_proc_subdept', subDept);

                    if (company) {
                        payRec.setValue('custrecord_hris_pay_proc_company_name', company);
                    }

                    payRec.setValue('custrecord_hris_pay_proc_pay_month', wagePeriod);
                    payRec.setValue('custrecord_hris_pay_proc_pay_date', wEndDate);
                    payRec.setValue('custrecord_hris_pay_proc_year', getYear);
                    payRec.setValue('custrecord_hris_pay_proc_loan_year', year);
                    payRec.setValue('custrecord_hris_pay_proc_payroll_compone', loanCompId);
                    payRec.setValue('custrecord_hris_pay_proc_account_code', compAccountCode);
                    payRec.setValue('custrecord_hris_pay_proc_component_type', 2);
                    payRec.setValue('custrecord_hris_pay_proc_actual_salary', loanEntry);
                    payRec.setValue('custrecord_hris_pay_proc_gross_deduction', loanEntry);
                    payRec.setValue('custrecord_hris_pay_proc_loan_reference', loanRecordId);
                    payRec.setValue('custrecord_hris_pay_proc_lop_days_final', lopDaysFinal);
                    payRec.setValue('custrecord_hris_pay_proc_paid_days', paidDays);
                    payRec.setValue('custrecord_hris_pay_proc_pt_location', ptLoc);
                    payRec.setValue('custrecord_hris_pay_proc_actual_gross_de', loanEntry);
                    payRec.setValue('custrecord_hris_pay_proc_value', loanEntry);
                    payRec.setValue('custrecord_hris_pay_proc_othours', otHours);
                    payRec.setValue('custrecord_hris_pay_proc_remark', remarks);

                    var payRecId = payRec.save();
                    log.debug('Created Loan Pay Process', payRecId);

                } catch (loanError) {
                    log.error('Error Creating Loan Component ' + i, loanError.message);
                }
            }

            log.debug('createLoanComp Complete', 'Processed ' + loanRecordArr.length + ' loans');

        } catch (e) {
            log.error('createLoanComp Error', e.message);
        }
    }

    function createPFComp(entityId, empNameTx, empCode, processType, payGroup, empName, dept, wagePeriod, 
        company, accountCode, componentType, pfCal, pfGrossTotal, lopDaysFinal, paidDays, getYear, 
        esicApplicable, ptLoc, subDept, location, otHours, remarks) {
        
        try {
            log.debug('createPFComp Start', { entityId: entityId, pfGrossTotal: pfGrossTotal });

            var pfCompId = searchPFID();
            if (!pfCompId) {
                log.error('createPFComp', 'PF Component ID not found');
                return;
            }

            var compRec = record.load({
                type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                id: pfCompId
            });

            var accountCode = compRec.getValue('custrecord_hris_account_name');

            var payRec = record.create({
                type: CUSTOM_RECORDS.PAY_PROCESS
            });

            payRec.setValue('custrecord_hris_pay_proc_employee', entityId);
            payRec.setValue('custrecord_hris_pay_proc_employee_code', empCode);
            payRec.setValue('custrecord_hris_pay_proc_process_type', processType);
            payRec.setValue('custrecord_hris_pay_proc_pay_group', payGroup);
            payRec.setValue('custrecord_hris_pay_proc_employee_name', empNameTx);
            payRec.setValue('custrecord_hris_pay_proc_department', dept);
            payRec.setValue('custrecord_hris_pay_proc_subdept', subDept);

            if (company) {
                payRec.setValue('custrecord_hris_pay_proc_company_name', company);
            }

            payRec.setValue('custrecord_hris_pay_proc_pay_month', wagePeriod);
            payRec.setValue('custrecord_hris_pay_proc_year', getYear);
            payRec.setValue('custrecord_hris_pay_proc_payroll_compone', pfCompId);
            payRec.setValue('custrecord_hris_pay_proc_account_code', accountCode);
            payRec.setValue('custrecord_hris_pay_proc_component_type', 2);
            payRec.setValue('custrecord_hris_pay_proc_pf_gross', pfGrossTotal);
            payRec.setValue('custrecord_hris_pay_proc_actual_salary', pfCal);
            payRec.setValue('custrecord_hris_pay_proc_gross_deduction', parseFloat(pfCal).toFixed(2));
            payRec.setValue('custrecord_hris_pay_proc_lop_days_final', lopDaysFinal);
            payRec.setValue('custrecord_hris_pay_proc_paid_days', paidDays);
            payRec.setValue('custrecord_hris_pay_proc_pt_location', ptLoc);
            payRec.setValue('custrecord_hris_pay_proc_actual_gross_de', parseFloat(pfCal).toFixed(2));
            payRec.setValue('custrecord_hris_pay_proc_value', pfCal);
            payRec.setValue('custrecord_hris_pay_proc_othours', otHours);
            payRec.setValue('custrecord_hris_pay_proc_remark', remarks);

            var payRecId = payRec.save();
            log.debug('PF Component Pay Process Created', payRecId);

        } catch (e) {
            log.error('createPFComp Error', e.message);
        }
    }

    function createESICComp(entityId, empNameTx, empCode, processType, payGroup, empName, dept, wagePeriod, 
        company, accountCode, componentType, esicEmpContri, esicEmployerContri, esicGrossTotal, lopDaysFinal, 
        paidDays, getYear, esicApplicable, ptLoc, subDept, location, otHours, remarks) {
        
        try {
            log.debug('createESICComp Start', { entityId: entityId, esicGrossTotal: esicGrossTotal });

            var esicCompId = searchESICId(payGroup);
            if (!esicCompId) {
                log.error('createESICComp', 'ESIC Component ID not found');
                return;
            }

            var compRec = record.load({
                type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                id: esicCompId
            });

            var accountCode = compRec.getValue('custrecord_hris_account_name');

            var payRec = record.create({
                type: CUSTOM_RECORDS.PAY_PROCESS
            });

            payRec.setValue('custrecord_hris_pay_proc_employee', entityId);
            payRec.setValue('custrecord_hris_pay_proc_employee_code', empCode);
            payRec.setValue('custrecord_hris_pay_proc_process_type', processType);
            payRec.setValue('custrecord_hris_pay_proc_pay_group', payGroup);
            payRec.setValue('custrecord_hris_pay_proc_employee_name', empNameTx);
            payRec.setValue('custrecord_hris_pay_proc_department', dept);
            payRec.setValue('custrecord_hris_pay_proc_subdept', subDept);

            if (company) {
                payRec.setValue('custrecord_hris_pay_proc_company_name', company);
            }

            payRec.setValue('custrecord_hris_pay_proc_pay_month', wagePeriod);
            payRec.setValue('custrecord_hris_pay_proc_year', getYear);
            payRec.setValue('custrecord_hris_pay_proc_payroll_compone', esicCompId);
            payRec.setValue('custrecord_hris_pay_proc_account_code', accountCode);
            payRec.setValue('custrecord_hris_pay_proc_component_type', 2);
            payRec.setValue('custrecord_hris_pay_proc_esic_gross', esicGrossTotal);
            payRec.setValue('custrecord_hris_pay_proc_paid_days', paidDays);
            payRec.setValue('custrecord_hris_pay_proc_esic_check', esicApplicable);
            payRec.setValue('custrecord_hris_pay_proc_lop_days_final', lopDaysFinal);
            payRec.setValue('custrecord_hris_pay_proc_pt_location', ptLoc);
            payRec.setValue('custrecord_hris_pay_proc_esic_emp_contri', esicEmpContri);
            payRec.setValue('custrecord_hris_pay_proc_esic_company_co', esicEmployerContri);
            payRec.setValue('custrecord_hris_pay_proc_actual_salary', esicEmpContri);
            payRec.setValue('custrecord_hris_pay_proc_gross_deduction', parseFloat(esicEmpContri).toFixed(2));
            payRec.setValue('custrecord_hris_pay_proc_actual_gross_de', parseFloat(esicEmpContri).toFixed(2));
            payRec.setValue('custrecord_hris_pay_proc_value', esicEmpContri);
            payRec.setValue('custrecord_hris_pay_proc_othours', otHours);
            payRec.setValue('custrecord_hris_pay_proc_remark', remarks);

            var payRecId = payRec.save();
            log.debug('ESIC Component Pay Process Created', payRecId);

        } catch (e) {
            log.error('createESICComp Error', e.message);
        }
    }

    function getEarningGross(wEndDate, empNameTx, empCode, payGroup, wagePeriodId, empId, componentType, 
        getYear, dept, company, processType, entityId, paidDays, lopDaysFinal, esicApplicable, ptLoc, 
        subDept, location, otHours, remarks) {
        
        var wagePeriod = parseInt(wagePeriodId);
        var totalGrossEarn = 0.00;
        var totalActGrossEarn = 0.00;

        try {
            var earnSearch = search.create({
                type: CUSTOM_RECORDS.PAY_PROCESS,
                filters: [
                    ['custrecord_hris_pay_proc_employee_name', 'is', empNameTx],
                    'AND',
                    ['custrecord_hris_pay_proc_pay_group', 'is', payGroup],
                    'AND',
                    ['custrecord_hris_pay_proc_pay_month', 'is', wagePeriod],
                    'AND',
                    ['custrecord_hris_pay_proc_component_type', 'is', searchEarnCompType()],
                    'AND',
                    ['custrecord_hris_pay_proc_year', 'is', getYear],
                    'AND',
                    ['custrecord_hris_pay_proc_process_type', 'is', processType],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'custrecord_hris_pay_proc_gross_earning',
                    'custrecord_hris_pay_proc_actual_gross_ea'
                ]
            });

            var results = earnSearch.run().getRange(0, 1000);

            if (results.length > 0) {
                results.forEach(function(result) {
                    var grossEarning = parseFloat(result.getValue('custrecord_hris_pay_proc_gross_earning') || 0);
                    totalGrossEarn = parseFloat(totalGrossEarn) + grossEarning;

                    var actualGrossEarning = parseFloat(result.getValue('custrecord_hris_pay_proc_actual_gross_ea') || 0);
                    totalActGrossEarn = parseFloat(totalActGrossEarn) + actualGrossEarning;
                });

                // Create summary record
                var payRec = record.create({
                    type: CUSTOM_RECORDS.PAY_PROCESS
                });

                payRec.setValue('custrecord_hris_pay_proc_employee', entityId);
                payRec.setValue('custrecord_hris_pay_proc_employee_code', empCode);
                payRec.setValue('custrecord_hris_pay_proc_process_type', processType);
                payRec.setValue('custrecord_hris_pay_proc_pay_group', payGroup);
                payRec.setValue('custrecord_hris_pay_proc_employee_name', empNameTx);
                payRec.setValue('custrecord_hris_pay_proc_department', dept);
                payRec.setValue('custrecord_hris_pay_proc_subdept', subDept);

                if (company) {
                    payRec.setValue('custrecord_hris_pay_proc_company_name', company);
                }

                payRec.setValue('custrecord_hris_pay_proc_pay_month', wagePeriod);
                payRec.setValue('custrecord_hris_pay_proc_pay_date', wEndDate);
                payRec.setValue('custrecord_hris_pay_proc_year', getYear);
                payRec.setValue('custrecord_hris_pay_proc_gross_earning', totalGrossEarn);
                payRec.setValue('custrecord_hris_pay_proc_actual_gross_ea', totalActGrossEarn);
                payRec.setValue('custrecord_hris_pay_proc_actual_salary', totalActGrossEarn);
                payRec.setValue('custrecord_hris_pay_proc_value', totalActGrossEarn);
                payRec.setValue('custrecord_hris_pay_proc_paid_days', paidDays);
                payRec.setValue('custrecord_hris_pay_proc_lop_days_final', lopDaysFinal);
                payRec.setValue('custrecord_hris_pay_proc_pt_location', ptLoc);
                payRec.setValue('custrecord_hris_pay_proc_othours', otHours);

                payRec.save();
            }

            return totalActGrossEarn;

        } catch (e) {
            log.error('getEarningGross Error', e.message);
            return 0.00;
        }
    }

    function getDeductionGross(wEndDate, empNameTx, empCode, payGroup, wagePeriodId, empId, componentType, 
        getYear, dept, company, processType, entityId, paidDays, lopDaysFinal, esicApplicable, ptLoc, 
        subDept, location, otHours, remarks) {
        
        var wagePeriod = parseInt(wagePeriodId);
        var totalGrossDedc = 0.00;
        var totalActGrossDedc = 0.00;

        try {
            var dedSearch = search.create({
                type: CUSTOM_RECORDS.PAY_PROCESS,
                filters: [
                    ['custrecord_hris_pay_proc_employee_name', 'is', empNameTx],
                    'AND',
                    ['custrecord_hris_pay_proc_pay_group', 'is', payGroup],
                    'AND',
                    ['custrecord_hris_pay_proc_pay_month', 'is', wagePeriod],
                    'AND',
                    ['custrecord_hris_pay_proc_component_type', 'is', searchDedcCompType()],
                    'AND',
                    ['custrecord_hris_pay_proc_year', 'is', getYear],
                    'AND',
                    ['custrecord_hris_pay_proc_process_type', 'is', processType],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'custrecord_hris_pay_proc_gross_deduction',
                    'custrecord_hris_pay_proc_actual_gross_de'
                ]
            });

            var results = dedSearch.run().getRange(0, 1000);

            if (results.length > 0) {
                results.forEach(function(result) {
                    var grossDeduction = parseFloat(result.getValue('custrecord_hris_pay_proc_gross_deduction') || 0);
                    totalGrossDedc = parseFloat(totalGrossDedc) + grossDeduction;

                    var actualGrossDeduction = parseFloat(result.getValue('custrecord_hris_pay_proc_actual_gross_de') || 0);
                    totalActGrossDedc = parseFloat(totalActGrossDedc) + actualGrossDeduction;
                });

                // Create summary record
                var payRec = record.create({
                    type: CUSTOM_RECORDS.PAY_PROCESS
                });

                payRec.setValue('custrecord_hris_pay_proc_employee', entityId);
                payRec.setValue('custrecord_hris_pay_proc_employee_code', empCode);
                payRec.setValue('custrecord_hris_pay_proc_process_type', processType);
                payRec.setValue('custrecord_hris_pay_proc_pay_group', payGroup);
                payRec.setValue('custrecord_hris_pay_proc_employee_name', empNameTx);
                payRec.setValue('custrecord_hris_pay_proc_department', dept);
                payRec.setValue('custrecord_hris_pay_proc_subdept', subDept);

                if (company) {
                    payRec.setValue('custrecord_hris_pay_proc_company_name', company);
                }

                payRec.setValue('custrecord_hris_pay_proc_pay_month', wagePeriod);
                payRec.setValue('custrecord_hris_pay_proc_pay_date', wEndDate);
                payRec.setValue('custrecord_hris_pay_proc_year', getYear);
                payRec.setValue('custrecord_hris_pay_proc_gross_deduction', totalGrossDedc);
                payRec.setValue('custrecord_hris_pay_proc_actual_salary', totalGrossDedc);
                payRec.setValue('custrecord_hris_pay_proc_actual_gross_de', totalActGrossDedc);
                payRec.setValue('custrecord_hris_pay_proc_value', totalActGrossDedc);
                payRec.setValue('custrecord_hris_pay_proc_paid_days', paidDays);
                payRec.setValue('custrecord_hris_pay_proc_lop_days_final', lopDaysFinal);
                payRec.setValue('custrecord_hris_pay_proc_pt_location', ptLoc);
                payRec.setValue('custrecord_hris_pay_proc_othours', otHours);

                payRec.save();
            }

            return totalGrossDedc;

        } catch (e) {
            log.error('getDeductionGross Error', e.message);
            return 0.00;
        }
    }

    function getNetPay(wEndDate, empNameTx, empId, empCode, payGroup, wagePeriodId, earningTotal, 
        deductionTotal, getYear, dept, company, processType, entityId, paidDays, lopDaysFinal, 
        esicApplicable, ptLoc, subDept, location, otHours, remarks) {
        
        var wagePeriod = parseInt(wagePeriodId);
        var finalNetPay = parseFloat(earningTotal) - parseFloat(deductionTotal);

        try {
            // Apply rounding logic
            var decimal = finalNetPay - Math.floor(finalNetPay);
            if (decimal >= 0.49) {
                finalNetPay = Math.ceil(finalNetPay);
            } else {
                finalNetPay = Math.floor(finalNetPay);
            }

            var netPayCompId = searchNetId(payGroup);
            if (!netPayCompId) {
                log.error('getNetPay', 'Net Pay Component ID not found');
                return;
            }

            var compRec = record.load({
                type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                id: netPayCompId
            });

            var accountCode = compRec.getValue('custrecord_hris_account_name');

            var payRec = record.create({
                type: CUSTOM_RECORDS.PAY_PROCESS
            });

            payRec.setValue('custrecord_hris_pay_proc_employee', entityId);
            payRec.setValue('custrecord_hris_pay_proc_employee_code', empCode);
            payRec.setValue('custrecord_hris_pay_proc_process_type', processType);
            payRec.setValue('custrecord_hris_pay_proc_pay_group', payGroup);
            payRec.setValue('custrecord_hris_pay_proc_employee_name', empNameTx);
            payRec.setValue('custrecord_hris_pay_proc_department', dept);
            payRec.setValue('custrecord_hris_pay_proc_subdept', subDept);

            if (company) {
                payRec.setValue('custrecord_hris_pay_proc_company_name', company);
            }

            payRec.setValue('custrecord_hris_pay_proc_pay_month', wagePeriod);
            payRec.setValue('custrecord_hris_pay_proc_pay_date', wEndDate);
            payRec.setValue('custrecord_hris_pay_proc_year', getYear);
            payRec.setValue('custrecord_hris_pay_proc_payroll_compone', netPayCompId);
            payRec.setValue('custrecord_hris_pay_proc_account_code', accountCode);
            payRec.setValue('custrecord_hris_pay_proc_net_pay', parseFloat(finalNetPay).toFixed(2));
            payRec.setValue('custrecord_hris_pay_proc_actual_salary', parseFloat(finalNetPay).toFixed(2));
            payRec.setValue('custrecord_hris_pay_proc_value', parseFloat(finalNetPay).toFixed(2));
            payRec.setValue('custrecord_hris_pay_proc_paid_days', paidDays);
            payRec.setValue('custrecord_hris_pay_proc_lop_days_final', lopDaysFinal);
            payRec.setValue('custrecord_hris_pay_proc_pt_location', ptLoc);
            payRec.setValue('custrecord_hris_pay_proc_othours', otHours);

            payRec.save();

        } catch (e) {
            log.error('getNetPay Error', e.message);
        }
    }

    function searchLoanEntry(empId, wagePeriod, getYear) {
        try {
            log.debug('searchLoanEntry Start', {
                empId: empId,
                wagePeriod: wagePeriod,
                getYear: getYear
            });

            var loanRecordArr = [];
            var loanCompArr = [];
            var loanChildArr = [];

            var loanSearch = search.create({
                type: CUSTOM_RECORDS.LOAN_APP,
                filters: [
                    ['custrecord_hris_loan_emp_name', 'is', empId],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'internalid',
                    'custrecord_hris_loan_loan_type',
                    search.createColumn({
                        name: 'custrecord_hris_loan_alloc_startdate',
                        join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK'
                    }),
                    search.createColumn({
                        name: 'custrecord_hris_loan_alloc_enddate',
                        join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK'
                    }),
                    search.createColumn({
                        name: 'internalid',
                        join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK'
                    })
                ]
            });

            var searchResults = loanSearch.run().getRange(0, 1000);

            if (searchResults && searchResults.length > 0) {
                searchResults.forEach(function(result) {
                    try {
                        log.debug('Processing Loan Result');

                        var startDate = result.getValue({
                            name: 'custrecord_hris_loan_alloc_startdate',
                            join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK'
                        });

                        var endDate = result.getValue({
                            name: 'custrecord_hris_loan_alloc_enddate',
                            join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK'
                        });

                        var loanChildId = result.getValue({
                            name: 'internalid',
                            join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK'
                        });

                        if (!startDate || !endDate || !loanChildId) {
                            log.debug('Skipping Loan', 'Missing child record or dates for loan: ' + result.id);
                            return;
                        }

                        var startDateObj = format.parse({
                            value: startDate,
                            type: format.Type.DATE
                        });

                        var endDateObj = format.parse({
                            value: endDate,
                            type: format.Type.DATE
                        });

                        var sMonth = startDateObj.getMonth();
                        var sYear = startDateObj.getFullYear();
                        var eMonth = endDateObj.getMonth() + 2;
                        var eYear = endDateObj.getFullYear();

                        var loanType = result.getValue('custrecord_hris_loan_loan_type');

                        if (!loanType) {
                            log.debug('Skipping Loan', 'No loan type found');
                            return;
                        }

                        var loanMasterRec = record.load({
                            type: CUSTOM_RECORDS.LOAN_MASTER,
                            id: loanType
                        });

                        var loanComp = loanMasterRec.getValue('custrecord_hris_loan_component');

                        var yearSearch = search.create({
                            type: CUSTOM_RECORDS.YEAR_MASTER,
                            filters: [
                                ['internalid', 'is', getYear]
                            ],
                            columns: ['name']
                        });

                        var yearResult = yearSearch.run().getRange(0, 1);
                        var wagePeriodYear = yearResult.length > 0 ? 
                            parseInt(yearResult[0].getValue('name')) : new Date().getFullYear();

                        var wagePeriod1 = getNormalMonth(wagePeriod);
                        var wageDate = new Date(wagePeriodYear, wagePeriod1 - 1, 1);
                        var emiStartDate = new Date(sYear, sMonth, 1);
                        var emiEndDate = new Date(eYear, eMonth, 1);
                        var emiSameMonth = new Date(sYear, sMonth + 2, 1);

                        if ((wageDate > emiStartDate) && (wageDate < emiEndDate)) {
                            log.debug('Loan Match Condition 1', 'Adding loan record');
                            loanRecordArr.push(result.id);
                            loanCompArr.push(loanComp);
                            loanChildArr.push(loanChildId);
                        } else if ((wageDate > emiStartDate) && (wageDate < emiSameMonth)) {
                            log.debug('Loan Match Condition 2', 'Adding loan record');
                            loanRecordArr.push(result.id);
                            loanCompArr.push(loanComp);
                            loanChildArr.push(loanChildId);
                        }

                    } catch (itemError) {
                        log.error('Error Processing Individual Loan', itemError.message);
                    }
                });
            }

            var result = loanRecordArr.join(',') + '#' + 
                        loanCompArr.join(',') + '#' + 
                        loanChildArr.join(',');

            log.debug('searchLoanEntry Result', result);
            return result;

        } catch (e) {
            log.error('searchLoanEntry Error', e.message);
            return '##';
        }
    }

    function searchPFID() {
        try {
            var pfSearch = search.create({
                type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                filters: [
                    ['custrecord_hris__sequence_no_', 'equalto', '53'],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid']
            });

            var result = pfSearch.run().getRange(0, 1);
            return result.length > 0 ? result[0].id : null;

        } catch (e) {
            log.error('searchPFID Error', e.message);
            return null;
        }
    }

    function searchESICId(payGroup) {
        try {
            var esicSearch = search.create({
                type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                filters: [
                    ['custrecord_hris_pay_process_group', 'is', payGroup],
                    'AND',
                    ['custrecord_hris__sequence_no_', 'equalto', '54'],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid']
            });

            var result = esicSearch.run().getRange(0, 1);
            return result.length > 0 ? result[0].id : null;

        } catch (e) {
            log.error('searchESICId Error', e.message);
            return null;
        }
    }

    function searchNetId(payGroup) {
        try {
            var netSearch = search.create({
                type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                filters: [
                    ['custrecord_hris_pay_process_group', 'is', payGroup],
                    'AND',
                    ['custrecord_hris__sequence_no_', 'equalto', '100'],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid']
            });

            var result = netSearch.run().getRange(0, 1);
            return result.length > 0 ? result[0].id : null;

        } catch (e) {
            log.error('searchNetId Error', e.message);
            return null;
        }
    }

    function searchEarnCompType() {
        try {
            var earnSearch = search.create({
                type: CUSTOM_RECORDS.COMPONENT_TYPE,
                filters: [
                    ['custrecord_hris_com_sequence_no', 'equalto', '1'],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid']
            });

            var result = earnSearch.run().getRange(0, 1);
            return result.length > 0 ? result[0].id : '1';

        } catch (e) {
            log.error('searchEarnCompType Error', e.message);
            return '1';
        }
    }

    function searchDedcCompType() {
        try {
            var dedcSearch = search.create({
                type: CUSTOM_RECORDS.COMPONENT_TYPE,
                filters: [
                    ['custrecord_hris_com_sequence_no', 'equalto', '2'],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid']
            });

            var result = dedcSearch.run().getRange(0, 1);
            return result.length > 0 ? result[0].id : '2';

        } catch (e) {
            log.error('searchDedcCompType Error', e.message);
            return '2';
        }
    }

    function getNormalMonth(monthParameter) {
        var monthMap = {
            '1': 1, '2': 2, '3': 3, '4': 4,
            '5': 5, '6': 6, '7': 7, '8': 8,
            '9': 9, '10': 10, '11': 11, '12': 12,
            'January': 1, 'February': 2, 'March': 3, 'April': 4,
            'May': 5, 'June': 6, 'July': 7, 'August': 8,
            'September': 9, 'October': 10, 'November': 11, 'December': 12
        };

        return monthMap[monthParameter.toString()] || parseInt(monthParameter) || 1;
    }

    return {
        post: post
    };
});