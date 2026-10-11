/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/https', 'N/log', 'N/runtime', 'N/format'],
    function(record, https, log, runtime, format) {

        function execute(context) {
            // 1. Retrieve the parameter passed from the User Event script
            var assetInternalId = runtime.getCurrentScript().getParameter('custscript_asset_request_internalid');
            log.debug("Retrieved internalId", assetInternalId);

            // Validation: Check if ID exists
            if (!assetInternalId) {
                log.error("Missing Parameters", "Asset Request Internal ID not found");
                return;
            }

            try {
                // 2. Load the Asset Request Record
                var rec = record.load({
                    type: 'customrecord_hris_asset_req_form', // Record Type
                    id: assetInternalId
                });

                // 3. Get Field Values based on your mapping
                
                // "name" -> Mapped to assetCode and assetSerialNo
                var recordName = rec.getValue('name'); 
                
                // "custrecord_hris_asset_name" -> assetName
                var assetName = rec.getText('custrecord_hris_asset_name'); 
                
                // "custrecord_hris_asset_type" -> assetType
                var assetType = rec.getText('custrecord_hris_asset_type');
                
                // "custrecord_hris_asset_req_date" -> assignDate
                // Using getText to ensure we send the string representation (e.g., "18/12/2025")
                var assignDate = rec.getText('custrecord_hris_asset_req_date');
                if (!assignDate) {
                    assignDate = ""; // Handle null/empty dates
                }

                // "custrecord_hris_asset_approval_status" -> status
                var approvalStatus = rec.getText('custrecord_hris_asset_approval_status');

                // 4. Construct Payload
                // Requirement: assetDetails must be an ARRAY of objects
                var payloadObj = {
                    internalid: assetInternalId.toString(),
                    assetCode: recordName || "",      
                    assetName: assetName || "",
                    assetType: assetType || "",
                    assetSerialNo: recordName || "",  
                    assignDate: assignDate,
                    status: approvalStatus || ""
                };

                // Wrapping the object inside the 'assetDetails' array
              
                log.debug("Generated Payload", JSON.stringify(payloadObj));

                // 5. Define API Configuration
                var apiUrl = "https://mobapp.nijatech.com:6000/api/netsuite/applyassetrequest";
                var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6IndpbnN0YXJAZ21haWwuY29tIiwiaWF0IjoxNzc0NTkyMjA0fQ.CheWjLmUhSWYikM5ijg6EXiqUqN0jf850NZlFpn6y_A";

                // 6. Send POST Request
                var response = https.post({
                    url: apiUrl,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(payloadObj)
                });

                log.debug("API Response Headers", response.headers);
                log.debug("API Response Body", response.body);

                // 7. Parse Response
                var responseBody;
                try {
                    responseBody = JSON.parse(response.body);
                } catch (e) {
                    log.error('Failed to parse response body', response.body);
                    responseBody = { status: false, message: "JSON Parse Error" };
                }

                // 8. Update the NetSuite Record with API Response results
                // Loading record again to ensure we have the latest instance for saving
                var assetRecord = record.load({
                    type: 'customrecord_hris_asset_req_form',
                    id: assetInternalId
                });

                // Logic based on API success/failure
                if (responseBody.status === true) {
                    // Update Process Status (e.g., 2 = Processed)
                    assetRecord.setValue({
                        fieldId: 'custrecord_hris_asset_pros_stat', 
                        value: 2, 
                        ignoreFieldChange: true
                    });
                    // Update Response Status Text
                    assetRecord.setValue({
                        fieldId: 'custrecord_hris_asset_resp_stat',
                        value: "Success"
                    });
                } else {
                    // Update Process Status (e.g., 3 = Failed)
                    assetRecord.setValue({
                        fieldId: 'custrecord_hris_asset_pros_stat',
                        value: 3, 
                        ignoreFieldChange: true
                    });
                    // Update Response Status Text
                    assetRecord.setValue({
                        fieldId: 'custrecord_hris_asset_resp_stat',
                        value: "Failed"
                    });
                }

                // Store Payload and Response Details
                assetRecord.setValue({
                    fieldId: 'custrecord_hris_asset_json_data',
                    value: JSON.stringify(payloadObj)
                });
                
                // Storing Response Code (e.g., 200, 400)
                assetRecord.setValue({
                    fieldId: 'custrecord_hris_asset_asset_req',
                    value: response.code
                });
                
                assetRecord.setValue({
                    fieldId: 'custrecord_hris_asset_api_url',
                    value: apiUrl
                });
                
                assetRecord.setValue({
                    fieldId: 'custrecord_hris_asset_resp_msg',
                    value: responseBody.message || "No message returned"
                });
                
                assetRecord.setValue({
                    fieldId: 'custrecord_hris_asset_api_method',
                    value: "Post"
                });

                // 9. Save the Record
                assetRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });

                log.debug({
                    title: "Asset Record Updated Successfully",
                    details: "ID: " + assetInternalId
                });

                return true;

            } catch (e) {
                log.error("Error in Asset Request Scheduled Script", e);
            }
        }

        return {
            execute: execute
        };
    });