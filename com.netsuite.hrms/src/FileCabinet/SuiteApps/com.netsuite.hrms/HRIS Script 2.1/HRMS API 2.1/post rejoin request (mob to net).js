/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record'], function(record) {

    function parseDate(dateStr) {
        if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            return null;
        }
        var parts = dateStr.split('/');
        var day = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10) - 1;
        var year = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }

    function post(requestBody) {
        try {
            if (!requestBody.id) {
                return { status: 'error', message: 'Record ID is required.' };
            }

            var leaveApplicationRecord = record.load({
                type: 'customrecord_hris_leaveapplication',
                id: requestBody.id
            });

            // Update fields only if provided in the payload
            if (requestBody.employeeName) {
                leaveApplicationRecord.setValue({
                    fieldId: 'custrecord_hris_lve_employeename',
                    value: requestBody.employeeName
                });
            }
            if (requestBody.workResume !== undefined) {
                leaveApplicationRecord.setValue({
                    fieldId: 'custrecord_hris_lve_workresume',
                    value: requestBody.workResume
                });
            }
            if (requestBody.expectedResumeBackDate) {
                var expectedDate = parseDate(requestBody.expectedResumeBackDate);
                if (expectedDate) {
                    leaveApplicationRecord.setValue({
                        fieldId: 'custrecord_hris_lve_expectedresumebackdt',
                        value: expectedDate
                    });
                } else {
                    return { status: 'error', message: 'Invalid date value (must be DD/MM/YYYY).' };
                }
            }
            if (requestBody.isLeaveExtended !== undefined) {
                leaveApplicationRecord.setValue({
                    fieldId: 'custrecord_hris_lve_isleave_extended',
                    value: requestBody.isLeaveExtended
                });
            }
            if (requestBody.actualWorkResumeDate) {
                var actualDate = parseDate(requestBody.actualWorkResumeDate);
                if (actualDate) {
                    leaveApplicationRecord.setValue({
                        fieldId: 'custrecord_hris_lve_actualresumedate',
                        value: actualDate
                    });
                } else {
                    return { status: 'error', message: 'Invalid date value (must be DD/MM/YYYY).' };
                }
            }
            if (requestBody.actualTotalResumeDelayDays !== undefined) {
                leaveApplicationRecord.setValue({
                    fieldId: 'custrecord_hris_lve_actualtotdelaydays',
                    value: requestBody.actualTotalResumeDelayDays
                });
            }
            if (requestBody.workResumptionDone !== undefined) {
                leaveApplicationRecord.setValue({
                    fieldId: 'custrecord_hris_lve_workresumptiondone',
                    value: requestBody.workResumptionDone
                });
            }

            // Ensure "Leave Type" is not overwritten if not provided
            if (requestBody.leaveType) {
                leaveApplicationRecord.setValue({
                    fieldId: 'custrecord_hris_lve_leavetype', // Update field ID if needed
                    value: requestBody.leaveType
                });
            }

            if (requestBody.attachmentId) {
                leaveApplicationRecord.setValue({
                    fieldId: 'custrecord_hris_lve_rejoin_req_file',
                    value: requestBody.attachmentId
                });
            }

            var recordId = leaveApplicationRecord.save();
            log.debug("recordId",recordId);
            
            return { status: 'success', message: 'Record updated successfully.', id: recordId };
        } catch (e) {
            return { status: 'error', message: e.message };
        }
    }

    return {
        post: post
    };
});
