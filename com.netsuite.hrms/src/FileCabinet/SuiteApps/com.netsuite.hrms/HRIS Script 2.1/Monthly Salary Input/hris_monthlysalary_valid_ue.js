/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/runtime', 'N/log', 'N/redirect'], (record, search, runtime, log, redirect) => {

    const beforeLoad = (context) => {
        try {
            if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE) {
                return;
            }

            const type = context.type;
            const form = context.form;
            const newRec = context.newRecord;
            const recType = newRec.type;
            const recId = newRec.id;

            // ---------- Monthly Salary Input ----------
            if (recType === 'customrecord_hris_monthlysalinput') {
                handleMonthlySalInput(context, type, form, newRec);
            }

            // ---------- Unpaid Leave Entry ----------
            if (recType === 'customrecord_hris_unpaid_leave_entry') {
                handleUnpaidLeave(context, type, form, newRec);
            }

            // ---------- Salary Adjustment Entry ----------
            if (recType === 'customrecord_hris_salary_adjustment_entr') {
                handleSalaryAdjustment(context, type, form, newRec, recId);
            }

            // ---------- Unpaid Arrear Entry ----------
            if (recType === 'customrecord_hris_unpaid_arrear_entry') {
                handleUnpaidArrear(context, type, form, newRec);
            }

            // ---------- Employee Compensation Change ----------
            if (recType === 'customrecord_hris_employee_compen_change') {
                handleEmpCompChange(context, type, form, newRec);
            }

        } catch (e) {
            log.error('beforeLoad error', e.message || e.toString());
        }
    };

    const beforeSubmit = (context) => {
        try {
            const type = context.type;
            const newRec = context.newRecord;
            const recType = newRec.type;
            const recId = newRec.id;

            if (type !== context.UserEventType.XEDIT) {
                return;
            }

            if (recType === 'customrecord_hris_unpaid_leave_entry' ||
                recType === 'customrecord_hris_salary_adjustment_entr' ||
                recType === 'customrecord_hris_unpaid_arrear_entry') {

                const fieldMap = {
                    'customrecord_hris_unpaid_leave_entry': {
                        payGroup: 'custrecord_hris_ule_pay_group',
                        payDate: 'custrecord_hris_ule_pay_date'
                    },
                    'customrecord_hris_salary_adjustment_entr': {
                        payGroup: 'custrecord_hris_sae_pay_group',
                        payDate: 'custrecord_hris_sae_pay_date'
                    },
                    'customrecord_hris_unpaid_arrear_entry': {
                        payGroup: 'custrecord_hris_uae_pay_group',
                        payDate: 'custrecord_hris_uae_pay_date'
                    }
                };

                const map = fieldMap[recType];
                const payGroup = newRec.getValue({ fieldId: map.payGroup });
                const payDate = newRec.getValue({ fieldId: map.payDate });

                if (getActiveWageStatus(payGroup, payDate)) {
                    throw 'You can not edit an inactive wage period record.';
                }
            }

        } catch (e) {
            if (typeof e === 'string') {
                throw e;
            }
            log.error('beforeSubmit error', e.message || e.toString());
        }
    };

    // =====================================================
    // Handlers
    // =====================================================
    const handleMonthlySalInput = (context, type, form, newRec) => {
        const empId = newRec.getValue({ fieldId: 'custrecord_hris_mthsal_empname' });
        if (!empId) return;

        const payGroup = newRec.getValue({ fieldId: 'custrecord_hris_mthsal_paygroup' });
        const payDate = newRec.getValue({ fieldId: 'custrecord_hris_mthsal_paydt' });
        const isActiveWage = getActiveWageStatus(payGroup, payDate);
        // Original did not disable button here – logic preserved
    };

    const handleUnpaidLeave = (context, type, form, newRec) => {
        // Same pattern – original only checked status, no disable
    };

    const handleSalaryAdjustment = (context, type, form, newRec, recId) => {
        const empId = newRec.getValue({ fieldId: 'custrecord_hris_sae_employee_name' });
        if (!empId) return;

        const empStatus = getEmployeeInactiveStatus(empId);
        const payGroup = newRec.getValue({ fieldId: 'custrecord_hris_sae_pay_group' });
        const payDate = newRec.getValue({ fieldId: 'custrecord_hris_sae_pay_date' });
        const isActiveWage = getActiveWageStatus(payGroup, payDate);

        if (type === context.UserEventType.VIEW) {
            if (empStatus || isActiveWage) {
                const editBtn = form.getButton({ id: 'edit' });
                if (editBtn) {
                    editBtn.isDisabled = true;
                }
            }
        }

        if (type === context.UserEventType.EDIT) {
            if (empStatus || isActiveWage) {
                redirect.toRecord({
                    type: newRec.type,
                    id: recId,
                    isEditMode: false
                });
            }
        }
    };

    const handleUnpaidArrear = (context, type, form, newRec) => {
        // Original only checked – no action
    };

    const handleEmpCompChange = (context, type, form, newRec) => {
        const empId = newRec.getValue({ fieldId: 'custrecord_hris_empchange_employee_nam' });
        if (!empId) return;

        const empStatus = getEmployeeInactiveStatus(empId);

        if (type === context.UserEventType.VIEW) {
            if (empStatus) {
                const editBtn = form.getButton({ id: 'edit' });
                if (editBtn) {
                    editBtn.isDisabled = true;
                }
            }
        }

        if (type === context.UserEventType.EDIT) {
            if (empStatus) {
                throw 'You can not edit this record';
            }
        }
    };

    // =====================================================
    // Helpers
    // =====================================================
    const getEmployeeInactiveStatus = (empId) => {
        const empData = search.lookupFields({
            type: search.Type.EMPLOYEE,
            id: empId,
            columns: ['isinactive']
        });
        return empData.isinactive === true || empData.isinactive === 'T';
    };

    const getActiveWageStatus = (payGroup, payDate) => {
        const filters = [['isinactive', 'is', 'F']];

        if (payGroup) {
            filters.push('AND');
            filters.push(['custrecord_hris_pay_group', 'anyof', payGroup]);
        }
        if (payDate) {
            filters.push('AND');
            filters.push(['custrecord_hris_end_date', 'on', payDate]);
        }

        const results = search.create({
            type: 'customrecord_hris_wage_period_details',
            filters,
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });

        // Original: if search finds record → return false (active), else true (inactive)
        return !(results && results.length > 0);
    };

    return {
        beforeLoad,
        beforeSubmit
    };
});