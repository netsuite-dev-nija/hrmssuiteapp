/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(["N/ui/serverWidget", "N/search", "N/log", "N/redirect", "N/format", "N/runtime", "N/url"],
    function (serverWidget, search, log, redirect, format, runtime, url) {
        /**
         * The main function that handles both GET and POST requests.
         * @param {Object} context - The context of the request.
         */
        function onRequest(context) {
            // --- This block runs when the page is first loaded ---
            if (context.request.method === "GET") {
                // Create the form object for the user interface.
                var form = serverWidget.createForm({
                    title: "Monthly Attendance Process",
                });
                // Add the "Month" dropdown field to the form.
                var monthField = form.addField({
                    id: "custpage_month",
                    type: serverWidget.FieldType.SELECT,
                    label: "Month",
                    source: "customlist_hris_month_list",
                });
                monthField.isMandatory = true; // Make this field required.
                // Add the "Year" dropdown field sourced from your custom list.
                var yearField = form.addField({
                    id: "custpage_year",
                    type: serverWidget.FieldType.SELECT,
                    label: "Year",
                    source: "customlist_hris_year_master",
                });
                yearField.isMandatory = true; // Make this field required.
                // Add the "Subsidiary" dropdown field to the form.
                var subsidiaryfield = form.addField({
                    id: "custpage_subsi",
                    type: serverWidget.FieldType.SELECT,
                    label: "Subsidiary",
                     source: "subsidiary",
                });
                subsidiaryfield.isMandatory = true; // Make this field required.
                // Add the "Employee Code" dropdown field.
                var empcode = form.addField({
                    id: "custpage_empcode",
                    type: serverWidget.FieldType.SELECT,
                    label: "Employee Code"
                });
                // Add employee category
                var empcatfield = form.addField({
                    id: "custpage_empcat",
                    type: serverWidget.FieldType.SELECT,
                    label: "Employee category",
                    source: "customrecord_hris_employeecategory",
                });
                // Link the client script to the form for dynamic behavior if needed.
                //form.clientScriptModulePath = "./monthlt attendance process cl.js";
                // Add the "Submit" button to the form.
                form.addSubmitButton({
                    label: "Submit",
                });
                // Display the form to the user.
                context.response.writePage(form);
            // --- This block runs when the user clicks the "Submit" button ---
            } else if (context.request.method === "POST") {
                // Get the values the user selected from the form.
                var monthParam = context.request.parameters.custpage_month;
                var yearIdParam = context.request.parameters.custpage_year;
                var subsidiaryParam = context.request.parameters.custpage_subsi;
                var empcodeParam = context.request.parameters.custpage_empcode;
                var empcatfield = context.request.parameters.custpage_empcat;
                log.debug("User Selections", "Month: " + monthParam + ", Year ID: " + yearIdParam + ", Subsidiary: " + subsidiaryParam + ", Employee Code: " + empcodeParam + ", Employee Category: " + empcatfield);
                
                // Directly redirect to the processing Suitelet with all the selected parameters.
                log.debug('Redirecting', 'No validation check. Directly redirecting to the next Suitelet.');
                redirect.toSuitelet({
                    scriptId: 'customscript_njt_monthlytopaypostsl',
                    deploymentId: 'customdeploy_njt_monthlytopaypostsl',
                    parameters: {
                        custparam_month: monthParam,
                        custparam_year: yearIdParam,
                        custparam_empcode: empcodeParam,
                        custparam_subsi: subsidiaryParam,
                        custparam_empcat: empcatfield
                    },
                });
            }
        }
        // Expose the onRequest function to be executed by the NetSuite platform.
        return {
            onRequest: onRequest,
        };
    });