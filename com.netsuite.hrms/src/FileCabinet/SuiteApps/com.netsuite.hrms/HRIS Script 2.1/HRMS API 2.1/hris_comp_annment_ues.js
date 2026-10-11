/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/task', 'N/log', 'N/record'], function (task, log, record) {
    function afterSubmit(context) {
        var newRecord = context.newRecord;
        var recordType = newRecord.type; // customrecord_njt_company_announcements
        var internalId = newRecord.id;
        var eventType = context.type;

        // Trigger only on create or edit
        if (eventType !== context.UserEventType.CREATE && eventType !== context.UserEventType.EDIT) {
            return;
        }

        try {
            // Optional: Check if the announcement is active or meets other conditions
            // var isActive = newRecord.getValue({ fieldId: 'custrecord_hris_comp_annou_is_active' });
            // if (isActive !== 'T') {
            //     log.debug('Skipping Schedule', 'Announcement ID ' + internalId + ' is not active (is_active: ' + isActive + ')');
            //     return;
            // }

            // Schedule the Scheduled Script
            var taskObj = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_hris_comp_announcement_sch', // Replace with your Scheduled Script ID
                deploymentId: 'customdeploy_hris_comp_announcement_sch', // Replace with your Deployment ID
                params: {
                    custscript_announcement_id: internalId
                }
            });

            var taskId = taskObj.submit();
            log.debug('Scheduled Script Triggered', 'Task ID: ' + taskId + ' for Announcement ID: ' + internalId);
        } catch (e) {
            log.error('Error Scheduling Script', 'Announcement ID: ' + internalId + ', Error: ' + e.message);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});