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

            // Define the field mapping for the travel requisition form
            var fieldMapping = {
                "travelPurpose": "custrecord_ess_travel_purpos",
                "empId": "custrecord_ess_trf_employee_name",
                "destination": "custrecord_ess_destination",
                "proposedTravelDate": "custrecord_ess_proposed_travel_date",
                "departuredDate": "custrecord_ess_departure_date",
                "returnedDate": "custrecord_ess_returned_date",
                "durations": "custrecord_ess_durations",
                "travelMode": "custrecord_ess_travel_mode",
                "estTotalCost": "custrecord_ess_est_total_cost",
                "flightTrainDetails": "custrecord_ess_travel_detail",
                "advanceRequired": "custrecord_ess_travel_advance",
                "accomodationDetails": "custrecordcustrecord_ess_accomodate_deta",
                "remarks": "custrecord_ess_trf_remarks"
            };

            var customRecordType = 'customrecord_ess_travel_requisition_form';
            var apiUrl = 'https://9699878.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=3661&deploy=1';
          
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
                if (!recordData.empId || !recordData.travelPurpose || !recordData.destination || !recordData.proposedTravelDate) {
                    log.error("Mandatory Field Missing", "One or more mandatory fields are missing in the input data.");
                    result.failedRecords.push({
                        error: 'Mandatory fields missing: empId, travelPurpose, destination, or proposedTravelDate'
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

                    // Travel Purpose Field: custrecord_ess_travel_purpos
                    newRecord.setValue({
                        fieldId: fieldMapping.travelPurpose,
                        value: recordData.travelPurpose
                    });

                    // Employee Field: custrecord_ess_trf_employee_name
                    newRecord.setValue({
                        fieldId: fieldMapping.empId,
                        value: recordData.empId
                    });

                    // Destination Field: custrecord_ess_destination
                    newRecord.setValue({
                        fieldId: fieldMapping.destination,
                        value: recordData.destination
                    });

                    // Proposed Travel Date: custrecord_ess_proposed_travel_date
                    var formattedProposedDate = format.parse({
                        value: convertDateFormat(recordData.proposedTravelDate),
                        type: format.Type.DATE
                    });
                    newRecord.setValue({
                        fieldId: fieldMapping.proposedTravelDate,
                        value: formattedProposedDate
                    });

                    // Set optional fields

                    // Departure Date: custrecord_ess_departure_date
                    if (recordData.departuredDate) {
                        var formattedDepartureDate = format.parse({
                            value: convertDateFormat(recordData.departuredDate),
                            type: format.Type.DATE
                        });
                        newRecord.setValue({
                            fieldId: fieldMapping.departuredDate,
                            value: formattedDepartureDate
                        });
                    }

                    // Return Date: custrecord_ess_returned_date
                    if (recordData.returnedDate) {
                        var formattedReturnDate = format.parse({
                            value: convertDateFormat(recordData.returnedDate),
                            type: format.Type.DATE
                        });
                        newRecord.setValue({
                            fieldId: fieldMapping.returnedDate,
                            value: formattedReturnDate
                        });
                    }

                    // Durations: custrecord_ess_durations
                    if (recordData.durations) {
                        newRecord.setValue({
                            fieldId: fieldMapping.durations,
                            value: recordData.durations
                        });
                    }

                    // Travel Mode: custrecord_ess_travel_mode
                    if (recordData.travelMode) {
                        newRecord.setValue({
                            fieldId: fieldMapping.travelMode,
                            value: recordData.travelMode
                        });
                    }

                    // Estimated Total Cost: custrecord_ess_est_total_cost
                    if (recordData.estTotalCost) {
                        newRecord.setValue({
                            fieldId: fieldMapping.estTotalCost,
                            value: recordData.estTotalCost
                        });
                    }

                    // Flight/Train Details: custrecord_ess_travel_detail
                    if (recordData.flightTrainDetails) {
                        newRecord.setValue({
                            fieldId: fieldMapping.flightTrainDetails,
                            value: recordData.flightTrainDetails
                        });
                    }

                    // Advance Required: custrecord_ess_travel_advance
                    if (recordData.advanceRequired) {
                        newRecord.setValue({
                            fieldId: fieldMapping.advanceRequired,
                            value: recordData.advanceRequired
                        });
                    }

                    // Accommodation Details: custrecordcustrecord_ess_accomodate_deta
                    if (recordData.accomodationDetails) {
                        newRecord.setValue({
                            fieldId: fieldMapping.accomodationDetails,
                            value: recordData.accomodationDetails
                        });
                    }

                    // Remarks: custrecord_ess_trf_remarks
                    if (recordData.remarks) {
                        newRecord.setValue({
                            fieldId: fieldMapping.remarks,
                            value: recordData.remarks
                        });
                    }

                    // Setting additional fields
                newRecord.setValue({
                    fieldId: 'custrecord_ess_trf_response_code',
                    value: 200
                });

                newRecord.setValue({
                    fieldId: 'custrecord_ess_trf_process_status',
                    value: 2
                });

                newRecord.setValue({
                    fieldId: 'custrecord_ess_trf_response_message',
                    value: 'Success'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_ess_trf_response_message',
                    value: 'Record created successfully'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_ess_trf_api_url',
                    value: apiUrl
                });

                newRecord.setValue({
                    fieldId: 'custrecord_ess_trf_api_method',
                    value: 'POST'
                });

                newRecord.setValue({
                    fieldId: 'custrecord_ess_trf_json_data',
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
