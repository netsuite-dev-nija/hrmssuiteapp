/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/task'], function(task) {
    function afterSubmit(context) {
        var employeeId = context.newRecord.id;
        log.debug('employeeId', employeeId);

        
        var scheduledScriptTask = task.create({
            taskType: task.TaskType.SCHEDULED_SCRIPT,
            scriptId: 'customscript_hris_post_empdocu_sch',
            deploymentId: 'customdeploy_hris_post_empdocu_sch',
            params: {
                custscript_employee_id: employeeId
            }
        });
        var taskId = scheduledScriptTask.submit();
        log.debug('Scheduled Script Task ID', taskId);
    }

    return {
        afterSubmit: afterSubmit
    };
});
