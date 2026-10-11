/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 *
 * This script automatically updates the "isinactive" flag for related records when an employee is marked as inactive.
 * It applies to employees with custom form ID 776.
 */
define(['N/record', 'N/search', 'N/runtime', 'N/log'], (record, search, runtime, log) => {

    const afterSubmit = (context) => {
        try {
            // Only run from UI (same as original)
            if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE) {
                return;
            }

            if (context.type !== context.UserEventType.EDIT &&
                context.type !== context.UserEventType.CREATE) {
                return;
            }

            const empId = context.newRecord.id;
            const customform = context.newRecord.getValue({ fieldId: 'customform' });
            log.debug('customform', customform);

            if (customform != 776) {
                return;
            }

            const isInactive = context.newRecord.getValue({ fieldId: 'isinactive' });
            log.debug('Inactive::::', isInactive);

            const targetInactive = isInactive === true || isInactive === 'T';

            // 1. Employee Compensation Change
            toggleRelatedRecords({
                recordType: 'customrecord_hris_employee_compen_change',
                employeeField: 'custrecord_hris_empchange_employee_nam',
                empId,
                targetInactive,
                singleRecord: true
            });

            // 2. Leave Balance (multiple possible)
            toggleRelatedRecords({
                recordType: 'customrecord_hris_leavebalance',
                employeeField: 'custrecord_hris_lvbal_employee_name',
                empId,
                targetInactive,
                singleRecord: false
            });

            // 3. Employee Data Sourcing
            toggleRelatedRecords({
                recordType: 'customrecord_hris_employeedatasourcing',
                employeeField: 'custrecord_hris_eds_employee',
                empId,
                targetInactive,
                singleRecord: true
            });

            // 4. Employee Compensation History
            toggleRelatedRecords({
                recordType: 'customrecord_hris_employee_compensation',
                employeeField: 'custrecord_hris_employee_name_',
                empId,
                targetInactive,
                singleRecord: false
            });

        } catch (e) {
            log.error('EventAfterSubmit ERROR', e.message || e.toString());
        }
    };

    /**
     * Search related records and set isinactive flag
     */
    const toggleRelatedRecords = ({ recordType, employeeField, empId, targetInactive, singleRecord }) => {
        const filters = [
            ['isinactive', 'is', targetInactive ? 'F' : 'T'],
            'AND',
            [employeeField, 'anyof', empId]
        ];

        const relatedSearch = search.create({
            type: recordType,
            filters,
            columns: ['internalid']
        });

        const results = relatedSearch.run().getRange({
            start: 0,
            end: singleRecord ? 1 : 1000
        });

        if (!results || results.length === 0) {
            return;
        }

        results.forEach((result) => {
            try {
                record.submitFields({
                    type: recordType,
                    id: result.id,
                    values: {
                        isinactive: targetInactive
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
            } catch (e) {
                log.error(`Failed to update ${recordType} id ${result.id}`, e.message);
            }
        });
    };

    return {
        afterSubmit
    };
});