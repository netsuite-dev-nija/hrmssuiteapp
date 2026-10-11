/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/query', 'N/format', 'N/ui/dialog'], 
function(query, format, dialog) {

    // --------------------------------------------------------------
    // 1. PAGE INIT – Disable Subsidiary (optional)
    // --------------------------------------------------------------
    function pageInit(context) {
        var subFld = context.currentRecord.getField({ fieldId: 'custpage_subsidiary' });
        if (subFld) {
            subFld.isDisabled = true;
        }
    }

    // --------------------------------------------------------------
    // 2. FIELD CHANGED – Trigger on Pay Group Selection
    // --------------------------------------------------------------
    function fieldChanged(context) {
      debugger;
        var rec   = context.currentRecord;
        var field = context.fieldId;

        // Only react when Pay Group is changed
        if (field === 'custpage_paygroup') {

            // 2.1 Get selected Pay Group ID directly
            var payGroupId = rec.getValue({ fieldId: 'custpage_paygroup' });

            // 2.2 Clear previous values
            rec.setValue({ fieldId: 'custpage_paydate',   value: '', ignoreFieldChange: true });
            rec.setValue({ fieldId: 'custpage_paymonth',  value: '', ignoreFieldChange: true });
            rec.setValue({ fieldId: 'custpage_payyear',   value: '', ignoreFieldChange: true });

            // 2.3 If no Pay Group selected, exit
            if (!payGroupId) {
                return;
            }

            // 2.4 Build SQL using += (your exact query)
            var sql = '';
            sql += 'SELECT ';
            sql += '    custrecord_hris_month   AS month, ';
            sql += '    custrecord_hris_year    AS year, ';
            sql += '    custrecord_hris_end_date AS enddate ';
            sql += 'FROM ';
            sql += '    customrecord_hris_wage_period_details ';
            sql += 'WHERE ';
            sql += '    custrecord_hris_pay_group = ? ';
            sql += "    AND isinactive = 'F' ";
            //sql += 'LIMIT 1';

            // 2.5 Run SuiteQL with Pay Group ID as parameter
            try {
                var resultSet = query.runSuiteQL({
                    query: sql,
                    params: [payGroupId]
                });

                var results = resultSet.asMappedResults();

                // 2.6 If data found, set fields directly
                if (results.length > 0) {
                    var row = results[0];

                    // Set Pay Date (convert string to date)
                    var endDateStr = row.enddate;
                    if (endDateStr) {
                        try {
                            var payDate = format.parse({
                                value: endDateStr,
                                type: format.Type.DATE
                            });
                            rec.setValue({
                                fieldId: 'custpage_paydate',
                                value: payDate,
                                ignoreFieldChange: true
                            });
                        } catch (e) {
                            console.error('Date parse failed', e);
                        }
                    }

                    // Set Pay Month (internal ID)
                    var monthId = row.month;
                    if (monthId) {
                        rec.setValue({
                            fieldId: 'custpage_paymonth',
                            value: monthId,
                            ignoreFieldChange: true
                        });
                    }

                    // Set Pay Year (internal ID)
                    var yearId = row.year;
                    if (yearId) {
                        rec.setValue({
                            fieldId: 'custpage_payyear',
                            value: yearId,
                            ignoreFieldChange: true
                        });
                    }
                } else {
                    dialog.alert({
                        title: 'No Data',
                        message: 'No active wage period found for this Pay Group.'
                    });
                }
            } catch (e) {
                console.error('SuiteQL Error', e);
                dialog.alert({
                    title: 'Error',
                    message: 'Failed to load wage period. Check logs.'
                });
            }
        }
    }

    // --------------------------------------------------------------
    // 3. SAVE RECORD – Validate required fields
    // --------------------------------------------------------------
    function saveRecord(context) {
        var rec = context.currentRecord;

        var payDate  = rec.getValue({ fieldId: 'custpage_paydate' });
        var payMonth = rec.getValue({ fieldId: 'custpage_paymonth' });
        var payYear  = rec.getValue({ fieldId: 'custpage_payyear' });
        var employee = rec.getValue({ fieldId: 'custpage_employee' });

        if (!payDate)  { dialog.alert({ title: 'Required', message: 'Pay Date is required.' });  return false; }
        if (!payMonth) { dialog.alert({ title: 'Required', message: 'Month is required.' });      return false; }
        if (!payYear)  { dialog.alert({ title: 'Required', message: 'Year is required.' });       return false; }
        if (!employee || employee.length === 0) {
            dialog.alert({ title: 'Required', message: 'At least one Employee must be selected.' });
            return false;
        }
        return true;
    }

    // --------------------------------------------------------------
    // 4. RETURN ENTRY POINTS
    // --------------------------------------------------------------
    return {
        //pageInit:     pageInit,
        fieldChanged: fieldChanged,
        saveRecord:   saveRecord
    };
});