/**
* @NApiVersion 2.1
* @NScriptType UserEventScript
*/
define(['N/runtime', 'N/ui/serverWidget', 'N/file'], function(runtime, serverWidget, file) {
    function afterSubmit(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var newRecord = context.newRecord;
            log.debug("newRecord",newRecord);
 
            // Inject Client Script
            var form = context.form;
            log.debug("form",form);
            var clientScriptFileId = '17012'; 
            //form.clientScriptModulePath = './payslip generation cl.js';
        }
    }
 
    return {
        afterSubmit: afterSubmit
    };
});