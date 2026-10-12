/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(["N/ui/serverWidget", "N/search", "N/log", "N/task", "N/redirect", "N/record", "N/runtime", "N/format", "N/query", "N/currentRecord", "N/https", "N/url"],
    function (serverWidget, searchModule, logModule, taskModule, redirectModule, recordModule, runtimeModule, formatModule, query, currentRecord, https, urlMod) {
        // Define the main function for handling requests
        function onRequest(context) {
            // Create a form
            var form = serverWidget.createForm({
                title: "New Employee Onboarding Process",
            });



            var positionField = form.addField({
                id: "custpage_position",
                type: serverWidget.FieldType.SELECT,
                label: "Designation",
                source: "customrecord_hris_corporatetitle"
            });
         // positionField.isMandatory=true;
            // Add fields to the form
            var batchField = form.addField({
                id: "custpage_batch",
                type: serverWidget.FieldType.SELECT,
                label: "RRF#",
                source: "customrecord_njt_hr_recruitement_form",
            });
          
            // Add a submit button
            form.addSubmitButton({
                label: "Submit",
            });

            // Set client script module path
            form.clientScriptModulePath = "./employee visa short list cl.js";

            if (context.request.method === "GET") {
                context.response.writePage(form);
            } else if (context.request.method === "POST") {
                var position = context.request.parameters.custpage_position;
                var batch=context.request.parameters.custpage_batch;

                // Redirect to the second Suitelet with parameters
                redirectModule.toSuitelet({
                    scriptId: 'customscript_njt_employee_onboard_post_s',
                    deploymentId: 'customdeploy_njt_employee_onboard_post_s',
                    parameters: {
                        custparam_batch:batch,
                        custparam_position: position,
                    },
                });
            }
        }

        // Function to run SuiteQL query and return results
        function getResult(pSQL) {
            var queryResults = query.runSuiteQL({
                query: pSQL,
            });
            var records = queryResults.asMappedResults();
            return records;
        }

        return {
            onRequest: onRequest,
        };
    });
