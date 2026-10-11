function afterSubmit(type) {
    var newRecord = nlapiGetNewRecord();  
    var recordId = newRecord.getId();
    nlapiLogExecution('DEBUG', 'Record id', recordId);

    var paygroup = newRecord.getFieldValue('custrecord_hris_psr_paygroup');
    var employee = newRecord.getFieldValue('custrecord_hris_payslip_req_emp');
    var startDate = newRecord.getFieldValue('custrecord_hris_psr_start_date');
    var endDate = newRecord.getFieldValue('custrecord_hris_psr_end_date');

    var startDateObj = nlapiStringToDate(startDate);  
    var endDateObj = nlapiStringToDate(endDate);      

    var formattedStartDate = nlapiDateToString(startDateObj); 
    nlapiLogExecution('DEBUG', 'formattedStartDate', formattedStartDate);
    var formattedEndDate = nlapiDateToString(endDateObj);    
    nlapiLogExecution('DEBUG', 'formattedEndDate', formattedEndDate); 


   /*  var formattedStartDate = nlapiDateToString(startDate);
    nlapiLogExecution('DEBUG', 'formattedStartDate', formattedStartDate);
    var formattedEndDate = nlapiDateToString(endDate);
    nlapiLogExecution('DEBUG', 'formattedEndDate', formattedEndDate); */

   
    var suiteletUrl = nlapiResolveURL('SUITELET', 'customscript_hris_psr_sut_1_0', 'customdeploy_hris_psr_sut_1_0', false);
    suiteletUrl += '&paygroup=' + encodeURIComponent(paygroup);
    suiteletUrl += '&employee=' + encodeURIComponent(employee);
    suiteletUrl += '&stdate=' + encodeURIComponent(formattedStartDate);
    suiteletUrl += '&enddate=' + encodeURIComponent(formattedEndDate);
    suiteletUrl += '&recordId=' + encodeURIComponent(recordId);

    try {
       
        nlapiLogExecution('DEBUG', 'Resolved Suitelet URL', suiteletUrl);

        // Call the Suitelet
        var response = nlapiRequestURL(suiteletUrl);

        if (response.getCode() === 200) {
            nlapiLogExecution('DEBUG', 'Suitelet Response', response.getBody());
        } else {
            nlapiLogExecution('ERROR', 'Suitelet Call Failed', 'Response Code: ' + response.getCode() + ', Body: ' + response.getBody());
        }
    } catch (e) {
        nlapiLogExecution('ERROR', 'Error Calling Suitelet', e.message);
    }
}   