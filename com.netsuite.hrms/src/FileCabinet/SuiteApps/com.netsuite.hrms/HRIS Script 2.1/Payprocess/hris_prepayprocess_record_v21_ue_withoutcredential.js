/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/redirect', './hris_pay_process_module'],
    (record, log, redirect, hris_pay_process_module) => {

        const afterSubmit = (context) => {
            try {
                if (context.type === context.UserEventType.DELETE) {
                    return;
                }

                const recId = context.newRecord.id;
                log.debug('afterSubmit', 'Record ID: ' + recId);

                const o_payprocess = record.load({
                    type: 'customrecord_hris_pre_pay_process_record',
                    id: recId,
                    isDynamic: false
                });

                const checked = o_payprocess.getValue('custrecord_hris_pre_pay_pr_checked');
                const seq = o_payprocess.getValue('custrecord_hris_pre_pay_pr_pay_freq_seq');

                if (checked === true || checked === 'T') {
                    return;
                }

                if (seq != 1) {
                    return;
                }

                log.debug('Processing', 'Calling processPrePayRecord for ID: ' + recId);

                // ===== Direct call - no HTTP, no OAuth =====
              //  const result = prepayLib.processPrePayRecord(recId);
                const result = hris_pay_process_module.processEmployeePay(recId);

                log.debug('Process Result', result);

                // Redirect to status page
                redirect.toSuitelet({
                    scriptId: 'customscript_hris_prepayprocessstatus',
                    deploymentId: 'customdeploy_hris_prepayprocessstatus',
                    parameters: {
                        custscript_hris_payprocess_totalcount: result.success ? '1' : '0',
                        custscript_hris_payprocess_truecount: result.success ? '1' : '0'
                    }
                });

            } catch (e) {
                log.error('afterSubmit Error', e);
            }
        };

        return {
            afterSubmit
        };
    });