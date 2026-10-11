/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/https', 'N/log','N/runtime'], function (record, search, https, log,runtime) {
    function execute(context) {
        try {
             var attenregid = runtime.getCurrentScript().getParameter({ name: "custscript_hris_regattenid" });
            

            log.debug("Atten Regularisation ID:", attenregid);
           
            if (!attenregid ) {
                log.error("Missing Parameter", "Attendance Regularization is missing.");
                return;
            }
            var attendanceRegSearch = search.create({
                type: "customrecord_hr_attend_regularization",
                filters: [
                    ["custrecord_hr_attend_reg_approval_sync", "is", "F"],
                    "AND",
                    ["custrecord_hr_attend_reg_approve_status", "anyof", ["2", "3"]],
                    "AND",
                    ["isinactive", "is", "F"],
                    "AND",
                    ["internalid", "anyof", attenregid]
                ],
                columns: [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "custrecord_hris_attendance_user_type", label: "User Type" }),
                    search.createColumn({ name: "custrecord_hris_attendance_current_aprl", label: "Approver ID" }),
                    search.createColumn({ name: "custrecord_hr_attend_reg_approve_status", label: "Approval Status" }),
                    search.createColumn({ name: "custrecord_hris_attendance_approver", label: "Approver Text" }),


                ]
            });

            var searchResultCount = attendanceRegSearch.runPaged().count;
            log.debug("Search Result Count", searchResultCount);

            attendanceRegSearch.run().each(function (result) {
                var attendRegularRequestId = result.getValue({ name: "internalid" });
                var approvalUserType = result.getText({ name: "custrecord_hris_attendance_user_type" });
                var approverId = result.getValue({ name: "custrecord_hris_attendance_current_aprl" });
                var approvalUser = result.getText({ name: "custrecord_hris_attendance_current_aprl" });
                var approvalStatus = result.getText({ name: "custrecord_hr_attend_reg_approve_status" });
                var approvertext = result.getValue({ name: "custrecord_hris_attendance_approver" })

                var payload = {
                    type: "Regularization",
                    internalid: attendRegularRequestId,
                    isstatus: approvalStatus || "",
                    approvalLevel: "",
                    approvalUserType: approvalUserType || "",
                    approverid: approverId || "",
                    approvername: approvalUser || "",
                    status: approvalStatus || "",
                    remarks: approvertext|| "",
                    reasonforRejection: ""
                };

                log.debug("Payload", payload);

                var response = sendToAPI(payload);

                if (response.code === 200) {
                    markAsSynced(attendRegularRequestId);
                }

                return true; // Continue to the next result
            });
        } catch (e) {
            log.error("Error in Scheduled Script Execution", e.message);
        }
    }

    function sendToAPI(payload) {
        var token='';
            var authData = {
    "email": "elevate@gmail.com",
    "password": "elevate@123"
            };
            var authJsonData = JSON.stringify(authData);
            log.emergency('authJsonData',authJsonData)

            var authResponse = https.post({
                url: "https://mobapp.nijatech.com:5612/api/netsuite/gettoken", // Update with your actual login API URL
                headers: {
                    "Content-Type": "application/json"
                },
                body: authJsonData
            });
            log.emergency('authResponse',authResponse)
            var authBody = JSON.parse(authResponse.body);

             token = authBody.jwtoken;
            log.emergency('Token',token);

      //  var url = 'https:// mobapp.nijatech.com:5500/api/netsuite/updateattendance';
        var url ='https://mobapp.nijatech.com:5612/api/netsuite/updatereqularization'
        var headers = {
            'Content-Type': 'application/json',
           // 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImhhbGFAZ21haWwuY29tIiwiaWF0IjoxNzcxNTY2MTQxLCJleHAiOjIwODcxNDIxNDF9.TFTUIoPmKyhO5rUC-C2s-jVWh0gl1EIhv7zz-uCLXxw'
              "Authorization": "Bearer " + token,
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

    function markAsSynced(attendRegularRequestId) {
        try {
            var attendanceRegRecord = record.load({
                type: 'customrecord_hr_attend_regularization',
                id: attendRegularRequestId
            });

            attendanceRegRecord.setValue({
                fieldId: 'custrecord_hr_attend_reg_approval_sync',
                value: true
            });

            attendanceRegRecord.save();
            log.debug("Marked as Synced", attendRegularRequestId);
        } catch (e) {
            log.error("Error Marking Record as Synced", e.message);
        }
    }

    return {
        execute: execute
    };
});
