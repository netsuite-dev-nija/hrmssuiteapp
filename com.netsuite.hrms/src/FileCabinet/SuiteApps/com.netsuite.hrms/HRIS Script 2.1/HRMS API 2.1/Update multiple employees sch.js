/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

define(['N/record', 'N/log'], function(record, log) {
    function execute(context) {
        var employeeIds = [
            13,43,378,19150,11,16,5,4,19,608,66,36
        ];

        employeeIds.forEach(function(empId) {
            try {
                var empRecord = record.load({
                    type: record.Type.EMPLOYEE,
                    id: empId,
                    isDynamic: true
                });

                var responseCode = empRecord.getValue({
                    fieldId: 'custentity_hris_emp_response_code'
                }) || '';

                empRecord.setValue({
                    fieldId: 'custentity_hris_emp_response_code',
                    value: responseCode + ''
                });

                log.debug("Response Code", responseCode);

                empRecord.save({
                    ignoreMandatoryFields: true // ← This ignores required fields
                });

                log.debug('Success', 'Employee ID ' + empId + ' updated successfully.');
            } catch (e) {
                log.error({
                    title: 'Error updating employee ID ' + empId,
                    details: e
                });
            }
        });
    }

    return {
        execute: execute
    };
});
