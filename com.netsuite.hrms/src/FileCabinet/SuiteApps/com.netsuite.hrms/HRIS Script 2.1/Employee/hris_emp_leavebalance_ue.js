/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/task', 'N/log'], (task, log) => {

    const afterSubmit = (context) => {

        if (
            context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT
        ) {
            return;
        }

        try {

            const employeeID = context.newRecord.id;

            const customform = context.newRecord.getValue({
                fieldId: 'customform'
            });

            log.debug('Employee ID', employeeID);
            log.debug('Custom Form', customform);

            // Only run for form 776
            if (String(customform) !== '776') {
                log.debug('Skipped', 'Custom form is not 776');
                return;
            }

            const scriptTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_hris_leave_creditonjoin_ss',
                deploymentId: 'customdeploy_hris_leave_creditonjoin_ss',
                params: {
                    custscript_hris_leavecredit_empid: String(employeeID)
                }
            });

            log.debug('Submitting Scheduled Script', {
                scriptId: 'customscript_hris_leave_creditonjoin_ss',
                deploymentId: 'customdeploy_hris_leave_creditonjoin_ss',
                employeeID: employeeID
            });

            const taskId = scriptTask.submit();

            log.audit('Scheduled Script Submitted', {
                taskId: taskId,
                employeeID: employeeID
            });

        } catch (e) {

            log.error({
                title: 'Scheduled Script Submission Error',
                details: {
                    name: e.name,
                    message: e.message,
                    stack: e.stack
                }
            });
        }
    };

    return {
        afterSubmit
    };
});