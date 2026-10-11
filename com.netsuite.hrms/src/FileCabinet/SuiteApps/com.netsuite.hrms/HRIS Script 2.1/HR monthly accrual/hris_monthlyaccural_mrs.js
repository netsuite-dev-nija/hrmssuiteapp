/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * @description Monthly Accrual Processing (Leave + Gratuity) - Clean & Complete
 */
define(['N/log', 'N/record', 'N/search', 'N/runtime', 'N/query', 'N/format', './moment.js'],
    function (log, record, search, runtime, query, format, moment) {

        function getInputData() {
            try {
                log.audit('getInputData', '=== Starting Monthly Accrual Process ===');

                var script = runtime.getCurrentScript();
                var paramsJson = script.getParameter({ name: 'custscript_hris_paydate_version' });

                if (!paramsJson) throw new Error('Missing required parameter: custscript_hris_paydate_version');

                var params = JSON.parse(paramsJson);

                var subsidiaryId = params.subsidiary;
                var paygroupId = params.paygroup;
                var payDate = params.payDate;
                var payMonth = params.payMonth;
                var payYear = params.payYear;
                var employeeCsv = params.employee || '';
                var selectedAccrualTypeIds = params.accrualTypeIds || [];

                var employeeIds = employeeCsv && employeeCsv.trim() !== ''
                    ? employeeCsv.split(',').map(function(id){ return parseInt(id.trim(), 10); }).filter(function(id){ return id > 0; })
                    : getEmployeesAutomatically(subsidiaryId, paygroupId, payDate);

                if (employeeIds.length === 0) {
                    log.audit('No Employees', 'No employees found for processing.');
                    return [];
                }

                var mainResult = getEmployeeDetails(employeeIds);
                var inputData = mainResult.map(function(emp) {
                    return buildInputRecord(emp, params);
                });

                log.audit('Total Employees to Process', inputData.length);
                return inputData;

            } catch (e) {
                log.error('getInputData Error', e);
                throw e;
            }
        }

        function map(context) {
            try {
                var data = JSON.parse(context.value);
                context.write({ key: data.empid.toString(), value: JSON.stringify(data) });
            } catch (e) {
                log.error('Map Error', e);
            }
        }

        function reduce(context) {
            try {
                var rec = JSON.parse(context.values[0]);

                var startdate = format.parse({ value: rec.paydate, type: format.Type.DATE });
               // var monthlysalary = getMonthlyGrossSalary(rec.empid);
                var monthlysalary = gettingleaveaccuralbasesalary(rec.empid);
                var yearsOfService = CountDays_BetweenTwodates(rec.joindate, rec.paydate, moment);
                var servicedays = getServiceDays(rec.joindate, rec.paydate, format);
                 log.audit(' Calculate Service days',servicedays);
            
                var lopdaysdetails = getLopDays(rec.empid, rec.paymonth, rec.payyear);
                var previouslopdetails = getPreviousLopDays(rec.empid, rec.paymonth, rec.payyear);
                var lopdays = lopdaysdetails.lopdays || 0;
                var previouslopdays = previouslopdetails.lopdays || 0;
                servicedays = servicedays - lopdays- previouslopdays;
                log.emergency('Service days',servicedays);
                function shouldProcess(seqNo) {
                    if (rec.selectedAccrualTypeIds.length === 0) return true;
                    var typeId = getaccuraltypesequence(seqNo);
                    return typeId && rec.selectedAccrualTypeIds.indexOf(typeId.toString()) !== -1;
                }

                if (shouldProcess(1)) processLeaveAccrual(rec, startdate, monthlysalary);
                if (shouldProcess(3)) processGratuityAccrual(rec, startdate, monthlysalary, yearsOfService, servicedays, lopdays);

            } catch (e) {
                log.error('Reduce Error - Emp: ' + context.key, e);
            }
        }

        function summarize(summary) {
            log.audit('Summarize', 'Monthly Accrual Map/Reduce Completed Successfully');
        }

        // ===================================================================
        // MAIN PROCESSING
        // ===================================================================
        function processLeaveAccrual(rec, startdate, monthlysalary) {
            try {
                var leaveSalary = gettingleaveaccuralbasesalary(rec.empid);
                var leaveaccuraldays = getLeaveAccuralDays(rec.leaveentitlement, rec.empcategory);
                var leaveaccuralcatdays = getLeaveAccuralcatDays(rec.leaveentitlement, rec.empcategory);

                var leaveDetails = gettingleaveaccural(rec.empid, leaveSalary, leaveaccuralcatdays, rec.empcategory, leaveaccuraldays);
                var parts = leaveDetails.split('#');
                var leaveAmount = parts[0];
                var leaveDays = parts[1];

                var leaveTypeId = getaccuraltypesequence(1);
                var leaveTransId = getaccuraltransactiontypesequence(1);

                if (leaveTypeId && !checkExistingAccrual(rec.empid, leaveTypeId, leaveTransId, rec.paymonth, rec.payyear)) {
                    var leaveRec = record.create({ type: 'customrecord_hris_monthly_accural_trans' });
                    setCommonFields(leaveRec, rec, startdate, monthlysalary, leaveAmount, leaveDays, leaveTypeId, leaveTransId);
                    leaveRec.setValue({ fieldId: 'custrecord_hris_accural_days', value: leaveaccuraldays });
                    var recId = leaveRec.save({ enableSourcing: true, ignoreMandatoryFields: true });

                    log.audit('Leave Accrual Created', 'Emp: ' + rec.empid + ' | ID: ' + recId);
                }
            } catch (e) {
                log.error('processLeaveAccrual Error', e);
            }
        }

        function processGratuityAccrual(rec, startdate, monthlysalary, yearsOfService, servicedays, lopdays) {
            try {
                var processtype = 1;
                var paidLop = gettingpaidandlopdays(rec.empid, rec.paymonth, rec.payyear, processtype);
                var paiddays = parseFloat(paidLop.split('#')[0]) || 0;

                var basicGratuity = gettinggratuitycompoamount(rec.empid, rec.paymonth, rec.payyear);
                var gratuitydays = calculateGratuityDays(servicedays);

               // var previousDate = getPreviousMonthDate(rec.paydate, format);
                var prevInfo = getPreviousMonthDate(rec.paydate, format);

if (prevInfo) {
    var prevYear = prevInfo.year;
    var prevMonth = prevInfo.month;
    var prevMonthPadded = prevInfo.monthPadded;
    var prevYearMonth = prevInfo.yearMonthString;   // Best for SQL queries

    log.debug('Previous Month Info', {
        year: prevYear,
        month: prevMonth,
        monthPadded: prevMonthPadded,
        yearMonth: prevYearMonth
    });

    // Use this for your previous liability query
    var previousDateForQuery = prevYearMonth;   // e.g., "2025-01"
}
                var prevLiability = getPreviousLiability(prevMonth, prevYear, rec.empid);

                var dailysalary = basicGratuity / 30;
                var currentLiability = (basicGratuity / 30) * gratuitydays;
                var gratuityAmount = parseFloat(currentLiability - prevLiability).toFixed(4);

                var gratuityTypeId = getaccuraltypesequence(3);
                var gratuityTransId = getaccuraltransactiontypesequence(6);

                if (gratuityTypeId && !checkExistingAccrual(rec.empid, gratuityTypeId, gratuityTransId, rec.paymonth, rec.payyear)) {
                    var gratRec = record.create({ type: 'customrecord_hris_monthly_accural_trans' });
                    setCommonFields(gratRec, rec, startdate, monthlysalary, gratuityAmount, gratuitydays, gratuityTypeId, gratuityTransId);

                    gratRec.setValue({ fieldId: 'custrecord_hris_accural_basic_salary', value: basicGratuity });
                    gratRec.setValue({ fieldId: 'custrecord_hris_accural_gratuitydays', value: gratuitydays.toFixed(4) });
                    gratRec.setValue({ fieldId: 'custrecord_hris_accural_dailysalary', value: dailysalary.toFixed(4) });
                    gratRec.setValue({ fieldId: 'custrecord_hris_accural_prevliability', value: prevLiability.toFixed(4) });
                    gratRec.setValue({ fieldId: 'custrecord_hris_accural_currentliability', value: currentLiability.toFixed(4) });
                    gratRec.setValue({ fieldId: 'custrecord_hris_accural_workingdays', value: paiddays });
                    gratRec.setValue({ fieldId: 'custrecord_hris_accural_noofyearsworked', value: yearsOfService });
                    gratRec.setValue({ fieldId: 'custrecord_hris_accural_servicedays', value: servicedays });
                    gratRec.setValue({ fieldId: 'custrecord_hris_accural_unpaiddays', value: lopdays });
                    var recId = gratRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
                    log.audit('Gratuity Accrual Created', 'Emp: ' + rec.empid + ' | ID: ' + recId);
                }
            } catch (e) {
                log.error('processGratuityAccrual Error', e);
            }
        }

        function setCommonFields(rec, data, startdate, monthlysalary, amount, days, typeId, transTypeId) {
            rec.setValue({ fieldId: 'custrecord_hris_accural_date', value: startdate });
            rec.setValue({ fieldId: 'custrecord_hris_accural_month', value: data.paymonth });
            rec.setValue({ fieldId: 'custrecord_hris_accural_year', value: data.payyear });
            rec.setValue({ fieldId: 'custrecord_hris_accural_paygroup', value: data.paygroup });
            rec.setValue({ fieldId: 'custrecord_hris_accural_empid', value: data.empid });
            rec.setValue({ fieldId: 'custrecord_hris_accural_grosssalary', value: monthlysalary });
            rec.setValue({ fieldId: 'custrecord_hris_accural_amount', value: parseFloat(amount) });
            rec.setValue({ fieldId: 'custrecord_hris_accural_type', value: typeId });
            rec.setValue({ fieldId: 'custrecord_hris_accural_trans_type', value: transTypeId });
            rec.setValue({ fieldId: 'custrecord_hris_accural_emp_catagory', value: data.empcategory });
            rec.setValue({ fieldId: 'custrecord_hris_accural_subsidiary', value: data.subsidiary });
            
        }

        // ===================================================================
        // HELPER FUNCTIONS
        // ===================================================================

        function getEmployeesAutomatically(subsidiaryId, paygroupId, payDate) {
            var sql = "SELECT id FROM employee WHERE isinactive = 'F' AND custentity_hris_emp_employeecheck = 'T' " +
                      "AND custentity_hris_empemploymentstatus = 1 AND subsidiary = " + subsidiaryId + 
                      " AND custentity_hris_emppayrollgroup = " + paygroupId + " AND hiredate <= '" + payDate + "'";
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.map(function(r){ return r.id; });
        }

        function getEmployeeDetails(employeeIds) {
            var inClause = employeeIds.join(',');
          /*   var sql = "SELECT id, custentity_hris_empcategory AS empcategory, custentity_hris_emppayrollgroup AS paygroup, " +
                      "custentity_hris_empnationality AS nationality, custentity_hris_empleaveentitlement as leaveentitlement, " +
                      "hiredate AS joindate, custentity_hris_emp_subcategory AS empsubcategory " +
                      "FROM employee WHERE id IN (" + inClause + ") AND isinactive = 'F' " +
                      "AND custentity_hris_emp_employeecheck = 'T' AND custentity_hris_empemploymentstatus = 1";
 */
  var sql = "SELECT id, custentity_hris_empcategory AS empcategory, custentity_hris_emppayrollgroup AS paygroup, " +
                      "custentity_hris_empnationality AS nationality, custentity_hris_empleaveentitlement as leaveentitlement, " +
                      "hiredate AS joindate, custentity_hris_emp_subcategory AS empsubcategory " +
                      "FROM employee WHERE id IN (" + inClause + ") AND isinactive = 'F' " +
                      " AND custentity_hris_empemploymentstatus = 1";


            return query.runSuiteQL({ query: sql }).asMappedResults();
        }

        function buildInputRecord(emp, params) {
            var catSeq = getemployeecatagorysequence(emp.empcategory) || '0#30#0';
            var parts = catSeq.split('#');
            return {
                empid: emp.id,
                paydate: params.payDate,
                empcategory: emp.empcategory,
                empcatagorysequence: parts[0],
                empcatagorydays: parts[1],
                airticketcal: parts[2],
                paymonth: params.payMonth,
                payyear: params.payYear,
                paygroup: emp.paygroup,
                nationality: emp.nationality,
                joindate: emp.joindate,
                empsubcategory: emp.empsubcategory,
                subsidiary: params.subsidiary,
                leaveentitlement: emp.leaveentitlement,
                selectedAccrualTypeIds: params.accrualTypeIds || []
            };
        }

        function gettingpaidandlopdays(empid, month, year, processtype) {
            var sql = "SELECT DISTINCT custrecord_hris_pay_proc_paid_days, custrecord_hris_pay_proc_lop_days_final " +
                      "FROM customrecord_hris_pay_process WHERE custrecord_hris_pay_proc_employee = " + empid +
                      " AND custrecord_hris_pay_proc_pay_month = " + month + 
                      " AND custrecord_hris_pay_proc_process_type = " + processtype +
                      " AND custrecord_hris_pay_proc_year = " + year;
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? (res[0].custrecord_hris_pay_proc_paid_days || 0) + '#' + (res[0].custrecord_hris_pay_proc_lop_days_final || 0) : '0#0';
        }

        function gettinggratuitycompoamount(empid, month, year) {
            var sql = "SELECT SUM(b.custrecord_hris_cde_monthly) AS amount " +
                      "FROM customrecord_hris_employee_compen_change a " +
                      "JOIN customrecord_hris_compensation_details_e b ON a.id = b.custrecord_hris_employee_data_change " +
                      "JOIN customrecord_hris_payroll_component c ON b.custrecord_hris_cde_payroll_component = c.id " +
                      "WHERE a.custrecord_hris_empchange_employee_nam = " + empid + 
                      " AND c.custrecord_hris_gratuity = 'T' AND a.isinactive = 'F'";
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? parseFloat(res[0].amount || 0) : 0;
        }

        function gettingleaveaccuralbasesalary(empid) {
            var sql = "SELECT SUM(b.custrecord_hris_cde_monthly) AS amount " +
                      "FROM customrecord_hris_employee_compen_change a " +
                      "JOIN customrecord_hris_compensation_details_e b ON a.id = b.custrecord_hris_employee_data_change " +
                      "JOIN customrecord_hris_payroll_component c ON b.custrecord_hris_cde_payroll_component = c.id " +
                      "WHERE a.custrecord_hris_empchange_employee_nam = " + empid + 
                      " AND c.custrecord_hris_leaveaccural = 'T' AND a.isinactive = 'F'";
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? parseFloat(res[0].amount || 0) : 0;
        }

        function getLeaveAccuralDays(leaveEntitlement, employeeCategory) {
          /*   var sql = "SELECT custrecord_hris_lvecfg_accuraldays_month FROM customrecord_hris_leaveconfig " +
                      "WHERE BUILTIN.MNFILTER(custrecord_hris_lvecfg_leaveentitlement, 'MN_INCLUDE', '', 'FALSE', " + leaveEntitlement + ") = 'T' " +
                      "AND BUILTIN.MNFILTER(custrecord_hris_lvecfg_employee_catagory, 'MN_INCLUDE', '', 'FALSE', " + employeeCategory + ") = 'T' " +
                      "AND custrecord_hris_lvecnfg_seqno = 3 AND isinactive = 'F'";
       */      
          var sql = "SELECT custrecord_hris_lvecfg_accuraldays_month FROM customrecord_hris_leaveconfig " +
                      "WHERE  BUILTIN.MNFILTER(custrecord_hris_lvecfg_employee_catagory, 'MN_INCLUDE', '', 'FALSE', " + employeeCategory + ") = 'T' " +
                      "AND custrecord_hris_lvecnfg_seqno = 3 AND isinactive = 'F'";
      
               var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? parseFloat(res[0].custrecord_hris_lvecfg_accuraldays_month || 0) : 0;
        }

        function getLeaveAccuralcatDays(leaveEntitlement, employeeCategory) {
        /*     var sql = "SELECT custrecord_hris_lvecfg_noofdaysto_credit FROM customrecord_hris_leaveconfig " +
                      "WHERE BUILTIN.MNFILTER(custrecord_hris_lvecfg_leaveentitlement, 'MN_INCLUDE', '', 'FALSE', " + leaveEntitlement + ") = 'T' " +
                      "AND BUILTIN.MNFILTER(custrecord_hris_lvecfg_employee_catagory, 'MN_INCLUDE', '', 'FALSE', " + employeeCategory + ") = 'T' " +
                      "AND custrecord_hris_lvecnfg_seqno = 3 AND isinactive = 'F'";
     */   
          var sql = "SELECT custrecord_hris_lvecfg_noofdaysto_credit FROM customrecord_hris_leaveconfig " +
                      "WHERE BUILTIN.MNFILTER(custrecord_hris_lvecfg_employee_catagory, 'MN_INCLUDE', '', 'FALSE', " + employeeCategory + ") = 'T' " +
                      "AND custrecord_hris_lvecnfg_seqno = 3 AND isinactive = 'F'";
         
          var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? parseFloat(res[0].custrecord_hris_lvecfg_noofdaysto_credit || 0) : 0;
        }

        function gettingleaveaccural(empid, salary, catdays, cat, leaveaccuraldays) {
            var days = leaveaccuraldays;
            var amount = (parseFloat(salary) / parseFloat(catdays)) * parseFloat(days);
            return amount.toFixed(2) + '#' + days;
        }

        function getemployeecatagorysequence(catid) {
            var sql = "SELECT custrecord_hris_empcat_seqno, custrecord_hris_empcat_noofdays, custrecord_hris_empcat_airticket " +
                      "FROM customrecord_hris_employeecategory WHERE id = " + catid;
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 
                ? res[0].custrecord_hris_empcat_seqno + '#' + res[0].custrecord_hris_empcat_noofdays + '#' + res[0].custrecord_hris_empcat_airticket 
                : '0#30#0';
        }

        function getaccuraltypesequence(seq) {
            var sql = "SELECT id FROM customrecord_hris_accuraltype_master WHERE custrecord_hris_accural_seqno = " + seq;
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? res[0].id : null;
        }

        function getaccuraltransactiontypesequence(seq) {
            var sql = "SELECT id FROM customrecord_hrms_accural_transactiontyp WHERE custrecord_hris_accural_trans_seqno = " + seq;
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? res[0].id : null;
        }

        function checkExistingAccrual(empid, typeId, transId, month, year) {
            var sql = "SELECT id FROM customrecord_hris_monthly_accural_trans " +
                      "WHERE custrecord_hris_accural_empid = " + empid +
                      " AND custrecord_hris_accural_type = " + typeId +
                      " AND custrecord_hris_accural_trans_type = " + transId +
                      " AND custrecord_hris_accural_month = " + month +
                      " AND custrecord_hris_accural_year = " + year + " AND isinactive = 'F'";
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0;
        }

       function calculateGratuityDays(serviceDays) {
    var DAYS_IN_YEAR = 365;
    var TIER1_THRESHOLD = 5 * DAYS_IN_YEAR; // 1825 days ≈ 5 years
    var TIER1_RATE = 21;
    var TIER2_RATE = 30;

    var gratuityDays = 0;

    log.debug('calculateGratuityDays Input', {
        serviceDays: serviceDays,
        tier1Threshold: TIER1_THRESHOLD
    });

    if (serviceDays <= TIER1_THRESHOLD) {
        gratuityDays = (serviceDays / DAYS_IN_YEAR) * TIER1_RATE;
    } else {
        var tier1Days = (TIER1_THRESHOLD / DAYS_IN_YEAR) * TIER1_RATE;
        var remainingDays = serviceDays - TIER1_THRESHOLD;
        var tier2Days = (remainingDays / DAYS_IN_YEAR) * TIER2_RATE;
        
        gratuityDays = tier1Days + tier2Days;
    }

    log.debug('calculateGratuityDays Result', gratuityDays);
    return gratuityDays;
}
        function getPreviousMonthDateold(paydate, format) {
            try {
                var dateObj = format.parse({ value: paydate, type: format.Type.DATE });
                dateObj.setMonth(dateObj.getMonth() - 1);
                return format.format({ value: dateObj, type: format.Type.DATE });
            } catch (e) {
                return paydate;
            }
        }

        function getPreviousMonthDate(paydate, format) {
    try {
        if (!paydate) return null;

        var currentDate = format.parse({
            value: paydate,
            type: format.Type.DATE
        });

        var currentYear = currentDate.getFullYear();
        var currentMonth = currentDate.getMonth(); // 0 = January

        var prevMonth = currentMonth - 1;
        var prevYear = currentYear;

        if (prevMonth < 0) {
            prevMonth = 11; // December
            prevYear = currentYear - 1;
        }

        // Return object with clear month and year
        return {
            year: prevYear,
            month: prevMonth + 1,           // Convert to 1-based (1=Jan, 12=Dec)
            monthPadded: (prevMonth + 1 < 10 ? '0' : '') + (prevMonth + 1),
            yearMonthString: prevYear + '-' + (prevMonth + 1 < 10 ? '0' : '') + (prevMonth + 1)
        };

    } catch (e) {
        log.error('getPreviousMonthDate Error', e);
        return null;
    }
}

        function getPreviousLiability(previousMonth, previousYear, empid) {
            try {
                var sql = "SELECT SUM(custrecord_hris_accural_currentliability) AS prevliability, SUM(custrecord_hris_accural_amount) AS totalAmount " +
                          "FROM customrecord_hris_monthly_accural_trans " +
                          "WHERE custrecord_hris_accural_type = 3 and custrecord_hris_accural_trans_type=6 and isinactive='F' and custrecord_hris_accural_empid = " + empid +
                          " AND custrecord_hris_accural_month = " + previousMonth +
                          " AND BUILTIN.DF(custrecord_hris_accural_year)= '" + previousYear + "'";
                 log.debug('getPreviousLiability SQL', sql);       
                var res = query.runSuiteQL({ query: sql }).asMappedResults();
                return res.length > 0 ? parseFloat(res[0].prevliability || 0) : 0;
            } catch (e) {
                return 0;
            }
        }

        function getMonthlyGrossSalary(empid) {
            try {
                var sql = "SELECT SUM(b.custrecord_hris_cde_monthly) AS gross " +
                          "FROM customrecord_hris_employee_compen_change a " +
                          "JOIN customrecord_hris_compensation_details_e b ON a.id = b.custrecord_hris_employee_data_change " +
                          "WHERE a.custrecord_hris_empchange_employee_nam = " + empid + " AND a.isinactive = 'F'";
                var res = query.runSuiteQL({ query: sql }).asMappedResults();
                return res.length > 0 ? parseFloat(res[0].gross || 0) : 0;
            } catch (e) {
                log.error('getMonthlyGrossSalary Error', e);
                return 0;
            }
        }

        function CountDays_BetweenTwodatesold(start, end, momentLib) {
            try {
                if (!start || !end) return 0;
                var startDate = momentLib(start);
                var endDate = momentLib(end);
                return endDate.diff(startDate, 'days');
            } catch (e) {
                log.error('CountDays_BetweenTwodates Error', e);
                return 0;
            }
        }
          function CountDays_BetweenTwodates(start, end, momentLib) {
    log.debug('CountDays_BetweenTwodates Input', { start: start, end: end });

    // Specify the format 'DD/MM/YYYY' so Moment parses it correctly
    var s = momentLib(start, 'DD/MM/YYYY').subtract(1, 'days');
    var e = momentLib(end, 'DD/MM/YYYY');

    // Check if dates are valid to avoid NaN errors
    if (!s.isValid() || !e.isValid()) {
        log.error('Invalid Date Input', { start: start, end: end });
        return "0.00";
    }

    var years = e.diff(s, 'years', true);
    var fixedYears = parseFloat(years).toFixed(4);
    
    log.debug('CountDays_BetweenTwodates Result', fixedYears);
    return fixedYears;
}

        function getServiceDaysold(joindate, paydate, format) {
            try {
                if (!joindate || !paydate) return 0;
                var start = format.parse({ value: joindate, type: format.Type.DATE });
                var end = format.parse({ value: paydate, type: format.Type.DATE });
                var diffTime = Math.abs(end.getTime() - start.getTime());
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            } catch (e) {
                log.error('getServiceDays Error', e);
                return 0;
            }
        }
function getServiceDaysold2(joindate, paydate, format) {
    try {
        if (!joindate || !paydate) return 0;
        
        var start = format.parse({ value: joindate, type: format.Type.DATE });
        var end = format.parse({ value: paydate, type: format.Type.DATE });
        
        // Strip the time component by setting hours to midnight
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        var diffTime = end.getTime() - start.getTime();
        // Return 182 (math diff) + 1 (inclusive) = 183
        return (diffTime / (1000 * 60 * 60 * 24)) + 1;
        
    } catch (e) {
        log.error('getServiceDays Error', e);
        return 0;
    }
}
function getServiceDays(joindate, paydate, format) {
    try {
        if (!joindate || !paydate) return 0;
        
        var start = format.parse({ value: joindate, type: format.Type.DATE });
        var end = format.parse({ value: paydate, type: format.Type.DATE });
        
        // Calculate the difference in milliseconds
        var diffTime = end.getTime() - start.getTime();
        
        // Convert to days
        var diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        // Use Math.round to remove the fractional hour/minute jitter
        // Then add 1 for the inclusive count
        return Math.round(diffDays) + 1;
        
    } catch (e) {
        log.error('getServiceDays Error', e);
        return 0;
    }
}
        function getLopDays(empid, month, year) {
            var lopdays = 0;
            var lopdaysfinal = 0;
    var sql = "SELECT SUM(custrecord_hris_ule_noof_days) AS lopdays, " +
              "SUM(custrecord_hris_ule_final_days) AS lopdaysfinal " +
              "FROM customrecord_hris_unpaid_leave_entry " +
              "WHERE custrecord_hris_ule_employee_name = " + empid + 
              " AND custrecord_hris_ule_month = " + month + 
              " AND custrecord_hris_ule_year = " + year;
      log.emergency('getLopDays SQL', sql);        
              
    var res = query.runSuiteQL({ query: sql }).asMappedResults();
    
    // Returns an object with both values, defaulting to 0 if null
    return res.length > 0 ? {
        lopdays: parseFloat(res[0].lopdays || 0),
        lopdaysfinal: parseFloat(res[0].lopdaysfinal || 0)
    } : { lopdays: 0, lopdaysfinal: 0 };
}
   function getPreviousLopDays(empid, month, year) {
            var lopdays = 0;
            var lopdaysfinal = 0;
 var sql = "SELECT SUM(custrecord_hris_ule_noof_days) AS lopdays, " +
          "SUM(custrecord_hris_ule_final_days) AS lopdaysfinal " +
          "FROM customrecord_hris_unpaid_leave_entry " +
          "WHERE custrecord_hris_ule_employee_name = " + empid + 
          " AND ( " +
          " custrecord_hris_ule_year < " + year + 
          " OR (custrecord_hris_ule_year = " + year + " AND custrecord_hris_ule_month < " + month + ") " +
          ")";


      log.emergency('getpreviousLopDays SQL', sql);        
              
    var res = query.runSuiteQL({ query: sql }).asMappedResults();
    
    // Returns an object with both values, defaulting to 0 if null
    return res.length > 0 ? {
        lopdays: parseFloat(res[0].lopdays || 0),
        lopdaysfinal: parseFloat(res[0].lopdaysfinal || 0)
    } : { lopdays: 0, lopdaysfinal: 0 };
}
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });