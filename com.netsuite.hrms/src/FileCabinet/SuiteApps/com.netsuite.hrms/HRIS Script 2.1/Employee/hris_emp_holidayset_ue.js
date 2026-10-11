/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript 
 * @NModuleScope Public
 *
 * This script automatically updates the employee's holiday list based on their working location.
 * It applies to employees with custom form ID 776.
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

    const afterSubmit = (context) => {
        try {
            if (context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.EDIT) {
                return;
            }

            const recordId = context.newRecord.id;
            // log.debug('after Submit', 'recordId->=' + recordId);

            const oEmployee = record.load({
                type: record.Type.EMPLOYEE,
                id: recordId,
                isDynamic: false
            });

            const customform = oEmployee.getValue({ fieldId: 'customform' });
            log.debug('customform', customform);

            if (customform != 776) {
                return;
            }

            const empLocation = oEmployee.getValue({ fieldId: 'custentity_hris_empworkinglocation' });
            const holidayList = searchHolidays(empLocation);
            log.debug('after Submit', 'holidayList->=' + holidayList);

            oEmployee.setValue({
                fieldId: 'custentity_hris_empholidays',
                value: holidayList
            });

            oEmployee.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });

        } catch (e) {
            log.debug('In Search', 'Error: ' + (e.message || e.toString()));
        }
    };

    /**
     * Search holidays for the given location / region
     * @param {string|number} empLocation
     * @returns {Array} Array of holiday internal IDs
     */
    const searchHolidays = (empLocation) => {
        const holidayList = [];
        log.debug('In Search', 'emp_location=' + empLocation);

        if (!empLocation) {
            return holidayList;
        }

        const holidaySearch = search.create({
            type: 'customrecord_hris_holiday_master',
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['custrecord_hris_holi_region', 'anyof', empLocation]
            ],
            columns: ['internalid']
        });

        const results = holidaySearch.run().getRange({ start: 0, end: 1000 });

        if (results && results.length > 0) {
            results.forEach((result) => {
                const holidayId = result.getValue({ name: 'internalid' });
                log.debug('after Submit', 'HolidayList->=' + holidayId);
                holidayList.push(holidayId);
            });
        }

        return holidayList;
    };

    return {
        afterSubmit
    };
});