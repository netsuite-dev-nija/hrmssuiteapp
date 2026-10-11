/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/url', 'N/currentRecord', 'N/ui/message'], function(url, currentRecord, message) {

    /**
     * Function to be executed when a field is changed.
     * This triggers the page refresh when filters are modified.
     */
    function fieldChanged(context) {
        var currRec = context.currentRecord;

        // Check if the field changed is the Subsidiary Filter or the Access Status Filter
        if (context.fieldId === 'custpage_sub_filter' || context.fieldId === 'custpage_status_filter') {
            
            var subsidiary = currRec.getValue('custpage_sub_filter');
            var status = currRec.getValue('custpage_status_filter');

            // Show a "Loading" message to the user
            var msg = message.create({
                title: 'Filtering List',
                message: 'Please wait while we fetch the employee list...',
                type: message.Type.CONFIRMATION
            });
            msg.show();

            // Use window.location to reload the current Suitelet with the new parameters
            // We append the subsidiary and status to the URL as GET parameters
            var suiteletUrl = window.location.href.split('&custpage_sub_filter')[0].split('&custpage_status_filter')[0];
            
            window.location.href = suiteletUrl + 
                '&custpage_sub_filter=' + subsidiary + 
                '&custpage_status_filter=' + status;
        }
    }

    /**
     * Validation before form submission
     */
    function saveRecord(context) {
        var currRec = context.currentRecord;
        var count = currRec.getLineCount({ group: 'custpage_emp_sublist' });
        var selectedCount = 0;

        // Count how many employees are selected
        for (var i = 0; i < count; i++) {
            var isSelected = currRec.getSublistValue({
                group: 'custpage_emp_sublist',
                name: 'custpage_select',
                line: i
            });
            if (isSelected === true || isSelected === 'T') {
                selectedCount++;
            }
        }

        if (selectedCount === 0) {
            alert('Please select at least one employee to process.');
            return false;
        }

        return confirm('Are you sure you want to process ' + selectedCount + ' employee(s)?');
    }

    return {
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
});