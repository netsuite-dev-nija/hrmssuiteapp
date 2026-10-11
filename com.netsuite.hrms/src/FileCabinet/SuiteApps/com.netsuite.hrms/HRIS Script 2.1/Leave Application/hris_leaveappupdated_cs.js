/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * 
 * Leave Application Client Script - Full working version with half-day support
 */
define(['N/currentRecord', 'N/search', 'N/record', 'N/log', 'N/runtime', 'N/url', 'N/format'],
    (currentRecord, search, record, log, runtime, url, format) => {

        let datediff = 0;

        // =====================================================
        // pageInit
        // =====================================================
        const pageInit = (context) => {
            if (context.mode === 'create') {
                const rec = currentRecord.get();
                try {
                    rec.getField({ fieldId: 'custrecord_hris_lve_noofencashmentdays' }).isDisabled = true;
                    rec.getField({ fieldId: 'custrecord_hris_lve_cancelreason' }).isDisabled = true;
                } catch (e) {}
                rec.setValue({
                    fieldId: 'custrecord_hris_lve_totalnodays',
                    value: 0,
                    ignoreFieldChange: true
                });
            }
        };

        // =====================================================
        // saveRecord
        // =====================================================
        const saveRecord = (context) => {
            const rec = context.currentRecord;

            const encashmentCheck = rec.getValue({ fieldId: 'custrecord_hris_lve_applylveencashment' });
            const FromDate = rec.getValue({ fieldId: 'custrecord_hris_lve_fromdate' });
            const ToDate = rec.getValue({ fieldId: 'custrecord_hris_lve_todate' });
            const noOfEncashDays = rec.getValue({ fieldId: 'custrecord_hris_lve_noofencashmentdays' });

            if (encashmentCheck === true && (!noOfEncashDays || noOfEncashDays === '' || noOfEncashDays === null)) {
                alert('Please Enter No. of Encashment Days');
                return false;
            }

            if (encashmentCheck === false) {
                if (!FromDate) {
                    alert('Please Enter From Date');
                    return false;
                }
                if (!ToDate) {
                    alert('Please Enter To Date');
                    return false;
                }
            }

            const leave_type = rec.getValue({ fieldId: 'custrecord_hris_lve_leavetype' });
            if (!leave_type) {
                alert('Please select Leave Type');
                return false;
            }

            const seqInfo = get_sequence_no(leave_type);
            const seqParts = seqInfo.split('#');
            const seq_no = seqParts[0];

            const emp_name = rec.getValue({ fieldId: 'custrecord_hris_lve_employeename' });

            if (seq_no != 3) {
                const leavebalanceRec = searchLeaveBalance(leave_type, emp_name);
                const LEAVEBAL = leavebalanceRec.split('#');
                const leavebalance = LEAVEBAL[0];

                rec.setValue({
                    fieldId: 'custrecord_hris_lve_leavebalance',
                    value: leavebalance,
                    ignoreFieldChange: true
                });
                rec.setValue({
                    fieldId: 'custrecord_hris_lve_leavebalance_wholeno',
                    value: leavebalance,
                    ignoreFieldChange: true
                });
            }

            // Comp-off validation
            if (seq_no == 5) {
                const tot_days = rec.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' });
                const validTillDate = rec.getValue({ fieldId: 'custrecord_hris_lve_validtilldate' });

                if (tot_days == 0.5) {
                    const f_hday = rec.getValue({ fieldId: 'custrecord_hris_lve_fromhalfday' });
                    const t_hday = rec.getValue({ fieldId: 'custrecord_hris_lve_tohalfday' });
                    if (f_hday === false && t_hday === false) {
                        alert('Please check any one of the Half Day options');
                        return false;
                    }
                }
                if (!validTillDate) {
                    alert('Please select the Comp-off first.');
                    return false;
                }
            }

            // Support document validation
            const total_days = rec.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' });
            const leaveconf_results = search.create({
                type: 'customrecord_hris_leaveconfig',
                filters: [['internalid', 'is', leave_type]],
                columns: [
                    'custrecord_hris_lveconfig_suportdocallow',
                    'custrecord_hris_lveconfig_mindaysupport'
                ]
            }).run().getRange({ start: 0, end: 1 });

            if (leaveconf_results && leaveconf_results.length > 0) {
                const support_doc_allowed = leaveconf_results[0].getValue('custrecord_hris_lveconfig_suportdocallow');
                if (support_doc_allowed === true || support_doc_allowed === 'T') {
                    const support_doc_days = leaveconf_results[0].getValue('custrecord_hris_lveconfig_mindaysupport');
                    if (parseFloat(total_days) > parseFloat(support_doc_days || 0)) {
                        const support_doc = rec.getValue({ fieldId: 'custrecord_hris_lve_supportdocument' });
                        if (!support_doc) {
                            alert('Please attach support document');
                            return false;
                        }
                    }
                }
            }

            return true;
        };

        // =====================================================
        // fieldChanged
        // =====================================================
        const fieldChanged = (context) => {
          debugger;
            const rec = context.currentRecord;
            const name = context.fieldId;

            let seq_no = null;
            let negAllowChk = null;
            let maxNegAllow = null;

            const leave_type = rec.getValue({ fieldId: 'custrecord_hris_lve_leavetype' });
            const getUserId = rec.getValue({ fieldId: 'custrecord_hris_lve_employeename' });

            if (leave_type) {
                const seqInfo = get_sequence_no(leave_type);
                const seqParts = seqInfo.split('#');
                seq_no = seqParts[0];
                negAllowChk = seqParts[1];
                maxNegAllow = seqParts[2];
            }

            // =====================================================
            // FROM HALF DAY
            // =====================================================
            if (name === 'custrecord_hris_lve_fromhalfday') {
                const frm_halfday = rec.getValue({ fieldId: 'custrecord_hris_lve_fromhalfday' });
                const to_halfday = rec.getValue({ fieldId: 'custrecord_hris_lve_tohalfday' });
                let total_days = parseFloat(rec.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' }) || 0);
                const fromDate = rec.getValue({ fieldId: 'custrecord_hris_lve_fromdate' });
                const toDate = rec.getValue({ fieldId: 'custrecord_hris_lve_todate' });

                if (fromDate && toDate) {
                    if (fromDate === toDate && frm_halfday === true) {
                        rec.getField({ fieldId: 'custrecord_hris_lve_tohalfday' }).isDisabled = true;
                    } else {
                        rec.getField({ fieldId: 'custrecord_hris_lve_tohalfday' }).isDisabled = false;
                    }
                }

                if (seq_no == 5) {
                    const bal = rec.getValue({ fieldId: 'custrecord_hris_lve_leavebalance' });
                    if (frm_halfday === true) {
                        rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: bal, ignoreFieldChange: true });
                    }
                    return;
                }

                if (frm_halfday === true) {
                    if (to_halfday === true) {
                        datediff = total_days - 0.5;
                    } else {
                        datediff = Math.abs(total_days - 0.5);
                    }
                    rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: datediff, ignoreFieldChange: true });

                    const halfday_TF_check = halfday_Include(leave_type);
                    if (halfday_TF_check === false || halfday_TF_check === 'F') {
                        rec.setValue({ fieldId: 'custrecord_hris_lve_fromhalfday', value: false, ignoreFieldChange: true });
                        alert('Half day is not allowed for this leave type');
                        return;
                    }
                }

                if (frm_halfday === false) {
                    datediff = total_days + 0.5;
                    rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: datediff, ignoreFieldChange: true });
                }
            }

            // =====================================================
            // TO HALF DAY
            // =====================================================
            if (name === 'custrecord_hris_lve_tohalfday') {
                const frm_halfday = rec.getValue({ fieldId: 'custrecord_hris_lve_fromhalfday' });
                const to_halfday = rec.getValue({ fieldId: 'custrecord_hris_lve_tohalfday' });
                let total_days = parseFloat(rec.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' }) || 0);
                const fromDate = rec.getValue({ fieldId: 'custrecord_hris_lve_fromdate' });
                const toDate = rec.getValue({ fieldId: 'custrecord_hris_lve_todate' });

                if (fromDate && toDate) {
                    if (fromDate === toDate && to_halfday === true) {
                        rec.getField({ fieldId: 'custrecord_hris_lve_fromhalfday' }).isDisabled = true;
                    } else {
                        rec.getField({ fieldId: 'custrecord_hris_lve_fromhalfday' }).isDisabled = false;
                    }
                }

                if (seq_no == 5) {
                    const bal = rec.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' });
                    if (to_halfday === true) {
                        rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: bal, ignoreFieldChange: true });
                    }
                    return;
                }

                if (to_halfday === true) {
                    if (frm_halfday === true) {
                        datediff = total_days - 0.5;
                    } else {
                        datediff = Math.abs(total_days - 0.5);
                    }
                    rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: datediff, ignoreFieldChange: true });

                    const halfday_TF_check = halfday_Include(leave_type);
                    if (halfday_TF_check === false || halfday_TF_check === 'F') {
                        rec.setValue({ fieldId: 'custrecord_hris_lve_tohalfday', value: false, ignoreFieldChange: true });
                        alert('Half day is not allowed for this leave type');
                        return;
                    }
                }

                if (to_halfday === false) {
                    datediff = total_days + 0.5;
                    rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: datediff, ignoreFieldChange: true });
                }
            }

            // =====================================================
            // LEAVE TYPE change
            // =====================================================
            if (name === 'custrecord_hris_lve_leavetype') {
                const employee_name = rec.getValue({ fieldId: 'custrecord_hris_lve_employeename' });

                if (leave_type) {
                    if (seq_no == 5) {
                        rec.getField({ fieldId: 'custrecord_hris_lve_todate' }).isDisabled = true;
                        const leavebalanceRec = searchCompoffLeaveBalance(leave_type, employee_name);
                        const LEAVEBAL = leavebalanceRec.split('#');
                        const leavebalance = LEAVEBAL[0];
                        rec.setValue({ fieldId: 'custrecord_hris_lve_leavebalance', value: leavebalance, ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_leavebalance_wholeno', value: leavebalance, ignoreFieldChange: true });
                    } else if (seq_no != 3 && seq_no != 2 && seq_no != 5 && seq_no != 25 && seq_no != 13) {
                        const leavebalanceRec = searchLeaveBalance(leave_type, employee_name);
                        const LEAVEBAL = leavebalanceRec.split('#');
                        const leavebalance = LEAVEBAL[0];
                        const LeaveEncashbal = LEAVEBAL[1];
                        rec.setValue({ fieldId: 'custrecord_hris_lve_leavebalance', value: leavebalance, ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_leavebalance_wholeno', value: leavebalance, ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_validtilldate', value: '', ignoreFieldChange: true });
                        if (LeaveEncashbal) {
                            rec.setValue({ fieldId: 'custrecord_hris_lve_encashmentlevbalance', value: LeaveEncashbal, ignoreFieldChange: true });
                        }
                    }
                } else {
                    rec.setValue({ fieldId: 'custrecord_hris_lve_leavebalance', value: '', ignoreFieldChange: true });
                    rec.setValue({ fieldId: 'custrecord_hris_lve_leavebalance_wholeno', value: '', ignoreFieldChange: true });
                }
            }

            // =====================================================
            // FROM DATE / TO DATE – Complete Total Days Calculation
            // =====================================================
           /*  if (name === 'custrecord_hris_lve_fromdate' || name === 'custrecord_hris_lve_todate') {

                if (!leave_type) {
                    alert('Please select Leave Type first');
                    if (name === 'custrecord_hris_lve_todate') {
                        rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                    }
                    return;
                }

                const fromDateVal = rec.getValue({ fieldId: 'custrecord_hris_lve_fromdate' });
                const toDateVal   = rec.getValue({ fieldId: 'custrecord_hris_lve_todate' });

                // Basic date order validation
                if (fromDateVal && toDateVal) {
                    const f = new Date(fromDateVal);
                    const t = new Date(toDateVal);
                    if (t < f) {
                        alert('To Date should be greater than From Date');
                        rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                        return;
                    }
                    if (f > t) {
                        alert('From Date should be lesser than To Date');
                        rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                        return;
                    }
                }

                // Wait until both dates are filled
                if (!fromDateVal || !toDateVal) {
                    return;
                }

                try {
                    const fromDate = new Date(fromDateVal);
                    const toDate   = new Date(toDateVal);

                    const FrmMonth = fromDate.getMonth() + 1;
                    const FrmDt    = fromDate.getDate();
                    const TOMonth  = toDate.getMonth() + 1;
                    const ToDt     = toDate.getDate();

                    const weeklyoffIncCheck = weeklyOffInclude(leave_type);
                    const holiday_TF_check  = holidayInclude(leave_type);

                    // Same day
                    if (fromDate.getTime() === toDate.getTime()) {
                        rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: 1, ignoreFieldChange: true });
                    }
                    // Different dates
                    else {
                        const empWeeklyoff = searchEmpsWeeklyOff(getUserId);
                        const WEEKLYOFF = empWeeklyoff.split('#');
                        const WeeklyOfCount = WEEKLYOFF[0];
                        const WeeklyOffInW  = WEEKLYOFF[1] || '';

                        if (WeeklyOfCount == 2 || WeeklyOfCount == '2') {
                            const finalWeeklyOff = WeeklyOffInW ? WeeklyOffInW.split(',') : [];
                            const firstWeeklyOffD = finalWeeklyOff[0];
                            const secWeeklyOffD   = finalWeeklyOff[1];

                            if (FrmMonth == TOMonth) {
                                calculateSameMonthDays(rec, fromDate, toDate, FrmDt, ToDt,
                                    weeklyoffIncCheck, holiday_TF_check, getUserId, firstWeeklyOffD, secWeeklyOffD);
                            } else {
                                calculateDifferentMonthDays(rec, fromDate, toDate, FrmDt, ToDt, FrmMonth, TOMonth,
                                    weeklyoffIncCheck, holiday_TF_check, getUserId, firstWeeklyOffD, secWeeklyOffD);
                            }
                        }
                        else if (WeeklyOfCount == 1 || WeeklyOfCount == '1') {
                            if (FrmMonth == TOMonth) {
                                calculateSameMonthDaysSingleWO(rec, fromDate, toDate, FrmDt, ToDt,
                                    weeklyoffIncCheck, holiday_TF_check, getUserId, WeeklyOffInW);
                            } else {
                                calculateDifferentMonthDaysSingleWO(rec, fromDate, toDate, FrmDt, ToDt, FrmMonth,
                                    weeklyoffIncCheck, holiday_TF_check, getUserId, WeeklyOffInW);
                            }
                        }
                        else {
                            // No weekly off
                            const timeDiff = Math.abs(toDate.getTime() - fromDate.getTime());
                            let days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

                            if (holiday_TF_check === false || holiday_TF_check === 'F') {
                                const holiday_count = searchEmpholidays(getUserId, fromDate, toDate);
                                days = days - holiday_count;
                            }
                            rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: days, ignoreFieldChange: true });
                        }
                    }

                    // Balance validation
                    const Total_no_days = parseFloat(rec.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' }) || 0);
                    const balance = parseFloat(rec.getValue({ fieldId: 'custrecord_hris_lve_leavebalance' }) || 0);

                    if (seq_no != 3 && seq_no != 2 && seq_no != 8 && seq_no != 13 && seq_no != 25) {
                        if (Total_no_days > balance) {
                            const bal_diff = Total_no_days - balance;
                            if (negAllowChk === 'F' || negAllowChk === false) {
                                alert('Leave Balance is low');
                                rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                                rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                                rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                                return;
                            } else if (parseFloat(maxNegAllow || 0) < bal_diff) {
                                alert('You are allowed to take maximum ' + maxNegAllow + ' days of negative balance');
                                rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                                rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                                rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                                return;
                            }
                        }
                    }

                    // Holiday / Weekly-off check on From Date
                    if (name === 'custrecord_hris_lve_fromdate') {
                        const check_holiday = check_from_to_date_holiday(fromDateVal, getUserId);
                        if (check_holiday === false && seq_no != '2' && seq_no != '6' && seq_no != 13 && seq_no != 5) {
                            alert('Holiday present on this date');
                            rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                            rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                            return;
                        }
                        const check_wo = check_weeklyoff_on_frm_to_date(fromDateVal, getUserId);
                        if (check_wo === true && seq_no != '2' && seq_no != '6' && seq_no != 13 && seq_no != 5) {
                            alert('Weekly off present on this date');
                            rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                            rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                            return;
                        }
                    }

                    // Holiday / Weekly-off check on To Date + Min/Max validation
                    if (name === 'custrecord_hris_lve_todate') {
                        const check_holiday = check_from_to_date_holiday(toDateVal, getUserId);
                        if (check_holiday === false && seq_no != '2' && seq_no != '6' && seq_no != '5' &&
                            leave_type != 11 && leave_type != 12 && leave_type != 16 &&
                            leave_type != 22 && leave_type != 23 && leave_type != 24 &&
                            leave_type != 25 && leave_type != 9 && leave_type != 18) {
                            alert('Holiday present on this date');
                            rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                            rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                            return;
                        }
                        const check_wo = check_weeklyoff_on_frm_to_date(toDateVal, getUserId);
                        if (check_wo === true && seq_no != '2' && seq_no != '6' && seq_no != '5' &&
                            leave_type != 11 && leave_type != 12 && leave_type != 16 &&
                            leave_type != 22 && leave_type != 23 && leave_type != 24 &&
                            leave_type != 25 && leave_type != 9 && leave_type != 18) {
                            alert('Weekly off present on this date');
                            rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                            rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                            return;
                        }

                        // Min / Max days
                        const min_no_days = min_days_apply(leave_type);
                        const max_no_days = max_days_apply(leave_type);
                        const Total_no_days2 = parseFloat(rec.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' }) || 0);

                        if (seq_no == 4) {
                            if (Total_no_days2 != parseFloat(min_no_days) && Total_no_days2 != parseFloat(max_no_days)) {
                                rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                                rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                                rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: 0, ignoreFieldChange: true });
                                alert('Apply Vacation Leave 5 days or 10 days');
                                return;
                            }
                        } else {
                            if (min_no_days != 0 && Total_no_days2 < parseFloat(min_no_days)) {
                                alert('Minimum no. of days for selected leave is ' + min_no_days);
                                rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                                rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                                rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                                return;
                            }
                            if (max_no_days != 0 && Total_no_days2 > parseFloat(max_no_days)) {
                                alert('Total no of days should not be more than ' + max_no_days);
                                rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                                rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                                rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                                return;
                            }
                        }
                    }

                } catch (e) {
                    console.error('Date Calculation Error', e);
                    log.error('Date Calculation Error', e.toString());
                    alert('Error while calculating leave days. Please check the dates.');
                }
            } */
           // =====================================================
// FROM DATE / TO DATE – Simplified Safe Version
// =====================================================
/* if (name === 'custrecord_hris_lve_fromdate' || name === 'custrecord_hris_lve_todate') {

    const fromDateVal = rec.getValue({ fieldId: 'custrecord_hris_lve_fromdate' });
    const toDateVal   = rec.getValue({ fieldId: 'custrecord_hris_lve_todate' });

    if (!fromDateVal || !toDateVal) {
        return;
    }

    try {
        const fromDate = new Date(fromDateVal);
        const toDate   = new Date(toDateVal);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            alert('Invalid date');
            return;
        }

        if (toDate < fromDate) {
            alert('To Date should be greater than From Date');
            rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
            return;
        }

        // Simple day calculation (without weekly-off / holiday exclusion for now)
        const timeDiff = Math.abs(toDate.getTime() - fromDate.getTime());
        let days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

        // Apply half-day adjustment if already selected
        const frmHalf = rec.getValue({ fieldId: 'custrecord_hris_lve_fromhalfday' });
        const toHalf  = rec.getValue({ fieldId: 'custrecord_hris_lve_tohalfday' });

        if (frmHalf === true) days = days - 0.5;
        if (toHalf === true)  days = days - 0.5;

        if (days < 0) days = 0;

        rec.setValue({
            fieldId: 'custrecord_hris_lve_totalnodays',
            value: days,
            ignoreFieldChange: true
        });

        // Basic balance check
        const balance = parseFloat(rec.getValue({ fieldId: 'custrecord_hris_lve_leavebalance' }) || 0);
        if (seq_no != 2 && seq_no != 3 && seq_no != 5 && seq_no != 8 && seq_no != 13 && seq_no != 25) {
            if (days > balance) {
                alert('Leave Balance is low');
                rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
            }
        }

    } catch (e) {
        console.error('Date calculation failed:', e);
        // Do not show alert – just log
    }
} */
// =====================================================
// FROM DATE / TO DATE – Full Logic (Error-Free)
// =====================================================
if (name === 'custrecord_hris_lve_fromdate' || name === 'custrecord_hris_lve_todate') {

    if (!leave_type) {
        if (name === 'custrecord_hris_lve_todate') {
            alert('Please select Leave Type first');
            rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
        }
        return;
    }

    const fromDateVal = rec.getValue({ fieldId: 'custrecord_hris_lve_fromdate' });
    const toDateVal   = rec.getValue({ fieldId: 'custrecord_hris_lve_todate' });
      const fromDate = new Date(fromDateVal);
        const toDate   = new Date(toDateVal);

   /*  if (!fromDateVal || !toDateVal) {
        return;
    } */
/* if (!fromDateVal && !toDateVal && isNaN(fromDate.getTime()) && isNaN(toDate.getTime())){ */
if (fromDateVal && toDateVal){
    try {
      

      /*   if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return;
        } */

        if (toDate < fromDate) {
            alert('To Date should be greater than From Date');
            rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
            return;
        }

        // ===================== TOTAL DAYS CALCULATION =====================
        const FrmMonth = fromDate.getMonth() + 1;
        const FrmDt    = fromDate.getDate();
        const TOMonth  = toDate.getMonth() + 1;
        const ToDt     = toDate.getDate();

        const weeklyoffIncCheck = weeklyOffInclude(leave_type);
        const holiday_TF_check  = holidayInclude(leave_type);

        let WeeklyOfCount = 0;
        let WeeklyOffInW  = '';
        let firstWeeklyOffD = null;
        let secWeeklyOffD   = null;

        try {
            const empWeeklyoff = searchEmpsWeeklyOff(getUserId);
            if (empWeeklyoff) {
                const parts = empWeeklyoff.split('#');
                WeeklyOfCount = parts[0] || 0;
                WeeklyOffInW  = parts[1] || '';
                if (WeeklyOffInW) {
                    const offs = WeeklyOffInW.split(',');
                    firstWeeklyOffD = offs[0] || null;
                    secWeeklyOffD   = offs[1] || null;
                }
            }
        } catch (e) {
            console.log('WeeklyOff search skipped', e);
        }

        // Same day
        if (fromDate.getTime() === toDate.getTime()) {
            rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: 1, ignoreFieldChange: true });
        }
        // Different days
        else {
            try {
                if (WeeklyOfCount == 2 || WeeklyOfCount == '2') {
                    if (FrmMonth == TOMonth) {
                        calculateSameMonthDays(rec, fromDate, toDate, FrmDt, ToDt,
                            weeklyoffIncCheck, holiday_TF_check, getUserId, firstWeeklyOffD, secWeeklyOffD);
                    } else {
                        calculateDifferentMonthDays(rec, fromDate, toDate, FrmDt, ToDt, FrmMonth, TOMonth,
                            weeklyoffIncCheck, holiday_TF_check, getUserId, firstWeeklyOffD, secWeeklyOffD);
                    }
                }
                else if (WeeklyOfCount == 1 || WeeklyOfCount == '1') {
                    if (FrmMonth == TOMonth) {
                        calculateSameMonthDaysSingleWO(rec, fromDate, toDate, FrmDt, ToDt,
                            weeklyoffIncCheck, holiday_TF_check, getUserId, WeeklyOffInW);
                    } else {
                        calculateDifferentMonthDaysSingleWO(rec, fromDate, toDate, FrmDt, ToDt, FrmMonth,
                            weeklyoffIncCheck, holiday_TF_check, getUserId, WeeklyOffInW);
                    }
                }
                else {
                    // Simple calculation
                    const timeDiff = Math.abs(toDate.getTime() - fromDate.getTime());
                    let days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

                    if (holiday_TF_check === false || holiday_TF_check === 'F') {
                        try {
                            const holiday_count = searchEmpholidays(getUserId, fromDate, toDate);
                            days = days - (holiday_count || 0);
                        } catch (e) {}
                    }
                    if (days < 0) days = 0;
                    rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: days, ignoreFieldChange: true });
                }
            } catch (calcErr) {
                console.error('Day calculation error', calcErr);
                // Fallback to simple calculation
                const timeDiff = Math.abs(toDate.getTime() - fromDate.getTime());
                let days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: days, ignoreFieldChange: true });
            }
        }

        // ===================== BALANCE VALIDATION =====================
        try {
            const Total_no_days = parseFloat(rec.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' }) || 0);
            const balance = parseFloat(rec.getValue({ fieldId: 'custrecord_hris_lve_leavebalance' }) || 0);

            if (seq_no != 3 && seq_no != 2 && seq_no != 8 && seq_no != 13 && seq_no != 25) {
                if (Total_no_days > balance) {
                    const bal_diff = Total_no_days - balance;
                    if (negAllowChk === 'F' || negAllowChk === false) {
                        alert('Leave Balance is low');
                        rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                        return;
                    } else if (parseFloat(maxNegAllow || 0) < bal_diff) {
                        alert('You are allowed to take maximum ' + maxNegAllow + ' days of negative balance');
                        rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                        return;
                    }
                }
            }
        } catch (e) {
            console.log('Balance validation skipped', e);
        }
    
       

    } catch (e) {
        // Final safety net – only log, never show alert
        console.error('Unexpected error in date logic:', e);
    }
}
     // ===================== HOLIDAY / WEEKLY OFF CHECK =====================
        // These checks are wrapped so they never crash the script
        if (name === 'custrecord_hris_lve_fromdate') {
            if(!fromDateVal){ 
                return;
            }
           const formattedfromDateVal = format.format({
                value: fromDateVal,
                type: format.Type.DATE
            });
            
            try {
                const isHoliday = check_from_to_date_holiday(formattedfromDateVal, getUserId);
                if (isHoliday === false && seq_no != '2' && seq_no != '6' && seq_no != 13 && seq_no != 5) {
                    alert('Holiday present on this date');
                    rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                    rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                    return;
                }

                const isWO = check_weeklyoff_on_frm_to_date(formattedfromDateVal, getUserId);
                if (isWO === true && seq_no != '2' && seq_no != '6' && seq_no != 13 && seq_no != 5) {
                    alert('Weekly off present on this date');
                    rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                    rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                    return;
                }
            } catch (e) {
                console.log('From Date holiday/WO check skipped', e);
            }
        }

        if (name === 'custrecord_hris_lve_todate') {
            if(!toDateVal){
                return;
            }
           const   formattedtoDateVal = format.format({
                value: toDateVal,
                type: format.Type.DATE
            });
            try {
                const isHoliday = check_from_to_date_holiday(formattedtoDateVal, getUserId);
                if (isHoliday === false && seq_no != '2' && seq_no != '6' && seq_no != '5' &&
                    leave_type != 11 && leave_type != 12 && leave_type != 16 &&
                    leave_type != 22 && leave_type != 23 && leave_type != 24 &&
                    leave_type != 25 && leave_type != 9 && leave_type != 18) {
                    alert('Holiday present on this date');
                    rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                    rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                    return;
                }

                const isWO = check_weeklyoff_on_frm_to_date(formattedtoDateVal, getUserId);
                if (isWO === true && seq_no != '2' && seq_no != '6' && seq_no != '5' &&
                    leave_type != 11 && leave_type != 12 && leave_type != 16 &&
                    leave_type != 22 && leave_type != 23 && leave_type != 24 &&
                    leave_type != 25 && leave_type != 9 && leave_type != 18) {
                    alert('Weekly off present on this date');
                    rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                    rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                    return;
                }
            } catch (e) {
                console.log('To Date holiday/WO check skipped', e);
            }

            // Min / Max days validation
            try {
                const min_no_days = min_days_apply(leave_type);
                const max_no_days = max_days_apply(leave_type);
                const Total_no_days2 = parseFloat(rec.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' }) || 0);

                if (seq_no == 4) {
                    if (Total_no_days2 != parseFloat(min_no_days) && Total_no_days2 != parseFloat(max_no_days)) {
                        rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: 0, ignoreFieldChange: true });
                        alert('Apply Vacation Leave 5 days or 10 days');
                        return;
                    }
                } else {
                    if (min_no_days != 0 && Total_no_days2 < parseFloat(min_no_days)) {
                        alert('Minimum no. of days for selected leave is ' + min_no_days);
                        rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                        return;
                    }
                    if (max_no_days != 0 && Total_no_days2 > parseFloat(max_no_days)) {
                        alert('Total no of days should not be more than ' + max_no_days);
                        rec.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true });
                        rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true });
                        return;
                    }
                }
            } catch (e) {
                console.log('Min/Max validation skipped', e);
            }
        }
}



            // =====================================================
            // LEAVE BALANCE change (Comp-off)
            // =====================================================
            if (name === 'custrecord_hris_lve_leavebalance') {
                if (seq_no == 5) {
                    const leave_bal = parseFloat(rec.getValue({ fieldId: 'custrecord_hris_lve_leavebalance' }) || 0);
                    if (leave_bal == 1) {
                        rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: 1, ignoreFieldChange: true });
                        rec.getField({ fieldId: 'custrecord_hris_lve_fromhalfday' }).isDisabled = true;
                        rec.getField({ fieldId: 'custrecord_hris_lve_tohalfday' }).isDisabled = true;
                    }
                    if (leave_bal == 0.5) {
                        rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: 0.5, ignoreFieldChange: true });
                        const f_hday = rec.getValue({ fieldId: 'custrecord_hris_lve_fromhalfday' });
                        const t_hday = rec.getValue({ fieldId: 'custrecord_hris_lve_tohalfday' });
                        rec.getField({ fieldId: 'custrecord_hris_lve_tohalfday' }).isDisabled = (f_hday === true);
                        rec.getField({ fieldId: 'custrecord_hris_lve_fromhalfday' }).isDisabled = (t_hday === true);
                    }
                }
            }

            // =====================================================
            // CANCELLATION
            // =====================================================
            if (name === 'custrecord_hris_leavecancellation' || name === 'custrecord_hris_lve_cancellation') {
                const leave_cancel_check = rec.getValue({ fieldId: name });
                const application_status_id = rec.getValue({ fieldId: 'custrecord_hris_lve_hrmsapprovalstatus' });
                const reasonFieldId = name === 'custrecord_hris_leavecancellation'
                    ? '_hris_leavecanreason'
                    : 'custrecord_hris_lve_cancelreason';

                try {
                    rec.getField({ fieldId: reasonFieldId }).isDisabled = (leave_cancel_check !== true);
                } catch (e) {}

                if (application_status_id == '2' && leave_type) {
                    try {
                        const leave_type_conf = record.load({
                            type: 'customrecord_hris_leaveconfig',
                            id: leave_type
                        });
                        const leave_cancel_period = leave_type_conf.getValue({ fieldId: 'custrecord_hris_lveconfig_levcancelperod' });
                        if (leave_cancel_period && leave_cancel_period != 0) {
                            const to_date_val = rec.getValue({ fieldId: 'custrecord_hris_lve_todate' });
                            if (to_date_val) {
                                const cancel_date = new Date(to_date_val);
                                cancel_date.setDate(cancel_date.getDate() + parseInt(leave_cancel_period));
                                if (cancel_date < new Date()) {
                                    alert('You are not allowed to cancel this leave');
                                    rec.setValue({ fieldId: name, value: false, ignoreFieldChange: true });
                                    try {
                                        rec.getField({ fieldId: reasonFieldId }).isDisabled = true;
                                    } catch (e) {}
                                }
                            }
                        }
                    } catch (e) {}
                }
            }
        };

        // =====================================================================
        // Helper Functions
        // =====================================================================

        const searchLeaveBalance = (leave_type, getUserId) => {
            let leave_balance = 0;
            let encash_balance = 0;
            if (leave_type) {
                const results = search.create({
                    type: 'customrecord_hris_leavebalance',
                    filters: [
                        ['custrecord_hris_lvbal_leave_type', 'is', leave_type],
                        'AND',
                        ['custrecord_hris_lvbal_employee_name', 'is', getUserId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'custrecord_hris_lvbal_available_leave_ba',
                        'custrecord_hris_lvbal_encashable_days'
                    ]
                }).run().getRange({ start: 0, end: 1 });

                if (results && results.length > 0) {
                    leave_balance = results[0].getValue('custrecord_hris_lvbal_available_leave_ba') || 0;
                    encash_balance = results[0].getValue('custrecord_hris_lvbal_encashable_days') || 0;
                } else {
                    alert('Leave balance is not available for selected leave type.');
                }
            }
            return leave_balance + '#' + encash_balance;
        };

        const searchCompoffLeaveBalance = (leave_type, getUserId) => {
            let leave_balance = 0;
            let encash_balance = 0;
            if (leave_type) {
                const results = search.create({
                    type: 'customrecord_hris_leavebalance',
                    filters: [
                        ['custrecord_hris_lvbal_leave_type', 'is', leave_type],
                        'AND',
                        ['custrecord_hris_lvbal_employee_name', 'is', getUserId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'custrecord_hris_lvbal_available_leave_ba',
                        'custrecord_hris_lvbal_encashable_days'
                    ]
                }).run().getRange({ start: 0, end: 1 });

                if (results && results.length > 0) {
                    leave_balance = results[0].getValue('custrecord_hris_lvbal_available_leave_ba') || 0;
                    encash_balance = results[0].getValue('custrecord_hris_lvbal_encashable_days') || 0;
                } else {
                    alert('Please Raise Comp-off First.');
                }
            }
            return leave_balance + '#' + encash_balance;
        };

        const halfday_Include = (leave_type) => {
            if (!leave_type) return false;
            const results = search.create({
                type: 'customrecord_hris_leaveconfig',
                filters: [['internalid', 'is', leave_type]],
                columns: ['custrecord_hris_lveconfig_allowhalfday']
            }).run().getRange({ start: 0, end: 1 });
            return results && results.length > 0 ? results[0].getValue('custrecord_hris_lveconfig_allowhalfday') : false;
        };

        const weeklyOffInclude = (leave_type) => {
            if (!leave_type) return false;
            const results = search.create({
                type: 'customrecord_hris_leaveconfig',
                filters: [['internalid', 'is', leave_type]],
                columns: ['custrecord_hris_lveconfig_includeweekoff']
            }).run().getRange({ start: 0, end: 1 });
            return results && results.length > 0 ? results[0].getValue('custrecord_hris_lveconfig_includeweekoff') : false;
        };

        const holidayInclude = (leave_type) => {
            if (!leave_type) return false;
            const results = search.create({
                type: 'customrecord_hris_leaveconfig',
                filters: [['internalid', 'is', leave_type]],
                columns: ['custrecord_hris_lveconfig_includeholiday']
            }).run().getRange({ start: 0, end: 1 });
            return results && results.length > 0 ? results[0].getValue('custrecord_hris_lveconfig_includeholiday') : false;
        };

        const searchEmpsWeeklyOff = (getUserId) => {
            let Count = 0;
            let s_weeklyoff = '';
            const results = search.create({
                type: 'customrecord_hris_employeedatasourcing',
                filters: [['custrecord_hris_eds_employee', 'anyof', getUserId]],
                columns: ['custrecord_hris_eds_employeeweeklyoff']
            }).run().getRange({ start: 0, end: 1 });

            if (results && results.length > 0) {
                s_weeklyoff = results[0].getValue('custrecord_hris_eds_employeeweeklyoff') || '';
                if (s_weeklyoff.length === 3) Count = 2;
                else if (s_weeklyoff.length === 1) Count = 1;
            }
            return Count + '#' + s_weeklyoff;
        };

        const getArryMonthDays = (FrmMonth) => {
            FrmMonth = parseInt(FrmMonth);
            if ([1, 3, 5, 7, 8, 10, 12].includes(FrmMonth)) return 31;
            if ([4, 6, 9, 11].includes(FrmMonth)) return 30;
            if (FrmMonth === 2) {
                const year = new Date().getFullYear();
                return (year % 4 === 0) ? 29 : 28;
            }
            return 30;
        };

        const get_excluded_weeklyoff_days = (fromDate, toDate, FrmDt, ToDt) => {
            const date_push = [];
            const frm_dt = new Date(fromDate);
            const count_date = parseFloat(ToDt) - parseFloat(FrmDt) + 1;
            let date_day = frm_dt.getDay() + 1;

            for (let i = 1; i <= count_date; i++) {
                if (date_day >= 8) date_day = 1;
                date_push.push(date_day);
                date_day = parseInt(date_day) + 1;
            }
            return date_push;
        };

        const get_excluded_weeklyoff_days_for_different_months = (firstMonthDays, fromDate, toDate, FrmDt, ToDt) => {
            const date_push = [];
            const frm_dt = new Date(fromDate);
            const timeDiff = Math.abs(toDate.getTime() - fromDate.getTime());
            let finaldays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
            let date_day = frm_dt.getDay();

            if (date_day == 6) date_day = 7;
            else if (date_day == 0) date_day = 1;
            else date_day = date_day + 1;

            for (let i = 1; i <= finaldays; i++) {
                if (date_day > 7) date_day = 1;
                date_push.push(date_day);
                date_day = parseFloat(date_day) + 1;
            }
            return date_push;
        };

        const searchEmpholidays = (getUserId, fromDate, toDate) => {
            let count = 0;
            const results = search.create({
                type: 'customrecord_hris_employeedatasourcing',
                filters: [['custrecord_hris_eds_employee', 'anyof', getUserId]],
                columns: ['custrecord_hris_eds_employeeholidays']
            }).run().getRange({ start: 0, end: 1 });

            if (results && results.length > 0) {
                let holidayList = (results[0].getValue('custrecord_hris_eds_employeeholidays') || '').split(',');
                holidayList.forEach((holidayId) => {
                    if (holidayId) {
                        try {
                            const a_holidayData = search.lookupFields({
                                type: 'customrecord_hris_holiday_master',
                                id: holidayId,
                                columns: ['custrecord_hris_holiday_date', 'isinactive', 'custrecord_hris_holidayconsiderforleave']
                            });
                            if (a_holidayData && a_holidayData.custrecord_hris_holiday_date) {
                                const holidayDate = new Date(a_holidayData.custrecord_hris_holiday_date);
                                if (holidayDate > fromDate && holidayDate < toDate &&
                                    (a_holidayData.isinactive === false || a_holidayData.isinactive === 'F') &&
                                    (a_holidayData.custrecord_hris_holidayconsiderforleave === true || a_holidayData.custrecord_hris_holidayconsiderforleave === 'T')) {
                                    count++;
                                }
                            }
                        } catch (e) {}
                    }
                });
            }
            return count;
        };

        const min_days_apply = (leave_type) => {
            if (!leave_type) return 0;
            const results = search.create({
                type: 'customrecord_hris_leaveconfig',
                filters: [['internalid', 'is', leave_type]],
                columns: ['custrecord_hris_lvecnfg_mindaystoapply']
            }).run().getRange({ start: 0, end: 1 });
            return results && results.length > 0 ? results[0].getValue('custrecord_hris_lvecnfg_mindaystoapply') : 0;
        };

        const max_days_apply = (leave_type) => {
            if (!leave_type) return 0;
            const results = search.create({
                type: 'customrecord_hris_leaveconfig',
                filters: [['internalid', 'is', leave_type]],
                columns: ['custrecord_hris_lvecfg_maxdaystoapply']
            }).run().getRange({ start: 0, end: 1 });
            return results && results.length > 0 ? results[0].getValue('custrecord_hris_lvecfg_maxdaystoapply') : 0;
        };

       /*  const check_from_to_date_holiday = (frm_date, getUserId) => {
            debugger;
            let result = true;
            const results = search.create({
                type: 'customrecord_hris_holiday_master',
                filters: [
                    ['custrecord_hris_holidayconsiderforleave', 'is', 'T'],
                    'AND',
                    ['custrecord_hris_holiday_date', 'on', frm_date]
                ],
                columns: ['internalid']
            }).run().getRange({ start: 0, end: 10 });

            if (results && results.length > 0) {
                for (let i = 0; i < results.length; i++) {
                    const Holiday_name = results[i].getValue('internalid');
                    result = holiday_check_with_employee(getUserId, Holiday_name);
                    if (result === false) break;
                }
            }
            return result;
        }; */
        const check_from_to_date_holiday = (frm_date, getUserId) => {
    debugger;
    let result = true;
    
    try {
        const results = search.create({
            type: 'customrecord_hris_holiday_master',
            filters: [
                ['custrecord_hris_holidayconsiderforleave', 'is', 'T'],
                'AND',
                ['custrecord_hris_holiday_date', 'on', frm_date]
            ],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 10 });

        if (results && results.length > 0) {
            for (let i = 0; i < results.length; i++) {
                const Holiday_name = results[i].getValue('internalid');
                result = holiday_check_with_employee(getUserId, Holiday_name);
                if (result === false) break;
            }
        }
    } catch (error) {
        log.error({
            title: 'Error in check_from_to_date_holiday',
            details: error.message || error
        });
        // Safely fail or handle fallback if an error occurs
        result = false; 
    }
    
    return result;
};

        const holiday_check_with_employee = (getUserId, Holiday_name) => {
            debugger;
            const results = search.create({
                type: 'customrecord_hris_employeedatasourcing',
                filters: [
                    ['custrecord_hris_eds_employee', 'anyof', getUserId],
                    'AND',
                    ['custrecord_hris_eds_employeeholidays', 'anyof', Holiday_name]
                ],
                columns: ['custrecord_hris_eds_employeeholidays']
            }).run().getRange({ start: 0, end: 1 });
            return !(results && results.length > 0);
        };

        const check_weeklyoff_on_frm_to_date = (frm_date, getUserId) => {
            debugger;
        /*     const date = new Date(frm_date);
            const day = date.toString().split(' ')[0]; */

            // 1. Parse the date safely
const [day, month, year] = frm_date.split('/');
const date = new Date(year, month - 1, day);   // month is 0-based

// 2. Get the day name
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayName = dayNames[date.getDay()];
            const week_result = search.create({
                type: 'customlist_hris_week_days',
                filters: [['name', 'startswith', dayName]],
                columns: ['internalid']
            }).run().getRange({ start: 0, end: 1 });

            if (week_result && week_result.length > 0) {
                const internal_id = week_result[0].getValue('internalid');
                return check_function(getUserId, internal_id);
            }
            return false;
        };

        const check_function = (getUserId, internal_id) => {
            debugger;
            const results = search.create({
                type: 'customrecord_hris_employeedatasourcing',
                filters: [
                    ['custrecord_hris_eds_employee', 'anyof', getUserId],
                    'AND',
                    ['custrecord_hris_eds_employeeweeklyoff', 'anyof', internal_id]
                ],
                columns: ['custrecord_hris_eds_employee']
            }).run().getRange({ start: 0, end: 1 });
            return !!(results && results.length > 0);
        };

        const get_sequence_no = (leave_type) => {
            if (!leave_type) return '0#F#0';
            const results = search.create({
                type: 'customrecord_hris_leaveconfig',
                filters: [['internalid', 'is', leave_type]],
                columns: [
                    'custrecord_hris_lvecnfg_seqno',
                    'custrecord_hris_lveconfig_allowneglevbal',
                    'custrecord_hris_lvecfg_maxnegativebal'
                ]
            }).run().getRange({ start: 0, end: 1 });

            if (results && results.length > 0) {
                return results[0].getValue('custrecord_hris_lvecnfg_seqno') + '#' +
                       results[0].getValue('custrecord_hris_lveconfig_allowneglevbal') + '#' +
                       results[0].getValue('custrecord_hris_lvecfg_maxnegativebal');
            }
            return '0#F#0';
        };

        // =====================================================
        // Day Calculation Helpers
        // =====================================================
        const calculateSameMonthDays = (rec, fromDate, toDate, FrmDt, ToDt, weeklyoffIncCheck, holiday_TF_check, getUserId, firstWeeklyOffD, secWeeklyOffD) => {
            const timeDiff = Math.abs(toDate.getTime() - fromDate.getTime());
            let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

            if (weeklyoffIncCheck === true || weeklyoffIncCheck === 'T') {
                if (holiday_TF_check === true || holiday_TF_check === 'T') {
                    rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: diffDays, ignoreFieldChange: true });
                } else {
                    const holiday_count = searchEmpholidays(getUserId, fromDate, toDate);
                    diffDays = diffDays - holiday_count;
                    rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: diffDays, ignoreFieldChange: true });
                }
            } else {
                const get_all_dates = get_excluded_weeklyoff_days(fromDate, toDate, FrmDt, ToDt);
                let flag = 0;
                get_all_dates.forEach(d => {
                    if (d == firstWeeklyOffD || d == secWeeklyOffD) flag++;
                });
                if (holiday_TF_check === true || holiday_TF_check === 'T') {
                    diffDays = diffDays - flag;
                } else {
                    const holiday_count = searchEmpholidays(getUserId, fromDate, toDate);
                    diffDays = diffDays - flag - holiday_count;
                }
                rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: diffDays, ignoreFieldChange: true });
            }
        };

        const calculateDifferentMonthDays = (rec, fromDate, toDate, FrmDt, ToDt, FrmMonth, TOMonth, weeklyoffIncCheck, holiday_TF_check, getUserId, firstWeeklyOffD, secWeeklyOffD) => {
            const timeDiff = Math.abs(toDate.getTime() - fromDate.getTime());
            let finaldays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

            if (weeklyoffIncCheck === true || weeklyoffIncCheck === 'T') {
                if (holiday_TF_check === false || holiday_TF_check === 'F') {
                    const holiday_count = searchEmpholidays(getUserId, fromDate, toDate);
                    finaldays = finaldays - holiday_count;
                }
            } else {
                const monthdays = getArryMonthDays(FrmMonth);
                const firstMonthDays = parseFloat(monthdays) - parseFloat(FrmDt) + 1;
                const get_all_dates = get_excluded_weeklyoff_days_for_different_months(firstMonthDays, fromDate, toDate, FrmDt, ToDt);
                let flag = 0;
                get_all_dates.forEach(d => {
                    if (d == firstWeeklyOffD || d == secWeeklyOffD) flag++;
                });
                if (holiday_TF_check === false || holiday_TF_check === 'F') {
                    const holiday_count = searchEmpholidays(getUserId, fromDate, toDate);
                    finaldays = finaldays - flag - holiday_count;
                } else {
                    finaldays = finaldays - flag;
                }
            }
            rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: finaldays, ignoreFieldChange: true });
        };

        const calculateSameMonthDaysSingleWO = (rec, fromDate, toDate, FrmDt, ToDt, weeklyoffIncCheck, holiday_TF_check, getUserId, WeeklyOffInW) => {
            const timeDiff = Math.abs(toDate.getTime() - fromDate.getTime());
            let datediffVal = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

            if (weeklyoffIncCheck !== true && weeklyoffIncCheck !== 'T') {
                const get_all_dates = get_excluded_weeklyoff_days(fromDate, toDate, FrmDt, ToDt);
                let flag = 0;
                get_all_dates.forEach(d => {
                    if (d == WeeklyOffInW) flag++;
                });
                datediffVal = datediffVal - flag;
            }
            if (holiday_TF_check === false || holiday_TF_check === 'F') {
                const holiday_count = searchEmpholidays(getUserId, fromDate, toDate);
                datediffVal = datediffVal - holiday_count;
            }
            rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: datediffVal, ignoreFieldChange: true });
        };

        const calculateDifferentMonthDaysSingleWO = (rec, fromDate, toDate, FrmDt, ToDt, FrmMonth, weeklyoffIncCheck, holiday_TF_check, getUserId, WeeklyOffInW) => {
            const monthdays = getArryMonthDays(FrmMonth);
            let firstMonthDays = parseFloat(monthdays) - parseFloat(FrmDt) + 1;
            let finaldays = parseFloat(ToDt) + firstMonthDays;

            if (weeklyoffIncCheck !== true && weeklyoffIncCheck !== 'T') {
                const get_all_dates = get_excluded_weeklyoff_days_for_different_months(firstMonthDays, fromDate, toDate, FrmDt, ToDt);
                let flag = 0;
                get_all_dates.forEach(d => {
                    if (d == WeeklyOffInW) flag++;
                });
                finaldays = finaldays - flag;
            }
            if (holiday_TF_check === false || holiday_TF_check === 'F') {
                const holiday_count = searchEmpholidays(getUserId, fromDate, toDate);
                finaldays = finaldays - holiday_count;
            }
            rec.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: finaldays, ignoreFieldChange: true });
        };

        return {
            pageInit,
            saveRecord,
            fieldChanged
        };
    });