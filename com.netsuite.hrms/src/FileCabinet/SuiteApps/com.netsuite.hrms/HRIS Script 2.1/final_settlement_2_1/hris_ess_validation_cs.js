/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @Description Converted to SuiteScript 2.1 (functionality unchanged)
 */
define(["N/record", "N/log", "./hris_validation_library"], function (record, log, hrisLib) {
    
    function fieldChanged(context) {
        // debugger;
        var currentRecord = context.currentRecord;
        var recordId = currentRecord.id; // Captures internal ID if in Edit/Copy mode

        // Resignation Form Validation
        if (context.fieldId === "custrecord_hris_res_employee_code") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_res_employee_code" });
            if (employeeId) {
                var hasPendingResignation = hrisLib.checkPendingRecord({
                    recordType: "customrecord_hris_resign_form",
                    empField: "custrecord_hris_res_employee_code",
                    employeeId: employeeId,
                    statusField: "custrecord_hris_res_approvalstatus",
                    pendingStatusValue: 1,
                    currentRecordId: recordId // Pass current ID to exclude it
                });

                if (hasPendingResignation) {
                    alert("A resignation form is already pending approval for this employee.");
                    currentRecord.setValue({
                        fieldId: "custrecord_hris_res_employee_code",
                        value: "",
                        ignoreFieldChange: false,
                    });
                }
            }
        }
        
        // Rejoin request
        if (context.fieldId === "custrecord_rejoin_request_employee") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_rejoin_request_employee" });
            if (employeeId) {
                var hasPendingResignation = hrisLib.checkPendingRecord({
                    recordType: "customrecord_rejoin_request",
                    empField: "custrecord_rejoin_request_employee",
                    employeeId: employeeId,
                    statusField: "custrecord_rejoin_request_aproval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });

                if (hasPendingResignation) {
                    alert("A rejoin request form is already pending approval for this employee.");
                    currentRecord.setValue({
                        fieldId: "custrecord_rejoin_request_employee",
                        value: "",
                        ignoreFieldChange: false,
                    });
                }
            }
        }

        // Discipline notice
        if (context.fieldId === "custrecord_hris_discipline_employee") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_discipline_employee" });
            if (employeeId) {
                var hasPendingResignation = hrisLib.checkPendingRecord({
                    recordType: "customrecord_discipline_notice",
                    empField: "custrecord_hris_discipline_employee",
                    employeeId: employeeId,
                    statusField: "custrecord_hris_discipli_approval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });

                if (hasPendingResignation) {
                    alert("A Discipline Notice is already pending approval for this employee.");
                    currentRecord.setValue({
                        fieldId: "custrecord_hris_discipline_employee",
                        value: "",
                        ignoreFieldChange: false,
                    });
                }
            }
        }

        // Discipline memo
        if (context.fieldId === "custrecord_dm_employee") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_dm_employee" });
            if (employeeId) {
                var hasPendingResignation = hrisLib.checkPendingRecord({
                    recordType: "customrecord_disciplinary_memo",
                    empField: "custrecord_dm_employee",
                    employeeId: employeeId,
                    statusField: "custrecord_dm_approval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });

                if (hasPendingResignation) {
                    alert("A Discipline Memo is already pending approval for this employee.");
                    currentRecord.setValue({
                        fieldId: "custrecord_dm_employee",
                        value: "",
                        ignoreFieldChange: false,
                    });
                }
            }
        }
        
        // NOC
        if (context.fieldId === "custrecord_employee") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_employee" });
            if (employeeId) {
                var hasPendingResignation = hrisLib.checkPendingRecord({
                    recordType: "customrecord_noc",
                    empField: "custrecord_employee",
                    employeeId: employeeId,
                    statusField: "custrecordnoc_approval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });

                if (hasPendingResignation) {
                    alert("A NOC is already pending approval for this employee.");
                    currentRecord.setValue({
                        fieldId: "custrecord_employee",
                        value: "",
                        ignoreFieldChange: false,
                    });
                }
            }
        }

        // Passport request
        if (context.fieldId === "custrecord_hris_pass_empname") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_pass_empname" });
            if (employeeId) {
                var hasPendingResignation = hrisLib.checkPendingRecord({
                    recordType: "customrecord_hris_passport_requestform",
                    empField: "custrecord_hris_pass_empname",
                    employeeId: employeeId,
                    statusField: "custrecord_hris_pass_approvalstatus",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });

                if (hasPendingResignation) {
                    alert("A passport request is already pending approval for this employee.");
                    currentRecord.setValue({
                        fieldId: "custrecord_hris_pass_empname",
                        value: "",
                        ignoreFieldChange: false,
                    });
                }
            }
        }

        // Letter request
        if (context.fieldId === "custrecord_hris_letreq_employee_name") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_letreq_employee_name" });
            if (employeeId) {
                var hasPendingResignation = hrisLib.checkPendingRecord({
                    recordType: "customrecord_hris_lve_letter_req",
                    empField: "custrecord_hris_letreq_employee_name",
                    employeeId: employeeId,
                    statusField: "custrecord_hris_letter_approval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });

                if (hasPendingResignation) {
                    alert("A Letter Request is already pending approval for this employee.");
                    currentRecord.setValue({
                        fieldId: "custrecord_hris_letreq_employee_name",
                        value: "",
                        ignoreFieldChange: false,
                    });
                }
            }
        }

        // Expense Claim form
        if (context.fieldId === "custrecord_hris_exp_claim_frm_employee") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_exp_claim_frm_employee" });
            if (employeeId) {
                var hasPendingResignation = hrisLib.checkPendingRecord({
                    recordType: "customrecord_hris_expense_claim_form",
                    empField: "custrecord_hris_exp_claim_frm_employee", 
                    employeeId: employeeId,
                    statusField: "custrecord_hris_claim_approval_status1",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });

                if (hasPendingResignation) {
                    alert("Expense Claim is already pending approval for this employee.");
                    currentRecord.setValue({
                        fieldId: "custrecord_hris_exp_claim_frm_employee",
                        value: "",
                        ignoreFieldChange: false,
                    });
                }
            }
        }
        
        // Visa renewal
        if (context.fieldId === "custrecord_hris_visarencan_empname") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_visarencan_empname" });
            if (employeeId) {
                var hasPendingResignation = hrisLib.checkPendingRecord({ 
                    recordType: "customrecord_hris_visalrenewalcancelform",
                    empField: "custrecord_hris_visarencan_empname",
                    employeeId: employeeId,
                    statusField: "custrecord_hris_visarencan_approvalsts",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });
                
                if (hasPendingResignation) {
                    alert("A Visa renewal/cancelation request is already pending approval for this employee.");
                    currentRecord.setValue({
                        fieldId: "custrecord_hris_visarencan_empname",
                        value: "",
                        ignoreFieldChange: false,
                    });
                }       
            }   
        }

        // ESS Travel Requisition form
        if (context.fieldId === "custrecord_ess_trf_employee_name") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_ess_trf_employee_name" });
            if (employeeId) {
                var hasPendingTravel = hrisLib.checkPendingRecord({
                    recordType: "customrecord_ess_travel_requisition_form",
                    empField: "custrecord_ess_trf_employee_name",
                    employeeId: employeeId,
                    statusField: "custrecord_ess_approval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });

                if (hasPendingTravel) {
                    alert("A Travel Requisition form is already pending approval for this employee.");
                    currentRecord.setValue({
                        fieldId: "custrecord_ess_trf_employee_name",
                        value: "",
                        ignoreFieldChange: false,
                    });
                }
            }
        }

        // Change in Status
        if (context.sublistId === "recmachcustrecord_hris_cisd_link" && context.fieldId === "custrecord_hris_cisd_employee_name") {
            var sublistEmployeeId = currentRecord.getCurrentSublistValue({
                sublistId: "recmachcustrecord_hris_cisd_link",
                fieldId: "custrecord_hris_cisd_employee_name"
            });

            if (sublistEmployeeId) {
                var hasPendingStatusChange = hrisLib.checkPendingStatusDetails({
                    parentRecordType: "customrecord_change_in_status",
                    childRecordType: "customrecord_change_in_status_details",
                    joinLinkField: "custrecord_hris_cisd_link",
                    childEmpField: "custrecord_hris_cisd_employee_name",
                    employeeId: sublistEmployeeId, 
                    parentStatusField: "custrecord_hris_cis_approval_status",
                    pendingStatusValue: 1,
                    currentParentId: recordId // Pass parent ID to prevent self-blocking
                });

                if (hasPendingStatusChange) {
                    alert("A status change request is already pending approval for this employee.");
                    currentRecord.setCurrentSublistValue({
                        sublistId: "recmachcustrecord_hris_cisd_link",
                        fieldId: "custrecord_hris_cisd_employee_name",
                        value: "",
                        ignoreFieldChange: false
                    });
                }
            }
        }
        
        // Change in Transfer
        if (context.sublistId === "recmachcustrecord_hris_emptras_link" && context.fieldId === "custrecord_hris_emp_tras_empname") {
            var sublistEmployeeId = currentRecord.getCurrentSublistValue({
                sublistId: "recmachcustrecord_hris_emptras_link",
                fieldId: "custrecord_hris_emp_tras_empname"
            });

            if (sublistEmployeeId) {
                var hasPendingStatusChange = hrisLib.checkPendingStatusDetails({
                    parentRecordType: "customrecord_hris_emp_transfer",
                    childRecordType: "customrecord_hris_emp_tras_details",
                    joinLinkField: "custrecord_hris_emptras_link",
                    childEmpField: "custrecord_hris_emp_tras_empname",
                    employeeId: sublistEmployeeId, 
                    parentStatusField: "custrecord_hris_emp_tras_approval_status",
                    pendingStatusValue: 1,
                    currentParentId: recordId
                });

                if (hasPendingStatusChange) {
                    alert("A transfer request is already pending approval for this employee.");
                    currentRecord.setCurrentSublistValue({
                        sublistId: "recmachcustrecord_hris_emptras_link",
                        fieldId: "custrecord_hris_emp_tras_empname",
                        value: "",
                        ignoreFieldChange: false
                    });
                }
            }
        }

        // Final Settlement  Process
         if (context.fieldId === "custrecordhris_fin_emplo_name") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecordhris_fin_emplo_name" });
            if (employeeId) {
             
                var hasPendingFinalsettle = hrisLib.checkEmployeeExists({
                    recordType: "customrecord_hris_finasettlement_process",
                    empField: "custrecordhris_fin_emplo_name",
                    employeeId: employeeId,                   
                    currentRecordId: recordId
                });

                if (hasPendingFinalsettle) {
                    alert("A Final Settlement is already done for this employee.");
                    currentRecord.setValue({
                        fieldId: "custrecordhris_fin_emplo_name",
                        value: "",
                        ignoreFieldChange: false,
                    });
                }
            }
        }

    }

    function saveRecord(context) {
        var currentRecord = context.currentRecord;
        var recType = currentRecord.type;
        var recordId = currentRecord.id; // Captures internal ID if updating

        // Resignation Form Validation
        if (recType === "customrecord_hris_resign_form") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_res_employee_code" });
            if (employeeId) {
                var isPending = hrisLib.checkPendingRecord({
                    recordType: "customrecord_hris_resign_form",
                    empField: "custrecord_hris_res_employee_code",
                    employeeId: employeeId,
                    statusField: "custrecord_hris_res_approvalstatus",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });
                if (isPending) {
                    alert("Cannot save. A resignation form is already pending approval for this employee.");
                    return false;
                }
            }
        }
        
        // Rejoin Request Form
        if (recType === "customrecord_rejoin_request") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_rejoin_request_employee" });
            if (employeeId) {
                var isPending = hrisLib.checkPendingRecord({
                    recordType: "customrecord_rejoin_request",
                    empField: "custrecord_rejoin_request_employee",
                    employeeId: employeeId,
                    statusField: "custrecord_rejoin_request_aproval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });
                if (isPending) {
                    alert("Cannot save. A rejoin request form is already pending approval for this employee.");
                    return false;
                }
            }
        } 
        
        // Discipline Notice
        if (recType === "customrecord_discipline_notice") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_discipline_employee" });
            if (employeeId) {
                var isPending = hrisLib.checkPendingRecord({
                    recordType: "customrecord_discipline_notice",
                    empField: "custrecord_hris_discipline_employee",
                    employeeId: employeeId,
                    statusField: "custrecord_hris_discipli_approval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });
                if (isPending) {
                    alert("Cannot save. A Discipline notice form is already pending approval for this employee.");
                    return false;
                }
            }
        }
        
        // Discipline Memo
        if (recType === "customrecord_disciplinary_memo") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_dm_employee" });
            if (employeeId) {
                var isPending = hrisLib.checkPendingRecord({
                    recordType: "customrecord_disciplinary_memo",
                    empField: "custrecord_dm_employee",
                    employeeId: employeeId,
                    statusField: "custrecord_dm_approval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });
                if (isPending) {
                    alert("Cannot save. A Discipline memo is already pending approval for this employee.");
                    return false;
                }
            }
        }
        
        // NOC
        if (recType === "customrecord_noc") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_employee" });
            if (employeeId) {
                var isPending = hrisLib.checkPendingRecord({
                    recordType: "customrecord_noc",
                    empField: "custrecord_employee",
                    employeeId: employeeId,
                    statusField: "custrecordnoc_approval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });
                if (isPending) {
                    alert("Cannot save. A NOC is already pending approval for this employee.");
                    return false;
                }
            }
        }
        
        // Passport Request Form
        if (recType === "customrecord_hris_passport_requestform") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_pass_empname" });
            if (employeeId) {
                var isPending = hrisLib.checkPendingRecord({
                    recordType: "customrecord_hris_passport_requestform",
                    empField: "custrecord_hris_pass_empname",
                    employeeId: employeeId,
                    statusField: "custrecord_hris_pass_approvalstatus",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });
                if (isPending) {
                    alert("Cannot save. A passport Request is already pending approval for this employee.");
                    return false;
                }
            }
        }  
        
        // Letter Request
        if (recType === "customrecord_hris_lve_letter_req") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_letreq_employee_name" });
            if (employeeId) {
                var isPending = hrisLib.checkPendingRecord({
                    recordType: "customrecord_hris_lve_letter_req",
                    empField: "custrecord_hris_letreq_employee_name",
                    employeeId: employeeId,
                    statusField: "custrecord_hris_letter_approval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });
                if (isPending) {
                    alert("Cannot save. A Letter Request is already pending approval for this employee.");
                    return false;
                }
            }
        }    
        
        // Expense Claim form
        if (recType === "customrecord_hris_expense_claim_form") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_exp_claim_frm_employee" }); 
            if (employeeId) {
                var isPending = hrisLib.checkPendingRecord({
                    recordType: "customrecord_hris_expense_claim_form",
                    empField: "custrecord_hris_exp_claim_frm_employee",
                    employeeId: employeeId,
                    statusField: "custrecord_hris_claim_approval_status1",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });
                if (isPending) {
                    alert("Cannot save. An Expense Claim is already pending approval for this employee.");
                    return false;
                }
            }
        }
        
        // Visa Renewal
        if (recType === "customrecord_hris_visalrenewalcancelform") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_hris_visarencan_empname" }); 
            if (employeeId) {
                var isPending = hrisLib.checkPendingRecord({
                    recordType: "customrecord_hris_visalrenewalcancelform",
                    empField: "custrecord_hris_visarencan_empname",
                    employeeId: employeeId,
                    statusField: "custrecord_hris_visarencan_approvalsts",  
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                }); 
                if (isPending) {
                    alert("Cannot save. A Visa renewal/cancelation request is already pending approval for this employee.");
                    return false;
                }   
            }
        }   
    
        // ESS Travel Requisition form
        if (recType === "customrecord_ess_travel_requisition_form") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecord_ess_trf_employee_name" });
            if (employeeId) {
                var isPending = hrisLib.checkPendingRecord({
                    recordType: "customrecord_ess_travel_requisition_form",
                    empField: "custrecord_ess_trf_employee_name",
                    employeeId: employeeId,
                    statusField: "custrecord_ess_approval_status",
                    pendingStatusValue: 1,
                    currentRecordId: recordId
                });
                if (isPending) {
                    alert("Cannot save. A Travel Requisition Form is already pending approval for this employee.");
                    return false;
                }
            }
        }

        // Change in Status (Sublist)
        if (recType === "customrecord_change_in_status") {
            var sublistId = "recmachcustrecord_hris_cisd_link";
            var lineCount = currentRecord.getLineCount({ sublistId: sublistId });

            for (var i = 0; i < lineCount; i++) {
                var sublistEmployeeId = currentRecord.getSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_hris_cisd_employee_name",
                    line: i
                });

                if (sublistEmployeeId) {
                    var hasPendingStatusChange = hrisLib.checkPendingStatusDetails({
                        parentRecordType: "customrecord_change_in_status",
                        childRecordType: "customrecord_change_in_status_details",
                        joinLinkField: "custrecord_hris_cisd_link",
                        childEmpField: "custrecord_hris_cisd_employee_name",
                        employeeId: sublistEmployeeId, 
                        parentStatusField: "custrecord_hris_cis_approval_status",
                        pendingStatusValue: 1,
                        currentParentId: recordId
                    });

                    if (hasPendingStatusChange) {
                        alert("Cannot save. Row " + (i + 1) + " contains an employee with a status change request already pending approval.");
                        return false; 
                    }
                }
            }
        }

        // Employee transfer (Sublist)
        if (recType === "customrecord_hris_emp_transfer") {
            var sublistId = "recmachcustrecord_hris_emptras_link";
            var lineCount = currentRecord.getLineCount({ sublistId: sublistId });

            for (var i = 0; i < lineCount; i++) {
                var sublistEmployeeId = currentRecord.getSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_hris_emp_tras_empname",
                    line: i
                });

                if (sublistEmployeeId) {
                    var hasPendingStatusChange = hrisLib.checkPendingStatusDetails({
                        parentRecordType: "customrecord_hris_emp_transfer",
                        childRecordType: "customrecord_hris_emp_tras_details",
                        joinLinkField: "custrecord_hris_emptras_link",
                        childEmpField: "custrecord_hris_emp_tras_empname",
                        employeeId: sublistEmployeeId, 
                        parentStatusField: "custrecord_hris_emp_tras_approval_status",
                        pendingStatusValue: 1,
                        currentParentId: recordId
                    });

                    if (hasPendingStatusChange) {
                        alert("Cannot save. Row " + (i + 1) + " contains an employee with a status transfer request already pending approval.");
                        return false; 
                    }
                }
            }
        }

        // Final Settlement Process
        if (recType === "customrecord_hris_finasettlement_process") {
            var employeeId = currentRecord.getValue({ fieldId: "custrecordhris_fin_emplo_name" });
            if (employeeId) {
                var hasPendingFinalsettle = hrisLib.checkEmployeeExists({
                    recordType: "customrecord_hris_finasettlement_process",
                    empField: "custrecordhris_fin_emplo_name",
                    employeeId: employeeId,
                    currentRecordId: recordId
                });
                if (hasPendingFinalsettle) {
                    alert("Cannot save. A Final Settlement is already done for this employee.");
                    return false;
                }
            }
        }

        return true;
    }

    return {
        fieldChanged: fieldChanged,
        saveRecord: saveRecord,
    };
});