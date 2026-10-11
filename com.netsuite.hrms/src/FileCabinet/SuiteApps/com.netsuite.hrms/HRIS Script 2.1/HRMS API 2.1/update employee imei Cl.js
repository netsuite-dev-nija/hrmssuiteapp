/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/record', 'N/search'], function(record, search) {

    function fieldChanged(context) {
        if (context.fieldId === 'custpage_employee') {
            var employeeId = context.currentRecord.getValue({ fieldId: 'custpage_employee' });

            if (employeeId) {
                var employeeRecord = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: employeeId,
                    columns: ['custentity_hris_mobile_imei_number']
                });

                if (employeeRecord && employeeRecord.custentity_hris_mobile_imei_number) {
                    context.currentRecord.setValue({
                        fieldId: 'custpage_current_imei',
                        value: employeeRecord.custentity_hris_mobile_imei_number,
                        ignoreFieldChange: true
                    });
                }
            }
        }
    }

    return {
        fieldChanged: fieldChanged
    };
});
