/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/ui/serverWidget'], function(serverWidget) {
    /**
     * Function executed before the record is loaded.
     * Adds a multi-select employee field and attaches a Client Script to the form.
     * @param {Object} context - The context object for the user event
     * @param {Form} context.form - The form object to which the field and script are added
     * @param {string} context.type - The event type (e.g., create, edit, view)
     */
    function beforeLoad(context) {
        try {
            // Check if the event is triggered in create or edit mode
            if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
                // Get the form object to add the custom field and script
                var form = context.form;

                // Add a multi-select field for employees to the form
                var employeeField = form.addField({
                    id: 'custpage_employee_multiselect', // Unique field ID with 'custpage_' prefix
                    type: serverWidget.FieldType.MULTISELECT, // Set field type to MULTISELECT
                    label: 'Select Employees', // Label displayed on the form
                   // source: 'employee' // Source the field from the Employee record type
                });

                // Optional: Make the field mandatory (remove if not needed)
                employeeField.isMandatory = true;

                // Attach the Client Script to the form to handle subsidiary-based filtering
                form.clientScriptModulePath = '/SuiteScripts/HRMS API/_hr_announcement_cs.js';

                // Log success for debugging
                log.debug({
                    title: 'Multi-Select Field and Client Script Added',
                    details: 'Employee multi-select field added with ID: custpage_employee_multiselect and Client Script attached'
                });
            }
        } catch (e) {
            // Log any errors that occur during execution
            log.error({
                title: 'Error in beforeLoad',
                details: e.toString()
            });
        }
    }

    // Return the beforeLoad function for execution
    return {
        beforeLoad: beforeLoad
    };
});