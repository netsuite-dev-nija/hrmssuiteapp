/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/https', 'N/record', 'N/log', 'N/url', 'N/format'], function (https, record, log, url, format) {

    function saveRecord(context) {
        var currentRecord = context.currentRecord;
        log.debug("currentRecord", currentRecord);

        // Extract parameters from the custom record
        var paygroup = currentRecord.getValue({ fieldId: 'custrecord_hris_psr_paygroup' });
        log.debug("paygroup", paygroup);
        var employee = currentRecord.getValue({ fieldId: 'custrecord_hris_payslip_req_emp' });
        log.debug("employee", employee);
        var startDate = currentRecord.getValue({ fieldId: 'custrecord_hris_psr_start_date' });
        log.debug("startDate", startDate);
        var endDate = currentRecord.getValue({ fieldId: 'custrecord_hris_psr_end_date' });
        log.debug("endDate", endDate);

        var formattedStartDate = format.format({
            value: startDate,
            type: format.Type.DATE
        });

        var formattedEndDate = format.format({
            value: endDate,
            type: format.Type.DATE
        });

        log.debug('Formatted Dates', { formattedStartDate: formattedStartDate, formattedEndDate: formattedEndDate });

         var recordId = currentRecord.id;

        // Resolve Suitelet URL
        var suiteletUrl = url.resolveScript({
            scriptId: 'customscript_hris_psr_sut_1_0',
            deploymentId: 'customdeploy_hris_psr_sut_1_0',
            params: {
                paygroup: paygroup,
                employee: employee,
                stdate: formattedStartDate,
                enddate: formattedEndDate,
                recordId: recordId
            }
        });

       try {
            // Call the Suitelet
            var response = https.get({ url: suiteletUrl });

            if (response.code === 200) {
                log.debug('Suitelet Response', response.body);
            } else {
                log.error('Suitelet Call Failed', 'Response Code: ' + response.code + ', Body: ' + response.body);
            }
        } catch (e) {
            log.error('Error Calling Suitelet', e.message);
        } 

        return true; 
    }

    return {
        saveRecord: saveRecord
    };
});
