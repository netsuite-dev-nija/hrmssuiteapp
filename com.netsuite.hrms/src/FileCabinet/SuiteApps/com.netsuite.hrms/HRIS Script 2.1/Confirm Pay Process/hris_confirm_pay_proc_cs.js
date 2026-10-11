/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/search', 'N/log', 'N/format', 'N/url','N/record','N/runtime'],
    (currentRecord, search, log, format, url, record, runtime) => {

        const SUBLIST_ID = 'recmachcustrecord_hris_confirm_proc_process_gro';

        /**
         * fieldChanged
         */
        const fieldChanged = (context) => {
            try {
                const rec = context.currentRecord;
                const name = context.fieldId;
                const sublistId = context.sublistId;

                if (name === 'custrecord_hris_confirm_proc_paygroup' && sublistId === SUBLIST_ID) {

                    const paygrpID = rec.getCurrentSublistValue({
                        sublistId: SUBLIST_ID,
                        fieldId: 'custrecord_hris_confirm_proc_paygroup'
                    });

                    if (paygrpID) {
                        const wageDetails = getWageDetails(paygrpID);

                        if (wageDetails) {
                            const parts = wageDetails.split('#');
                            const wage_Month = parts[0];
                            const from_date  = parts[1];
                            const to_date    = parts[2];
                            const wage_Year  = parts[3];

                            if (wage_Month && from_date && to_date && wage_Year) {
                                const formatFromDate = format.parse({ value: from_date, type: format.Type.DATE });
                                const formatToDate = format.parse({ value: to_date, type: format.Type.DATE });
                                rec.setCurrentSublistValue({
                                    sublistId: SUBLIST_ID,
                                    fieldId: 'custrecord_hris_confirm_proc_from_wage',
                                    value: formatFromDate
                                });
                                rec.setCurrentSublistValue({
                                    sublistId: SUBLIST_ID,
                                    fieldId: 'custrecord_hris_confirm_proc_to_wage',
                                    value: formatToDate
                                });
                                rec.setCurrentSublistText({
                                    sublistId: SUBLIST_ID,
                                    fieldId: 'custrecord_hris_confirm_proc_pay_month',
                                    text: wage_Month
                                });
                                rec.setCurrentSublistValue({
                                    sublistId: SUBLIST_ID,
                                    fieldId: 'custrecord_hris_confirm_proc_pay_year',
                                    value: wage_Year
                                });
                            } else {
                                alert('For this pay group confirm process has been done');
                                return false;
                            }
                        } else {
                            alert('For this pay group confirm process has been done');
                            return false;
                        }
                    }
                }
            } catch (e) {
                log.error('fieldChanged Error', e);
            }
        };

        /**
         * saveRecord
         */
        const saveRecord = (context) => {
            try {
                const rec = context.currentRecord;
                const lineCount = rec.getLineCount({ sublistId: SUBLIST_ID });

                if (lineCount > 1) {
                    alert('Error: You are only allowed to have ONE line in the process sublist. Please remove the extra lines before saving.');
                    return false;
                }

                if (lineCount === 0) {
                    alert('Error: You must add at least one Pay Group line before saving.');
                    return false;
                }

                return true;
            } catch (e) {
                log.error('saveRecord Error', e);
                return false;
            }
        };

        /**
         * validateLine
         */
        const validateLine = (context) => {
            try {
                const rec = context.currentRecord;
                const sublistId = context.sublistId;

                if (sublistId === SUBLIST_ID) {
                    const check = rec.getCurrentSublistValue({
                        sublistId: SUBLIST_ID,
                        fieldId: 'custrecord_hris_confirm_proc_check'
                    });

                    if (check === true || check === 'T') {
                        const paygrpID = rec.getCurrentSublistValue({
                            sublistId: SUBLIST_ID,
                            fieldId: 'custrecord_hris_confirm_proc_paygroup'
                        });

                        const d_ToDate = rec.getCurrentSublistValue({
                            sublistId: SUBLIST_ID,
                            fieldId: 'custrecord_hris_confirm_proc_to_wage'
                        });

                        const d_WageMonth = rec.getCurrentSublistValue({
                            sublistId: SUBLIST_ID,
                            fieldId: 'custrecord_hris_confirm_proc_pay_month'
                        });

                        const paygrpIDText = rec.getCurrentSublistText({
                            sublistId: SUBLIST_ID,
                            fieldId: 'custrecord_hris_confirm_proc_paygroup'
                        });

                        const d_WageMonth_Text = rec.getCurrentSublistText({
                            sublistId: SUBLIST_ID,
                            fieldId: 'custrecord_hris_confirm_proc_pay_month'
                        });

                        if (d_ToDate) {
                            let yearValue;
                            try {
                                const dateObj = format.parse({
                                    value: d_ToDate,
                                    type: format.Type.DATE
                                });
                                yearValue = dateObj.getFullYear();
                            } catch (e) {
                                yearValue = new Date(d_ToDate).getFullYear();
                            }

                            const b_Result = processLine(paygrpID, yearValue, d_WageMonth);

                            if (b_Result === true) {
                                return true;
                            } else {
                                alert('Kindly perform Pay Process for Pay Group: ' + paygrpIDText +
                                      ', Month: ' + d_WageMonth_Text +
                                      ' and Year: ' + yearValue + ' to add this Record');
                                return false;
                            }
                        } else {
                            alert('The Pay Group: ' + paygrpIDText + ' does not have any year associated with it!');
                            return false;
                        }
                    }
                }
                return true;
            } catch (e) {
                log.error('validateLine Error', e);
                return true;
            }
        };

          const callConfirmPayProcess = () => {
            
            try {
                 var currentrecord = currentRecord.get()
                var ConfirmProcessid = currentrecord.id;
                const ConfProcessObj = record.load({
                    type: 'customrecord_hris_confirm_pay_process',
                    id: ConfirmProcessid,
                    isDynamic: false
                });

                const lineCount = ConfProcessObj.getLineCount({
                    sublistId: 'recmachcustrecord_hris_confirm_proc_process_gro'
                });

                let trueCount = 0;
                const a_PayGroup = [];

                for (let CP = 0; CP < lineCount; CP++) {
                    const i_Check = ConfProcessObj.getSublistValue({
                        sublistId: 'recmachcustrecord_hris_confirm_proc_process_gro',
                        fieldId: 'custrecord_hris_confirm_proc_check',
                        line: CP
                    });

                    if (i_Check === true || i_Check === 'T') {
                        const payGroupId = ConfProcessObj.getSublistValue({
                            sublistId: 'recmachcustrecord_hris_confirm_proc_process_gro',
                            fieldId: 'custrecord_hris_confirm_proc_paygroup',
                            line: CP
                        });

                        a_PayGroup.push(payGroupId);
                        trueCount++;
                    }
                }

                const suiteletUrl = url.resolveScript({
                    scriptId: 'customscript_hris_cnfrmpayprooncal_v2_sl',
                    deploymentId: 'customdeploy_hris_cnfrmpayprooncal_v2_sl',
                    params: {
                        custscript_truecount: trueCount,
                        custscript_pagegroup: a_PayGroup.join(','),
                        custscript_processid: ConfirmProcessid
                    }
                });

                window.open(suiteletUrl, '_blank');

            } catch (e) {
                log.error('callConfirmPayProcess Error', e);
                alert('Error while starting Confirm Pay Process: ' + e.message);
            }
        };

        // =====================================================
        // Helper Functions
        // =====================================================

        const getWageDetails = (paygrpID) => {
            try {
                const results = search.create({
                    type: 'customrecord_hris_wage_period_details',
                    filters: [
                        ['custrecord_hris_pay_group', 'is', paygrpID],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),
                        'custrecord_hris_start_date',
                        'custrecord_hris_end_date',
                        'custrecord_hris_month',
                        'custrecord_hris_year'
                    ]
                }).run().getRange({ start: 0, end: 1 });

                if (results && results.length > 0) {
                    const wage_month     = results[0].getText('custrecord_hris_month') || '';
                    const from_wage_date = results[0].getValue('custrecord_hris_start_date') || '';
                    const to_wage_date   = results[0].getValue('custrecord_hris_end_date') || '';
                    const wage_year      = results[0].getValue('custrecord_hris_year') || '';

                    return wage_month + '#' + from_wage_date + '#' + to_wage_date + '#' + wage_year;
                }
            } catch (e) {
                log.error('getWageDetails Error', e);
            }
            return null;
        };

        const processLine = (paygrpID, yearValue, d_WageMonth) => {
            try {
                // Get Year Internal ID from custom list
                let yearInternalId = null;

                const yearSearch = search.create({
                    type: 'customlist_hris_year_master',
                    filters: [['name', 'is', yearValue.toString()]],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });

                if (yearSearch && yearSearch.length > 0) {
                    yearInternalId = yearSearch[0].getValue('internalid');
                }

                if (!yearInternalId) {
                    return false;
                }

                // Check if Pay Process already exists
                const payProcessSearch = search.create({
                    type: 'customrecord_hris_pay_process',
                    filters: [
                        ['custrecord_hris_pay_proc_pay_group', 'anyof', paygrpID],
                        'AND',
                        ['custrecord_hris_pay_proc_pay_month', 'anyof', d_WageMonth],
                        'AND',
                        ['custrecord_hris_pay_proc_year', 'anyof', yearInternalId]
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });

                return !!(payProcessSearch && payProcessSearch.length > 0);

            } catch (e) {
                log.error('processLine Error', e);
                return false;
            }
        };

        return {
            fieldChanged,
            saveRecord,
            validateLine,
            callConfirmPayProcess
        };
    });