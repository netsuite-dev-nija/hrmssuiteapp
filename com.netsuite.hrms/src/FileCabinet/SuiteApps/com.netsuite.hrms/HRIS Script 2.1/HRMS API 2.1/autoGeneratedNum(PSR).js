/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search'], function(record, search) {

    function beforeSubmit(context) {
        if (context.type !== context.UserEventType.CREATE) {
            return;
        }

        var newRecord = context.newRecord;
        var reqNoFieldId = 'custrecord_hris_payslip_req_no';

        // Generate a unique value for the req_no field
        var uniqueValue = generateUniqueValue();
        log.debug("uniqueValue", uniqueValue);

        // Set the unique value to the field
        newRecord.setValue({
            fieldId: reqNoFieldId,
            value: uniqueValue
        });
    }

    function generateUniqueValue() {
        var prefix = 'PSR-';
        var newNumber = 1;

        // Search for the latest req_no value
        var searchResult = search.create({
            type: 'customrecord_hris_pay_slip_request',
            filters: [
                ['custrecord_hris_payslip_req_no', 'isnotempty', '']
            ],
            columns: [
                search.createColumn({
                    name: 'custrecord_hris_payslip_req_no',
                    sort: search.Sort.DESC
                })
            ]
        }).run().getRange({
            start: 0,
            end: 1
        });

        if (searchResult.length > 0) {
            var lastReqNo = searchResult[0].getValue('custrecord_hris_payslip_req_no');
            var lastNumber = parseInt(lastReqNo.replace(prefix, ''), 10);
            if (!isNaN(lastNumber)) {
                newNumber = lastNumber + 1;
            }
        }

        // Format the new number as two digits
        var formattedNumber = padStart(newNumber.toString(), 2, '0');
        return prefix + formattedNumber;
    }

    // Manual implementation of padStart
    function padStart(str, targetLength, padString) {
        while (str.length < targetLength) {
            str = padString + str;
        }
        return str;
    }

    return {
        beforeSubmit: beforeSubmit
    };

});
