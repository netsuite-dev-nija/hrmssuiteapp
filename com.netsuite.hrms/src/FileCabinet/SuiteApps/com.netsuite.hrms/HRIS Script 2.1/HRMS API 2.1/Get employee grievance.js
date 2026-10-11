/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        //var assetRequest = [];
        try {
            var customrecordnjt_hr_employee_grievance_SearchObj = search.create({
                type: "customrecordnjt_hr_employee_grievance_",
                filters:
                [
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}),
                   search.createColumn({name: "custrecord_hr_grievance_employ_name", label: "Employee Name"}),
                   search.createColumn({name: "custrecord_hr_grievance_date_submitted", label: "Date Of Submission"}),
                   search.createColumn({name: "custrecord_hr_grievance_department", label: "Department"}),
                   search.createColumn({name: "custrecord_hr_emp_grievance_designation", label: "Designation"}),
                   search.createColumn({name: "custrecord_hr_emp_grievance_emp_work_reg", label: "Employee Work Region"}),
                   search.createColumn({name: "custrecord_hr_emp_grievance_contact", label: "Contact #"}),
                   search.createColumn({name: "custrecord_hr_emp_grieve_date_of_inciden", label: "Date Of Incident"}),
                   search.createColumn({name: "custrecord_hr_emp_grieve_party_involved", label: "Parties Involved"}),
                   search.createColumn({name: "custrecord_hr_emp_grievance_description", label: "Description"}),
                   search.createColumn({name: "custrecord_hr_emp_grievance_location", label: "Employee Location"}),
                   search.createColumn({name: "custrecord_hr_emp_grievance_proposed_sol", label: "Proposed Solution"}),
                   search.createColumn({name: "custrecord_hr_grievance_subdepartment", label: "Sub Department"}),
                   search.createColumn({name: "isinactive", label: "Inactive"})
                ]
             });
             var searchResultCount = customrecordnjt_hr_employee_grievance_SearchObj.runPaged().count;
             log.debug("customrecordnjt_hr_employee_grievance_SearchObj result count",searchResultCount);

             var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };

            customrecordnjt_hr_employee_grievance_SearchObj.run().each(function(result){
                var resultObj = {
                    internalId: result.getValue({ name: "internalid" }),
                    employeeName: result.getValue({ name: "custrecord_hr_grievance_employ_name" }),
                    dateOfSubmission: result.getValue({ name: "custrecord_hr_grievance_date_submitted" }),
                    department: result.getValue({ name: "custrecord_hr_grievance_department" }),
                    designation: result.getValue({ name: "custrecord_hr_emp_grievance_designation" }),
                    employeeWorkRegion: result.getValue({ name: "custrecord_hr_emp_grievance_emp_work_reg" }),
                    contact: result.getValue({ name: "custrecord_hr_emp_grievance_contact" }),
                    dateOfIncident: result.getValue({ name: "custrecord_hr_emp_grieve_date_of_inciden" }),
                    partiesInvolved: result.getValue({ name: "custrecord_hr_emp_grieve_party_involved" }),
                    description: result.getValue({ name: "custrecord_hr_emp_grievance_description" }),
                    employeeLocation: result.getValue({ name: "custrecord_hr_emp_grievance_location" }),
                    proposedSolution: result.getValue({ name: "custrecord_hr_emp_grievance_proposed_sol" }),
                    subDepartment: result.getValue({ name: "custrecord_hr_grievance_subdepartment" }),
                    inactive: result.getValue({ name: "isinactive" }),
                };
                response.records.push(resultObj);
                //assetRequest.push(resultObj);
                return true;
             });
             
            return JSON.stringify(response);
        } catch (e) {
            log.error({ title: 'Error executing search', details: e });
            throw e;
        }
    }

    return {
        get: doGet
    };
});
