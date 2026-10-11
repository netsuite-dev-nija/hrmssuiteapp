/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/https', 'N/log'], function (record, search, https, log) {
    
    function execute(context) {
        try {
            // Get the dynamic token once at the start of the execution
            var token = getToken();
            if (!token) {
                log.error("Authentication Failed", "Could not retrieve jwtoken. Aborting execution.");
                return;
            }

            var assetRequestSearch = search.create({
                type: "customrecord_hris_asset_req_form",
                filters: [
                    ["custrecord_hris_asset_approval_sync", "is", "F"],
                    "AND",
                    ["custrecord_hris_asset_approval_status", "anyof", ["2", "3"]],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "custrecord_hris_asset_approval_lvl", label: "Approval Level" }),
                    search.createColumn({ name: "custrecord_hris_asset_approval_user_type", label: "Approval User Type" }),
                    search.createColumn({ name: "custrecord_hris_asset_approval_user", label: "Approval User" }),
                    search.createColumn({ name: "custrecord_hris_asset_approval_status", label: "Approval Status" }),
                    search.createColumn({ name: "custrecord_hris_asset_approval_remarks", label: "Remarks" })
                ]
            });

            var searchResultCount = assetRequestSearch.runPaged().count;
            log.debug("Search Result Count", searchResultCount);

            assetRequestSearch.run().each(function (result) {
                var assetRequestId = result.getValue({ name: "internalid" });
                var approvalLevel = result.getValue({ name: "custrecord_hris_asset_approval_lvl" });
                var approvalUserType = result.getText({ name: "custrecord_hris_asset_approval_user_type" });
                var approverId = result.getValue({ name: "custrecord_hris_asset_approval_user" });
                var approvalUser = result.getText({ name: "custrecord_hris_asset_approval_user" });
                var approvalStatus = result.getText({ name: "custrecord_hris_asset_approval_status" });
                var remarks = result.getValue({ name: "custrecord_hris_asset_approval_remarks" });

                var payload = {
                    type: "Asset",
                    internalid: assetRequestId,
                    isstatus: approvalStatus || "",
                    approvalLevel: approvalLevel || "",
                    approvalUserType: approvalUserType || "",
                    approverid: approverId || "",
                    approvername: approvalUser || "",
                    status: approvalStatus || "",
                    remarks: remarks || "",
                    reasonforRejection: ""
                };

                log.debug("Payload", payload);

                // Pass the dynamic token to the send function
                var response = sendToAPI(payload, token);

                if (response.code === 200) {
                    markAsSynced(assetRequestId);
                }

                return true; // Continue to the next result
            });
        } catch (e) {
            log.error("Error in Scheduled Script Execution", e.message);
        }
    }

    /**
     * Retrieves the dynamic token from the authentication API
     */
    function getToken() {
        try {
            var authData = {
                "email": "elevate@gmail.com",
                "password": "elevate@123"
            };
            
            var authResponse = https.post({
                url: "https://mobapp.nijatech.com:5612/api/netsuite/gettoken",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(authData)
            });

            if (authResponse.code === 200) {
                var authBody = JSON.parse(authResponse.body);
                return authBody.jwtoken;
            } else {
                log.error("Token API Error", "Status: " + authResponse.code + " Body: " + authResponse.body);
                return null;
            }
        } catch (e) {
            log.error("Error retrieving token", e.message);
            return null;
        }
    }

    /**
     * Sends the payload using the dynamically retrieved token
     */
    function sendToAPI(payload, token) {
        var url = 'https://mobapp.nijatech.com:5612/api/netsuite/updateleavehistory';
        var headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        };

        try {
            var response = https.post({
                url: url,
                headers: headers,
                body: JSON.stringify(payload)
            });
            log.debug("API Response", response.body);
            return { code: response.code, body: response.body };
        } catch (e) {
            log.error("Error Sending to API", e.message);
            return { code: e.code || 500, body: e.message };
        }
    }

    function markAsSynced(assetRequestId) {
        try {
            var assetRequestRecord = record.load({
                type: 'customrecord_hris_asset_req_form',
                id: assetRequestId
            });

            assetRequestRecord.setValue({
                fieldId: 'custrecord_hris_asset_approval_sync',
                value: true
            });

            assetRequestRecord.save();
            log.debug("Marked as Synced", assetRequestId);
        } catch (e) {
            log.error("Error Marking Record as Synced", e.message);
        }
    }

    return {
        execute: execute
    };
});