/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/https', 'N/log'], function (record, search, https, log) {
    function execute(context) {
        try {
            var expenseClaimSearch = search.create({
                type: "customrecord_hris_expense_claim_form",
                filters: [
                    ["custrecord_hris_expense_approval_sync", "is", "F"],
                    "AND",
                    ["custrecord_hris_claim_approval_status1", "anyof", ["2", "3"]],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "custrecord_hris_claim_approval_lvl", label: "Approval Level" }),
                    search.createColumn({ name: "custrecord_hris_claim_approval_user", label: "Approval User" }),
                    search.createColumn({ name: "custrecord_hris_claim_approval_user1", label: "Approval User 1" }),
                    search.createColumn({ name: "custrecord_hris_claim_approval_status1", label: "Approval Status" }),
                    search.createColumn({ name: "custrecord_hris_claim_reason_rejection", label: "Reason for Rejection" }),
                    search.createColumn({ name: "custrecord_hris_exp_claim_frm_remarks", label: "Remarks" })
                ]
            });

            var searchResultCount = expenseClaimSearch.runPaged().count;
            log.debug("Search Result Count", searchResultCount);

            expenseClaimSearch.run().each(function (result) {
                var claimId = result.getValue({ name: "internalid" });
                var approvalLevel = result.getValue({ name: "custrecord_hris_claim_approval_lvl" });
                var approvalUserType = result.getText({ name: "custrecord_hris_claim_approval_user" });
                var approverId = result.getValue({ name: "custrecord_hris_claim_approval_user1" });
                var approverName = result.getText({ name: "custrecord_hris_claim_approval_user1" });
                var approvalStatus = result.getText({ name: "custrecord_hris_claim_approval_status1" });
                var rejectionReason = result.getValue({ name: "custrecord_hris_claim_reason_rejection" });
                var remarks = result.getText({ name: "custrecord_hris_exp_claim_frm_remarks" });

                var payload = {
                    type: "Expense",
                    internalid: claimId,
                    isstatus : approvalStatus || "",
                    approvalLevel: approvalLevel || "",
                    approvalUserType: approvalUserType || "",
                    approverid: approverId || "",
                    approvername: approverName || "",
                    status: approvalStatus || "",
                    remarks: remarks || "",
                    reasonforRejection: rejectionReason || ""
                };

                log.debug("Payload", payload);

                var response = sendToAPI(payload);

                if (response.code === 200) {
                    markAsSynced(claimId);
                }

                return true; // Continue to the next result
            });
        } catch (e) {
            log.error("Error in Scheduled Script Execution", e.message);
        }
    }

    function sendToAPI(payload) {
        var url = 'https://mobapp.nijatech.com:6000/api/netsuite/updateleavehistory';
        var headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6IndpbnN0YXJAZ21haWwuY29tIiwiaWF0IjoxNzc0NTkyMjA0fQ.CheWjLmUhSWYikM5ijg6EXiqUqN0jf850NZlFpn6y_A'
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

    function markAsSynced(claimId) {
        try {
            var expenseClaimRecord = record.load({
                type: 'customrecord_hris_expense_claim_form',
                id: claimId
            });

            expenseClaimRecord.setValue({
                fieldId: 'custrecord_hris_expense_approval_sync',
                value: true
            });

            expenseClaimRecord.save();
            log.debug("Marked as Synced", claimId);
        } catch (e) {
            log.error("Error Marking Record as Synced", e.message);
        }
    }

    return {
        execute: execute
    };
});
