/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/https', 'N/record', 'N/log'], function (https, record, log) {

    function afterSubmit(context) {
        if (context.type === context.UserEventType.DELETE) {
            try {
                
                var recordId = context.oldRecord.id;
                log.debug("recordId",recordId);

                // START DYNAMIC TOKEN FETCHING LOGIC
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
                // END DYNAMIC TOKEN FETCHING LOGIC

                var url = 'https://mobapp.nijatech.com:5612/netsuite/deleterecords';

                var payload = {
                    type: "Letter",
                    internalid: recordId
                };
                log.debug("payload",payload);

                // Send the POST request using the retrieved dynamic token
                var response = https.post({
                    url: url,
                    body: JSON.stringify(payload),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    }
                });

                log.audit({
                    title: 'Record Deletion Notified',
                    details: 'Response: ' + response.body
                });

            } catch (error) {
                log.error({
                    title: 'Error Sending Deletion Notification',
                    details: error
                });
            }
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});