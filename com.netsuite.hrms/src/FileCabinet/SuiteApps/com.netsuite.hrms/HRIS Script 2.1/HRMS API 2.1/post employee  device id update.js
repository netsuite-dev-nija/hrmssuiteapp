/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {
    function updateEmployeeIMEI(request) {
        try {
            var nsId = request.nsId;
            log.debug("nsId",nsId);
            var mobileIMEI = request.mobileIMEI;
            log.debug("mobileIMEI",mobileIMEI);

            if (!nsId || !mobileIMEI) {
                return { success: false, message: 'Missing required fields: nsId or mobileIMEI' };
            }

            // Load Employee Record
            var employeeRecord = record.load({
                type: record.Type.EMPLOYEE,
                id: nsId,
                isDynamic: true
            });

            // Update the IMEI field
            employeeRecord.setValue({
                fieldId: 'custentity_hris_mobile_imei_number',
                value: mobileIMEI
            });
            
            /* employeeRecord.save(); */
            employeeRecord.save({ ignoreMandatoryFields: true });

            // Load updated values
            var mobileUserName = employeeRecord.getValue('custentity_hris_mobile_user_name');
            var empMobileEmail = employeeRecord.getValue('custentity_hris_empmobileemail');
            var empMobileIMEI = employeeRecord.getValue('custentity_hris_mobile_imei_number');

            // Create IMEI Log Record
            var imeiLogRecord = record.create({
                type: 'customrecord_hris_emp_imei_log',
                isDynamic: true
            });

            imeiLogRecord.setValue({ fieldId: 'custrecord_hris_emp_log_int_id', value: nsId });
            imeiLogRecord.setValue({ fieldId: 'custrecord_hris_emp_log_mob_username', value: mobileUserName });
            imeiLogRecord.setValue({ fieldId: 'custrecord_hris_emp_log_mob_email', value: empMobileEmail });
            imeiLogRecord.setValue({ fieldId: 'custrecord_hris_emp_log_mob_imei', value: empMobileIMEI });

            imeiLogRecord.save();

            return { success: true, message: 'Employee IMEI updated and log recorded successfully.' };
        } catch (error) {
            log.error('Error updating employee IMEI', error);
            return { success: false, message: error.message };
        }
    }

    return {
        post: updateEmployeeIMEI
    };
});
