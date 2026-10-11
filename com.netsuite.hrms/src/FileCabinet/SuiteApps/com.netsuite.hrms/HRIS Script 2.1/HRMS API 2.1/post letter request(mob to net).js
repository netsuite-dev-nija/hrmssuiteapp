/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/format'], function(record, log, format) {

    function doPost(context) {
        var result = {
            success: true,
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
                "date": "custrecord_hris_letreq_request_date_cre",
                "empId": "custrecord_hris_letreq_employee_name",
                "status": "custrecord_hris_letreq_status_in_text",
                "letterTypeId": "custrecord_hris_letreq_certificate_type",
                "requestedFor": "custrecord_hris_letreq_purposed_requeste",
                "letterAddressedTo": "custrecord_hris_letreq_letter_addressed",
               "lettercopyid":"custrecord_hris_letter_copy_req"
            };

            var customRecordType = 'customrecord_hris_lve_letter_req';
            var apiUrl = 'https://11951030.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=626&deploy=1';

            // Function to convert YYYY-MM-DD to DD/MM/YYYY format
            function convertDateFormat(dateString) {
                var dateParts = dateString.split("-");
                return dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0];
            }

            // Loop through each record in the request array
            for (var i = 0; i < context.length; i++) {
                var recordData = context[i];
                log.debug("Processing Record", JSON.stringify(recordData));

                // Validate mandatory fields
                if (!recordData.date || !recordData.empId || !recordData.letterTypeId || !recordData.requestedFor) {
                    log.error("Mandatory Field Missing", "One or more mandatory fields are missing in the input data.");
                    result.failedRecords.push({
                        error: 'Mandatory fields missing: date, empId, letterType, or requestedFor'
                    });
                    continue; // Skip processing this record
                }

                try {
                    // Create a new custom record
                    var newRecord = record.create({
                        type: customRecordType,
                        isDynamic: true
                    });

                    // Set mandatory fields

                    // Date Field: custrecord_hris_letreq_request_date_cre
                    var formattedDate = format.parse({
                        value: convertDateFormat(recordData.date),
                        type: format.Type.DATE
                    });
                    newRecord.setValue({
                        fieldId: fieldMapping.date,
                        value: formattedDate
                    });

                    // Employee Field: custrecord_hris_letreq_employee_name
                    newRecord.setValue({
                        fieldId: fieldMapping.empId,
                        value: recordData.empId
                    });

                    // Letter Type Field: custrecord_hris_letreq_certificate_type
                    newRecord.setValue({
                        fieldId: fieldMapping.letterTypeId,
                        value: recordData.letterTypeId
                    });

                    // Requested For Field: custrecord_hris_letreq_purposed_requeste
                    newRecord.setValue({
                        fieldId: fieldMapping.requestedFor,
                        value: recordData.requestedFor
                    });

                    // Set optional fields
                    // Status Field: custrecord_hris_letreq_status_in_text
                    if (recordData.status) {
                        newRecord.setValue({
                            fieldId: fieldMapping.status,
                            value: recordData.status
                        });
                    }

                    // Letter Addressed To Field: custrecord_hris_letreq_letter_addressed
                    if (recordData.letterAddressedTo) {
                        newRecord.setValue({
                            fieldId: fieldMapping.letterAddressedTo,
                            value: recordData.letterAddressedTo
                        });
                    }
                      newRecord.setValue({
                            fieldId: fieldMapping.lettercopyid,
                            value: recordData.lettercopyid
                        });

                     // Setting additional fields
                newRecord.setValue({
                    fieldId: 'custrecord_hris_letreq_resp_code',
                    value: 200
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_letreq_pros_sts',
                    value: 2
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_letreq_resp_status',
                    value: 'Success'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_letreq_resp_msg',
                    value: 'Record created successfully'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_letreq_api_url',
                    value: apiUrl
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_letreq_api_mtho',
                    value: 'POST'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_letreq_json_data',
                    value: JSON.stringify(recordData)
                });


                    // Save the new record and store the ID
                    var recordId = newRecord.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: false
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
