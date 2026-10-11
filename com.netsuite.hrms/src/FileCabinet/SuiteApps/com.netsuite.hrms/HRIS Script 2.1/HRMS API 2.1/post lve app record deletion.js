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

                var url = 'https://mobapp.nijatech.com:5607/api/netsuite/deleterecords';
                var bearerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFsZmFyZWV0aGEiLCJpYXQiOjE3NjczNTE2MzAsImV4cCI6MTc5ODg4NzYzMH0.O2PyW-wuvk5Bsgmqge-hc8uXaie4oJOK9X6mX3dheMk';

                var payload = {
                    
                    type: "Leave",
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
