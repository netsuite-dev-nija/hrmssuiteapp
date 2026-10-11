/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        try {
            var customrecord_hris_lve_letter_reqSearchObj = search.create({
                type: "customrecord_hris_lve_letter_req",
                filters: [
                    // Add any filters if needed
                ],
                columns: [
                    search.createColumn({name: "internalid", label: "internalId"}),
                    search.createColumn({name: "name", label: "requestId"}),
                    search.createColumn({name: "custrecord_hris_letreq_request_date_cre", label: "requestedDate"}),
                    search.createColumn({name: "custrecord_hris_letreq_employee_name", label: "empName"}),
                    search.createColumn({name: "custrecord_hris_letreq_employee_legal_na", label: "empLegalName"}),
                    search.createColumn({name: "custrecord_hris_letreq_employee_no", label: "empCode"}),
                    search.createColumn({name: "custrecord_hris_letreq_date_of_joining", label: "dateOfJoining"}),
                    search.createColumn({name: "custrecord_hris_letreq_employee_region", label: "workRegion"}),
                    search.createColumn({name: "custrecord_hris_letreq_subsidiary", label: "subsidiary"}),
                    search.createColumn({name: "custrecord_hris_letreq_location", label: "location"}),
                    search.createColumn({name: "custrecord_hris_letreq_designation", label: "designation"}),
                    search.createColumn({name: "custrecord_hris_letreq_employee_national", label: "nationality"}),
                    search.createColumn({name: "custrecord_hris_letreq_status_in_text", label: "status"}),
                    search.createColumn({name: "custrecord_hris_letreq_department", label: "department"}),
                   // search.createColumn({name: "custrecord_hris_letreq_subdept", label: "subDepartment"}),
                    search.createColumn({name: "custrecord_hris_letreq_certificate_type", label: "letterType"}),
                    search.createColumn({name: "custrecord_hris_letreq_letter_addressed", label: "letterAddressedTo"}),
                    search.createColumn({name: "custrecord_hris_letreq_purposed_requeste", label: "requestedFor"}),
                    search.createColumn({name: "custrecord_hris_letreq_click_here_to_att", label: "attachLetter"}),
                    search.createColumn({name: "custrecord_hris_letter_upload", label: "letterUpload"})
                ]
            });

            var searchResultCount = customrecord_hris_lve_letter_reqSearchObj.runPaged().count;
            log.debug("customrecord_hris_lve_letter_reqSearchObj result count", searchResultCount);

            var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };

            customrecord_hris_lve_letter_reqSearchObj.run().each(function (result) {
                var resultObj = {
                    internalId: result.getValue({name: "internalid"}),
                    requestId: result.getValue({name: "name"}),
                    requestedDate: result.getValue({name: "custrecord_hris_letreq_request_date_cre"}),
                    empName: result.getText({name: "custrecord_hris_letreq_employee_name"}),
                    empLegalName: result.getValue({name: "custrecord_hris_letreq_employee_legal_na"}),
                    empCode: result.getValue({name: "custrecord_hris_letreq_employee_no"}),
                    dateOfJoining: result.getValue({name: "custrecord_hris_letreq_date_of_joining"}),
                    workRegion: result.getText({name: "custrecord_hris_letreq_employee_region"}),
                    subsidiary: result.getText({name: "custrecord_hris_letreq_subsidiary"}),
                    location: result.getText({name: "custrecord_hris_letreq_location"}),
                    designation: result.getText({name: "custrecord_hris_letreq_designation"}),
                    nationality: result.getText({name: "custrecord_hris_letreq_employee_national"}),
                    status: result.getText({name: "custrecord_hris_letreq_status_in_text"})||"",
                    department: result.getText({name: "custrecord_hris_letreq_department"}),
                    //subDepartment: result.getText({name: "custrecord_hris_letreq_subdept"}),
                    letterType: result.getText({name: "custrecord_hris_letreq_certificate_type"}),
                    letterAddressedTo: result.getText({name: "custrecord_hris_letreq_letter_addressed"}),
                    requestedFor: result.getValue({name: "custrecord_hris_letreq_purposed_requeste"}),
                    attachLetter: result.getValue({name: "custrecord_hris_letreq_click_here_to_att"}),
                    letterUpload: result.getText({name: "custrecord_hris_letter_upload"})
                };
                response.records.push(resultObj);
                return true;
            });

            return JSON.stringify(response);
        } catch (e) {
            log.error({title: 'Error executing search', details: e});
            throw e;
        }
    }

    return {
        get: doGet
    };
});
