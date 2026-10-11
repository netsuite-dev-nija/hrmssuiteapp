/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/https', 'N/record', 'N/log', 'N/file', 'N/url', 'N/format'], function(https, record, log, file, url, format) {

    function afterSubmit(context) {
        // Trigger on Create and Edit
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
            return;
        }

        try {
            var recordId = context.newRecord.id;
            var recordType = context.newRecord.type;

            // FIX: Load the record manually to enable .getText()
            // This avoids the SSS_INVALID_API_USAGE error
            var newRec = record.load({
                type: recordType,
                id: recordId
            });

            // 1. Prepare Authentication Data
            var authData = {
                "email": "elevate@gmail.com",
                "password": "elevate@123"
            };

            var authResponse = https.post({
                url: "https://mobapp.nijatech.com:5612/api/netsuite/gettoken",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(authData)
            });

            if (authResponse.code !== 200) {
                log.error("Auth Failed", "Code: " + authResponse.code + " Body: " + authResponse.body);
                return;
            }

            var authBody = JSON.parse(authResponse.body);
            var token = authBody.jwtoken;

            // 2. Handle Attachment URL
            var fullAttachmentUrl = "";
            var fileId = newRec.getValue('custrecord_hris_exp_claim_frm_attachment');
            if (fileId) {
                try {
                    var fileObj = file.load({ id: fileId });
                    var domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
                    fullAttachmentUrl = 'https://' + domain + fileObj.url;
                } catch (err) {
                    log.error("File Error", "Could not load file ID: " + fileId);
                }
            }

            // 3. Format Dates
            var rawDate = newRec.getValue('custrecord_hris_exp_claim_frm_date');
            var isoDate = rawDate ? new Date(rawDate).toISOString() : "";
            
            var today = new Date();
            var createdDateFormatted = format.format({ value: today, type: format.Type.DATE });

            // 4. Construct Payload
            // Using newRec.getText() now works because we used record.load()
            var payload = {
                "internalid": recordId.toString(),
                "requestapplicationno": newRec.getValue('name') || ("MOBREIM-" + recordId),
                "date": isoDate,
                "expensecategorycode": newRec.getValue('custrecord_hris_exp_claim_frm_claim_type'),
                "expensecategoryname": newRec.getText('custrecord_hris_exp_claim_frm_claim_type'),
                "amount": parseFloat(newRec.getValue('custrecord_hris_exp_claim_frm_amount')) || 0,
                "description": newRec.getValue('custrecord_hris_exp_claim_frm_remarks'),
                "attachmentUrl": fullAttachmentUrl,
                "iscancelled": "N",
                "isstatus": newRec.getText('custrecord_hris_claim_approval_status1') || "Pending",
                "createdby": parseInt(newRec.getValue('custrecord_hris_exp_claim_frm_employee')),
                "createdDate": createdDateFormatted,
                "toEmpID": parseInt(newRec.getValue('custrecord_hris_exp_claim_frm_employee')),
                "toEmpName": newRec.getText('custrecord_hris_exp_claim_frm_employee'),
                "modifiedby": "",
                "modifiedDate": "",
                "isSync": 0
            };

            var jsonData = JSON.stringify(payload);
            log.debug("Pushing Payload", jsonData);

            // 5. Send data to the external API
            var response = https.post({
                url: "https://mobapp.nijatech.com:5612/api/netsuite/addupdatereimbursement",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: jsonData
            });

            log.debug("Response Code", response.code);
            log.debug("Response Body", response.body);

        } catch (e) {
            log.error("Error in User Event", e.toString());
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});