/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(["N/ui/serverWidget", "N/search", "N/log", "N/task", "N/redirect", "N/record", "N/runtime", "N/format", "N/query", "N/currentRecord", "N/https", "N/url"],
    function (serverWidget, search, log, task, redirect, record, runtime, format, query, currentRecord, https, url) {
        // Define the main function for handling requests
        function onRequest(context) {
            // Create a form
            var form = serverWidget.createForm({
                title: "Visa Processing",
            });

            // Add fields to the form
            var batchField = form.addField({
                id: "custpage_batch",
                type: serverWidget.FieldType.SELECT,
                label: "Batch",
                source: "customrecord_njt_hr_recruitement_form",
            });
          //  batchField.isMandatory=true;
          batchField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
            var positionField = form.addField({
                id: "custpage_position",
                type: serverWidget.FieldType.SELECT,
                label: "Designation",
                source:'customrecord_hris_corporatetitle'
            });
          //  positionField.isMandatory =true;
            var visatype = form.addField({
                id: "custpage_visatype",
                type: serverWidget.FieldType.SELECT,
                label: "Visa Processing Type",
                source: "customrecord_hris_visa_processing",
            });
            visatype.isMandatory = true;
            var visatypesequence = form.addField({
                id: "custpage_visatypeseq",
                type: serverWidget.FieldType.TEXT,
                label: "Visa Processing Type",
                source: "customrecord_hris_visa_processing",
            });
           visatypesequence.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN,
            });
            // Add a submit button
            form.addSubmitButton({
                label: "Submit",
            });

            // Set client script module path
            form.clientScriptModulePath = "./hris_visaprocess_cs.js";

            if (context.request.method === "GET") {
                context.response.writePage(form);
            } else if (context.request.method === "POST") {


                var batch = context.request.parameters.custpage_batch;
                log.debug("inside post", batch);
                var position = context.request.parameters.custpage_position;
                log.debug("inside post", batch);
                var visatypeid =context.request.parameters.custpage_visatype;
                var visatypeseq =context.request.parameters.custpage_visatypeseq;
           
                redirect.toSuitelet({
                    scriptId: 'customscript_hris_visacheck_sl',
                    deploymentId: 'customdeploy_hris_visacheck_sl',
                    parameters: {
                     //   custscript_hris_batch: batch,
                        custscript_hris_position: position,
                        custscript_hris_visatypeid:visatypeid,
                        custscript_hris_visatypeseq:visatypeseq

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
