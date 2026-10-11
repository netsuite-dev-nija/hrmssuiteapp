/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/runtime', 'N/search', 'N/redirect', 'N/log'], 
function(serverWidget, runtime, search, redirect, log) {

    function onRequest(scriptContext) {
        try {
            const request = scriptContext.request;
            const response = scriptContext.response;

            if (request.method === 'GET') {
                const form = serverWidget.createForm({
                    title: 'WPS Report Criteria'
                });

                const curRole = runtime.getCurrentUser().role;

                // form.clientScriptModulePath = 'customscript_cli_apm_auto_populate';
                // var location = form.addField({id: 'location', type: serverWidget.FieldType.SELECT, label: 'Location', source: 'location'});
                // location.isMandatory = true;

                const mol_type = form.addField({
                    id: 'moltype',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Mol Tpye',
                    source: 'customrecord_hris_visa_type_master'
                });
                mol_type.isMandatory = true;

                // var ProcessGroup = form.addField({id: 'process_grp', type: serverWidget.FieldType.SELECT, label: 'Process Group', source: 'customrecord_hris_process_groupmaster'});
                // var ProcessGroup = form.addField({id: 'process_grp', type: serverWidget.FieldType.SELECT, label: 'Process Group'});
                // ProcessGroup.isMandatory = true;

                const processType = form.addField({
                    id: 'processtype',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Process type',
                    source: 'customlist_hris_process_type_list'
                });

                const reportType = form.addField({
                    id: 'reporttype',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Report type',
                    source: 'customlist_hris_wps_reporttype'
                });
                reportType.isMandatory = true;

                // Add Month field
                const Month = form.addField({
                    id: 'month',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Month',
                    source: 'customlist_hris_month_list'
                });
                Month.isMandatory = true;

                // Add Year field
                const Year = form.addField({
                    id: 'year',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Year',
                    source: 'customlist_hris_year_master'
                });
                Year.isMandatory = true;

                const paymenttype = form.addField({
                    id: 'paymenttype',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Payment Mode',
                    source: 'customlist_hris_emppaymentmode'
                });
                paymenttype.isMandatory = true;

                form.clientScriptModulePath = './wps report creteria filer cs.js';

                // Subsidiary Field
                const subsidiary = form.addField({
                    id: 'custpage_subsidiary',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Subsidiary'
                });
                // subsidiary.isMandatory = true;

                subsidiary.addSelectOption({
                    value: '',
                    text: '-- Select Subsidiary --'
                });

                // Logic to populate subsidiaries (from your original code)
                const roleSearch = search.create({
                    type: 'role',
                    filters: [
                        search.createFilter({
                            name: 'internalid',
                            operator: search.Operator.ANYOF,
                            values: curRole
                        })
                    ],
                    columns: [
                        search.createColumn({ name: 'subsidiaries' })
                    ]
                });

                const roleResultSet = roleSearch.run();
                roleResultSet.each(function(result) {
                    const id = result.getValue({ name: 'subsidiaries' });
                    const txt = result.getText({ name: 'subsidiaries' });
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
                    label: 'Paygroup / Working Subsidiary'
                });
                paygroup.addSelectOption({
                    value: '',
                    text: '-- Select Paygroup --'
                });
                // paygroup.isMandatory = true;

                // Add Submit button 
                form.addSubmitButton({
                    label: 'Submit'
                });

                response.writePage(form);

            } // End if(request.method === 'GET')
            else if (request.method === 'POST') {

                const params = {};
                // params['location'] = request.parameters['location']; // commented by Sumant Kumar
                params['month'] = request.parameters['month'];
                params['moltype'] = request.parameters['moltype'];
                params['year'] = request.parameters['year'];
                params['processtype'] = request.parameters['processtype'];
                params['report'] = request.parameters['reporttype'];
                params['process_grp'] = request.parameters['custpage_paygroup'];
                params['subsidiary'] = request.parameters['custpage_subsidiary'];
                params['paymenttype'] = request.parameters['paymenttype'];

                // === LOG ALL PARAMETERS ===
                log.debug({ title: '=== SIF Report Parameters ===', details: '' });
                log.debug({ title: 'month', details: params['month'] || 'NULL' });
                log.debug({ title: 'moltype', details: params['moltype'] || 'NULL' });
                log.debug({ title: 'year', details: params['year'] || 'NULL' });
                log.debug({ title: 'processtype', details: params['processtype'] || 'NULL' });
                log.debug({ title: 'report', details: params['report'] || 'NULL' });
                log.debug({ title: 'process_grp', details: request.parameters['custpage_paygroup'] || 'NULL' });
                log.debug({ title: 'subsidiary', details: request.parameters['custpage_subsidiary'] || 'NULL' });
                log.debug({ title: '=== End Parameters ===', details: '' });

                const reportTypeVal = request.parameters['reporttype'];

                if (reportTypeVal == 1) {
                    redirect.toSuitelet({
                        scriptId: 'customscript_hris_wpssalrpt_uae',
                        deploymentId: 'customdeploy_hris_wpssalrpt_uae',
                        parameters: params
                    }); // line added by Sumant Kumar===26/07/2018
                }
                else if (reportTypeVal == 2) {
                    // redirect.toSuitelet({ scriptId: 'customscript_sut_payment_approval_report', deploymentId: 'customdeploy_sut_payment_approval_report', parameters: params });
                    redirect.toSuitelet({
                        scriptId: 'customscript_hris_wps_payment_app_sl',
                        deploymentId: 'customdeploy_hris_wps_payment_app_sl',
                        parameters: params
                    });
                }
                else if (reportTypeVal == 3) {
                    redirect.toSuitelet({
                        scriptId: 'customscript_hris_wps_qutar_report_sl',
                        deploymentId: 'customdeploy_hris_wps_qutar_report_sl',
                        parameters: params
                    });
                }
                else if (reportTypeVal == 4) {
                    redirect.toSuitelet({
                        scriptId: 'customscript_hris_wpssalrpt_saudi',
                        deploymentId: 'customdeploy_hris_wpssalrpt_saudi',
                        parameters: params
                    });
                }

            } // End else if(request.method === 'POST')
        } catch (e) {
            log.debug({
                title: 'ERROR',
                details: e.message
            });
        }
    }

    return {
        onRequest: onRequest
    };

});