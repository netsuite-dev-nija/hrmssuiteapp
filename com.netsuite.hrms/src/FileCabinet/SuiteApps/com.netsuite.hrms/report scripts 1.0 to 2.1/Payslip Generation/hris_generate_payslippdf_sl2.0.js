/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/record', 'N/ui/serverWidget', 'N/task', 'N/url', 'N/log'], function(record, serverWidget, task, url, log) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            try {
                var requestParams = context.request.parameters;

                // Extract parameters
                var empPaygrp = requestParams.custscript_apm_payslip_print;
                var empTCount = requestParams.custscript_apm_checked_emp;
                var employeeList = requestParams.custscript_apm_emp_name;
                var empWageMonth = requestParams.custscript_apm_wage_mth;
                var yearVal = requestParams.custscript_apm_year;
                var Subsidiary=requestParams.custscript_subsi_value;
                var processtype = requestParams.custscript_processtype;
                var payslipcheck =requestParams.custscript_hris_payslipmailcheck
                log.emergency('processtype',processtype)
                // Start Map/Reduce script
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_hr21_mr_generate_payslip',  // Replace with your MR script ID
                    deploymentId: 'customdeploy_hr21_mr_generate_payslip', // Replace with your deployment ID
                    params: {
                        custscript_a21_payslip_printb: empPaygrp,
                        custscript_a21_checked_empb: empTCount,
                        custscript_a21_emp_nameb: employeeList,
                        custscript_a21_wage_mthb: empWageMonth,
                        custscript_a21_yearb: yearVal,
                        custscript_sub21_valueb:Subsidiary,
                        custscript_hr21_payslip_processtypeb:processtype,
                        custscript_hr21_payslipmailcheckb:payslipcheck
                    }
                });
                log.debug("mrTask",mrTask);
                var taskId = mrTask.submit();
                log.debug('MR Task Started', 'Task ID: ' + taskId);

                // Redirect to status-checking Suitelet
                // var redirectUrl = url.resolveScript({
                //     scriptId: 'customscript_hris_payslip_status_sl',
                //     deploymentId: 'customdeploy_hris_payslip_status_sl',
                //     params: { taskId: taskId }
                // });

                // context.response.write('<script>window.location.href="' + redirectUrl + '";</script>');

            } catch (error) {
                log.error('Error Starting MR', error);
                context.response.write('Error: ' + error.message);
            }
        }
    }

    return { onRequest: onRequest };

});
