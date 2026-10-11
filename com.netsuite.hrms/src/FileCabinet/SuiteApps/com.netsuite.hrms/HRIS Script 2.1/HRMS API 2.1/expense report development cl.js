/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/record', 'N/search', 'N/log','N/query'], function(currentRecord, record, search, log,query) {
    /**
     * Function triggered when a field changes on the record or sublist.
     * @param {Object} scriptContext - Context object containing current record and field information
     */
    function fieldChanged(scriptContext) {
        // Get the current record object
        var currentRec = scriptContext.currentRecord;
        // Get the field ID that changed
        var fieldId = scriptContext.fieldId;
        // Get the sublist ID (if change occurred in a sublist)
        var sublistId = scriptContext.sublistId;

        // Validate that currentRec is defined
        if (!currentRec) {
            log.error({
                title: 'Context Error',
                details: 'currentRecord is undefined in fieldChanged'
            });
            return;
        }

        try {
            // Handle main form field change for custrecord_hris_expense_currency
            if (fieldId === 'custrecord_hris_expense_currency') {
                // Get the selected currency ID from the main form
                var vendorCurrencyId = currentRec.getValue({
                    fieldId: 'custrecord_hris_expense_currency'
                });

                // Default subsidiary currency ID
                var subsidiaryCurrencyId = 1;

                // Check if currency ID is empty
                if (!vendorCurrencyId) {
                    log.debug({
                        title: 'No Vendor Currency',
                        details: 'custrecord_hris_expense_currency is empty'
                    });
                    // Set exchange rate to 0 if no currency selected
                    currentRec.setValue({
                        fieldId: 'custrecord_hris_exchange_rate',
                        value: 0,
                        ignoreFieldChange: true
                    });
                    return;
                }

                // Construct SuiteQL query to fetch the latest exchange rate
                var exchangeRateQuery = "SELECT exchangeRate as exrate FROM currencyrate WHERE basecurrency = '" + subsidiaryCurrencyId + "' AND transactioncurrency = '" + vendorCurrencyId + "' ORDER BY effectivedate DESC";
                log.debug({
                    title: 'Exchange Rate Query (Main)',
                    details: exchangeRateQuery
                });

                // Execute SuiteQL query
                var exchangeRateResults = query.runSuiteQL({
                    query: exchangeRateQuery
                }).asMappedResults();

                // Initialize exchange rate
                var exRate = 0;
                // Check if query returned results
                if (exchangeRateResults.length > 0) {
                    exRate = parseFloat(exchangeRateResults[0].exrate) || 0;
                    log.debug({
                        title: 'Main exRate',
                        details: exRate
                    });
                } else {
                    log.debug({
                        title: 'No exchange rate found for main currency',
                        details: 'No results for currency pair: ' + subsidiaryCurrencyId + ' to ' + vendorCurrencyId
                    });
                }

                // Set the exchange rate in the main form field
                currentRec.setValue({
                    fieldId: 'custrecord_hris_exchange_rate',
                    value: exRate,
                    ignoreFieldChange: true
                });
            }

            // Handle sublist field changes for recmachcustrecord_hris_expense_details_link
            if (sublistId === 'recmachcustrecord_hris_expense_details_link' && 
                (fieldId === 'custrecord_hris_expense_details_currency' || 
                 fieldId === 'custrecord_hris_expense_details_forginam' || 
                 fieldId === 'custrecord_hris_expense_details_amount' ||
                 fieldId === 'custrecord_hris_expense_details_taxcode')) {
                
                // Get the current sublist line index
                var lineIndex = currentRec.getCurrentSublistIndex({
                    sublistId: sublistId
                });

                // Validate line index
                if (lineIndex < 0 || lineIndex === null || lineIndex === undefined) {
                    log.debug({
                        title: 'Invalid Line Index',
                        details: 'Line index is invalid: ' + lineIndex
                    });
                    return;
                }

                // Select the sublist line
                currentRec.selectLine({
                    sublistId: sublistId,
                    line: lineIndex
                });

                // Handle currency field change
                if (fieldId === 'custrecord_hris_expense_details_currency') {
                    // Get the currency ID from the sublist
                    var sublistCurrencyId = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_details_currency'
                    });

                    // Default subsidiary currency ID
                    var subsidiaryCurrencyId = 1;

                    // Initialize sublist exchange rate
                    var sublistExRate = 0;

                    // Check if currency ID is empty
                    if (!sublistCurrencyId) {
                        log.debug({
                            title: 'No Sublist Currency',
                            details: 'custrecord_hris_expense_details_currency is empty for line ' + lineIndex
                        });
                    }  else {
                        // Construct SuiteQL query for sublist currency exchange rate
                        var sublistExchangeRateQuery = "SELECT exchangeRate as exrate FROM currencyrate WHERE basecurrency = '" + subsidiaryCurrencyId + "' AND transactioncurrency = '" + sublistCurrencyId + "' ORDER BY effectivedate DESC";
                        log.debug({
                            title: 'Exchange Rate Query (Sublist)',
                            details: sublistExchangeRateQuery
                        });

                        // Execute SuiteQL query
                        var sublistExchangeRateResults = query.runSuiteQL({
                            query: sublistExchangeRateQuery
                        }).asMappedResults();

                        // Check if query returned results
                        if (sublistExchangeRateResults.length > 0) {
                            sublistExRate = parseFloat(sublistExchangeRateResults[0].exrate) || 0;
                            log.debug({
                                title: 'Sublist exRate',
                                details: sublistExRate
                            });
                        } else {
                            log.debug({
                                title: 'No exchange rate found for sublist currency',
                                details: 'No results for currency ID: ' + sublistCurrencyId
                            });
                        }
                    }

                    // Set the exchange rate in the sublist
                    currentRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_details_exrate',
                        value: sublistExRate,
                        ignoreFieldChange: true
                    });

                    // Get foreign amount for amount calculation
                    var foreignAmount = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_details_forginam'
                    }) || 0;

                    // Calculate and set amount
                    calculateSublistAmounts(currentRec, sublistId, lineIndex, foreignAmount, sublistExRate);
                }

                // Handle foreign amount field change
                if (fieldId === 'custrecord_hris_expense_details_forginam') {
                    // Get foreign amount and exchange rate
                    var foreignAmount = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_details_forginam'
                    }) || 0;

                    var sublistExRate = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_details_exrate'
                    }) || 0;

                    // Calculate and set amount
                    calculateSublistAmounts(currentRec, sublistId, lineIndex, foreignAmount, sublistExRate);
                }

              //amount fieldchanged function
              if (fieldId === 'custrecord_hris_expense_details_amount') {
                debugger;
                    // Get foreign amount and exchange rate
                    var amount = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_details_amount'
                    }) || 0;

                    var taxAmt = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_tax_amt'
                    }) || 0;

                   var gross=amount+taxAmt;
                currentRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_gross_amt',
                        value: gross,
                        //ignoreFieldChange: true
                    });
                   
                }

                // Handle tax code field change
                if (fieldId === 'custrecord_hris_expense_details_taxcode') {
                    // Get tax code and amount
                    var taxCodeId = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_details_taxcode'
                    });
                    log.debug({
                        title: 'Tax Code ID',
                        details: taxCodeId
                    });

                    var amount = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_details_amount'
                    }) || 0;

                    // Initialize tax rate and tax amount
                    var taxRate = 0;
                    var taxAmount = 0;
                    var grossAmount = parseFloat(amount) || 0;

                    if (taxCodeId) {
                        try {
                            // Load the salestaxitem record
                            var taxRecord = record.load({
                                type: 'salestaxitem',
                                id: taxCodeId,
                                isDynamic: false
                            });

                            // Get tax rate
                            var rawTaxRate = taxRecord.getValue({ fieldId: 'rate' }) || 0;
                            // Handle both string and number formats
                            if (typeof rawTaxRate === 'string') {
                                taxRate = parseFloat(rawTaxRate.replace('%', '')) / 100; // Convert string like "5%" to 0.05
                            } else {
                                taxRate = parseFloat(rawTaxRate) / 100; // Convert number like 5 to 0.05
                            }
                            log.debug({
                                title: 'Tax Rate',
                                details: 'Tax rate for tax code ' + taxCodeId + ': ' + taxRate
                            });

                            // Calculate tax amount
                            taxAmount = amount * taxRate;
                            taxAmount = parseFloat(taxAmount.toFixed(2)); // Round to 2 decimal places

                            // Calculate gross amount
                            grossAmount = parseFloat(amount) + taxAmount;
                            grossAmount = parseFloat(grossAmount.toFixed(2)); // Round to 2 decimal places
                        } catch (e) {
                            log.error({
                                title: 'Error loading salestaxitem',
                                details: e.toString()
                            });
                        }
                    } else {
                        log.debug({
                            title: 'No Tax Code',
                            details: 'No tax code selected for line ' + lineIndex
                        });
                    }

                    // Set tax rate (in percentage, e.g., 5 for 5%)
                    currentRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_details_taxrate',
                        value: taxRate * 100,
                        ignoreFieldChange: true
                    });

                    // Set tax amount
                    currentRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_tax_amt',
                        value: taxAmount,
                        ignoreFieldChange: true
                    });

                    // Set gross amount
                    currentRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_gross_amt',
                        value: grossAmount,
                        ignoreFieldChange: true
                    });
                }
            }

            // Paygroup-based pay month and year development
           // Handle paygroup field change
if (fieldId === 'custrecord_hris_expense_report_paygroup') {
    debugger; // Pause for debugging
    try {
        // Get paygroup value
        var payGroup = currentRec.getValue('custrecord_hris_expense_report_paygroup');
        log.audit('Paygroup Value', 'Paygroup: ' + (payGroup || 'Empty'));

        // If paygroup exists, search for month and year
        if (payGroup) {
            // Build columns dynamically (like SELECT +=)
            var columns = 'custrecord_hris_month AS month, ';
            columns += 'custrecord_hris_year AS year';

            // Create search (mimicking SuiteQL structure)
            var wagePeriodSearch = search.create({
                type: 'customrecord_hris_wage_period_details',
                filters: [
                    ['custrecord_hris_pay_group', 'is', payGroup],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    search.createColumn({ name: 'custrecord_hris_month', label: 'month' }),
                    search.createColumn({ name: 'custrecord_hris_year', label: 'year' })
                ]
            });

            // Run search and get results
            var wagePeriodResults = wagePeriodSearch.run().getRange({ start: 0, end: 1 });
            log.audit('Wage Period Results', wagePeriodResults);

            // Process results into array of objects
            var results = [];
            for (var i = 0; i < wagePeriodResults.length; i++) {
                results.push({
                    month: wagePeriodResults[i].getValue('custrecord_hris_month') || null,
                    year: wagePeriodResults[i].getValue('custrecord_hris_year') || null
                });
            }

            // If results exist, set fields with first result
            if (results.length > 0) {
                currentRec.setValue({
                    fieldId: 'custrecord_hris_expense_paymonth',
                    value: results[0].month || '',
                    ignoreFieldChange: true
                });
                currentRec.setValue({
                    fieldId: 'custrecord_hris_expense_payyear',
                    value: results[0].year || '',
                    ignoreFieldChange: true
                });
                log.audit('Fields Set', 'Month: ' + (results[0].month || '') + ', Year: ' + (results[0].year || ''));
            } else {
                // Clear fields if no results
                currentRec.setValue({
                    fieldId: 'custrecord_hris_expense_paymonth',
                    value: '',
                    ignoreFieldChange: true
                });
                currentRec.setValue({
                    fieldId: 'custrecord_hris_expense_payyear',
                    value: '',
                    ignoreFieldChange: true
                });
                log.audit('No Results', 'No wage period for paygroup: ' + payGroup);
            }
        } else {
            // Clear fields if paygroup is empty
            currentRec.setValue({
                fieldId: 'custrecord_hris_expense_paymonth',
                value: '',
                ignoreFieldChange: true
            });
            currentRec.setValue({
                fieldId: 'custrecord_hris_expense_payyear',
                value: '',
                ignoreFieldChange: true
            });
            log.audit('No Paygroup', 'Paygroup is empty');
        }
    } catch (e) {
        log.error({ title: 'Paygroup Error', details: e.toString() });
    }
}

          //subsidiary changes
          // Handle subsidiary field change
            if (fieldId === 'custrecord_hris_expense_subsidiary') {
              debugger;
                var subsidiaryId = currentRec.getValue({
                    fieldId: 'custrecord_hris_expense_subsidiary'
                });

                if (subsidiaryId) {
                    // Directly set the subsidiary on sublist line 0
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_expense_details_link',
                        fieldId: 'custrecord_hris_details_subsidiary',
                        line: 0,
                        value: subsidiaryId,
                        //ignoreFieldChange: true
                    });
                    log.debug({
                        title: 'Subsidiary Set',
                        details: 'Set subsidiary ' + subsidiaryId + ' on sublist line 0'
                    });
                }
            }

          //handle department fieldchange
           if (fieldId === 'custrecord_hris_expense_department') {
              debugger;
                var departmentId = currentRec.getValue({
                    fieldId: 'custrecord_hris_expense_department'
                });

                if (departmentId) {
                    // Directly set the subsidiary on sublist line 0
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_expense_details_link',
                        fieldId: 'custrecord_hris_expense_detai_department',
                        line: 0,
                        value: departmentId,
                        //ignoreFieldChange: true
                    });
                    log.debug({
                        title: 'Subsidiary Set',
                        details: 'Set subsidiary ' + subsidiaryId + ' on sublist line 0'
                    });
                }
            }
          //handle class fieldchanged
          if (fieldId === 'custrecord_hris_expense_report_class') {
              debugger;
                var classId = currentRec.getValue({
                    fieldId: 'custrecord_hris_expense_report_class'
                });

                if (classId) {
                    // Directly set the subsidiary on sublist line 0
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_expense_details_link',
                        fieldId: 'custrecord_hris_employee_expense_cl_clas',
                        line: 0,
                        value: classId,
                        //ignoreFieldChange: true
                    });
                    log.debug({
                        title: 'Subsidiary Set',
                        details: 'Set subsidiary ' + subsidiaryId + ' on sublist line 0'
                    });
                }
            }
        } catch (e) {
            log.error({
                title: 'Error in fieldChanged',
                details: e.toString()
            });
        }
    }

    /**
     * Helper function to calculate and set sublist amounts (amount, tax, gross)
     * @param {Object} currentRec - Current record object
     * @param {string} sublistId - Sublist ID
     * @param {number} lineIndex - Line index
     * @param {number} foreignAmount - Foreign amount value
     * @param {number} exRate - Exchange rate
     */
    function calculateSublistAmounts(currentRec, sublistId, lineIndex, foreignAmount, exRate) {
        // Calculate amount (foreign amount * exchange rate)
        var amount = parseFloat(foreignAmount) * parseFloat(exRate);
        amount = parseFloat(amount.toFixed(2)); // Round to 2 decimal places

        // Set amount in sublist
        currentRec.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'custrecord_hris_expense_details_amount',
            value: amount,
            ignoreFieldChange: true
        });

        // Get tax code to recalculate tax if applicable
        var taxCodeId = currentRec.getCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'custrecord_hris_expense_details_taxcode'
        });

        // Initialize tax rate and tax amount
        var taxRate = 0;
        var taxAmount = 0;
        var grossAmount = amount;

        if (taxCodeId) {
            try {
                // Load the salestaxitem record
                var taxRecord = record.load({
                    type: 'salestaxitem',
                    id: taxCodeId,
                    isDynamic: false
                });

                // Get tax rate
                var rawTaxRate = taxRecord.getValue({ fieldId: 'rate' }) || 0;
                // Handle both string and number formats
                if (typeof rawTaxRate === 'string') {
                    taxRate = parseFloat(rawTaxRate.replace('%', '')) / 100; // Convert string like "5%" to 0.05
                } else {
                    taxRate = parseFloat(rawTaxRate) / 100; // Convert number like 5 to 0.05
                }
                log.debug({
                    title: 'Tax Rate in calculateSublistAmounts',
                    details: 'Tax rate for tax code ' + taxCodeId + ': ' + taxRate
                });

                // Calculate tax amount
                taxAmount = amount * taxRate;
                taxAmount = parseFloat(taxAmount.toFixed(2)); // Round to 2 decimal places

                // Calculate gross amount
                grossAmount = amount + taxAmount;
                grossAmount = parseFloat(grossAmount.toFixed(2)); // Round to 2 decimal places
            } catch (e) {
                log.error({
                    title: 'Error loading salestaxitem in calculateSublistAmounts',
                    details: e.toString()
                });
            }
        }

        // Set tax rate (in percentage)
        currentRec.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'custrecord_hris_expense_details_taxrate',
            value: taxRate * 100,
            ignoreFieldChange: true
        });

        // Set tax amount
        currentRec.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'custrecord_hris_expense_tax_amt',
            value: taxAmount,
            ignoreFieldChange: true
        });

        // Set gross amount
        currentRec.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'custrecord_hris_expense_gross_amt',
            value: grossAmount,
            ignoreFieldChange: true
        });
    }

    /**
     * Function triggered before the record is saved.
     * Sums all gross amounts from the sublist and sets the total field.
     * @param {Object} scriptContext - Context object containing current record
     * @returns {boolean} - True to allow save, false to prevent
     */
    function saveRecord(scriptContext) {
      debugger;
        try {
            // Get the current record object
            var currentRec = scriptContext.currentRecord;
            // Define the sublist ID
            var sublistId = 'recmachcustrecord_hris_expense_details_link';
            // Get the number of lines in the sublist
            var lineCount = currentRec.getLineCount({ sublistId: sublistId });
            // Initialize total gross amount
            var totalGrossAmount = 0;

            // Loop through each sublist line
            for (var i = 0; i < lineCount; i++) {
                // Get gross amount for the line
                var grossAmount = currentRec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_hris_expense_gross_amt',
                    line: i
                }) || 0;
                // Add to total
                totalGrossAmount += parseFloat(grossAmount);
            }

            // Round total to 2 decimal places
            totalGrossAmount = parseFloat(totalGrossAmount.toFixed(2));

            // Set the total gross amount in the main form field
            currentRec.setValue({
                fieldId: 'custrecord_hris_expense_report_total',
                value: totalGrossAmount,
                ignoreFieldChange: true
            });

            log.debug({
                title: 'Total Gross Amount',
                details: 'Set total gross amount to: ' + totalGrossAmount
            });

            // Return true to allow record save
            return true;
        } catch (e) {
            log.error({
                title: 'Error in saveRecord',
                details: e.toString()
            });
            // Return false to prevent save on error
            return false;
        }
    }

    /**
     * Function to create a journal entry based on expense report details
     */
    /**
 * Creates a journal entry for the expense report
 */
function jvcreation() {
    debugger; // Pause for debugging
    try {
        // Get the current record
        var currentRec = currentRecord.get();
        // Get the internal ID of the current record
        var expenseReportId = currentRec.id;

        // Load the expense report record
        var expenseRecord = record.load({
            type: 'customrecord_hris_expense_report',
            id: expenseReportId,
            isDynamic: true
        });

        // Get approval status
        var approvalStatus = expenseRecord.getValue('custrecord_hris_expense_approval_status');
        log.debug({
            title: 'Approval Status',
            details: 'Approval Status: ' + approvalStatus
        });

        // Check if the record is approved (assuming 2 is approved)
        if (approvalStatus != '2') {
            log.error({
                title: 'Approval Error',
                details: 'Journal Entry cannot be created: Record is not approved (status: ' + approvalStatus + ')'
            });
            return;
        }

        // Get field values from the expense report
        var empId = expenseRecord.getValue('custrecord_hris_expense_report_emp');
        var empName = expenseRecord.getText('custrecord_hris_expense_report_emp');
        var payGroup = expenseRecord.getValue('custrecord_hris_expense_report_paygroup');
        var payMonth = expenseRecord.getValue('custrecord_hris_expense_paymonth');
        var payMonthName = expenseRecord.getText('custrecord_hris_expense_paymonth');
        var payYear = expenseRecord.getValue('custrecord_hris_expense_payyear');
        var payYearName = expenseRecord.getText('custrecord_hris_expense_payyear');
        var payComponent = expenseRecord.getValue('custrecord_hris_payroll_component_expens');
        var subsidiary = expenseRecord.getValue('custrecord_hris_expense_subsidiary');

        // Validate required fields
        if (!empId || !payGroup || !payMonth || !payYear || !payComponent || !subsidiary) {
            log.error({
                title: 'Missing Required Fields',
                details: 'One or more required fields are missing: empId=' + empId + ', payGroup=' + payGroup + ', payMonth=' + payMonth + ', payYear=' + payYear + ', payComponent=' + payComponent + ', subsidiary=' + subsidiary
            });
            return;
        }

        // Calculate pay date (assume first day of pay month/year)
        var payDate = new Date(); // Month is 1-based in UI, 0-based in JS
        log.debug({
            title: 'Pay Date',
            details: 'Pay Date: ' + payDate
        });

        // Sum sublist amounts and collect accounts
        var sublistId = 'recmachcustrecord_hris_expense_details_link';
        var lineCount = expenseRecord.getLineCount({ sublistId: sublistId });
        var totalAmount = 0;
        var accountAmounts = {};

        for (var i = 0; i < lineCount; i++) {
            var lineAmount = expenseRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_hris_expense_details_amount',
                line: i
            }) || 0;
            var lineAccount = expenseRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_hris_expense_report_acc',
                line: i
            });

            if (!lineAccount) {
                log.error({
                    title: 'Missing Account',
                    details: 'custrecord_hris_expense_report_acc is missing on sublist line ' + i
                });
                continue;
            }

            lineAmount = parseFloat(lineAmount);
            totalAmount += lineAmount;
            accountAmounts[lineAccount] = (accountAmounts[lineAccount] || 0) + lineAmount;
        }
        totalAmount = parseFloat(totalAmount.toFixed(2));
        log.debug({
            title: 'Sublist Amounts',
            details: 'Total Amount: ' + totalAmount + ', Account Amounts: ' + JSON.stringify(accountAmounts)
        });

        // Validate total amount
        if (totalAmount <= 0) {
            log.error({
                title: 'Invalid Total Amount',
                details: 'Total sublist amount is zero or negative: ' + totalAmount
            });
            return;
        }

        // Search for credit account in customrecord_hris_accountmapping
        // According to mam told it is changed mapping to paycomponent
       /*  var accountMappingSearch = search.create({
            type: 'customrecord_hris_accountmapping',
            filters: [
                ['custrecord_hris_acctmap_subsidiary', 'is', subsidiary],
                'AND',
                ['custrecord_hris_acctmap_paygroup', 'is', payGroup],
                'AND',
                ['custrecord_hris_acctmap_paycomponent', 'is', payComponent],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'custrecord_hris_acctmap_salarypayableacc', label: 'salarypayableacc' })
            ]
        }); */
         var accountMappingSearch = search.create({
            type: 'customrecord_hris_payroll_component',
            filters: [
                
                ['custrecord_hris_pay_process_group', 'is', payGroup],
                'AND',
                 ["internalidnumber","equalto", payComponent],
                'AND',               
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'custrecord_hris_account_name', label: 'salarypayableacc' })
            ]
        });

       

        // Run search and get first result
        var accountMappingResults = accountMappingSearch.run().getRange({ start: 0, end: 1 });
        var creditAccount = accountMappingResults.length > 0 ? accountMappingResults[0].getValue('custrecord_hris_account_name') : null;
        log.debug({
            title: 'Credit Account Search',
            details: 'Credit Account: ' + (creditAccount || 'Not found') + ', Filters: subsidiary=' + subsidiary + ', payGroup=' + payGroup + ', payComponent=' + payComponent
        });

        // Validate credit account
        if (!creditAccount) {
            log.error({
                title: 'Credit Account Error',
                details: 'No salary payable account found in customrecord_hris_accountmapping for subsidiary=' + subsidiary + ', payGroup=' + payGroup + ', payComponent=' + payComponent
            });
            return;
        }

        // Create journal entry
        var jvObject = record.create({
            type: 'journalentry',
            isDynamic: true
        });

        // Set journal entry header fields
        jvObject.setValue('customform', 134); // Set custom form
        jvObject.setValue('approvalstatus', 2); // Set approval status to approved
        jvObject.setValue('subsidiary', subsidiary); // Set subsidiary
        jvObject.setValue('trandate', payDate); // Set transaction date
        jvObject.setValue('custbody_hris_paygroup_jv', payGroup); // Set paygroup
        jvObject.setValue('custbody_hris_jv_month', payMonth); // Set pay month
        jvObject.setValue('custbody_hris_jv_year', payYear); // Set pay year
        jvObject.setValue('custbody_hris_jv_employeename', empId); // Set employee ID
        jvObject.setValue('custbody_hris_jv_emplegalname', empName); // Set employee name

        // Add debit lines for each unique account
        for (var accountId in accountAmounts) {
            if (accountAmounts.hasOwnProperty(accountId)) {
                var debitAmount = parseFloat(accountAmounts[accountId].toFixed(2));
                jvObject.selectNewLine('line');
                jvObject.setCurrentSublistValue('line', 'account', accountId);
                jvObject.setCurrentSublistValue('line', 'debit', debitAmount);
                jvObject.setCurrentSublistValue('line', 'credit', 0.0);
                jvObject.setCurrentSublistValue('line', 'memo', 'Expense Report Debit for Account ' + accountId);
                jvObject.setCurrentSublistValue('line', 'entity', empId);
                jvObject.commitLine('line');
            }
        }

        // Add credit line for salary payable account
        jvObject.selectNewLine('line');
        jvObject.setCurrentSublistValue('line', 'account', creditAccount);
        jvObject.setCurrentSublistValue('line', 'debit', 0.0);
        jvObject.setCurrentSublistValue('line', 'credit', totalAmount);
        jvObject.setCurrentSublistValue('line', 'memo', 'Expense Report Credit');
        jvObject.setCurrentSublistValue('line', 'entity', empId);
        jvObject.commitLine('line');

        // Save the journal entry
        var jvRecordId = jvObject.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });
        log.debug({
            title: 'Journal Entry Created',
            details: 'JV Record ID: ' + jvRecordId
        });

        // Update expense report with journal entry ID
        var leavesettleID = record.submitFields({
            type: 'customrecord_hris_expense_report',
            id: expenseReportId,
            values: {
                'custrecord_hris_expense_journal_report': jvRecordId
            }
        });

        log.debug({
            title: 'Expense Report Updated',
            details: 'Internal ID: ' + leavesettleID
        });

        // Redirect to expense report
        var url = '/app/common/custom/custrecordentry.nl?rectype=1924&id=' + leavesettleID;
        window.location.href = url;
    } catch (e) {
        log.error({
            title: 'Error in jvcreation',
            details: e.toString()
        });
    }
}
function lineInit(scriptContext) {
        try {
            var currentRec = scriptContext.currentRecord;
            var sublistId = scriptContext.sublistId;

            if (sublistId === 'recmachcustrecord_hris_expense_details_link') {
                var lineCount = currentRec.getLineCount({
                    sublistId: sublistId
                });

                if (lineCount > 0) {
                    // Get the subsidiary value from the previous line
                    var previousSubsidiaryId = currentRec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_details_subsidiary',
                        line: lineCount - 1
                    });

                    // Get the department value from the previous line
                    var previousDepartmentId = currentRec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_expense_detai_department',
                        line: lineCount - 1
                    });

                    // Get the class value from the previous line
                    var previousClassId = currentRec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_hris_employee_expense_cl_clas',
                        line: lineCount - 1
                    });

                    // Set the subsidiary value for the new line
                    if (previousSubsidiaryId) {
                        currentRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custrecord_hris_details_subsidiary',
                            value: previousSubsidiaryId,
                            ignoreFieldChange: true
                        });
                    }

                    // Set the department value for the new line
                    if (previousDepartmentId) {
                        currentRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custrecord_hris_expense_detai_department',
                            value: previousDepartmentId,
                            ignoreFieldChange: true
                        });
                    }

                    // Set the class value for the new line
                    if (previousClassId) {
                        currentRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custrecord_hris_employee_expense_cl_clas',
                            value: previousClassId,
                            ignoreFieldChange: true
                        });
                    }

                    // Log the values set for debugging
                    log.debug({
                        title: 'LineInit Values Set',
                        details: 'Set subsidiary: ' + previousSubsidiaryId + 
                                 ', department: ' + previousDepartmentId + 
                                 ', class: ' + previousClassId + 
                                 ' on new line ' + lineCount
                    });
                }
            }
        } catch (e) {
            log.error({
                title: 'Error in lineInit',
                details: e.toString()
            });
        }
    }

    // Expose the functions to NetSuite
    return {
        fieldChanged: fieldChanged,
        saveRecord: saveRecord,
        jvcreation: jvcreation,
      lineInit:lineInit
      
    };
});