/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/https', 'N/log', 'N/record', 'N/search'], function (https, log, record, search) {

    function modifyEmployee(employeeRecord) {
        var empid = employeeRecord.id;
        log.debug('empid', empid);
  
        try {
            var jsonData = employeeRecord.getValue({
                fieldId: 'custentity_hris_emp_json_data'
            });
            log.debug('jsonData', jsonData);
          var authData = {
    "email": "winstar@gmail.com",
    "password": "winstar@123"
            };
            var authJsonData = JSON.stringify(authData);

            var authResponse = https.post({
                url: "https://mobapp.nijatech.com:6000/api/netsuite/gettoken", // Update with your actual login API URL
                headers: {
                    "Content-Type": "application/json"
                },
                body: authJsonData
            });

            var authBody = JSON.parse(authResponse.body);
            var token = authBody.token;
  
            //var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFsZmFyZWV0aGEiLCJpYXQiOjE3NjczNTE2MzAsImV4cCI6MTc5ODg4NzYzMH0.O2PyW-wuvk5Bsgmqge-hc8uXaie4oJOK9X6mX3dheMk";
  
            var response = https.post({
                url: 'https://mobapp.nijatech.com:6000/api/netsuite/addemployee',
                headers: {
                    Authorization: "Bearer " + token,
                    "Content-Type": "application/json",
                },
                body: jsonData,
            });
  
            log.debug('responseCode', response.code);
            log.debug('responseBody', response.body);
  
            var responseBody;
            try {
                responseBody = JSON.parse(response.body);
            } catch (e) {
                log.error('Failed to parse response body', response.body);
                throw new Error('Invalid JSON response: ' + e.message);
            }
  
            //log.debug('Parsed responseBody', responseBody);
  
            var isSuccess = responseBody.status === true;
            log.debug('Setting process status to:', isSuccess);
  
            var statusField = isSuccess ? 2 : 3;
            log.debug('Setting process status to:', statusField);
  
            employeeRecord.setValue({
                fieldId: 'custentity_hris_emp_process_status',
                value: statusField,
                ignoreFieldChange: true
            });
  
            employeeRecord.setValue({
                fieldId: 'custentity_hris_emp_response_status',
                value: isSuccess ? 'Success' : 'Failure'
            });
  
            employeeRecord.setValue({
                fieldId: 'custentity_hris_emp_response_message',
                value: responseBody.message || 'No message received'
            });
  
            employeeRecord.setValue({
                fieldId: 'custentity_hris_emp_response_code',
                value: response.code
            });
  
            /* // Save the record after setting all the values
            try {
                var recordId = employeeRecord.save();
                log.debug('Record saved successfully', 'Record ID: ' + recordId);
            } catch (saveError) {
                log.error({ title: 'Error saving employee record', details: saveError });
                throw saveError;
            }
  
            if (response.code !== 200) {
                throw new Error('Failed to modify employee. Response code: ' + response.code + ', Body: ' + response.body);
            }
        } catch (e) {
            log.error({ title: 'Error modifying employee', details: e }); */
          log.debug('Saving employee record for empid:', empid);
            employeeRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            log.debug('Employee record saved successfully for empid:', empid);

            if (response.code !== 200) {
                throw new Error('Failed to modify employee. Response code: ' + response.code + ', Body: ' + response.body);
            }
        } catch (e) {
            log.error({ title: 'Error modifying employee', details: e });

  
            try {
                employeeRecord.setValue({
                    fieldId: 'custentity_hris_emp_process_status',
                    value: 3,
                    ignoreFieldChange: true
                });
                employeeRecord.setValue({
                    fieldId: 'custentity_hris_emp_response_status',
                    value: 'Failure'
                });
                employeeRecord.setValue({
                    fieldId: 'custentity_hris_emp_response_message',
                    value: e.message
                });
                employeeRecord.setValue({
                    fieldId: 'custentity_hris_emp_response_code',
                    value: 500
                });
  
                employeeRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
               log.debug('Employee record saved after failure for empid:', empid);
            } catch (saveError) {
                log.error({ title: 'Error saving employee record after failure', details: saveError });
            }
        }
    }
  
    function execute(context) {
        try {
            var employeeSearch = search.create({
                type: 'employee',
                filters: [
                    ['custentity_hris_emp_process_status', 'anyof', ['1', '3']],  // 1 is 'Not processed', 3 is 'Failed'
                    'AND',
                    ['custentity_hris_emp_accesstomobile', 'is', 'T']
                ],
                columns: ['internalid']
            });
  
            var employeeSearchResults = employeeSearch.run().getRange({
                start: 0,
                end: 1000 // Adjust this range as needed to process more or fewer records at once
            });
  
            if (!employeeSearchResults || employeeSearchResults.length === 0) {
                log.debug('No records to process');
                return;
            }
  
            employeeSearchResults.forEach(function (result) {
                var employeeRecord = record.load({
                    type: 'employee',
                    id: result.id,
                    isDynamic: true
                });
  
                modifyEmployee(employeeRecord);
            });
        } catch (e) {
            log.error({ title: 'Error in scheduled script', details: e });
        }
    }
  
    return {
        execute: execute
    };
});
