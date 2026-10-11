/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/record', 'N/ui/serverWidget', 'N/task', 'N/url', 'N/log',"N/redirect",], function(record, serverWidget, task, url, log,redirect) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            try {
                // var form = serverWidget.createForm({
                //     title: "Redirect",
                //     });
                var requestParams = context.request.parameters;

                // Extract parameters
                var empPaygrp = requestParams.custscript_apm_payslip_printA;
                var empTCount = requestParams.custscript_apm_checked_empA;
                var employeeList = requestParams.custscript_apm_emp_nameA;
                var empWageMonth = requestParams.custscript_apm_wage_mthA;
                var yearVal = requestParams.custscript_apm_yearA;
                var Subsidiary=requestParams.custscript_subsi_valueA;

                // Start Map/Reduce script
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_hr21_mr_gen_payslip_email',  // Replace with your MR script ID
                    deploymentId: 'customdeploy_hr21_mr_gen_payslip_email', // Replace with your deployment ID
                    params: {
                        custscript_a21_payslip_printa: empPaygrp,
                        custscript_a21_checked_empa: empTCount,
                        custscript_a21_emp_namea: employeeList,
                        custscript_a21_wage_mtha: empWageMonth,
                        custscript_a21_yeara: yearVal,
                        custscript_sub21_valuea:Subsidiary
                    }
                });

                var taskId = mrTask.submit();
                log.debug('MR Task Started', 'Task ID: ' + taskId);

                // redirect.toSuitelet({
                //     scriptId: "customscript_hris_payslip_sec_sl_secvers",
                //     deploymentId: "customdeploy_hris_payslip_sec_sl_secvers",

                //   });
                  var params = {
                    custscript_payslip_paygroup_sec: empPaygrp,
                    custscript_payslip_wagemonth_sec: empWageMonth,
                   
                
                    custscript_payslip_emp_count_sec: empTCount,
                    custscript_payslip_year_sec: 3,
                    custscript_apm_process_type: 1,
                    subsidiary: 15,
                    custscript_payslip_wagemonth_sec:1,
                    
                };
    
                redirect.toSuitelet({
                    scriptId: 'customscript_hr21_payslip_sec_sl_secvers',
                    deploymentId: 'customdeploy_hr21_payslip_sec_sl_secvers',
                    parameters: params
                });
                // context.response.writePage(form);


            } catch (error) {
                log.error('Error Starting MR', error);
                context.response.write('Error: ' + error.message);
            }
        }
    }

    return { onRequest: onRequest };

});
