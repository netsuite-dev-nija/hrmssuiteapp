/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/log', 'N/format'], (record, search, runtime, log, format) => {

    const execute = (context) => {
        log.debug('Schedule script is working');

        const empInternalId = runtime.getCurrentScript().getParameter({
            name: 'custscript_hris_leavecredit_empid'
        });
        log.debug('empInternalId', empInternalId);

        if (!empInternalId) {
            log.error('Missing parameter', 'custscript_hris_leavecredit_empid is empty');
            return;
        }

        const employeeData = search.lookupFields({
            type: search.Type.EMPLOYEE,
            id: empInternalId,
            columns: [
                'hiredate',
                'custentity_hris_empgender',
                'custentity_emp_employee_job_status',
                'custentity_hris_empreligion',
                'custentity_emp_grade_',
                'subsidiary',
                'location',
                'custentity_hris_empmaritalstatus',
                'custentity_hris_empweeklyoffcriteria',
                'custentity_hris_empomani',
                'custentity_hris_empcategory',
                'custentity_hris_empleaveentitlement'
            ]
        });

        const empHireDateObj = format.parse({
            value: employeeData.hiredate,
            type: format.Type.DATE
        });
        log.debug('empHireDateObj', empHireDateObj);

        const empGender = getLookupValue(employeeData.custentity_hris_empgender);
        const empJobStatus = getLookupValue(employeeData.custentity_emp_employee_job_status);
        const empReligion = getLookupValue(employeeData.custentity_hris_empreligion);
        const empGrade = getLookupValue(employeeData.custentity_emp_grade_);
        const empWeeklyOffCriteria = getLookupValue(employeeData.custentity_hris_empweeklyoffcriteria);
        const subsidiary = getLookupValue(employeeData.subsidiary);
        const locationID = getLookupValue(employeeData.location);
        const maritalStatus = getLookupValue(employeeData.custentity_hris_empmaritalstatus);
        const omaniNonOmani = getLookupValue(employeeData.custentity_hris_empomani);
        const empCategory = getLookupValue(employeeData.custentity_hris_empcategory);
        const leaveEntitlement = getLookupValue(employeeData.custentity_hris_empleaveentitlement);

        log.debug('empGender', empGender);
        log.debug('emp_job_Status', empJobStatus);
        log.debug('emp_religion', empReligion);
        log.debug('emp_grade', empGrade);
        log.debug('emp_weeklyOffCriteria', empWeeklyOffCriteria);
        log.debug('subsidiary', subsidiary);
        log.debug('locationID', locationID);
        log.debug('maritalStatus', maritalStatus);
        log.debug('omani_non_Omani', omaniNonOmani);
        log.debug('emp_category', empCategory);
        log.audit('Leave Entitlement', leaveEntitlement);

        searchLeaveCreditConfigRecords(
            empInternalId,
            empHireDateObj,
            empGender,
            empJobStatus,
            empReligion,
            empGrade,
            subsidiary,
            locationID,
            maritalStatus,
            empWeeklyOffCriteria,
            omaniNonOmani,
            empCategory,
            leaveEntitlement
        );
    };

    // ------------------------------------------------------------------
    // Helper: extract value from lookupFields result (handles array / string)
    // ------------------------------------------------------------------
    const getLookupValue = (field) => {
        if (Array.isArray(field) && field.length > 0) {
            return field[0].value;
        }
        return field || '';
    };

    // ------------------------------------------------------------------
    // Main leave credit logic
    // ------------------------------------------------------------------
    const searchLeaveCreditConfigRecords = (
        empInternalId,
        empHireDateObj,
        empGender,
        empJobStatus,
        empReligion,
        empGrade,
        subsidiary,
        locationID,
        maritalStatus,
        empWeeklyOffCriteria,
        omaniNonOmani,
        empCategory,
        leaveEntitlement
    ) => {
        try {
            let finalAnnual = 0;

            const filters = [
                ['custrecord_hris_lvecfg_credit_on_joining', 'is', 'T'],
                'AND',
                ['custrecord_hris_lveconfig_empjobstatus', 'anyof', empJobStatus],
                'AND',
                ['custrecord_hris_lveconfig_religion', 'anyof', empReligion],
                'AND',
                ['custrecord_hris_lveconfig_grade', 'anyof', empGrade],
                'AND',
                ['custrecord_hris_lveconf_wklyoffcriteria', 'anyof', empWeeklyOffCriteria],
                'AND',
                ['custrecord_hris_lveconfig_maritalstatus', 'anyof', maritalStatus],
                'AND',
                ['isinactive', 'is', 'F'],
                'AND',
                ['custrecord_hris_lveconfig_gender', 'anyof', empGender],
                'AND',
                ['custrecord_hris_lvecfg_omaninonomani', 'anyof', omaniNonOmani],
                'AND',
                ['custrecord_hris_lvecfg_employee_catagory', 'anyof', empCategory],
                'AND',
                ['custrecord_hris_lvecfg_creditseqno', 'notequalto', 4],
                'AND',
                ['custrecord_hris_lveconfig_excluautobalan', 'is', 'F'],
                // For Pure Only
               /*  'AND',
                ['custrecord_hris_lvecfg_leaveentitlement', 'anyof', leaveEntitlement] */
            ];

            const columns = [
                'internalid',
                'custrecord_hris_lveconfig_rotationlve',
                'custrecord_hris_lvecfg_creditseqno',
                'custrecord_hris_lvecfg_accuralcheck'
            ];

            const searchResults = search.create({
                type: 'customrecord_hris_leaveconfig',
                filters,
                columns
            }).run().getRange({ start: 0, end: 1000 });

            log.debug('searching credit config');
            log.debug('searchresults length', searchResults ? searchResults.length : 0);

            if (!searchResults || searchResults.length === 0) {
                return;
            }

            log.debug('Leave credit config search complete', 'count=' + searchResults.length);

            for (let i = 0; i < searchResults.length; i++) {
                const LeaveCreditId = searchResults[i].getValue({ name: 'internalid' });
                log.debug('Leave credit config id', LeaveCreditId);

                const leaveCreditFreq = searchResults[i].getValue({ name: 'custrecord_hris_lvecfg_creditseqno' }) || '';
                log.debug('Leave Credit freq', leaveCreditFreq);

                const oLeaveCreditConfig = record.load({
                    type: 'customrecord_hris_leaveconfig',
                    id: LeaveCreditId,
                    isDynamic: false
                });

                const leaveType = LeaveCreditId;
                log.debug('Leave type', leaveType);

                const rotChkbx = oLeaveCreditConfig.getValue({ fieldId: 'custrecord_hris_lveconfig_rotationlve' });
                log.debug('rot_chkbx', rotChkbx);

                const CreditFreq = oLeaveCreditConfig.getValue({ fieldId: 'custrecord_hris_lveconfig_levcreditfrqy' });
                log.debug('Credit frequency', CreditFreq);

                const CreditMonth = oLeaveCreditConfig.getValue({ fieldId: 'custrecord_hris_lvecfg_credit_month' });
                log.debug('Credit month', CreditMonth);

                const NoOfDaysCredited = parseFloat(oLeaveCreditConfig.getValue({ fieldId: 'custrecord_hris_lvecfg_noofdaysto_credit' }) || 0);
                log.debug('No of days credited', NoOfDaysCredited);

                const CreditOnJoining = oLeaveCreditConfig.getValue({ fieldId: 'custrecord_hris_lvecfg_credit_on_joining' });
                log.debug('Credit on joining', CreditOnJoining);

                const roundedOffType = oLeaveCreditConfig.getValue({ fieldId: 'custrecord_hris_lvecfg_round_off' });
                log.debug('Round off Type', roundedOffType);

                const roundedOffValueText = oLeaveCreditConfig.getText({ fieldId: 'custrecord_hris_lvecfg_round_off' });
                log.debug('Round off Value text', roundedOffValueText);

                const proRataCheck = oLeaveCreditConfig.getValue({ fieldId: 'custrecord_hris_lvecfg_pro_rata' });
                const employeecategory = oLeaveCreditConfig.getValue({ fieldId: 'custrecord_hris_lvecfg_employee_catagory' });
                const accuraldays = oLeaveCreditConfig.getValue({ fieldId: 'custrecord_hris_lvecfg_accuraldays' });
                const accuralcheck = oLeaveCreditConfig.getValue({ fieldId: 'custrecord_hris_lvecfg_accuralcheck' });

                let roundOffId = '';
                if (proRataCheck === true || proRataCheck === 'T') {
                    roundOffId = oLeaveCreditConfig.getValue({ fieldId: 'custrecord_hris_lvecfg_round_off' });
                    log.debug('roundOffId', roundOffId);
                }

                let finalDaysToCredit;

                // ---------- Credit Frequency = 3 ----------
                if (CreditFreq == 3) {
                    log.debug('Inside (CreditFreq==3)');
                    finalDaysToCredit = NoOfDaysCredited;
                    searchEmpInLeavebalance(
                        rotChkbx,
                        empInternalId,
                        leaveType,
                        CreditFreq,
                        CreditMonth,
                        NoOfDaysCredited,
                        finalDaysToCredit
                    );
                }

                // ---------- Credit Frequency = 1 ----------

                if (CreditFreq == 2) {
                    log.debug('Inside (CreditFreq==2)');

                    const date = new Date();
                    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                    const lastDayMth = lastDay.getDate();

                    const hireDATE = empHireDateObj.getDate();

                    if (proRataCheck === true || proRataCheck === 'T') {
                        finalDaysToCredit = (NoOfDaysCredited * (lastDayMth - hireDATE + 1)) / 31;
                        log.debug('Pro rata checked – final_days_to_credit', finalDaysToCredit);
                    } else {
                        finalDaysToCredit = NoOfDaysCredited;
                        log.debug('Pro rata NOT checked – final_days_to_credit', finalDaysToCredit);
                    }

                    log.debug('Creating leave balance for config type', LeaveCreditId);
                    searchEmpInLeavebalance(
                        rotChkbx,
                        empInternalId,
                        leaveType,
                        CreditFreq,
                        CreditMonth,
                        NoOfDaysCredited,
                        finalDaysToCredit
                    );
                }

                // ---------- Credit Frequency = 2 ----------
                if (CreditFreq ==1) {
                    if (leaveCreditFreq != 3) {
                        log.debug('Inside (CreditFreq==2)');

                        const dateNo = empHireDateObj.getDate();
                        const month = empHireDateObj.getMonth() + 1;
                        const year = empHireDateObj.getFullYear();
                        const monthDays = getMonthDays(month, year);

                        const calendarStartMonth = search.lookupFields({
                            type: 'customrecord_hris_leave_calender_year',
                            id: 1,
                            columns: ['custrecord_hris_lvecalyr_startmth']
                        }).custrecord_hris_lvecalyr_startmth;

                        let totalMonths = 0;
                        if (calendarStartMonth == 1 || calendarStartMonth == '01') {
                            totalMonths = getMonthCountForEndDec(month);
                        } else if (calendarStartMonth == 9 || calendarStartMonth == '09') {
                            totalMonths = getMonthCountForEndAugust(month);
                        }
                        log.debug('Total Months remaining', totalMonths);

                        const daysCount = addMonths(empHireDateObj, totalMonths);
                        const oneDay = 24 * 60 * 60 * 1000;
                        const diffDays = Math.round(Math.abs((empHireDateObj.getTime() - daysCount.getTime()) / oneDay));
                        log.debug('diffDays', diffDays);

                        const noOfDaysInMonth = parseInt(monthDays, 10) - parseInt(dateNo, 10);
                        let totalDays = noOfDaysInMonth + diffDays + 1;
                        if (totalDays === 366) {
                            totalDays = 365;
                        }

                        const creditTillMonth = NoOfDaysCredited * totalDays;
                        finalAnnual = creditTillMonth / 365;
                        log.debug('finalAnnual', finalAnnual);

                        finalDaysToCredit = NoOfDaysCredited;
                    } else {
                        // accrual path
                        const currentDate = new Date();
                        if (accuralcheck === true || accuralcheck === 'T') {
                            const dayDifference = dateDifference(currentDate, empHireDateObj);
                            log.audit('Date Difference', 'The difference in days is: ' + dayDifference);
                            log.audit('accuraldays', accuraldays);
                            finalAnnual = dayDifference * (parseFloat(accuraldays) / 30);
                            log.audit('Final Annual', finalAnnual);
                        } else {
                            finalAnnual = NoOfDaysCredited;
                        }
                    }

                    if (proRataCheck === true || proRataCheck === 'T') {
                        finalDaysToCredit = getRoundOffValueEmper(
                            roundedOffType,
                            roundedOffValueText,
                            finalAnnual
                        );
                    } else {
                        finalDaysToCredit = NoOfDaysCredited;
                    }

                    log.debug('final_days_to_credit', finalDaysToCredit);
                    log.debug('Creating leave balance for config type', LeaveCreditId);

                    searchEmpInLeavebalance(
                        rotChkbx,
                        empInternalId,
                        leaveType,
                        CreditFreq,
                        CreditMonth,
                        NoOfDaysCredited,
                        finalDaysToCredit
                    );
                }

                // ---------- Credit Frequency = 4 ----------
                if (CreditFreq == 4) {
                    log.debug('Inside (CreditFreq==4)');
                    finalAnnual = NoOfDaysCredited * 4;
                }

                // ---------- Sick Leave special handling ----------
                if (empHireDateObj) {
                    processSickLeave(
                        empInternalId,
                        empHireDateObj,
                        empGender,
                        empJobStatus,
                        empGrade,
                        empWeeklyOffCriteria,
                        maritalStatus,
                        omaniNonOmani
                    );
                }
            }
        } catch (e) {
            log.error('Error in searchLeaveCreditConfigRecords', e.message || e.toString());
        }
    };

    // ------------------------------------------------------------------
    // Sick Leave processing (CreditSeqNo = 4)
    // ------------------------------------------------------------------
    const processSickLeave = (
        empInternalId,
        empHireDateObj,
        empGender,
        empJobStatus,
        empGrade,
        empWeeklyOffCriteria,
        maritalStatus,
        omaniNonOmani
    ) => {
        const filters2 = [
            ['custrecord_hris_lvecfg_credit_on_joining', 'is', 'T'],
            'AND',
            ['custrecord_hris_lveconfig_empjobstatus', 'anyof', empJobStatus],
            'AND',
            ['custrecord_hris_lveconfig_grade', 'anyof', empGrade],
            'AND',
            ['custrecord_hris_lveconf_wklyoffcriteria', 'anyof', empWeeklyOffCriteria],
            'AND',
            ['custrecord_hris_lveconfig_maritalstatus', 'anyof', maritalStatus],
            'AND',
            ['isinactive', 'is', 'F'],
            'AND',
            ['custrecord_hris_lveconfig_gender', 'anyof', empGender],
            'AND',
            ['custrecord_hris_lvecfg_omaninonomani', 'anyof', omaniNonOmani],
            'AND',
            ['custrecord_hris_lvecfg_creditseqno', 'equalto', 4]
        ];

        const columns2 = [
            search.createColumn({ name: 'internalid', sort: search.Sort.ASC }),
            'custrecord_hris_lvecfg_noofdaysto_credit'
        ];

        const searchResults2 = search.create({
            type: 'customrecord_hris_leaveconfig',
            filters: filters2,
            columns: columns2
        }).run().getRange({ start: 0, end: 1000 });

        log.debug('searchresults2 length', searchResults2 ? searchResults2.length : 0);

        const year = empHireDateObj.getFullYear() + 1;
        const yearEndObj = new Date(year, 0, 0);
        const diffDays = daysBetweenDates(empHireDateObj, yearEndObj);
        log.debug('DiffDays', diffDays);

        if (!searchResults2 || searchResults2.length === 0) {
            return;
        }

        let totalDaysToCredit = 0;
        searchResults2.forEach((r) => {
            const days = parseFloat(r.getValue({ name: 'custrecord_hris_lvecfg_noofdaysto_credit' }) || 0);
            totalDaysToCredit += days;
        });
        log.debug('totalDaysToCredit', totalDaysToCredit);

        let totalDays = (totalDaysToCredit * diffDays) / 365;
        totalDays = parseFloat(totalDays.toFixed(2));
        log.debug('TotalDays', totalDays);

        let creditedDays = 0;

        searchResults2.forEach((r) => {
            const leaveType = r.getValue({ name: 'internalid' });
            const dynamicDays = parseFloat(r.getValue({ name: 'custrecord_hris_lvecfg_noofdaysto_credit' }) || 0);

            // Check if leave balance already exists
            const existing = search.create({
                type: 'customrecord_hris_leavebalance',
                filters: [
                    ['custrecord_hris_lvbal_employee_name', 'is', empInternalId],
                    'AND',
                    ['custrecord_hris_lvbal_leave_type', 'is', leaveType]
                ],
                columns: ['internalid']
            }).run().getRange({ start: 0, end: 1 });

            if (existing && existing.length > 0) {
                return; // already exists
            }

            let daysToCredit = 0;
            if (creditedDays < totalDays) {
                const remaining = totalDays - creditedDays;
                daysToCredit = remaining >= dynamicDays ? dynamicDays : remaining;
            }

            const rec = record.create({
                type: 'customrecord_hris_leavebalance',
                isDynamic: false
            });

            rec.setValue({ fieldId: 'custrecord_hris_lvbal_employee_name', value: empInternalId });
            rec.setValue({ fieldId: 'custrecord_hris_lvbal_leave_type', value: leaveType });
            rec.setValue({ fieldId: 'custrecord_hris_lvbal_annual_leave_bal', value: dynamicDays });
            rec.setValue({ fieldId: 'custrecord_hris_lvbal_leave_balance_cred', value: dynamicDays });
            rec.setValue({ fieldId: 'custrecord_hris_lvbal_leave_balance_take', value: 0 });
            rec.setValue({ fieldId: 'custrecord_hris_lvbal_available_leave_ba', value: dynamicDays });

            const id = rec.save({ enableSourcing: false, ignoreMandatoryFields: true });
            log.debug('Sick leave balance created', id);

            creditedDays += roundValue(daysToCredit);
        });
    };

    // ------------------------------------------------------------------
    // Create / skip leave balance record
    // ------------------------------------------------------------------
    const searchEmpInLeavebalance = (
        rotChkbx,
        empInternalId,
        leaveType,
        CreditFreq,
        CreditMonth,
        NoOfDaysCredited,
        finalDaysToCredit
    ) => {
        log.debug('In searchEmpInLeavebalance', `emp=${empInternalId}, leaveType=${leaveType}`);

        const existing = search.create({
            type: 'customrecord_hris_leavebalance',
            filters: [
                ['custrecord_hris_lvbal_employee_name', 'is', empInternalId],
                'AND',
                ['custrecord_hris_lvbal_leave_type', 'is', leaveType]
            ],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });

        if (existing && existing.length > 0) {
            log.debug('Leave balance already exists', existing[0].id);
            return;
        }

        log.debug('No existing leave balance – creating new one');

        try {
            let daysCredited = NoOfDaysCredited;
            let available = finalDaysToCredit;

            if (rotChkbx === true || rotChkbx === 'T') {
                daysCredited = 0;
                available = 0;
            }

            const leaveBalRec = record.create({
                type: 'customrecord_hris_leavebalance',
                isDynamic: false
            });

            leaveBalRec.setValue({ fieldId: 'custrecord_hris_lvbal_employee_name', value: empInternalId });
            leaveBalRec.setValue({ fieldId: 'custrecord_hris_lvbal_leave_type', value: leaveType });

            if (CreditFreq == 1) {
                leaveBalRec.setValue({
                    fieldId: 'custrecord_hris_lvbal_annual_leave_bal',
                    value: parseFloat((NoOfDaysCredited * 12).toFixed(2))
                });
            } else {
                leaveBalRec.setValue({
                    fieldId: 'custrecord_hris_lvbal_annual_leave_bal',
                    value: parseFloat(NoOfDaysCredited.toFixed(2))
                });
            }

            if (CreditFreq == 3) {
                leaveBalRec.setValue({
                    fieldId: 'custrecord_hris_lvbal_leave_balance_cred',
                    value: parseFloat(NoOfDaysCredited.toFixed(2))
                });
                leaveBalRec.setValue({
                    fieldId: 'custrecord_hris_lvbal_available_leave_ba',
                    value: parseFloat(NoOfDaysCredited.toFixed(2))
                });
            }

            leaveBalRec.setValue({
                fieldId: 'custrecord_hris_lvbal_leave_balance_cred',
                value: parseFloat(parseFloat(finalDaysToCredit).toFixed(2))
            });
            leaveBalRec.setValue({
                fieldId: 'custrecord_hris_lvbal_available_leave_ba',
                value: parseFloat(parseFloat(finalDaysToCredit).toFixed(2))
            });
            leaveBalRec.setValue({
                fieldId: 'custrecord_hris_lvbal_leave_balance_take',
                value: 0
            });

            const leaveBalanceID = leaveBalRec.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });
            log.debug('Leave balance created', leaveBalanceID);

        } catch (e) {
            log.error('Error creating leave balance', e.message || e.toString());
        }
    };

    // ------------------------------------------------------------------
    // Utility functions
    // ------------------------------------------------------------------
    const dateDifference = (date1, date2) => {
        const timeDiff = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24)) - 1;
    };

    const daysBetweenDates = (val1, val2) => {
        const diffTime = Math.abs(val2.getTime() - val1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const addMonths = (date, months) => {
        const d = new Date(date);
        d.setMonth(d.getMonth() + months);
        return d;
    };

    const getMonthCountForEndDec = (month) => {
        const map = { 1: 11, 2: 10, 3: 9, 4: 8, 5: 7, 6: 6, 7: 5, 8: 4, 9: 3, 10: 2, 11: 1, 12: 0 };
        return map[parseInt(month, 10)] || 0;
    };

    const getMonthCountForEndAugust = (month) => {
        const map = { 1: 7, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 0, 9: 11, 10: 10, 11: 9, 12: 8 };
        return map[parseInt(month, 10)] || 0;
    };

    const getMonthDays = (wageMonth, year) => {
        wageMonth = parseInt(wageMonth, 10);
        if ([1, 3, 5, 7, 8, 10, 12].includes(wageMonth)) return 31;
        if ([4, 6, 9, 11].includes(wageMonth)) return 30;
        // February
        const y = parseInt(year.toString().split('-').pop(), 10);
        return (y % 4 === 0) ? 29 : 28;
    };

    const getRoundOffValueEmper = (roundedOffType, roundedOffValueText, finalAnnual) => {
        let finalDays = finalAnnual;
        const split = finalDays.toString().split('.');
        const integerNo = parseInt(split[0], 10) || 0;
        const decimalVal = split[1] || '0';
        const compareNo = parseFloat('0.' + decimalVal);

        let roundedFinalValue = finalDays;

        if (roundedOffType == 1) { // next nearest
            if (roundedOffValueText == 0.25 || roundedOffValueText == 0.75) {
                if (compareNo > 0 && compareNo <= 0.25) roundedFinalValue = integerNo + 0.25;
                else if (compareNo > 0.25 && compareNo <= 0.5) roundedFinalValue = integerNo + 0.5;
                else if (compareNo > 0.5 && compareNo <= 0.75) roundedFinalValue = integerNo + 0.75;
                else if (compareNo > 0.75 && compareNo <= 1.0) roundedFinalValue = integerNo + 1;
                else if (compareNo === 0) roundedFinalValue = integerNo;
            } else if (roundedOffValueText == 0.5) {
                if (compareNo > 0 && compareNo <= 0.5) roundedFinalValue = integerNo + 0.5;
                else if (compareNo > 0.5 && compareNo <= 1.0) roundedFinalValue = integerNo + 1;
            } else if (roundedOffValueText == 1.0) {
                if (compareNo > 0 && compareNo <= 1.0) roundedFinalValue = integerNo + 1.0;
            }
        } else if (roundedOffType == 2) { // previous nearest
            if (roundedOffValueText == 0.25 || roundedOffValueText == 0.75) {
                if (compareNo > 0 && compareNo <= 0.25) roundedFinalValue = integerNo + 0.0;
                else if (compareNo > 0.25 && compareNo <= 0.5) roundedFinalValue = integerNo + 0.25;
                else if (compareNo > 0.5 && compareNo <= 0.75) roundedFinalValue = integerNo + 0.5;
                else if (compareNo > 0.75 && compareNo <= 1.0) roundedFinalValue = integerNo + 0.75;
                else if (compareNo === 0) roundedFinalValue = integerNo;
            } else if (roundedOffValueText === 'Nearest to 0.5') {
                if (compareNo > 0.0 && compareNo <= 0.25) roundedFinalValue = integerNo + 0.0;
                else if (compareNo > 0.25 && compareNo <= 0.5) roundedFinalValue = integerNo + 0.5;
                else if (compareNo > 0.5 && compareNo <= 0.75) roundedFinalValue = integerNo + 0.5;
                else if (compareNo > 0.75 && compareNo <= 1.0) roundedFinalValue = integerNo + 1.0;
                else if (compareNo === 0.0) roundedFinalValue = integerNo;
            } else if (roundedOffValueText == 1.0) {
                if (compareNo > 0 && compareNo <= 1.0) roundedFinalValue = integerNo + 0.0;
            }
        } else {
            roundedFinalValue = parseFloat(finalDays.toFixed(2));
        }

        log.debug('rounded_final_value', roundedFinalValue);
        return roundedFinalValue;
    };

    const roundValue = (val) => {
        val = parseFloat(val);
        const diff = val - Math.floor(val);
        if (diff < 0.25) return Math.floor(val);
        if (diff >= 0.25 && diff < 0.75) return Math.floor(val) + 0.5;
        return Math.floor(val) + 1;
    };

    return {
        execute
    };
});