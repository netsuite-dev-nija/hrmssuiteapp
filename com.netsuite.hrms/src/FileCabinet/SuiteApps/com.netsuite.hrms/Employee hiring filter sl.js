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
                title: "Hiring",
            });

            // Add fields to the form
            var position = form.addField({
                id: "custpage_position",
                type: serverWidget.FieldType.SELECT,
                label: "Designation",
                source: "customrecord_hris_corporatetitle",
            });

            // Add a submit button
            form.addSubmitButton({
                label: "Submit",
            });

            // Set client script module path
            //form.clientScriptModulePath = "SuiteScripts/Azzurro/employee visa short list cl.js";

            if (context.request.method === "GET") {
                context.response.writePage(form);
            } else if (context.request.method === "POST") {

                // Retrieve submitted parameters
                //var shortlist=context.request.parameters.custpage_shortlsit;
                var position = context.request.parameters.custpage_position;
                logModule.debug("position", position);

                // Redirect to the second Suitelet with parameters
                redirectModule.toSuitelet({
                    scriptId: 'customscript_njt_emp_hired_sts_post',
                    deploymentId: 'customdeploy_njt_emp_hired_sts_post',
                    parameters: {
                        custpage_position: position,
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
