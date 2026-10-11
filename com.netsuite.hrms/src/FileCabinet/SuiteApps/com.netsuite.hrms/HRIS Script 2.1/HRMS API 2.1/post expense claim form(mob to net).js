/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/format'], function(record, log, format) {

    function doPost(context) {
        var result = {
            success: true, // Initially set to true, will change to false if any error occurs
            createdRecords: [],
            failedRecords: []
        };

        try {
            // Ensure the request is an array of objects
            if (!Array.isArray(context)) {
                return {
                    success: false,
                    message: 'Request body must be an array of objects.'
                };
            }

            // Define the field mapping
            var fieldMapping = {
                "date": "custrecord_hris_exp_claim_frm_date",
                "empId": "custrecord_hris_exp_claim_frm_employee",
                "amount": "custrecord_hris_exp_claim_frm_amount",
                "claimType": "custrecord_hris_exp_claim_frm_claim_type",
                "remarks": "custrecord_hris_exp_claim_frm_remarks",
                "airTicketApplicable": "custrecord_hris_claim_airtic_applicable",
                "attachDocument": "custrecord_hris_exp_claim_frm_attachment",
            };

            var customRecordType = 'customrecord_hris_expense_claim_form';
            var apiUrl = 'https://11951030.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=819&deploy=1';

            // Function to convert YYYY-MM-DD to DD/MM/YYYY format
            function convertDateFormat(dateString) {
                var dateParts = dateString.split("-");
                return dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0];
            }

            // Loop through each record in the request array
            for (var i = 0; i < context.length; i++) {
                var recordData = context[i];
                log.debug("Processing Record", JSON.stringify(recordData));

                try {
                    // Create a new custom record
                    var newRecord = record.create({
                        type: customRecordType,
                        isDynamic: true
                    });

                    // Set each field value separately based on the mapping
                    // Date Field: custrecord_hris_exp_claim_frm_date
                    if (recordData.date) {
                        var formattedDate = format.parse({
                            value: convertDateFormat(recordData.date),
                            type: format.Type.DATE
                        });
                        newRecord.setValue({
                            fieldId: fieldMapping.date,
                            value: formattedDate
                        });
                    }

                    // Employee Field: custrecord_hris_exp_claim_frm_employee
                    if (recordData.empId) {
                        newRecord.setValue({
                            fieldId: fieldMapping.empId,
                            value: recordData.empId
                        });
                    }

                    // Amount Field: custrecord_hris_exp_claim_frm_amount
                    if (recordData.amount) {
                        newRecord.setValue({
                            fieldId: fieldMapping.amount,
                            value: recordData.amount
                        });
                    }

                    // Claim Type Field: custrecord_hris_exp_claim_frm_claim_type
                    if (recordData.claimType) {
                        newRecord.setValue({
                            fieldId: fieldMapping.claimType,
                            value: recordData.claimType
                        });
                    }

                    // Remarks Field: custrecord_hris_exp_claim_frm_remarks
                    if (recordData.remarks) {
                        newRecord.setValue({
                            fieldId: fieldMapping.remarks,
                            value: recordData.remarks
                        });
                    }

                    // Air Ticket Applicable Field: custrecord_hris_claim_airtic_applicable
                    if (recordData.airTicketApplicable) {
                        newRecord.setValue({
                            fieldId: fieldMapping.airTicketApplicable,
                            value: recordData.airTicketApplicable
                        });
                    }

                     if (recordData.attachDocument && Array.isArray(recordData.attachDocument) && recordData.attachDocument.length > 0) {
            var attachmentData = recordData.attachDocument[0]; // Assume single attachment per record for now
                       log.debug("attachmentData",attachmentData);
            //if (attachmentData.FileData) {
                       if (recordData.attachDocument) {
                newRecord.setValue({
                    fieldId: fieldMapping.attachDocument,
                    value: recordData.attachDocument // Set the FileData (7039 in this case)
                });
            }
        }

                     // Setting additional fields
                newRecord.setValue({
                    fieldId: 'custrecord_hris_exp_claim_response_code',
                    value: 200
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_exp_claim_process_status',
                    value: 2
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_exp_claim_response_stat',
                    value: 'Success'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_exp_claim_response_msg',
                    value: 'Record created successfully'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_exp_claim_api_url',
                    value: apiUrl
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_exp_claim_api_method',
                    value: 'POST'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_exp_claim_json_data',
                    value: JSON.stringify(recordData)
                });


                    // Save the new record and store the ID
                    var recordId = newRecord.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });

                    log.debug("Record Created", recordId);

                    // Add the record ID to the createdRecords array
                    result.createdRecords.push({ recordId: recordId });

                } catch (e) {
                    log.error("Error Creating Record", e);

                    // Add the error message to the failedRecords array
                    result.failedRecords.push({
                        error: e.message
                    });

                    // Set success to false if an error occurs
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

        // If any records failed, set success to false
        if (result.failedRecords.length > 0) {
            result.success = false;
        }

        return result;
    }

    return {
        post: doPost
    };
});
