/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/task', 'N/log', 'N/format', 'N/redirect'], 
function(serverWidget, task, log, format, redirect) {
    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} context
     * @Since 2015.2
     */
    function onRequest(context) {
        if (context.request.method === 'GET') {
            // Create the form
            var form = serverWidget.createForm({
                title: 'Bio Attendance Data Import'
            });
            // Add fields
            form.addField({
                id: 'custpage_from_date',
                type: serverWidget.FieldType.DATE,
                label: 'From Date'
            }).isMandatory = true;
            form.addField({
                id: 'custpage_to_date',
                type: serverWidget.FieldType.DATE,
                label: 'To Date'
            }).isMandatory = true;
            form.addField({
                id: 'custpage_emp_code',
                type: serverWidget.FieldType.TEXT,
                label: 'Employee Code'
            });
            // Add client script
            //form.clientScriptModulePath = './BioAttendanceClientScript.js';
            // Add submit button
            form.addSubmitButton({
                label: 'Submit'
            });
            // Write the form to the response
            context.response.writePage(form);
        } else if (context.request.method === 'POST') {
            try {
                // Retrieve form data
                var fromDate = context.request.parameters.custpage_from_date;
                var toDate = context.request.parameters.custpage_to_date;
                var empCode = context.request.parameters.custpage_emp_code || '';
                // Validate dates
                if (!fromDate || !toDate) {
                    throw new Error('From Date and To Date are required.');
                }
                // Schedule the Map/Reduce script
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_hris_manual_bio_int_mr',
                    deploymentId: 'customdeploy_hris_manual_bio_int_mr',
                    params: {
                        'custscript_from_date_': fromDate,
                        'custscript_to_date_': toDate,
                        'custscript_emp_code_': empCode
                    }
                });
                var taskId = mrTask.submit();
                log.debug('Map/Reduce Task Submitted', 'Task ID: ' + taskId);
                // Redirect to the target Suitelet
                redirect.toSuitelet({
                    scriptId: 'customscript_hris_bio_int_manual_sl',
                    deploymentId: 'customdeploy_hris_bio_int_manual_sl',
                    parameters: {
                        'custparam_taskid': taskId
                    }
                });
            } catch (e) {
                log.error('Error in Suitelet POST', JSON.stringify(e));
                context.response.write({
                    output: 'Error: ' + e.message
                });
            }
        }
    }
    return {
        onRequest: onRequest
    };
});