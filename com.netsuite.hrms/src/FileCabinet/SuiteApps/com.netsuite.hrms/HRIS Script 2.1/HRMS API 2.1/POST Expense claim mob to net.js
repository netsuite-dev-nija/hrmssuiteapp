/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/error', 'N/format', 'N/search'], function(record, log, error, format, search) {

    function doPost(requestBody) {
        var response = {
            success: true,
            parentRecord: {
                Recid: null,
                operation: null
            }
        };

        // Log incoming request
        log.audit('Received Payload', JSON.stringify(requestBody));

        try {
            var records = requestBody.data;

            if (!records) {
                throw error.create({
                    name: 'INVALID_PAYLOAD',
                    message: 'data is required.',
                    notifyOff: false
                });
            }

            // Ensure records is an array for consistent processing
            if (!Array.isArray(records)) {
                records = [records];
            }

            records.forEach(function (data, index) {
                log.debug('Processing Record #' + (index + 1), JSON.stringify(data));

                var parentRec;
                var operationType = 'create';
                
                // Check if record exists for update
                if (data.recid) {
                    try {
                        parentRec = record.load({
                            type: "customrecord_hris_expense_report",
                            id: data.recid,
                            isDynamic: true
                        });
                        operationType = 'update';
                    } catch (e) {
                        log.error('Error loading record #' + data.recid, e);
                        throw error.create({
                            name: 'RECORD_NOT_FOUND',
                            message: 'Could not find record with ID: ' + data.recid,
                            notifyOff: false
                        });
                    }
                } else {
                    // Create new record
                    parentRec = record.create({
                        type: "customrecord_hris_expense_report",
                        isDynamic: true
                    });
                }

                // Set field values (common for both create and update)
                // Updated to include all fields from the provided JSON
                if (data.empid) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_report_emp', value: data.empid });
                }
                if (data.empname) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_report_empname', value: data.empname });
                }
                if (data.exchangerate) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_exchange_rate', value: parseFloat(data.exchangerate) });
                }
                if (data.approvalstatus) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_approval_status', value: data.approvalstatus });
                }
                if (data.approvaluserrole) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_approval_role', value: data.approvaluserrole });
                }
                if (data.expensecurrency) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_currency', value: data.expensecurrency });
                }
                if (data.departmentid) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_department', value: data.departmentid });
                }
                if (data.departmentname) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_departmentname', value: data.departmentname });
                }
                if (data.paymonth) {
                    parentRec.setText({ fieldId: 'custrecord_hris_expense_paymonth', value: data.paymonth });
                }
                if (data.payyear) {
                    parentRec.setText({ fieldId: 'custrecord_hris_expense_payyear', value: data.payyear });
                }
                if (data.classid) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_class', value: data.classid });
                }
                if (data.classname) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_classname', value: data.classname });
                }
                if (data.date) {
                    // Parse the date using N/format to ensure correct format
                    var parsedDate = format.parse({ value: data.date, type: format.Type.DATE });
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_date', value: parsedDate });
                }
                if (data.paygroupid) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_report_paygroup', value: data.paygroupid });
                }
                if (data.paygroupname) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_paygroupname', value: data.paygroupname });
                }
                if (data.totalamt) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expensereport_totalamt', value: parseFloat(data.totalamt) });
                }
                if (data.subsidiary) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_expense_subsidiary', value: data.subsidiary });
                }
                if (data.payrollcomponentid) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_payroll_component_expens', value: data.payrollcomponentid });
                }
                if (data.payrollcomponentname) {
                    parentRec.setValue({ fieldId: 'custrecord_hris_payroll_component_name', value: data.payrollcomponentname });
                }

                // Save the record
                var recId = parentRec.save();

                // Log record operation
                log.audit(operationType === 'create' ? 'Parent Record Created' : 'Parent Record Updated', 
                    { recordIndex: index, internalId: recId });

                // Update response
                response.parentRecord.Recid = recId;
                response.parentRecord.operation = operationType;
            });

        } catch (e) {
            log.error('Record Operation Error', e);
            return {
                success: false,
                message: e.message,
                name: e.name
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