function getInputData() {
    var context = nlapiGetContext();
    var fileId = context.getSetting('SCRIPT', 'custscript_file_id');
    var recordId = context.getSetting('SCRIPT', 'custscript_payslip_record_id');

    nlapiLogExecution('DEBUG', 'Map/Reduce Input Data', 'fileId: ' + fileId + ', recordId: ' + recordId);

    // Return an array of objects that need to be processed
    return [{
        recordId: recordId,
        fileId: fileId
    }];
}

function map(context) {
    var value = JSON.parse(context.value); // Parse the JSON string passed from getInputData

    var recordId = value.recordId;
    var fileId = value.fileId;

    nlapiLogExecution('DEBUG', 'Processing in Map', 'recordId: ' + recordId + ', fileId: ' + fileId);

    try {
        // Load the "customrecord_hris_pay_slip_request" record using the recordId
        var paySlipRecord = nlapiLoadRecord('customrecord_hris_pay_slip_request', recordId);

        // Set the fileId in the custrecord_hris_payslip_file field
        paySlipRecord.setFieldValue('custrecord_hris_payslip_file', fileId);

        // Save the updated record
        nlapiSubmitRecord(paySlipRecord);
        nlapiLogExecution('DEBUG', 'Record Updated', 'Record with ID ' + recordId + ' updated with file ID ' + fileId);

    } catch (e) {
        nlapiLogExecution('ERROR', 'Error in Map', 'Error processing record ID: ' + recordId + ' with file ID: ' + fileId + ' - ' + e.message);
    }
}

function reduce(context) {
    // The reduce function is not necessary here but can be used if you need to summarize or aggregate data
    // This function can be left empty if no additional processing is required.
}

function summarize(summary) {
    // Log or handle any summarization needed after processing the data
    if (summary.inputSummary.error) {
        nlapiLogExecution('ERROR', 'Error in Map/Reduce', summary.inputSummary.error);
    }
    nlapiLogExecution('DEBUG', 'Map/Reduce Summary', 'Processing Complete');
}

