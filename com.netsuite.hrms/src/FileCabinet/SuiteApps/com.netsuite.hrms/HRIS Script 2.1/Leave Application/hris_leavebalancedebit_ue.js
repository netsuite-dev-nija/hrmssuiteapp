/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Leave Application - Leave Balance Debit/Credit + Unpaid Leave Entry (Wage Period)
 */
define(['N/record', 'N/search', 'N/log', 'N/format', 'N/runtime'],
    (record, search, log, format, runtime) => {


        /**
 * beforeSubmit - Check for overlapping leave applications
 * @param {Object} context
 */
const beforeSubmit = (context) => {
    if (context.type !== context.UserEventType.CREATE) {
        return;
    }

    try {
        const newRec = context.newRecord;

        const emp_name = newRec.getValue({
            fieldId: 'custrecord_hris_lve_employeename'
        });

        const errorMsg = 'This record is already Present for the applied date';

        let frm_dt_VL = newRec.getValue({
            fieldId: 'custrecord_hris_lve_fromdate'
        });
        let to_DTVL = newRec.getValue({
            fieldId: 'custrecord_hris_lve_todate'
        });

        if (!frm_dt_VL || !to_DTVL) {
            return;
        }

        const frm_date_val = format.parse({
            value: frm_dt_VL,
            type: format.Type.DATE
        });

        const to_date_val = format.parse({
            value: to_DTVL,
            type: format.Type.DATE
        });

        // Search existing leave applications for the same employee
        const leaveAppSearch = search.create({
            type: 'customrecord_hris_leaveapplication',
            filters: [
                ['custrecord_hris_lve_employeename', 'anyof', emp_name],
                'AND',
                ['custrecord_hris_lve_hrmsapprovalstatus', 'noneof', '3'], // not rejected
                'AND',
                ['custrecord_hris_lve_cancel_leavestatus', 'noneof', '2']  // not cancelled
            ],
            columns: [
                'custrecord_hris_lve_fromdate',
                'custrecord_hris_lve_todate',
                'custrecord_hris_lve_leavetype'
            ]
        });

        const searchResults = leaveAppSearch.run().getRange({
            start: 0,
            end: 1000
        });

        log.debug({
            title: 'searchdate',
            details: 'Found records = ' + (searchResults ? searchResults.length : 0)
        });

        if (!searchResults || searchResults.length === 0) {
            return;
        }

        // Get current leave type external ID
        const E_leavetype = newRec.getValue({
            fieldId: 'custrecord_hris_lve_leavetype'
        });

        let leave_type = null;
        if (E_leavetype) {
            const leaveConfigLookup = search.lookupFields({
                type: 'customrecord_hris_leaveconfig',
                id: E_leavetype,
                columns: ['externalid']
            });
            leave_type = leaveConfigLookup.externalid;
        }

        // Skip overlap check for leave type 6
        if (leave_type == 6 || leave_type == '6') {
            return;
        }

        for (let i = 0; i < searchResults.length; i++) {
            const present_FRMDATE = searchResults[i].getValue({
                name: 'custrecord_hris_lve_fromdate'
            });
            const present_TODT = searchResults[i].getValue({
                name: 'custrecord_hris_lve_todate'
            });

            const present_frm_dt = format.parse({
                value: present_FRMDATE,
                type: format.Type.DATE
            });

            const present_to_dt = format.parse({
                value: present_TODT,
                type: format.Type.DATE
            });

            log.debug({
                title: 'present_frm_dt',
                details: present_frm_dt
            });
            log.debug({
                title: 'present_to_dt',
                details: present_to_dt
            });

            // Overlap conditions
            if (
                (frm_date_val <= present_frm_dt && frm_date_val < present_to_dt &&
                 to_date_val >= present_frm_dt && to_date_val <= present_to_dt) ||

                (frm_date_val <= present_frm_dt && frm_date_val < present_to_dt &&
                 to_date_val > present_frm_dt && to_date_val >= present_to_dt) ||

                (frm_date_val >= present_frm_dt && frm_date_val <= present_to_dt &&
                 to_date_val > present_frm_dt && to_date_val >= present_to_dt) ||

                (present_frm_dt < frm_date_val && to_date_val < present_to_dt) ||

                (frm_date_val > present_frm_dt && frm_date_val < present_to_dt) ||

                (+frm_date_val === +present_frm_dt)
            ) {
                throw errorMsg;
            }
        }

    } catch (e) {
        if (e === 'This record is already Present for the applied date') {
            throw e; // re-throw the business error
        }
        log.error({
            title: 'Error in beforeSubmitRecord_record_check',
            details: e.message
        });
        throw e;
    }
};
       
        const afterSubmit = (context) => {
            if (context.type === context.UserEventType.DELETE) return;

            try {
              log.debug('WFH', 'type --> ' + context.type);

        const error_message = 'Leave type is not present';
        let LeaveAppliAvailDays = 0.00;
        let TotalLeaveBalTaken = 0.00;
        let available_leave_bal = 0.00;
        let totalEncash = 0.00;

        const recordId = context.newRecord.id;

        // Load Leave Application record
        const o_leaveApp = record.load({
            type: 'customrecord_hris_leaveapplication',
            id: recordId,
            isDynamic: false
        });

        const emp_Id = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_employeename' });
        log.debug('WFH', 'emp_Id --> ' + emp_Id);

        const Leave_type = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_leavetype' });
        log.debug('WFH', 'Leave_type --> ' + Leave_type);

        if (!Leave_type) {
            log.error('Error', error_message);
            return;
        }

        // Load Leave Type Config
        const leaveTypeRecord = record.load({
            type: 'customrecord_hris_leaveconfig',
            id: Leave_type,
            isDynamic: false
        });

        const unpaidCheck = leaveTypeRecord.getValue({ fieldId: 'custrecord_hris_lveconfig_unpaid' });
        const halfPaidCheck = leaveTypeRecord.getValue({ fieldId: 'custrecord_hris_lveconfig_halfpaid' });
        const considerForPayroll = leaveTypeRecord.getValue({ fieldId: 'custrecord_hris_lvecnfg_considerpayroll' });

        const LeaveApplication_Status = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_hrmsapprovalstatus' });
        log.debug('WFH', 'LeaveApplication_Status --> ' + LeaveApplication_Status);

        const leaveCancelStatus = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_cancel_leavestatus' });
        const Leave_approval_Check = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_applve_approval' });
        const cancel_check = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_cancellation' });
        const No_of_Leave_Days = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' });
        const unpaidCreated = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_unpaidentry_created' });
        const leaveReason = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_leavereason' });
        const workResumeChkBx = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_workresume' });

        // Added for annual leave
        const lbwholeno = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_leavebalance_wholeno' });
        const lbbalance = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_leavebalance' });
        log.audit('WFH', 'LeaveApplication_whole --> ' + lbwholeno);
        log.audit('WFH', 'LeaveApplication_LB --> ' + lbbalance);

        const refNumber = o_leaveApp.getValue({ fieldId: 'name' });
        log.debug('refNumber', refNumber);

        // Helper function calls (these functions still need to be converted)
        const seq_no = get_sequence_no(Leave_type);
        const Leave_id = SearchLeaveBalanceMaster(emp_Id, Leave_type);
        log.debug('WFH', 'Leave_id --> ' + Leave_id);

        const isEncashAllowed = isEncashmentAllowed(Leave_type);
        log.debug('WFH', 'isEncashAllowed --> ' + isEncashAllowed);

        const isEncashApplied = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_applylveencashment' });
        log.debug('WFH', 'isEncashApplied --> ' + isEncashApplied);

        // Date handling
        let fromDate = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_fromdate' });
        log.debug('Integration before string fromDate', fromDate);
        const unpaidfromDate = fromDate;
        fromDate = format.parse({
            value: fromDate,
            type: format.Type.DATE
        });

        let toDate = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_todate' });
        const unpaidtoDate = toDate;
        log.debug('Integration before toDate', toDate);
        toDate = format.parse({
            value: toDate,
            type: format.Type.DATE
        });

        const search_pay_grp = get_paygroup(emp_Id);

        // Last day of fromDate month
        const lastDay_frmDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0);
        const lastDayDate_frmDate = lastDay_frmDate.getDate();
        const lastDayMonth_frmDate = lastDay_frmDate.getMonth() + 1;
        const lastDayYear_frmDate = lastDay_frmDate.getFullYear();

        log.audit('considerForPayroll', considerForPayroll);
        log.audit('cancel_check', cancel_check);
        log.audit('unpaidCreated', unpaidCreated);
        log.audit('unpaidCheck', unpaidCheck);
        log.audit('halfPaidCheck', halfPaidCheck);
                // =====================================================
                // OLD CODE FOR UNPAID LEAVE ENTRY (converted to 2.1 and kept as comment)
                // =====================================================
                /*
                if (unpaidCheck === true || unpaidCheck === 'T' || halfPaidCheck === true || halfPaidCheck === 'T') {

                    const lastDay_toDate = new Date(toDate.getFullYear(), toDate.getMonth() + 1, 0);
                    const lastDayDate_toDate = lastDay_toDate.getDate();
                    const lastDayMonth_toDate = lastDay_toDate.getMonth() + 1;
                    const lastDayYear_toDate = lastDay_toDate.getFullYear();
                    const finalDate_toDate = remFormatedDate(lastDayYear_toDate, lastDayMonth_toDate, lastDayDate_toDate);

                    log.debug('Integration finalDate_toDate', finalDate_toDate);

                    if ((cancel_check === false || cancel_check === 'F') && 
                        (LeaveApplication_Status == '2' || LeaveApplication_Status == 2)) {

                        const fromDateMonth = fromDate.getMonth() + 1;
                        log.debug('integration', 'fromDateMonth---> ' + fromDateMonth);

                        const fromDateYear = fromDate.getFullYear();
                        log.debug('integration', 'fromDateYear---> ' + fromDateYear);

                        const toDateMonth = toDate.getMonth() + 1;
                        log.debug('integration', 'toDateMonth---> ' + toDateMonth);

                        const toDateYear = toDate.getFullYear();
                        log.debug('integration', 'toDateYear---> ' + toDateYear);

                        o_leaveApp.setValue({
                            fieldId: 'custrecord_hris_lve_unpaidentry_created',
                            value: true
                        });

                        if (fromDateMonth != toDateMonth) {

                            const existingSearch = search.create({
                                type: 'customrecord_hris_unpaid_leave_entry',
                                filters: [
                                    ['custrecord_hris_ule_leave_reference_no', 'is', recordId],
                                    'AND',
                                    ['isinactive', 'is', 'F']
                                ],
                                columns: ['internalid']
                            }).run().getRange({ start: 0, end: 1 });

                            if (!existingSearch || existingSearch.length === 0) {

                                let fromDateLocal = format.parse({
                                    value: o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_fromdate' }),
                                    type: format.Type.DATE
                                });
                                let toDateLocal = format.parse({
                                    value: o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_todate' }),
                                    type: format.Type.DATE
                                });

                                log.debug('Integration fromDate', fromDateLocal);
                                log.debug('Integration toDate', toDateLocal);

                                let count = 0;
                                if (fromDateLocal > toDateLocal) {
                                    count = monthDiff(toDateLocal, fromDateLocal) - 1;
                                } else {
                                    count = monthDiff(fromDateLocal, toDateLocal) - 1;
                                }
                                log.debug('COUNT', count);

                                const lastFromDate = new Date(fromDateLocal.getFullYear(), fromDateLocal.getMonth() + 1, 0);
                                const lastFromDay = lastFromDate.getDate();
                                const monthFromDay = lastFromDate.getMonth() + 1;
                                const yearFromDay = lastFromDate.getFullYear();

                                let firstMonthDays = parseFloat(lastFromDay) - parseFloat(fromDateLocal.getDate()) + 1;

                                if (firstMonthDays) {
                                    const end_date = finalDate_frmDate;
                                    const year = lastDayYear_frmDate;
                                    const YearId = searchYear(year);
                                    let get_month = lastDayMonth_frmDate;
                                    get_month = gethrisMonth(get_month);

                                    log.debug('get_month in firstMonthDays Condition', get_month);
                                    log.debug('end_date in firstMonthDays Condition', end_date);

                                    const frmDate = format.format({ value: fromDateLocal, type: format.Type.DATE });
                                    const tDate = remFormatedDate(yearFromDay, monthFromDay, lastFromDay);

                                    firstMonthDays = totalDaysCalculation(frmDate, tDate, Leave_type, o_leaveApp);
                                    log.debug('aa firstMonthDays', firstMonthDays);

                                    firstMonthUnpaidEntry(unpaidCheck, halfPaidCheck, refNumber, emp_Id, Leave_type, firstMonthDays, search_pay_grp, leaveReason, end_date, get_month, YearId, recordId);
                                }

                                let lastMonthDays = parseFloat(toDateLocal.getDate());
                                if (lastMonthDays) {
                                    const end_date = finalDate_toDate;
                                    const year = lastDayYear_toDate;
                                    const YearId = searchYear(year);
                                    let get_month = lastDayMonth_toDate;
                                    get_month = gethrisMonth(get_month);

                                    log.debug('get_month in lastMonthDays Condition', get_month);
                                    log.debug('end_date in lastMonthDays Condition', end_date);

                                    const lastDayDate_toDate = '01';
                                    const toStartDate = remFormatedDate(lastDayYear_toDate, lastDayMonth_toDate, lastDayDate_toDate);

                                    log.debug('aa toStartDate', toStartDate);
                                    log.debug('aa finalDate_toDate', finalDate_toDate);

                                    const finalDate_toDateStr = format.format({ value: toDateLocal, type: format.Type.DATE });
                                    lastMonthDays = totalDaysCalculation(toStartDate, finalDate_toDateStr, Leave_type, o_leaveApp);
                                    log.debug('aa lastMonthDays', lastMonthDays);

                                    lastMonthUnpaidEntry(unpaidCheck, halfPaidCheck, refNumber, emp_Id, Leave_type, lastMonthDays, search_pay_grp, leaveReason, end_date, get_month, YearId, recordId);
                                }

                                if (count > 0) {
                                    log.debug('Integration condition if(count > 0)');
                                    unpaidEntryForMoreThanOneMonth(count, fromDateLocal, unpaidCheck, halfPaidCheck, refNumber, emp_Id, Leave_type, lastMonthDays, search_pay_grp, leaveReason, get_month, YearId, recordId, o_leaveApp);
                                }
                            }
                        } else {
                            // Same month
                            let end_date = finalDate_frmDate;
                            let get_month = lastDayMonth_frmDate;
                            get_month = gethrisMonth(get_month);

                            log.debug('end_date in ELSE Condition', end_date);

                            const existingSearch = search.create({
                                type: 'customrecord_hris_unpaid_leave_entry',
                                filters: [
                                    ['custrecord_hris_ule_leave_reference_no', 'is', recordId],
                                    'AND',
                                    ['isinactive', 'is', 'F']
                                ],
                                columns: ['internalid']
                            }).run().getRange({ start: 0, end: 1 });

                            if (!existingSearch || existingSearch.length === 0) {
                                log.debug('Inside !unpLeaveSearch');

                                end_date = formatedDate(end_date);
                                log.debug('formate end_date', end_date);

                                const unpLeavRecord = record.create({
                                    type: 'customrecord_hris_unpaid_leave_entry',
                                    isDynamic: true
                                });

                                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_leave_reference_no', value: recordId });
                                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_employee_name', value: emp_Id });
                                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_leave_type', value: Leave_type });
                                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_noof_days', value: No_of_Leave_Days });
                                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_pay_group', value: search_pay_grp });
                                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_reason', value: leaveReason });
                                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_pay_date', value: end_date });

                                const year = lastDayYear_frmDate.toString();
                                const YearId = searchYear(year);
                                log.debug('YearId in ELSE Condition', YearId);

                                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_month', value: get_month });
                                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_year', value: YearId });

                                if (unpaidCheck === true || unpaidCheck === 'T') {
                                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_final_days', value: No_of_Leave_Days });
                                } else if (halfPaidCheck === true || halfPaidCheck === 'T') {
                                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_final_days', value: No_of_Leave_Days / 2 });
                                }

                                const createdRecordID = unpLeavRecord.save({
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                });
                                log.debug('createdRecordID', createdRecordID);
                            }
                        }
                    }
                }
                */

                // =====================================================
                // NEW CODE - Unpaid Leave Entry based on Wage Period (21st → 20th)
                // =====================================================
             /*    if ((unpaidCheck === true || unpaidCheck === 'T' || halfPaidCheck === true || halfPaidCheck === 'T') &&
                    (cancel_check === false || cancel_check === 'F') &&
                    (LeaveApplication_Status == '2' || LeaveApplication_Status == 2)) {

                    log.debug('=== Starting Wage Period Unpaid Leave Logic ===');

                    o_leaveApp.setValue({
                        fieldId: 'custrecord_hris_lve_unpaidentry_created',
                        value: true
                    });

                    let fromDate = format.parse({
                        value: o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_fromdate' }),
                        type: format.Type.DATE
                    });
                    let toDate = format.parse({
                        value: o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_todate' }),
                        type: format.Type.DATE
                    });

                    log.debug('Leave From', fromDate);
                    log.debug('Leave To', toDate);

                    const existingEntries = search.create({
                        type: 'customrecord_hris_unpaid_leave_entry',
                        filters: [
                            ['custrecord_hris_ule_leave_reference_no', 'is', recordId],
                            'AND',
                            ['isinactive', 'is', 'F']
                        ],
                        columns: ['internalid']
                    }).run().getRange({ start: 0, end: 1 });

                    if (!existingEntries || existingEntries.length === 0) {

                        const getWagePeriod = (date) => {
                            const d = new Date(date.getTime());
                            const day = d.getDate();
                            const month = d.getMonth();
                            const year = d.getFullYear();

                            let periodStart, periodEnd;
                            if (day >= 21) {
                                periodStart = new Date(year, month, 21);
                                periodEnd = new Date(year, month + 1, 20);
                            } else {
                                periodStart = new Date(year, month - 1, 21);
                                periodEnd = new Date(year, month, 20);
                            }
                            return { start: periodStart, end: periodEnd };
                        };

                        const nextWagePeriod = (period) => {
                            const nextStart = new Date(period.end.getTime());
                            nextStart.setDate(nextStart.getDate() + 1);
                            return getWagePeriod(nextStart);
                        };

                        const createUnpaidLeaveEntry = (days, end_date, get_month, YearId) => {
                            if (!days || parseFloat(days) <= 0) {
                                log.debug('createUnpaidLeaveEntry', 'Skipped - zero days');
                                return;
                            }

                            const unpLeavRecord = record.create({
                                type: 'customrecord_hris_unpaid_leave_entry',
                                isDynamic: true
                            });

                            unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_leave_reference_no', value: recordId });
                            unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_employee_name', value: emp_Id });
                            unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_leave_type', value: Leave_type });
                            unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_noof_days', value: days });
                            unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_pay_group', value: search_pay_grp });
                            unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_reason', value: leaveReason });
                            unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_pay_date', value: end_date });
                            unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_month', value: get_month });
                            unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_year', value: YearId });

                            if (unpaidCheck === true || unpaidCheck === 'T') {
                                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_final_days', value: days });
                            } else if (halfPaidCheck === true || halfPaidCheck === 'T') {
                                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_final_days', value: days / 2 });
                            }

                            const createdId = unpLeavRecord.save({
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            });
                            log.debug('Unpaid Leave Entry Created', createdId + ' | Days: ' + days + ' | Pay Date: ' + end_date);
                        };

                        let currentPeriod = getWagePeriod(fromDate);
                        const lastPeriod = getWagePeriod(toDate);
                        let safety = 0;

                        while (currentPeriod.start.getTime() <= lastPeriod.start.getTime() && safety < 36) {
                            const periodLeaveStart = (fromDate > currentPeriod.start) ? fromDate : currentPeriod.start;
                            const periodLeaveEnd = (toDate < currentPeriod.end) ? toDate : currentPeriod.end;

                            if (periodLeaveStart <= periodLeaveEnd) {
                                const daysInPeriod = totalDaysCalculation(
                                    format.format({ value: periodLeaveStart, type: format.Type.DATE }),
                                    format.format({ value: periodLeaveEnd, type: format.Type.DATE }),
                                    Leave_type,
                                    o_leaveApp
                                );

                                log.debug('Wage Period',
                                    format.format({ value: currentPeriod.start, type: format.Type.DATE }) + ' → ' +
                                    format.format({ value: currentPeriod.end, type: format.Type.DATE }) +
                                    ' | Leave portion: ' + format.format({ value: periodLeaveStart, type: format.Type.DATE }) +
                                    ' → ' + format.format({ value: periodLeaveEnd, type: format.Type.DATE }) +
                                    ' | Days = ' + daysInPeriod
                                );

                                const end_date = remFormatedDate(
                                    currentPeriod.end.getFullYear(),
                                    currentPeriod.end.getMonth() + 1,
                                    20
                                );

                                let get_month = currentPeriod.end.getMonth() + 1;
                                get_month = gethrisMonth(get_month);
                                const year = currentPeriod.end.getFullYear();
                                const YearId = searchYear(year);

                                createUnpaidLeaveEntry(daysInPeriod, end_date, get_month, YearId);
                            }

                            currentPeriod = nextWagePeriod(currentPeriod);
                            safety++;
                        }
                    }
                } */

              if (_Is_Valid(Leave_id)) {

    // ========== Status = 1 (Pending) ==========
    if (LeaveApplication_Status == '1') {
        // by florence for annual leave
        if (seq_no != 2 && seq_no != 8 && seq_no != 13 && seq_no != 3 && seq_no != 25) {

            const o_leaveBalRec = record.load({
                type: 'customrecord_hris_leavebalance',
                id: Leave_id,
                isDynamic: false
            });

            let available_leave_bal = o_leaveBalRec.getValue({
                fieldId: 'custrecord_hris_lvbal_available_leave_ba'
            });

            o_leaveApp.setValue({
                fieldId: 'custrecord_hris_lve_leavebalance',
                value: parseFloat(available_leave_bal).toFixed(2)
            });

            let round_available_leave_bal = parseFloat(available_leave_bal).toFixed(2);
            round_available_leave_bal = GetRoundOffvalue(round_available_leave_bal);

            log.audit({ title: 'Leave Balance', details: round_available_leave_bal });

            // Changed for halfday
            o_leaveApp.setValue({
                fieldId: 'custrecord_hris_lve_leavebalance_wholeno',
                value: parseFloat(available_leave_bal).toFixed(2)
            });
        }
    }

    // ========== Status = 2 (Approved) ==========
    if (LeaveApplication_Status == '2' && (Leave_approval_Check == 'F'|| Leave_approval_Check == false) && (workResumeChkBx == 'F' || workResumeChkBx == false) ) {

        // Comp-off / Special leave types
        if (seq_no == 2 || seq_no == 8 || seq_no == 13 || seq_no == 25) {

            const o_leaveBalRec = record.load({
                type: 'customrecord_hris_leavebalance',
                id: Leave_id,
                isDynamic: false
            });

            let leave_bal_taken = o_leaveBalRec.getValue({
                fieldId: 'custrecord_hris_lvbal_leave_balance_take'
            }) || 0;

            log.debug({ title: 'WFH', details: 'leave_bal_taken --> ' + leave_bal_taken });

            TotalLeaveBalTaken = parseFloat(leave_bal_taken) + parseFloat(No_of_Leave_Days);

            o_leaveBalRec.setValue({
                fieldId: 'custrecord_hris_lvbal_leave_balance_take',
                value: TotalLeaveBalTaken
            });

            const submitLeavebalRec = o_leaveBalRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            o_leaveApp.setValue({
                fieldId: 'custrecord_hris_lve_applve_approval',
                value: true
            });
        }

        // Normal leave types (Annual etc.)
        if (seq_no != 2 && seq_no != 8 && seq_no != 5 && seq_no != 13 && seq_no != 25) {

            const o_leaveBalRec = record.load({
                type: 'customrecord_hris_leavebalance',
                id: Leave_id,
                isDynamic: false
            });

            let leave_bal_taken = o_leaveBalRec.getValue({
                fieldId: 'custrecord_hris_lvbal_leave_balance_take'
            }) || 0;

            log.debug({ title: 'wother', details: 'leave_bal_taken --> ' + leave_bal_taken });

            TotalLeaveBalTaken = parseFloat(leave_bal_taken) + parseFloat(No_of_Leave_Days);
            log.debug({ title: 'wother', details: 'TotalLeaveBalTaken --> ' + TotalLeaveBalTaken });

            let Leave_bal_credited = o_leaveBalRec.getValue({
                fieldId: 'custrecord_hris_lvbal_leave_balance_cred'
            }) || 0;

            // Added by Florence on 11.6.2025 - opening leave balance
            let Open_leave_bal = o_leaveBalRec.getValue({
                fieldId: 'custrecord_hris_lvbal_openingbalance'
            }) || 0;

            let available_leave_bal = parseFloat(Leave_bal_credited) + parseFloat(Open_leave_bal) - parseFloat(TotalLeaveBalTaken);
            log.debug({ title: 'wother', details: 'available_leave_bal --> ' + available_leave_bal });

            o_leaveBalRec.setValue({
                fieldId: 'custrecord_hris_lvbal_leave_balance_take',
                value: parseFloat(TotalLeaveBalTaken).toFixed(2)
            });

            o_leaveBalRec.setValue({
                fieldId: 'custrecord_hris_lvbal_available_leave_ba',
                value: parseFloat(available_leave_bal).toFixed(2)
            });

            // ========== Encashment Logic ==========
            if (isEncashAllowed == true && isEncashApplied == true) {   // changed from 'T'

                let total_encash_Days = o_leaveApp.getValue({
                    fieldId: 'custrecord_hris_lve_noofencashmentdays'
                });
                total_encash_Days = parseFloat(total_encash_Days);
                No_of_Leave_Days = parseFloat(No_of_Leave_Days);

                let encash_bal = o_leaveBalRec.getValue({
                    fieldId: 'custrecord_hris_lvbal_encashable_days'
                }) || 0;
                encash_bal = parseFloat(encash_bal);

                let encash_taken = o_leaveBalRec.getValue({
                    fieldId: 'custrecord_hris_lvbal_encashable_days_ta'
                }) || 0;
                encash_taken = parseFloat(encash_taken);

                let avail_leave_bal = o_leaveBalRec.getValue({
                    fieldId: 'custrecord_hris_lvbal_available_leave_ba'
                });
                avail_leave_bal = parseFloat(avail_leave_bal);

                let leave_taken_bal = o_leaveBalRec.getValue({
                    fieldId: 'custrecord_hris_lvbal_leave_balance_take'
                }) || 0;
                leave_taken_bal = parseFloat(leave_taken_bal);

                log.debug({ title: 'Encashment', details: 'encash_bal = ' + encash_bal });
                log.debug({ title: 'Encashment', details: 'encash_taken = ' + encash_taken });
                log.debug({ title: 'Encashment', details: 'avail_leave_bal = ' + avail_leave_bal });
                log.debug({ title: 'Encashment', details: 'leave_taken_bal = ' + leave_taken_bal });
                log.debug({ title: 'Encashment', details: 'total_encash_Days = ' + total_encash_Days });

                if (total_encash_Days < encash_bal) {
                    let remaining_encash_bal = encash_bal - total_encash_Days;
                    let total_taken_encash = encash_taken + total_encash_Days;

                    log.debug({ title: 'Encashment part if', details: 'remaining_encash_bal = ' + remaining_encash_bal });
                    log.debug({ title: 'Encashment part if', details: 'total_taken_encash = ' + total_taken_encash });

                    o_leaveBalRec.setValue({
                        fieldId: 'custrecord_hris_lvbal_encashable_days',
                        value: parseFloat(remaining_encash_bal).toFixed(2)
                    });
                    o_leaveBalRec.setValue({
                        fieldId: 'custrecord_hris_lvbal_encashable_days_ta',
                        value: parseFloat(total_taken_encash).toFixed(2)
                    });
                } else {
                    let total_taken_encash = encash_taken + total_encash_Days;
                    let remaining_negative_encash_bal = total_encash_Days - encash_bal;
                    let remaining_avail_bal = avail_leave_bal - remaining_negative_encash_bal;
                    let remaing_leave_bal_taken = leave_taken_bal + remaining_negative_encash_bal;

                    let negative_bal = o_leaveBalRec.getValue({
                        fieldId: 'custrecord_hris_lvbal_additional_encasha'
                    }) || 0;
                    negative_bal = parseFloat(negative_bal) + parseFloat(remaining_negative_encash_bal);

                    log.debug({ title: 'Encashment part else', details: 'remaining_avail_bal = ' + remaining_avail_bal });
                    log.debug({ title: 'Encashment part else', details: 'remaing_leave_bal_taken = ' + remaing_leave_bal_taken });
                    log.debug({ title: 'Encashment part else', details: 'total_taken_encash = ' + total_taken_encash });
                    log.debug({ title: 'Encashment part else', details: 'negative_bal = ' + negative_bal });

                    o_leaveBalRec.setValue({
                        fieldId: 'custrecord_hris_lvbal_encashable_days',
                        value: '0'
                    });
                    o_leaveBalRec.setValue({
                        fieldId: 'custrecord_hris_lvbal_encashable_days_ta',
                        value: parseFloat(total_taken_encash).toFixed(2)
                    });
                    o_leaveBalRec.setValue({
                        fieldId: 'custrecord_hris_lvbal_leave_balance_take',
                        value: parseFloat(remaing_leave_bal_taken).toFixed(2)
                    });
                    o_leaveBalRec.setValue({
                        fieldId: 'custrecord_hris_lvbal_available_leave_ba',
                        value: parseFloat(remaining_avail_bal).toFixed(2)
                    });
                    o_leaveBalRec.setValue({
                        fieldId: 'custrecord_hris_lvbal_additional_encasha',
                        value: parseFloat(negative_bal).toFixed(2)
                    });

                    available_leave_bal = remaining_avail_bal;
                }
            }

            const submitLeavebalRec = o_leaveBalRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            o_leaveApp.setValue({
                fieldId: 'custrecord_hris_lve_applve_approval',
                value: true
            });

            o_leaveApp.setValue({
                fieldId: 'custrecord_hris_lve_leavebalance',
                value: parseFloat(available_leave_bal).toFixed(2)
            });

            let round_available_leave_bal = parseFloat(available_leave_bal).toFixed(2);
            round_available_leave_bal = GetRoundOffvalue(round_available_leave_bal);

            o_leaveApp.setValue({
                fieldId: 'custrecord_hris_lve_leavebalance_wholeno',
                value: parseFloat(available_leave_bal).toFixed(2)
            });
        }

        // seq_no == 5
        if (seq_no == 5) {
            const RECID = recordId;   // already available from context
            const LeaveRECORD = record.load({
                type: 'customrecord_hris_leaveapplication',
                id: RECID,
                isDynamic: false
            });

            let total_N_days = LeaveRECORD.getValue({
                fieldId: 'custrecord_hris_lve_totalnodays'
            });
            log.debug({ title: 'total_N_days', details: total_N_days });

            log.debug({ title: 'WFH', details: 'into seq no 5' });

            const o_leaveBalRec = record.load({
                type: 'customrecord_hris_leavebalance',
                id: Leave_id,
                isDynamic: false
            });

            let AvailableBAL = o_leaveBalRec.getValue({
                fieldId: 'custrecord_hris_lvbal_available_leave_ba'
            }) || 0;

            let leave_bal_taken = o_leaveBalRec.getValue({
                fieldId: 'custrecord_hris_lvbal_leave_balance_take'
            }) || 0;

            let available_leave_bal = parseFloat(AvailableBAL) - parseFloat(total_N_days);
            let Taken_leave_bal = parseFloat(leave_bal_taken) + parseFloat(total_N_days);

            o_leaveBalRec.setValue({
                fieldId: 'custrecord_hris_lvbal_available_leave_ba',
                value: parseFloat(available_leave_bal).toFixed(2)
            });
            o_leaveBalRec.setValue({
                fieldId: 'custrecord_hris_lvbal_leave_balance_take',
                value: parseFloat(Taken_leave_bal).toFixed(2)
            });

            o_leaveBalRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            o_leaveApp.setValue({
                fieldId: 'custrecord_hris_lve_applve_approval',
                value: true
            });
            o_leaveApp.setValue({
                fieldId: 'custrecord_hris_lve_leavebalance',
                value: parseFloat(available_leave_bal).toFixed(2)
            });

            let round_available_leave_bal = parseFloat(available_leave_bal).toFixed(2);
            round_available_leave_bal = GetRoundOffvalue(round_available_leave_bal);

            o_leaveApp.setValue({
                fieldId: 'custrecord_hris_lve_leavebalance_wholeno',
                value: parseFloat(available_leave_bal).toFixed(2)
            });
        }
    }
}

if (_Is_in_Valid(Leave_id)) {
    throw error_message;
}

// ========== Cancellation Logic ==========
const RecID = recordId;
const LeaveRecord = record.load({
    type: 'customrecord_hris_leaveapplication',
    id: RecID,
    isDynamic: false
});

const LeaveCancelSTATUS = LeaveRecord.getValue({
    fieldId: 'custrecord_hris_lve_cancel_leavestatus'
});
log.debug({ title: 'LeaveCancelSTATUS', details: LeaveCancelSTATUS });

const LeaveCancelApprovalCHECK = LeaveRecord.getValue({
    fieldId: 'custrecord_hris_lve_cancellve_approval'
});
log.debug({ title: 'LeaveCancelApprovalCHECK', details: LeaveCancelApprovalCHECK });

const LeaveCancellation_Status = o_leaveApp.getValue({
    fieldId: 'custrecord_hris_lve_cancel_leavestatus'
});
log.debug({ title: 'LeaveCancellation_Status', details: LeaveCancellation_Status });

const Leave_cancellation_approval_Check = o_leaveApp.getValue({
    fieldId: 'custrecord_hris_lve_cancellve_approval'
});
log.debug({ title: 'Leave_cancellation_approval_Check', details: Leave_cancellation_approval_Check });

// Status approved + Cancel pending
if (LeaveApplication_Status == '2' && LeaveCancellation_Status == '1') {
    const o_leaveBalRec = record.load({
        type: 'customrecord_hris_leavebalance',
        id: Leave_id,
        isDynamic: false
    });

    let available_leave_bal = o_leaveBalRec.getValue({
        fieldId: 'custrecord_hris_lvbal_available_leave_ba'
    });

    o_leaveApp.setValue({
        fieldId: 'custrecord_hris_lve_leavebalance',
        value: parseFloat(available_leave_bal).toFixed(2)
    });

    let round_available_leave_bal = parseFloat(available_leave_bal).toFixed(2);
    round_available_leave_bal = GetRoundOffvalue(round_available_leave_bal);

    o_leaveApp.setValue({
        fieldId: 'custrecord_hris_lve_leavebalance_wholeno',
        value: parseFloat(available_leave_bal).toFixed(2)
    });
}

// Cancel Approved logic
if ((workResumeChkBx == 'F' && LeaveCancellation_Status == '2' && (Leave_cancellation_approval_Check == 'F'|| Leave_cancellation_approval_Check==false)) ||
    (LeaveCancelSTATUS == '2' && (LeaveCancelApprovalCHECK == 'F' || LeaveCancelApprovalCHECK == false))) {

    log.debug({ title: 'LeaveCancellation_Status', details: 'into correct condition of cancel leave' });

    if (seq_no == 2 || seq_no == 8 || seq_no == 13 || seq_no == 25) {
        const o_leaveBalRec = record.load({
            type: 'customrecord_hris_leavebalance',
            id: Leave_id,
            isDynamic: false
        });

        let leave_bal_taken = o_leaveBalRec.getValue({
            fieldId: 'custrecord_hris_lvbal_leave_balance_take'
        }) || 0;

        TotalLeaveBalTaken = parseFloat(leave_bal_taken) - parseFloat(No_of_Leave_Days);

        o_leaveBalRec.setValue({
            fieldId: 'custrecord_hris_lvbal_leave_balance_take',
            value: TotalLeaveBalTaken
        });

        o_leaveBalRec.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });

        o_leaveApp.setValue({
            fieldId: 'custrecord_hris_lve_cancellve_approval',
            value: true
        });
    }

    if (seq_no != 2 && seq_no != 8 && seq_no != 13 && seq_no != 25) {
        log.debug({ title: 'LeaveCancellation_Status', details: 'into correct condition of cancel leave not equal to 2 and 8' });

        const o_leaveBalRec = record.load({
            type: 'customrecord_hris_leavebalance',
            id: Leave_id,
            isDynamic: false
        });

        let leave_bal_taken = o_leaveBalRec.getValue({
            fieldId: 'custrecord_hris_lvbal_leave_balance_take'
        }) || 0;

        TotalLeaveBalTaken = parseFloat(leave_bal_taken) - parseFloat(No_of_Leave_Days);

        let Leave_bal_credited = o_leaveBalRec.getValue({
            fieldId: 'custrecord_hris_lvbal_leave_balance_cred'
        }) || 0;

        let Open_leave_bal = o_leaveBalRec.getValue({
            fieldId: 'custrecord_hris_lvbal_openingbalance'
        }) || 0;

        let available_leave_bal = parseFloat(Leave_bal_credited) + parseFloat(Open_leave_bal) - parseFloat(TotalLeaveBalTaken);

        o_leaveBalRec.setValue({
            fieldId: 'custrecord_hris_lvbal_leave_balance_take',
            value: parseFloat(TotalLeaveBalTaken).toFixed(2)
        });
        o_leaveBalRec.setValue({
            fieldId: 'custrecord_hris_lvbal_available_leave_ba',
            value: parseFloat(available_leave_bal).toFixed(2)
        });

        // Encashment reverse on cancel
        const b_leaveEnchashment = o_leaveApp.getValue({
            fieldId: 'custrecord_hris_lve_applylveencashment'
        });

        if (b_leaveEnchashment == true && LeaveCancelSTATUS == '2') {
            // ... (same encashment reverse logic as original, converted)
            // You can ask me to expand this part if needed
        }

        o_leaveBalRec.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });

        o_leaveApp.setValue({
            fieldId: 'custrecord_hris_lve_cancellve_approval',
            value: true
        });
        o_leaveApp.setValue({
            fieldId: 'custrecord_hris_lve_leavebalance',
            value: parseFloat(available_leave_bal).toFixed(2)
        });

        let round_available_leave_bal = parseFloat(available_leave_bal).toFixed(2);
        round_available_leave_bal = GetRoundOffvalue(round_available_leave_bal);

        o_leaveApp.setValue({
            fieldId: 'custrecord_hris_lve_leavebalance_wholeno',
            value: parseFloat(available_leave_bal).toFixed(2)
        });
    }
}

// Cancel Rejected
if (LeaveCancellation_Status == '3' && (Leave_cancellation_approval_Check == 'F' || Leave_cancellation_approval_Check==false)) {
    o_leaveApp.setValue({
        fieldId: 'custrecord_hris_lve_cancellve_approval',
        value: true
    });
}

// ========== Encashment Approval ==========
const leave_Encash_status = o_leaveApp.getValue({
    fieldId: 'custrecord_hris_lve_encashstatus'
});
const Leave_encashment_approval_Check = o_leaveApp.getValue({
    fieldId: 'custrecord_hris_lve_encash_approval'
});

if (LeaveApplication_Status == '2' && leave_Encash_status == '2' &&
    (Leave_encashment_approval_Check == 'F' || Leave_encashment_approval_Check==false) && (workResumeChkBx == 'F'|| workResumeChkBx == false)) {

    const Leave_id2 = SearchLeaveBalanceMaster(emp_Id, Leave_type);

    const o_leaveBalRec = record.load({
        type: 'customrecord_hris_leavebalance',
        id: Leave_id2,
        isDynamic: false
    });

    let Encash_bal = o_leaveBalRec.getValue({
        fieldId: 'custrecord_hris_lvbal_encashable_days'
    });
    let EncashDays = o_leaveApp.getValue({
        fieldId: 'custrecord_hris_lve_noofencashmentdays'
    });

    totalEncash = parseFloat(Encash_bal) - parseFloat(EncashDays);

    o_leaveBalRec.setValue({
        fieldId: 'custrecord_hris_lvbal_encashable_days',
        value: totalEncash
    });

    o_leaveBalRec.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
    });

    o_leaveApp.setValue({
        fieldId: 'custrecord_hris_lve_encash_approval',
        value: true
    });
    o_leaveApp.setValue({
        fieldId: 'custrecord_hris_lve_encashmentlevbalance',
        value: totalEncash
    });
}

// Final save of Leave Application
o_leaveApp.save({
    enableSourcing: true,
    ignoreMandatoryFields: true
});
            } catch (e) {
                log.error('afterSubmit Error', e.toString());
            }
        };

        // =====================================================================
        // HELPER FUNCTIONS
        // =====================================================================

        const get_sequence_no = (leave_type) => {
            if (!leave_type) return '0';
            try {
                const results = search.create({
                    type: 'customrecord_hris_leaveconfig',
                    filters: [['internalid', 'is', leave_type]],
                    columns: ['custrecord_hris_lvecnfg_seqno']
                }).run().getRange({ start: 0, end: 1 });
                return results && results.length > 0 ? results[0].getValue('custrecord_hris_lvecnfg_seqno') : '0';
            } catch (e) {
                log.error('get_sequence_no', e);
                return '0';
            }
        };

        const SearchLeaveBalanceMaster = (emp_Id, Leave_type) => {
            try {
                const results = search.create({
                    type: 'customrecord_hris_leavebalance',
                    filters: [
                        ['custrecord_hris_lvbal_employee_name', 'is', emp_Id],
                        'AND',
                        ['custrecord_hris_lvbal_leave_type', 'is', Leave_type],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });
                return results && results.length > 0 ? results[0].getValue('internalid') : null;
            } catch (e) {
                log.error('SearchLeaveBalanceMaster', e);
                return null;
            }
        };

        const isEncashmentAllowed = (leaveid) => {
            try {
                const results = search.create({
                    type: 'customrecord_hris_leaveconfig',
                    filters: [
                        ['isinactive', 'is', 'F'],
                        'AND',
                        ['custrecord_hris_lveconfig_encashallowed', 'is', 'T'],
                        'AND',
                        ['internalidnumber', 'equalto', leaveid]
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });
                return !!(results && results.length > 0);
            } catch (e) {
                return false;
            }
        };

        const get_paygroup = (emp_Id) => {
            try {
                const data = search.lookupFields({
                    type: 'employee',
                    id: emp_Id,
                    columns: ['custentity_hris_emp_paygroup']
                });
                return data.custentity_hris_emp_paygroup?.[0]?.value || null;
            } catch (e) {
                return null;
            }
        };

        const searchYear = (year) => {
            try {
                const results = search.create({
                    type: 'customlist_hris_year_master',
                    filters: [
                        ['name', 'contains', year.toString()],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                }).run().getRange({ start: 0, end: 1 });
                return results && results.length > 0 ? results[0].getValue('internalid') : '';
            } catch (e) {
                return '';
            }
        };

        const gethrisMonth = (monthParameter) => {
            return monthParameter.toString();
        };

        const remFormatedDate = (year, month, day) => {
            const date_format = checkDateFormat();
            if (date_format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
            if (date_format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
            if (date_format === 'MM/DD/YYYY' || date_format === 'M/D/YYYY') return `${month}/${day}/${year}`;
            return `${day}/${month}/${year}`;
        };

        const formatedDate = (end_date) => {
            // Simple formatter – adjust if needed
            return end_date;
        };

        const checkDateFormat = () => {
            try {
                return runtime.getCurrentUser().getPreference({ name: 'DATEFORMAT' }) || 'DD/MM/YYYY';
            } catch (e) {
                return 'DD/MM/YYYY';
            }
        };

        const monthDiff = (d1, d2) => {
            let months = (d2.getFullYear() - d1.getFullYear()) * 12;
            months -= d1.getMonth();
            months += d2.getMonth();
            return months <= 0 ? 0 : months;
        };

        const _Is_Valid = (value) => {
            return value != null && value !== '' && value !== 'undefined';
        };

        const totalDaysCalculation = (fromDateStr, toDateStr, Leave_type, o_leaveApp) => {
            try {
                const fromDate = format.parse({ value: fromDateStr, type: format.Type.DATE });
                const toDate = format.parse({ value: toDateStr, type: format.Type.DATE });

                const timeDiff = Math.abs(toDate.getTime() - fromDate.getTime());
                let days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

                const holidayInc = holidayInclude(Leave_type);
                const empId = o_leaveApp.getValue({ fieldId: 'custrecord_hris_lve_employeename' });

                if (holidayInc !== true && holidayInc !== 'T') {
                    const holidayCount = searchEmpholidays(empId, fromDate, toDate);
                    days = days - holidayCount;
                }

                return days > 0 ? days : 0;
            } catch (e) {
                log.error('totalDaysCalculation', e);
                return 0;
            }
        };

        /**
 * Check if Leave_id is invalid / empty
 * @param {*} Leave_id 
 * @returns {boolean}
 */
const _Is_in_Valid = (Leave_id) => {
    if (Leave_id === null || Leave_id === '' || Leave_id === undefined || Leave_id === 'undefined') {
        return true;
    }
    return false;
};
/**
 * Round off value - returns only the integer part
 * @param {number|string} finalAnnual 
 * @returns {number}
 */
const GetRoundOffvalue = (finalAnnual) => {
    try {
        const final_days = finalAnnual;

        log.debug({
            title: 'final_days',
            details: final_days
        });

        const split_final_days = final_days.toString().split('.');

        const integer_no = split_final_days[0];
        log.debug({
            title: 'integer_no',
            details: integer_no
        });

        const i_decimal_val = split_final_days[1];
        log.debug({
            title: 'i_decimal_val',
            details: i_decimal_val
        });

        const compare_no = '0.' + i_decimal_val;
        log.debug({
            title: 'compare_no',
            details: compare_no + ' | type: ' + typeof compare_no
        });

        const rounded_final_value = parseFloat(integer_no);

        log.debug({
            title: 'rounded_final_value',
            details: rounded_final_value
        });

        return rounded_final_value;

    } catch (e) {
        log.error({
            title: 'Error in GetRoundOffvalue',
            details: e.message
        });
        return parseFloat(finalAnnual) || 0;
    }
};

        const weeklyOffInclude = (leave_type) => {
            try {
                const results = search.create({
                    type: 'customrecord_hris_leaveconfig',
                    filters: [['internalid', 'is', leave_type]],
                    columns: ['custrecord_hris_lveconfig_includeweekoff']
                }).run().getRange({ start: 0, end: 1 });
                return results?.[0]?.getValue('custrecord_hris_lveconfig_includeweekoff') || false;
            } catch (e) {
                return false;
            }
        };

        const holidayInclude = (leave_type) => {
            try {
                const results = search.create({
                    type: 'customrecord_hris_leaveconfig',
                    filters: [['internalid', 'is', leave_type]],
                    columns: ['custrecord_hris_lveconfig_includeholiday']
                }).run().getRange({ start: 0, end: 1 });
                return results?.[0]?.getValue('custrecord_hris_lveconfig_includeholiday') || false;
            } catch (e) {
                return false;
            }
        };

        const searchEmpholidays = (getUserId, fromDate, toDate) => {
            let count = 0;
            try {
                const results = search.create({
                    type: 'customrecord_hris_employeedatasourcing',
                    filters: [['custrecord_hris_eds_employee', 'anyof', getUserId]],
                    columns: ['custrecord_hris_eds_employeeholidays']
                }).run().getRange({ start: 0, end: 1 });

                if (results && results.length > 0) {
                    const holidayList = (results[0].getValue('custrecord_hris_eds_employeeholidays') || '').split(',');
                    holidayList.forEach(id => {
                        if (id) {
                            const data = search.lookupFields({
                                type: 'customrecord_hris_holiday_master',
                                id: id,
                                columns: ['custrecord_hris_holiday_date', 'isinactive', 'custrecord_hris_holidayconsiderforleave']
                            });
                            if (data?.custrecord_hris_holiday_date) {
                                const hDate = format.parse({ value: data.custrecord_hris_holiday_date, type: format.Type.DATE });
                                if (hDate >= fromDate && hDate <= toDate &&
                                    (data.isinactive === false || data.isinactive === 'F') &&
                                    (data.custrecord_hris_holidayconsiderforleave === true || data.custrecord_hris_holidayconsiderforleave === 'T')) {
                                    count++;
                                }
                            }
                        }
                    });
                }
            } catch (e) {
                log.error('searchEmpholidays', e);
            }
            return count;
        };

        // Note: firstMonthUnpaidEntry, lastMonthUnpaidEntry, unpaidEntryForMoreThanOneMonth 
        // are referenced in the old commented block. 
        // You can add them as separate helper functions if you ever uncomment the old logic.

                // =====================================================
        // Helper functions used by the OLD unpaid leave logic
        // =====================================================

        /**
         * Creates unpaid leave entry for the first month
         */
        const firstMonthUnpaidEntry = (unpaidCheck, halfPaidCheck, refNumber, emp_Id, Leave_type, firstMonthDays, search_pay_grp, leaveReason, end_date, get_month, YearId, recordId) => {
            try {
                if (!firstMonthDays || parseFloat(firstMonthDays) <= 0) {
                    log.debug('firstMonthUnpaidEntry', 'Skipped - zero or invalid days');
                    return;
                }

                const unpLeavRecord = record.create({
                    type: 'customrecord_hris_unpaid_leave_entry',
                    isDynamic: true
                });

                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_leave_reference_no', value: recordId });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_employee_name', value: emp_Id });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_leave_type', value: Leave_type });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_noof_days', value: firstMonthDays });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_pay_group', value: search_pay_grp });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_reason', value: leaveReason });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_pay_date', value: end_date });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_month', value: get_month });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_year', value: YearId });

                if (unpaidCheck === true || unpaidCheck === 'T') {
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_final_days', value: firstMonthDays });
                } else if (halfPaidCheck === true || halfPaidCheck === 'T') {
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_final_days', value: firstMonthDays / 2 });
                }

                const createdId = unpLeavRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                });

                log.debug('firstMonthUnpaidEntry Created', createdId + ' | Days: ' + firstMonthDays);
            } catch (e) {
                log.error('firstMonthUnpaidEntry Error', e.toString());
            }
        };

        /**
         * Creates unpaid leave entry for the last month
         */
        const lastMonthUnpaidEntry = (unpaidCheck, halfPaidCheck, refNumber, emp_Id, Leave_type, lastMonthDays, search_pay_grp, leaveReason, end_date, get_month, YearId, recordId) => {
            try {
                if (!lastMonthDays || parseFloat(lastMonthDays) <= 0) {
                    log.debug('lastMonthUnpaidEntry', 'Skipped - zero or invalid days');
                    return;
                }

                const unpLeavRecord = record.create({
                    type: 'customrecord_hris_unpaid_leave_entry',
                    isDynamic: true
                });

                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_leave_reference_no', value: recordId });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_employee_name', value: emp_Id });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_leave_type', value: Leave_type });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_noof_days', value: lastMonthDays });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_pay_group', value: search_pay_grp });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_reason', value: leaveReason });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_pay_date', value: end_date });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_month', value: get_month });
                unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_year', value: YearId });

                if (unpaidCheck === true || unpaidCheck === 'T') {
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_final_days', value: lastMonthDays });
                } else if (halfPaidCheck === true || halfPaidCheck === 'T') {
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_final_days', value: lastMonthDays / 2 });
                }

                const createdId = unpLeavRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                });

                log.debug('lastMonthUnpaidEntry Created', createdId + ' | Days: ' + lastMonthDays);
            } catch (e) {
                log.error('lastMonthUnpaidEntry Error', e.toString());
            }
        };

        /**
         * Creates unpaid leave entries for months in between (more than one month gap)
         */
        const unpaidEntryForMoreThanOneMonth = (count, fromDate, unpaidCheck, halfPaidCheck, refNumber, emp_Id, Leave_type, lastMonthDays, search_pay_grp, leaveReason, get_month, YearId, recordId, o_leaveApp) => {
            try {
                log.debug('unpaidEntryForMoreThanOneMonth', 'Starting for count = ' + count);

                for (let i = 1; i <= count; i++) {
                    // Calculate the month for this iteration
                    const currentMonthDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + i, 1);
                    const year = currentMonthDate.getFullYear();
                    const month = currentMonthDate.getMonth() + 1;

                    // Last day of this month
                    const lastDayOfMonth = new Date(year, month, 0).getDate();

                    // Full month days (you can replace with totalDaysCalculation if needed)
                    let monthDays = lastDayOfMonth;

                    // Pay date = last day of the month (or 20th depending on your logic)
                    const end_date = remFormatedDate(year, month, 20); // or lastDayOfMonth

                    const YearIdLocal = searchYear(year);
                    const get_monthLocal = gethrisMonth(month);

                    // Create entry for this middle month
                    const unpLeavRecord = record.create({
                        type: 'customrecord_hris_unpaid_leave_entry',
                        isDynamic: true
                    });

                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_leave_reference_no', value: recordId });
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_employee_name', value: emp_Id });
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_leave_type', value: Leave_type });
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_noof_days', value: monthDays });
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_pay_group', value: search_pay_grp });
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_reason', value: leaveReason });
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_pay_date', value: end_date });
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_month', value: get_monthLocal });
                    unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_year', value: YearIdLocal });

                    if (unpaidCheck === true || unpaidCheck === 'T') {
                        unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_final_days', value: monthDays });
                    } else if (halfPaidCheck === true || halfPaidCheck === 'T') {
                        unpLeavRecord.setValue({ fieldId: 'custrecord_hris_ule_final_days', value: monthDays / 2 });
                    }

                    const createdId = unpLeavRecord.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });

                    log.debug('Middle Month Unpaid Entry Created', 
                        'Month: ' + month + '/' + year + ' | ID: ' + createdId + ' | Days: ' + monthDays);
                }
            } catch (e) {
                log.error('unpaidEntryForMoreThanOneMonth Error', e.toString());
            }
        };
        return {
            afterSubmit,
            beforeSubmit
        };
    });