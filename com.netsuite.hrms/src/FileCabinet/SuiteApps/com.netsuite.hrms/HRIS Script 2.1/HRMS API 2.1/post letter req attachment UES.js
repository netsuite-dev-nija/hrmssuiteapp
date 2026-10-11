/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/runtime', 'N/task', 'N/log'],
    function(record, runtime, task, log) {

        function afterSubmit(context) {
            if (context.type !== context.UserEventType.EDIT) return;

            var rec = context.newRecord;
            var isAttachmentRequired = rec.getValue('custrecord_hris_letreq_click_here_to_att');
            var attachmentId = rec.getValue('custrecord_hris_letter_upload');
            var apporvalstatus=rec.getValue('custrecord_hris_letter_approval_status');

            // Check if both conditions are met
            if (isAttachmentRequired && attachmentId && apporvalstatus ==2) {
                var internalId = rec.id;
                log.debug("internalId",internalId);

                try {
                    // Create a Scheduled Script task
                    var scriptTask = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: 'customscript_hris_post_letter_req_attach', 
                        deploymentId: 'customdeploy_hris_post_letter_req_attach', 
                        params: {
                            custscript_letter_req_internalid: internalId,
                            custscript_letter_attachment_id: attachmentId
                        }
                    });

                    // Submit the task
                    var taskId = scriptTask.submit();
                    log.debug("Scheduled Script Task Submitted", "Task ID: " + taskId);

                } catch (e) {
                    log.error("Error triggering Scheduled Script", e);
                }
            }
        }

        return {
            afterSubmit: afterSubmit
        };
    });
