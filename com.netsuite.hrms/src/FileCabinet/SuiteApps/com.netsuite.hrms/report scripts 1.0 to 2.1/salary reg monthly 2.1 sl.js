/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/search', 'N/runtime', 'N/redirect'], (serverWidget, search, runtime, redirect) => {

    /**
     * Suitelet Entry Point
     * 
     * @param {Object} scriptContext
     * @param {ServerRequest} scriptContext.request
     * @param {ServerResponse} scriptContext.response
     */
    const onRequest = (scriptContext) => {
        const request = scriptContext.request;
        const response = scriptContext.response;

        if (request.method === 'GET') {
            const userObj = runtime.getCurrentUser();
            const curRole = userObj.role;

            const form = serverWidget.createForm({
                title: 'Salary Register'
            });

            // IMPORTANT: Ensure this matches the Script ID of your Client Script record
            //form.clientScriptModulePath = './salary reg monthly 2.1 cs.js';

            // Subsidiary Field
            const subsidiary = form.addField({
                id: 'custpage_subsidiary',
                type: serverWidget.FieldType.SELECT,
                label: 'Subsidiary'
            });
            subsidiary.isMandatory = true;
            subsidiary.addSelectOption({
                value: '',
                text: '-- Select Subsidiary --'
            });

            // Logic to populate subsidiaries (from your original code)
            const roleSearch = search.create({
                type: search.Type.ROLE,
                filters: [
                    ['internalid', 'anyof', curRole]
                ],
                columns: ['subsidiaries']
            });

            const roleResultSet = roleSearch.run();
            roleResultSet.each((result) => {
                const id = result.getValue('subsidiaries');
                const txt = result.getText('subsidiaries');
                if (id) {
                    subsidiary.addSelectOption({
                        value: id,
                        text: txt
                    });
                }
                return true;
            });

            // Paygroup Field - Changed ID to custpage_paygroup
            const paygroup = form.addField({
                id: 'custpage_paygroup',
                type: serverWidget.FieldType.SELECT,
                label: 'Paygroup / Working Subsidiary',
                source:'customrecord_hris_process_groupmaster'
            });
          /*   paygroup.addSelectOption({
                value: '',
                text: '-- Select Paygroup --'
            }); */
            paygroup.isMandatory = true;

            // Process Type Field
            const processType = form.addField({
                id: 'processtype',
                type: serverWidget.FieldType.SELECT,
                label: 'Process Type',
                source: 'customlist_hris_process_type_list'
            });

            // Add department field
            const department = form.addField({
                id: 'department',
                type: serverWidget.FieldType.SELECT,
                label: 'Department',
                source: 'customrecord_cseg_hris_empdept'
            });

            // Add Month field
            const month = form.addField({
                id: 'month',
                type: serverWidget.FieldType.SELECT,
                label: 'Month',
                source: 'customlist_hris_month_list'
            });
            month.isMandatory = true;

            // Add Year field
            const year = form.addField({
                id: 'year',
                type: serverWidget.FieldType.SELECT,
                label: 'Year',
                source: 'customlist_hris_year_master'
            });
            year.isMandatory = true;

            // MOL Type Field
            const molType = form.addField({
                id: 'moltype',
                type: serverWidget.FieldType.SELECT,
                label: 'VISA ALLOCATION (MOL TYPE) WPS',
                source: 'customrecord_hris_visa_type_master'
            });

            // Add Submit button 
            form.addSubmitButton({
                label: 'Submit'
            });

            response.writePage(form);

        } else if (request.method === 'POST') {
            const params = {
                'paygroup': request.parameters.custpage_paygroup,
                'department': request.parameters.department,
                'month': request.parameters.month,
                'year': request.parameters.year,
                'processtype': request.parameters.processtype,
                'subsidiary': request.parameters.custpage_subsidiary,
                'moltype': request.parameters.moltype
            };

            redirect.toSuitelet({
                scriptId: 'customscript_hris_salary_reg_new_post_de',
                deploymentId: 'customdeploy_hris_salary_reg_new_post_de',
                parameters: params
            });
        }
    };

    return {
        onRequest: onRequest
    };
});