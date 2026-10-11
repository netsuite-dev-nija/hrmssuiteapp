/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/search', 'N/record', 'N/format', 'N/log'], (search, record, format, log) => {

    const pageInit = (context) => {
        if (context.mode !== 'create') {
            return;
        }

        try {
            const currentRec = context.currentRecord;
            const empId = currentRec.getValue({ fieldId: 'custrecord_hris_ule_employee_name' });

            if (!empId) {
                return;
            }

            const payGroup = getPayGroup(empId);
            log.debug('search_pay_grp', payGroup);

            if (!payGroup) {
                return;
            }

            currentRec.setValue({
                fieldId: 'custrecord_hris_ule_pay_group',
                value: payGroup,
                ignoreFieldChange: true,
                forceSyncSourcing: false
            });

            const wageDetails = getWageDetails(payGroup);
            log.debug('wageDetails', wageDetails);

            if (!wageDetails) {
                return;
            }

            const parts = wageDetails.toString().split('#');
            const endDate = parts[0];
            const startDate = parts[1];

            log.debug('end_date', endDate);
            log.debug('start_date', startDate);
            const parsedEndDate = format.parse({ value: endDate, type: format.Type.DATE });
            log.debug('parsed_end_date', parsedEndDate);

            currentRec.setValue({
                fieldId: 'custrecord_hris_ule_pay_date',
                value: parsedEndDate,   
                ignoreFieldChange: true,
                forceSyncSourcing: false
            });
              
            // Parse date and set month / year
            const mth = format.parse({
                value: endDate,
                type: format.Type.DATE
            });

            log.debug('mth', mth);

            const getMonth = mth.getMonth() + 1;
            log.debug('get_month', getMonth);

            const year = mth.getFullYear();
            const yearId = searchYear(year);

            currentRec.setValue({ fieldId: 'custrecord_hris_ule_month', value: getMonth });
            currentRec.setValue({ fieldId: 'custrecord_hris_ule_year', value: yearId });

        } catch (e) {
            log.error('pageInit error', e.message || e.toString());
        }
    };

    const fieldChanged = (context) => {
        debugger;
        try {
            if (context.fieldId !== 'custrecord_hris_ule_employee_name') {
                return;
            }

            const currentRec = context.currentRecord;
            const empId = currentRec.getValue({ fieldId: 'custrecord_hris_ule_employee_name' });

            if (!empId) {
                return;
            }

            const payGroup = getPayGroup(empId);

            currentRec.setValue({
                fieldId: 'custrecord_hris_ule_pay_group',
                value: payGroup,
                ignoreFieldChange: true,
                forceSyncSourcing: false
            });

            const wageDetails = getWageDetails(payGroup);

            if (!wageDetails) {
                return;
            }

            const parts = wageDetails.toString().split('#');
            const endDate = parts[0];
            const startDate = parts[1];
const parsedEndDate = format.parse({ value: endDate, type: format.Type.DATE });
            currentRec.setValue({
                fieldId: 'custrecord_hris_ule_pay_date',
                value: parsedEndDate,
                ignoreFieldChange: true,
                forceSyncSourcing: false
            });

            const mth = format.parse({
                value: endDate,
                type: format.Type.DATE
            });

            const getMonth = mth.getMonth() + 1;
            const year = mth.getFullYear();
            const yearId = searchYear(year);

            currentRec.setValue({ fieldId: 'custrecord_hris_ule_month', value: getMonth });
            currentRec.setValue({ fieldId: 'custrecord_hris_ule_year', value: yearId });

            // Update wage period on Pay Group master (same as original)
            if (payGroup) {
                const payGrpRec = record.load({
                    type: 'customrecord_hris_process_groupmaster',
                    id: payGroup,
                    isDynamic: false
                });

                payGrpRec.setValue({ fieldId: 'custrecord_hris_wage_to', value: endDate });
                payGrpRec.setValue({ fieldId: 'custrecord_hris_wage_from', value: startDate });

                payGrpRec.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                });
            }

        } catch (e) {
            log.error('fieldChanged error', e.message || e.toString());
        }
    };

    const saveRecord = () => true;
    const validateField = () => true;
    const validateLine = () => true;

    // =====================================================
    // Helper functions
    // =====================================================

    const getPayGroup = (employeeId) => {
        const results = search.create({
            type: 'customrecord_hris_employee_compen_change',
            filters: [
                ['custrecord_hris_empchange_employee_nam', 'is', employeeId],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['custrecord_hris_empchange_emp_pay_pro_gp']
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'custrecord_hris_empchange_emp_pay_pro_gp' });
        }
        return null;
    };

    const getWageDetails = (payGroup) => {
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
                'custrecord_hris_start_date',
                search.createColumn({ name: 'internalid', sort: search.Sort.DESC })
            ]
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            const endDate = results[0].getValue({ name: 'custrecord_hris_end_date' });
            const startDate = results[0].getValue({ name: 'custrecord_hris_start_date' });
            return endDate + '#' + startDate;
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