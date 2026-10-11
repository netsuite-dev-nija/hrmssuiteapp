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
                "date": "custrecord_hris_asset_req_date",
                "empId": "custrecord_hris_asset_emp_name",
                "assetTypeId": "custrecord_hris_asset_type",
                "assetNameId": "custrecord_hris_asset_name",
                "remarks": "custrecord_hris_asset_remarks",
                "purposeId": "custrecord_hris_asset_req_purpose",
                //"purposeName": "custrecord_hris_asset_req_purpose"
            };

            var customRecordType = 'customrecord_hris_asset_req_form';
            var apiUrl = 'https://11951030.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=615&deploy=1';

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
                if (!recordData.date || !recordData.empId || !recordData.assetTypeId || !recordData.assetNameId) {
                    log.error("Mandatory Field Missing", "One or more mandatory fields are missing in the input data.");
                    result.failedRecords.push({
                        error: 'Mandatory fields missing: date, empId, assetTypeId, or assetNameId'
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

                    // Date Field: custrecord_hris_asset_req_date
                    var formattedDate = format.parse({
                        value: convertDateFormat(recordData.date),
                        type: format.Type.DATE
                    });
                    newRecord.setValue({
                        fieldId: fieldMapping.date,
                        value: formattedDate
                    });

                    // Employee Field: custrecord_hris_asset_emp_name
                    newRecord.setValue({
                        fieldId: fieldMapping.empId,
                        value: recordData.empId
                    });

                    // Asset Type Field: custrecord_hris_asset_type
                    newRecord.setValue({
                        fieldId: fieldMapping.assetTypeId,
                        value: recordData.assetTypeId
                    });

                    // Asset Name Field: custrecord_hris_asset_name
                    newRecord.setValue({
                        fieldId: fieldMapping.assetNameId,
                        value: recordData.assetNameId
                    });

                    // Set optional fields
                    // Remarks Field: custrecord_hris_asset_remarks
                    if (recordData.remarks) {
                        newRecord.setValue({
                            fieldId: fieldMapping.remarks,
                            value: recordData.remarks
                        });
                    }

                    // Purpose Id Field: custrecord_hris_asset_req_purpose
                    if (recordData.purposeId) {
                        newRecord.setValue({
                            fieldId: fieldMapping.purposeId,
                            value: recordData.purposeId
                        });
                    }

                   /*  // Purpose Name Field: custrecord_hris_asset_req_purpose
                    if (recordData.purposeName) {
                        newRecord.setValue({
                            fieldId: fieldMapping.purposeName,
                            value: recordData.purposeName
                        });
                    } */

                   // Setting additional fields
                newRecord.setValue({
                    fieldId: 'custrecord_hris_asset_asset_req',
                    value: 200
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_asset_pros_stat',
                    value: 2
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_asset_resp_stat',
                    value: 'Success'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_asset_resp_msg',
                    value: 'Record created successfully'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_asset_api_url',
                    value: apiUrl
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_asset_api_method',
                    value: 'POST'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_hris_asset_json_data',
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
