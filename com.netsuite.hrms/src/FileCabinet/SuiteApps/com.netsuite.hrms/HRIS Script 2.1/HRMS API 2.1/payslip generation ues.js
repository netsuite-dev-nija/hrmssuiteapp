/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/https', 'N/url', 'N/format'], function(record, log, https, url, format) {

    function afterSubmit(context) {
        var newRecord = context.newRecord;
        var recordId = newRecord.id;
        var paygroup = newRecord.getValue({ fieldId: 'custrecord_hris_psr_paygroup' });
        var employee = newRecord.getValue({ fieldId: 'custrecord_hris_payslip_req_emp' });
        var startDate = newRecord.getValue({ fieldId: 'custrecord_hris_psr_start_date' });
        var endDate = newRecord.getValue({ fieldId: 'custrecord_hris_psr_end_date' });

        var formattedStartDate = format.format({ value: startDate, type: format.Type.DATE });
        var formattedEndDate = format.format({ value: endDate, type: format.Type.DATE });

        try {
            var suiteletUrl = url.resolveScript({
                /* scriptId: 'customscript_hris_psr_sut_1_0',
                deploymentId: 'customdeploy_hris_psr_sut_1_0', */
                scriptId: 'customscript_hris_yearlypayslip_pdf_sl',
                deploymentId: 'customdeploy_hris_yearlypayslip_pdf_sl',
                returnExternalUrl: true,
                params: {
                    paygroup: paygroup,
                    employee: employee,
                    stdate: formattedStartDate,
                    enddate: formattedEndDate,
                    recordId: recordId
                }
            });

            log.debug('Resolved Suitelet URL', suiteletUrl);

            var response = https.get({ url: suiteletUrl });

            if (response.code === 200) {
                log.debug('Suitelet Response', response.body);
            } else {
                log.error('Suitelet Call Failed', {
                    responseCode: response.code,
                    responseBody: response.body,
                    url: suiteletUrl
                });
            }
        } catch (e) {
            log.error('Error Calling Suitelet', e.message);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
