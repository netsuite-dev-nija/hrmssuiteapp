/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(["N/ui/serverWidget", "N/search", "N/log", "N/task", "N/redirect", "N/record", "N/runtime", "N/format", "N/query", "N/currentRecord", "N/https", "N/url"],
    function (serverWidget, searchModule, log, taskModule, redirectModule, recordModule, runtimeModule, format, query, currentRecord, https, urlMod) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var form = serverWidget.createForm({ title: 'Pay Slip' });

            var paygrpName = form.addField({
                id: 'custscript_apm_paygrp',
                type: serverWidget.FieldType.SELECT,
                label: 'Pay group',
                source: 'customrecord_hris_process_groupmaster'
            });
            paygrpName.isMandatory = true;
          
            var processType = form.addField({
                id: 'processtype',
                type: serverWidget.FieldType.SELECT,
                label: 'Process Type',
                source: 'customlist_hris_process_type_list'
            });
            processType.defaultValue = '1';
            //processType.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
        

            var subsidiary = form.addField({
                id: 'custpage_subsidiary',
                type: serverWidget.FieldType.SELECT,
                label: 'Subsidiary',
                //source:"subsidiary"
            });

            var wagePeriod = form.addField({
                id: 'custscript_apm_wage_month',
                type: serverWidget.FieldType.SELECT,
                label: 'Wage Month',
                source: 'customlist_hris_month_list'
            });
            wagePeriod.isMandatory = true;

            var yearField = form.addField({
                id: 'custscript_apm_fin_year',
                type: serverWidget.FieldType.SELECT,
                label: 'Year',
              source:'customlist_hris_year_master'
            });
            yearField.isMandatory = true;

              

           // yearField.addSelectOption({ value: '', text: '' });

            /* var statusQuery = "SELECT name,id  FROM customrecord_hris_payroll_financial_year";
            var queryResults = query.runSuiteQL({
                query: statusQuery
            });
            var records = queryResults.asMappedResults();

            if (records.length > 0) {
                for (var r = 0; r < records.length; r++) {
                    var record = records[r];
                    var name = record.name;
                    var id = record.id; // Assuming 'id' is the value you want to set

                    yearField.addSelectOption({
                        value: id,
                        text: name,
                        isSelected: false
                    });


                }
            } */

            // form.clientScriptFileId = 1432;

             form.clientScriptModulePath = './subsidiary restric payslip cs.js';
            form.addSubmitButton({ label: 'Get Data' });

            context.response.writePage(form);
        } else if (context.request.method === 'POST') {
            var wageMonthTotal = context.request.parameters.custscript_apm_wage_month;
            var paygrpName = context.request.parameters.custscript_apm_paygrp;
            var processType = context.request.parameters.processtype;
            
            log.debug("Request Parameters", {
                wageMonthTotal: wageMonthTotal,
                paygrpName: paygrpName,
                processType: processType
            });
            

            var employeeSearchQuery = 
            "SELECT id " +
            "FROM customrecord_hris_pay_process " +
            "WHERE custrecord_hris_pay_proc_pay_month IN (" + wageMonthTotal + ") " +
            "AND custrecord_hris_pay_proc_componet_sequen = 100 " +
            "AND custrecord_hris_pay_proc_pay_group = '" + paygrpName + "' " +
            "AND custrecord_hris_pay_proc_process_type = '" + processType + "'";
            
        var queryResults = query.runSuiteQL({ query: employeeSearchQuery });
        var employeeCount = queryResults.asMappedResults();
        
        
                // log.debug('Employee Count', employeeCount);
                // return employeeCount;
                // var records = queryResults.asMappedResults();
        
                if (employeeCount.length > 0) {
                    for (var r = 0; r < employeeCount.length; r++) {
                        var record = employeeCount[r];
                        var initid=record.id;
                        log.debug("initid",initid);
        
        
                    }
                }
            var params = {
                custscript_payslip_paygroup_sec: context.request.parameters.custscript_apm_paygrp,
                custscript_payslip_wagemonth_sec: context.request.parameters.custscript_apm_wage_month,
               
            
                custscript_payslip_emp_count_sec: initid,
                custscript_payslip_year_sec: context.request.parameters.custscript_apm_fin_year,
                custscript_apm_process_type: context.request.parameters.processtype,
                subsidiary: context.request.parameters.custpage_subsidiary
                
            };

            redirectModule.toSuitelet({
                scriptId: 'customscript_hr21_payslip_sec_sl_secvers',
                deploymentId: 'customdeploy_hr21_payslip_sec_sl_secvers',
                parameters: params
            });
        }
    }


    
    return { onRequest: onRequest };
});

// Let me know if you want me to refine this further or explain any section! 🚀
