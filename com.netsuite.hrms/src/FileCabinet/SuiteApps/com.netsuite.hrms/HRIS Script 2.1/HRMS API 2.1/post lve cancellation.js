/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/record', 'N/log', 'N/error'], function (record, log, error) {
  
    /**
     * POST request handler for updating leave cancellation status.
     * @param {Object} requestParams - Contains the leave record ID, cancellation status, and reason.
     * @returns {Object} Response with the status and message.
     */
    function doPost(requestParams) {
        var response = {};
        try {
            // Validate input
            if (!requestParams.leaveRecordId) {
                throw error.create({
                    name: 'MISSING_PARAMETER',
                    message: 'Missing leaveRecordId in request parameters'
                });
            }

            // Load the leave application record
            var leaveRecord = record.load({
                type: 'customrecord_hris_leaveapplication',
                id: requestParams.leaveRecordId,
                isDynamic: true
            });

            // Log the record ID being processed
            log.debug('Processing Leave Record', 'Record ID: ' + requestParams.leaveRecordId);

            // Retrieve current values for conditions
            var approvalStatus = leaveRecord.getValue('custrecord_hris_lve_hrmsapprovalstatus');
            var cancelStatus = leaveRecord.getValue('custrecord_hris_lve_cancel_leavestatus') || 1;
            var cancelCheck = leaveRecord.getValue('custrecord_hris_lve_cancellation');
            var workResumeCheck = leaveRecord.getValue('custrecord_hris_lve_workresume');

            log.debug({
                title: 'Current Status',
                details: {
                    approvalStatus: approvalStatus,
                    cancelStatus: cancelStatus,
                    cancelCheck: cancelCheck,
                    workResumeCheck: workResumeCheck
                }
            });

            // Check for leave approval status and return corresponding message
            if (approvalStatus == 1) {
                response.status = 'failed';
                response.message = 'You cannot apply cancellation as the record is "Pending Approval"';
                log.audit('Leave Cancellation Failed', 'Record is Pending Approval');
            } else if (approvalStatus == 3) {
                response.status = 'failed';
                response.message = 'You cannot apply cancellation as the record is "Rejected"';
                log.audit('Leave Cancellation Failed', 'Record is Rejected');
            } else if (approvalStatus == 11) {
                response.status = 'failed';
                response.message = 'You cannot apply cancellation as the record is "Open"';
                log.audit('Leave Cancellation Failed', 'Record is Open');
            } else if (approvalStatus == 2 && cancelCheck == false && workResumeCheck == false) {
                // Set cancellation flag, cancel status, and cancellation reason
                leaveRecord.setValue({
                    fieldId: 'custrecord_hris_lve_cancel_leavestatus',
                    value: requestParams.cancelStatus || 2 // Defaulting to 2 for "Cancelled"
                });
                leaveRecord.setValue({
                    fieldId: 'custrecord_hris_lve_cancellation',
                    value: true
                });
                if (requestParams.cancelReason) {
                    leaveRecord.setValue({
                        fieldId: 'custrecord_hris_lve_cancelreason',
                        value: requestParams.cancelReason
                    });
                }

                // Save updated record
                var savedRecordId = leaveRecord.save();
                log.debug("savedRecordId", savedRecordId);
                
                response.status = 'success';
                response.message = 'Leave record successfully updated for cancellation';
                response.updatedRecordId = savedRecordId;
                log.audit('Leave Cancellation Successful', 'Record ID: ' + savedRecordId);
            } else {
                response.status = 'failed';
                response.message = 'Leave cancellation conditions not met';
                log.audit('Leave Cancellation Conditions Not Met', {
                    leaveRecordId: requestParams.leaveRecordId,
                    approvalStatus: approvalStatus,
                    cancelStatus: cancelStatus,
                    cancelCheck: cancelCheck,
                    workResumeCheck: workResumeCheck
                });
            }

        } catch (e) {
            log.error('Error in Leave Cancellation RESTlet', e.message);
            response.status = 'error';
            response.message = e.message;
        }
        return response;
    }

    return {
        post: doPost
    };
});
