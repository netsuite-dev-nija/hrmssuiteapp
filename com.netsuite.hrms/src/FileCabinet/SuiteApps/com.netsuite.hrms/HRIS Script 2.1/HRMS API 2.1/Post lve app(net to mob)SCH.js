/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/https', 'N/log', 'N/file', 'N/encode', 'N/runtime', 'N/query'],
    function (record, search, https, log, file, encode, runtime, query) {

        function execute(context) {
          var token = getToken();
            if (!token) {
                log.error('Authentication Failed', 'Could not retrieve dynamic token. Aborting.');
                return;
            }
            var leaveEmpId = runtime.getCurrentScript().getParameter({ name: 'custscript_leave_emp_id' });
            log.debug('API Parameter', leaveEmpId);

            var customrecord_hris_leaveapplicationSearchObj = search.create({
                type: "customrecord_hris_leaveapplication",
                //filters: ["internalid", "is", leaveEmpId],
              filters: [
                    ["internalid", "is", leaveEmpId],
                    "AND",
                    ["isinactive", "anyof", ["T", "F"]] // Ensures both active and inactive records are found
                ],
                columns: [
                    search.createColumn({name: "isinactive", label: "Inactive"}),
                    search.createColumn({ name: "internalid", label: "internalid" }),
                    search.createColumn({ name: "name", label: "leaveApplicationNo" }),
                    search.createColumn({ name: "custrecord_hris_lve_leavetype", label: "leavetypename" }),
                    search.createColumn({ name: "custrecord_hris_lve_leavebalance", label: "leavebalace" }),
                    search.createColumn({ name: "custrecord_hris_lve_fromdate", label: "fromdate" }),
                    search.createColumn({ name: "custrecord_hris_lve_todate", label: "todate" }),
                    search.createColumn({ name: "custrecord_hris_lve_totalnodays", label: "total_no_of_days" }),
                    search.createColumn({ name: "custrecord_hris_lve_supportdocument", label: "FileName" }),
                    search.createColumn({ name: "custrecord_hris_lve_leavereason", label: "reason" }),
                    search.createColumn({ name: "custrecord_hris_lve_airticketrequired", label: "airticketrequired" }),
                    search.createColumn({ name: "custrecord_hris_lve_airticketamount", label: "airticketamount" }),
                    search.createColumn({ name: "custrecord_hris_lve_attachairdocument", label: "airticketattachment" }),
                    search.createColumn({ name: "custrecord_hris_lve_cancellation", label: "iscancelled" }),
                    search.createColumn({ name: "custrecord_hris_lve_hrmsapprovalstatus", label: "isstatus" }),
                    search.createColumn({ name: "custrecord_hris_lve_empcode", label: "toEmpCode" }),
                    search.createColumn({ name: "custrecord_hris_leave_application_emerge", label: "emergency" }),
                    search.createColumn({
                        name: "entityid",
                        join: "CUSTRECORD_HRIS_LVE_EMPLOYEENAME",
                        label: "toEmpName"
                    }),
                    search.createColumn({ name: "custrecordhris_lve_requestor", label: "createdby" }),
                    search.createColumn({ name: "custrecord_hris_posted_by", label: "Source" }),
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_HRIS_LVE_EMPLOYEENAME",
                        label: "toEmpID"
                    })
                ]
            });

            var searchResultCount = customrecord_hris_leaveapplicationSearchObj.runPaged().count;
            log.debug("customrecord_hris_leaveapplicationSearchObj result count", searchResultCount);

            customrecord_hris_leaveapplicationSearchObj.run().each(function (result) {
                var leaveRecordId = result.id;
                log.debug("Leave Record ID", leaveRecordId);

                var fileId = result.getValue('custrecord_hris_lve_supportdocument');
                log.debug("File ID", fileId);

                var fileObj, fileUrl, fileSize;

                if (fileId) {
                    try {
                        fileObj = file.load({ id: fileId });
                        log.debug("Loaded File Object", fileObj);

                        // Check if the file is online, if not, set it to be online
                        if (!fileObj.isOnline) {
                            fileObj.isOnline = true;
                            fileObj.save();
                            log.debug("File set to be online", fileId);
                        }

                        //var accountId = 11951030;
                        fileUrl = 'https://11951030.app.netsuite.com' + fileObj.url;
                        log.debug("Full File URL", fileUrl);

                        fileSize = formatFileSize(fileObj.size);
                    } catch (e) {
                        log.error("Error loading file", e);
                        fileObj = null;
                        fileUrl = "";
                        fileSize = "";
                    }
                } else {
                    log.debug("No File ID found, skipping file processing.");
                    fileObj = null;
                    fileUrl = "";
                    fileSize = "";
                }
                var ispullbackallowed = getleaveapprovalhsitoryforpullback(leaveEmpId);
                var isallowcancellation = getleaveapprovalhsitoryforcancel(leaveEmpId);



                var data = {
                    internalid: result.getValue('internalid'),
                    leaveapplicationno: result.getValue('name'),
                    date: formatDate(result.getValue('custrecord_hris_lve_fromdate')),
                    leavetypecode: result.getValue('custrecord_hris_lve_leavetype'),
                    leavetypename: result.getText('custrecord_hris_lve_leavetype'),
                    leavebalace: result.getValue('custrecord_hris_lve_leavebalance'),
                    fromdate: formatDate(result.getValue('custrecord_hris_lve_fromdate')),
                    todate: formatDate(result.getValue('custrecord_hris_lve_todate')),
                    total_no_of_days: result.getValue('custrecord_hris_lve_totalnodays'),
                    attachmentUrl: fileUrl,
                    emergency:result.getValue('custrecord_hris_leave_application_emerge'),
                    /* attachment: [{
                        DocumentNo: fileObj ? fileObj.id : "",
                        imageUrl: fileUrl,
                        FileType: fileObj ? fileObj.fileType : "",
                        FileName: fileObj ? fileObj.name : "",
                        FileSize: fileSize,
                        Sync: 1
                    }], */
                    reason: result.getValue('custrecord_hris_lve_leavereason'),
                    airticketrequired: formatBoolean(result.getValue('custrecord_hris_lve_airticketrequired')),
                    airticketamount: result.getValue('custrecord_hris_lve_airticketamount'),
                    airticketattachment: formatBoolean(result.getValue('custrecord_hris_lve_attachairdocument')),
                    iscancelled: formatBoolean(result.getValue('custrecord_hris_lve_cancellation')),
                    isstatus: result.getText('custrecord_hris_lve_hrmsapprovalstatus'),
                    //ispullbackallowed: ispullbackallowed,
                    ispullbackallowed:formatBoolean(result.getValue({ name: "isinactive" })),
                    isallowcancellation:isallowcancellation,
                    createdby: result.getValue('custrecordhris_lve_requestor') || "",
                    createdByEmpName: result.getText('custrecordhris_lve_requestor') || "",
                    createdDate: formatDate(result.getValue('custrecord_hris_lve_fromdate')),
                    toEmpID: result.getValue({ name: "internalid", join: "CUSTRECORD_HRIS_LVE_EMPLOYEENAME" }),
                    toEmpCode: result.getValue('custrecord_hris_lve_empcode'),
                    toEmpName: result.getValue({ name: "entityid", join: "CUSTRECORD_HRIS_LVE_EMPLOYEENAME" }),
                    isSync: 1,
                    NetsuiteRefNo: "",
                    NetsuiteRemarks: "",
                    NetsuiteResponse: "",
                    Source: result.getText('custrecord_hris_posted_by') || ""
                };
                log.debug("Data Object", data);

                var url = "https://mobapp.nijatech.com:5612/api/netsuite/applyleave";
                var headers = {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                };

                var response = https.post({
                    url: url,
                    headers: headers,
                    body: JSON.stringify(data)
                });

                log.debug('Response', response);

                /* var responseBody = JSON.parse(response.body);
                log.debug("responseBody", responseBody); */
               var responseBody;
try {
    responseBody = JSON.parse(response.body);
} catch (e) {
    log.error('Failed to parse response body', response.body);
    throw new Error('Invalid JSON response: ' + e.message);
}

log.debug('Parsed responseBody', responseBody);

// 2. Determine the status values based on the API response
var statusValue = (responseBody.status === true) ? 2 : 3;
var statusLabel = (responseBody.status === true) ? 'Success' : 'Failed';

// 3. Prepare the fields object for submission
// This object holds all fields you want to update on the record
var fieldsToUpdate = {
    'custrecord_hris_lve_': statusValue,
    'custrecord_hris_lve_response_status': statusLabel,
    'custrecord_hris_lve_leave_json_data': JSON.stringify(data),
    'custrecord_hris_lve_response_code': response.code,
    'custrecord_hris_lve_api_url': url,
    'custrecord_hris_lve_response_message': responseBody.message,
    'custrecord_hris_lve_api_method': 'Post'
};

// 4. Submit the changes directly to the database
// Note: submitFields does not trigger Workflow or Script field changes, 
// which is usually preferred for integration logging.
record.submitFields({
    type: 'customrecord_hris_leaveapplication', // Ensure this ID is correct
    id: leaveRecordId,
    values: fieldsToUpdate,
    options: {
        enableSourcing: true,
        ignoreMandatoryFields: true
    }
});
                log.debug({
                    title: "Record Updated Successfully",
                    details: "Leave record ID: " + leaveRecordId
                });
                return true;
            });
        }
function getToken() {
            try {
                var authData = {
                    "email": "elevate@gmail.com",
                    "password": "elevate@123"
                };
                var authResponse = https.post({
                    url: "https://mobapp.nijatech.com:5612/api/netsuite/gettoken",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(authData)
                });
                if (authResponse.code === 200) {
                    var authBody = JSON.parse(authResponse.body);
                    return authBody.jwtoken;
                }
                return null;
            } catch (e) {
                log.error('Error getting token', e.message);
                return null;
            }
        }

        // Utility function to format file size
        function formatFileSize(size) {
            if (size < 1024) return size + ' bytes';
            else if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
            else return (size / 1048576).toFixed(1) + ' MB';
        }

        // Utility function to format dates as YYYY-MM-DD
        function formatDate(dateString) {
            if (!dateString) {
                return '';
            }

            // Assuming the input date is in the format DD/MM/YYYY
            var parts = dateString.split('/');
            if (parts.length === 3) {
                var day = parts[0];
                var month = parts[1];
                var year = parts[2];

                // Return the formatted date as YYYY-MM-DD
                return year + '-' + month + '-' + day;
            } else {
                // If the date is not in the expected format, log an error
                log.error('Unexpected date format', dateString);
                return '';
            }
        }
        /* function formatBoolean(booleanValue) {
          if (booleanValue === true) {
              return "Y";
          } else if (booleanValue === false) {
              return "N";
          } else {
              // If the value is neither true nor false, return it as is or handle accordingly
              return booleanValue;
          }
      } */
        function formatBoolean(booleanValue) {
            // Handle null, undefined, or empty values
            if (booleanValue === null || booleanValue === undefined || booleanValue === '') {
                return "N"; // Default to "N" for falsy values, adjust if API expects something else
            }
            // Handle NetSuite boolean values (true/false or "T"/"F")
            if (booleanValue === true || booleanValue === "T" || booleanValue === "true") {
                return "Y";
            }
            return "N";
        }

        function getleaveapprovalhsitoryforpullback(leaveEmpId) {
            var sql = "SELECT id FROM customrecord_hris_lveapprovalhistory WHERE custrecord_hris_lveapphis_leavelnk = " + leaveEmpId;

            var resultSet = query.runSuiteQL({ query: sql }).asMappedResults();
            if (resultSet && resultSet.length > 0) {
                return 'N';
            } else {
                return 'Y';
            }
        }
        function getleaveapprovalhsitoryforcancel(leaveEmpId) {
            var sql = "SELECT B.id, A.custrecord_hris_lve_hrmsapprovalstatus, " +
                "BUILTIN.DF(A.custrecord_hris_lve_hrmsapprovalstatus) AS approvalstatus " +
                "FROM customrecord_hris_leaveapplication AS A " +
                "LEFT JOIN customrecord_hris_lveapprovalhistory AS B " +
                "ON A.id = B.custrecord_hris_lveapphis_leavelnk " +
                "WHERE A.id = " + leaveEmpId + " " +
                "AND B.id IS NOT NULL " +
                "AND A.custrecord_hris_lve_hrmsapprovalstatus != 2";

            var resultSet = query.runSuiteQL({ query: sql }).asMappedResults();

            if (resultSet && resultSet.length > 0) {
                return 'Y'; //  approval record exists and status != 2
            } else {
                return 'N'; //  no record or status = 2
            }
        }

        return {
            execute: execute
        };

    });
