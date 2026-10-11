/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
/* define(['N/task', 'N/log'], function(task, log) {
    function afterSubmit(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var leaveEmpId = context.newRecord.id;
            log.debug('Employee ID', leaveEmpId);
            
            try {
                var scheduledScriptTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,  // Double-check here
                    scriptId: 'customscript_hris_post_lve_app_net_to_mo',
                    deploymentId: 'customdeploy_hris_post_lve_app_net_to_mo',
                    params: {
                        custscript_leave_emp_id: leaveEmpId
                    }
                });
                var taskId = scheduledScriptTask.submit();
                log.debug('Scheduled Script Task ID', taskId);
            } catch (e) {
                log.error('Error Submitting Scheduled Script', e.name + ': ' + e.message);
            }
        }
    }

    return {
        afterSubmit: afterSubmit
    };
}); */

define(['N/task', 'N/log'], function(task, log) {
    function afterSubmit(context) {
        
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var leaveEmpId = context.newRecord.id;
            log.debug('employeeId', leaveEmpId);

            var scheduledScriptTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_hris_post_lve_app_net_to_mo',
                //deploymentId: 'customdeploy_hris_post_lve_app_net_to_mo',
                params: {
                    custscript_leave_emp_id: leaveEmpId
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
