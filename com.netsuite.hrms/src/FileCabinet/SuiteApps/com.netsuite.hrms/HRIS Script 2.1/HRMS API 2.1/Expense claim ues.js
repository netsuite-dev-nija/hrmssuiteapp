/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/task', 'N/log'], function (task, log) {

    function afterSubmit(context) {
        try {
            var newRecord = context.newRecord;
            var recordId = newRecord.id;

            var scheduledTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_exp_claim_sch', // Replace with your Scheduled Script ID
                deploymentId: 'customdeploy_exp_claim_sch', // Replace with your Deployment ID
                params: {
                    custscript_expensereportid: recordId
                }
            });

            var taskId = scheduledTask.submit();
            log.debug("Scheduled Script Triggered", "Task ID: " + taskId + " for Record ID: " + recordId);

        } catch (e) {
            log.error("User Event Script Error", e.message);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
