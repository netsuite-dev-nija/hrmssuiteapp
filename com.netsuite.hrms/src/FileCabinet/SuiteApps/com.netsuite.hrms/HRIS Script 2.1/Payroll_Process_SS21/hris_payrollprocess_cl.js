/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @Description Pay Process client script – checkbox counter + save validation (SS 2.1)
 */
define(['N/currentRecord', 'N/url', 'N/log'], (currentRecordMod, url, log) => {

    const fieldChanged = (scriptContext) => {
        try {
            const currentRecord = scriptContext.currentRecord;
            if (scriptContext.fieldId !== 'custscript_apm_check') {
                return;
            }

            const count = currentRecord.getLineCount({
                sublistId: 'custpage_apm_employee_sublist'
            });
            let falseCount = 0;

            for (let i = 0; i < count; i++) {
                const checkbox = currentRecord.getSublistValue({
                    sublistId: 'custpage_apm_employee_sublist',
                    fieldId: 'custscript_apm_check',
                    line: i
                });
                if (checkbox === false || checkbox === 'F') {
                    falseCount += 1;
                }
            }

            const diff = parseFloat(count) - parseFloat(falseCount);
            currentRecord.setValue({
                fieldId: 'custscript_counter',
                value: diff
            });
        } catch (e) {
            log.debug('fieldChanged error', e.message || e);
        }
    };

    const saveRecord = (scriptContext) => {
        try {
            const currentRecord = scriptContext.currentRecord;
            const count = currentRecord.getLineCount({
                sublistId: 'custpage_apm_employee_sublist'
            });
            const payGroup = currentRecord.getValue({ fieldId: 'custpage_paygroup' });
            const subsidiary = currentRecord.getValue({ fieldId: 'custpage_subsidiary' });

            let trueCount = 0;
            for (let i = 0; i < count; i++) {
                const checkbox = currentRecord.getSublistValue({
                    sublistId: 'custpage_apm_employee_sublist',
                    fieldId: 'custscript_apm_check',
                    line: i
                });
                if (checkbox === true || checkbox === 'T') {
                    trueCount += 1;
                }
            }

            if (trueCount > 0) {
                const output = url.resolveScript({
                    scriptId: 'customscript_hris_payroll_statusform_sl',
                    deploymentId: 'customdeploy_hris_payroll_statusform_sl'
                });
                window.open(
                    output +
                    '&custscript_truecount=' + trueCount +
                    '&custscript_pagegroup=' + payGroup +
                    '&custscript_subsidiary=' + subsidiary +
                    '&custscript_prepagegroup=' + payGroup +
                    '&custscript_presubsidiary=' + subsidiary
                );
                return true;
            }

            alert('Select at least one employee');
            return false;
        } catch (e) {
            log.debug('saveRecord error', e.message || e);
            return false;
        }
    };

    return {
        fieldChanged,
        saveRecord
    };
});
