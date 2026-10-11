/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/query', 'N/log', 'N/https', 'N/record', 'N/runtime', 'N/file'], function (query, log, https, record, runtime, file) {

    function execute(context) {
        // Get the current script object to fetch parameters
        var announcementId = runtime.getCurrentScript().getParameter({ name: 'custscript_announcement_id' }) || "";

        if (!announcementId) {
            log.error("Missing Parameter", "custscript_announcement_id is not provided.");
            return;
        }

        var apiUrl = "https://mobapp.nijatech.com:6000/api/mobileapp/addannouncement";
        var apiMethod = "POST";

        // SuiteQL query with proper string concatenation
        var announcementQuery =
            "SELECT " +
            "A.id AS internalid, " +
            "A.custrecord_hris_announce_title AS title, " +
            "A.custrecord_hris_announce_message AS message, " +
            "TO_CHAR(A.custrecord_hris_announce_sdate, 'YYYY-MM-DD') AS start_date, " +
            "TO_CHAR(A.custrecord_hris_announce_edate, 'YYYY-MM-DD') AS end_date, " +
            "A.custrecord_hris_announce_priority AS priority, " +
            "A.custrecord_hris_announce_attachment AS attachment, " +
            "A.custrecord_hris_announce_is_active AS is_active, " +
            "A.custrecord_hris_announce_audience AS audience_, " +
            "BUILTIN.DF(A.custrecord_hris_announce_audience) AS audience_names_ " +
            "FROM customrecord_njt_company_announcements A " +
            "WHERE A.id = " + announcementId;

        log.debug("announcementQuery", announcementQuery);

        var resultSet = query.runSuiteQL({ query: announcementQuery });
        var rows = resultSet.asMappedResults();

        if (!rows.length) {
            log.error("No Data", "Query returned no results");
            return;
        }

        log.debug("Query Results", JSON.stringify(rows));

        // Final JSON structure
        var finalData = {
            internalid: rows[0].internalid || null,
            title: rows[0].title || null,
            employees: [],
            data: []
        };

        // Combine audience IDs & names
        var employeeIds = rows[0].audience_ ? rows[0].audience_.split(",") : [];
        var employeeNames = rows[0].audience_names_ ? rows[0].audience_names_.split(",") : [];

        for (var i = 0; i < employeeIds.length; i++) {
            finalData.employees.push({
                employeeId: employeeIds[i].trim() || "",
                emp_name: employeeNames[i] ? employeeNames[i].trim() : ""
            });
        }

        // Populate the data array with attachment URL
        rows.forEach(function (ann) {
            var attachmentId = ann.attachment || null;
            var attachmentUrl = "";

            // Generate attachment URL if attachmentId exists
            if (attachmentId) {
                try {
                    var fileObj = file.load({ id: attachmentId });

                    // Set file to online if not already
                    if (!fileObj.isOnline) {
                        fileObj.isOnline = true;
                        fileObj.save();
                    }

                    // Construct URL using the file's URL
                    attachmentUrl = "https://11951030.app.netsuite.com" + fileObj.url;
                } catch (e) {
                    log.error("Error loading attachment file for ID " + attachmentId, e.message);
                }
            }

            finalData.data.push({
                message: ann.message || "",
                start_date: ann.start_date || "",
                end_date: ann.end_date || "",
                priority: ann.priority || 0,
                attachmentID: ann.attachment || 0,
                attachmentURL: attachmentUrl || "", // Use generated URL
                is_active: ann.is_active || false
            });
        });

        if (finalData.data.length > 0) {
            var jsonData = JSON.stringify(finalData);
            log.debug("Final JSON for API", jsonData);
            sendToMobileAPI(apiUrl, jsonData, apiMethod, finalData.internalid);
        } else {
            log.error("No Data", "No valid announcement data to send to API");
        }
    }

    function sendToMobileAPI(apiUrl, jsonData, apiMethod, internalId) {
        var response = null;
        var responseBody = {};

        try {
            // DYNAMIC TOKEN FETCHING LOGIC
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
            var token = authBody.jwtoken;
            log.debug("Dynamic Token Retrieved", token);

            // MAIN API CALL WITH RETRIEVED TOKEN
            response = https.post({
                url: apiUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: jsonData
            });

            log.debug("API Response Code", response.code);
            log.debug("API Response Body", response.body);

            if (response.body) {
                try {
                    responseBody = JSON.parse(response.body);
                } catch (parseErr) {
                    log.error("Response Parse Error", parseErr.message);
                }
            }

        } catch (apiErr) {
            log.error("API Call Failed", apiErr.message);
        }

        // Update the announcement record
        try {
            var announcementRec = record.load({
                type: "customrecord_njt_company_announcements",
                id: internalId,
                isDynamic: true
            });

            var isSuccess = response && response.code >= 200 && response.code < 300;
            var statusField = isSuccess ? 2 : 3;

            announcementRec.setValue({ fieldId: "custrecord_hris_announce_process_status", value: statusField });
            announcementRec.setValue({ fieldId: "custrecord_hris_announce_response_status", value: isSuccess ? "Success" : "Failure" });
            announcementRec.setValue({ fieldId: "custrecord_hris_announce_response_messag", value: responseBody.message || "No message received" });
            announcementRec.setValue({ fieldId: "custrecord_hris_announce_response_code", value: response ? response.code : 0 });
            announcementRec.setValue({ fieldId: "custrecord_hris_announce_api_method", value: apiMethod });
            announcementRec.setValue({ fieldId: "custrecord_hris_announce_api_url", value: apiUrl });
            announcementRec.setValue({ fieldId: "custrecord_hris_announce_json_date", value: jsonData });

            announcementRec.save({ enableSourcing: true, ignoreMandatoryFields: true });

            log.debug("Announcement record updated successfully", internalId);
        } catch (recErr) {
            log.error("Record Update Failed", "Record ID: " + internalId + ", Error: " + recErr.message);
        }
    }

    return {
        execute: execute
    };
});