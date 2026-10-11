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
                return; // Exit if token cannot be retrieved
            }

            var leaveApplicationSearch = search.create({
                type: "customrecord_hris_leaveapplication",
                filters: [
                    ["custrecord_hris_lve_synced", "is", "F"],
                    "AND",
                    ["custrecord_hris_lve_hrmsapprovalstatus", "anyof", ["2", "3"]]
                ],
                columns: [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "custrecord_hris_lve_hrmsapprovalstatus", label: "Approval Status" }),
                    search.createColumn({ name: "custrecord_hris_lveapp_appruser", label: "Approver ID" }),
                    search.createColumn({ name: "custrecord_hris_lve_approvertext", label: "Status Text" }),
                    search.createColumn({ name: "custrecord_hris_lveappapprovallevel", label: "Approval Level" }),
                    search.createColumn({ name: "custrecord_hris_lveapp_approvalusrtype", label: "Approval User Type" }),
                    search.createColumn({ name: "custrecord_hris_lveapp_approvalstatus", label: "Approval Status"}),
                    search.createColumn({ name: "custrecord_hris_lve_hrmsreasonforreject", label: "Reason for Rejection" })
                ]
            });

            var searchResultCount = leaveApplicationSearch.runPaged().count;
            log.debug("Search Result Count", searchResultCount);

            leaveApplicationSearch.run().each(function (result) {
                var leaveAppId = result.getValue({ name: "internalid" });
                var status = result.getText({ name: "custrecord_hris_lve_hrmsapprovalstatus" });
                var approvalUser = result.getText({ name: "custrecord_hris_lveapp_appruser" });
                var approvalId = result.getValue({ name: "custrecord_hris_lveapp_appruser" });
                var statusText = result.getValue({ name: "custrecord_hris_lve_approvertext" });
                var approvalLevel = result.getValue({ name: "custrecord_hris_lveappapprovallevel" });
                var approvalUserType = result.getText({ name: "custrecord_hris_lveapp_approvalusrtype" });
                var approvalStatus = result.getText({ name: "custrecord_hris_lve_hrmsapprovalstatus" });
                var rejectionReason = result.getValue({ name: "custrecord_hris_lve_hrmsreasonforreject" });

                var payload = {
                    type: "Leave",
                    isstatus: status,
                    internalid: leaveAppId,
                    remarks: statusText || "",
                    approverid: approvalId || "",
                    approvername: approvalUser || "",
                    approvalLevel: approvalLevel || "",
                    approvalUserType: approvalUserType || "",
                    status: approvalStatus || "",
                    reasonforRejection: rejectionReason || ""
                };

                log.debug("Payload", payload);

                // Pass the dynamic token to the sendToAPI function
                var response = sendToAPI(payload, token);

                if (response.code === 200) {
                    markAsSynced(leaveAppId);
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

    function markAsSynced(leaveAppId) {
        try {
            var leaveAppRecord = record.load({
                type: 'customrecord_hris_leaveapplication',
                id: leaveAppId
            });

            leaveAppRecord.setValue({
                fieldId: 'custrecord_hris_lve_synced',
                value: true
            });

            leaveAppRecord.save();
            log.debug("Marked as Synced", leaveAppId);
        } catch (e) {
            log.error("Error Marking Record as Synced", e.message);
        }
    }

    return {
        execute: execute
    };
});