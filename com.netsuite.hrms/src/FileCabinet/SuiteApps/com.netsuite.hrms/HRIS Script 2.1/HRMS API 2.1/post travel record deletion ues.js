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
                //var recordType = context.oldRecord.type;

                var url = 'https://mobapp.nijatech.com:4000/api/netsuite/deleterecords';
                var bearerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImhhbGFAZ21haWwuY29tIiwiaWF0IjoxNzIyMjQ2MDIwLCJleHAiOjE3NTM3ODIwMjB9.9zGSh8L2w2EjGOVCGrZDUQVb48wiJFs61yTC1RIGO1Q';

                var payload = {
                    
                    type: "Travel",
                    internalid: recordId
                };
                log.debug("payload",payload);

                // Send the POST request
                var response = https.post({
                    url: url,
                    body: JSON.stringify(payload),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + bearerToken
                    }
                });

                // Log the response
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
