/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/log'], (record, log) => {

    const afterSubmit = (context) => {
        try {
            // Run only on CREATE or EDIT
            if (context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.EDIT) {
                return;
            }

            const newRecord = context.newRecord;
            const empId = newRecord.id;
            const empCode = newRecord.getValue('custentity_hris_empcode');
            const empFullName = newRecord.getValue('custentity_hris_emplegalname');
            const employeeSegment = newRecord.getValue('cseg_njt_seg_emp');

            if (!empCode || !empFullName) {
                log.error({
                    title: 'Missing Data',
                    details: 'Employee Code or Full Name is missing'
                });
                return;
            }

            // Only create segment when employee does not already have one
            if (employeeSegment) {
                return;
            }

            const concatenatedName = `${empCode} - ${empFullName}`;

            const customRecord = record.create({
                type: 'customrecord_cseg_njt_seg_emp',
                isDynamic: true
            });

            customRecord.setValue({
                fieldId: 'name',
                value: concatenatedName
            });

            const customRecordId = customRecord.save();

            log.debug({
                title: 'Custom Record Created',
                details: `ID: ${customRecordId}`
            });

            if (customRecordId) {
                record.submitFields({
                    type: record.Type.EMPLOYEE,
                    id: empId,
                    values: {
                        cseg_njt_seg_emp: customRecordId
                    }
                });

                log.debug({
                    title: 'Employee Record Updated',
                    details: `Set cseg_njt_seg_emp to ${customRecordId}`
                });
            }

        } catch (error) {
            log.error({
                title: 'Error in afterSubmit',
                details: error
            });
        }
    };

    return {
        afterSubmit
    };

});