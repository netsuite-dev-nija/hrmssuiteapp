/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

    const afterSubmit = (context) => {
        try {
            if (context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.EDIT) {
                return;
            }

            const empID = context.newRecord.id;
            log.debug('empID', empID);

            const customform = context.newRecord.getValue({ fieldId: 'customform' });
            log.debug('customform', customform);

            if (customform != 776) {
                return;
            }

            let empWeeklyOff = context.newRecord.getValue({ fieldId: 'custentity_hris_empweeklyoffs' }) || '';
            let empHoliday = context.newRecord.getValue({ fieldId: 'custentity_hris_empholidays' }) || '';
            log.debug('empHoliday', empHoliday);

            const empLocation = context.newRecord.getValue({ fieldId: 'location' }) || '';
            const empEmail = context.newRecord.getValue({ fieldId: 'email' }) || '';
            const hod = context.newRecord.getValue({ fieldId: 'custentity_hris_emphod' }) || '';
            const lineMgr = context.newRecord.getValue({ fieldId: 'custentity_hris_emplinemanger' }) || '';
            const leaveAdmin = context.newRecord.getValue({ fieldId: 'supervisor' }) || '';
            const doj = context.newRecord.getValue({ fieldId: 'hiredate' }) || '';

            const edSearch = search.create({
                type: 'customrecord_hris_employeedatasourcing',
                filters: [
                    ['custrecord_hris_eds_employee', 'anyof', empID],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'internalid',
                    'custrecord_hris_eds_employee',
                    'custrecord_hris_eds_employeeholidays',
                    'custrecord_hris_eds_employeeweeklyoff',
                    'custrecord_hris_eds_employeelocation'
                ]
            });

            const searchResult = edSearch.run().getRange({ start: 0, end: 1 });

            if (searchResult && searchResult.length > 0) {
                // Update existing record
                const edRecordID = searchResult[0].getValue({ name: 'internalid' });
                const edRecord = record.load({
                    type: 'customrecord_hris_employeedatasourcing',
                    id: edRecordID,
                    isDynamic: false
                });

                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_employeeholidays',
                    value: empHoliday || ''
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_employeeweeklyoff',
                    value: empWeeklyOff || ''
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_employeelocation',
                    value: empLocation
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_employeeemaill',
                    value: empEmail
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_headofdepartment',
                    value: hod
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_supervisor',
                    value: lineMgr
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_leaveadmin',
                    value: leaveAdmin
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_hiredate',
                    value: doj
                });

                const existingEDRecord = edRecord.save();
                log.debug('existingEDRecord', existingEDRecord);

            } else {
                // Create new record
                const edRecord = record.create({
                    type: 'customrecord_hris_employeedatasourcing',
                    isDynamic: false
                });

                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_employee',
                    value: empID
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_employeeholidays',
                    value: empHoliday || ''
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_employeeweeklyoff',
                    value: empWeeklyOff || ''
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_employeelocation',
                    value: empLocation
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_employeeemaill',
                    value: empEmail
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_headofdepartment',
                    value: hod
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_supervisor',
                    value: lineMgr
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_leaveadmin',
                    value: leaveAdmin
                });
                edRecord.setValue({
                    fieldId: 'custrecord_hris_eds_hiredate',
                    value: doj
                });

                const createdEDRecord = edRecord.save();
                log.debug('Created ED Record', createdEDRecord);
            }

        } catch (e) {
            log.debug('ERROR', e.message);
        }
    };

    return {
        afterSubmit
    };
});