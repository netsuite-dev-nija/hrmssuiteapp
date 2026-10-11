/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/error', 'N/format'], function(record, log, error, format) {

    function doPost(requestBody) {
        var response = {
            success: true,
            createdRecords: [],
            failedRecords: []
        };

        // Log incoming payload
        log.audit('Received Payload', JSON.stringify(requestBody));

        try {
            if (!Array.isArray(requestBody)) {
                throw error.create({
                    name: 'INVALID_PAYLOAD',
                    message: 'Expected an array of records.',
                    notifyOff: false
                });
            }

            requestBody.forEach(function (item, index) {
                // Log each item being processed
                log.debug('Processing Item #' + (index + 1), JSON.stringify(item));

                // Check if data object exists
                if (!item.data || typeof item.data !== 'object') {
                    throw error.create({
                        name: 'INVALID_DATA',
                        message: 'Expected a data object for item #' + (index + 1),
                        notifyOff: false
                    });
                }

                // Check if parentid exists
                if (!item.parentid) {
                    throw error.create({
                        name: 'INVALID_PARENTID',
                        message: 'Parent ID is required for item #' + (index + 1),
                        notifyOff: false
                    });
                }

                try {
                    // Log the data being processed
                    log.debug('Processing Data for Item #' + (index + 1), JSON.stringify(item.data));

                    // Parse the date (already in DD/MM/YYYY format)
                    var parsedDate = format.parse({
                        value: item.data.date,
                        type: format.Type.DATE
                    });
                    log.debug('Parsed Date', parsedDate);

                    // Determine if update or create
                    var rec;
                    var isUpdate = false;
                    if (item.data.id) {
                        try {
                            rec = record.load({
                                type: 'customrecord_hris_expense_details',
                                id: item.data.id,
                                isDynamic: true
                            });
                            isUpdate = true;
                            log.debug('Loaded Existing Record for Update', { id: item.data.id });
                        } catch (loadErr) {
                            log.error('Failed to Load Record for Update', { id: item.data.id, error: loadErr.message });
                            // Fallback to create if load fails (e.g., invalid ID)
                            rec = record.create({
                                type: 'customrecord_hris_expense_details',
                                isDynamic: true
                            });
                        }
                    } else {
                        rec = record.create({
                            type: 'customrecord_hris_expense_details',
                            isDynamic: true
                        });
                    }

                    // Set field values using item.data and item.parentid
                    rec.setValue({ fieldId: 'custrecord_hris_expense_details_link', value: item.parentid });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_details_date', value: parsedDate });
                    rec.setValue({ fieldId: 'custrecord_hris_details_subsidiary', value: item.data.subsidiary });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_details_catagory', value: item.data.expensecategory || '' });
                    // rec.setValue({ fieldId: 'custrecord_hris_employee_expense_cl_clas', value: item.data.class });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_details_department', value: item.data.department });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_details_amount', value: parseFloat(item.data.amount) || 0 });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_details_currency', value: item.data.currency });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_details_exrate', value: parseFloat(item.data.exchangerate) || 0 });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_details_forginam', value: parseFloat(item.data.forignamount) || 0 });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_details_taxcode', value: item.data.taxcode });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_details_taxrate', value: parseFloat((item.data.taxrate || '').replace('%', '')) || 0 });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_gross_amt', value: parseFloat(item.data.grossamount) || 0 });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_report_acc', value: item.data.account });
                    rec.setValue({ fieldId: 'custrecord_hris_expense_tax_amt', value: parseFloat(item.data.taxamount) || 0 });

                    // Save the record
                    var newId = rec.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });

                    // Log successful creation or update
                    log.audit(isUpdate ? 'Record Updated' : 'Record Created', { recordId: newId, parentid: item.parentid });

                    response.createdRecords.push({ internalid: newId });

                } catch (innerErr) {
                    // Log failure with data details
                    log.error('Error creating/updating record for item #' + (index + 1), {
                        error: innerErr.message,
                        data: item.data,
                        parentid: item.parentid
                    });

                    response.failedRecords.push({
                        parentid: item.parentid,
                        data: item.data,
                        error: innerErr.message
                    });
                    response.success = false;
                }
            });

        } catch (e) {
            log.error('Fatal error in RESTlet', e);
            return {
                success: false,
                message: e.message
            };
        }

        // Log final response
        log.audit('Final Response', JSON.stringify(response));

        return response;
    }

    return {
        post: doPost
    };
});