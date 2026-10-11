/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

    const afterSubmit = (scriptContext) => {
        try {
            // Only run on CREATE
            if (scriptContext.type !== scriptContext.UserEventType.CREATE) {
                return;
            }

            const newRecord = scriptContext.newRecord;
            const recordId = newRecord.id;
            const recordType = newRecord.type;

            log.debug('afterSubmit', `Record Type: ${recordType}, ID: ${recordId}`);

            // Only process Monthly Accrual Transaction
            if (recordType !== 'customrecord_hris_monthly_accural_trans') {
                return;
            }

            const autoPrefix = 'ACC';
            const recTypeId = newRecord.getValue({ fieldId: 'rectype' });

            log.debug('recTypeId', recTypeId);

            // Search for Unique Reference Number setup
            const searchResults = search.create({
                type: 'customrecord_hris_unique_reference_numbe',
                filters: [
                    ['custrecord_hris_record_type', 'anyof', recTypeId],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'custrecord_hris_record_type',
                    'custrecord_hris_unique_number'
                ]
            }).run().getRange({ start: 0, end: 1 });

            if (!searchResults || searchResults.length === 0) {
                log.debug('No Unique Reference setup found', `recTypeId: ${recTypeId}`);
                return;
            }

            const uniqueRefRecord = searchResults[0];
            const uniqueRefId = uniqueRefRecord.id;
            const nextUniqueNum = parseInt(uniqueRefRecord.getValue('custrecord_hris_unique_number') || 0) + 1;

            const currentYear = new Date().getFullYear();

            // Get Employee first name for prefix characters
            const employeeId = newRecord.getValue({ fieldId: 'custrecord_hris_accural_empid' });
            let empChars = '';

            if (employeeId) {
                const empLookup = search.lookupFields({
                    type: 'employee',
                    id: employeeId,
                    columns: ['firstname']
                });

                let firstName = empLookup.firstname || '';

                if (firstName) {
                    // Remove leading numbers if any
                    const nameParts = firstName.split(' ');
                    if (!isNaN(nameParts[0])) {
                        nameParts.shift();
                    }
                    firstName = nameParts.join(' ').toUpperCase();
                    empChars = firstName.substring(0, 2);
                }
            }

            // Generate Auto Number: ACC-<Number>-<Year>
            const autoNumber = `${autoPrefix}-${nextUniqueNum}-${currentYear}`;

            log.debug('Generated Auto Number', autoNumber);

            // Update the current record with the generated name
            record.submitFields({
                type: recordType,
                id: recordId,
                values: {
                    name: autoNumber
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            // Increment the unique number counter
            record.submitFields({
                type: 'customrecord_hris_unique_reference_numbe',
                id: uniqueRefId,
                values: {
                    custrecord_hris_unique_number: nextUniqueNum
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            log.audit('Auto Number Generated Successfully', {
                recordId: recordId,
                autoNumber: autoNumber,
                nextUniqueNum: nextUniqueNum
            });

        } catch (e) {
            log.error('Error in afterSubmit - Auto Number Generation', {
                message: e.message,
                stack: e.stack
            });
        }
    };

    return {
        afterSubmit
    };
});