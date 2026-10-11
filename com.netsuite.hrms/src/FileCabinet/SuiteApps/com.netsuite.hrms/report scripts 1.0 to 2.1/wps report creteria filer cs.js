/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/search'], function(search) {

    /**
     * Function to be triggered on field change
     * Ensure this function name is set in the "Field Changed Function" field on the Script Record
     */
    function fieldChanged_SalaryReg(scriptContext) {
        try {
            const currentRecord = scriptContext.currentRecord;
            const fieldName = scriptContext.fieldId;

            if (fieldName === 'custpage_subsidiary') {
                const subsidiaryId = currentRecord.getValue({
                    fieldId: 'custpage_subsidiary'
                });

                // Get the field object for the paygroup select dropdown
                const paygroupField = currentRecord.getField({
                    fieldId: 'custpage_paygroup'
                });

                // 1. Clear the Paygroup dropdown
                // Passing value: null to removeOptions clears all existing options
                paygroupField.removeSelectOption({
                    value: null
                });

                paygroupField.insertSelectOption({
                    value: '',
                    text: '-- Select Paygroup --',
                    isSelected: true
                });

                // 2. Only search if a Subsidiary is actually selected
                if (subsidiaryId) {
                    try {
                        const processGroupSearch = search.create({
                            type: 'customrecord_hris_process_groupmaster',
                            filters: [
                                search.createFilter({
                                    name: 'custrecord_hris__subsidiary',
                                    operator: search.Operator.ANYOF,
                                    values: subsidiaryId
                                }),
                                search.createFilter({
                                    name: 'isinactive',
                                    operator: search.Operator.IS,
                                    values: 'F'
                                })
                            ],
                            columns: [
                                search.createColumn({ name: 'name' })
                            ]
                        });

                        const searchResultSet = processGroupSearch.run();
                        
                        searchResultSet.each(function(result) {
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
        } catch (e) {
            console.error('Error in fieldChanged_SalaryReg', e);
        }
    }

    return {
        fieldChanged: fieldChanged_SalaryReg
    };

});