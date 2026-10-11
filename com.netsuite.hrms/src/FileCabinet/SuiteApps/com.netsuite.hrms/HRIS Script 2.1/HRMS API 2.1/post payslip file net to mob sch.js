/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/file', 'N/https', 'N/runtime'], 
function(record, search, file, https, runtime) {
    function execute(context) {
        try {
            // Search for customrecord_hris_pay_slip_request with the specified conditions
            var paySlipSearch = search.create({
                type: 'customrecord_hris_pay_slip_request',
                filters: [
                    ['custrecord_hris_payslip_status', 'anyof', 3],
                    'AND',
                    ['custrecord_hris_payslip_file', 'isnotempty', '']
                ],
                columns: [
                    'internalid',
                    'custrecord_hris_payslip_req_dt',
                    'custrecord_hris_payslip_file',
                    'custrecord_hris_payslip_reference'
                ]
            });

            var baseUrl = 'https://' + runtime.accountId + '.app.netsuite.com';

            paySlipSearch.run().each(function(result) {
                var internalId = result.getValue('internalid');
                var requestDate = result.getValue('custrecord_hris_payslip_req_dt');
                var fileId = result.getValue('custrecord_hris_payslip_file');
                var createdBy = result.getValue('custrecord_hris_payslip_reference');
                var createdByName = ''; // Fetch the created by name if needed

                // Load the file and get its URL
                var savedFile = file.load({ id: fileId });
                var fileUrl = baseUrl + savedFile.url;
                var fileName = savedFile.name;

                // Construct the payload
                var payload = {
                    internalid: internalId,
                    requestedate: requestDate,
                    monthname: getMonthNameFromFileName(fileName),
                    payslipurl: fileUrl,
                    payslipname: fileName,
                    createdby: createdBy,
                    createdbyname: createdByName
                };

                // POST request to the external API
                var response = https.post({
                    url: 'https://mobapp.nijatech.com:4000/api/netsuite/addpayslip',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImhhbGFAZ21haWwuY29tIiwiaWF0IjoxNzIyMjQ2MDIwLCJleHAiOjE3NTM3ODIwMjB9.9zGSh8L2w2EjGOVCGrZDUQVb48wiJFs61yTC1RIGO1Q'
                    },
                    body: JSON.stringify(payload)
                });

                log.debug('API Response', {
                    status: response.code,
                    body: response.body
                });
                var responseBody = JSON.parse(response.body);
                log.debug("API Response", responseBody);

                // Update the record if the API call is successful
                if (response.code === 200) {
                    record.submitFields({
                        type: 'customrecord_hris_pay_slip_request',
                        id: internalId,
                        values: {
                            custrecord_hris_psr_sync: true
                        }
                    });
                }

                return true; // Process the next record
            });
        } catch (e) {
            log.error('Error in Scheduled Script', e);
        }
    }

    // Helper function to extract the month name from the file name
    function getMonthNameFromFileName(fileName) {
        var monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        var parts = fileName.split('_');
        var monthIndex = parseInt(parts[1]) - 1; // Assuming the month is the second part
        return monthNames[monthIndex] || '';
    }

    return {
        execute: execute
    };
});
