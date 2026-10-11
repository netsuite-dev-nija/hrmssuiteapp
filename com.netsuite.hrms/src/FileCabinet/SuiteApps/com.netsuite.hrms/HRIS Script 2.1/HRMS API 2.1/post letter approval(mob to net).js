/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/https', 'N/log'], function (record, search, https, log) {
    function execute(context) {
        try {
            // DYNAMIC TOKEN FETCHING LOGIC
            var token = "";
            try {
                var authData = {
                    "email": "elevate@gmail.com",
                    "password": "elevate@123"
                };
                var authJsonData = JSON.stringify(authData);

                var authResponse = https.post({
                    url: "https://mobapp.nijatech.com:5612/api/netsuite/gettoken",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: authJsonData
                });

                var authBody = JSON.parse(authResponse.body);
                token = authBody.jwtoken;
                log.debug("Dynamic Token Retrieved", token);
            } catch (tokenErr) {
                log.error("Error retrieving dynamic token", tokenErr.message);
                return; // Exit execution if token cannot be retrieved
            }

            var letterRequestSearch = search.create({
                type: "customrecord_hris_lve_letter_req",
                filters: [
                    ["custrecord_hris_letter_approval_status", "anyof", ["2", "3"]],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "custrecord_hris_let_req_approval_level", label: "Approval Level" }),
                    search.createColumn({ name: "custrecord_hris_approval_letter_type", label: "Letter Type" }),
                    search.createColumn({ name: "custrecord_hris_letter_approval_user", label: "Approval User" }),
                    search.createColumn({ name: "custrecord_hris_letreq_approvl_remarks", label: "Remarks" }),
                    search.createColumn({ name: "custrecord_hris_letter_approval_status", label: "Approval Status" })
                ]
            });

            var searchResultCount = letterRequestSearch.runPaged().count;
            log.debug("Search Result Count", searchResultCount);

            letterRequestSearch.run().each(function (result) {
                var letterRequestId = result.getValue({ name: "internalid" });
                var approvalLevel = result.getValue({ name: "custrecord_hris_let_req_approval_level" });
                var approvalUserType = result.getText({ name: "custrecord_hris_approval_letter_type" });
                var approverId = result.getValue({ name: "custrecord_hris_letter_approval_user" });
                var approvalUser = result.getText({ name: "custrecord_hris_letter_approval_user" });
                var approvalStatus = result.getText({ name: "custrecord_hris_letter_approval_status" });
                var remarks = result.getValue({ name: "custrecord_hris_letreq_approvl_remarks" });
                

                var payload = {
                    type: "Letter",
                    internalid: letterRequestId,
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

                // Pass the dynamic token to the sendToAPI function
                var response = sendToAPI(payload, token);

                if (response.code === 200) {
                    markAsSynced(letterRequestId);
                }

                return true; // Continue to the next result
            });
        } catch (e) {
            log.error("Error in Scheduled Script Execution", e.message);
        }
    }

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

    function markAsSynced(letterRequestId) {
        try {
            var letterRequestRecord = record.load({
                type: 'customrecord_hris_lve_letter_req',
                id: letterRequestId
            });

            letterRequestRecord.setValue({
                fieldId: 'custrecord_hris_letter_approval_sync',
                value: true
            });

            letterRequestRecord.save();
            log.debug("Marked as Synced", letterRequestId);
        } catch (e) {
            log.error("Error Marking Record as Synced", e.message);
        }
    }

    return {
        execute: execute
    };
});