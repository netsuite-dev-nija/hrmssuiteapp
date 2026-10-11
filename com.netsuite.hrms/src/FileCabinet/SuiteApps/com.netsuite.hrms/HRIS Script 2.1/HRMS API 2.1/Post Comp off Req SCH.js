/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/query', 'N/https', 'N/record', 'N/log', 'N/runtime'], function (query, https, record, log, runtime) {

    function execute(context) {
        try {
            var script = runtime.getCurrentScript();
            var recordId = script.getParameter({ name: 'custscript_hris_compoff_id' });

            if (!recordId) {
                log.error('Missing Parameter', 'Record ID parameter (custscript_hris_compoff_id) is required.');
                return;
            }

            var resultSet = query.runSuiteQL({
                query: "SELECT A.id, " +
                    "A.custrecord_hris_rcomp_employee_code, " +
                    "A.custrecord_hris_rcomp_employee_name, " +
                    "A.custrecord_hris_rcomp_comp_off_from_date, " +
                    "A.custrecord_hris_rcomp_comp_off_to_date, " +
                    "A.custrecord_hris_rcomp_total_comp_offdays, " +
                    "A.custrecord_hris_rcomp_valid_till_date, " +
                    "A.custrecord_hris_rcomp_reason, " +
                    "A.custrecord_hris_raise_comp_dept_n, " +
                    "A.custrecord_hris_rcomp_leave_type, " +
                    "BUILTIN.DF(A.custrecord_hris_rcomp_leave_type) AS leave_type_text, " +
                    "A.custrecord_hris_rcomp_requester, " +
                    "BUILTIN.DF(A.custrecord_hris_rcomp_appstatus) AS status, " +
                    "B.custentity_hris_emplegalname AS empname, " +
                    "A.custrecord_hris_rcomp_checked AS isutilized " +
                    "FROM customrecord_hris_lve_raise_comp_off AS A " +
                    "LEFT JOIN employee AS B ON B.id = A.custrecord_hris_rcomp_employee_name " +
                    "WHERE A.custrecord_hris_rcomp_checked = 'F' AND A.id = " + recordId
            }).asMappedResults();

            var url = 'https://mobapp.nijatech.com:6000/api/netsuite/applycompoff';

            for (var i = 0; i < resultSet.length; i++) {
                var row = resultSet[i];

                // var data = {
                    
                // };

                var payload = {
                    internalid: row.id,
                    empid: row.custrecord_hris_rcomp_employee_name,
                    empname: row.empname,
                    from_date: row.custrecord_hris_rcomp_comp_off_from_date,
                    to_date: row.custrecord_hris_rcomp_comp_off_to_date,
                    total_days: row.custrecord_hris_rcomp_total_comp_offdays,
                    valid_till: row.custrecord_hris_rcomp_valid_till_date,
                    reason: row.custrecord_hris_rcomp_reason,
                    dept: row.custrecord_hris_raise_comp_dept_n,
                    leave_type: row.custrecord_hris_rcomp_leave_type,
                    leave_type_name: row.leave_type_text,
                    requester: row.custrecord_hris_rcomp_requester,
                    isapproved: row.status,
                    isutilzed : row.isutilized
                };

                log.debug("Payload", JSON.stringify(payload));

             /*    var headers = {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InB1cmVlc3NAZ21haWwuY29tIiwiaWF0IjoxNzUyNDk3MDE2LCJleHAiOjE3ODQwMzMwMTZ9.-ALyiD36G9cCeZmK2plY2QmHYdXyuHAvuNt5CP3KCzI'
                };

                var response = https.post({
                    url: url,
                    body: JSON.stringify(payload),
                    headers: headers
                });

                log.debug('API Response for Record ID ' + row.id, response.body); */

                 var token='';
            var authData = {
    "email": "winstar@gmail.com",
    "password": "winstar@123"
            };
            var authJsonData = JSON.stringify(authData);
            log.emergency('authJsonData',authJsonData)

            var authResponse = https.post({
                url: "https://mobapp.nijatech.com:6000/api/netsuite/gettoken", // Update with your actual login API URL
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
        var url ='https://mobapp.nijatech.com:6000/api/netsuite/applycompoff'
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
           // return { code: response.code, body: response.body };
        } catch (e) {
            log.error("Error Sending to API", e.message);
           // return { code: e.code || 500, body: e.message };
        }

                if (response.code == 200) {
                    record.submitFields({
                        type: 'customrecord_hris_lve_raise_comp_off',
                        id: recordId,
                        values: {
                            'custrecord_hris_rcomp_json_data': JSON.stringify(payload),
                            'custrecord_hris_rcomp_response_status': 'Success',
                            'custrecord_hris_rcomp_process_status': 2,
                            'custrecord_hris_rcomp_api_url': url,
                            'custrecord_hris_rcomp_response_message': response.body,
                            'custrecord_hris_rcomp_response_code': response.code,
                            'custrecord_hris_rcomp_api_method': "Post"
                        }
                    });
                } else {
                    record.submitFields({
                        type: 'customrecord_hris_lve_raise_comp_off',
                        id: recordId,
                        values: {
                            'custrecord_hris_rcomp_json_data': JSON.stringify(payload),
                            'custrecord_hris_rcomp_response_status': 'Failure',
                            'custrecord_hris_rcomp_process_status': 1,
                            'custrecord_hris_rcomp_api_url': url,
                            'custrecord_hris_rcomp_response_message': response.body,
                            'custrecord_hris_rcomp_response_code': response.code,
                            'custrecord_hris_rcomp_api_method': "Post"
                        }
                    });
                }
            }

        } catch (e) {
            log.error('Scheduled Script Error', e.message);
        }
    }

    return {
        execute: execute
    };
});
