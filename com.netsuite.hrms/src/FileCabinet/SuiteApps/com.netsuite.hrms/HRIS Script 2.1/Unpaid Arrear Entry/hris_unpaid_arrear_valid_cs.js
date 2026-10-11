/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/search', 'N/format', 'N/log', 'N/ui/dialog'], (search, format, log, dialog) => {

    const pageInit = (context) => {
        try {
            if (context.mode !== 'create') {
                return;
            }

            const currentRec = context.currentRecord;
            const empId = currentRec.getValue({ fieldId: 'custrecord_hris_uae_employee_name' });

            if (!empId) {
                return;
            }

            const payGroup = getPayGroup(empId);
            const wagePeriodEndDate = getWagePeriod(payGroup);

            currentRec.setValue({
                fieldId: 'custrecord_hris_uae_pay_date',
                value: wagePeriodEndDate
            });

            currentRec.setValue({
                fieldId: 'custrecord_hris_uae_pay_group',
                value: payGroup,
                ignoreFieldChange: true,
                forceSyncSourcing: false
            });

            // Disable Pay Date field (Client Script 2.x limitation – see note below)
            // Prefer making the field disabled at Form level if possible

            if (wagePeriodEndDate) {
                const mth = format.parse({
                    value: wagePeriodEndDate,
                    type: format.Type.DATE
                });

                const getMonth = mth.getMonth() + 1;
                const year = mth.getFullYear();

                currentRec.setValue({
                    fieldId: 'custrecord_hris_uae_month',
                    value: getMonth,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });

                // Original used setFieldText for year – here we search and set the ID
                const yearId = searchYear(year);
                currentRec.setValue({
                    fieldId: 'custrecord_hris_uae_year',
                    value: yearId,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });
            }

        } catch (err) {
            log.error('pageInit error', err.message || err.toString());
        }
    };

    const fieldChanged = (context) => {
      debugger;
        try {
            if (context.fieldId !== 'custrecord_hris_uae_employee_name') {
                return;
            }

            const currentRec = context.currentRecord;
            const empId = currentRec.getValue({ fieldId: 'custrecord_hris_uae_employee_name' });

            if (!empId) {
                return;
            }

            const payGroup = getPayGroup(empId);

            currentRec.setValue({
                fieldId: 'custrecord_hris_uae_pay_group',
                value: payGroup,
                ignoreFieldChange: true,
                forceSyncSourcing: false
            });

            const wagePeriodEndDate = getWagePeriod(payGroup);
            const formattedWagePeriodEndDate = format.parse({ value: wagePeriodEndDate, type: format.Type.DATE });
            currentRec.setValue({
                fieldId: 'custrecord_hris_uae_pay_date',
                value: formattedWagePeriodEndDate,
                ignoreFieldChange: true,
                forceSyncSourcing: true
            });

            if (wagePeriodEndDate) {
                const mth = format.parse({
                    value: wagePeriodEndDate,
                    type: format.Type.DATE
                });

                log.debug('mth', mth);

                const getMonth = mth.getMonth() + 1;
                log.debug('get_month', getMonth);

                const year = mth.getFullYear();
                log.debug('yeartext', year);

                const yearId = searchYear(year);
                log.debug('year', yearId);

                currentRec.setValue({
                    fieldId: 'custrecord_hris_uae_month',
                    value: getMonth,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });

                currentRec.setValue({
                    fieldId: 'custrecord_hris_uae_year',
                    value: yearId,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });
            }

        } catch (e) {
            dialog.alert({
                title: 'Error',
                message: 'Wage period is not defined for this employee'
            });
            context.currentRecord.setValue({
                fieldId: 'custrecord_hris_uae_pay_date',
                value: ''
            });
            log.error('fieldChanged error', e.message || e.toString());
        }
    };

    const saveRecord = () => true;
    const validateField = () => true;
    const validateLine = () => true;

    // =====================================================
    // Helper functions
    // =====================================================

    const getPayGroup = (empId) => {
        const results = search.create({
            type: 'customrecord_hris_employee_compen_change',
            filters: [
                ['custrecord_hris_empchange_employee_nam', 'is', empId]
            ],
            columns: ['custrecord_hris_empchange_emp_pay_pro_gp']
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'custrecord_hris_empchange_emp_pay_pro_gp' });
        }
        return null;
    };

    const getWagePeriod = (payGroup) => {
        if (!payGroup) {
            return null;
        }

        const results = search.create({
            type: 'customrecord_hris_wage_period_details',
            filters: [
                ['custrecord_hris_pay_group', 'is', payGroup],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: [
                'custrecord_hris_end_date',
                search.createColumn({ name: 'internalid', sort: search.Sort.DESC })
            ]
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'custrecord_hris_end_date' });
        }
        return null;
    };

    const searchYear = (year) => {
        const results = search.create({
            type: 'customrecord_hris_year_master',
            filters: [
                ['name', 'is', String(year)]
            ],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'internalid' });
        }
        return null;
    };

    return {
        pageInit,
        fieldChanged,
        saveRecord,
        validateField,
        validateLine
    };
});