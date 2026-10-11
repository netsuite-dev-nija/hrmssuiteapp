/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define([
    'N/ui/serverWidget', 
    'N/url', 
    'N/redirect', 
    'N/log',
  'N/runtime',
  'N/search',
  'N/query'
], function(serverWidget, url, redirect, log,runtime,search,query) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var form = serverWidget.createForm({
                title: 'Salary JV Report'
            });

            form.clientScriptModulePath = './hris_subautopopulate_2.0_cs.js';

            var currentUser = runtime.getCurrentUser();
        var userRoleId = currentUser.role;

        // --- 1. Subsidiary Field ---
            var subsidiary = form.addField({
                id: 'custpage_subsidiary',
                type: serverWidget.FieldType.SELECT,
                label: 'Subsidiary'
            });
            subsidiary.isMandatory = true;
            subsidiary.addSelectOption({ value: '', text: '--Select Subsidiary--' });

            // CORRECTED: SuiteScript 2.x Search logic for Subsidiaries
            var roleSearchObj = search.create({
                type: 'role',
                filters: [['internalid', 'anyof', userRoleId]],
                columns: ['subsidiaries']
            });

            roleSearchObj.run().each(function(result) {
                var id = result.getValue({ name: 'subsidiaries' });
                var txt = result.getText({ name: 'subsidiaries' });
                if (id) {
                    subsidiary.addSelectOption({ value: id, text: txt });
                }
                return true;
            });

            // --- 2. Paygroup Field ---
            var paygroup = form.addField({
                id: 'custpage_paygroup',
                type: serverWidget.FieldType.SELECT,
                label: 'Paygroup'
            });
            paygroup.isMandatory = true;
            paygroup.addSelectOption({ value: '', text: '--Select Subsidiary First--' });

            var department = form.addField({
                id: 'department',
                type: serverWidget.FieldType.SELECT,
                label: 'Department',
                source: 'customrecord_cseg_hris_empdept'
            });
            department.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            var processType = form.addField({
                id: 'customlist_hris_process_type_list',
                type: serverWidget.FieldType.SELECT,
                label: 'Process Type',
                source: 'customlist_hris_process_type_list'
            });
            processType.isMandatory = true;

            var month = form.addField({
                id: 'month',
                type: serverWidget.FieldType.SELECT,
                label: 'Month',
                source: 'customlist_hris_month_list'
            });
            month.isMandatory = true;

            var year = form.addField({
                id: 'year',
                type: serverWidget.FieldType.SELECT,
                label: 'Year',
                source: 'customlist_hris_year_master'
            });
            year.isMandatory = true;

            var empName = form.addField({
                id: 'custpage_employee',
                type: serverWidget.FieldType.SELECT,
                label: 'Employee',
                source: 'employee'
            });

            var empNameTxt = form.addField({
                id: 'custpage_employee_txt',
                type: serverWidget.FieldType.TEXT,
                label: 'Employee'
            });
            empNameTxt.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            form.addSubmitButton({
                label: 'Show JV Report'
            });

            context.response.writePage(form);
        } else if (context.request.method === 'POST') {
            var params = {
                paygroup: context.request.parameters.custpage_paygroup,
                department: context.request.parameters.department,
                month: context.request.parameters.month,
                year: context.request.parameters.year,
                custpage_employee: context.request.parameters.custpage_employee,
                custpage_employee_txt: context.request.parameters.custpage_employee_txt,
                subsidiary: context.request.parameters.custpage_subsidiary,
                customlist_hris_process_type_list: context.request.parameters.customlist_hris_process_type_list
            };

            log.debug('POST Params', params);

            redirect.toSuitelet({
                scriptId: 'customscript_hris_salaryjv_design_2_sl',
                deploymentId: 'customdeploy_hris_salaryjv_design_2_sl',
                parameters: params
            });
        }
    }

    return {
        onRequest: onRequest
    };
});
