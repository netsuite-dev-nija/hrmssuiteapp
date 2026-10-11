/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/search', 'N/runtime', 'N/format', 'N/log', 'N/ui/dialog'], 
(search, runtime, format, log, dialog) => {

    const pageInit = (context) => {
        if (context.mode !== 'create') {
            return;
        }

        try {
            const currentRec = context.currentRecord;
            const empVal = currentRec.getValue({ fieldId: 'custrecord_hris_loan_emp_name' });

            log.debug('empVal', empVal);

            if (empVal) {
                const payGroup = searchPayGroup(empVal);
                log.debug('s_paygrp', payGroup);

                currentRec.setValue({
                    fieldId: 'custrecord_hris_loan_process_group',
                    value: payGroup || ''
                });
            }
        } catch (e) {
            log.error('pageInit error', e.message || e.toString());
        }
    };

    const saveRecord = (context) => {
        try {
            const currentRec = context.currentRecord;

            const emiStartDate = currentRec.getValue({ fieldId: 'custrecord_hris_loan_emistartmonth' });
            const emiEndDate = currentRec.getValue({ fieldId: 'custrecord_hris_loan_emi_end_date' });

            if (emiStartDate && emiEndDate) {
                const startDate = format.parse({ value: emiStartDate, type: format.Type.DATE });
                const endDate = format.parse({ value: emiEndDate, type: format.Type.DATE });

                log.debug('str_EMIStartDate', startDate);

                if (endDate < startDate) {
                    dialog.alert({
                        title: 'Validation Error',
                        message: 'EMI End Date cannot be earlier than EMI Start Date'
                    });
                    return false;
                }
            }

            return true;

        } catch (e) {
            log.error('saveRecord error', e.message || e.toString());
            return true;
        }
    };

    const fieldChanged = (context) => {
        debugger;
        try {
            const currentRec = context.currentRecord;
            const fieldId = context.fieldId;
            const dateFormat = runtime.getCurrentUser().getPreference({ name: 'DATEFORMAT' });

            log.debug('date_format', dateFormat);

            // ---------- Employee selected → set Pay Group ----------
            if (fieldId === 'custrecord_hris_loan_emp_name') {
                const empVal = currentRec.getValue({ fieldId: 'custrecord_hris_loan_emp_name' });
                const payGroup = searchPayGroup(empVal);

                currentRec.setValue({
                    fieldId: 'custrecord_hris_loan_process_group',
                    value: payGroup || ''
                });
            }

            // ---------- Loan Amount ----------
            if (fieldId === 'custrecord_hris_loan_amount') {
                const empId = currentRec.getValue({ fieldId: 'custrecord_hris_loan_emp_name' });
                const loanAmt = parseFloat(currentRec.getValue({ fieldId: 'custrecord_hris_loan_amount' }) || 0);
                const salAmt = parseFloat(currentRec.getValue({ fieldId: 'custrecord_hris_loan_mon_approx_net' }) || 0);
                const loanTypeText = currentRec.getText({ fieldId: 'custrecord_hris_loan_loan_type' });
                const loanTypeVal = currentRec.getValue({ fieldId: 'custrecord_hris_loan_loan_type' });

                const empGrade = searchEmpGrade(empId);
                const ceilingAmt = parseFloat(searchLoanType(empGrade, loanTypeText) || 0);

                // Original had empty if blocks – kept for future validation
                if (loanAmt > ceilingAmt) {
                    // Add validation message if required
                }

                if (loanTypeVal == 2) {
                    if (salAmt < loanAmt) {
                        // Add validation message if required
                    }
                }
            }

            // ---------- EMI Amount ----------
            if (fieldId === 'custrecord_hris_loan_emi_amount') {
                const emiAmt = parseFloat(currentRec.getValue({ fieldId: 'custrecord_hris_loan_emi_amount' }) || 0);
                const loanAmt = parseFloat(currentRec.getValue({ fieldId: 'custrecord_hris_loan_amount' }) || 0);

                if (emiAmt > loanAmt) {
                    dialog.alert({
                        title: 'Validation Error',
                        message: 'EMI Amount should not be greater than Loan Amount'
                    });
                    currentRec.setValue({
                        fieldId: 'custrecord_hris_loan_emi_amount',
                        value: ''
                    });
                    return;
                }
            }

            // ---------- EMI Start Month ----------
            if (fieldId === 'custrecord_hris_loan_emistartmonth') {
                handleEmiStartDate(currentRec, dateFormat);
            }

            // ---------- EMI End Date ----------
            if (fieldId === 'custrecord_hris_loan_emi_end_date') {
                handleEmiEndDate(currentRec);
            }

        } catch (e) {
            log.error('fieldChanged error', e.message || e.toString());
        }
    };

    // =====================================================
    // EMI Start Date logic
    // =====================================================
    const handleEmiStartDate = (currentRec, dateFormat) => {
        debugger

        const emiStartDateStr = currentRec.getValue({ fieldId: 'custrecord_hris_loan_emistartmonth' });
        log.debug('emi_start_date', emiStartDateStr);

        if (!emiStartDateStr) {
            return;
        }

        const startDate = format.parse({
            value: emiStartDateStr,
            type: format.Type.DATE
        });

        let noOfInstall = parseFloat(currentRec.getValue({ fieldId: 'custrecord_hris_loan_no_of_install' }) || 0);
        noOfInstall = noOfInstall - 1;

        const startDay = startDate.getDate();
        log.debug('EMI start getDate', startDay);

        // Calculate end date = start date + (installments - 1) months, last day of that month
        let endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + noOfInstall);
        endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0); // last day of month

        const toDate = endDate.getDate();
        const toYear = endDate.getFullYear();
        const toMonth = endDate.getMonth() + 1;

        let toDateValue = formatDateByPreference(toDate, toMonth, toYear, dateFormat);
        log.debug('toDateValue', toDateValue);

        // Validate that start date is the last day of the month
        const lastDayOfStartMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();

        if (startDay !== lastDayOfStartMonth) {
            dialog.alert({
                title: 'Validation Error',
                message: 'EMI start date should be END DATE of selected month'
            });
            currentRec.setValue({ fieldId: 'custrecord_hris_loan_emistartmonth', value: '' });
            currentRec.setValue({ fieldId: 'custrecord_hris_loan_emi_end_date', value: '' });
        } else {
            const formattedEndDate = format.parse({ value: toDateValue, type: format.Type.DATE });
            currentRec.setValue({
                fieldId: 'custrecord_hris_loan_emi_end_date',
                value: formattedEndDate
            });
        }
    };

    // =====================================================
    // EMI End Date logic
    // =====================================================
    const handleEmiEndDate = (currentRec) => {
        const emiEndDateStr = currentRec.getValue({ fieldId: 'custrecord_hris_loan_emi_end_date' });
        if (!emiEndDateStr) {
            return;
        }

        const endDate = format.parse({
            value: emiEndDateStr,
            type: format.Type.DATE
        });

        const emiStartDateStr = currentRec.getValue({ fieldId: 'custrecord_hris_loan_emistartmonth' });
        if (emiStartDateStr) {
            const startDate = format.parse({
                value: emiStartDateStr,
                type: format.Type.DATE
            });

            if (endDate < startDate) {
                dialog.alert({
                    title: 'Validation Error',
                    message: 'EMI End Month should be greater than EMI Start Month'
                });
                currentRec.setValue({ fieldId: 'custrecord_hris_loan_emi_end_date', value: '' });
                return;
            }
        }

        const endDay = endDate.getDate();
        log.debug('str_emi_end_Date Condition', endDay);

        const lastDayOfEndMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
        log.debug('lastDay val', lastDayOfEndMonth);

        if (endDay !== lastDayOfEndMonth) {
            dialog.alert({
                title: 'Validation Error',
                message: 'EMI end date should be END DATE of selected month'
            });
            currentRec.setValue({ fieldId: 'custrecord_hris_loan_emi_end_date', value: '' });
        }
    };

    // =====================================================
    // Date format helper
    // =====================================================
    const formatDateByPreference = (day, month, year, dateFormat) => {
        const d = String(day);
        const m = String(month);
        const y = String(year);

        switch (dateFormat) {
            case 'MM/DD/YYYY':
            case 'M/D/YYYY':
                return `${m}/${d}/${y}`;
            case 'DD/MM/YYYY':
            case 'D/M/YYYY':
                return `${d}/${m}/${y}`;
            case 'DD-Mon-YYYY':
                return `${d}-${m}-${y}`;
            case 'DD.MM.YYYY':
                return `${d}.${m}.${y}`;
            case 'YYYY/MM/DD':
                return `${y}/${m}/${d}`;
            case 'YYYY-MM-DD':
                return `${y}-${m}-${d}`;
            default:
                return `${d}/${m}/${y}`; // fallback DD/MM/YYYY
        }
    };

    // =====================================================
    // Search helpers
    // =====================================================
    const searchPayGroup = (employeeName) => {
        if (!employeeName) return null;

        const results = search.create({
            type: 'customrecord_hris_employee_compen_change',
            filters: [
                ['custrecord_hris_empchange_employee_nam', 'is', employeeName],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),
                'custrecord_hris_empchange_emp_pay_pro_gp'
            ]
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'custrecord_hris_empchange_emp_pay_pro_gp' });
        }
        return null;
    };

    const searchEmpGrade = (empId) => {
        if (!empId) return null;

        const results = search.create({
            type: search.Type.EMPLOYEE,
            filters: [
                ['internalid', 'is', empId],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['custentity_emp_grade_']
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'custentity_emp_grade_' });
        }
        return null;
    };

    const searchLoanType = (empGrade, loanType) => {
        if (!empGrade || !loanType) return null;

        const results = search.create({
            type: 'customrecord_hris_loan_master',
            filters: [
                ['custrecord_hris_loan_grade', 'anyof', empGrade],
                'AND',
                ['name', 'is', loanType],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['custrecord_hris_ceiling_amount']
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'custrecord_hris_ceiling_amount' });
        }
        return null;
    };

    return {
        pageInit,
        saveRecord,
        fieldChanged
    };
});