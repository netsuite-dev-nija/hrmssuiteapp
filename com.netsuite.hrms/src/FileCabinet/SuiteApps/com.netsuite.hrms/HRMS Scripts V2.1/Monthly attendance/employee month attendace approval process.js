/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(["N/ui/serverWidget", "N/search", "N/log", "N/task", "N/redirect", "N/record", "N/runtime", "N/format", "N/query", "N/currentRecord", "N/https", "N/url"],
    function (serverWidget, searchModule, logModule, taskModule, redirectModule, recordModule, runtimeModule, formatModule, query, currentRecord, https, urlMod) {
        // Define the main function for handling requests
        function onRequest(context) {
           // Create a form
           var form = serverWidget.createForm({
            title: "Employee Monthly Approval Process",
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

        // var projectField = form.addField({
        //     id: "custpage_project",
        //     type: serverWidget.FieldType.SELECT,
        //     label: "Project",
        //     source: "customrecord_cseg_njt_seg_proj",
        // });
        // projectField.isMandatory = true; // Make the field mandatory
        
        // var projectsegField = form.addField({
        //     id: "custpage_projectseg",
        //     type: serverWidget.FieldType.SELECT,
        //     label: "Project Site",
        //     source: "customrecord_cseg_njt_seg_pros",
        // });
        // projectsegField.isMandatory = true; // Make the field mandatory
        var subsidiaryfield=form.addField({
                id: "custpage_subsi",
            type: serverWidget.FieldType.SELECT,
            label: "Subsidairy",
            source: "subsidiary",
        });
        subsidiaryfield.isMandatory = true; // Make the field mandatory
         //add employee category
           var empcatfield=form.addField({
            id: "custpage_empcat",
            type: serverWidget.FieldType.SELECT,
            label: "Employee category",
            source: "customrecord_hris_employeecategory",
        });
        
        // Add a submit button
        form.addSubmitButton({
            label: "Submit",
        });
               // Link the client script to the form
            //form.clientScriptModulePath = './monthly approval subsidiary validation cs.js'; // Adjust the path as necessary
            if (context.request.method === "GET") {
                context.response.writePage(form);
            } else if (context.request.method === "POST") {
                var monthField = context.request.parameters.custpage_month;
              logModule.debug("monthField",monthField);
              var yearField = context.request.parameters.custpage_year;
              logModule.debug("yearField",yearField);
            //   var projectField = context.request.parameters.custpage_project;
            //   logModule.debug("projectField",projectField);
            //   var projectsegField = context.request.parameters.custpage_projectseg;
            //   logModule.debug("projectsegField",projectsegField);
              var subsidiaryfield = context.request.parameters.custpage_subsi;
              logModule.debug("subsidiaryfield",subsidiaryfield);
              var empcatfield = context.request.parameters.custpage_empcat;
              logModule.debug("empcatfield",empcatfield);
                // Redirect to the second Suitelet with manager and date values as parameters
                redirectModule.toSuitelet({
                    scriptId: 'customscript_n21_emp_month_appro_post',
                    deploymentId: 'customdeploy_n21_emp_month_appro_post',
                    parameters: {
                        custparam_month: monthField,
                        custparam_year:yearField,
                        // custparam_project: projectField,
                        // custparam_projectseg: projectsegField,
                        custparam_subsi:subsidiaryfield,
                       custparam_empcat: empcatfield
                    },
                });
            }
        }

        return {
            onRequest: onRequest,
        };
    });
