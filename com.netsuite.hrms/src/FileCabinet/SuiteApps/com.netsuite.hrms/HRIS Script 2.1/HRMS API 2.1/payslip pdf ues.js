/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/task', 'N/log'], function(task, log) {
    function afterSubmit(context) {
        if (context.type === context.UserEventType.EDIT) {
            var recordId = context.newRecord.id;
            log.debug('Record ID', recordId);

            try {
                var mapReduceTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_hris_payslip_pdf_mr', // Replace with your Map/Reduce script ID
                    deploymentId: 'customdeploy_hris_payslip_pdf_mr', // Replace with your deployment ID
                    params: {
                        custscript_payslip_record_id: recordId
                    }
                });
                var taskId = mapReduceTask.submit();
                log.debug('Map/Reduce Task ID', taskId);
            } catch (e) {
                log.error('Error Submitting Map/Reduce Task', e.name + ': ' + e.message);
            }
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
