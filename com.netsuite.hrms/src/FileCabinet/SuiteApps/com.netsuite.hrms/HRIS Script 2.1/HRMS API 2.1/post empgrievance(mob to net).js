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
                "nsId": "custrecord_hr_grievance_employ_name",
                "dateOfSubmission": "custrecord_hr_grievance_date_submitted",
                "dateOfincident": "custrecord_hr_emp_grieve_date_of_inciden",
                "partiesid": "custrecord_hr_emp_grieve_party_involved", // Multi-select field
                "Description": "custrecord_hr_emp_grievance_description",
                "solution": "custrecord_hr_emp_grievance_proposed_sol"
            };

            var customRecordType = 'customrecordnjt_hr_employee_grievance_';

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

                    // Set each field value based on the mapping
                    for (var key in fieldMapping) {
                        if (fieldMapping.hasOwnProperty(key)) {
                            var fieldId = fieldMapping[key];
                            var fieldValue = recordData[key];

                            log.debug("Setting Field", {
                                key: key,
                                fieldId: fieldId,
                                fieldValue: fieldValue
                            });

                            // Handle date formatting for date fields
                            if (key === "dateOfSubmission" || key === "dateOfincident") {
                                fieldValue = format.parse({
                                    value: convertDateFormat(fieldValue),
                                    type: format.Type.DATE
                                });
                            }

                            try {
                                // Handle multiple IDs for 'partiesid' (multi-select field)
                                if (key === "partiesid" && fieldValue) {
                                    var partiesIdsArray = fieldValue.split(',').map(function(id) {
                                        return id.trim(); // Remove any extra whitespace
                                    });

                                    log.debug("Setting Multiple Parties for Multi-Select Field", partiesIdsArray);

                                    newRecord.setValue({
                                        fieldId: fieldId,
                                        value: partiesIdsArray // Set the array of IDs to the multi-select field
                                    });
                                } else if (fieldValue !== undefined && fieldValue !== null) {
                                    // Default handling for other fields
                                    newRecord.setValue({
                                        fieldId: fieldId,
                                        value: fieldValue
                                    });
                                }
                            } catch (e) {
                                // Check for specific error related to partiesid
                                if (key === "partiesid") {
                                    throw new Error(
                                        "You have selected an invalid employee for Parties Involved."
                                    );
                                } else {
                                    throw e;
                                }
                            }
                        }
                    }

                    // Save the new record and store the ID
                    var recordId = newRecord.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });

                    log.debug("Record Created", recordId);

                    // Add the record ID in the required format
                    result.createdRecords.push({ recordId: recordId });

                } catch (e) {
                    log.error("Error Creating Record", e);

                    // Add the error message to the failedRecords array
                    result.failedRecords.push({
                        error: e.message,
                        recordData: recordData
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
