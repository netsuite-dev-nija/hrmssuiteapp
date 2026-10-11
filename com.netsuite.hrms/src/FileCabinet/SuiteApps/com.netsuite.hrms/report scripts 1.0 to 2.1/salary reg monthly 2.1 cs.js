/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/search'], (search) => {

    /**
     * Function to be triggered on field change
     * 
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record instance
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name changed
     * @param {number} scriptContext.line - Line number
     */
    const fieldChanged = (scriptContext) => {
        const currentRecord = scriptContext.currentRecord;
        const fieldId = scriptContext.fieldId;

        if (fieldId === 'custpage_subsidiary') {
            const subsidiaryId = currentRecord.getValue({ fieldId: 'custpage_subsidiary' });
            
            const paygroupField = currentRecord.getField({ fieldId: 'custpage_paygroup' });

            // 1. Clear the Paygroup dropdown
            if (paygroupField) {
                paygroupField.removeSelectOption({ value: null });
                paygroupField.insertSelectOption({
                    value: '',
                    text: '-- Select Paygroup --',
                    isSelected: true
                });
            }

            // 2. Only search if a Subsidiary is actually selected
            if (subsidiaryId) {
                try {
                    const processGroupSearch = search.create({
                        type: 'customrecord_hris_process_groupmaster',
                        filters: [
                            ['custrecord_hris__subsidiary', 'anyof', subsidiaryId],
                            'AND',
                            ['isinactive', 'is', 'false']
                        ],
                        columns: ['name']
                    });

                    processGroupSearch.run().each((result) => {
                        paygroupField.insertSelectOption({
                            value: result.id,
                            text: result.getValue({ name: 'name' }),
                            isSelected: false
                        });
                        return true;
                    });
                } catch (e) {
                    console.error('Error filtering paygroups', e);
                }
            }
        }
    };

    return {
        fieldChanged: fieldChanged
    };
});