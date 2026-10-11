/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/runtime', 'N/task', 'N/log'],
    function(record, runtime, task, log) {

        function afterSubmit(context) {
            // Only execute on Edit (or Create if needed, you can add context.UserEventType.CREATE)
            if (context.type !== context.UserEventType.EDIT) return;

            var rec = context.newRecord;
            var internalId = rec.id;
            log.debug("internalId", internalId);

            try {
                // Create a Scheduled Script task
                var scriptTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: 'customscript_hris_post_asset_request', // Ensure this matches your Script ID in NetSuite
                    deploymentId: 'customdeploy_hris_post_asset_request', // Ensure this matches your Deployment ID in NetSuite
                    params: {
                        'custscript_asset_request_internalid': internalId // Parameter Key
                    }
                });

                // Submit the task
                var taskId = scriptTask.submit();
                log.debug("Scheduled Script Task Submitted", "Task ID: " + taskId);

            } catch (e) {
                log.error("Error triggering Scheduled Script", e);
            }
        }

        return {
            afterSubmit: afterSubmit
        };
    });