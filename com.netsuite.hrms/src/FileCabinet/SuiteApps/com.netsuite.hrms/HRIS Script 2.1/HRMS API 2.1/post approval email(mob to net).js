/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/email', 'N/log', 'N/record'],
    function(email, log, record) {

        function doPost(requestBody) {
            try {
                var senderId = requestBody.from; // employee internalID from Payload
                log.debug("senderId",senderId);
                var recipientEmail = requestBody.to; 
                log.debug("recipientEmail",recipientEmail);
                //var subject = requestBody.subject || "";
                var subject = (requestBody.subject && requestBody.subject.trim() !== "") ? requestBody.subject : " ";
                log.debug("subject",subject);
                var body = requestBody.body || '';
                log.debug("body",body);

                if (!senderId || !recipientEmail || !body) {
                    return {
                        status: 'error',
                        message: 'Missing required parameters: from (employee ID), to, or body.'
                    };
                }

                // Optional: Validate employee ID and fetch email (if needed for logging)
                var senderEmail = getEmployeeEmailById(senderId);
                log.debug('Sending email from employee ID: ' + senderId, 'Email: ' + senderEmail);

                email.send({
                    author: parseInt(senderId),
                    recipients: recipientEmail,
                    subject: subject,
                    body: body
                });

                return {
                    status: 'success',
                    message: 'Email sent successfully from ' + senderEmail
                };

            } catch (e) {
                log.error('Error sending email', e);
                return {
                    status: 'error',
                    message: e.message
                };
            }
        }

        /**
         * Helper function to load employee record and get email
         */
        function getEmployeeEmailById(empId) {
            var employee = record.load({
                type: record.Type.EMPLOYEE,
                id: empId
            });
            return employee.getValue('email');
        }

        return {
            post: doPost
        };
    });
