/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/log', 'N/task', 'N/record','N/search'], function (log, task, record,search) {

    function afterSubmit(context) {
        try {
            // Only trigger on CREATE or EDIT
            if (context.type !== context.UserEventType.EDIT && context.type !== context.UserEventType.CREATE) {
                return;
            }

            // Load the NEW record (custom record that was just saved)
            var currentRecord = context.newRecord;
            var currentRecordId = currentRecord.id;

            log.debug("Current Record ID", currentRecordId);

            // **CORRECT WAY**: Load record to get field values safely
            var loadedRecord = record.load({
                type: currentRecord.type,
                id: currentRecordId,
                isDynamic: false
            });

            // Get Employee ID from custom record field
            var empId = loadedRecord.getValue({
                fieldId: 'custrecord_hris_mobile_pass_employee'
            });

            // Get Mobile Access field from custom record
            var accessToMobile = loadedRecord.getValue({
                fieldId: 'custrecord_hris_mobile_password_access'
            });

            log.debug("Employee ID (from field)", empId);
            log.debug("Access to Mobile", accessToMobile);

            // Only proceed if access is enabled AND employee ID exists
            if (accessToMobile === true && empId) {
                
                // Get additional mobile fields when access is true
                var mobileUserName = loadedRecord.getValue({
                    fieldId: 'custrecord_hris_mobile_user_name'
                });
                
                var mobilePassword = loadedRecord.getValue({
                    fieldId: 'custrecord_hris_mobile_password'
                });
                
                var mobileEmailUpdate = loadedRecord.getValue({
                    fieldId: 'custrecord_hris_mobile_email_update'
                });

                log.debug("Mobile Credentials", {
                    userName: mobileUserName,
                    emailUpdate: mobileEmailUpdate,
                    password: mobilePassword ? '***MASKED***' : null
                });

                // **REMOVED**: No longer setting asset status fields or JSON data

                // Check if job already running (simple implementation)
                var scheduledScriptId = 'customscript_hris_post_emp_details_sch';
                var isJobInProgress = checkIfJobInProgress(scheduledScriptId);

                if (!isJobInProgress) {
                    // **SUBMIT SCHEDULED SCRIPT with correct parameters**
                    var scriptTask = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: scheduledScriptId,
                        //deploymentId: 'customdeploy_hris_post_emp_details_sch',
                        params: {
                            /* custscript_hris_mobile_process_id: currentRecordId,
                            custscript_hris_type: context.type,
                            custscript_hris_method: 'POST' */
                          custscript_hris_empid: empId,
                            custscript_hris_type: context.type,
                            custscript_hris_method: 'POST',
                            custscript_hris_mobile_username: mobileUserName,
                            custscript_hris_mobile_email: mobileEmailUpdate

                        }
                    });

                    var scriptTaskId = scriptTask.submit();
                    log.debug("Scheduled Script Task Submitted", {
                        taskId: scriptTaskId,
                        empId: empId,
                        deploymentId: 'customdeploy_hris_post_emp_details_sch'
                    });
                } else {
                    log.audit("Job Already In Progress", "Script deployment is busy. Task skipped for empId: " + empId);
                }
            } else {
                log.debug("Script Skipped", {
                    accessToMobile: accessToMobile,
                    empId: empId || 'No employee ID'
                });
            }

        } catch (error) {
            log.error("UserEventScript Error", {
                message: error.message,
                stack: error.stack || 'No stack trace'
            });
        }
    }

    /**
     * Check if scheduled script deployment is currently running
     * Simple implementation using script execution status search
     */
    function checkIfJobInProgress(scriptDeploymentId) {
        try {
            // Search for recent executions of this deployment that are still running
            var scriptStatusSearch = search.create({
                type: search.Type.SCRIPT_EXECUTION,
                filters: [
                    ['scriptdeployment.internalid', 'is', scriptDeploymentId],
                    'AND',
                    ['status', 'anyof', 
                        'Processing',
                        'Pending',
                        'Retry'
                    ],
                    'AND',
                    ['datecreated', 'within', 'day']
                ],
                columns: ['internalid', 'status', 'datecreated']
            });

            var runningJobs = scriptStatusSearch.run().getRange({ start: 0, end: 10 });
            
            // If any jobs are still running/pending, return true
            return runningJobs && runningJobs.length > 0;

        } catch (e) {
            log.error("checkIfJobInProgress error", e);
            return false;
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
