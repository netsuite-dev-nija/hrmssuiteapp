/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/task'], function(task) {
    function afterSubmit(context) {
        
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var EmpgrievanceId = context.newRecord.id;
            log.debug('employeeId', EmpgrievanceId);

            var scheduledScriptTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_hris_empgriev_ne_mo_sch',
                deploymentId: 'customdeploy_hris_empgriev_ne_mo_sch',
                params: {
                    custscript_empGreivance_id: EmpgrievanceId
                }
            });
            var taskId = scheduledScriptTask.submit();
            log.debug('Scheduled Script Task ID', taskId);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
