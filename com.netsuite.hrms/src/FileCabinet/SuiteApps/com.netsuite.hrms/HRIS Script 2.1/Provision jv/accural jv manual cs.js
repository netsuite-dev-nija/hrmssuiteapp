/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([], function() {

    function pageInit(context) {
        // No initialization needed, waiting for field change
    }

    function fieldChanged(context) {
        var rec = context.currentRecord;
        var fieldId = context.fieldId;

        if (fieldId === 'custpage_subsidiary') {
            var selectedSubId = rec.getValue('custpage_subsidiary');
            var payGroupField = rec.getField({ fieldId: 'custpage_paygroup' });
            
            // 1. Clear existing options
            payGroupField.removeSelectOption({ value: null }); // Removes all options

            // 2. Add Default empty option
            payGroupField.insertSelectOption({
                value: '',
                text: ''
            });

            if (selectedSubId) {
                // 3. Retrieve JSON data from hidden field
                var jsonString = rec.getValue('custpage_paygroup_json');
                if (jsonString) {
                    var allPayGroups = JSON.parse(jsonString);

                    // 4. Filter and Add Options
                    for (var i = 0; i < allPayGroups.length; i++) {
                        // Loose equality check (==) covers string vs number ID differences
                        if (allPayGroups[i].subsidiary == selectedSubId) {
                            payGroupField.insertSelectOption({
                                value: allPayGroups[i].id,
                                text: allPayGroups[i].name
                            });
                        }
                    }
                }
            }
        }
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    };
});