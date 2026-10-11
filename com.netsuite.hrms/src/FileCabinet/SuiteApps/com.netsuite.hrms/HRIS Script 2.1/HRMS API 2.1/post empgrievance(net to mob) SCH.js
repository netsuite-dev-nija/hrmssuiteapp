/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/https', 'N/log', 'N/runtime'], 
function(record, search, https, log, runtime) {

    function execute(context) {
        var empGrievanceId = runtime.getCurrentScript().getParameter({ name: 'custscript_empGreivance_id' });
        log.debug('API Parameter', empGrievanceId);

        // Retrieve the employee grievance data using a search
        var grievanceSearch = search.create({
            type: "customrecordnjt_hr_employee_grievance_",
            filters: [["internalid", "is", empGrievanceId]],
            columns: [
                {name: "internalid", label: "internalid"},
                {name: "custrecord_hr_grievance_employ_name", label: "firstName"},
                {name: "custrecord_hr_grievance_department", label: "department"},
                {name: "custrecord_hr_emp_grievance_designation", label: "designation"},
                {name: "custrecord_hr_emp_grieve_date_of_inciden", label: "dateOfincident"},
                {name: "custrecord_hr_emp_grieve_party_involved", label: "partiesname"},
                {name: "custrecord_hr_emp_grievance_description", label: "description"},
                {name: "custrecord_hr_emp_grievance_location", label: "worklocation"},
                {name: "custrecord_hr_emp_grievance_proposed_sol", label: "solution"},
                {name: "custrecord_hr_employee_grievance_emp_id", label: "employeeCode"},
                {name: "custrecord_hr_emp_grievance_supervisor", label: "supervisorName"}
            ]
        });

        var searchResultCount = grievanceSearch.runPaged().count;
        log.debug("Grievance search result count", searchResultCount);

        grievanceSearch.run().each(function(result) {
            var grievanceId = result.id;
            log.debug("Grievance Record ID", grievanceId);

            // Prepare data for API request
            var data = {
                internalid: result.getValue('internalid'),
                nsId: result.getValue('custrecord_hr_grievance_employ_name'),
                firstName: result.getText('custrecord_hr_grievance_employ_name'),
                department: result.getText('custrecord_hr_grievance_department'),
                designation: result.getValue('custrecord_hr_emp_grievance_designation'),
                dateOfincident: formatDate(result.getValue('custrecord_hr_emp_grieve_date_of_inciden')),
                partiesid: result.getValue('custrecord_hr_emp_grieve_party_involved'),
                partiesname: result.getText('custrecord_hr_emp_grieve_party_involved'),
                description: result.getValue('custrecord_hr_emp_grievance_description'),
                worklocation: result.getText('custrecord_hr_emp_grievance_location'),
                solution: result.getValue('custrecord_hr_emp_grievance_proposed_sol'),
                employeeCode: result.getValue('custrecord_hr_employee_grievance_emp_id'),
                supervisorName: result.getValue('custrecord_hr_emp_grievance_supervisor') || "",
            };
            log.debug("API Request Data:", data);

            // API URL and token
            var url = "https://mobapp.nijatech.com:4000/api/netsuite/addgrievance";
            var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImhhbGFAZ21haWwuY29tIiwiaWF0IjoxNzIyMjQ2MDIwLCJleHAiOjE3NTM3ODIwMjB9.9zGSh8L2w2EjGOVCGrZDUQVb48wiJFs61yTC1RIGO1Q";

            // Set headers for API request
            var headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            };

            // Send HTTP POST request
            var response = https.post({
                url: url,
                headers: headers,
                body: JSON.stringify(data)
            });

            log.debug('Response from API', response);
            log.debug("Response from Body", response.body);

            var responseBody;
            try {
                responseBody = JSON.parse(response.body);
            } catch (e) {
                log.error('Failed to parse response body', response.body);
                throw new Error('Invalid JSON response: ' + e.message);
            }

            log.debug('Parsed responseBody', responseBody);

            // Update the grievance record with response data
            updateGrievanceRecord(grievanceId, data, response, responseBody, url);

            return true;
        });
    }

    // Function to update the grievance record
    function updateGrievanceRecord(grievanceId, data, response, responseBody, url) {
        var grievanceRecord = record.load({
            type: 'customrecordnjt_hr_employee_grievance_',
            id: grievanceId,
            isDynamic: true,
        });

        if (responseBody.status === true) {
            grievanceRecord.setValue({
                fieldId: 'custrecord_hr_grievance_process_status',
                value: 2, // Processed
                ignoreFieldChange: true
            });
            grievanceRecord.setValue({
                fieldId: 'custrecord_hr_grievance_response_status',
                value: "Success"
            });
        } else {
            grievanceRecord.setValue({
                fieldId: 'custrecord_hr_grievance_process_status',
                value: 3, // Failed
                ignoreFieldChange: true
            });
            grievanceRecord.setValue({
                fieldId: 'custrecord_hr_grievance_response_status',
                value: "Failed"
            });
        }

        grievanceRecord.setValue({
            fieldId: 'custrecord_hr_grievance_json_data',
            value: JSON.stringify(data)
        });
        grievanceRecord.setValue({
            fieldId: 'custrecord_hr_grievance_response_code',
            value: response.code
        });
        grievanceRecord.setValue({
            fieldId: 'custrecord_hr_grievance_api_url',
            value: url
        });
        grievanceRecord.setValue({
            fieldId: 'custrecord_hr_grievance_api_method',
            value: "POST"
        });
        grievanceRecord.setValue({
            fieldId: 'custrecord_hr_grievance_response_message',
            value: responseBody.message || ""
        });

        grievanceRecord.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });

        log.debug("Grievance record updated successfully", grievanceId);
    }

    // Utility function to format dates as YYYY-MM-DD
    function formatDate(dateString) {
        if (!dateString) return '';
        var parts = dateString.split('/');
        if (parts.length === 3) {
            return parts[2] + '-' + parts[1] + '-' + parts[0];
        } else {
            log.error('Unexpected date format', dateString);
            return '';
        }
    }

    return {
        execute: execute
    };

});
