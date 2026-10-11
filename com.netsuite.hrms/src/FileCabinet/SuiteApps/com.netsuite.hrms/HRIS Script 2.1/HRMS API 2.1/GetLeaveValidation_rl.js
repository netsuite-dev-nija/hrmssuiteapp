/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/search', 'N/error', 'N/format', 'N/log', 'N/query'],
(search, error, format, log, query) => {

    // =====================================================================
    // MAIN GET ENTRY POINT
    // =====================================================================
    const get = (requestParams) => {
        try {
            log.debug('RESTlet GET params', requestParams);

            const result = validateAnnualLeave({
                leaveTypeId:     requestParams.leavetype,
                empId:           requestParams.empid,
                fromDate:        requestParams.fromdate,
                totalDays:       requestParams.totaldays || 0,
                isEmergency:     requestParams.isemergency,
                currentRecordId: requestParams.recordid || null,
                checkBalance:    requestParams.checkbalance !== 'false'
            });

            log.audit('=== VALIDATION RESULT OBJECT ===', result);

            // Always return the same shape
            const response = {
                success: !!result.success,
                ResponseCode: result.success ? "200" : "400",
                message: result.message || (result.success ? 'All validations passed.' : 'Validation failed.'),
                sequence: String(result.sequence || ''),
                availableBalance: Number(result.availableBalance) || 0
            };

            log.audit('Returning Response', JSON.stringify(response));
            return JSON.stringify(response);

        } catch (e) {
            // Only unexpected runtime errors land here
            log.error('Leave Validation Failed', e.toString());
            return JSON.stringify({
                success: false,
                ResponseCode: "500",
                Message: "An error occurred while processing the Leave application Validation.",
                Details: e.toString()
            });
        }
    };

    // =====================================================================
    // VALIDATION LOGIC – returns object instead of throwing
    // =====================================================================
    const validateAnnualLeave = (params) => {
        const leaveTypeId     = params.leaveTypeId;
        const empId           = params.empId;
        const fromDateValue   = params.fromDate;
        const totaldays       = parseFloat(params.totalDays) || 0;
        const isEmergency     = params.isEmergency === true ||
                                params.isEmergency === 'T' ||
                                params.isEmergency === 'true';
        const currentRecordId = params.currentRecordId || null;
        const checkBalance    = params.checkBalance !== false;

        // Required parameters
        if (!leaveTypeId || !empId || !fromDateValue) {
            return {
                success: false,
                message: 'leavetype, empid and fromdate are required.',
                sequence: '',
                availableBalance: 0
            };
        }

        const leaveseqno = String(getLeaveConfigSequence(leaveTypeId) || '');
        log.debug('Leave Config', 'Type ID: ' + leaveTypeId + ', Seq No: ' + leaveseqno);

        // -----------------------------------------------------------------
        // Not Annual Leave (seq != 3 and != 2)
        // -----------------------------------------------------------------
        if (leaveseqno !== '3' && leaveseqno !== '2') {
            let balance = 0;
            if (checkBalance) {
                balance = getSimpleLeaveBalance(empId, leaveTypeId);
                if (totaldays > 0 && totaldays > balance) {
                    return {
                        success: false,
                        message: 'Insufficient leave balance. Available: ' + balance + ', Requested: ' + totaldays,
                        sequence: leaveseqno,
                        availableBalance: balance
                    };
                }
            }

            return {
                success: true,
                message: 'Simple leave validation passed.',
                sequence: leaveseqno,
                availableBalance: balance
            };
        }

        // ===== Annual Leave Rules (seq = 3 or 2) =====

        // A. Emergency Limit
        if (isEmergency && totaldays > 7) {
            return {
                success: false,
                message: 'Emergency Annual Leave cannot exceed 7 days.',
                sequence: leaveseqno,
                availableBalance: 0
            };
        }

        // B. Max 12 days
        // Temp Comment on 06102026 after modify
       /*  if (!isEmergency && totaldays > 12) {
            return {
                success: false,
                message: 'Standard Annual Leave duration cannot exceed 12 calendar days.',
                sequence: leaveseqno,
                availableBalance: 0
            };
        } */

        // C + D only for non-emergency Annual Leave (seq = 3)
        if (!isEmergency && leaveseqno === '3') {

            // 21 days advance notice
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let checkFromDate;
            try {
                checkFromDate = format.parse({ value: fromDateValue, type: format.Type.DATE });
            } catch (e) {
                checkFromDate = new Date(fromDateValue);
            }
            checkFromDate.setHours(0, 0, 0, 0);

            const noticeDays = Math.floor(
                (checkFromDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
            );
             // Temp Comment on 06102026 after modify

          /*   if (noticeDays < 21) {
                return {
                    success: false,
                    message: 'Standard Annual Leave must be applied for at least 21 days in advance. Days notice provided: ' + noticeDays + ' days.',
                    sequence: leaveseqno,
                    availableBalance: 0
                };
            }
 */
            // 90-day gap
            // Temp Comment on 06102026 after modify
            const lastLeaveEndDate = getLastLeaveDate(empId, leaveTypeId, currentRecordId);
           /*  if (lastLeaveEndDate) {
                const currentFromDate = new Date(checkFromDate);
                const previousToDate  = new Date(lastLeaveEndDate);
                previousToDate.setHours(0, 0, 0, 0);

                const gapDays = Math.floor(
                    (currentFromDate.getTime() - previousToDate.getTime()) / (1000 * 3600 * 24)
                );

                if (gapDays < 90) {
                    const formattedPrevDate = format.format({
                        value: previousToDate,
                        type: format.Type.DATE
                    });
                    return {
                        success: false,
                        message: 'Rule Violation: 90-day gap required between Annual Leaves. Your last Annual Leave ended on: ' + formattedPrevDate + '. Days since last leave: ' + gapDays + '.',
                        sequence: leaveseqno,
                        availableBalance: 0
                    };
                }
            } */
        }

        // E. Balance Check (with negative balance support)
        let availableBalance = 0;

        if (checkBalance && leaveseqno !== '2') {
            availableBalance = getLeaveBalanceForValidation(empId, leaveTypeId, fromDateValue);
            log.emergency('Calculating final availableBalance', availableBalance);

            const seqData = getSequenceNo(leaveTypeId);
            let negAllowChk = 'F';
            let maxNegAllow = 0;

            if (seqData) {
                negAllowChk = seqData.negAllowChk;
                maxNegAllow = parseFloat(seqData.maxNegAllow) || 0;
            }

            // Case 1: Negative balance NOT allowed
            if (totaldays > 0 && totaldays > availableBalance &&
                (negAllowChk === 'F' || negAllowChk === false)) {

                return {
                    success: false,
                    message: 'Insufficient Annual Leave balance. Available: ' + availableBalance + ', Requested: ' + totaldays,
                    sequence: leaveseqno,
                    availableBalance: availableBalance
                };
            }

            // Case 2: Negative balance IS allowed – check max negative limit
           /*  if (leaveseqno === '3' && totaldays > 0 && totaldays > availableBalance &&
                (negAllowChk === 'T' || negAllowChk === true)) {

                const balDiff = totaldays - availableBalance;
                if (maxNegAllow < balDiff) {
                    return {
                        success: false,
                        message: `You are allowed to take a maximum of ${maxNegAllow} days of negative balance.`,
                        sequence: leaveseqno,
                        availableBalance: availableBalance
                    };
                }
            } */
        }

        // All validations passed
        return {
            success: true,
            message: 'All validations passed.',
            sequence: leaveseqno,
            availableBalance: availableBalance
        };
    };

    // =====================================================================
    // BALANCE FUNCTIONS
    // =====================================================================
    const getLeaveBalanceForValidation = (employee, leaveType, fromDateValue) => {
        try {
            const sequenceno = String(getLeaveConfigSequence(leaveType) || '');
            if (sequenceno !== '3' && sequenceno !== '2') {
                return getSimpleLeaveBalance(employee, leaveType);
            }
            return getAnnualLeaveBalance(employee, leaveType, fromDateValue);
        } catch (e) {
            log.error('Error getting leave balance', e);
            return 0;
        }
    };

    const getSimpleLeaveBalance = (employee, leaveType) => {
        try {
            const sql = "SELECT custrecord_hris_lvbal_available_leave_ba " +
                        "FROM customrecord_hris_leavebalance " +
                        "WHERE custrecord_hris_lvbal_employee_name = '" + employee + "' " +
                        "AND custrecord_hris_lvbal_leave_type = '" + leaveType + "' " +
                        "AND isinactive = 'F'";

            const results = query.runSuiteQL({ query: sql }).asMappedResults();
            return results.length > 0
                ? parseFloat(results[0].custrecord_hris_lvbal_available_leave_ba) || 0
                : 0;
        } catch (e) {
            log.error('getSimpleLeaveBalance', e);
            return 0;
        }
    };

    const getAnnualLeaveBalance = (employee, leavetype, fromDateValue) => {
        try {
            const empDetails = getEmployeeStatus(employee);
            if (!empDetails || empDetails.length === 0) return 0;

            const empJoinDateStr = empDetails[0].empJoinDate;
            const empHireDateObj = format.parse({
                value: empJoinDateStr,
                type: format.Type.DATE
            });

            let fromDateValueObj;
            try {
                fromDateValueObj = format.parse({
                    value: fromDateValue,
                    type: format.Type.DATE
                });
            } catch (e) {
                fromDateValueObj = new Date(fromDateValue);
            }

            const obDetails = getEmployeeOBDetails(employee, leavetype);
            let dateConsidered;
            let obLeaveBalance = 0;

            if (obDetails && obDetails.length > 0) {
                const obRec = obDetails[0];
                obLeaveBalance = parseFloat(obRec.obleavebalance) || 0;
                const parsedOBDate = format.parse({
                    value: obRec.obdate,
                    type: format.Type.DATE
                });
                dateConsidered = new Date(parsedOBDate);
                dateConsidered.setDate(dateConsidered.getDate() + 1);
            } else {
                dateConsidered = empHireDateObj;
            }

            const calculatedBalance = calculateAnnualLeaveBalance(
                employee, leavetype, empHireDateObj, dateConsidered, fromDateValueObj
            );

            return parseFloat((obLeaveBalance + calculatedBalance).toFixed(2));
        } catch (e) {
            log.error('Error in getAnnualLeaveBalance', e);
            return 0;
        }
    };

    const getSequenceNo = (leaveTypeId) => {
        if (!leaveTypeId) return null;

        try {
            const configLookup = search.lookupFields({
                type: 'customrecord_hris_leaveconfig',
                id: leaveTypeId,
                columns: [
                    'custrecord_hris_lvecnfg_seqno',
                    'custrecord_hris_lveconfig_allowneglevbal',
                    'custrecord_hris_lvecfg_maxnegativebal',
                    'custrecord_hris_lvecfg_accuralcheck'
                ]
            });

            return {
                sequenceNo: configLookup.custrecord_hris_lvecnfg_seqno || '',
                negAllowChk: configLookup.custrecord_hris_lveconfig_allowneglevbal || 'F',
                maxNegAllow: configLookup.custrecord_hris_lvecfg_maxnegativebal || 0,
                accrualCheck: configLookup.custrecord_hris_lvecfg_accuralcheck || 'F'
            };
        } catch (e) {
            log.error('getSequenceNo Error', e);
            return null;
        }
    };

    const calculateAnnualLeaveBalance = (empInternalId, leavetype, empHireDateObj, dateConsidered, fromDateValueObj) => {
        try {
            const leavebalancesql = "SELECT a.*, b.custrecord_hris_lvecfg_accuraldays as accuraldays " +
                                    "FROM customrecord_hris_leavebalance a " +
                                    "JOIN customrecord_hris_leaveconfig b " +
                                    "ON a.custrecord_hris_lvbal_leave_type = b.id " +
                                    "WHERE a.custrecord_hris_lvbal_employee_name = '" + empInternalId + "' " +
                                    "AND a.custrecord_hris_lvbal_leave_type = '" + leavetype + "' " +
                                    "AND a.isinactive = 'F' " +
                                    "AND b.custrecord_hris_lvecnfg_seqno IN ('2', '3')";

            const records = query.runSuiteQL({ query: leavebalancesql }).asMappedResults();
            if (records.length === 0) return 0;

            const rec = records[0];
            const leavebaltaken = parseFloat(rec.custrecord_hris_lvbal_leave_balance_take) || 0;
            const accuraldays   = parseFloat(rec.accuraldays) || 0;

            let diffDays = getDaysDifference(dateConsidered, fromDateValueObj);
            diffDays = diffDays + 1;

            const accrued = diffDays * accuraldays;
            return accrued - leavebaltaken;
        } catch (e) {
            log.error('calculateAnnualLeaveBalance', e);
            return 0;
        }
    };

    const getEmployeeStatus = (empID) => {
        try {
            const sql = "SELECT custentity_emp_employee_job_status, hiredate " +
                        "FROM employee " +
                        "WHERE id = " + empID + " AND isinactive = 'F'";

            const results = query.runSuiteQL({ query: sql }).asMappedResults();
            if (results.length > 0) {
                return [{
                    empStatus: results[0].custentity_emp_employee_job_status,
                    empJoinDate: results[0].hiredate
                }];
            }
            return [];
        } catch (e) {
            log.error('Error in getEmployeeStatus', e);
            return [];
        }
    };

    const getEmployeeOBDetails = (empInternalId, leavetype) => {
        try {
            const sql = "SELECT custrecord_hris_lvbal_obdate, " +
                        "custrecord_hris_lvbal_openingbalance " +
                        "FROM customrecord_hris_leavebalance " +
                        "WHERE custrecord_hris_lvbal_employee_name = '" + empInternalId + "' " +
                        "AND custrecord_hris_lvbal_leave_type = '" + leavetype + "' " +
                        "AND isinactive = 'F' " +
                        "AND custrecord_hris_lvbal_openingbalance IS NOT NULL";

            const results = query.runSuiteQL({ query: sql }).asMappedResults();
            if (results.length > 0) {
                return [{
                    obdate: results[0].custrecord_hris_lvbal_obdate,
                    obleavebalance: results[0].custrecord_hris_lvbal_openingbalance
                }];
            }
            return [];
        } catch (e) {
            log.error('Error in getEmployeeOBDetails', e);
            return [];
        }
    };

    const getDaysDifference = (date1, date2) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const timeDiff = Math.abs(d1.getTime() - d2.getTime());
        return Math.floor(timeDiff / (1000 * 3600 * 24));
    };

    // =====================================================================
    // HELPERS
    // =====================================================================
    const getLeaveConfigSequence = (leaveTypeId) => {
        try {
            const configLookup = search.lookupFields({
                type: 'customrecord_hris_leaveconfig',
                id: leaveTypeId,
                columns: ['custrecord_hris_lvecnfg_seqno']
            });
            return configLookup.custrecord_hris_lvecnfg_seqno || '';
        } catch (e) {
            log.error('getLeaveConfigSequence error', e);
            return '';
        }
    };

    const getLastLeaveDate = (empId, leaveTypeId, currentRecordId) => {
        const filters = [
            ['custrecord_hris_lve_employeename', 'anyof', empId],
            'AND',
            ['custrecord_hris_lve_leavetype', 'anyof', leaveTypeId],
            'AND',
            ['isinactive', 'is', 'F']
        ];
        if (currentRecordId) {
            filters.push('AND', ['internalid', 'noneof', currentRecordId]);
        }

        const leaveSearch = search.create({
            type: 'customrecord_hris_leaveapplication',
            filters: filters,
            columns: [
                search.createColumn({
                    name: 'custrecord_hris_lve_todate',
                    sort: search.Sort.DESC
                })
            ]
        });

        const resultSet = leaveSearch.run().getRange({ start: 0, end: 1 });
        if (resultSet && resultSet.length > 0) {
            const dateStr = resultSet[0].getValue({ name: 'custrecord_hris_lve_todate' });
            if (dateStr) {
                return format.parse({ value: dateStr, type: format.Type.DATE });
            }
        }
        return null;
    };

    return { get };
});