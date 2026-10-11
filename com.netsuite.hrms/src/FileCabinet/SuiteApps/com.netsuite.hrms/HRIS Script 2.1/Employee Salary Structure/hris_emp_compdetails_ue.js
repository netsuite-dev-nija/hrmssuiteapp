/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 *
 * When a deduction line is deleted → reverse the amounts on the parent EDC
 */
define(['N/record', 'N/log'], (record, log) => {

    const beforeSubmit = (context) => {
        if (context.type !== context.UserEventType.DELETE) {
            return;
        }

        try {
            const currentRec = context.oldRecord; // on delete use oldRecord
            const monthlyVal = parseFloat(currentRec.getValue({ fieldId: 'custrecord_hris_cdd_monthly' }) || 0);
            const annualVal = parseFloat(currentRec.getValue({ fieldId: 'custrecord_hris_cdd_annually' }) || 0);
            const parentId = currentRec.getValue({ fieldId: 'custrecord_hris_employee_data_changeint' });

            if (!parentId) {
                return;
            }

            log.debug('Reversing deduction on parent', { parentId, monthlyVal, annualVal });

            const parentRec = record.load({
                type: 'customrecord_hris_employee_compen_change',
                id: parentId,
                isDynamic: false
            });

            const monthlyDed = parseFloat(parentRec.getValue({ fieldId: 'custrecord_hris_empchange_mon_ded_amt' }) || 0);
            const annualDed = parseFloat(parentRec.getValue({ fieldId: 'custrecord_hris_empchange_anual_ded_amt' }) || 0);
            const monthlyGross = parseFloat(parentRec.getValue({ fieldId: 'custrecord_hris_empchange_aprox_monthly' }) || 0);
            const annualGross = parseFloat(parentRec.getValue({ fieldId: 'custrecord_hris_empchange_apprx_annetsly' }) || 0);

            parentRec.setValue({
                fieldId: 'custrecord_hris_empchange_mon_ded_amt',
                value: monthlyDed - monthlyVal
            });
            parentRec.setValue({
                fieldId: 'custrecord_hris_empchange_anual_ded_amt',
                value: annualDed - annualVal
            });
            parentRec.setValue({
                fieldId: 'custrecord_hris_empchange_aprox_monthly',
                value: monthlyGross + monthlyVal
            });
            parentRec.setValue({
                fieldId: 'custrecord_hris_empchange_apprx_annetsly',
                value: annualGross + annualVal
            });

            parentRec.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });

        } catch (e) {
            log.error('beforeSubmit DELETE deduction error', e.message || e.toString());
        }
    };

    return { beforeSubmit };
});