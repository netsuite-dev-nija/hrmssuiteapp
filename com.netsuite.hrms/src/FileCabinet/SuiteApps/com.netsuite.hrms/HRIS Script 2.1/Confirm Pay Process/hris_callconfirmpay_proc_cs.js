/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/url', 'N/log'],
    (currentRecord, url, log) => {

        const pageInit = (context) => {
            try {
                const rec = currentRecord.get();

                const a_PayGroupFilter = rec.getValue({ fieldId: 'custpage_paygroupfilter' });
                const i_Count = rec.getValue({ fieldId: 'custpage_truecount' });
                const i_ParentProcessID = rec.getValue({ fieldId: 'custpage_parentid' });

                const suiteletUrl = url.resolveScript({
                    scriptId: 'customscript_hris_cnfrmpayproc_sts_v2_sl',
                    deploymentId: 'customdeploy_hris_cnfrmpayproc_sts_v2_sl',
                    params: {
                        custscript_truecount: i_Count,
                        custscript_paygroup: a_PayGroupFilter,
                        custscript_parentid: i_ParentProcessID
                    }
                });

                window.open(suiteletUrl, '_self');
            } catch (e) {
                log.error('pageInit Error', e);
            }
        };

        const saveRecord = (context) => {
            return true;
        };

        return {
            pageInit,
            saveRecord
        };
    });