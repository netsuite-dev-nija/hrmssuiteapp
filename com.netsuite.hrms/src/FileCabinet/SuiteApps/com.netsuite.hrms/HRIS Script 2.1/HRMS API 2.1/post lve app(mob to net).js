/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/format', 'N/search'], function (record, log, format, search) {

    function doPost(context) {
        var result = {
            success: true,
            createdRecords: [],
            failedRecords: []
        };

        try {
            if (!Array.isArray(context)) {
                return {
                    success: false,
                    message: 'Request body must be an array of objects.'
                };
            }                

            var fieldMapping = {
                "empId": "custrecord_hris_lve_employeename",
                "applicationStatus": "custrecord_hris_lve_hrmsapprovalstatus",
                "leaveType": "custrecord_hris_lve_leavetype",
                "fromDate": "custrecord_hris_lve_fromdate",
                "toDate": "custrecord_hris_lve_todate",
                "leaveReason": "custrecord_hris_lve_leavereason",
                "attachDocument": "custrecord_hris_lve_attachdocument",
                "supportDocument": "custrecord_hris_lve_supportdocument",
                "totalNoOfDays": "custrecord_hris_lve_totalnodays",
                "source": "custrecord_hris_posted_by",
                "isemergency":"custrecord_hris_leave_application_emerge",
                "compoffDate":"custrecord_hris_lve_validtilldate",
                "holidayType":"custrecord_hris_comp_off_type"
            };

            function convertDateFormat(dateString) {
    if (!dateString) return "";
    var dateParts = dateString.split("-");
    // Converts YYYY-MM-DD to DD/MM/YYYY
    return dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0];
}

            /* function getLeaveBalance(empId) {
                var leaveBalance = 0;

                var leaveBalanceSearch = search.create({
                    type: 'customrecord_hris_leavebalance',
                    filters: [
                        ['custrecord_hris_lvbal_employee_name', 'anyof', empId]
                    ],
                    columns: ['custrecord_hris_lvbal_available_leave_ba']
                });

                leaveBalanceSearch.run().each(function (result) {
                    var balance = result.getValue('custrecord_hris_lvbal_available_leave_ba');
                    log.debug("balance",balance);
                    leaveBalance = balance ? Math.floor(parseFloat(balance)) : 0; // Convert to whole number
                    return false; // Exit after the first match
                });

                return leaveBalance;
            } */
            function getLeaveBalance(empId) {
                var leaveBalance = 0;

                var leaveBalanceSearch = search.create({
                    type: 'customrecord_hris_leavebalance',
                    filters: [
                        ["custrecord_hris_lvbal_employee_name", "anyof", empId],
                        "AND",
                        ["custrecord_hris_lvbal_leave_type", "anyof", "1"],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                    columns: [
                        search.createColumn({
                            name: "custrecord_hris_lvbal_available_leave_ba",
                            label: "Available Leave Balance"
                        })
                    ]
                });

                leaveBalanceSearch.run().each(function (result) {
                    var balance = result.getValue("custrecord_hris_lvbal_available_leave_ba");
                    log.debug("balance", balance);
                    leaveBalance = balance ? Math.floor(parseFloat(balance)) : 0; // Convert to whole number
                    return false; // Exit after the first match
                });

                return leaveBalance;
            }


            for (var i = 0; i < context.length; i++) {
                var recordData = context[i];
                log.debug("Processing Record", JSON.stringify(recordData));

                if (!recordData.empId || !recordData.applicationStatus || !recordData.leaveType || !recordData.fromDate || !recordData.toDate) {
                    log.error("Mandatory Field Missing", "One or more mandatory fields are missing in the input data.");
                    result.failedRecords.push({
                        error: 'Mandatory fields missing: empId, applicationStatus, leaveType, fromDate, or toDate'
                    });
                    continue;
                }

                try {
                    var newRecord = record.create({
                        type: 'customrecord_hris_leaveapplication',
                        isDynamic: true
                    });
                    
                    newRecord.setValue({ fieldId: fieldMapping.empId, value: recordData.empId });
                    newRecord.setValue({ fieldId: fieldMapping.applicationStatus, value: recordData.applicationStatus });
                    newRecord.setValue({ fieldId: fieldMapping.leaveType, value: recordData.leaveType });
                    newRecord.setValue({ fieldId: fieldMapping.source, value: recordData.source || '3' });

                    var formattedFromDate = format.parse({ value: convertDateFormat(recordData.fromDate), type: format.Type.DATE });
                    newRecord.setValue({ fieldId: fieldMapping.fromDate, value: formattedFromDate });

                    var formattedToDate = format.parse({ value: convertDateFormat(recordData.toDate), type: format.Type.DATE });
                    newRecord.setValue({ fieldId: fieldMapping.toDate, value: formattedToDate });

                    if (recordData.fromDate && recordData.toDate && recordData.totalNoOfDays) {
                        newRecord.setValue({ fieldId: fieldMapping.totalNoOfDays, value: recordData.totalNoOfDays });
                    }

                    if (recordData.leaveReason) {
                        newRecord.setValue({ fieldId: fieldMapping.leaveReason, value: recordData.leaveReason });
                    }
                  //check the emergency leave set value is true
                    if (recordData.isemergency) {
                        newRecord.setValue({ fieldId: fieldMapping.isemergency, value: recordData.isemergency });
                    }
                    if (recordData.compoffDate) {
    // 1. Convert the format from YYYY-MM-DD to DD/MM/YYYY
    var convertedCompDate = convertDateFormat(recordData.compoffDate);

    // 2. Parse the string into a NetSuite Date Object
    var formattedCompDate = format.parse({ 
        value: convertedCompDate, 
        type: format.Type.DATE 
    });

    // 3. Set the field value
    newRecord.setValue({ 
        fieldId: fieldMapping.compoffDate, 
        value: formattedCompDate 
    });
}
                   if (recordData.holidayType) {
                        newRecord.setValue({ fieldId: fieldMapping.holidayType, value: recordData.holidayType });
                    }

                    // Handle leave balance for leaveType = 1
                    if (recordData.leaveType === '1') {
                        var leaveBalance = getLeaveBalance(recordData.empId);
                        log.debug("Leave Balance Retrieved", leaveBalance);

                        newRecord.setValue({
                            fieldId: "custrecord_hris_lve_leavebalance_wholeno",
                            value: leaveBalance
                        });
                    }

                    /* if (recordData.attachDocument && recordData.attachment && Array.isArray(recordData.attachment)) {
                        newRecord.setValue({ fieldId: fieldMapping.attachDocument, value: true });

                        var fileDataId = recordData.attachment[0].FileData; // Assuming the FileData is an internal ID
                        log.debug('Using File Internal ID', fileDataId);

                        newRecord.setValue({
                            fieldId: fieldMapping.supportDocument,
                            value: fileDataId
                        });
                    } */
                  // PASTE THIS REPLACEMENT CODE HERE
var attachments = recordData.attachment;
// Convert stringified JSON from mobile into a real JavaScript Array
if (typeof attachments === 'string' && attachments !== "") {
    try {
        attachments = JSON.parse(attachments);
    } catch (e) {
        log.error("Attachment Parse Error", e.message);
    }
}

// Check for "T" (which is what your log shows) or true
if ((recordData.attachDocument === "T" || recordData.attachDocument === true) && Array.isArray(attachments) && attachments.length > 0) {
    
    // Check the "Attach Document" checkbox
    newRecord.setValue({ fieldId: fieldMapping.attachDocument, value: true });

    // Get the File Internal ID from the first item in the attachment array
    var fileDataId = attachments[0].FileData; 
    log.debug('Setting Support Document ID', fileDataId);

    // Set the support document field
    newRecord.setValue({
        fieldId: fieldMapping.supportDocument,
        value: fileDataId
    });
}

                    // Setting additional fields
                    newRecord.setValue({
                        fieldId: 'custrecord_hris_lve_response_code',
                        value: 200
                    });

                    newRecord.setValue({
                        fieldId: 'custrecord_hris_lve_',
                        value: 2
                    });

                    newRecord.setValue({
                        fieldId: 'custrecord_hris_lve_response_status',
                        value: 'Success'
                    });

                    newRecord.setValue({
                        fieldId: 'custrecord_hris_lve_response_message',
                        value: 'Record created successfully'
                    });

                    var apiUrl = 'https://11951030.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=668&deploy=1';
                    newRecord.setValue({
                        fieldId: 'custrecord_hris_lve_api_url',
                        value: apiUrl
                    });

                    newRecord.setValue({
                        fieldId: 'custrecord_hris_lve_api_method',
                        value: 'POST'
                    });

                    newRecord.setValue({
                        fieldId: 'custrecord_hris_lve_leave_json_data',
                        value: JSON.stringify(recordData)
                    });

                    if (recordData.mobile_lve_app_no) {
                        newRecord.setValue({
                            fieldId: 'custrecord_hris_lve_mon_lveappno',
                            value: recordData.mobile_lve_app_no
                        });
                    }

                    var recordId = newRecord.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: false,
                        forceSync: true
                    });

                    log.debug("Record Created", recordId);

                    result.createdRecords.push({
                        recordId: recordId
                    });

                } catch (e) {
                    log.error("Error Creating Record", e);
                    result.failedRecords.push({
                        error: e.message
                    });
                    result.success = false;
                }
            }

        } catch (e) {
            log.error('Error in doPost', e);
            return {
                success: false,
                message: e.message
            };
        }

        return result;
    }

    return {
        post: doPost
    };
});
