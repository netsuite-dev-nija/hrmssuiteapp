/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/search', 'N/ui/message', 'N/runtime'],
    function (currentRecord, search, message, runtime) {


        function fieldChanged(context) {
            try {
                var current = context.currentRecord;
                var fieldId = context.fieldId;

                // Auto-fill employee text
                if (fieldId === 'custpage_employee') {
                    var empText = current.getText({ fieldId: 'custpage_employee' });
                    current.setValue({
                        fieldId: 'custpage_employee_txt',
                        value: empText || ''
                    });
                }

                // Populate subsidiary based on paygroup
                /* if (fieldId === 'custpage_paygroup') {
                    var payGroupId = current.getValue({ fieldId: 'custpage_paygroup' });

                    current.setValue({ fieldId: 'custpage_subsidiary', value: '' });
                    current.getField({ fieldId: 'custpage_subsidiary' }).removeSelectOption({ value: null });

                    if (payGroupId) {
                        var paygroupSearch = search.create({
                            type: 'customrecord_hris_process_groupmaster',
                            filters: [
                                ['isinactive', 'is', 'F'],
                                'AND',
                                ['internalid', 'anyof', payGroupId]
                            ],
                            columns: [
                                search.createColumn({ name: 'namenohierarchy', join: 'custrecord_hris_subsidiary_new' }),
                                search.createColumn({ name: 'internalid', join: 'custrecord_hris_subsidiary_new' })
                            ]
                        });

                        var resultSet = paygroupSearch.run().getRange({ start: 0, end: 100 });

                        resultSet.forEach(function (result) {
                            var subId = result.getValue({ name: 'internalid', join: 'custrecord_hris_subsidiary_new' });
                            var subName = result.getValue({ name: 'namenohierarchy', join: 'custrecord_hris_subsidiary_new' });

                            current.getField({ fieldId: 'custpage_subsidiary' }).insertSelectOption({
                                value: subId,
                                text: subName,
                                isSelected: false
                            });
                        });
                    }
                } */
               if (fieldId === 'custpage_subsidiary') {
                 debugger;
            
            var subsidiaryId = current.getValue({
                fieldId: 'custpage_subsidiary'
            });

            // Get the Paygroup field object so we can modify its options
            var paygroupField = current.getField({
                fieldId: 'custpage_paygroup'
            });

            if (paygroupField) {
                // 1. Clear the Paygroup dropdown
                // In 2.x, passing value: null to removeSelectOption removes ALL options
                paygroupField.removeSelectOption({
                    value: null
                });

                // Add the default empty option
                paygroupField.insertSelectOption({
                    value: '',
                    text: '-- Select Paygroup --'
                });

                // 2. Only search if a Subsidiary is actually selected
                if (subsidiaryId) {
                    try {
                        var paygroupSearch = search.create({
                            type: 'customrecord_hris_process_groupmaster',
                            filters: [
                                ['custrecord_hris__subsidiary', 'anyof', subsidiaryId],
                                'AND',
                                ['isinactive', 'is', 'F']
                            ],
                            columns: [
                                search.createColumn({ name: 'name' })
                            ]
                        });

                        // Run the search and populate the field
                        paygroupSearch.run().each(function(result) {
                            paygroupField.insertSelectOption({
                                value: result.id,
                                text: result.getValue({ name: 'name' })
                            });
                            return true; // Continue to next result
                        });

                    } catch (e) {
                        log.error({
                            title: 'Error filtering paygroups',
                            details: e
                        });
                    }
                }
            }
        }

                // Populate employee field based on criteria
                if (['customlist_hris_process_type_list', 'month', 'year', 'custpage_paygroup', 'custpage_subsidiary'].includes(fieldId)) {
                    var processType = current.getValue('customlist_hris_process_type_list');
                    var month = current.getValue('month');
                    var year = current.getValue('year');
                    var yearTxt = year ? searchYearText(year) : null;
                    var payGroup = current.getValue('custpage_paygroup');
                    var subsidiary = current.getValue('custpage_subsidiary');

                    if (subsidiary && processType === '2' && month && year && payGroup) {
                        current.getField({ fieldId: 'custpage_employee' }).removeSelectOption({ value: null });

                        var settlementSearch = search.create({
                            type: 'customrecord_hris_settlement_process',
                            filters: [
                                ['custrecord_hris_spf_leaving_status', 'anyof', ['1', '2']],
                                'AND',
                                ['custrecord_hris_spf_subsidiary', 'is', subsidiary],
                                'AND',
                                ['isinactive', 'is', 'F'],
                                'AND',
                                ['custentity_hris_emp_settlement_jvprocess', 'is', 'F']
                            ],
                            columns: [
                                'custrecord_hris_spf_employee_legal_name',
                                'custrecord_hris_spf_emplo_name',
                                'custrecord_hris_spf_pay_date'
                            ]
                        });

                        var results = settlementSearch.run().getRange({ start: 0, end: 100 });

                        results.forEach(function (result) {
                            var payDateStr = result.getValue('custrecord_hris_spf_pay_date');
                            if (payDateStr) {
                                var payDate = new Date(payDateStr);
                                var payMonth = payDate.getMonth() + 1;
                                var payYear = payDate.getFullYear();

                                if (parseInt(month) == payMonth && parseInt(yearTxt) == payYear) {
                                    var empId = result.getValue('custrecord_hris_spf_emplo_name');
                                    var empText = result.getValue('custrecord_hris_spf_employee_legal_name');
                                    current.getField({ fieldId: 'custpage_employee' }).insertSelectOption({
                                        value: empId,
                                        text: empText,
                                        isSelected: false
                                    });
                                }
                            }
                        });
                    } else {
                        current.getField({ fieldId: 'custpage_employee' }).removeSelectOption({ value: null });
                        current.getField({ fieldId: 'custpage_employee' }).insertSelectOption({
                            value: '',
                            text: '',
                            isSelected: false
                        });
                    }
                }

            } catch (e) {
                console.log('Error in fieldChanged:', e.message);
            }
        }

        function searchYearText(yearId) {
            var yearSearch = search.lookupFields({
                type: 'customlist_hris_year_master',
                id: yearId,
                columns: ['name']
            });
            return yearSearch.name;
        }

        return {
          
          
            fieldChanged: fieldChanged
        };

    });
