/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/log'], function (record, log) {

    function doPost(params) {
        try {
            var recordsArray = typeof params === 'string' ? JSON.parse(params) : params;
            log.debug("recordsArray", recordsArray);

            if (!Array.isArray(recordsArray)) {
                throw new Error("Input should be an array of records.");
            }

            var updatedRecords = [];
            var processedIds = {}; // Replaces Set

            recordsArray.forEach(function (rec) {
                if (!rec.internalId) {
                    throw new Error("Missing internalId in one of the records.");
                }

                if (processedIds[rec.internalId]) {
                    log.debug("Skipping duplicate internalId", rec.internalId);
                    return;
                }

                var leaveRec = record.load({
                    type: 'customrecord_hris_leaveapplication',
                    id: rec.internalId,
                    isDynamic: true
                });

                if (rec.hrmsApprovalStatus !== undefined) {
                    leaveRec.setValue({
                        fieldId: 'custrecord_hris_lve_hrmsapprovalstatus',
                        value: rec.hrmsApprovalStatus
                    });
                }

                if (rec.approvalStatus !== undefined) {
                    leaveRec.setValue({
                        fieldId: 'custrecord_hris_lveapp_approvalstatus',
                        value: rec.approvalStatus
                    });
                }

                if (rec.approverUser !== undefined) {
                    leaveRec.setValue({
                        fieldId: 'custrecord_hris_lveapp_appruser',
                        value: rec.approverUser
                    });
                }

                if (rec.reasonforRejection !== undefined) {
                    leaveRec.setValue({
                        fieldId: 'custrecord_hris_lve_hrmsreasonforreject',
                        value: rec.reasonforRejection
                    });
                }

                var updatedId = leaveRec.save();
                updatedRecords.push({
                    internalId: updatedId,
                    status: 'Updated'
                });

                processedIds[rec.internalId] = true; // Mark as processed
            });

            return {
                Status: 'Success',
                ResponseCode: 200,
                updated: updatedRecords
            };

        } catch (e) {
            log.error({ title: 'Error updating leave application records', details: e });
            return {
                Status: 'Failed',
                ResponseCode: 500,
                Error: e.message
            };
        }
    }

    return {
        post: doPost
    };
});
