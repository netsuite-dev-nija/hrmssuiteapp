/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        //var expenseClaimRequests = [];
        try {
            var customrecord_hris_expense_claim_formSearchObj = search.create({
                type: "customrecord_hris_expense_claim_form",
                filters: [],
                columns: [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "custrecord_hris_exp_claim_frm_ref_no", label: "Reference No" }),
                    search.createColumn({ name: "custrecord_hris_exp_claim_frm_employee", label: "Employee Name" }),
                    search.createColumn({ name: "custrecord_hris_exp_claim_frm_employeeco", label: "Employee Code" }),
                    search.createColumn({ name: "custrecord_hris_emp_wor_region", label: "Employee Work Region" }),
                    search.createColumn({ name: "custrecord_hris_exp_claim_frm_subsidary", label: "Subsidiary" }),
                    search.createColumn({ name: "custrecord_hris_exp_claim_frm_location", label: "Location" }),
                    search.createColumn({ name: "custrecord_hris_exp_claim_frm_department", label: "Department" }),
                    search.createColumn({ name: "custrecord_hris_claim_subdept", label: "Sub Department" }),
                    search.createColumn({ name: "custrecord_hris_exp_claim_frm_amount", label: "Amount" }),
                    search.createColumn({ name: "custrecord_hris_exp_claim_frm_claim_type", label: "Claim Type" }),
                    search.createColumn({ name: "custrecord_hris_exp_claim_frm_attachment", label: "Attachment" }),
                    search.createColumn({ name: "custrecord_hris_exp_claim_frm_remarks", label: "Remarks" }),
                    search.createColumn({ name: "custrecord_hris_claim_approval_lvl", label: "Approval Level" }),
                    search.createColumn({ name: "custrecord_hris_claim_approval_user", label: "Approval User Type" }),
                    search.createColumn({ name: "custrecord_hris_claim_airtic_applicable", label: "Air Ticket Applicable" }),
                    search.createColumn({ name: "custrecord_hris_claim_approval_role", label: "Approval Role" }),
                    search.createColumn({ name: "custrecord_hris_claim_approval_user1", label: "Approval User" }),
                    search.createColumn({ name: "custrecord_hris_claim_approval_status1", label: "Approval Status" })
                ]
            });
            
            var searchResultCount = customrecord_hris_expense_claim_formSearchObj.runPaged().count;
            log.debug("customrecord_hris_expense_claim_formSearchObj result count", searchResultCount);

            var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };

            
            customrecord_hris_expense_claim_formSearchObj.run().each(function (result) {
                var resultObj = {
                    internalId: result.getValue({ name: "internalid" }),
                    refNo: result.getValue({ name: "custrecord_hris_exp_claim_frm_ref_no" }),
                    empName: result.getValue({ name: "custrecord_hris_exp_claim_frm_employee" }),
                    empCode: result.getValue({ name: "custrecord_hris_exp_claim_frm_employeeco" }),
                    empWorkRegion: result.getValue({ name: "custrecord_hris_emp_wor_region" }),
                    subsidiary: result.getValue({ name: "custrecord_hris_exp_claim_frm_subsidary" }),
                    location: result.getValue({ name: "custrecord_hris_exp_claim_frm_location" }),
                    department: result.getValue({ name: "custrecord_hris_exp_claim_frm_department" }),
                    subDepartment: result.getValue({ name: "custrecord_hris_claim_subdept" }),
                    amount: result.getValue({ name: "custrecord_hris_exp_claim_frm_amount" }),
                    claimType: result.getValue({ name: "custrecord_hris_exp_claim_frm_claim_type" }),
                    attachment: result.getValue({ name: "custrecord_hris_exp_claim_frm_attachment" }),
                    remarks: result.getValue({ name: "custrecord_hris_exp_claim_frm_remarks" }),
                    approvalLevel: result.getValue({ name: "custrecord_hris_claim_approval_lvl" }),
                    approvalUserType: result.getValue({ name: "custrecord_hris_claim_approval_user" }),
                    airTicketApplicable: result.getValue({ name: "custrecord_hris_claim_airtic_applicable" }),
                    approvalRole: result.getValue({ name: "custrecord_hris_claim_approval_role" }),
                    approvalUser: result.getValue({ name: "custrecord_hris_claim_approval_user1" }),
                    approvalStatus: result.getValue({ name: "custrecord_hris_claim_approval_status1" })
                };
                response.records.push(resultObj);
                //expenseClaimRequests.push(resultObj);
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
