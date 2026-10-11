/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/record', 'N/error', 'N/log', 'N/format'], function (record, error, log, format) {

    function createLeaveRecords(context) {
        log.debug('context', JSON.stringify(context));

        var requests = context; 
        var customRecordType = 'customrecord_hris_pay_slip_request';
        var apiUrl = 'https://11951030.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=629&deploy=1';
        var apiMethod = 'POST';

        var fieldMapping = {
            "requestDate": "custrecord_hris_payslip_req_dt",
            "employeeId": "custrecord_hris_payslip_req_emp",
            "startDate": "custrecord_hris_psr_start_date",
            "endDate": "custrecord_hris_psr_end_date",
            "payGroup": "custrecord_hris_psr_paygroup",
            "emailId": "custrecord_hris_payslip_emailid",
            "Status": "custrecord_hris_payslip_status",
            "notes": "custrecord_hris_payslip_notes",
            "hrComments": "custrecord_hris_payslip_comments",
            "essReference": "custrecord_hris_payslip_reference"
        };

        var mandatoryFields = [
            "employeeId", 
            "startDate",
            "endDate",
            "payGroup",
            "essReference"
        ];

        var statusValues = {
            "Open": 1,
            "Rejected": 2,
            "Close": 3,
            "Information Needed": 4
        };

        var results = [];

        for (var i = 0; i < requests.length; i++) {
            var requestBody = requests[i];
            log.debug('Processing request', JSON.stringify(requestBody));

            try {
                // Validate mandatory fields
                for (var j = 0; j < mandatoryFields.length; j++) {
                    var field = mandatoryFields[j];
                    if (!requestBody[field]) {
                        throw error.create({
                            name: 'MISSING_REQUIRED_FIELD',
                            message: 'Missing required field: ' + field
                        });
                    }
                }

                // Convert and validate status field
                var statusValue = statusValues[requestBody.Status];
                if (statusValue === undefined) {
                    throw error.create({
                        name: 'INVALID_STATUS',
                        message: 'Invalid status value: ' + requestBody.Status
                    });
                }

                var payslipReqRecord = record.create({
                    type: customRecordType,
                    isDynamic: true,
                });

                // Set fields dynamically
                for (var key in fieldMapping) {
                    if (fieldMapping.hasOwnProperty(key) && requestBody[key]) {
                        var value = requestBody[key];
                        if (key === "requestDate" || key === "startDate" || key === "endDate") {
                            value = format.parse({
                                value: value,
                                type: format.Type.DATE
                            });
                        } else if (key === "Status") {
                            value = statusValue;
                        }
                        payslipReqRecord.setValue({
                            fieldId: fieldMapping[key],
                            value: value
                        });
                    }
                }

                // Set the additional fields
                payslipReqRecord.setValue({
                    fieldId: 'custrecord_hris_payslip_resp_code',
                    value: 200
                });

                var statusField = 'Success' ? 2 : 3;  
                payslipReqRecord.setValue({
                    fieldId: 'custrecord_hris_payslip_process_status',
                    value: statusField
                });

                payslipReqRecord.setValue({
                    fieldId: 'custrecord_hris_payslip_resp_status',
                    value: 'Success'
                });

                payslipReqRecord.setValue({
                    fieldId: 'custrecord_hris_payslip_resp_message',
                    value: 'Record created successfully'
                });

                payslipReqRecord.setValue({
                    fieldId: 'custrecord_hris_payslip_api_url',
                    value: apiUrl
                });

                payslipReqRecord.setValue({
                    fieldId: 'custrecord_hris_payslip_api_method',
                    value: apiMethod
                });

                payslipReqRecord.setValue({
                    fieldId: 'custrecord_hris_payslip_json_data',
                    value: JSON.stringify(requestBody)
                });

                // Save the record and get the internal ID
                var recordId = payslipReqRecord.save({                
                            enableSourcing : false,                
                            ignoreMandatoryFields : true 
                });
                log.debug('recordId', recordId);

                results.push({
                    Status: true,
                    StatusCode: 200,
                    Message: 'Success',
                    Response: 'Record created successfully',
                    InternalId: recordId,
                    ErrorMessage: null
                });
            } catch (e) {
                log.error('Error creating leave record', e);
                var errorMessage = (e && e.message) ? e.message : 'Unknown error';
                results.push({
                    Status: false,
                    StatusCode: 400,
                    Message: 'Error',
                    ErrorMessage: errorMessage
                });
            }
        }

        return results;
    }

    return {
        post: createLeaveRecords,
    };
});
