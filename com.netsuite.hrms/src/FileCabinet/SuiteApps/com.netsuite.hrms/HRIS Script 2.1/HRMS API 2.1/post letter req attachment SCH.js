/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/file', 'N/https', 'N/log', 'N/runtime', 'N/url'],
    function(record, file, https, log, runtime, url) {

        function execute(context) {

            // ── STEP 1: Get Script Parameters ───────────────────────────────────
            var letterInternalId = runtime.getCurrentScript().getParameter('custscript_letter_req_internalid');
            log.debug("Retrieved internalId from parameters", letterInternalId);

            var attachmentId = runtime.getCurrentScript().getParameter('custscript_letter_attachment_id');

            if (!letterInternalId || !attachmentId) {
                log.error("Missing Parameters", "Required parameters not found");
                return;
            }

            try {

                // ── STEP 2: Load Letter Request Record ───────────────────────────
                var rec = record.load({
                    type: 'customrecord_hris_lve_letter_req',
                    id: letterInternalId
                });

                var requestapplicationno = rec.getValue('name');
                var date                 = rec.getValue('custrecord_hris_letreq_request_date_cre');
                var lettertypecode       = rec.getValue('custrecord_hris_letreq_certificate_type');
                var lettertypename       = rec.getText('custrecord_hris_letreq_certificate_type');
                var letteraddresstoname  = rec.getValue('custrecord_hris_letreq_letter_addressed');
                var purpose              = rec.getValue('custrecord_hris_letreq_purposed_requeste');
                var attachmentUrl        = '';
                var createdBy            = rec.getValue('custrecord_hris_letreq_created_by');
                var createdDate          = rec.getValue('custrecord_hris_letreq_request_date_cre');
                var toEmpID              = rec.getValue('custrecord_hris_letreq_employee_name');
                var toEmpName            = rec.getText('custrecord_hris_letreq_employee_name');
                var approvalstatus       = rec.getText('custrecord_hris_letter_approval_status');

                // ── STEP 3: Load Attachment File and Make it Online ──────────────
                var fileObj = file.load({ id: attachmentId });
                if (!fileObj.isOnline) {
                    fileObj.isOnline = true;
                    fileObj.save();
                }

                // ── STEP 4: Construct the File URL ───────────────────────────────
                var accountId = runtime.accountId;
                attachmentUrl = 'https://' + accountId + '.app.netsuite.com' + fileObj.url;

                // ── STEP 5: Get Auth Token ───────────────────────────────────────
                var authData = {
                    email:    "elevate@gmail.com",
                    password: "elevate@123"
                };

                var authResponse = https.post({
                    url:     "https://mobapp.nijatech.com:5612/api/netsuite/gettoken",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify(authData)
                });

                log.debug("Auth Response Code", authResponse.code);
                log.debug("Auth Response Body", authResponse.body);

                // ── STEP 6: Parse Auth Response ──────────────────────────────────
                var authBody;
                try {
                    authBody = JSON.parse(authResponse.body);
                } catch (parseErr) {
                    log.error("Failed to parse auth response", authResponse.body);
                    return;
                }

                // ── STEP 7: Extract Token — key is "jwtoken" ─────────────────────
                var token = authBody.jwtoken
                         || authBody.token
                         || authBody.accessToken
                         || authBody.access_token
                         || authBody.jwt
                         || (authBody.data && authBody.data.token)
                         || null;

                log.debug("Extracted Token", token);

                if (!token) {
                    log.error("Token Missing", "Auth response did not contain a valid token. Full body: " + authResponse.body);
                    return;
                }

                // ── STEP 8: Build Payload ────────────────────────────────────────
                var payload = {
                    internalid:           letterInternalId,
                    requestapplicationno: requestapplicationno,
                    date:                 date,
                    lettertypecode:       lettertypecode,
                    lettertypename:       lettertypename,
                    letteraddresstocode:  "",
                    letteraddresstoname:  letteraddresstoname,
                    purpose:              purpose,
                    attachmentUrl:        attachmentUrl,
                    createdby:            createdBy,
                    createdDate:          createdDate,
                    toEmpID:              toEmpID,
                    toEmpName:            toEmpName,
                    isstatus:             approvalstatus
                };

                log.debug("Payload", payload);

                // ── STEP 9: Call Main API ────────────────────────────────────────
                var response = https.post({
                    url:     "https://mobapp.nijatech.com:5612/api/netsuite/applyletterrequest",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type":  "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                log.debug("API Response Code", response.code);
                log.debug("API Response Body", response.body);

                // ── STEP 10: Parse Main API Response ─────────────────────────────
                var responseBody;
                try {
                    responseBody = JSON.parse(response.body);
                } catch (e) {
                    log.error("Failed to parse response body", response.body);
                    throw new Error("Invalid JSON response: " + e.message);
                }

                log.debug("Parsed responseBody", responseBody);

                // ── STEP 11: Load Record Again to Update Status ──────────────────
                var letterreqrecord = record.load({
                    type: 'customrecord_hris_lve_letter_req',
                    id: letterInternalId
                });

                // ── STEP 12: Set Processed / Failed Status ───────────────────────
                if (responseBody.status === true) {
                    letterreqrecord.setValue({
                        fieldId:            'custrecord_hris_letreq_pros_sts',
                        value:              2, // Processed
                        ignoreFieldChange:  true
                    });
                    letterreqrecord.setValue({
                        fieldId: 'custrecord_hris_letreq_resp_status',
                        value:   "Success"
                    });
                } else {
                    letterreqrecord.setValue({
                        fieldId:           'custrecord_hris_letreq_pros_sts',
                        value:             3, // Failed
                        ignoreFieldChange: true
                    });
                    letterreqrecord.setValue({
                        fieldId: 'custrecord_hris_letreq_resp_status',
                        value:   "Failed"
                    });
                }

                // ── STEP 13: Save API Request and Response Details ───────────────
                letterreqrecord.setValue({
                    fieldId: 'custrecord_hris_letreq_json_data',
                    value:   JSON.stringify(payload)
                });
                letterreqrecord.setValue({
                    fieldId: 'custrecord_hris_letreq_resp_code',
                    value:   response.code
                });
                letterreqrecord.setValue({
                    fieldId: 'custrecord_hris_letreq_api_url',
                    value:   response.url
                });
                letterreqrecord.setValue({
                    fieldId: 'custrecord_hris_letreq_resp_msg',
                    value:   responseBody.message
                });
                letterreqrecord.setValue({
                    fieldId: 'custrecord_hris_letreq_api_mtho',
                    value:   "Post"
                });

                // ── STEP 14: Save the Record ─────────────────────────────────────
                letterreqrecord.save({
                    enableSourcing:       true,
                    ignoreMandatoryFields: true
                });

                log.debug("Record Updated Successfully", "Letter record ID: " + letterInternalId);
                return true;

            } catch (e) {
                log.error("Error in Scheduled Script Execution", e);
            }
        }

        return { execute: execute };
    });