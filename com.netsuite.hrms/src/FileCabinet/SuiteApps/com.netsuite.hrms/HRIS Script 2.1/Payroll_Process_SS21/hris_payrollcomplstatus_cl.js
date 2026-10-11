/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @Description Pay Process status form client – auto-refresh progress (SS 2.1)
 */
define(['N/currentRecord', 'N/url', 'N/log'], (currentRecordMod, url, log) => {

    const pageInit = (scriptContext) => {
        try {
            const currentRecordObj = currentRecordMod.get();

            const count = currentRecordObj.getLineCount({
                sublistId: 'custpage_payprocesssublist'
            });
            const i_baseCount = currentRecordObj.getValue({
                fieldId: 'custpage_count'
            });

            let trueCount = 0;
            for (let i_Temp = 0; i_Temp < count; i_Temp++) {
                const s_Status = currentRecordObj.getSublistValue({
                    sublistId: 'custpage_payprocesssublist',
                    fieldId: 'custpage_status',
                    line: i_Temp
                });
                if (s_Status === 'Completed') {
                    trueCount += 1;
                }
            }

            currentRecordObj.setValue({
                fieldId: 'custpage_process',
                value: trueCount
            });

            setTimeout(() => {
                try {
                    const i_Refresh = currentRecordObj.getValue({
                        fieldId: 'custpage_refresh'
                    });

                    if (i_Refresh != 100) {
                        const btn = document.getElementById('custpage_submitbutton');
                        if (btn) {
                            btn.click();
                        }
                        if (i_baseCount != count) {
                            saveRecord(scriptContext);
                        }
                    }
                } catch (innerErr) {
                    log.debug('pageInit timeout error', innerErr.message || innerErr);
                }
            }, 1000);
        } catch (e) {
            log.debug('pageInit error', e.message || e);
        }
    };

    const saveRecord = (scriptContext) => {
        try {
            const currentRecordObj = currentRecordMod.get();

            const i_Ratio = currentRecordObj.getValue({ fieldId: 'custpage_ratio' });
            const i_PayGroupFilter = currentRecordObj.getValue({ fieldId: 'custpage_paygroupfilter' });
            const i_SubsidiaryFilter = currentRecordObj.getValue({ fieldId: 'custpage_subsidiaryfilter' });
            const s_DateCreated = currentRecordObj.getValue({ fieldId: 'custpage_date' });
            const i_baseCount = currentRecordObj.getValue({ fieldId: 'custpage_count' });
            const PayGroupFilter = currentRecordObj.getValue({ fieldId: 'custpage_paygrpfilter' });
            const SubsidiaryFilter = currentRecordObj.getValue({ fieldId: 'custpage_subsifilter' });

            const suiteletURL = url.resolveScript({
                scriptId: 'customscript_hris_payroll_statusform_sl',
                deploymentId: 'customdeploy_hris_payroll_statusform_sl',
                params: {
                    custscript_ratio: i_Ratio,
                    custscript_paygroupfilter: i_PayGroupFilter,
                    custscript_datecreated: s_DateCreated,
                    custscript_count: i_baseCount,
                    custscript_subsidiaryfilter: i_SubsidiaryFilter,
                    custscript_prepagegroup: PayGroupFilter,
                    custscript_presubsidiary: SubsidiaryFilter
                }
            });

            window.location.href = suiteletURL;
            return true;
        } catch (e) {
            log.debug('saveRecord error', e.message || e);
            return false;
        }
    };

    return {
        pageInit,
        saveRecord
    };
});
