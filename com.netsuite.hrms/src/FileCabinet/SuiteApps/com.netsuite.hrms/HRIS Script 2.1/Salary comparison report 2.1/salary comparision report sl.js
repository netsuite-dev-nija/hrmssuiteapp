/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @description Input form to select an employee for the Salary Comparison Report.
 */
define(['N/ui/serverWidget', 'N/url'], (serverWidget, url) => {
    const onRequest = (scriptContext) => {
        if (scriptContext.request.method === 'GET') {
            const form = serverWidget.createForm({ title: 'Salary Comparison Report - Selection' });
            
            // Add a field to select the Employee Compensation record
            const empField = form.addField({
                id: 'custpage_employee_comp',
                type: serverWidget.FieldType.SELECT,
                label: 'Select Employee Compensation Record',
                source: 'customrecord_hris_employee_compensation' // Source from your child record
            });
            empField.isMandatory = true;

            form.addSubmitButton({ label: 'Generate Report' });

            scriptContext.response.writePage(form);
        } else {
            // Redirect to the Report Suitelet with the selected ID
            const empCompId = scriptContext.request.parameters.custpage_employee_comp;
            
            // Note: Replace 'customscript_salary_rpt_generator' with the ID of the second script
            const outputSuiteletUrl = url.resolveScript({
                scriptId: 'customscript_salary_rpt_generator', 
                deploymentId: 'customdeploy_salary_rpt_generator',
                params: { custparam_compid: empCompId }
            });
            
            scriptContext.response.sendRedirect({ url: outputSuiteletUrl });
        }
    };

    return { onRequest };
});