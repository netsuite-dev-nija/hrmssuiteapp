/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @Description Core Pay Process Module – all functions have try-catch.
 * Fixed: Net Pay creation, deduction gross field, null component IDs.
 */
define(['N/record', 'N/search', 'N/log', 'N/format'],
    (record, search, log, format) => {

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
            YEAR_MASTER: 'customlist_hris_year_master',
            PAY_PROCESS_LOG: 'customrecord_hris_pay_process_log'
        };

        // ==================== PUBLIC API ====================

        /**
         * Main entry point – processes pay for a given Pre-Pay Process record
         * @param {number|string} prePayProcessId
         * @returns {Object}
         */
        const processEmployeePay = (prePayProcessId) => {
            if (!prePayProcessId) {
                throw new Error('Record_id is required');
            }

            let prePayRec;
            try {
                prePayRec = record.load({
                    type: CUSTOM_RECORDS.PRE_PAY_PROCESS,
                    id: prePayProcessId
                });
            } catch (e) {
                log.error('processEmployeePay - Load PrePay Failed', e.message);
                return { success: false, message: 'Failed to load Pre-Pay Process: ' + e.message };
            }

            const checked = prePayRec.getValue('custrecord_hris_pre_pay_pr_checked');
            log.debug('Initial Checked Value', checked);

            if (checked !== 'F' && checked !== false) {
                return {
                    success: false,
                    message: 'Record already processed'
                };
            }

            try {
                const empId = prePayRec.getValue('custrecord_hris_pre_pay_pr_employee_name');
                const empNameText = prePayRec.getText('custrecord_hris_pre_pay_pr_employee_name');
                const payGroup = prePayRec.getValue('custrecord_hris_pre_pay_pr_pay_group');
                const wageMonth = prePayRec.getValue('custrecord_hris_pre_pay_pr_wage_month');
                const remarks = prePayRec.getValue('custrecord_hris_pre_pay_pr_remarks');

                if (!empId) throw new Error('Employee is missing on Pre-Pay Process record');
                if (!payGroup) throw new Error('Pay Group is missing on Pre-Pay Process record');
                if (!wageMonth) throw new Error('Wage Month is missing on Pre-Pay Process record');

                // 1.0 Wage Period Logic
                const wagePeriodId = getWagePeriodNo(wageMonth);
                const wagePeriodData = getWagePeriodYear(payGroup, wagePeriodId);
                const getYear = wagePeriodData.yearId;
                const yearText = wagePeriodData.yearText;
                const wEndDateStr = wagePeriodData.endDate;

                if (!getYear) {
                    throw new Error('Wage Period Year not found for PayGroup=' + payGroup + ', Month=' + wagePeriodId);
                }

                const monthDays = getMonthDays(wageMonth);

                // SS / IT Year
                const ssItYear = searchSSandITYr(getYear);

                // Employee master lookup
                const empRec = record.load({ type: 'employee', id: empId });
                const empCode = empRec.getValue('custentity_hris_empcode');
                const dept = empRec.getValue('custentity_hris_empdepartment_new');
                const company = empRec.getValue('subsidiary');
                const hireDateStr = empRec.getValue('hiredate');
                const entitytitle = empRec.getValue('entitytitle')
                log.emergency(' entitytitle', entitytitle);
                const esicApplicable = empRec.getValue('custentity_hris_isesiapplicable');
                const pfApplicable = empRec.getValue('custentity_hris_pfapplicable');
                const ptLoc = empRec.getValue('custentity_hris_empptlocation');
                const ptApplicable = empRec.getValue('custentity_hris_emp_isptapplicable');
                const subDept = empRec.getValue('custentity_hris_empsubdepartment');
                const location = empRec.getValue('custentity_hris_empdlocation_new');
                const socialInsApp = empRec.getValue('custentity_hris_empsocialinsurapplicable');

                // Cleanup previous run
                deleteRecInitial(empId, payGroup, wagePeriodId, 1, getYear);

                // Attendance / LOP / OT
                const arrearMonthDays = getArrearMonthDays(empId, wagePeriodId, getYear);
                const paidDays = getPaidDays(empId, wagePeriodId, monthDays, getYear);
                const lopDaysFinal = getLOPDaysFinal(empId, wagePeriodId, getYear);
                const otHours = getOTHours(empId, payGroup, wagePeriodId, getYear);

                log.debug('Attendance Snapshot', {
                    paidDays, lopDaysFinal, otHours, arrearMonthDays, monthDays, getYear, wagePeriodId
                });

                // Process Earnings
                const earnings = getEmployeeEarningComp({
                    empId,
                    empNameTx: empNameText,
                    empCode,
                    payGroup,
                    wagePeriodId,
                    monthDays,
                    arrearMonthDays,
                    hireDateStr,
                    wEndDate: wEndDateStr,
                    ssStartMonth: ssItYear.startMonth,
                    ssEndMonth: ssItYear.endMonth,
                    getYear,
                    dept,
                    company,
                    processType: 1,
                    entityId: empId,
                    entitytitle:entitytitle,
                    paidDays,
                    lopDaysFinal,
                    year: yearText,
                    esicApplicable,
                    pfApplicable,
                    ptLoc,
                    subDept,
                    location,
                    otHours,
                    remarks
                });

                // Process Deductions
                const deductions = getEmployeeDeductionComp({
                    empId,
                    empNameTx: empNameText,
                    empCode,
                    payGroup,
                    wagePeriodId,
                    monthDays,
                    arrearMonthDays,
                    getYear,
                    dept,
                    company,
                    processType: 1,
                    entityId: empId,
                    entitytitle:entitytitle,
                    paidDays,
                    lopDaysFinal,
                    year: yearText,
                    esicApplicable,
                    ptLoc,
                    wEndDate: wEndDateStr,
                    subDept,
                    location,
                    otHours,
                    remarks
                });

                // Other components
                getEmployeeOtherComp({
                    wEndDate: wEndDateStr,
                    empId,
                    empNameTx: empNameText,
                    empCode,
                    payGroup,
                    wagePeriodId,
                    monthDays,
                    arrearMonthDays,
                    getYear,
                    dept,
                    company,
                    processType: 1,
                    entityId: empId,
                    entitytitle:entitytitle,
                    paidDays: earnings.paidDays,
                    lopDaysFinal,
                    year: yearText,
                    esicApplicable,
                    ptLoc,
                    subDept,
                    location,
                    otHours,
                    remarks
                });

                // Monthly Variable Pay
                getMonthlyVariableComp({
                    empId,
                    empEntity: empId,
                    empCode,
                    hireDateStr,
                    payGroup,
                    wagePeriodId,
                    wEndDate: wEndDateStr,
                    getYear,
                    dept,
                    company,
                    processType: 1,
                    entityId: empId,
                    entitytitle:entitytitle,
                    paidDays: earnings.paidDays,
                    lopDaysFinal,
                    year: yearText,
                    esicApplicable,
                    ptLoc,
                    subDept,
                    location,
                    otHours,
                    remarks
                });

                // Professional Tax (PT)
                if (ptApplicable === 'T' || ptApplicable === true) {
                    createPTComp({
                        entityId: empId,
                        entitytitle:entitytitle,
                        empCode,
                        processType: 1,
                        payGroup,
                        dept,
                        wagePeriod: wagePeriodId,
                        company,
                        lopDaysFinal,
                        paidDays: earnings.paidDays,
                        getYear,
                        ptApplicable,
                        ptLoc,
                        subDept,
                        location,
                        remarks,
                        empNameTx: empNameText
                    });
                }

                // Loans
                const loanData = searchLoanEntry(empId, wagePeriodId, getYear);
                createLoanComp({
                    wEndDate: wEndDateStr,
                    entityId: empId,
                    entitytitle:entitytitle,
                    empNameTx: empNameText,
                    empCode,
                    processType: 1,
                    payGroup,
                    empName: empId,
                    dept,
                    wagePeriod: wagePeriodId,
                    company,
                    componentType: earnings.componentType,
                    searchLoanIds: loanData,
                    lopDaysFinal,
                    paidDays: earnings.paidDays,
                    getYear,
                    esicApplicable,
                    ptLoc,
                    year: yearText,
                    subDept,
                    location,
                    otHours,
                    remarks
                });

                // Social Security (SS)
                if (socialInsApp === 'T' || socialInsApp === true) {
                    const ssCompId = searchSSId(payGroup);
                    const ssEmployeeContri = (parseFloat(earnings.ssGrossTotal || 0) * parseFloat(searchSSEMP(payGroup) || 0)) / 100;
                    const ssEmployerContri = (parseFloat(earnings.ssGrossTotal || 0) * parseFloat(searchSSEmployer(payGroup) || 0)) / 100;

                    createSSComp({
                        wEndDate: wEndDateStr,
                        entityId: empId,
                        entitytitle:entitytitle,
                        empNameTx: empNameText,
                        empCode,
                        processType: 1,
                        payGroup,
                        dept,
                        wagePeriod: wagePeriodId,
                        company,
                        ssId: ssCompId,
                        ssEmployeeContri,
                        ssEmployerContri,
                        ssGrossTotal: earnings.ssGrossTotal,
                        lopDaysFinal,
                        paidDays: earnings.paidDays,
                        getYear,
                        ptLoc,
                        subDept,
                        remarks
                    });
                }

                // Gross totals
                const earningTotal = getEarningGross({
                    wEndDate: wEndDateStr,
                    empNameTx: empNameText,
                    empCode,
                    payGroup,
                    wagePeriodId,
                    empId,
                    entitytitle:entitytitle,
                    componentType: earnings.componentType,
                    getYear,
                    dept,
                    company,
                    processType: 1,
                    entityId: empId,
                    paidDays: earnings.paidDays,
                    lopDaysFinal,
                    esicApplicable,
                    ptLoc,
                    subDept,
                    location,
                    otHours,
                    remarks
                });

                const deductionTotal = getDeductionGross({
                    wEndDate: wEndDateStr,
                    empNameTx: empNameText,
                    empCode,
                    payGroup,
                    wagePeriodId,
                    empId,
                    entitytitle:entitytitle,
                    componentType: deductions.componentType,
                    getYear,
                    dept,
                    company,
                    processType: 1,
                    entityId: empId,
                    paidDays: earnings.paidDays,
                    lopDaysFinal,
                    esicApplicable,
                    ptLoc,
                    subDept,
                    location,
                    otHours,
                    remarks
                });

                log.debug('Gross Totals', { earningTotal, deductionTotal });

                // Net Pay
                getNetPay({
                    wEndDate: wEndDateStr,
                    empNameTx: empNameText,
                    empId,
                    empCode,
                    payGroup,
                    wagePeriodId,
                    earningTotal,
                    deductionTotal,
                    getYear,
                    dept,
                    company,
                    processType: 1,
                    entityId: empId,
                    entitytitle:entitytitle,
                    paidDays: earnings.paidDays,
                    lopDaysFinal,
                    esicApplicable,
                    ptLoc,
                    subDept,
                    location,
                    otHours,
                    remarks
                });

                // ONLY IF WE REACH HERE: Mark as completed
                prePayRec.setValue('custrecord_hris_pre_pay_pr_status', 'Completed');
                prePayRec.setValue('custrecord_hris_pre_pay_pr_checked', true);
                prePayRec.save();

                return {
                    success: true,
                    message: 'Pay process completed successfully',
                    prePayProcessId: prePayProcessId,
                    actualEarning: earningTotal,
                    actualDeduction: deductionTotal,
                    netPay: parseFloat(earningTotal || 0) - parseFloat(deductionTotal || 0)
                };

            } catch (err) {
                log.error('PAY PROCESS FAILED', {
                    message: err.message,
                    stack: err.stack
                });

                try {
                    const empIdForLog = prePayRec
                        ? prePayRec.getValue('custrecord_hris_pre_pay_pr_employee_name')
                        : null;
                    const payGroupForLog = prePayRec
                        ? prePayRec.getValue('custrecord_hris_pre_pay_pr_pay_group')
                        : null;
                    const wageMonthForLog = prePayRec
                        ? prePayRec.getValue('custrecord_hris_pre_pay_pr_wage_month')
                        : null;
                    const companyForLog = prePayRec
                        ? null
                        : null;

                    logErrorToCustomRecord(
                        'processEmployeePay',
                        err,
                        payGroupForLog,
                        companyForLog,
                        empIdForLog,
                        wageMonthForLog,
                        null,
                        prePayProcessId
                            ? (CUSTOM_RECORDS.PRE_PAY_PROCESS + ' (ID: ' + prePayProcessId + ')')
                            : ''
                    );
                } catch (logErr) {
                    log.error('Failed to write pay process log', logErr.message);
                }

                try {
                    if (prePayRec) {
                        prePayRec.setValue('custrecord_hris_pre_pay_pr_status', 'Error');
                        prePayRec.setValue('custrecord_hris_pre_pay_pr_remarks', 'Error: ' + err.message);
                        prePayRec.save();
                    }
                } catch (saveErr) {
                    log.error('Failed to update PrePay status to Error', saveErr.message);
                }

                return {
                    success: false,
                    message: 'Pay process failed: ' + err.message
                };
            }
        };

        // ==================== HELPER FUNCTIONS ====================

        const createPayProcessRecord = (params) => {
            try {
                //const amt =0;
                if (!params.component && params.component !== 0) {
                    log.error('createPayProcessRecord', 'component is null/undefined – skipping record create');
                    return null;
                }

                const payRec = record.create({ type: CUSTOM_RECORDS.PAY_PROCESS });

                payRec.setValue('custrecord_hris_pay_proc_employee', params.entityId);
                payRec.setValue('custrecord_hris_pay_proc_employee_code', params.empCode);
                payRec.setValue('custrecord_hris_pay_proc_process_type', params.processType);
                payRec.setValue('custrecord_hris_pay_proc_pay_group', params.payGroup);
                payRec.setValue('custrecord_hris_pay_proc_employee_name', params.entitytitle);
                payRec.setValue('custrecord_hris_pay_proc_department', params.dept);
                payRec.setValue('custrecord_hris_pay_proc_subdept', params.subDept);
               

                if (params.company) {
                    payRec.setValue('custrecord_hris_pay_proc_company_name', params.company);
                }

                payRec.setValue('custrecord_hris_pay_proc_pay_month', params.wagePeriod);

                if (params.wEndDate) {
                    const d = (typeof params.wEndDate === 'string')
                        ? format.parse({ value: params.wEndDate, type: format.Type.DATE })
                        : params.wEndDate;
                    payRec.setValue('custrecord_hris_pay_proc_pay_date', d);
                }

                payRec.setValue('custrecord_hris_pay_proc_year', params.getYear);
                payRec.setValue('custrecord_hris_pay_proc_payroll_compone', params.component);

                if (params.accountCode) {
                    payRec.setValue('custrecord_hris_pay_proc_account_code', params.accountCode);
                }

                if (params.componentType !== null && params.componentType !== undefined && params.componentType !== '') {
                    payRec.setValue('custrecord_hris_pay_proc_component_type', params.componentType);
                }

                payRec.setValue('custrecord_hris_pay_proc_lop_days', params.lopDays || 0);
                 payRec.setValue('custrecord_hris_pay_proc_lop_amount',params.lopAmt || 0);
                payRec.setValue('custrecord_hris_pay_proc_pro_rata_amount', params.proRataAmt || 0);
                payRec.setValue('custrecord_hris_pay_proc_arrears', params.arrearAmt || 0);

                // Always set both gross fields so earning / deduction searches work
                const amt = params.actualGross || 0;
               
                   const proRataAmt = parseFloat(params.proRataAmt || 0);
                const salaryAmt = (proRataAmt > 0) ? proRataAmt : amt;

                try {
                   // payRec.setValue('custrecord_hris_pay_proc_actual_gross_de', amt);
                } catch (ignore) { /* field may not exist on some accounts */ }
                const paycomponentseq = getPayComponentSequenceNo(params.component);
                if (params.componentType == 1 || paycomponentseq == 50) {
                    payRec.setValue('custrecord_hris_pay_proc_actual_gross_ea', amt);
                    payRec.setValue('custrecord_hris_pay_proc_gross_earning', salaryAmt);
                    payRec.setValue('custrecord_hris_pay_proc_actual_salary', salaryAmt);
                    payRec.setValue('custrecord_hris_pay_proc_value', amt);
                } else if (params.componentType == 2 || paycomponentseq == 99) {
                    if (paycomponentseq == 99) {
                        log.emergency('GrossDedAmt', amt);
                    }

                    payRec.setValue('custrecord_hris_pay_proc_gross_deduction', amt);
                    payRec.setValue('custrecord_hris_pay_proc_actual_salary', salaryAmt);
                    payRec.setValue('custrecord_hris_pay_proc_actual_gross_de', amt);
                    payRec.setValue('custrecord_hris_pay_proc_value', amt);
                }
                
                
                if(params.loanAppId){

                    payRec.setValue('custrecord_hris_pay_proc_loan_reference',params.loanAppId);
                    payRec.setValue('custrecord_hris_pay_proc_loan_year',params.yeartext);
                }
             
		
        
              
                payRec.setValue('custrecord_hris_pay_proc_paid_days', params.paidDays || 0);
                payRec.setValue('custrecord_hris_pay_proc_lop_days_final', params.lopDaysFinal || 0);
                payRec.setValue('custrecord_hris_pay_proc_pt_location', params.ptLoc);
                payRec.setValue('custrecord_hris_pay_proc_othours', params.otHours || 0);
                payRec.setValue('custrecord_hris_pay_proc_remark', params.remarks || '');

                const id = payRec.save();
                log.debug('createPayProcessRecord OK', { id, component: params.component, amount: amt });
                return id;
            } catch (e) {
                log.error('createPayProcessRecord Error', {
                    message: e.message,
                    component: params && params.component,
                    entityId: params && params.entityId
                });
                throw e;
            }
        };

        const getEmployeeEarningComp = (p) => {
            try {
                let actualGrossTotal = 0;
                let ssGrossTotal = 0;
                let itGrossTotal = 0;
                let componentType = '';

                const compensationSearch = search.create({
                    type: 'customrecord_hris_employee_compen_change',
                    filters: [
                        ['custrecord_hris_empchange_emp_pay_pro_gp', 'anyof', p.payGroup],
                        'AND',
                        ['custrecord_hris_empchange_employee_nam', 'anyof', p.empId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        search.createColumn({ name: 'custrecord_hris_cde_payroll_component', join: 'custrecord_hris_employee_data_change' }),
                        search.createColumn({ name: 'custrecord_hris_cde_monthly', join: 'custrecord_hris_employee_data_change' })
                    ]
                });

                compensationSearch.run().each(result => {
                    try {
                        const earnComponent = result.getValue({ name: 'custrecord_hris_cde_payroll_component', join: 'custrecord_hris_employee_data_change' });
                        const currentMonthly = parseFloat(result.getValue({ name: 'custrecord_hris_cde_monthly', join: 'custrecord_hris_employee_data_change' }) || 0);

                        if (currentMonthly > 0 && earnComponent) {
                            const compRec = record.load({ type: CUSTOM_RECORDS.PAYROLL_COMPONENT, id: earnComponent });
                            componentType = compRec.getValue('custrecord_hris_payroll_component_type');
                            const accountCode = compRec.getValue('custrecord_hris_account_name');

                            let lopAmt = 0;
                            let arrearAmt = 0;
                            let proRataAmt = 0;

                            if (compRec.getValue('custrecord_hris_loss_of_pay')) {
                                const lop = getLOPDays(p.empId, p.wagePeriodId, currentMonthly, p.monthDays, p.getYear);
                                lopAmt = lop.amount;
                                log.audit('Earning Lop Amt',lopAmt)
                            }

                            if (compRec.getValue('custrecord_hris_arrears')) {
                                const arr = getArrearDays(p.empId, currentMonthly, p.arrearMonthDays, p.wagePeriodId, p.getYear);
                                arrearAmt = Math.abs(arr.amount);
                                log.audit('Earning arrearAmt',arrearAmt);
                            }

                            if (compRec.getValue('custrecord_hris_pro_rate')) {
                                const present = getEmployeeDateOfJoining(p.empId, p.wagePeriodId, 0, p.getYear,p.payGroup);
                                proRataAmt = (currentMonthly / present.monthDays) * present.presentDays;
                            }

                            if (compRec.getValue('custrecord_hris_ss')) {
                                ssGrossTotal += currentMonthly;
                            }
                            if (compRec.getValue('custrecord_hris_income_tax')) {
                                itGrossTotal += currentMonthly;
                            }

                            const finalAmt = currentMonthly - Math.abs(lopAmt) + arrearAmt;
                            actualGrossTotal += finalAmt;

                            createPayProcessRecord({
                                entityId: p.entityId,entitytitle:p.entitytitle, empCode: p.empCode, processType: p.processType,
                                payGroup: p.payGroup, empNameTx: p.empNameTx, dept: p.dept,
                                subDept: p.subDept, company: p.company, wagePeriod: p.wagePeriodId,
                                wEndDate: p.wEndDate, getYear: p.getYear, component: earnComponent,
                                accountCode, componentType, lopAmt, proRataAmt, arrearAmt,
                                actualGross: finalAmt, paidDays: p.paidDays, lopDaysFinal: p.lopDaysFinal,
                                ptLoc: p.ptLoc, otHours: p.otHours, remarks: p.remarks
                            });
                        }
                    } catch (innerErr) {
                        log.error('getEmployeeEarningComp - row error', innerErr.message);
                    }
                    return true;
                });

                return { actualGross: actualGrossTotal, componentType, paidDays: p.paidDays, ssGrossTotal, itGrossTotal };
            } catch (e) {
                log.error('getEmployeeEarningComp Error', e.message);
                throw e;
            }
        };

        /**
 * Get Payroll Component sequence number by internal id
 * @param {number|string} componentId
 * @returns {string|null}
 */
const getPayComponentSequenceNo = (componentId) => {
    try {
        if (!componentId) {
            return null;
        }

        const res = search.create({
            type: 'customrecord_hris_payroll_component',
            filters: [
                ['internalid', 'anyof', componentId],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['custrecord_hris__sequence_no_']
        }).run().getRange({ start: 0, end: 1 });

        const sequenceNo = res.length
            ? res[0].getValue('custrecord_hris__sequence_no_')
            : null;

        log.debug({
            title: 'getPayComponentSequenceNo',
            details: { componentId: componentId, sequenceNo: sequenceNo }
        });

        return sequenceNo;
    } catch (e) {
        log.error({
            title: 'getPayComponentSequenceNo Error',
            details: { componentId: componentId, message: e.message }
        });
        return null;
    }
};

        const getEmployeeDeductionComp = (p) => {
            try {
                let actualGrossTotal = 0;
                let componentType = '';

                const dedSearch = search.create({
                    type: 'customrecord_hris_employee_compen_change',
                    filters: [
                        ['custrecord_hris_empchange_emp_pay_pro_gp', 'anyof', p.payGroup],
                        'AND',
                        ['custrecord_hris_empchange_employee_nam', 'anyof', p.empId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        search.createColumn({ name: 'custrecord_hris_cdb_payroll_component', join: 'custrecord_hris_employee_datachangeint' }),
                        search.createColumn({ name: 'custrecord_hris_cdb_monthly', join: 'custrecord_hris_employee_datachangeint' })
                    ]
                });

                dedSearch.run().each(result => {
                    try {
                        const dedComponent = result.getValue({ name: 'custrecord_hris_cdb_payroll_component', join: 'custrecord_hris_employee_datachangeint' });
                        const currentMonthly = parseFloat(result.getValue({ name: 'custrecord_hris_cdb_monthly', join: 'custrecord_hris_employee_datachangeint' }) || 0);

                        if (currentMonthly > 0 && dedComponent) {
                            const compRec = record.load({ type: CUSTOM_RECORDS.PAYROLL_COMPONENT, id: dedComponent });
                            componentType = compRec.getValue('custrecord_hris_payroll_component_type');
                            const accountCode = compRec.getValue('custrecord_hris_account_name');

                            actualGrossTotal += currentMonthly;

                            createPayProcessRecord({
                                entityId: p.entityId,entitytitle:p.entitytitle,empCode: p.empCode, processType: p.processType,
                                payGroup: p.payGroup, empNameTx: p.empNameTx, dept: p.dept,
                                subDept: p.subDept, company: p.company, wagePeriod: p.wagePeriodId,
                                wEndDate: p.wEndDate, getYear: p.getYear, component: dedComponent,
                                accountCode, componentType, actualGross: currentMonthly,
                                paidDays: p.paidDays, lopDaysFinal: p.lopDaysFinal, ptLoc: p.ptLoc,
                                otHours: p.otHours, remarks: p.remarks
                            });
                        }
                    } catch (innerErr) {
                        log.error('getEmployeeDeductionComp - row error', innerErr.message);
                    }
                    return true;
                });

                return { actualGross: actualGrossTotal, componentType, paidDays: p.paidDays };
            } catch (e) {
                log.error('getEmployeeDeductionComp Error', e.message);
                throw e;
            }
        };

        const getEmployeeOtherComp = (p) => {
            try {
                const otherSearch = search.create({
                    type: 'customrecord_hris_employee_compen_change',
                    filters: [
                        ['custrecord_hris_empchange_emp_pay_pro_gp', 'anyof', p.payGroup],
                        'AND',
                        ['custrecord_hris_empchange_employee_nam', 'anyof', p.empId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        search.createColumn({ name: 'custrecord_hris_payroll_component', join: 'custrecord_hris_employee_data_change_int' }),
                        search.createColumn({ name: 'custrecord_hris_monthly', join: 'custrecord_hris_employee_data_change_int' })
                    ]
                });

                otherSearch.run().each(result => {
                    try {
                        const otherComponent = result.getValue({ name: 'custrecord_hris_payroll_component', join: 'custrecord_hris_employee_data_change_int' });
                        const currentMonthly = parseFloat(result.getValue({ name: 'custrecord_hris_monthly', join: 'custrecord_hris_employee_data_change_int' }) || 0);

                        if (currentMonthly > 0 && otherComponent) {
                            const compRec = record.load({ type: CUSTOM_RECORDS.PAYROLL_COMPONENT, id: otherComponent });
                            const componentType = compRec.getValue('custrecord_hris_payroll_component_type');
                            const accountCode = compRec.getValue('custrecord_hris_account_name');

                            createPayProcessRecord({
                                entityId: p.entityId,entitytitle:p.entitytitle, empCode: p.empCode, processType: p.processType,
                                payGroup: p.payGroup, empNameTx: p.empNameTx, dept: p.dept,
                                subDept: p.subDept, company: p.company, wagePeriod: p.wagePeriodId,
                                wEndDate: p.wEndDate, getYear: p.getYear, component: otherComponent,
                                accountCode, componentType, actualGross: currentMonthly,
                                paidDays: p.paidDays, lopDaysFinal: p.lopDaysFinal, ptLoc: p.ptLoc,
                                otHours: p.otHours, remarks: p.remarks
                            });
                        }
                    } catch (innerErr) {
                        log.error('getEmployeeOtherComp - row error', innerErr.message);
                    }
                    return true;
                });
            } catch (e) {
                log.error('getEmployeeOtherComp Error', e.message);
                throw e;
            }
        };

        const getMonthlyVariableComp = (p) => {
            try {
                const mvSearch = search.create({
                    type: CUSTOM_RECORDS.MONTHLY_SAL,
                    filters: [
                        ['custrecord_hris_mthsal_paygroup', 'anyof', p.payGroup],
                        'AND',
                        ['custrecord_hris_mthsal_empname', 'anyof', p.empId],
                        'AND',
                        ['custrecord_hris_mthsal_month', 'is', p.wagePeriodId],
                        'AND',
                        ['custrecord_hris_mthsal_year', 'is', p.getYear],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_mthsal_salaryamount', 'custrecord_hris_mthsal_paycomponent']
                });

                mvSearch.run().each(result => {
                    try {
                        const monthlyAmt = parseFloat(result.getValue('custrecord_hris_mthsal_salaryamount') || 0);
                        const payComponent = result.getValue('custrecord_hris_mthsal_paycomponent');

                        if (monthlyAmt > 0 && payComponent) {
                            const compRec = record.load({ type: CUSTOM_RECORDS.PAYROLL_COMPONENT, id: payComponent });
                            const componentType = compRec.getValue('custrecord_hris_payroll_component_type');
                            const accountCode = compRec.getValue('custrecord_hris_account_name');

                            createPayProcessRecord({
                                entityId: p.entityId,entitytitle:p.entitytitle, empCode: p.empCode, processType: p.processType,
                                payGroup: p.payGroup, empNameTx: p.empNameTx, dept: p.dept,
                                subDept: p.subDept, company: p.company, wagePeriod: p.wagePeriodId,
                                wEndDate: p.wEndDate, getYear: p.getYear, component: payComponent,
                                accountCode, componentType, actualGross: monthlyAmt,
                                paidDays: p.paidDays, lopDaysFinal: p.lopDaysFinal, ptLoc: p.ptLoc,
                                otHours: p.otHours, remarks: p.remarks
                            });
                        }
                    } catch (innerErr) {
                        log.error('getMonthlyVariableComp - row error', innerErr.message);
                    }
                    return true;
                });
            } catch (e) {
                log.error('getMonthlyVariableComp Error', e.message);
                throw e;
            }
        };

        const createPTComp = (p) => {
            try {
                const ptCompId = searchPTId(p.payGroup);
                if (!ptCompId) {
                    log.error('createPTComp', 'PT Component (sequence 55) not found – skipping PT');
                    return;
                }

                let accountCode = null;
                try {
                    const acctLookup = search.lookupFields({
                        type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                        id: ptCompId,
                        columns: ['custrecord_hris_account_name']
                    });
                    if (acctLookup.custrecord_hris_account_name && acctLookup.custrecord_hris_account_name[0]) {
                        accountCode = acctLookup.custrecord_hris_account_name[0].value;
                    }
                } catch (acctErr) {
                    log.error('createPTComp - account lookup', acctErr.message);
                }

                const ptGrossTotal = searchPTGross(p.payGroup, p.entityId, p.wagePeriod, p.getYear);
                const ptCalc = searchSlabAmt(ptGrossTotal, p.ptLoc);

                const payRec = record.create({ type: CUSTOM_RECORDS.PAY_PROCESS });
                payRec.setValue('custrecord_hris_pay_proc_employee', p.entityId);
                payRec.setValue('custrecord_hris_pay_proc_employee_code', p.empCode);
                payRec.setValue('custrecord_hris_pay_proc_pay_group', p.payGroup);
                payRec.setValue('custrecord_hris_pay_proc_employee_name', p.entitytitle);
                payRec.setValue('custrecord_hris_pay_proc_department', p.dept);
                payRec.setValue('custrecord_hris_pay_proc_subdept', p.subDept);
                payRec.setValue('custrecord_hris_pay_proc_pay_month', p.wagePeriod);
                payRec.setValue('custrecord_hris_pay_proc_year', p.getYear);
                payRec.setValue('custrecord_hris_pay_proc_payroll_compone', ptCompId);
                if (accountCode) {
                    payRec.setValue('custrecord_hris_pay_proc_account_code', accountCode);
                }
                payRec.setValue('custrecord_hris_pay_proc_component_type', 2);
                payRec.setValue('custrecord_hris_pay_proc_pt_gross', ptGrossTotal);
                payRec.setValue('custrecord_hris_pay_proc_actual_salary', ptCalc);
                payRec.setValue('custrecord_hris_pay_proc_gross_deduction', ptCalc);
                payRec.setValue('custrecord_hris_pay_proc_value', ptCalc);
                // Ensure deduction gross search can pick this up
                try {
                    payRec.setValue('custrecord_hris_pay_proc_actual_gross_de', ptCalc);
                    payRec.setValue('custrecord_hris_pay_proc_actual_gross_ea', ptCalc);
                } catch (ignore) { /* optional fields */ }
                payRec.save();
                log.debug('createPTComp OK', { ptCompId, ptCalc, ptGrossTotal });
            } catch (e) {
                log.error('createPTComp Error', e.message);
                throw e;
            }
        };

        const createSSComp = (p) => {
            try {
                if (!p.ssId) {
                    log.error('createSSComp', 'SS Component (sequence 92) not found – skipping SS');
                    return;
                }

                const payRec = record.create({ type: CUSTOM_RECORDS.PAY_PROCESS });
                payRec.setValue('custrecord_hris_pay_proc_employee', p.entityId);
                payRec.setValue('custrecord_hris_pay_proc_employee_code', p.empCode);
                payRec.setValue('custrecord_hris_pay_proc_pay_group', p.payGroup);
               payRec.setValue('custrecord_hris_pay_proc_employee_name', p.entitytitle);
                payRec.setValue('custrecord_hris_pay_proc_pay_month', p.wagePeriod);
                payRec.setValue('custrecord_hris_pay_proc_year', p.getYear);
                payRec.setValue('custrecord_hris_pay_proc_payroll_compone', p.ssId);
                payRec.setValue('custrecord_hris_pay_proc_component_type', 2);
                payRec.setValue('custrecord_hris_pay_proc_ss_gross', p.ssGrossTotal);
                payRec.setValue('custrecord_hris_pay_proc_social_security', p.ssEmployeeContri);
                payRec.setValue('custrecord_hris_pay_proc_socialsecurity', p.ssEmployerContri);
                payRec.setValue('custrecord_hris_pay_proc_actual_salary', p.ssEmployeeContri);
                payRec.setValue('custrecord_hris_pay_proc_gross_deduction', p.ssEmployeeContri);
                payRec.setValue('custrecord_hris_pay_proc_value', p.ssEmployeeContri);
                try {
                    payRec.setValue('custrecord_hris_pay_proc_actual_gross_de', p.ssEmployeeContri);
                    payRec.setValue('custrecord_hris_pay_proc_actual_gross_ea', p.ssEmployeeContri);
                } catch (ignore) { /* optional */ }
                payRec.save();
                log.debug('createSSComp OK', { ssId: p.ssId, empContri: p.ssEmployeeContri });
            } catch (e) {
                log.error('createSSComp Error', e.message);
                throw e;
            }
        };

        const createLoanComp = (p) => {
            try {
                if (!p.searchLoanIds || !p.searchLoanIds.loanRecordIds || p.searchLoanIds.loanRecordIds.length === 0) {
                    log.debug('createLoanComp', 'No loan records found – skipping');
                    return;
                }

                const { loanRecordIds, loanCompIds, loanChildIds } = p.searchLoanIds;

                // Deduction component type id (sequence 2)
                let dedCompTypeId = 2;
                try {
                    dedCompTypeId = searchDedcCompType() || 2;
                } catch (typeErr) {
                    log.error('createLoanComp - searchDedcCompType', typeErr.message);
                }

                for (let i = 0; i < loanRecordIds.length; i++) {
                    try {
                        if (!loanCompIds[i]) {
                            log.error({
                                title: 'createLoanComp - loanCompId missing',
                                details: 'index=' + i + ', loanAppId=' + loanRecordIds[i] +
                                    '. Set Payroll Component on Loan Master.'
                            });
                            continue;
                        }

                        if (!loanChildIds[i]) {
                            log.error({
                                title: 'createLoanComp - loanChildId missing',
                                details: 'index=' + i + ', loanAppId=' + loanRecordIds[i]
                            });
                            continue;
                        }

                        const childData = search.lookupFields({
                            type: CUSTOM_RECORDS.LOAN_CHILD,
                            id: loanChildIds[i],
                            columns: ['custrecord_hris_loan_alloc_paidamount']
                        });

                        // lookupFields may return string or object
                        let paidRaw = childData.custrecord_hris_loan_alloc_paidamount;
                        if (Array.isArray(paidRaw) && paidRaw[0]) {
                            paidRaw = paidRaw[0].value || paidRaw[0];
                        } else if (paidRaw && typeof paidRaw === 'object' && paidRaw.value !== undefined) {
                            paidRaw = paidRaw.value;
                        }
                        const loanEntry = parseFloat(paidRaw || 0);

                        log.debug({
                            title: 'createLoanComp - amount',
                            details: {
                                index: i,
                                loanAppId: loanRecordIds[i],
                                loanCompId: loanCompIds[i],
                                loanChildId: loanChildIds[i],
                                loanEntry: loanEntry
                            }
                        });

                        if (!loanEntry || loanEntry <= 0) {
                            log.debug('createLoanComp - skip zero amount', loanRecordIds[i]);
                            continue;
                        }

                        // Use shared createPayProcessRecord (same as earnings / deductions)
                        const savedId = createPayProcessRecord({
                            entityId: p.entityId,
                            entitytitle:p.entitytitle, 
                            empCode: p.empCode,
                            processType: p.processType || 1,
                            payGroup: p.payGroup,
                            empNameTx: p.empNameTx,
                            dept: p.dept,
                            subDept: p.subDept,
                            company: p.company,
                            wagePeriod: p.wagePeriod,
                            wEndDate: p.wEndDate,
                            getYear: p.getYear,
                            component: loanCompIds[i],
                            loanAppId:loanRecordIds[i],
                            accountCode: null,
                            componentType: dedCompTypeId,  // Deduction type
                            actualGross: loanEntry,
                            paidDays: p.paidDays,
                            lopDaysFinal: p.lopDaysFinal,
                            ptLoc: p.ptLoc,
                            otHours: p.otHours,
                            remarks: p.remarks,
                            yeartext:p.year
                        });

                        log.audit({
                            title: 'createLoanComp OK',
                            details: {
                                payProcessId: savedId,
                                loanCompId: loanCompIds[i],
                                amount: loanEntry
                            }
                        });
                    } catch (innerErr) {
                        log.error({
                            title: 'createLoanComp - row error index ' + i,
                            details: { message: innerErr.message, stack: innerErr.stack }
                        });
                    }
                }
            } catch (e) {
                log.error({
                    title: 'createLoanComp Error',
                    details: { message: e.message, stack: e.stack }
                });
                throw e;
            }
        };

        const getEarningGross = (p) => {
            try {
                let totalActGrossEarn = 0;
                const earnTypeId = searchEarnCompType();

                const earnSearch = search.create({
                    type: CUSTOM_RECORDS.PAY_PROCESS,
                    filters: [
                        ['custrecord_hris_pay_proc_employee', 'anyof', p.entityId],
                        'AND',
                        ['custrecord_hris_pay_proc_pay_month', 'anyof', p.wagePeriodId],
                        'AND',
                        ['custrecord_hris_pay_proc_year','anyof',p.getYear],
                        'AND',
                        ['custrecord_hris_pay_proc_component_type', 'anyof', earnTypeId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_pay_proc_actual_gross_ea']
                });

                earnSearch.run().each(result => {
                    totalActGrossEarn += parseFloat(result.getValue('custrecord_hris_pay_proc_actual_gross_ea') || 0);
                    log.emergency('totalActGrossEarn',totalActGrossEarn)
                    return true;
                });

                const grossEarnId = searchGrossEarnID(p.payGroup);
                if (!grossEarnId) {
                    log.error('getEarningGross', 'Gross Earning component (sequence 50) not found');
                } else {
                    createPayProcessRecord({
                        entityId: p.entityId,entitytitle:p.entitytitle,  empCode: p.empCode, processType: p.processType,
                        payGroup: p.payGroup, empNameTx: p.empNameTx, dept: p.dept,
                        subDept: p.subDept, company: p.company, wagePeriod: p.wagePeriodId,
                        wEndDate: p.wEndDate, getYear: p.getYear, component: grossEarnId,
                        componentType: null, actualGross: totalActGrossEarn, paidDays: p.paidDays,
                        lopDaysFinal: p.lopDaysFinal, ptLoc: p.ptLoc, otHours: p.otHours, remarks: p.remarks
                    });
                }

                log.debug('getEarningGross', { totalActGrossEarn });
                return totalActGrossEarn;
            } catch (e) {
                log.error('getEarningGross Error', e.message);
                throw e;
            }
        };

        const getDeductionGross = (p) => {
            try {
                log.emergency('Year',p.getYear);
                let totalGrossDedc = 0;
                 let totalActGrossDedc = 0;
                const dedTypeId = searchDedcCompType();
                log.emergency('dedTypeId',dedTypeId);

                // Search both possible deduction amount fields
                const dedSearch = search.create({
                    type: CUSTOM_RECORDS.PAY_PROCESS,
                    filters: [
                        ['custrecord_hris_pay_proc_employee', 'anyof', p.entityId],
                        'AND',
                        ['custrecord_hris_pay_proc_pay_month', 'anyof', p.wagePeriodId],
                        'AND',
                        ['custrecord_hris_pay_proc_year','anyof',p.getYear],
                        'AND',
                        ['custrecord_hris_pay_proc_component_type', 'anyof', dedTypeId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'custrecord_hris_pay_proc_actual_gross_de',
                        'custrecord_hris_pay_proc_actual_gross_ea',
                        'custrecord_hris_pay_proc_value',
                        'custrecord_hris_pay_proc_gross_deduction'
                    ]
                });

                dedSearch.run().each(result => {
                    let grossamt = parseFloat(result.getValue('custrecord_hris_pay_proc_actual_gross_de') || 0);
                    log.emergency('grossamt',grossamt);
                    let amt = parseFloat(result.getValue('custrecord_hris_pay_proc_gross_deduction') || 0);
                  /*   if (!amt) amt = parseFloat(result.getValue('custrecord_hris_pay_proc_value') || 0);
                    if (!amt) amt = parseFloat(result.getValue('custrecord_hris_pay_proc_actual_gross_ea') || 0);
                  */   
                 totalActGrossDedc += grossamt;
                 totalGrossDedc += amt;
                    return true;
                });
                log.emergency('totalActgrossDedc',totalActGrossDedc);
                const dedGrossId = searchDeductionEarnId(p.payGroup);
                if (!dedGrossId) {
                    log.error('getDeductionGross', 'Gross Deduction component (sequence 99) not found');
                } else {
                    createPayProcessRecord({
                        entityId: p.entityId,entitytitle:p.entitytitle,  empCode: p.empCode, processType: p.processType,
                        payGroup: p.payGroup, empNameTx: p.empNameTx, dept: p.dept,
                        subDept: p.subDept, company: p.company, wagePeriod: p.wagePeriodId,
                        wEndDate: p.wEndDate, getYear: p.getYear, component: dedGrossId,
                        componentType: null, actualGross: totalActGrossDedc, paidDays: p.paidDays,
                        lopDaysFinal: p.lopDaysFinal, ptLoc: p.ptLoc, otHours: p.otHours, remarks: p.remarks
                    });
                }

                log.debug('getDeductionGross', { totalActGrossDedc });
                return totalActGrossDedc;
            } catch (e) {
                log.error('getDeductionGross Error', e.message);
                throw e;
            }
        };

        /**
         * FIXED Net Pay creation
         * Previous issues:
         * 1. searchNetId could return null → setValue(null) fails
         * 2. Missing pay_group, emp_code, process_type, department
         * 3. No try-catch
         */
        const getNetPay = (p) => {
            try {
                let finalNetPay = parseFloat(p.earningTotal || 0) - parseFloat(p.deductionTotal || 0);
                finalNetPay = Math.round(finalNetPay);

                const netPayCompId = searchNetId(p.payGroup);
                if (!netPayCompId) {
                    throw new Error('Net Pay component (sequence_no = 100) not found in Payroll Component master. Cannot create Net Pay record.');
                }

                log.debug('getNetPay - values', {
                    earningTotal: p.earningTotal,
                    deductionTotal: p.deductionTotal,
                    finalNetPay,
                    netPayCompId,
                    entityId: p.entityId,
                    entitytitle:p.entitytitle, 
                    wagePeriodId: p.wagePeriodId,
                    getYear: p.getYear
                });

                const payRec = record.create({ type: CUSTOM_RECORDS.PAY_PROCESS });

                payRec.setValue('custrecord_hris_pay_proc_employee', p.entityId);
                payRec.setValue('custrecord_hris_pay_proc_employee_name', p.entitytitle);
                if (p.empCode) {
                    payRec.setValue('custrecord_hris_pay_proc_employee_code', p.empCode);
                }
                if (p.payGroup) {
                    payRec.setValue('custrecord_hris_pay_proc_pay_group', p.payGroup);
                }
                if (p.processType) {
                    payRec.setValue('custrecord_hris_pay_proc_process_type', p.processType);
                }
                if (p.dept) {
                    payRec.setValue('custrecord_hris_pay_proc_department', p.dept);
                }
                if (p.subDept) {
                    payRec.setValue('custrecord_hris_pay_proc_subdept', p.subDept);
                }
                if (p.company) {
                    payRec.setValue('custrecord_hris_pay_proc_company_name', p.company);
                }

                payRec.setValue('custrecord_hris_pay_proc_pay_month', p.wagePeriodId);

                if (p.wEndDate) {
                    const d = (typeof p.wEndDate === 'string')
                        ? format.parse({ value: p.wEndDate, type: format.Type.DATE })
                        : p.wEndDate;
                    payRec.setValue('custrecord_hris_pay_proc_pay_date', d);
                }

                payRec.setValue('custrecord_hris_pay_proc_year', p.getYear);
                payRec.setValue('custrecord_hris_pay_proc_payroll_compone', netPayCompId);
                payRec.setValue('custrecord_hris_pay_proc_net_pay', finalNetPay);
                payRec.setValue('custrecord_hris_pay_proc_value', finalNetPay);

                // Also set gross fields for consistency
                try {
                    payRec.setValue('custrecord_hris_pay_proc_actual_gross_ea', finalNetPay);
                } catch (ignore) { /* optional */ }

                if (p.paidDays !== undefined) {
                    payRec.setValue('custrecord_hris_pay_proc_paid_days', p.paidDays || 0);
                }
                if (p.lopDaysFinal !== undefined) {
                    payRec.setValue('custrecord_hris_pay_proc_lop_days_final', p.lopDaysFinal || 0);
                }
                if (p.remarks) {
                    payRec.setValue('custrecord_hris_pay_proc_remark', p.remarks);
                }

                const savedId = payRec.save();
                log.audit('getNetPay SUCCESS', { savedId, finalNetPay, netPayCompId });
                return savedId;
            } catch (e) {
                log.error('getNetPay Error', {
                    message: e.message,
                    stack: e.stack,
                    earningTotal: p && p.earningTotal,
                    deductionTotal: p && p.deductionTotal
                });
                throw e;
            }
        };

        // ==================== UTILITY FUNCTIONS ====================

        const getWagePeriodNo = (wageName) => {
            try {
                const monthMap = {
                    'January': '1', 'February': '2', 'March': '3', 'April': '4',
                    'May': '5', 'June': '6', 'July': '7', 'August': '8',
                    'September': '9', 'October': '10', 'November': '11', 'December': '12'
                };
                return monthMap[wageName] || wageName;
            } catch (e) {
                log.error('getWagePeriodNo Error', e.message);
                return wageName;
            }
        };

        const getMonthDays = (monthNum) => {
            try {
                const m = getWagePeriodNo(monthNum);
                if (['1', '3', '5', '7', '8', '10', '12'].includes(m)) return 31;
                if (['4', '6', '9', '11'].includes(m)) return 30;
                if (m === '2') {
                    const year = new Date().getFullYear();
                    return (year % 4 === 0) ? 29 : 28;
                }
                return 30;
            } catch (e) {
                log.error('getMonthDays Error', e.message);
                return 30;
            }
        };

        const getWagePeriodYear = (payGroup, wagePeriodId) => {
            try {
                const wageSearch = search.create({
                    type: CUSTOM_RECORDS.WAGE_PERIOD,
                    filters: [
                        ['custrecord_hris_pay_group', 'anyof', payGroup],
                        'AND',
                        ['custrecord_hris_month', 'is', wagePeriodId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_year', 'custrecord_hris_end_date']
                });
                const result = wageSearch.run().getRange({ start: 0, end: 1 });
                return result.length > 0
                    ? {
                        yearId: result[0].getValue('custrecord_hris_year'),
                        yearText: result[0].getText('custrecord_hris_year'),
                        endDate: result[0].getValue('custrecord_hris_end_date')
                    }
                    : { yearId: '', yearText: '', endDate: '' };
            } catch (e) {
                log.error('getWagePeriodYear Error', e.message);
                return { yearId: '', yearText: '', endDate: '' };
            }
        };

        const getPaidDays = (empId, wagePeriodId, monthDays, getYear) => {
            try {
                const attSearch = search.create({
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
                const result = attSearch.run().getRange({ start: 0, end: 1 });
                return result.length > 0
                    ? parseFloat(result[0].getValue('custrecord_hrms_month_presentdays') || 0)
                    : monthDays;
            } catch (e) {
                log.error('getPaidDays Error', e.message);
                return monthDays;
            }
        };

        const getLOPDaysFinal = (empId, wagePeriodId, getYear) => {
            try {
                const lopSearch = search.create({
                    type: CUSTOM_RECORDS.UNPAID_LEAVE,
                    filters: [
                        ['custrecord_hris_ule_employee_name', 'anyof', empId],
                        'AND',
                        ['custrecord_hris_ule_month', 'is', wagePeriodId],
                        'AND',
                        ['custrecord_hris_ule_year', 'is', getYear],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_ule_noof_days']
                });
                let totalLop = 0;
                lopSearch.run().each(r => {
                    totalLop += parseFloat(r.getValue('custrecord_hris_ule_noof_days') || 0);
                    return true;
                });
                return totalLop;
            } catch (e) {
                log.error('getLOPDaysFinal Error', e.message);
                return 0;
            }
        };

        const getLOPDays = (empId, wagePeriod, currentMonthly, monthDays, getYear) => {
            try {
                const lopSearch = search.create({
                    type: CUSTOM_RECORDS.UNPAID_LEAVE,
                    filters: [
                        ['custrecord_hris_ule_employee_name', 'anyof', empId],
                        'AND',
                        ['custrecord_hris_ule_month', 'is', wagePeriod],
                        'AND',
                        ['custrecord_hris_ule_year', 'is', getYear],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_ule_noof_days']
                });
                let totalLopAmt = 0;
                lopSearch.run().each(r => {
                    const days = parseFloat(r.getValue('custrecord_hris_ule_noof_days') || 0);
                    totalLopAmt += (currentMonthly / monthDays) * days;
                    log.audit('totalLopAmt',totalLopAmt);
                    return true;
                });
                return { amount: totalLopAmt };
            } catch (e) {
                log.error('getLOPDays Error', e.message);
                return { amount: 0 };
            }
        };

        const getArrearDays = (empId, currentMonthly, arrearMonthDays, wagePeriod, getYear) => {
            try {
                const arrSearch = search.create({
                    type: CUSTOM_RECORDS.UNPAID_ARREAR,
                    filters: [
                        ['custrecord_hris_uae_employee_name', 'anyof', empId],
                        'AND',
                        ['custrecord_hris_uae_month', 'is', wagePeriod],
                        'AND',
                        ['custrecord_hris_uae_year', 'is', getYear],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_uae_arrear_days']
                });
                let totalArrAmt = 0;
                arrSearch.run().each(r => {
                    const days = parseFloat(r.getValue('custrecord_hris_uae_arrear_days') || 0);
                    totalArrAmt += (currentMonthly / arrearMonthDays) * days;
                    return true;
                });
                return { amount: totalArrAmt };
            } catch (e) {
                log.error('getArrearDays Error', e.message);
                return { amount: 0 };
            }
        };

        const getArrearMonthDays = (empId, wagePeriodId, getYear) => {
            try {
                const arrSearch = search.create({
                    type: CUSTOM_RECORDS.UNPAID_ARREAR,
                    filters: [
                        ['custrecord_hris_uae_employee_name', 'anyof', empId],
                        'AND',
                        ['custrecord_hris_uae_month', 'is', wagePeriodId],
                        'AND',
                        ['custrecord_hris_uae_year', 'is', getYear],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_uae_arrear_month']
                });
                const result = arrSearch.run().getRange({ start: 0, end: 1 });
                return result.length > 0
                    ? getMonthDays(result[0].getValue('custrecord_hris_uae_arrear_month'))
                    : 30;
            } catch (e) {
                log.error('getArrearMonthDays Error', e.message);
                return 30;
            }
        };

        const getOTHours = (empId, payGroup, wagePeriodId, getYear) => {
            try {
                const otSearch = search.create({
                    type: CUSTOM_RECORDS.MONTHLY_SAL,
                    filters: [
                        ['custrecord_hris_mthsal_paygroup', 'anyof', payGroup],
                        'AND',
                        ['custrecord_hris_mthsal_empname', 'anyof', empId],
                        'AND',
                        ['custrecord_hris_mthsal_month', 'is', wagePeriodId],
                        'AND',
                        ['custrecord_hris_mthsal_year', 'is', getYear],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [search.createColumn({ name: 'custrecord_hris_mthsal_total_hours_days', summary: 'SUM' })]
                });
                const result = otSearch.run().getRange({ start: 0, end: 1 });
                return result.length > 0
                    ? parseFloat(result[0].getValue({ name: 'custrecord_hris_mthsal_total_hours_days', summary: 'SUM' }) || 0)
                    : 0;
            } catch (e) {
                log.error('getOTHours Error', e.message);
                return 0;
            }
        };

        const getEmployeeDateOfJoiningold= (empId, wagePeriod, lopDay, getYear) => {
            try {
                const hireDateStr = search.lookupFields({
                    type: 'employee',
                    id: empId,
                    columns: ['hiredate']
                }).hiredate;
                if (!hireDateStr) return { presentDays: 0, monthDays: 30 };
                const hireDate = format.parse({ value: hireDateStr, type: format.Type.DATE });
                const monthDays = getMonthDays(wagePeriod);
                const presentDays = (monthDays - hireDate.getDate()) + 1;
                log
                return { presentDays, monthDays };
            } catch (e) {
                log.error('getEmployeeDateOfJoining Error', e.message);
                return { presentDays: 0, monthDays: 30 };
            }
        };
/**
 * Port of SS1.0 employeeDateofJoining
 * - Checks if DOJ falls within the wage period start/end dates (via checkDOJWithinWagePeriod)
 * - If yes: prefer present days from Monthly Attendance;
 *   fallback = (monthDays - DOJ day - LOP) + 1
 * - If no: presentDays = 0 (no pro-rata)
 */
const getEmployeeDateOfJoining = (empId, wagePeriod, lopDay, getYear, payGroup) => {
    try {
        log.debug('getEmployeeDateOfJoining Start', {
            empId: empId,
            wagePeriod: wagePeriod,
            lopDay: lopDay,
            getYear: getYear,
            payGroup: payGroup
        });

        let presentDays = 0;
        let monthDays = 0;
        let dojMonth = 0;
        let dojYear = 0;
        let dojDay = 0;
        let hireDateStr = '';

        // 1. Hire date from employee
        try {
            const empLookup = search.lookupFields({
                type: 'employee',
                id: empId,
                columns: ['hiredate']
            });
            hireDateStr = empLookup.hiredate || '';
            log.debug('getEmployeeDateOfJoining - hiredate lookup', hireDateStr);
        } catch (lookupErr) {
            log.error('getEmployeeDateOfJoining - hiredate lookup', lookupErr.message);
        }

        if (!hireDateStr) {
            monthDays = getMonthDays(wagePeriod);
            return { presentDays: 0, monthDays: monthDays, isDojInRange: false };
        }

        let hireDate;
        try {
            hireDate = format.parse({ value: hireDateStr, type: format.Type.DATE });
        } catch (parseErr) {
            hireDate = new Date(hireDateStr);
        }

        if (!hireDate || isNaN(hireDate.getTime())) {
            monthDays = getMonthDays(wagePeriod);
            return { presentDays: 0, monthDays: monthDays, isDojInRange: false };
        }

        dojDay = hireDate.getDate();
        dojMonth = hireDate.getMonth() + 1; // 1-12
        dojYear = hireDate.getFullYear();

        // 2. Check if DOJ is inside the wage period range
        const isDojInRange = checkDOJWithinWagePeriod(payGroup, wagePeriod, getYear, hireDateStr);
        log.audit('getEmployeeDateOfJoining - isDojInRange', isDojInRange);

        if (isDojInRange) {
            // Prefer Monthly Attendance present days
            try {
                const attSearch = search.create({
                    type: CUSTOM_RECORDS.MONTHLY_ATTENDANCE,
                    filters: [
                        ['custrecord_hrms_month_empid', 'anyof', empId],
                        'AND',
                        ['custrecord_hrms_month_monthid', 'anyof', wagePeriod],
                        'AND',
                        ['custrecord_hrms_month_yearid', 'anyof', getYear],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hrms_month_presentdays']
                });
                const attRes = attSearch.run().getRange({ start: 0, end: 1 });
                if (attRes.length > 0) {
                    presentDays = parseFloat(attRes[0].getValue('custrecord_hrms_month_presentdays') || 0);
                } else {
                    // Fallback: (monthDays - DOJ day - LOP) + 1
                    monthDays = getMonthDays(wagePeriod);
                    presentDays = parseInt(monthDays, 10) - parseInt(dojDay, 10) - parseFloat(lopDay || 0) + 1;
                    log.debug('getEmployeeDateOfJoining - fallback presentDays', presentDays);
                    if (presentDays < 0) presentDays = 0;
                }
            } catch (attErr) {
                log.error('getEmployeeDateOfJoining - attendance', attErr.message);
                monthDays = getMonthDays(wagePeriod);
                presentDays = parseInt(monthDays, 10) - parseInt(dojDay, 10) - parseFloat(lopDay || 0) + 1;
                if (presentDays < 0) presentDays = 0;
            }
        } else {
            // DOJ outside this wage period → no pro-rata
            presentDays = 0;
        }

        if (!monthDays) {
            monthDays = getMonthDays(wagePeriod);
        }

        log.audit('getEmployeeDateOfJoining Final', {
            presentDays: presentDays,
            monthDays: monthDays,
            dojMonth: dojMonth,
            dojYear: dojYear,
            isDojInRange: isDojInRange
        });

        return {
            presentDays: presentDays,
            monthDays: monthDays,
            dojMonth: dojMonth,
            dojYear: dojYear,
            isDojInRange: isDojInRange
        };
    } catch (e) {
        log.error('getEmployeeDateOfJoining Error', e.message);
        return {
            presentDays: 0,
            monthDays: getMonthDays(wagePeriod) || 30,
            isDojInRange: false
        };
    }
};

/**
 * Port of SS1.0 checkDOJWithinWagePeriod
 * Returns true if employee DOJ falls within wage period start/end (inclusive)
 */
const checkDOJWithinWagePeriod = (payGroup, month, year, dojDateStr) => {
    log.debug('checkDOJWithinWagePeriod Start', {
        payGroup: payGroup,
        month: month,
        year: year,
        dojDateStr: dojDateStr
    });
    try {
        if (!dojDateStr || !payGroup || !month || !year) {
            return false;
        }

        log.debug('checkDOJWithinWagePeriod', {
            payGroup: payGroup,
            month: month,
            year: year,
            dojDateStr: dojDateStr
        });

        const wpSearch = search.create({
            type: CUSTOM_RECORDS.WAGE_PERIOD, // 'customrecord_hris_wage_period_details'
            filters: [
                ['custrecord_hris_pay_group', 'anyof', payGroup],
                'AND',
                ['custrecord_hris_month', 'anyof', month],
                'AND',
                ['custrecord_hris_year', 'anyof', year],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['custrecord_hris_start_date', 'custrecord_hris_end_date']
        });
        const res = wpSearch.run().getRange({ start: 0, end: 1 });
        if (!res || res.length === 0) {
            log.debug('checkDOJWithinWagePeriod', 'No wage period found');
            return false;
        }

        const startStr = res[0].getValue('custrecord_hris_start_date');
        const endStr = res[0].getValue('custrecord_hris_end_date');
        if (!startStr || !endStr) {
            return false;
        }

        let periodStart, periodEnd, employeeDOJ;
        try {
            periodStart = format.parse({ value: startStr, type: format.Type.DATE });
        } catch (e1) {
            periodStart = new Date(startStr);
        }
        try {
            periodEnd = format.parse({ value: endStr, type: format.Type.DATE });
        } catch (e2) {
            periodEnd = new Date(endStr);
        }
        try {
            employeeDOJ = format.parse({ value: dojDateStr, type: format.Type.DATE });
        } catch (e3) {
            employeeDOJ = new Date(dojDateStr);
        }

        if (!periodStart || isNaN(periodStart.getTime()) ||
            !periodEnd || isNaN(periodEnd.getTime()) ||
            !employeeDOJ || isNaN(employeeDOJ.getTime())) {
            return false;
        }

        // Inclusive range check (same as SS1.0)
        const inRange = (employeeDOJ >= periodStart && employeeDOJ <= periodEnd);
        log.audit('checkDOJWithinWagePeriod result', {
            periodStart: String(periodStart),
            periodEnd: String(periodEnd),
            employeeDOJ: String(employeeDOJ),
            inRange: inRange
        });
        return inRange;
    } catch (e) {
        log.error('checkDOJWithinWagePeriod Error', e.message);
        return false;
    }
};
        const deleteRecInitial = (empId, payGroup, wagePeriodId, processType, getYear) => {
            try {
                const delSearch = search.create({
                    type: CUSTOM_RECORDS.PAY_PROCESS,
                    filters: [
                        ['custrecord_hris_pay_proc_employee', 'anyof', empId],
                        'AND',
                        ['custrecord_hris_pay_proc_pay_group', 'anyof', payGroup],
                        'AND',
                        ['custrecord_hris_pay_proc_pay_month', 'anyof', wagePeriodId],
                        'AND',
                        ['custrecord_hris_pay_proc_year', 'anyof', getYear],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                });
                delSearch.run().each(r => {
                    try {
                        record.delete({ type: CUSTOM_RECORDS.PAY_PROCESS, id: r.id });
                    } catch (delErr) {
                        log.error('deleteRecInitial - delete row', delErr.message);
                    }
                    return true;
                });
            } catch (e) {
                log.error('deleteRecInitial Error', e.message);
                // Do not throw – cleanup failure should not stop pay process
            }
        };

        const searchSSandITYr = (getYear) => {
            try {
                const ssSearch = search.create({
                    type: CUSTOM_RECORDS.SS_FIN_YEAR,
                    filters: [
                        ['custrecord_hris_ssit_start_yr', 'is', getYear],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_ssit_startmonth', 'custrecord_hris_ssit_end_month']
                });
                const result = ssSearch.run().getRange({ start: 0, end: 1 });
                return result.length > 0
                    ? {
                        startMonth: result[0].getValue('custrecord_hris_ssit_startmonth'),
                        endMonth: result[0].getValue('custrecord_hris_ssit_end_month')
                    }
                    : { startMonth: '1', endMonth: '12' };
            } catch (e) {
                log.error('searchSSandITYr Error', e.message);
                return { startMonth: '1', endMonth: '12' };
            }
        };

        /**
         * Port of SS1.0 searchLoanEntry
         * - Finds active loan applications for employee
         * - Includes only loans whose wage month falls between allocation start/end
         * - Returns { loanRecordIds, loanCompIds, loanChildIds }
         */
        const searchLoanEntry = (empId, wagePeriod, getYear) => {
            try {
                const loanRecordIds = [];
                const loanCompIds = [];
                const loanChildIds = [];

                log.debug({
                    title: 'searchLoanEntry start',
                    details: { empId: empId, wagePeriod: wagePeriod, getYear: getYear }
                });

                // Resolve year name from year master list (same as SS1.0 nlapiLookupField on customlist_hris_year_master)
                let wagePeriodYearName = '';
                try {
                    const yearLookup = search.lookupFields({
                        type: CUSTOM_RECORDS.YEAR_MASTER,
                        id: getYear,
                        columns: ['name']
                    });
                    wagePeriodYearName = yearLookup.name || '';
                } catch (yrErr) {
                    // YEAR_MASTER is a custom list – lookupFields may need different approach
                    try {
                        const yearSearch = search.create({
                            type: CUSTOM_RECORDS.YEAR_MASTER,
                            filters: [
                                ['internalid', 'anyof', getYear],
                                'AND',
                                ['isinactive', 'is', 'F']
                            ],
                            columns: ['name']
                        });
                        const yrRes = yearSearch.run().getRange({ start: 0, end: 1 });
                        if (yrRes.length > 0) {
                            wagePeriodYearName = yrRes[0].getValue('name') || yrRes[0].getText('name') || '';
                        }
                    } catch (yrErr2) {
                        log.error('searchLoanEntry - year lookup', yrErr2.message);
                    }
                }

                // Fallback: if year name still empty, try text from wage period data or use calendar year
                if (!wagePeriodYearName) {
                    wagePeriodYearName = String(new Date().getFullYear());
                    log.debug('searchLoanEntry - year fallback', wagePeriodYearName);
                }

                // wagePeriod is month id (1-12 or "9"). JS Date month is 0-based → subtract 1
                const wageMonthNum = parseInt(getWagePeriodNo(wagePeriod), 10);
                const wageMonth0 = isNaN(wageMonthNum) ? 0 : (wageMonthNum - 1); // 0-based
                const wageYearNum = parseInt(wagePeriodYearName, 10) || new Date().getFullYear();
                const wageDate = new Date(wageYearNum, wageMonth0, 1);

                log.debug({
                    title: 'searchLoanEntry wageDate',
                    details: {
                        wagePeriodYearName: wagePeriodYearName,
                        wageMonthNum: wageMonthNum,
                        wageMonth0: wageMonth0,
                        wageDate: wageDate.toISOString ? wageDate.toISOString() : String(wageDate)
                    }
                });

                const loanSearch = search.create({
                    type: CUSTOM_RECORDS.LOAN_APP,
                    filters: [
                        ['custrecord_hris_loan_emp_name', 'anyof', empId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'internalid',
                        'custrecord_hris_loan_loan_type',
                        'custrecord_hris_loan_emi_amount',
                        search.createColumn({ name: 'custrecord_hris_loan_alloc_startdate', join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK' }),
                        search.createColumn({ name: 'custrecord_hris_loan_alloc_enddate', join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK' }),
                        search.createColumn({ name: 'custrecord_hris_loan_alloc_paidamount', join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK' }),
                        search.createColumn({ name: 'custrecord_hris_loan_alloc_installments', join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK' }),
                        search.createColumn({ name: 'internalid', join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK' })
                    ]
                });

                loanSearch.run().each(r => {
                    try {
                        const loanAppId = r.id;
                        const loanTypeId = r.getValue('custrecord_hris_loan_loan_type');
                        const sDateStr = r.getValue({ name: 'custrecord_hris_loan_alloc_startdate', join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK' });
                        const eDateStr = r.getValue({ name: 'custrecord_hris_loan_alloc_enddate', join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK' });
                        const loanchildid = r.getValue({ name: 'internalid', join: 'CUSTRECORD_HRIS_LOAN_ALLOC_LINK' });

                        log.debug({
                            title: 'searchLoanEntry - row raw',
                            details: {
                                loanAppId: loanAppId,
                                loanTypeId: loanTypeId,
                                sDateStr: sDateStr,
                                eDateStr: eDateStr,
                                loanchildid: loanchildid
                            }
                        });

                        if (!sDateStr || !eDateStr) {
                            log.debug('searchLoanEntry - skip row (missing start/end date)', loanAppId);
                            return true;
                        }

                        // Parse dates (same idea as nlapiStringToDate)
                        let strSDate, strEDate;
                        try {
                            strSDate = format.parse({ value: sDateStr, type: format.Type.DATE });
                        } catch (d1) {
                            strSDate = new Date(sDateStr);
                        }
                        try {
                            strEDate = format.parse({ value: eDateStr, type: format.Type.DATE });
                        } catch (d2) {
                            strEDate = new Date(eDateStr);
                        }

                        if (!strSDate || isNaN(strSDate.getTime()) || !strEDate || isNaN(strEDate.getTime())) {
                            log.error('searchLoanEntry - invalid dates', { sDateStr: sDateStr, eDateStr: eDateStr });
                            return true;
                        }

                        // Inclusive month-year compare (fix for SS1.0 strict > which skipped same start month)
                        // Business rule: include loan if wage month is between allocation start month and end month (inclusive)
                        const startYM = strSDate.getFullYear() * 12 + strSDate.getMonth();
                        const endYM = strEDate.getFullYear() * 12 + strEDate.getMonth();
                        const wageYM = wageYearNum * 12 + wageMonth0;

                        // Also keep a slightly expanded end window like SS1.0 (+2 months) as fallback
                        const endYMExpanded = endYM + 2;

                        const inRangeStrict = (wageYM >= startYM && wageYM <= endYM);
                        const inRangeExpanded = (wageYM >= startYM && wageYM <= endYMExpanded);
                        const inRange = inRangeStrict || inRangeExpanded;

                        log.debug({
                            title: 'searchLoanEntry - date compare',
                            details: {
                                sDateStr: sDateStr,
                                eDateStr: eDateStr,
                                wageDate: String(wageDate),
                                startYM: startYM,
                                endYM: endYM,
                                endYMExpanded: endYMExpanded,
                                wageYM: wageYM,
                                inRangeStrict: inRangeStrict,
                                inRangeExpanded: inRangeExpanded,
                                inRange: inRange
                            }
                        });

                        if (!inRange) {
                            log.debug({
                                title: 'searchLoanEntry - skip (outside EMI window)',
                                details: {
                                    loanAppId: loanAppId,
                                    wageYM: wageYM,
                                    startYM: startYM,
                                    endYM: endYM
                                }
                            });
                            return true;
                        }

                        // Lookup payroll component on Loan Master (SS1.0: nlapiLookupField)
                        let loan_comp = null;
                        if (loanTypeId) {
                            try {
                                const loanCompLookup = search.lookupFields({
                                    type: CUSTOM_RECORDS.LOAN_MASTER,
                                    id: loanTypeId,
                                    columns: ['custrecord_hris_loan_component']
                                });
                                const compVal = loanCompLookup && loanCompLookup.custrecord_hris_loan_component;

                                if (Array.isArray(compVal) && compVal.length > 0) {
                                    loan_comp = compVal[0].value || null;
                                } else if (typeof compVal === 'string' || typeof compVal === 'number') {
                                    loan_comp = String(compVal);
                                } else if (compVal && typeof compVal === 'object' && compVal.value) {
                                    loan_comp = compVal.value;
                                }

                                log.debug({
                                    title: 'searchLoanEntry - loan_comp',
                                    details: { loanTypeId: loanTypeId, loan_comp: loan_comp, lookupRaw: loanCompLookup }
                                });
                            } catch (compErr) {
                                log.error('searchLoanEntry - component lookup', compErr.message);
                            }
                        }

                        if (!loan_comp) {
                            log.error({
                                title: 'searchLoanEntry - component empty',
                                details: 'Loan Master id=' + loanTypeId +
                                    ' has empty custrecord_hris_loan_component. Set Payroll Component on Loan Master.'
                            });
                        }

                        // Only push when in range (same as SS1.0)
                        loanRecordIds.push(loanAppId);
                        loanCompIds.push(loan_comp);
                        loanChildIds.push(loanchildid);

                        log.audit({
                            title: 'searchLoanEntry - included loan',
                            details: {
                                loanAppId: loanAppId,
                                loan_comp: loan_comp,
                                loanchildid: loanchildid
                            }
                        });
                    } catch (rowErr) {
                        log.error({
                            title: 'searchLoanEntry - row error',
                            details: { message: rowErr.message, stack: rowErr.stack }
                        });
                    }
                    return true;
                });

                log.debug({
                    title: 'searchLoanEntry result',
                    details: {
                        empId: empId,
                        wagePeriod: wagePeriod,
                        getYear: getYear,
                        loanRecordIds: loanRecordIds,
                        loanCompIds: loanCompIds,
                        loanChildIds: loanChildIds,
                        count: loanRecordIds.length
                    }
                });

                return { loanRecordIds, loanCompIds, loanChildIds };
            } catch (e) {
                log.error({
                    title: 'searchLoanEntry Error',
                    details: { message: e.message, stack: e.stack }
                });
                return { loanRecordIds: [], loanCompIds: [], loanChildIds: [] };
            }
        };

        const searchPTId = (payGroup) => {
            try {
                const ptSearch = search.create({
                    type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                    filters: [
                        ['custrecord_hris__sequence_no_', 'equalto', '55'],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                });
                const res = ptSearch.run().getRange({ start: 0, end: 1 });
                return res.length > 0 ? res[0].id : null;
            } catch (e) {
                log.error('searchPTId Error', e.message);
                return null;
            }
        };

        const searchPTGross = (payGroup, empId, wagePeriod, getYear) => {
            try {
                let total = 0;
                const ptSearch = search.create({
                    type: CUSTOM_RECORDS.PAY_PROCESS,
                    filters: [
                        ['custrecord_hris_pay_proc_employee', 'anyof', empId],
                        'AND',
                        ['custrecord_hris_pay_proc_pay_month', 'is', wagePeriod],
                        'AND',
                        ['custrecord_hris_pay_proc_pt_check', 'is', 'T'],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_pay_proc_actual_gross_ea']
                });
                ptSearch.run().each(r => {
                    total += parseFloat(r.getValue('custrecord_hris_pay_proc_actual_gross_ea') || 0);
                    return true;
                });
                return total;
            } catch (e) {
                log.error('searchPTGross Error', e.message);
                return 0;
            }
        };

        const searchSlabAmt = (gross, loc) => {
            try {
                if (!loc) return 0;
                const slabSearch = search.create({
                    type: CUSTOM_RECORDS.PT_SLAB,
                    filters: [
                        ['custrecord_hris_pt_state', 'anyof', loc],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'custrecord_hris_pt_gross_sal_lowerval',
                        'custrecord_hris_pt_gross_sal_high_val',
                        'custrecord_hris_pt_amt'
                    ]
                });
                let amt = 0;
                slabSearch.run().each(r => {
                    const low = parseFloat(r.getValue('custrecord_hris_pt_gross_sal_lowerval') || 0);
                    const high = parseFloat(r.getValue('custrecord_hris_pt_gross_sal_high_val') || 0);
                    if (gross >= low && gross <= high) {
                        amt = parseFloat(r.getValue('custrecord_hris_pt_amt') || 0);
                        return false;
                    }
                    return true;
                });
                return amt;
            } catch (e) {
                log.error('searchSlabAmt Error', e.message);
                return 0;
            }
        };

        const searchSSId = (payGroup) => {
            try {
                const res = search.create({
                    type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                    filters: [
                        ['custrecord_hris__sequence_no_', 'equalto', '92'],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });
                return res.length > 0 ? res[0].id : null;
            } catch (e) {
                log.error('searchSSId Error', e.message);
                return null;
            }
        };

        const searchSSEMP = (payGroup) => {
            try {
                const res = search.create({
                    type: CUSTOM_RECORDS.GLOBAL_PARAM,
                    filters: [
                        ['custrecord_hris_gp_sequence_no', 'equalto', '7'],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_gp_value']
                }).run().getRange({ start: 0, end: 1 });
                return res.length > 0 ? res[0].getValue('custrecord_hris_gp_value') : 0;
            } catch (e) {
                log.error('searchSSEMP Error', e.message);
                return 0;
            }
        };

        const searchSSEmployer = (payGroup) => {
            try {
                const res = search.create({
                    type: CUSTOM_RECORDS.GLOBAL_PARAM,
                    filters: [
                        ['custrecord_hris_gp_sequence_no', 'equalto', '8'],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_gp_value']
                }).run().getRange({ start: 0, end: 1 });
                return res.length > 0 ? res[0].getValue('custrecord_hris_gp_value') : 0;
            } catch (e) {
                log.error('searchSSEmployer Error', e.message);
                return 0;
            }
        };

        const searchGrossEarnID = (payGroup) => {
            try {
                const res = search.create({
                    type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                    filters: [
                        ['custrecord_hris__sequence_no_', 'equalto', '50'],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });
                return res.length > 0 ? res[0].id : null;
            } catch (e) {
                log.error('searchGrossEarnID Error', e.message);
                return null;
            }
        };

        const searchDeductionEarnId = (payGroup) => {
            try {
                const res = search.create({
                    type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                    filters: [
                        ['custrecord_hris__sequence_no_', 'equalto', '99'],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });
                return res.length > 0 ? res[0].id : null;
            } catch (e) {
                log.error('searchDeductionEarnId Error', e.message);
                return null;
            }
        };

        const searchNetId = (payGroup) => {
            try {
                const res = search.create({
                    type: CUSTOM_RECORDS.PAYROLL_COMPONENT,
                    filters: [
                        ['custrecord_hris__sequence_no_', 'equalto', '100'],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });
                const id = res.length > 0 ? res[0].id : null;
                log.debug('searchNetId', { id, payGroup });
                return id;
            } catch (e) {
                log.error('searchNetId Error', e.message);
                return null;
            }
        };

        const searchEarnCompType = () => {
            try {
                const res = search.create({
                    type: CUSTOM_RECORDS.COMPONENT_TYPE,
                    filters: [
                        ['custrecord_hris_com_sequence_no', 'equalto', '1'],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });
                return res.length > 0 ? res[0].id : '1';
            } catch (e) {
                log.error('searchEarnCompType Error', e.message);
                return '1';
            }
        };

        const searchDedcCompType = () => {
            try {
                const res = search.create({
                    type: CUSTOM_RECORDS.COMPONENT_TYPE,
                    filters: [
                        ['custrecord_hris_com_sequence_no', 'equalto', '2'],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });
                return res.length > 0 ? res[0].id : '2';
            } catch (e) {
                log.error('searchDedcCompType Error', e.message);
                return '2';
            }
        };

        /**
         * Writes error details to customrecord_hris_pay_process_log
         * (SS 2.1 port of SS1.0 logErrorToCustomRecord).
         *
         * @param {string} functionName
         * @param {Error|Object|string} errorObj
         * @param {string|number} [payGroup]
         * @param {string|number} [subsidiary]
         * @param {string|number} [employee]
         * @param {string|number} [month]
         * @param {string|number} [year]
         * @param {string} [respRecord] e.g. "customrecord_hris_pre_pay_process_record (ID: 123)"
         * @returns {number|null} internal id of log record, or null on failure
         */
        const logErrorToCustomRecord = (functionName, errorObj, payGroup, subsidiary, employee, month, year, respRecord) => {
            try {
                let errorDetails = '';
                if (typeof errorObj === 'object' && errorObj !== null) {
                    if (errorObj.message) {
                        errorDetails = errorObj.message;
                    } else if (errorObj.details) {
                        errorDetails = errorObj.details;
                    } else {
                        try {
                            errorDetails = JSON.stringify(errorObj);
                        } catch (jsonErr) {
                            errorDetails = String(errorObj);
                        }
                    }
                    if (errorObj.stack) {
                        errorDetails += '\nStack: ' + errorObj.stack;
                    }
                } else {
                    errorDetails = String(errorObj);
                }

                log.error('Error in ' + functionName, errorDetails);

                const logRec = record.create({ type: CUSTOM_RECORDS.PAY_PROCESS_LOG });
                logRec.setValue('custrecord_hris_pp_function', functionName || '');
                logRec.setValue('custrecord_hris_pp_log', errorDetails);
                if (payGroup) {
                    logRec.setValue('custrecord_hris_pp_pay_group', payGroup);
                }
                if (subsidiary) {
                    logRec.setValue('custrecord_hris_pp_subsidiary', subsidiary);
                }
                if (employee) {
                    logRec.setValue('custrecord_hris_pp_employee', employee);
                }
                if (month) {
                    logRec.setValue('custrecord_hris_pp_month', month);
                }
                if (year) {
                    logRec.setValue('custrecord_hris_pp_year', year);
                }
                if (respRecord) {
                    logRec.setValue('custrecord_hris_pp_responsible_record', respRecord);
                }
                const logId = logRec.save();
                log.debug('logErrorToCustomRecord OK', { logId: logId, functionName: functionName });
                return logId;
            } catch (logErr) {
                log.error(
                    'Failed to save error log record in ' + functionName,
                    logErr.message || String(logErr)
                );
                return null;
            }
        };

        return {
            processEmployeePay,
            logErrorToCustomRecord
        };
    });