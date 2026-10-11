/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/runtime', 'N/query', 'N/log', 'N/format'],
    function(record, search, runtime, query, log, format) {

        function getInputData() {
            try {
                var scriptObj = runtime.getCurrentScript();

                // 1. Retrieve the SINGLE parameter
                var paramString = scriptObj.getParameter({
                    name: 'custscript_hris_manual_post_acc'
                });

                log.audit('MR Input Raw', paramString);

                if (!paramString) {
                    throw new Error("Missing script parameter: custscript_hris_manual_post_acc");
                }

                // 2. Parse the JSON string back to an object
                var data = JSON.parse(paramString);

                // Validation
                if (!data.subsidiary || !data.paygroup || !data.month || !data.year) {
                    throw new Error("Invalid parameter data structure.");
                }

                // Return array with one object to trigger map once
                return [data];

            } catch (e) {
                log.error('getInputData Error', e.message);
                return [];
            }
        }

        function map(context) {
            try {
                // 1. Parse Context Data
                var data = JSON.parse(context.value);
                
                var subParameter = data.subsidiary;
                var paygroupParameter = data.paygroup;
                var monthParameter = data.month;
                var yearParameter = data.year;

                log.debug('Processing Map', 'Sub: ' + subParameter + ', Paygroup: ' + paygroupParameter);

                // 2. Helper Variables
                var monthName = getMonth(parseInt(monthParameter, 10));
                var yearName = getYear(yearParameter);
                var yearInt = parseInt(yearName, 10);

                // 3. Calculate Transaction Date (End of Month)
                var days = getmonth_days(parseInt(monthParameter, 10), parseInt(yearInt, 10));
                var today = new Date(parseInt(yearInt, 10), parseInt(monthParameter, 10) - 1, days);

                log.debug('Date Calculation', 'Year: ' + yearInt + ', Month: ' + monthParameter + ', Days: ' + days + ', TransDate: ' + today);

                // 4. Get Subsidiary Name (For Logging)
                var subsidiary_name = searchSubName(subParameter);
                log.audit('Context', 'Subsidiary: ' + subsidiary_name + ' (ID: ' + subParameter + ')');

                // 5. Check if JV Already Exists (Prevention)
                var journalQuerySql =
                    "SELECT je.id \n" +
                    "FROM transaction je \n" +
                    "JOIN transactionline jt ON je.id = jt.transaction \n" +
                    "WHERE je.type = 'Journal' \n" +
                    "AND je.custbody_hris_paygroup_jv = ? \n" +
                    "AND jt.subsidiary = ? \n" +
                    "AND je.custbody_hris_jv_month = ? \n" +
                    "AND je.custbody_hris_jv_year = ? \n" +
                    "AND je.custbody_hris_passjv_processtype = 3 \n";

                var existingJVs = query.runSuiteQL({
                    query: journalQuerySql,
                    params: [paygroupParameter, subParameter, monthParameter, yearParameter]
                }).asMappedResults();

                if (existingJVs.length > 0) {
                    log.audit('Skipping', 'Provision JV already created for this period. ID: ' + existingJVs[0].id);
                    return;
                }

                // 6. Get Accrual Totals via SuiteQL
                var accrualSql =
                    "SELECT a.custrecord_hris_accural_type AS accural_type, \n" +
                    "SUM(a.custrecord_hris_accural_amount) AS total_accural, \n" +
                    "b.custrecord_hris_accural_seqno as accuralseqno \n" +
                    "FROM customrecord_hris_monthly_accural_trans a \n" +
                    "JOIN customrecord_hris_accuraltype_master b ON a.custrecord_hris_accural_type = b.id \n" +
                    "WHERE a.custrecord_hris_accural_paygroup = ? \n" +
                    "AND a.custrecord_hris_accural_month = ? \n" +
                    "AND a.custrecord_hris_accural_year = ? \n" +
                    "GROUP BY a.custrecord_hris_accural_type, b.custrecord_hris_accural_seqno \n";

                var accrualResults = query.runSuiteQL({
                    query: accrualSql,
                    params: [paygroupParameter, monthParameter, yearParameter]
                }).asMappedResults();

                if (accrualResults.length === 0) {
                    log.audit('Skipping', 'No accrual data found for this period.');
                    return;
                }

                // 7. Aggregate Totals
                var totals = {
                    leave: 0,
                    gratuity: 0,
                    airticket: 0
                };
                for (var i = 0; i < accrualResults.length; i++) {
                    var row = accrualResults[i];
                    var amount = parseFloat(row.total_accural) || 0;
                    // Sequence mapping: 1=Leave, 2=AirTicket, 3=Gratuity
                    switch (parseInt(row.accuralseqno)) {
                        case 1:
                            totals.leave = amount;
                            break;
                        case 2:
                            totals.airticket = amount;
                            break;
                        case 3:
                            totals.gratuity = amount;
                            break;
                    }
                }

                var hasValidData = totals.leave > 0 || totals.gratuity > 0 || totals.airticket > 0;
                if (!hasValidData) {
                    log.audit('Skipping', 'Accrual totals are all zero.');
                    return;
                }

                // 8. Get Account Mappings
                var accountMappings;
                try {
                    accountMappings = getAccountMappings(paygroupParameter);
                } catch (mappingErr) {
                    log.error('Mapping Error', mappingErr);
                    return;
                }

                // 9. Create Journal Entry
                var jvRecord = record.create({
                    type: record.Type.JOURNAL_ENTRY,
                    isDynamic: true
                });

                jvRecord.setValue({ fieldId: 'customform', value: 143 }); // Ensure correct form ID
                jvRecord.setValue({ fieldId: 'approvalstatus', value: 1 }); // Approved
                jvRecord.setValue({ fieldId: 'subsidiary', value: subParameter });
                jvRecord.setValue({ fieldId: 'trandate', value: today });

                jvRecord.setValue({
                    fieldId: 'memo',
                    value: 'Accruals for ' + monthName + ' ' + yearName
                });
                // Set Custom Fields
                jvRecord.setValue({ fieldId: 'custbody_hris_paygroup_jv', value: paygroupParameter });
                jvRecord.setValue({ fieldId: 'custbody_hris_jv_month', value: monthParameter });
                jvRecord.setValue({ fieldId: 'custbody_hris_jv_year', value: yearParameter });
                jvRecord.setValue({ fieldId: 'custbody_hris_passjv_processtype', value: 3 });

                var totaldebit = 0.0;
                var totalcredit = 0.0;

                // Definition of lines to process
                var lineTypes = [{
                        name: 'leave',
                        debitKey: 'leaveDebit',
                        creditKey: 'leaveCredit',
                        memo: 'Leave Accrual'
                    },
                    {
                        name: 'gratuity',
                        debitKey: 'gratuityDebit',
                        creditKey: 'gratuityCredit',
                        memo: 'Gratuity Accrual'
                    },
                    {
                        name: 'airticket',
                        debitKey: 'airticketDebit',
                        creditKey: 'airticketCredit',
                        memo: 'Air Ticket Accrual'
                    }
                ];

                for (var t = 0; t < lineTypes.length; t++) {
                    var type = lineTypes[t];
                    var amt = totals[type.name];

                    if (amt > 0) {
                        log.debug('Adding Lines', type.name + ': ' + amt.toFixed(2));

                        // Debit Line
                        jvRecord.selectNewLine({ sublistId: 'line' });
                        jvRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: accountMappings[type.debitKey].id });
                        jvRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: amt.toFixed(2) });
                        jvRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: type.memo + ' Debit' });
                        jvRecord.commitLine({ sublistId: 'line' });

                        // Credit Line
                        jvRecord.selectNewLine({ sublistId: 'line' });
                        jvRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: accountMappings[type.creditKey].id });
                        jvRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: amt.toFixed(2) });
                        jvRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: type.memo + ' Credit' });
                        jvRecord.commitLine({ sublistId: 'line' });

                        totaldebit += amt;
                        totalcredit += amt;
                    }
                }

                // 10. Balance Check
                var diff = Math.abs(totaldebit - totalcredit);
                if (diff > 0.01) {
                    log.error('Balance Error', 'Debit (' + totaldebit + ') and Credit (' + totalcredit + ') do not balance.');
                    return;
                }

                // 11. Save Record
                var jvId = jvRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                log.audit('Success', 'Journal Entry Created Successfully. ID: ' + jvId);

            } catch (e) {
                log.error('Map Stage Error', e.message);
            }
        }

        function summarize(summary) {
            log.audit('Process Completed', 'Summary details below.');
            summary.mapSummary.errors.iterator().each(function(key, error) {
                log.error('Map Error for key: ' + key, error);
                return true;
            });
        }

        // --- Helper Functions ---

        function getAccountMappings(paygroupParameter) {
            // Mapping Sequence No to Logical Key
            var seqToKey = {
                51: 'leaveDebit',
                48: 'leaveCredit',
                47: 'gratuityDebit',
                80: 'gratuityCredit',
                36: 'airticketDebit',
                37: 'airticketCredit'
            };

            var mappings = {};
            var seqs = Object.keys(seqToKey);

            for (var s = 0; s < seqs.length; s++) {
                var seq = seqs[s];
                var results = query.runSuiteQL({
                    query: "SELECT c.id as accountid, c.acctnumber as accountnumber, BUILTIN.DF(c.id) as accounttext \n" +
                        "FROM customrecord_hris_payroll_component p \n" +
                        "INNER JOIN account c ON p.custrecord_hris_account_name = c.id \n" +
                        "WHERE p.custrecord_hris__sequence_no_ = ? AND p.isinactive = 'F' AND p.custrecord_hris_pay_process_group = ?",
                    params: [parseInt(seq), parseInt(paygroupParameter)]
                }).asMappedResults();

                if (results.length > 0) {
                    var r = results[0];
                    mappings[seqToKey[seq]] = {
                        id: r.accountid,
                        number: r.accountnumber,
                        text: r.accounttext
                    };
                } else {
                    throw 'Account config missing for Sequence: ' + seq + ', PayGroup: ' + paygroupParameter;
                }
            }
            return mappings;
        }

        function getMonth(monthParameter) {
            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months[parseInt(monthParameter, 10) - 1] || '';
        }

        function getYear(yearParameter) {
            var year = '';
            if (yearParameter) {
                try {
                    var yearRec = record.load({
                        type: 'customlist_hris_year_master',
                        id: yearParameter,
                        isDynamic: true
                    });
                    year = yearRec.getValue('name');
                } catch (e) {
                    if (!isNaN(parseInt(yearParameter)) && yearParameter.length === 4) {
                        return yearParameter;
                    }
                    log.error('getYear Error', e.message);
                }
            }
            return year;
        }

        function getmonth_days(wage_month, year) {
            var standard_month_days;
            wage_month = parseInt(wage_month, 10);
            year = parseInt(year, 10);

            if (wage_month === 1 || wage_month === 3 || wage_month === 5 || wage_month === 7 || wage_month === 8 || wage_month === 10 || wage_month === 12) {
                standard_month_days = 31;
            } else if (wage_month === 4 || wage_month === 6 || wage_month === 9 || wage_month === 11) {
                standard_month_days = 30;
            } else if (wage_month === 2) {
                if ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) {
                    standard_month_days = 29;
                } else {
                    standard_month_days = 28;
                }
            }
            return standard_month_days;
        }

        function searchSubName(subsidiariesRes) {
            var subsidiary = '';
            if (!subsidiariesRes) return subsidiary;

            try {
                var subSearch = search.create({
                    type: search.Type.SUBSIDIARY,
                    filters: [
                        ['isinactive', 'is', 'F'],
                        'AND',
                        ['internalid', 'is', parseInt(subsidiariesRes)]
                    ],
                    columns: ['name']
                });

                var results = subSearch.run().getRange({
                    start: 0,
                    end: 1
                });
                if (results.length > 0) {
                    var fullName = results[0].getValue({
                        name: 'name'
                    });
                    var parts = fullName.split(':');
                    subsidiary = parts[parts.length - 1].trim();
                }
            } catch (e) {
                log.error('searchSubName Error', e.message);
            }
            return subsidiary;
        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };
    });