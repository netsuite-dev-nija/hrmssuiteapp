/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/log', 'N/runtime', 'N/ui/serverWidget'],
    (record, log, runtime, serverWidget) => {

        /**
         * beforeLoad
         */
        const beforeLoad = (context) => {
            try {
                if (context.type !== context.UserEventType.VIEW) {
                    return;
                }

                const form = context.form;
                const recId = context.newRecord.id;

                log.debug('beforeLoad', 'Record ID: ' + recId);

                if (recId) {
                    log.debug('beforeLoad', 'Adding Confirm Process button for Record ID: ' + recId);
                    // Attach Client Script (update the Script ID if different)
                   // form.clientScriptModulePath = './hris_conf_proc_oncall_cs.js';
                    form.clientScriptModulePath='./hris_confirm_pay_proc_cs.js';
                    // Or use:
                    // form.clientScriptFileId = 12345;

                    // Add Confirm Process button
                    form.addButton({
                        id: 'custpage_confbutton',
                        label: 'Confirm Process',
                       // functionName: 'callConfirmPayProcess("' + recId + '")'
                        functionName: 'callConfirmPayProcess()'
                    });
                }

            } catch (e) {
                log.error('beforeLoad Error', e);
            }
        };

        return {
            beforeLoad
        };
    });