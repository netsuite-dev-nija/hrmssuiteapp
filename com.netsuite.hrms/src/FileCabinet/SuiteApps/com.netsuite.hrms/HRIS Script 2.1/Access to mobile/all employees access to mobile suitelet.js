/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * 
 * Description: Part 1 - Filter screen for Bulk Mobile Access.
 */
define(['N/ui/serverWidget', 'N/redirect'], (serverWidget, redirect) => {

    const onRequest = (context) => {
        // We only need the GET method for the filter screen
        if (context.request.method === 'GET') {
            const form = serverWidget.createForm({ title: 'Mobile Access Management' });

            // Create a field group to organize the layout
            form.addFieldGroup({ id: 'grp_filters', label: 'Primary Filters' });

            // Subsidiary Filter
            const subField = form.addField({
                id: 'custpage_sub_filter',
                type: serverWidget.FieldType.SELECT,
                label: 'Select Subsidiary',
                source: 'subsidiary', // Links directly to NetSuite subsidiaries
                container: 'grp_filters'
            });
            subField.isMandatory = true;

            // Status Filter (Enabled or Disabled)
            const statusField = form.addField({
                id: 'custpage_status_filter',
                type: serverWidget.FieldType.SELECT,
                label: 'Current Mobile Access Status',
                container: 'grp_filters'
            });
            statusField.addSelectOption({ value: 'F', text: 'Disabled' });
            statusField.addSelectOption({ value: 'T', text: 'Enabled' });

            // Submit button to send data to the second Suitelet
            form.addSubmitButton({ label: 'View Employee List' });

            context.response.writePage(form);
        } else {
            // POST: Capture filter values and redirect to the Processor Suitelet
            const subsidiary = context.request.parameters.custpage_sub_filter;
            const status = context.request.parameters.custpage_status_filter;

            // Redirect to the second Suitelet (Processor). 
            // Replace 'customscript_bulk_mobile_processor' with the actual ID of your second script.
            redirect.toSuitelet({
                scriptId: 'customscript_hris_all_emp_dis_pass_post',
                deploymentId: 'customdeploy_hris_all_emp_dis_pass_post',
                parameters: {
                    'subid': subsidiary,
                    'status': status
                }
            });
        }
    };

    return { onRequest };
});