/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/runtime', 'N/format','N/search'], function (record, log, runtime, format,search) {

    function doPost(context) {
        var result = {
            success: true,
            message: ""
        };
        log.debug("Request Body", context);

        try {
            if (!context.leaveApplicationId) {
                return {
                    success: false,
                    message: 'The leaveApplicationId is required.'
                };
            }

            var leaveRecID = context.leaveApplicationId;
            var currentUser = runtime.getCurrentUser().id;

            // Load the leave application record
            var leaveRec = record.load({
                type: 'customrecord_hris_leaveapplication',
                id: leaveRecID,
                isDynamic: true
            });

            // Retrieve values for checking pullback eligibility
            var empName = leaveRec.getValue('custrecord_hris_lve_employeename');
            var requestor = leaveRec.getValue('custrecordhris_lve_requestor');
            var currentAppLevel = leaveRec.getValue('custrecord_hris_lveappapprovallevel');
            var cancelCheck = leaveRec.getValue('custrecord_hris_lve_cancellation');
            var approvalStatus = leaveRec.getValue('custrecord_hris_lve_hrmsapprovalstatus');

            log.debug("Field Values", {
                empName: empName,
                requestor: requestor,
                currentAppLevel: currentAppLevel,
                cancelCheck: cancelCheck,
                approvalStatus: approvalStatus,
                currentUser: currentUser
            });

            // Check conditions for pullback
            if (approvalStatus == 1 && cancelCheck === false && (currentUser == empName || currentUser == requestor)) {
            // if (approvalStatus == 1 && cancelCheck === false) {
                log.debug("Eligible for pullback");

                leaveRec.setValue({
                    fieldId: 'custrecord_hris_lve_cancellation',
                    value: true
                });

                var updatedRecordId = leaveRec.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: false
                });
                log.debug("updatedRecordId", updatedRecordId);

                var pullbackrec = createpullbackrec(leaveRecID);

                if (pullbackrec) {
                    deleteLeaveApplication(leaveRecID,search); // delete leave app after pullback created
                }

                result.message = "Leave pullback action completed successfully.";
                result.updatedRecordId = updatedRecordId;
                result.pullbackRecordId = pullbackrec;

            } else {
                result.success = false;
                result.message = "Conditions for leave pullback are not met.";
            }

        } catch (e) {
            log.error('Error in pullback leave', e);
            result.success = false;
            result.message = e.message;
        }

        return JSON.stringify(result);
    }

    function createpullbackrec(leaveRecID) {
        try {
            log.debug("Inside createpullbackrec");
            var leaveRec = record.load({
                type: 'customrecord_hris_leaveapplication',
                id: leaveRecID
            });

            // Fetch required values from leave application
            var empCode = leaveRec.getText('custrecord_hris_lve_employeecode');
            var empNameId = leaveRec.getValue('custrecord_hris_lve_employeename');
            var fromDate = leaveRec.getValue('custrecord_hris_lve_fromdate');
            var toDate = leaveRec.getValue('custrecord_hris_lve_todate');
            var fromHalfDay = leaveRec.getValue('custrecord_hris_lve_fromhalfday') ? "T" : "F";
            var toHalfDay = leaveRec.getValue('custrecord_hris_lve_tohalfday') ? "T" : "F";
            var leaveType = leaveRec.getValue('custrecord_hris_lve_leavetype');
            var leaveReason = leaveRec.getValue('custrecord_hris_lve_leavereason');
            var totalDays = leaveRec.getValue('custrecord_hris_lve_totaldays');
            var leaveBalance = leaveRec.getValue('custrecord_hris_lve_leavebalance');

            var pullbackRec = record.create({
                type: 'customrecord_hris_pullback_lveapplicatio',
                isDynamic: true
            });

            pullbackRec.setValue('custrecord_hris_plb_employee_code', empCode);
            pullbackRec.setValue('custrecord_hris_plb_employee_name', empNameId);
            pullbackRec.setValue('custrecord_hris_plb_leave_ref_no', leaveRecID);
            pullbackRec.setValue('custrecord_hris_plb_from_date', fromDate);
            pullbackRec.setValue('custrecord_hris_plb_leave_balance', leaveBalance);
            pullbackRec.setValue('custrecord_hris_plb_leave_reason', leaveReason);
            pullbackRec.setValue('custrecord_hris_plb_leave_type', leaveType);
            pullbackRec.setValue('custrecord_hris_plb_lve_pullback_reason', 'yes'); // Static for now
            pullbackRec.setValue('custrecord_hris_plb_todate', toDate);
            pullbackRec.setValue('custrecord_hris_plb_total_days', totalDays);

            var pullbackRecId = pullbackRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: false
            });

            log.debug('Pullback record created', pullbackRecId);
            return pullbackRecId;

        } catch (e) {
            log.error('Error creating pullback record', e);
            throw e;
        }
    }

    function deleteLeaveApplication(leaveRecID,search) {
   /*  try {
        // Search for approval history records linked to this leave application
        var approvalSearch = search.create({
            type: 'customrecord_hris_lveapprovalhistory',
            filters: [
                ['custrecord_hris_lveapphis_leavelnk', 'anyof', leaveRecID]
            ],
            columns: ['internalid']
        });

        approvalSearch.run().each(function (result) {
            var approvalId = result.getValue({ name: 'internalid' });
            if (approvalId) {
                var deletedApprovalId = record.delete({
                    type: 'customrecord_hris_lveapprovalhistory',
                    id: approvalId
                });
                log.audit('Approval History Deleted', 'Deleted ID: ' + deletedApprovalId);
            }
            return true; // keep looping
        });

        // Now delete the leave application
        var deletedId = record.delete({
            type: 'customrecord_hris_leaveapplication',
            id: leaveRecID
        });
        log.audit('Leave Application Deleted', 'Deleted ID: ' + deletedId);

        return deletedId;

    } catch (e) {
        log.error('Error deleting leave application', e);
        throw e;
    } */
       try {
            // 1. Search for and Inactivate Approval History records
            var approvalSearch = search.create({
                type: 'customrecord_hris_lveapprovalhistory',
                filters: [
                    ['custrecord_hris_lveapphis_leavelnk', 'anyof', leaveRecID]
                ],
                columns: ['internalid']
            });

            approvalSearch.run().each(function(result) {
                var approvalId = result.id;
                if (approvalId) {
                    record.submitFields({
                        type: 'customrecord_hris_lveapprovalhistory',
                        id: approvalId,
                        values: {
                            'isinactive': true
                        }
                    });
                    log.audit('Approval History Inactivated', 'ID: ' + approvalId);
                }
                return true;
            });

            // 2. Inactivate the main Leave Application record
            record.submitFields({
                type: 'customrecord_hris_leaveapplication',
                id: leaveRecID,
                values: {
                    'isinactive': true
                }
            });
            log.audit('Leave Application Inactivated', 'ID: ' + leaveRecID);

            return leaveRecID;

        } catch (e) {
            log.error('Error inactivating leave application', e);
            throw e;
        }
}


    return {
        post: doPost
    };
});
