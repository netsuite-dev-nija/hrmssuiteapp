/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Confirm Pay Process - On Call Suitelet (Full SS 2.1)
 * Wage Period Logic: 21 → 20 (Pay Group 202 = 16 → 15)
 */
define(['N/ui/serverWidget', 'N/record', 'N/search', 'N/log', 'N/runtime', 'N/format'],
    (serverWidget, record, search, log, runtime, format) => {

        const onRequest = (context) => {
            const request = context.request;
            const response = context.response;

            try {
                log.debug('Request Method', request.method);

                if (request.method === 'GET') {
                    const ConfirmProcessid = request.parameters.custscript_processid;
                    const trueCount = request.parameters.custscript_truecount || '0';
                    const a_PageGroup = request.parameters.custscript_pagegroup || '';

                    log.debug('Parameters', { ConfirmProcessid, trueCount, a_PageGroup });

                    const form = serverWidget.createForm({
                        title: 'Confirm Pay Process Status'
                    });

                    addHiddenField(form, 'custpage_truecount', 'Count', trueCount);
                    addHiddenField(form, 'custpage_parentid', 'Parent ProcessId', ConfirmProcessid);
                    addHiddenField(form, 'custpage_paygroupfilter', 'PageGroup', a_PageGroup);

                    form.clientScriptModulePath = './hris_callconfirmpay_proc_cs.js';

                    if (ConfirmProcessid) {
                        processConfirmPayProcess(ConfirmProcessid);
                    }

                    response.writePage(form);
                }
            } catch (e) {
                log.error('onRequest Error', e);
                response.write('Error: ' + (e.message || e));
            }
        };

        const addHiddenField = (form, id, label, value) => {
            const f = form.addField({
                id: id,
                type: serverWidget.FieldType.TEXT,
                label: label
            });
            f.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
            if (value != null) f.defaultValue = value;
        };

        // =====================================================
        // MAIN PROCESSING
        // =====================================================
        const processConfirmPayProcess = (ConfirmProcessid) => {
            const ConfProcessObj = record.load({
                type: 'customrecord_hris_confirm_pay_process',
                id: ConfirmProcessid,
                isDynamic: false
            });

            const lineCount = ConfProcessObj.getLineCount({
                sublistId: 'recmachcustrecord_hris_confirm_proc_process_gro'
            });

            log.debug('lineCount', lineCount);

            for (let CP = 0; CP < lineCount; CP++) {
                const Check = ConfProcessObj.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_confirm_proc_process_gro',
                    fieldId: 'custrecord_hris_confirm_proc_check',
                    line: CP
                });

                if (Check !== true && Check !== 'T') continue;

                const Confirmid = ConfProcessObj.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_confirm_proc_process_gro',
                    fieldId: 'id',
                    line: CP
                });

                const paygrpID = ConfProcessObj.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_confirm_proc_process_gro',
                    fieldId: 'custrecord_hris_confirm_proc_paygroup',
                    line: CP
                });
                const From_wage = ConfProcessObj.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_confirm_proc_process_gro',
                    fieldId: 'custrecord_hris_confirm_proc_from_wage',
                    line: CP
                });
                const To_Wage = ConfProcessObj.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_confirm_proc_process_gro',
                    fieldId: 'custrecord_hris_confirm_proc_to_wage',
                    line: CP
                });
                const Pay_Month = ConfProcessObj.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_confirm_proc_process_gro',
                    fieldId: 'custrecord_hris_confirm_proc_pay_month',
                    line: CP
                });
                const Payyear = ConfProcessObj.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_confirm_proc_process_gro',
                    fieldId: 'custrecord_hris_confirm_proc_pay_year',
                    line: CP
                });

                log.debug('Processing', { paygrpID, From_wage, To_Wage, Pay_Month, Payyear, Confirmid });

                const paygroup_record = record.load({
                    type: 'customrecord_hris_process_groupmaster',
                    id: paygrpID
                });
                const pay_frequency = paygroup_record.getValue({
                    fieldId: 'custrecord_hris_pay_process_frequency'
                });

                // 1. Handle Loan Allocations
                handleLoanAllocations(paygrpID, Pay_Month, Payyear, To_Wage);

                // 2. Create next wage period
                if (pay_frequency == 2) {
                    createNextWagePeriod_HalfMonth(paygrpID, From_wage, To_Wage, Pay_Month, Payyear, ConfirmProcessid, Confirmid);
                } else {
                    createNextWagePeriod_FullMonth(paygrpID, From_wage, To_Wage, Pay_Month, Payyear, ConfirmProcessid, Confirmid);
                }

                // 3. Mark pay process as confirmed
                markPayProcessConfirmed(paygrpID, Pay_Month, Payyear);
            }
        };

        // =====================================================
        // LOAN ALLOCATION HANDLING
        // =====================================================
        const handleLoanAllocations = (paygrpID, Pay_Month, Payyear, To_Wage) => {
            try {
                const results = search.create({
                    type: 'customrecord_hris_pay_process',
                    filters: [
                        ['custrecord_hris_pay_proc_pay_group', 'anyof', paygrpID],
                        'AND',
                        ['custrecord_hris_pay_proc_pay_month', 'anyof', Pay_Month],
                        'AND',
                        ['custrecord_hris_pay_proc_year', 'anyof', Payyear],
                        'AND',
                        ['custrecord_hris_pay_proc_confirm_process', 'is', 'F'],
                        'AND',
                        ['custrecord_hris_pay_proc_loan_reference', 'noneof', '@NONE@']
                    ],
                    columns: [
                        'internalid',
                        'custrecord_hris_pay_proc_loan_reference',
                        'custrecord_hris_pay_proc_value'
                    ]
                }).run().getRange({ start: 0, end: 1000 });

                if (!results || results.length === 0) return;

                results.forEach((res) => {
                    const loan_Alloc = res.getValue('custrecord_hris_pay_proc_loan_reference');
                    const emi_value = parseFloat(res.getValue('custrecord_hris_pay_proc_value') || 0);
                    if (!loan_Alloc) return;

                    const loan_record = record.load({
                        type: 'customrecord_hris_empchange_loan_applicn',
                        id: loan_Alloc,
                        isDynamic: true
                    });

                    let paid_amount = parseFloat(loan_record.getValue('custrecord_hris_loan_paid_amount') || 0);
                    let outstanding_amt = parseFloat(loan_record.getValue('custrecord_hris_loan_outstanding_amount') || 0);
                    const loan_amount = parseFloat(loan_record.getValue('custrecord_hris_loan_amount') || 0);
                    const empValue = loan_record.getValue('custrecord_hris_loan_emp_name');

                    if (outstanding_amt <= 0) return;

                    const total_paidAmt = emi_value + paid_amount;
                    const total_outstanding_amt = loan_amount - total_paidAmt;

                    loan_record.setValue({ fieldId: 'custrecord_hris_loan_paid_amount', value: total_paidAmt });
                    loan_record.setValue({ fieldId: 'custrecord_hris_loan_outstanding_amount', value: total_outstanding_amt });

                    if (total_outstanding_amt > 0) {
                        const lineCount = loan_record.getLineCount({
                            sublistId: 'recmachcustrecord_hris_loan_alloc_link'
                        });

                        let nextStartDate = To_Wage;
                        if (lineCount > 0) {
                            const prevEnd = loan_record.getSublistValue({
                                sublistId: 'recmachcustrecord_hris_loan_alloc_link',
                                fieldId: 'custrecord_hris_loan_alloc_enddate',
                                line: lineCount - 1
                            });
                            if (prevEnd) {
                                const lastDate = parseDate(prevEnd);
                                const nextMonthEnd = new Date(lastDate.getFullYear(), lastDate.getMonth() + 2, 0);
                                nextStartDate = formatDate(nextMonthEnd);
                            }
                        }

                        const lastInst = lineCount > 0 ?
                            parseInt(loan_record.getSublistValue({
                                sublistId: 'recmachcustrecord_hris_loan_alloc_link',
                                fieldId: 'custrecord_hris_loan_alloc_installments',
                                line: lineCount - 1
                            }) || 0) : 0;

                        const nextInst = lastInst + 1;
                        const emi_amt = parseFloat(loan_record.getValue('custrecord_hris_loan_emi_amount') || 0);
                        const allocPaid = emi_amt > total_outstanding_amt ? total_outstanding_amt : emi_amt;

                        loan_record.selectNewLine({ sublistId: 'recmachcustrecord_hris_loan_alloc_link' });
                        loan_record.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_loan_alloc_link',
                            fieldId: 'custrecord_hris_loan_alloc_startdate',
                            value: nextStartDate
                        });
                        loan_record.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_loan_alloc_link',
                            fieldId: 'custrecord_hris_loan_alloc_enddate',
                            value: nextStartDate
                        });
                        loan_record.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_loan_alloc_link',
                            fieldId: 'custrecord_hris_loan_alloc_installments',
                            value: nextInst
                        });
                        loan_record.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_loan_alloc_link',
                            fieldId: 'custrecord_hris_loan_alloc_paidamount',
                            value: allocPaid
                        });
                        loan_record.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_loan_alloc_link',
                            fieldId: 'custrecord_hris_loan_alloc_emp_name',
                            value: empValue
                        });
                        loan_record.commitLine({ sublistId: 'recmachcustrecord_hris_loan_alloc_link' });
                    }

                    loan_record.save({ enableSourcing: true, ignoreMandatoryFields: true });
                });
            } catch (e) {
                log.error('handleLoanAllocations Error', e);
            }
        };

        // =====================================================
        // MARK PAY PROCESS CONFIRMED
        // =====================================================
        const markPayProcessConfirmed = (paygrpID, Pay_Month, Payyear) => {
            try {
                const results = search.create({
                    type: 'customrecord_hris_pay_process',
                    filters: [
                        ['custrecord_hris_pay_proc_pay_group', 'anyof', paygrpID],
                        'AND',
                        ['custrecord_hris_pay_proc_pay_month', 'anyof', Pay_Month],
                        'AND',
                        ['custrecord_hris_pay_proc_year', 'anyof', Payyear],
                        'AND',
                        ['custrecord_hris_pay_proc_confirm_process', 'is', 'F']
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1000 });

                (results || []).forEach((r) => {
                    record.submitFields({
                        type: 'customrecord_hris_pay_process',
                        id: r.id,
                        values: { custrecord_hris_pay_proc_confirm_process: true }
                    });
                });
            } catch (e) {
                log.error('markPayProcessConfirmed Error', e);
            }
        };

        // =====================================================
        // CREATE CONFIRM PROCESS RECORD
        // =====================================================
        const createConfirmProcessRecord = (paygrpID, Start_Date, end_Date, wage_Month, Wage_Year, ConfirmProcessid) => {
            try {
                const confirmRec = record.create({
                    type: 'customrecord_hris_confirm_process_record',
                    isDynamic: true
                });

                confirmRec.setValue({ fieldId: 'custrecord_hris_cnfrm_proce_rec_paygroup', value: paygrpID });
                confirmRec.setValue({ fieldId: 'custrecord_hris_cnfrm_proce_rec_start_da', value: parseDate(Start_Date) });
                confirmRec.setValue({ fieldId: 'custrecord_hris_cnfrm_proce_rec_end_date', value: parseDate(end_Date) });
                confirmRec.setValue({ fieldId: 'custrecord_hris_cnfrm_proce_rec_month', value: wage_Month });
                confirmRec.setValue({ fieldId: 'custrecord_hris_cnfrm_proce_rec_year', value: Wage_Year });
                confirmRec.setValue({ fieldId: 'custrecord_hris_cnfrm_proce_rec_parent_p', value: ConfirmProcessid });

                const confirmId = confirmRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
                log.audit('Confirm Process Record Created', confirmId);
                return confirmId;
            } catch (e) {
                log.error('createConfirmProcessRecord Error', e);
            }
        };

        // =====================================================
        // INACTIVATE CURRENT WAGE + DELETE CONFIRM LINE
        // =====================================================
        const inactivateCurrentWageAndDeleteConfirmLine = (wage_DetailsId, Confirmid) => {
            try {
                if (wage_DetailsId) {
                    record.submitFields({
                        type: 'customrecord_hris_wage_period_details',
                        id: wage_DetailsId,
                        values: { isinactive: true }
                    });
                    log.audit('Current Wage Period Inactivated', wage_DetailsId);
                }

                if (Confirmid) {
                    record.delete({
                        type: 'customrecord_hris_confirm_process',
                        id: Confirmid
                    });
                    log.audit('Confirm Process Line Deleted', Confirmid);
                }
            } catch (e) {
                log.error('inactivateCurrentWageAndDeleteConfirmLine Error', e);
            }
        };

        // =====================================================
        // CREATE NEXT WAGE PERIOD (FULL MONTH) - 21→20 logic
        // =====================================================
        const createNextWagePeriod_FullMonth = (paygrpID, From_wage, To_Wage, Pay_Month, Payyear, ConfirmProcessid, Confirmid) => {
            try {
                const wageDetails = getWageDetails(paygrpID, From_wage, To_Wage, Pay_Month);
                if (!wageDetails) return;

                const parts = wageDetails.split('#');
                const wage_DetailsId = parts[0];
                let wage_Month = parseInt(parts[1]);
                const Start_Date = parts[2];
                const end_Date = parts[3];
                const Wage_Year = parts[4];

                const yearTxt = getYearTxt(Wage_Year);
                let nextMonth = wage_Month + 1;
                let nextYear = yearTxt;

                if (nextMonth > 12) {
                    nextMonth = 1;
                    nextYear = parseInt(yearTxt) + 1;
                }

                // ★ 21 → 20 logic (or 16 → 15 for pay group 202)
                const dateStr = getdate(nextMonth, nextYear, paygrpID);
                if (!dateStr) return;

                let [WStartDate, WEndDate] = dateStr.split('#');

                const tot_days = getDatediffIndays_one(WStartDate, WEndDate);
                const weekend_days = getweekend_days(paygrpID);
                const weekend_count = getWeekend(WStartDate, WEndDate, weekend_days, tot_days);
                const total_wage_days = parseInt(tot_days) - parseInt(weekend_count || 0);

                const newWage = record.create({
                    type: 'customrecord_hris_wage_period_details',
                    isDynamic: true
                });

                WStartDate = format.parse({ value: WStartDate, type: format.Type.DATE });
                WEndDate   = format.parse({ value: WEndDate,   type: format.Type.DATE });

                newWage.setValue({ fieldId: 'custrecord_hris_pay_group', value: paygrpID });
                newWage.setValue({ fieldId: 'custrecord_hris_start_date', value: WStartDate });
                newWage.setValue({ fieldId: 'custrecord_hris_end_date', value: WEndDate });
                newWage.setValue({ fieldId: 'custrecord_hris_month', value: nextMonth });
                newWage.setValue({ fieldId: 'custrecord_hris_year', value: getYearInternalId(nextYear) });
                newWage.setValue({ fieldId: 'custrecord_hris_total_days', value: total_wage_days });
                newWage.save({ enableSourcing: true, ignoreMandatoryFields: true });

                log.audit('Next Wage Period Created (Full 21-20)', {
                    paygrpID, WStartDate, WEndDate, total_wage_days, nextMonth, nextYear
                });

                createConfirmProcessRecord(paygrpID, Start_Date, end_Date, wage_Month, Wage_Year, ConfirmProcessid);
                inactivateCurrentWageAndDeleteConfirmLine(wage_DetailsId, Confirmid);

            } catch (e) {
                log.error('createNextWagePeriod_FullMonth Error', e);
            }
        };

        // =====================================================
        // CREATE NEXT WAGE PERIOD (HALF MONTH)
        // =====================================================
        const createNextWagePeriod_HalfMonth = (paygrpID, From_wage, To_Wage, Pay_Month, Payyear, ConfirmProcessid, Confirmid) => {
            try {
                const wageDetails = getWageDetails(paygrpID, From_wage, To_Wage, Pay_Month);
                if (!wageDetails) return;

                const parts = wageDetails.split('#');
                const wage_DetailsId = parts[0];
                let wage_Month = parseInt(parts[1]);
                const Start_Date = parts[2];
                const end_Date = parts[3];
                const Wage_Year = parts[4];

                const endDateObj = parseDate(end_Date);
                const date_no = endDateObj.getDate();
                const yearTxt = getYearTxt(Wage_Year);

                let WStartDate, WEndDate, tot_days, nextMonth, nextYear;

                if (date_no === 15) {
                    nextMonth = wage_Month;
                    nextYear = yearTxt;
                    const GetDate = getdate_for_first_half(nextMonth, nextYear);
                    [WStartDate, WEndDate] = GetDate.split('#');

                    const endObj = parseDate(WEndDate);
                    const endDay = endObj.getDate();
                    if (endDay === 31) tot_days = 16;
                    else if (endDay === 30) tot_days = 15;
                    else if (endDay === 29) tot_days = 14;
                    else tot_days = 13;
                } else {
                    nextMonth = wage_Month + 1;
                    nextYear = yearTxt;
                    if (nextMonth > 12) {
                        nextMonth = 1;
                        nextYear = parseInt(yearTxt) + 1;
                    }
                    const GetDate = getdate_for_second_half(nextMonth, nextYear);
                    [WStartDate, WEndDate] = GetDate.split('#');
                    tot_days = 15;
                }

                const weekend_days = getweekend_days(paygrpID);
                const weekend_count = getWeekend(WStartDate, WEndDate, weekend_days, tot_days);
                const total_wage_days = parseInt(tot_days) - parseInt(weekend_count || 0);

                const newWage = record.create({
                    type: 'customrecord_hris_wage_period_details',
                    isDynamic: true
                });

                WStartDate = format.parse({ value: WStartDate, type: format.Type.DATE });
                WEndDate   = format.parse({ value: WEndDate,   type: format.Type.DATE });

                newWage.setValue({ fieldId: 'custrecord_hris_pay_group', value: paygrpID });
                newWage.setValue({ fieldId: 'custrecord_hris_start_date', value: WStartDate });
                newWage.setValue({ fieldId: 'custrecord_hris_end_date', value: WEndDate });
                newWage.setValue({ fieldId: 'custrecord_hris_month', value: nextMonth });
                newWage.setValue({ fieldId: 'custrecord_hris_year', value: getYearInternalId(nextYear) });
                newWage.setValue({ fieldId: 'custrecord_hris_total_days', value: total_wage_days });
                newWage.save({ enableSourcing: true, ignoreMandatoryFields: true });

                log.audit('Next Wage Period Created (Half)', {
                    paygrpID, WStartDate, WEndDate, total_wage_days, nextMonth, nextYear
                });

                createConfirmProcessRecord(paygrpID, Start_Date, end_Date, wage_Month, Wage_Year, ConfirmProcessid);
                inactivateCurrentWageAndDeleteConfirmLine(wage_DetailsId, Confirmid);

            } catch (e) {
                log.error('createNextWagePeriod_HalfMonth Error', e);
            }
        };

        // =====================================================
        // HELPER FUNCTIONS
        // =====================================================
        const formatToDDMMYYYY = (isoString) => {
            if (!isoString) return '';
            const d = new Date(isoString);
            const day   = String(d.getUTCDate()).padStart(2, '0');
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const year  = d.getUTCFullYear();
            return `${day}/${month}/${year}`;
        };

        const getWageDetails = (paygrpID, From_wage, To_Wage, Pay_Month) => {
            const formattedFrom = formatToDDMMYYYY(From_wage);
            const formattedTo   = formatToDDMMYYYY(To_Wage);

            try {
                const results = search.create({
                    type: 'customrecord_hris_wage_period_details',
                    filters: [
                        ['custrecord_hris_pay_group', 'is', paygrpID],
                        'AND',
                        ['custrecord_hris_start_date', 'on', formattedFrom],
                        'AND',
                        ['custrecord_hris_end_date', 'on', formattedTo],
                        'AND',
                        ['custrecord_hris_month', 'is', Pay_Month],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'internalid',
                        'custrecord_hris_month',
                        'custrecord_hris_start_date',
                        'custrecord_hris_end_date',
                        'custrecord_hris_year'
                    ]
                }).run().getRange({ start: 0, end: 1 });

                if (results && results.length > 0) {
                    return [
                        results[0].getValue('internalid'),
                        results[0].getValue('custrecord_hris_month'),
                        results[0].getValue('custrecord_hris_start_date'),
                        results[0].getValue('custrecord_hris_end_date'),
                        results[0].getValue('custrecord_hris_year')
                    ].join('#');
                }
            } catch (e) {
                log.error('getWageDetails Error', e);
            }
            return null;
        };

        // =====================================================
        // ★ getdate – 21 → 20 (Pay Group 202 = 16 → 15)
        // =====================================================
        const getdate = (Next_WageMonth, yearTxt, paygrpID) => {
            const date_format = checkDateFormat();

            let startDay = 21;
            let endDay = 20;

            if (paygrpID == 202) {
                startDay = 16;
                endDay = 15;
            }

            let EndNext_WageMonth = Next_WageMonth;
            let EndyearTxt = yearTxt;
            let startMonth = Next_WageMonth;
            let startYear = yearTxt;

            if (Next_WageMonth == 1) {
                startMonth = 12;
                startYear = parseInt(yearTxt) - 1;
            } else {
                startMonth = Next_WageMonth - 1;
            }

            return formatDateRange(startDay, startMonth, startYear, endDay, EndNext_WageMonth, EndyearTxt, date_format);
        };

        const getdate_for_first_half = (Next_WageMonth, yearTxt) => {
            const date_format = checkDateFormat();
            const endDay = getEndDay(Next_WageMonth, yearTxt);
            return formatDateRange(16, Next_WageMonth, yearTxt, endDay, Next_WageMonth, yearTxt, date_format);
        };

        const getdate_for_second_half = (Next_WageMonth, yearTxt) => {
            const date_format = checkDateFormat();
            return formatDateRange(1, Next_WageMonth, yearTxt, 15, Next_WageMonth, yearTxt, date_format);
        };

        const formatDateRange = (sDay, sMonth, sYear, eDay, eMonth, eYear, date_format) => {
            const start = buildDateString(sDay, sMonth, sYear, date_format);
            const end = buildDateString(eDay, eMonth, eYear, date_format);
            return start + '#' + end;
        };

        const buildDateString = (day, month, year, date_format) => {
            day = parseInt(day);
            month = parseInt(month);
            year = parseInt(year);

            if (date_format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
            if (date_format === 'DD/MM/YYYY' || date_format === 'D/M/YYYY') return `${day}/${month}/${year}`;
            if (date_format === 'MM/DD/YYYY' || date_format === 'M/D/YYYY') return `${month}/${day}/${year}`;
            if (date_format === 'DD-MM-YYYY') return `${day}-${month}-${year}`;
            if (date_format === 'DD.MM.YYYY' || date_format === 'D.M.YYYY') return `${day}.${month}.${year}`;
            if (date_format === 'YYYY/MM/DD' || date_format === 'YYYY/M/D') return `${year}/${month}/${day}`;
            if (date_format === 'YYYY-M-D') return `${year}-${month}-${day}`;
            return `${day}/${month}/${year}`;
        };

        const getEndDay = (wage_month, yearTxt) => {
            wage_month = parseInt(wage_month);
            if ([1, 3, 5, 7, 8, 10, 12].includes(wage_month)) return 31;
            if ([4, 6, 9, 11].includes(wage_month)) return 30;
            if (wage_month === 2) {
                return (parseInt(yearTxt) % 4 === 0) ? 29 : 28;
            }
            return 30;
        };

        const getYearTxt = (Wage_Year) => {
            try {
                const results = search.create({
                    type: 'customlist_hris_year_master',
                    filters: [['internalid', 'is', Wage_Year]],
                    columns: ['name']
                }).run().getRange({ start: 0, end: 1 });
                return results && results.length > 0 ? results[0].getValue('name') : null;
            } catch (e) {
                return null;
            }
        };

        const getYearInternalId = (yearName) => {
            try {
                const results = search.create({
                    type: 'customlist_hris_year_master',
                    filters: [['name', 'is', yearName.toString()]],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });
                return results && results.length > 0 ? results[0].id : null;
            } catch (e) {
                return null;
            }
        };

        const checkDateFormat = () => {
            try {
                return runtime.getCurrentUser().getPreference({ name: 'DATEFORMAT' }) || 'DD/MM/YYYY';
            } catch (e) {
                return 'DD/MM/YYYY';
            }
        };

        const getweekend_days = (paygrpID) => {
            try {
                const results = search.create({
                    type: 'customrecord_hris_process_groupmaster',
                    filters: [['internalid', 'is', paygrpID]],
                    columns: ['custrecord_hris_weekly_off_s']
                }).run().getRange({ start: 0, end: 1 });
                return results && results.length > 0 ? results[0].getText('custrecord_hris_weekly_off_s') : '';
            } catch (e) {
                return '';
            }
        };

        const getWeekend = (WStartDate, WEndDate, weekend_days, tot_days) => {
            try {
                if (!weekend_days) return 0;
                const offs = weekend_days.toString().split(',');
                const wo1 = (offs[0] || '').trim();
                const wo2 = (offs[1] || '').trim();

                let start = parseDate(WStartDate);
                let end = parseDate(WEndDate);
                let count = 0;

                const current = new Date(start);
                while (current <= end) {
                    const dayName = getday(current.getDay());
                    if (dayName === wo1 || dayName === wo2) count++;
                    current.setDate(current.getDate() + 1);
                }
                return count;
            } catch (e) {
                log.error('getWeekend Error', e);
                return 0;
            }
        };

        const getday = (day_no) => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[day_no] || '';
        };

        const getDatediffIndays_one = (start_date, end_date) => {
            try {
                const d1 = parseDate(start_date);
                const d2 = parseDate(end_date);
                const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
                return diff + 1;
            } catch (e) {
                return 0;
            }
        };

        const parseDate = (dateVal) => {
            if (!dateVal) return new Date();
            if (dateVal instanceof Date) return dateVal;
            try {
                return format.parse({ value: dateVal, type: format.Type.DATE });
            } catch (e) {
                return new Date(dateVal);
            }
        };

        const formatDate = (dateObj) => {
            try {
                return format.format({ value: dateObj, type: format.Type.DATE });
            } catch (e) {
                return dateObj.toString();
            }
        };

        return { onRequest };
    });