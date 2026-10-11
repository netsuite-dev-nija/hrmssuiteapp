/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */

define(['N/record', 'N/error', 'N/log', 'N/format'], function (record, error, log, format) {

    function createRegularizationRecords(context) {
        if (!context || context.length === 0) {
            log.error('Invalid context', 'Context is empty or undefined');
            return [{
                Status: false,
                StatusCode: 400,
                Message: 'Invalid context',
                ErrorMessage: 'Context is empty or undefined'
            }];
        }

        log.debug('context', JSON.stringify(context));

        var requests = Array.isArray(context) ? context : [context];
        var customRecordType = 'customrecord_hr_attend_regularization';
        var apiUrl = 'https://9699878.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=3650&deploy=1';
        var apiMethod = 'POST';

        // Mapping approval status values
        var approvalStatusValues = {
            "Approved": 2,
            "Open": 11,
            "Pending Approval": 1,
            "Rejected": 3
        };

        var results = [];

        try {
            for (var i = 0; i < requests.length; i++) {
                var requestBody = requests[i];
                log.debug('Processing request', JSON.stringify(requestBody));

                var regRecord = record.create({
                    type: customRecordType,
                    isDynamic: true,
                });

                // Set employee ID
                regRecord.setValue({
                    fieldId: 'custrecord_hr_attend_reg_employee',
                    value: requestBody.empId
                });

                // Set regularization In time (free form)
                if (requestBody.regIn) {
                    regRecord.setValue({
                        fieldId: 'custrecord_hr_attend_regular_reg_in',
                        value: requestBody.regIn
                    });
                }

                // Set regularization Out time (free form)
                if (requestBody.regOut) {
                    regRecord.setValue({
                        fieldId: 'custrecord_hr_attend_regular_reg_out',
                        value: requestBody.regOut
                    });
                }

                // Set date
                if (requestBody.date) {
                    var dateParts = requestBody.date.split("-");
                    if (dateParts.length === 3) {
                        var formattedDate = dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0];
                        regRecord.setValue({
                            fieldId: 'custrecord_hr_attend_regular_date',
                            value: format.parse({
                                value: formattedDate,
                                type: format.Type.DATE
                            })
                        });
                    }
                }

                // Set approval status
                if (requestBody.approvalStatus && approvalStatusValues[requestBody.approvalStatus]) {
                    regRecord.setValue({
                        fieldId: 'custrecord_hr_attend_reg_approve_status',
                        value: approvalStatusValues[requestBody.approvalStatus]
                    });
                }

                // Set next approver ID
                if (requestBody.nextapproverId) {
                    regRecord.setValue({
                        fieldId: 'custrecord_hr_attend_regular_nxt_approve',
                        value: requestBody.nextapproverId
                    });
                }

                // Setting additional fields
                regRecord.setValue({
                    fieldId: 'custrecord_hr_attend_regular_respons_cod',
                    value: 200
                });

                regRecord.setValue({
                    fieldId: 'custrecord_hr_attend_regular_pros_status',
                    value: 2
                });

                regRecord.setValue({
                    fieldId: 'custrecord_hr_attend_regular_respons_sts',
                    value: 'Success'
                });

                regRecord.setValue({
                    fieldId: 'custrecord_hr_attend_regular_msg',
                    value: 'Record created successfully'
                });

                regRecord.setValue({
                    fieldId: 'custrecord_hr_attend_regular_api_url',
                    value: apiUrl
                });

                regRecord.setValue({
                    fieldId: 'custrecord_hr_attend_regular_api_mthod',
                    value: apiMethod
                });

                regRecord.setValue({
                    fieldId: 'custrecord_hr_attend_regular_json_data',
                    value: JSON.stringify(requestBody)
                });

                var recordId = regRecord.save();
                log.debug('Record created successfully', recordId);

                results.push({
                    Status: true,
                    StatusCode: 200,
                    Message: 'Success',
                    Response: 'Record created successfully',
                    InternalId: recordId,
                    ErrorMessage: null
                });
            }
        } catch (e) {
            log.error('Error processing requests', e);
            var errorMessage = (e && e.message) ? e.message : 'Unknown error';
            results.push({
                Status: false,
                StatusCode: 400,
                Message: 'Error',
                ErrorMessage: errorMessage
            });
        }

        return results;
    }

    return {
        post: createRegularizationRecords,
    };
});
