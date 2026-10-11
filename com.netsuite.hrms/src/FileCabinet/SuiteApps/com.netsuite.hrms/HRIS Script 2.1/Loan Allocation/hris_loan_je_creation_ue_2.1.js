/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/ui/serverWidget', 'N/search'], (record, serverWidget, search) => {

    const beforeLoad = (scriptContext) => {
        const form = scriptContext.form;
        const recordObj = scriptContext.newRecord;
        const type = scriptContext.type;

        log.debug('Type', type);

        const approvalStatus = recordObj.getValue('custrecord_hris_loan_approval_status');
        log.debug('approvalStatus', approvalStatus);

        const jeno = recordObj.getValue('custrecord_hris_loan_allo_je_no') || '';
        log.debug('jeno', jeno);

        if (type === 'view' && approvalStatus == 2 && jeno === '') {
            form.addButton({
                id: 'custpage_jvcreation',
                label: 'Post JV',
                functionName: 'jvcreation()'
            });
        }

        form.clientScriptModulePath = './hris_loan_je_creation_cs_2.1.js';
    };

    return {
        beforeLoad
    };
});