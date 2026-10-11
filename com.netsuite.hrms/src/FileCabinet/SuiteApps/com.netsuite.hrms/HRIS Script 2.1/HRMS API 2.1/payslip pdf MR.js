/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/record', 'N/runtime'], function (log, record, runtime) {

    function getInputData() {
        // Retrieve the parameters passed from the Suitelet
        var fileId = runtime.getCurrentScript().getParameter({ name: 'custscript_file_id' });
        var recordId = runtime.getCurrentScript().getParameter({ name: 'custscript_payslip_record_id' });

        log.debug('Map/Reduce Input Data', { fileId: fileId, recordId: recordId });

        // Load the record to be processed (customrecord_hris_pay_slip_request)
        return [{
            recordId: recordId,
            fileId: fileId
        }];
    }

    function map(context) {
        var value = JSON.parse(context.value); // Parse the JSON string passed from getInputData

        var recordId = value.recordId;
        var fileId = value.fileId;

        log.debug('Processing in Map', { recordId: recordId, fileId: fileId });

        try {
            // Load the "customrecord_hris_pay_slip_request" record using the recordId
            var paySlipRecord = record.load({
                type: 'customrecord_hris_pay_slip_request',
                id: recordId
            });

            // Set the fileId in the custrecord_hris_payslip_file field
            paySlipRecord.setValue({
                fieldId: 'custrecord_hris_payslip_file',
                value: fileId
            });

            // Save the updated record
            paySlipRecord.save();
            log.debug('Record Updated', 'Record with ID ' + recordId + ' updated with file ID ' + fileId);

        } catch (e) {
            log.error('Error in Map', 'Error processing record ID: ' + recordId + ' with file ID: ' + fileId + ' - ' + e.message);
        }
    }

    function reduce(context) {
        // The reduce function is not necessary here but can be used if you need to summarize or aggregate data
    }

    function summarize(summary) {
        // Log or handle any summarization needed after processing the data
        if (summary.error) {
            log.error('Error in Map/Reduce', summary.error);
        }
        log.debug('Map/Reduce Summary', 'Processing Complete');
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
