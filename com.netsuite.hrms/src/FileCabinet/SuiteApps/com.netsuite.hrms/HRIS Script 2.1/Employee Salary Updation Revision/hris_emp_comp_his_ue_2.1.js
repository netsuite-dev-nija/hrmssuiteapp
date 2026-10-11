/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define([
    'N/search',
    'N/query',
    'N/format',
    'N/email',
    'N/record',
    'N/currentRecord',
    'N/url',
    'N/runtime',
    'N/ui/dialog',
    'N/task',
    'N/ui/serverWidget',
    'N/error',
    'N/log'
], (
    search,
    query,
    format,
    email,
    record,
    currentRecord,
    url,
    runtime,
    dialog,
    task,
    serverWidget,
    error,
    log
) => {

    const beforeLoad = (context) => {
        const form = context.form;
        const role = runtime.getCurrentUser().role;

        if (role != '1294' && role != '1217' && role != '1220' && role != '1221') {
            form.getField({ id: 'custrecord_hris_monthly_gross_salary' }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            form.getField({ id: 'custrecord_hris_ctc' }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            form.getField({ id: 'custrecord_hris_annual_gross_salary' }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            form.getField({ id: 'custrecord_hris_monthly_gross_salary_in' }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            form.getField({ id: 'custrecord_hris_annual_gross_salary_in_b' }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            const sublist = form.getSublist({ id: 'recmachcustrecord_hris_comhis_compenhistoryid' });
            if (sublist) {
                sublist.getField({ id: 'custrecord_hris_comhis_monthlyamoun' }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
                sublist.getField({ id: 'custrecord_hris_comhis_annuallyamount' }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
                sublist.getField({ id: 'custrecord_hris_comhis_prev_monthlyamt' }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
            }
        }
    };

    const beforeSubmit = (context) => {
        if (
            context.type === context.UserEventType.CREATE ||
            context.type === context.UserEventType.EDIT
        ) {
            const loadedRec = context.newRecord;

            let totalMonthlyEarn = loadedRec.getValue('custrecord_hris_monthly_gross_salary');
            log.debug('totalMonthlyEarn', totalMonthlyEarn);

            totalMonthlyEarn = totalMonthlyEarn ? parseFloat(totalMonthlyEarn) : 0;
            const payGroupId = loadedRec.getValue('custrecord_hris_employee_pay_process_gro');
            log.debug('payGroupId', payGroupId);

            let exchangeRate = 0;
            if (payGroupId) {
                const excahngesql =
                    `SELECT custrecord_hris_allowance_currency_excha 
                     FROM customrecord_hris_process_groupmaster 
                     WHERE id = ${payGroupId}`;

                const resultSet = query.runSuiteQL({ query: excahngesql });
                const tsResult = resultSet.asMappedResults();

                if (tsResult.length > 0) {
                    exchangeRate = tsResult[0].custrecord_hris_allowance_currency_excha;
                }

                log.debug('exchangeRate', exchangeRate);
                exchangeRate = parseFloat(exchangeRate);
            }

            let monthlyTotalAmountInAED = totalMonthlyEarn * exchangeRate;
            log.debug('monthlyTotalAmountInAED', monthlyTotalAmountInAED);

            monthlyTotalAmountInAED = parseFloat(monthlyTotalAmountInAED).toFixed(2);
            let annualTotalInAED = parseFloat(monthlyTotalAmountInAED) * 12;
            annualTotalInAED = parseFloat(annualTotalInAED).toFixed(2);

            loadedRec.setValue({
                fieldId: 'custrecord_hris_monthly_gross_salary_in',
                value: monthlyTotalAmountInAED
            });

            loadedRec.setValue({
                fieldId: 'custrecord_hris_annual_gross_salary_in_b',
                value: annualTotalInAED
            });
        }
    };

    const afterSubmit = (context) => {
        log.debug('enter aftersubmit');

        if (
            context.type === context.UserEventType.CREATE ||
            context.type === context.UserEventType.EDIT
        ) {
            const newRecord = context.newRecord;
            const recId = newRecord.id;

          // =====================================================
        // 1. Calculate totals from sublist + AED conversion
        // =====================================================
        try {
            const loadedRec = record.load({
                type: recType,
                id: recId,
                isDynamic: false
            });

            const sublistId = 'recmachcustrecord_hris_comhis_compenhistoryid';
            const lineCount = loadedRec.getLineCount({ sublistId });

            let totalMonthly = 0;
            let totalAnnual = 0;

            for (let i = 0; i < lineCount; i++) {
                const monthlyAmount = parseFloat(loadedRec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_hris_comhis_monthlyamount',
                    line: i
                })) || 0;

                const annualAmount = parseFloat(loadedRec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_hris_comhis_annuallyamount',
                    line: i
                })) || 0;

                totalMonthly += monthlyAmount;
                totalAnnual += annualAmount;
            }

            const CTC = parseFloat(totalAnnual);

            log.debug('Calculated Totals', {
                totalMonthly,
                totalAnnual,
                CTC
            });

            // ===== Exchange Rate / AED Calculation (moved from beforeSubmit) =====
            let totalMonthlyEarn = totalMonthly;   // use the calculated total
            const payGroupId = loadedRec.getValue('custrecord_hris_employee_pay_process_gro');
            log.debug('payGroupId', payGroupId);

            let exchangeRate = 0;
            if (payGroupId) {
                const excahngesql =
                    `SELECT custrecord_hris_allowance_currency_excha 
                     FROM customrecord_hris_process_groupmaster 
                     WHERE id = ${payGroupId}`;

                const resultSet = query.runSuiteQL({ query: excahngesql });
                const tsResult = resultSet.asMappedResults();

                if (tsResult.length > 0) {
                    exchangeRate = tsResult[0].custrecord_hris_allowance_currency_excha;
                }

                log.debug('exchangeRate', exchangeRate);
                exchangeRate = parseFloat(exchangeRate) || 0;
            }

            let monthlyTotalAmountInAED = totalMonthlyEarn * exchangeRate;
            monthlyTotalAmountInAED = parseFloat(monthlyTotalAmountInAED).toFixed(2);

            let annualTotalInAED = parseFloat(monthlyTotalAmountInAED) * 12;
            annualTotalInAED = parseFloat(annualTotalInAED).toFixed(2);

            log.debug('AED Amounts', {
                monthlyTotalAmountInAED,
                annualTotalInAED
            });

            // ===== Update all header fields in one go =====
            record.submitFields({
                type: recType,
                id: recId,
                values: {
                    custrecord_hris_monthly_gross_salary: totalMonthly,
                    custrecord_hris_annual_gross_salary: totalAnnual,
                    custrecord_hris_ctc: CTC,
                    custrecord_hris_monthly_gross_salary_in: monthlyTotalAmountInAED,
                    custrecord_hris_annual_gross_salary_in_b: annualTotalInAED
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            log.debug('Header fields updated successfully');
        } catch (e) {
            log.error('Error calculating/updating totals in afterSubmit', e);
        }
            const ApproverStatus = newRecord.getValue({
                fieldId: 'custrecord_hris_emphis_approvalstatus'
            });
            const EmployeeId = newRecord.getValue({
                fieldId: 'custrecord_hris_employee_name_'
            });
            log.debug('Reduce - Employee ID', EmployeeId);

            const EmployeeCompencheck = newRecord.getValue({
                fieldId: 'custrecord_hris_comp_chnge_check'
            });

            if (ApproverStatus == 2 && EmployeeCompencheck == false) {
                const newRecordId = recId;
                log.debug('newRecord', newRecordId);

                const Salarypaygroup = newRecord.getValue({
                    fieldId: 'custrecord_hris_employee_pay_process_gro'
                });

                let EmpcompChangeID = null;
                let Empcomppaygroup = '';

                const EmpCompensationSQL =
                    `SELECT id, custrecord_hris_empchange_emp_pay_pro_gp 
                     FROM customrecord_hris_employee_compen_change 
                     WHERE custrecord_hris_empchange_employee_nam = ${EmployeeId}`;

                const resultSet = query.runSuiteQL({ query: EmpCompensationSQL });
                const tsResult = resultSet.asMappedResults();

                if (tsResult.length > 0 && tsResult[0].id) {
                    EmpcompChangeID = tsResult[0].id;
                    Empcomppaygroup = tsResult[0].custrecord_hris_empchange_emp_pay_pro_gp;
                    log.debug('EmpcompChangeID', EmpcompChangeID);
                    log.debug('Empcomppaygroup', Empcomppaygroup);
                }

                if (EmpcompChangeID && Empcomppaygroup == Salarypaygroup) {
                    log.debug('is update check');
                    updateCompensationchangeDetails(EmpcompChangeID, newRecordId);
                } else if (EmpcompChangeID && Empcomppaygroup != Salarypaygroup) {
                    log.debug('is compensa check');
                    createCompensationchangeDetails(EmpcompChangeID, newRecordId);
                } else {
                    log.debug('iscreate check');
                    createemployeecompensationchange(newRecordId, EmpcompChangeID);
                }
            }
        }
    };

    // =====================================================
    // Helper: Update existing Compensation Change record
    // =====================================================
    const updateCompensationchangeDetails = (EmpcompChangeID, newRecordId) => {
        const comphistoryrec = record.load({
            type: 'customrecord_hris_employee_compensation',
            id: newRecordId,
            isDynamic: true
        });

        const Empname = comphistoryrec.getValue({ fieldId: 'custrecord_hris_employee_name_' });
        log.debug('Empname', Empname);

        const Paygroup = comphistoryrec.getValue({ fieldId: 'custrecord_hris_employee_pay_process_gro' });
        const IncrmentType = comphistoryrec.getValue({ fieldId: 'custrecord_hris_record_change_type' });
        log.debug('IncrmentType', IncrmentType);

        const monthlyGrossSalary = comphistoryrec.getValue({ fieldId: 'custrecord_hris_monthly_gross_salary' });
        const monthlyGrossSalaryInAED = comphistoryrec.getValue({ fieldId: 'custrecord_hris_monthly_gross_salary_in' });
        const annualGrossSalary = comphistoryrec.getValue({ fieldId: 'custrecord_hris_annual_gross_salary' });
        const annualGrossSalaryInAED = comphistoryrec.getValue({ fieldId: 'custrecord_hris_annual_gross_salary_in_b' });
        const ctc = comphistoryrec.getValue({ fieldId: 'custrecord_hris_ctc' });
        let effectivedate = comphistoryrec.getValue({ fieldId: 'custrecord_hris_effective_from_date' });
        const remarks = comphistoryrec.getValue({ fieldId: 'custrecord_hris_remarks' });
        const checkboxforcompchangecheck = comphistoryrec.getValue({ fieldId: 'custrecord_hris_comp_chnge_check' });
        log.debug('checkboxforcompchangecheck', checkboxforcompchangecheck);

        log.emergency('Compensation Fields', {
            monthlyGrossSalary,
            monthlyGrossSalaryInAED,
            annualGrossSalary,
            annualGrossSalaryInAED,
            ctc
        });

        const Linecount = comphistoryrec.getLineCount({
            sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid'
        });

        const comphistoryArr = [];
        for (let k = 0; k < Linecount; k++) {
            const processGroup = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_processgroup',
                line: k
            });
            const payrollComponent = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_payrollcomponent',
                line: k
            });
            const payrollComponenttext = comphistoryrec.getSublistText({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_payrollcomponent',
                line: k
            });
            const monthlyAmount = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_monthlyamount',
                line: k
            });
            const annuallyAmount = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_annuallyamount',
                line: k
            });
            const payrollSeqNo = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_payrollseqno',
                line: k
            });
            const employeeid = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_empname',
                line: k
            });
            const subsidiary = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_subsidiary',
                line: k
            });
            const department = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_department',
                line: k
            });

            comphistoryArr.push({
                processGroup,
                payrollComponent,
                payrollComponentText: payrollComponenttext,
                monthlyAmount,
                annuallyAmount,
                payrollSeqNo,
                employeeid,
                subsidiary,
                department
            });

            log.debug(`Line ${k}`, {
                processGroup,
                payrollComponent,
                monthlyAmount,
                annuallyAmount,
                payrollSeqNo,
                employeeid,
                subsidiary,
                department
            });
        }

        const empcomprec = record.load({
            type: 'customrecord_hris_employee_compen_change',
            id: EmpcompChangeID,
            isDynamic: true
        });
        log.debug('empcomprec', empcomprec);

        empcomprec.setValue({
            fieldId: 'custrecord_hris_empchange_employee_nam',
            value: Empname,
            ignoreFieldChange: false,
            forceSyncSourcing: true
        });
        empcomprec.setValue({
            fieldId: 'custrecord_hris_empchange_emp_pay_pro_gp',
            value: Paygroup,
            ignoreFieldChange: true
        });

        if (effectivedate) {
            effectivedate = format.parse({
                value: effectivedate,
                type: format.Type.DATE
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_eff_from_date',
                value: effectivedate,
                ignoreFieldChange: true
            });
        }

        empcomprec.setValue({
            fieldId: 'custrecord_hris_empchange_remarks',
            value: remarks,
            ignoreFieldChange: true
        });
        empcomprec.setValue({
            fieldId: 'custrecord_hris_empchange_type',
            value: IncrmentType,
            ignoreFieldChange: true
        });

        const Linecountcomp = empcomprec.getLineCount({
            sublistId: 'recmachcustrecord_hris_employee_data_change'
        });

        const empcompchangearr = [];
        for (let t = 0; t < Linecountcomp; t++) {
            const annually = empcomprec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_data_change',
                fieldId: 'custrecord_hris_cde_annually',
                line: t
            });
            const monthly = empcomprec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_data_change',
                fieldId: 'custrecord_hris_cde_monthly',
                line: t
            });
            const component = empcomprec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_data_change',
                fieldId: 'custrecord_hris_cde_payroll_component',
                line: t
            });
            const componentseq = empcomprec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_data_change',
                fieldId: 'custrecord_hris_payroll_component_seq_no',
                line: t
            });

            empcompchangearr.push({
                annually,
                monthly,
                component,
                componentseq
            });

            log.emergency('empcompchangearr', empcompchangearr);
            log.debug(`Linecompchange ${t}`, {
                annually,
                monthly,
                component,
                componentseq
            });
        }

        if (checkboxforcompchangecheck == false) {
            log.debug('Starting Line Comparison', {
                comphistoryArr,
                empcompchangearr
            });

            for (let i = 0; i < comphistoryArr.length; i++) {
                let compFound = false;

                for (let j = 0; j < empcompchangearr.length; j++) {
                    log.debug('Comparing Components', {
                        historyPayrollComponent: comphistoryArr[i].payrollComponent,
                        changeComponent: empcompchangearr[j].component,
                        historySeqNo: comphistoryArr[i].payrollSeqNo,
                        changeSeqNo: empcompchangearr[j].componentseq
                    });

                    if (comphistoryArr[i].payrollComponent == empcompchangearr[j].component) {
                        log.emergency('Matching Component Found', comphistoryArr[i].payrollComponent);

                        empcomprec.selectLine({
                            sublistId: 'recmachcustrecord_hris_employee_data_change',
                            line: j
                        });

                        empcomprec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_employee_data_change',
                            fieldId: 'custrecord_hris_cde_process_group',
                            value: comphistoryArr[i].processGroup,
                            ignoreFieldChange: false,
                            forceSyncSourcing: true
                        });
                        empcomprec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_employee_data_change',
                            fieldId: 'custrecord_hris_cde_payroll_component',
                            value: comphistoryArr[i].payrollComponent,
                            ignoreFieldChange: false
                        });
                        empcomprec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_employee_data_change',
                            fieldId: 'custrecord_hris_cde_monthly',
                            value: comphistoryArr[i].monthlyAmount || 0,
                            ignoreFieldChange: true
                        });
                        empcomprec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_employee_data_change',
                            fieldId: 'custrecord_hris_cde_annually',
                            value: comphistoryArr[i].annuallyAmount || 0,
                            ignoreFieldChange: true
                        });
                        empcomprec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_employee_data_change',
                            fieldId: 'custrecord_hris_cde_payroll_seqno',
                            value: comphistoryArr[i].payrollSeqNo || '',
                            ignoreFieldChange: true
                        });
                        empcomprec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_employee_data_change',
                            fieldId: 'custrecord_hris_cde_employee_name',
                            value: comphistoryArr[i].employeeid || '',
                            ignoreFieldChange: true
                        });
                        empcomprec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_employee_data_change',
                            fieldId: 'custrecord_hris_cde_subsidiary',
                            value: comphistoryArr[i].subsidiary || '',
                            ignoreFieldChange: true
                        });
                        empcomprec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_employee_data_change',
                            fieldId: 'custrecord_hris_compensationearing_dep_n',
                            value: comphistoryArr[i].department || '',
                            ignoreFieldChange: true
                        });

                        empcomprec.commitLine({
                            sublistId: 'recmachcustrecord_hris_employee_data_change'
                        });

                        compFound = true;
                        break;
                    }
                }

                // If component not found, you can add new line logic here if needed
            }

            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_month_cross_sy',
                value: monthlyGrossSalary,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_annualgrosssly',
                value: annualGrossSalary,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_mon_gross',
                value: monthlyGrossSalaryInAED,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_an_gross_salar',
                value: annualGrossSalaryInAED,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_ctc',
                value: ctc,
                ignoreFieldChange: true
            });

            try {
                const savedId = empcomprec.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                log.debug('Record saved', savedId);

                if (savedId) {
                    log.debug('checkingissavedId exists');
                    const checkboxcheck = record.submitFields({
                        type: 'customrecord_hris_employee_compensation',
                        id: newRecordId,
                        values: {
                            custrecord_hris_comp_chnge_check: true
                        }
                    });
                    log.debug('checkboxcheck', checkboxcheck);
                }
            } catch (e) {
                log.error('Error while saving the record', e.message);
            }
        }
    };

    // =====================================================
    // Helper: Create / Rebuild Compensation Change Details
    // (when pay group is different)
    // =====================================================
    const createCompensationchangeDetails = (EmpcompChangeID, newRecordId) => {
        const comphistoryrec = record.load({
            type: 'customrecord_hris_employee_compensation',
            id: newRecordId,
            isDynamic: true
        });

        const Empname = comphistoryrec.getValue({ fieldId: 'custrecord_hris_employee_name_' });
        log.debug('Empname', Empname);

        const Paygroup = comphistoryrec.getValue({ fieldId: 'custrecord_hris_employee_pay_process_gro' });
        const IncrmentType = comphistoryrec.getValue({ fieldId: 'custrecord_hris_record_change_type' });
        log.debug('IncrmentType', IncrmentType);

        const monthlyGrossSalary = comphistoryrec.getValue({ fieldId: 'custrecord_hris_monthly_gross_salary' });
        const monthlyGrossSalaryInAED = comphistoryrec.getValue({ fieldId: 'custrecord_hris_monthly_gross_salary_in' });
        const annualGrossSalary = comphistoryrec.getValue({ fieldId: 'custrecord_hris_annual_gross_salary' });
        const annualGrossSalaryInAED = comphistoryrec.getValue({ fieldId: 'custrecord_hris_annual_gross_salary_in_b' });
        const ctc = comphistoryrec.getValue({ fieldId: 'custrecord_hris_ctc' });
        let effectivedate = comphistoryrec.getValue({ fieldId: 'custrecord_hris_effective_from_date' });
        const remarks = comphistoryrec.getValue({ fieldId: 'custrecord_hris_remarks' });
        const checkboxforcompchangecheck = comphistoryrec.getValue({ fieldId: 'custrecord_hris_comp_chnge_check' });

        log.emergency('Compensation Fields', {
            monthlyGrossSalary,
            monthlyGrossSalaryInAED,
            annualGrossSalary,
            annualGrossSalaryInAED,
            ctc
        });

        const Linecount = comphistoryrec.getLineCount({
            sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid'
        });

        const comphistoryArr = [];
        for (let k = 0; k < Linecount; k++) {
            const processGroup = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_processgroup',
                line: k
            });
            const payrollComponent = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_payrollcomponent',
                line: k
            });
            const payrollComponenttext = comphistoryrec.getSublistText({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_payrollcomponent',
                line: k
            });
            const monthlyAmount = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_monthlyamount',
                line: k
            });
            const annuallyAmount = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_annuallyamount',
                line: k
            });
            const payrollSeqNo = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_payrollseqno',
                line: k
            });
            const employeeid = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_empname',
                line: k
            });
            const subsidiary = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_subsidiary',
                line: k
            });
            const department = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_department',
                line: k
            });

            comphistoryArr.push({
                processGroup,
                payrollComponent,
                payrollComponentText: payrollComponenttext,
                monthlyAmount,
                annuallyAmount,
                payrollSeqNo,
                employeeid,
                subsidiary,
                department
            });

            log.debug(`Line ${k}`, {
                processGroup,
                payrollComponent,
                monthlyAmount,
                annuallyAmount,
                payrollSeqNo,
                employeeid,
                subsidiary,
                department
            });
        }

        let empcomprec = record.load({
            type: 'customrecord_hris_employee_compen_change',
            id: EmpcompChangeID,
            isDynamic: true
        });
        log.debug('empcomprec', empcomprec);

        empcomprec.setValue({
            fieldId: 'custrecord_hris_empchange_employee_nam',
            value: Empname,
            ignoreFieldChange: false,
            forceSyncSourcing: true
        });
        empcomprec.setValue({
            fieldId: 'custrecord_hris_empchange_emp_pay_pro_gp',
            value: Paygroup,
            ignoreFieldChange: true
        });

        if (effectivedate) {
            effectivedate = format.parse({
                value: effectivedate,
                type: format.Type.DATE
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_eff_from_date',
                value: effectivedate,
                ignoreFieldChange: true
            });
        }

        empcomprec.setValue({
            fieldId: 'custrecord_hris_empchange_remarks',
            value: remarks,
            ignoreFieldChange: true
        });
        empcomprec.setValue({
            fieldId: 'custrecord_hris_empchange_type',
            value: IncrmentType,
            ignoreFieldChange: true
        });

        // Save header first
        let savedId = empcomprec.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });
        log.debug('Record saved', savedId);

        // Reload
        empcomprec = record.load({
            type: 'customrecord_hris_employee_compen_change',
            id: EmpcompChangeID,
            isDynamic: true
        });
        log.debug('empcomprec', empcomprec);

        // Remove existing lines
        const Linecountcomp = empcomprec.getLineCount({
            sublistId: 'recmachcustrecord_hris_employee_data_change'
        });

        if (Linecountcomp > 0) {
            for (let i = Linecountcomp - 1; i >= 0; i--) {
                empcomprec.removeLine({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    line: i,
                    ignoreRecalc: true
                });
            }
        }

        // Also delete any orphaned compensation detail records
        const EmpCompensationdetailSQL =
            `SELECT id, custrecord_hris_employee_data_change 
             FROM customrecord_hris_compensation_details_e 
             WHERE custrecord_hris_employee_data_change = ${EmpcompChangeID}`;

        const resultSet = query.runSuiteQL({ query: EmpCompensationdetailSQL });
        const tsResult = resultSet.asMappedResults();

        if (tsResult.length > 0) {
            for (let t = 0; t < tsResult.length; t++) {
                const EmpcompEarningID = tsResult[t].id;
                log.debug('EmpcompEarningID', EmpcompEarningID);
                record.delete({
                    type: 'customrecord_hris_compensation_details_e',
                    id: EmpcompEarningID
                });
            }
        }

        if (checkboxforcompchangecheck == false) {
            log.debug('Starting Line Comparison', {
                comphistoryArr
            });

            for (let i = 0; i < comphistoryArr.length; i++) {
                empcomprec.selectNewLine({
                    sublistId: 'recmachcustrecord_hris_employee_data_change'
                });

                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_process_group',
                    value: comphistoryArr[i].processGroup,
                    ignoreFieldChange: false,
                    forceSyncSourcing: true
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_payroll_component',
                    value: comphistoryArr[i].payrollComponent,
                    ignoreFieldChange: false
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_annually',
                    value: comphistoryArr[i].annuallyAmount || '',
                    ignoreFieldChange: true
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_monthly',
                    value: comphistoryArr[i].monthlyAmount || '',
                    ignoreFieldChange: true
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_payroll_seqno',
                    value: comphistoryArr[i].payrollSeqNo || '',
                    ignoreFieldChange: true
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_employee_name',
                    value: comphistoryArr[i].employeeid || '',
                    ignoreFieldChange: true
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_subsidiary',
                    value: comphistoryArr[i].subsidiary || '',
                    ignoreFieldChange: true
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_compensationearing_dep_n',
                    value: comphistoryArr[i].department || '',
                    ignoreFieldChange: true
                });

                empcomprec.commitLine({
                    sublistId: 'recmachcustrecord_hris_employee_data_change'
                });
            }

            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_month_cross_sy',
                value: monthlyGrossSalary,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_annualgrosssly',
                value: annualGrossSalary,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_mon_gross',
                value: monthlyGrossSalaryInAED,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_an_gross_salar',
                value: annualGrossSalaryInAED,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_ctc',
                value: ctc,
                ignoreFieldChange: true
            });

            try {
                savedId = empcomprec.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                log.debug('Record saved', savedId);
            } catch (e) {
                log.error('Error while saving the record', e.message);
            }

            if (savedId) {
                log.debug('checkingissavedId exists');
                const checkboxcheck = record.submitFields({
                    type: 'customrecord_hris_employee_compensation',
                    id: newRecordId,
                    values: {
                        custrecord_hris_comp_chnge_check: true
                    }
                });
                log.debug('checkboxcheck', checkboxcheck);
            }
        }
    };

    // =====================================================
    // Helper: Create brand new Employee Compensation Change
    // =====================================================
    const createemployeecompensationchange = (newRecordId, EmpcompChangeID) => {
        const comphistoryrec = record.load({
            type: 'customrecord_hris_employee_compensation',
            id: newRecordId,
            isDynamic: true
        });

        const Empname = comphistoryrec.getValue({ fieldId: 'custrecord_hris_employee_name_' });
        log.debug('Empname', Empname);

        const Paygroup = comphistoryrec.getValue({ fieldId: 'custrecord_hris_employee_pay_process_gro' });
        const IncrmentType = comphistoryrec.getValue({ fieldId: 'custrecord_hris_record_change_type' });
        log.debug('IncrmentType', IncrmentType);

        const monthlyGrossSalary = comphistoryrec.getValue({ fieldId: 'custrecord_hris_monthly_gross_salary' });
        const monthlyGrossSalaryInAED = comphistoryrec.getValue({ fieldId: 'custrecord_hris_monthly_gross_salary_in' });
        const annualGrossSalary = comphistoryrec.getValue({ fieldId: 'custrecord_hris_annual_gross_salary' });
        const annualGrossSalaryInAED = comphistoryrec.getValue({ fieldId: 'custrecord_hris_annual_gross_salary_in_b' });
        const ctc = comphistoryrec.getValue({ fieldId: 'custrecord_hris_ctc' });
        let effectivedate = comphistoryrec.getValue({ fieldId: 'custrecord_hris_effective_from_date' });
        const remarks = comphistoryrec.getValue({ fieldId: 'custrecord_hris_remarks' });

        log.emergency('Compensation Fields', {
            monthlyGrossSalary,
            monthlyGrossSalaryInAED,
            annualGrossSalary,
            annualGrossSalaryInAED,
            ctc
        });

        const Linecount = comphistoryrec.getLineCount({
            sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid'
        });

        const comphistoryArrForNew = [];
        for (let k = 0; k < Linecount; k++) {
            const processGroup = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_processgroup',
                line: k
            });
            const payrollComponent = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_payrollcomponent',
                line: k
            });
            const payrollComponenttext = comphistoryrec.getSublistText({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_payrollcomponent',
                line: k
            });
            const monthlyAmount = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_monthlyamount',
                line: k
            });
            const annuallyAmount = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_annuallyamount',
                line: k
            });
            const payrollSeqNo = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_payrollseqno',
                line: k
            });
            const employeeid = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_empname',
                line: k
            });
            const subsidiary = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_subsidiary',
                line: k
            });
            const department = comphistoryrec.getSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_department',
                line: k
            });

            comphistoryArrForNew.push({
                processGroup,
                payrollComponent,
                payrollComponentText: payrollComponenttext,
                monthlyAmount,
                annuallyAmount,
                payrollSeqNo,
                employeeid,
                subsidiary,
                department
            });

            log.debug(`Linecreate ${k}`, {
                processGroup,
                payrollComponent,
                monthlyAmount,
                annuallyAmount,
                payrollSeqNo,
                employeeid,
                subsidiary,
                department
            });
        }

        try {
            log.debug('trycheck');

            const empcomprec = record.create({
                type: 'customrecord_hris_employee_compen_change',
                isDynamic: true
            });

            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_employee_nam',
                value: Empname,
                ignoreFieldChange: false,
                forceSyncSourcing: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_emp_pay_pro_gp',
                value: Paygroup,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_type',
                value: IncrmentType,
                ignoreFieldChange: true
            });

            if (effectivedate) {
                effectivedate = format.parse({
                    value: effectivedate,
                    type: format.Type.DATE
                });
                empcomprec.setValue({
                    fieldId: 'custrecord_hris_empchange_eff_from_date',
                    value: effectivedate,
                    ignoreFieldChange: true
                });
            }

            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_remarks',
                value: remarks,
                ignoreFieldChange: true
            });

            for (let y = 0; y < comphistoryArrForNew.length; y++) {
                empcomprec.selectNewLine({
                    sublistId: 'recmachcustrecord_hris_employee_data_change'
                });

                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_process_group',
                    value: comphistoryArrForNew[y].processGroup,
                    ignoreFieldChange: true
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_payroll_component',
                    value: comphistoryArrForNew[y].payrollComponent,
                    ignoreFieldChange: false
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_annually',
                    value: comphistoryArrForNew[y].annuallyAmount,
                    ignoreFieldChange: true
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_monthly',
                    value: comphistoryArrForNew[y].monthlyAmount,
                    ignoreFieldChange: false
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_payroll_component_seq_no',
                    value: comphistoryArrForNew[y].payrollSeqNo || '',
                    ignoreFieldChange: true
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_employee_name',
                    value: comphistoryArrForNew[y].employeeid || '',
                    ignoreFieldChange: true
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_subsidiary',
                    value: comphistoryArrForNew[y].subsidiary || '',
                    ignoreFieldChange: true
                });
                empcomprec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_compensationearing_dep_n',
                    value: comphistoryArrForNew[y].department || '',
                    ignoreFieldChange: true
                });

                empcomprec.commitLine({
                    sublistId: 'recmachcustrecord_hris_employee_data_change'
                });
            }

            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_month_cross_sy',
                value: monthlyGrossSalary,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_annualgrosssly',
                value: annualGrossSalary,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_mon_gross',
                value: monthlyGrossSalaryInAED,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_an_gross_salar',
                value: annualGrossSalaryInAED,
                ignoreFieldChange: true
            });
            empcomprec.setValue({
                fieldId: 'custrecord_hris_empchange_ctc',
                value: ctc,
                ignoreFieldChange: true
            });

            const savedIdfornew = empcomprec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            log.debug('Saved without sublist', savedIdfornew);

            if (savedIdfornew) {
                log.debug('checkingissavedId exists');
                const checkboxcheck = record.submitFields({
                    type: 'customrecord_hris_employee_compensation',
                    id: newRecordId,
                    values: {
                        custrecord_hris_comp_chnge_check: true
                    }
                });
                log.debug('checkboxcheck', checkboxcheck);
            }
        } catch (e) {
            log.error('Error saving Employee Compensation Change', {
                message: e.message,
                stack: e.stack
            });
        }
    };

    return {
        beforeSubmit,
        afterSubmit
        // beforeLoad   // uncomment if you want the role-based hiding
    };
});