/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(["N/ui/serverWidget", "N/search", "N/log", "N/task", "N/redirect", "N/record", "N/runtime", "N/format", "N/query", "N/currentRecord", "N/https", "N/url"],
    function (serverWidget, search, log, task, redirect, record, runtime, format, query, currentRecord, https, urlMod) {
        // Define the main function for handling requests
        function onRequest(context) {
           // Create a form
           var form = serverWidget.createForm({
            title: "Employee Regular Monthly attendance",
        });

        // Add fields to the form
        var monthField = form.addField({
            id: "custpage_month",
            type: serverWidget.FieldType.SELECT,
            label: "Month",
            source: "customlist_hris_month_list",
        });
          monthField.isMandatory = true;

        var yearField = form.addField({
            id: "custpage_year",
            type: serverWidget.FieldType.SELECT,
            label: "Year",
            source: "customlist_hris_year_master",
        });
          yearField.isMandatory = true;

        var paygroupField = form.addField({
            id: "custpage_paygroup",
            type: serverWidget.FieldType.SELECT,
            label: "Pay Group",
            source: "customrecord_hris_process_groupmaster",
        });
        paygroupField.isMandatory = true;

        var subsidiaryfield = form.addField({
            id: "custpage_subsi",
            type: serverWidget.FieldType.SELECT,
            label: "Subsidairy",
            source: "subsidiary",
        });
        subsidiaryfield.isMandatory = true; // Make the field mandatory
        
        var locationfield = form.addField({
            id: "custpage_location",
            type: serverWidget.FieldType.SELECT,
            label: "Location",
            source: "customrecord_cseg_hris_emploc",
        });
      
        locationfield.isMandatory = true;

        // Add a submit button
        form.addSubmitButton({
            label: "Submit",
        });

        if (context.request.method === "GET") {
            context.response.writePage(form);
        } else if (context.request.method === "POST") {
            var monthField = context.request.parameters.custpage_month;
            log.debug("monthField", monthField);
            var yearField = context.request.parameters.custpage_year;
            log.debug("yearField", yearField);
            var paygroupField = context.request.parameters.custpage_paygroup;
            log.debug("paygroupField", paygroupField);
            var locationField = context.request.parameters.custpage_location;
            log.debug("locationField", locationField);
            var subsidiaryfield = context.request.parameters.custpage_subsi;
            log.debug("subsidiaryfield", subsidiaryfield);

            // Redirect to the second Suitelet with paygroup and other filter values as parameters
            redirect.toSuitelet({
                scriptId: 'customscript_hr21_dailytomon_process_sl',
                deploymentId: 'customdeploy_hr21_dailytomon_process_sl',
                parameters: {
                    custparam_month: monthField,
                    custparam_year: yearField,
                    custparam_paygroup: paygroupField,
                    custparam_subsi: subsidiaryfield,
                    custparam_location: locationField,
                },
            });
        }
      }

      return {
          onRequest: onRequest,
      };
    });