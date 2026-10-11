/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/log', 'N/task', 'N/record'], function (log, task, record) {
   function beforeLoad(context) {
        try {
            // Only show button in VIEW mode for Employee records
            if (context.type !== context.UserEventType.VIEW) {
                return;
            }

            var currentRecord = context.newRecord;
            var accessToMobile = currentRecord.getValue({ fieldId: 'custentity_hris_emp_accesstomobile' });

            log.debug("Employee Id", currentRecord.id);
            log.debug("Access to Mobile", accessToMobile);

            // Show ESS Mobile Password button only if accessToMobile is true
           if (accessToMobile === true || accessToMobile === 'T') {
                var form = context.form;
                
                // Set client script module path (relative path to Client Script file)
                form.clientScriptModulePath = './winstar mobile password updation cs.js';  // Path to your Client Script file
                
                // Add button that calls client script function directly
                form.addButton({
                    id: 'custpage_ess_mobile_password',
                    label: 'Mobile change Password',
                    functionName: 'openMobilePasswordSuitelet(' + currentRecord.id + ')'
                });
                
                log.debug("Client Script Loaded", "./winstar mobile password updation cs.js");
                log.debug("Button Added", "ESS Mobile Password");
            }
        } catch (error) {
            log.error('beforeLoad Error', error.toString());
        }
    }

    function afterSubmit(context) {
        if (context.type === context.UserEventType.EDIT || context.type === context.UserEventType.CREATE) {
            var currentRecord = context.newRecord;
            var currentRecordId = currentRecord.id;
            var accessToMobile = currentRecord.getValue({ fieldId: 'custentity_hris_emp_accesstomobile' });

            log.debug("Employee Id", currentRecordId);
            log.debug("Access to Mobile", accessToMobile);

            if (accessToMobile === true) {
                var scheduledScriptId = 'customscript_hris_post_emp_details_sch';
                var isJobInProgress = checkIfJobInProgress(scheduledScriptId);

                if (!isJobInProgress) {
                    var scriptTask = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: scheduledScriptId,
                        //deploymentId: 'customdeploy_hris_post_emp_details_sch',
                        params: {
                            custscript_hris_empid: currentRecordId,
                            custscript_hris_type: context.type,
                            custscript_hris_method: 'POST'
                        }
                    });

                    var scriptTaskId = scriptTask.submit();
                    log.debug("Script Task ID", scriptTaskId);
                } else {
                    log.debug("Job already in progress", "Cannot submit new job while another is still running.");
                }
            } else {
                log.debug("Script not scheduled", "Access to mobile is not enabled.");
            }
        }
    }

    function checkIfJobInProgress(scriptId) {
        // Implement logic to check if the script with scriptId is currently running.
        // You can use a saved search or a custom record to track the running status of scripts.
        return false; // Replace with actual logic to check job status
    }

    return {
        afterSubmit: afterSubmit,
      beforeLoad:beforeLoad
    };
});
