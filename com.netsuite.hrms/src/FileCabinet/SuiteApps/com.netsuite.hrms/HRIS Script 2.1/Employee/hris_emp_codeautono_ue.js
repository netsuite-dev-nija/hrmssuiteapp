/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope public 
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

    const beforeSubmit = (context) => {
        log.debug('type', context.type);

        if (context.type !== context.UserEventType.CREATE) {
            return;
        }

        try {
            const newRec = context.newRecord;
            const customform = newRec.getValue({ fieldId: 'customform' });
            log.debug('customform', customform);

            if (customform != 776) {
                return;
            }

            const empCode = newRec.getValue({ fieldId: 'custentity_hris_empcode' });
            const subsidiary = newRec.getValue({ fieldId: 'subsidiary' });
            const empName = newRec.getValue({ fieldId: 'custentity_hris_emplegalname' });

            log.debug('empCode', empCode);
            log.debug('subsidiary', subsidiary);
            log.debug('empName', empName);

            if (empCode) {
                //return; // already has a code
                  var entityIdValue = empCode + ' ' + empName;
            // Set the concatenated value to entityid field
           
              newRec.setValue({ fieldId: 'entityid', value: entityIdValue });
            newRec.setValue({ fieldId: 'custentity_hris_empcode', value: empCode });
            // Log the concatenated value
          
            }
            else{
            const uniqueRefSearch = search.create({
                type: 'customrecord_hris_unique_reference_numbe',
                filters: [
                    ['custrecord_hris_record_type', 'anyof', '-4'],
                    'AND',
                    ['custrecord_hris_urn_subsidiary', 'anyof', subsidiary],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'custrecord_hris_record_type',
                    'custrecord_hris_unique_number',
                    'custrecord_hris_employee_code_prefix'
                ]
            });

            const results = uniqueRefSearch.run().getRange({ start: 0, end: 1 });

            if (!results || results.length === 0) {
                return;
            }

            const uniqueRefId = results[0].id;
            const currentUniqueNum = parseInt(results[0].getValue({ name: 'custrecord_hris_unique_number' }), 10) || 0;
            const nextUniqueNum = currentUniqueNum + 1;
            const prefix = results[0].getValue({ name: 'custrecord_hris_employee_code_prefix' }) || '';

            const formattedUniqueNumber = padNumber(nextUniqueNum, 5);

            log.debug('formattedUniqueNumber', formattedUniqueNumber);

            const empCodeFull = prefix + formattedUniqueNumber + ' ' + (empName || '');
            const empCodeShort = prefix + formattedUniqueNumber;

            log.debug('emp_code', empCodeFull);

            newRec.setValue({ fieldId: 'entityid', value: empCodeFull });
            newRec.setValue({ fieldId: 'custentity_hris_empcode', value: empCodeShort });

            // Update the unique number counter
            record.submitFields({
                type: 'customrecord_hris_unique_reference_numbe',
                id: uniqueRefId,
                values: {
                    custrecord_hris_unique_number: nextUniqueNum
                }
            });
        }
        } catch (e) {
            log.error('generate_employee_code error', e.message || e.toString());
        }
    };

    /**
     * Pad number with leading zeros
     */
    const padNumber = (number, length) => {
        let str = String(number);
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    };

    return {
        beforeSubmit
    };
});