/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 *
 * Disables Edit button / blocks editing when:
 * - Employee is inactive, OR
 * - Wage period is closed (inactive)
 *
 * Applies to:
 * - Monthly Salary Input
 * - Unpaid Leave Entry
 * - Salary Adjustment Entry
 * - Unpaid Arrear Entry
 * - Employee Compensation Change (employee inactive only)
 */
define(['N/record', 'N/search', 'N/runtime', 'N/log', 'N/redirect','N/query'], 
(record, search, runtime, log, redirect, query) =>  {

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
                handleRecord({
                    context, type, form, newRec, recId,
                    empField: 'custrecord_hris_mthsal_empname',
                    payGroupField: 'custrecord_hris_mthsal_paygroup',
                    payDateField: 'custrecord_hris_mthsal_paydt',
                    checkWage: true
                });
            }

            // ---------- Unpaid Leave Entry ----------
            if (recType === 'customrecord_hris_unpaid_leave_entry') {
                handleRecord({
                    context, type, form, newRec, recId,
                    empField: 'custrecord_hris_ule_employee_name',
                    payGroupField: 'custrecord_hris_ule_pay_group',
                    payDateField: 'custrecord_hris_ule_pay_date',
                    checkWage: true
                });
            }

            // ---------- Salary Adjustment Entry ----------
            if (recType === 'customrecord_hris_salary_adjustment_entr') {
                handleRecord({
                    context, type, form, newRec, recId,
                    empField: 'custrecord_hris_sae_employee_name',
                    payGroupField: 'custrecord_hris_sae_pay_group',
                    payDateField: 'custrecord_hris_sae_pay_date',
                    checkWage: true
                });
            }

            // ---------- Unpaid Arrear Entry ----------
            if (recType === 'customrecord_hris_unpaid_arrear_entry') {
                handleRecord({
                    context, type, form, newRec, recId,
                    empField: 'custrecord_hris_uae_employee_name',
                    payGroupField: 'custrecord_hris_uae_pay_group',
                    payDateField: 'custrecord_hris_uae_pay_date',
                    checkWage: true
                });
            }

            // ---------- Employee Compensation Change ----------
            // (only checks employee inactive – no wage period)
            if (recType === 'customrecord_hris_employee_compen_change') {
                handleRecord({
                    context, type, form, newRec, recId,
                    empField: 'custrecord_hris_empchange_employee_nam',
                    payGroupField: null,
                    payDateField: null,
                    checkWage: false
                });
            }

        } catch (e) {
            log.error('beforeLoad error', e.message || e.toString());
        }
    };

    const beforeSubmit = (context) => {
        try {
            if (context.type !== context.UserEventType.XEDIT) {
                return;
            }

            const newRec = context.newRecord;
            const recType = newRec.type;

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
                },
                'customrecord_hris_monthlysalinput': {
                    payGroup: 'custrecord_hris_mthsal_paygroup',
                    payDate: 'custrecord_hris_mthsal_paydt'
                }
            };

            const map = fieldMap[recType];
            if (!map) {
                return;
            }

            const payGroup = newRec.getValue({ fieldId: map.payGroup });
            const payDate = newRec.getValue({ fieldId: map.payDate });

            if (getActiveWageStatus(payGroup, payDate)) {
                throw 'You can not edit an inactive wage period record.';
            }

        } catch (e) {
            if (typeof e === 'string') {
                throw e;
            }
            log.error('beforeSubmit error', e.message || e.toString());
        }
    };

    // =====================================================
    // Common handler for View / Edit
    // =====================================================
    const handleRecord = ({ context, type, form, newRec, recId, empField, payGroupField, payDateField, checkWage }) => {
        const empId = newRec.getValue({ fieldId: empField });
        if (!empId) {
            return;
        }

        const empInactive = getEmployeeInactiveStatus(empId);

        let wageClosed = false;
        if (checkWage && payGroupField && payDateField) {
            const payGroup = newRec.getValue({ fieldId: payGroupField });
            const payDate = newRec.getValue({ fieldId: payDateField });
            wageClosed = getActiveWageStatus(payGroup, payDate);
            log.emergency('Wage Status', { payGroup, payDate, wageClosed });
        }

        const shouldBlock = empInactive || wageClosed;

        // VIEW → Disable Edit button
        if (type === context.UserEventType.VIEW) {
            if (shouldBlock) {
                const editBtn = form.getButton({ id: 'edit' });
                if (editBtn) {
                    editBtn.isDisabled = true;
                }
            }
        }

        // EDIT → Block editing
        if (type === context.UserEventType.EDIT) {
            if (shouldBlock) {
                // Option 1: Redirect to View (same as original Salary Adjustment)
                redirect.toRecord({
                    type: newRec.type,
                    id: recId,
                    isEditMode: false
                });

                // Option 2 (alternative): throw error instead of redirect
                // throw 'You can not edit this record (Employee inactive or Wage period closed).';
            }
        }
    };

    // =====================================================
    // Helpers
    // =====================================================
    const getEmployeeInactiveStatus = (empId) => {
        try {
            const empData = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: empId,
                columns: ['isinactive']
            });
            return empData.isinactive === true || empData.isinactive === 'T';
        } catch (e) {
            log.error('getEmployeeInactiveStatus', e.message);
            return false;
        }
    };

    /**
     * Returns true if wage period is CLOSED / inactive
     * (i.e. no matching active wage period record found)
     */
    const getActiveWageStatusold = (payGroup, payDate) => {
        try {
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

            // If a matching active wage period exists → wage is OPEN → return false
            // If no matching record → wage is CLOSED → return true
            return !(results && results.length > 0);

        } catch (e) {
            log.error('getActiveWageStatus', e.message);
            return false;
        }
    };

    /**
 * Returns true if wage period is CLOSED / inactive
 * (i.e. no matching active wage period record found)
 */
const getActiveWageStatusold2 = (payGroup, payDate) => {
    try {
        // If either value is missing, treat as closed (or change to false if you prefer)
        if (!payGroup || !payDate) {
            log.debug('getActiveWageStatus', 'Missing payGroup or payDate', { payGroup, payDate });
            return true;   // or return false depending on your business rule
        }

        const results = search.create({
            type: 'customrecord_hris_wage_period_details',
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['custrecord_hris_pay_group', 'anyof', payGroup],
                'AND',
                ['custrecord_hris_end_date', 'on', payDate]
            ],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });

        // Matching active wage period found → OPEN → return false
        // No matching record → CLOSED → return true
        const isClosed = !(results && results.length > 0);

        log.debug('getActiveWageStatus result', {
            payGroup,
            payDate,
            found: results ? results.length : 0,
            isClosed
        });

        return isClosed;

    } catch (e) {
        log.error('getActiveWageStatus ERROR', {
            message: e.message || e.toString(),
            payGroup,
            payDate
        });
        // Fail safe: do not block editing if search fails
        return false;
    }
};
/**
 * Returns true if wage period is CLOSED / inactive
 * (no matching active wage period found)
 */
const getActiveWageStatus = (payGroup, payDate) => {
    try {
        if (!payGroup || !payDate) {
            log.debug('getActiveWageStatus', 'Missing payGroup or payDate', { payGroup, payDate });
            return true; // treat as closed when data is missing
        }

        // Convert payDate to dd/mm/yyyy for SuiteQL
        let dateStr = payDate;

        // If it's a Date object or ISO string, format it
        if (payDate instanceof Date || (typeof payDate === 'string' && payDate.indexOf('-') > -1)) {
            const d = (payDate instanceof Date) ? payDate : new Date(payDate);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            dateStr = `${day}/${month}/${year}`;
        }

        log.debug('getActiveWageStatus - formatted date', { original: payDate, formatted: dateStr });

        // SuiteQL query
        const sql = `
            SELECT id
            FROM customrecord_hris_wage_period_details
            WHERE isinactive = 'F'
              AND custrecord_hris_pay_group = ?
              AND custrecord_hris_end_date = TO_DATE(?, 'DD/MM/YYYY')
        `;

        const resultSet = query.runSuiteQL({
            query: sql,
            params: [payGroup, dateStr]
        });

        const results = resultSet.asMappedResults();

        // Matching record found → wage is OPEN → return false
        // No record → wage is CLOSED → return true
        const isClosed = !(results && results.length > 0);

        log.debug('getActiveWageStatus result', {
            payGroup,
            dateStr,
            found: results ? results.length : 0,
            isClosed
        });

        return isClosed;

    } catch (e) {
        log.error('getActiveWageStatus ERROR', {
            message: e.message || e.toString(),
            payGroup,
            payDate
        });
        // Fail safe – do not block editing
        return false;
    }
};
    return {
        beforeLoad,
        beforeSubmit
    };
});