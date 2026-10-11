/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/task', 'N/log', 'N/format', 'N/runtime', 'N/url', 'N/query'],
    function (record, search, task, log, format, runtime, url, query) {

        /**
         * Retrieves input data for the Map/Reduce script.
         * @returns {Array} Parsed data from the script parameter.
         */
        function getInputData() {
            try {
                var scriptParams = runtime.getCurrentScript();
                log.debug({ title: 'Visa Checking Data', details: scriptParams.getParameter({ name: 'custscript_hris_dailytomon_array' }) });

                return JSON.parse(scriptParams.getParameter({ name: 'custscript_hris_dailytomon_array' }));
            }

            catch (e) {

                log.error({
                    title: 'Error in MRS',
                    details: e.message
                });

            }
        }

        /**
         * Processes each input record in the Map stage.
         * Adds Pay Group information and writes data to context.
         * @param {Object} context The Map/Reduce context object.
         */
        function map(context) {
            try {
                var data = JSON.parse(context.value);
                log.debug('Map Data', data);

                // Get Pay Group for the employee
                var payGroup = getPayGroup(parseInt(data.empid));
                if (payGroup) {
                    data.payGroup = payGroup;
                } else {
                    log.error('Pay Group Not Found', 'No pay group found for employee ID: ' + data.empid);
                }

                // Get Wage Period details for the Pay Group including total cycle days field
                var wagePeriodSql = "SELECT custrecord_hris_start_date, custrecord_hris_end_date, custrecord_hris_month, custrecord_hris_year, custrecord_hris_wage_cycle_day_s FROM customrecord_hris_wage_period_details WHERE custrecord_hris_pay_group = " + payGroup + " AND isinactive = 'F'";
                log.emergency('wagePeriodSql', wagePeriodSql);
                var records = getResult(wagePeriodSql);
                if (records.length > 0) {
                    var endDate = records[0].custrecord_hris_end_date;
                    var startDate = records[0].custrecord_hris_start_date;
                    var month = records[0].custrecord_hris_month;
                    var year = records[0].custrecord_hris_year;
                    var wageCycleDays = records[0].custrecord_hris_wage_cycle_day_s;

                    var payDate = endDate;
                    var wageMonth = month;
                    var wageYear = year;

                    log.debug('Start Date', startDate);
                    log.debug('End Date', payDate);
                    log.debug('Wage Month', wageMonth);
                    log.debug('Wage Year', wageYear);
                    log.debug('Wage Cycle Days', wageCycleDays);

                    data.payDate = payDate;
                    data.startDate = startDate;
                    data.endDate = endDate;
                    data.wageCycleDays = wageCycleDays;

                    // Calculate total days between start date and end date if wageCycleDays is not explicitly populated
                    if (!wageCycleDays && startDate && endDate) {
                        var startDt = new Date(startDate);
                        var endDt = new Date(endDate);
                        if (!isNaN(startDt.getTime()) && !isNaN(endDt.getTime())) {
                            var diffTime = Math.abs(endDt - startDt);
                            data.calculatedTotalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        }
                    } else if (wageCycleDays) {
                        data.calculatedTotalDays = wageCycleDays;
                    }
                }
                else {
                    log.error('Wage Period Not Found', 'No wage period found for pay group: ' + payGroup);
                }


                context.write({
                    key: data.empid,
                    value: JSON.stringify(data)
                });
            }
            catch (e) {

                log.error({
                    title: 'Error in Map',
                    details: e.message
                });

            }

        }


        function createMonthlyAttendanceRecord(data) {
            try {

                var monthlyattensql = "select * from customrecord_hrms_monthlyattendance where custrecord_hrms_month_empid =" + parseInt(data.empid) + " \
                            and custrecord_hrms_month_monthid = " + data.monthFiedid + " and custrecord_hrms_month_yearid = " + data.yearFiedidid + " \
                            "


                var queryResults = query.runSuiteQL({
                    query: monthlyattensql
                });
                var monthlyattensqlrecords = queryResults.asMappedResults();
                if (monthlyattensqlrecords.length > 0) {
                    var monthlyattenid = monthlyattensqlrecords[0].id;
                    var monthlyAttendanceRecord = record.load({
                        type: 'customrecord_hrms_monthlyattendance',
                        id: monthlyattenid,
                        isDynamic: true
                    });

                }
                else {
                    var monthlyAttendanceRecord = record.create({
                        type: 'customrecord_hrms_monthlyattendance',
                        isDynamic: true
                    });

                }


                log.audit("data.noAbsentId", data.noAbsentId);
                log.audit("data.noweeklyId", data.noweeklyId);
                log.audit("data.noholiId", data.noholiId);
                log.audit("data.norotId", data.norotId);
                
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hrms_month_empid', value: parseInt(data.empid) || "" });
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hrms_month_presentdays', value: data.noPresntId });
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hrms_month_absentdays', value: data.noAbsentId });
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hrms_month_weeklyothrs', value: data.noweeklyId });
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hrms_month_holidayothrs', value: data.noholiId });
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hrms_month_rothrs', value: data.norotId });
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hrms_month_monthid', value: data.monthFiedid });
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hrms_month_yearid', value: data.yearFiedidid });

                var newCompOff = parseFloat(data.compOff || 0);
                var newCompOffRound = parseFloat(data.compOffRound || 0);

                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_compoff_days', value: newCompOff });
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_compoff_days_round_off', value: newCompOffRound });

                // Set new mapping requirements:
                // 1. custrecord_hris_month_total_days set from wage period total days / wage cycle days
                var totalDaysValue = data.calculatedTotalDays || data.wageCycleDays || 0;
                if (totalDaysValue) {
                    monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hris_month_total_days', value: totalDaysValue });
                }

                // 2. custrecord_hris_month_payable_days set to custrecord_hrms_month_presentdays field values
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hris_month_payable_days', value: data.noPresntId });

                // 3. custrecord_hris_month_unpaid_days set to custrecord_hrms_month_absentdays field values
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hris_month_unpaid_days', value: data.noAbsentId });

                // 4. custrecord_hris_month_working_days set to timesheet/present day count values
                monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hris_month_working_days', value: data.noPresntId });

                if (data.payGroup) {
                    monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hrms_month_paygroup', value: data.payGroup });
                }

                // Format the pay date to DD/MM/YYYY
                if (data.payDate) {
                    var formattedDate = format.parse({
                        value: data.payDate,
                        type: format.Type.DATE
                    });
                    log.emergency('formattedDate', formattedDate)
                    monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hrms_month_paydate', value: formattedDate });

                }
                else {
                    var yearname = getYearName(data.yearFiedidid);
                    var paydate = getLastDateOfMonth(data.monthFiedid, yearname);
                    log.emergency('paydate', paydate);
                    var formattedDate = format.parse({
                        value: paydate,
                        type: format.Type.DATE
                    });
                    monthlyAttendanceRecord.setValue({ fieldId: 'custrecord_hrms_month_paydate', value: formattedDate });

                }

                var recordId = monthlyAttendanceRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                log.debug('Created Monthly Attendance Record', 'Record ID: ' + recordId);

                return recordId;
            } catch (e) {
                log.error('Error Creating Monthly Attendance Record', e.toString());
                return null;
            }
        }


        /**
         * Processes data in the Reduce stage.
         * Creates custom records for each employee's data.
         * @param {Object} context The Reduce context object.
         */
        function reduce(context) {
            try {
                context.values.forEach(function (value) {
                    var data = JSON.parse(value);
                    log.debug('Reduce Data', data);
                    var recordId = createMonthlyAttendanceRecord(data);

                    if (recordId) {
                        log.debug('Successfully Created Record', 'Record ID: ' + recordId);
                    }
                });

            } catch (e) {
                log.error({
                    title: 'Error in MRS',
                    details: e.message
                });

            }
        }

        /**
         * Retrieves the Pay Group for an employee.
         * @param {number} empId Employee ID.
         * @returns {string|null} Pay Group or null if not found.
         */
        function getPayGroup(empId) {
            log.debug("empID", empId);
            try {
                var empCompSql = "SELECT * FROM customrecord_hris_employee_compen_change WHERE custrecord_hris_empchange_employee_nam = " + empId + " AND isinactive = 'F'";
                var records = getResult(empCompSql);
                return records.length > 0 ? records[0].custrecord_hris_empchange_emp_pay_pro_gp : null;
            } catch (e) {
                log.error('Error in getPayGroup', e);
                return null;
            }
        }
        function getYearName(Yearid) {
            log.debug("Yearid", Yearid);
            try {
                var yearSql = "select * from customlist_hris_year_master WHERE id = " + Yearid + " AND isinactive = 'F'";
                var records = getResult(yearSql);
                return records.length > 0 ? records[0].name : null;
            } catch (e) {
                log.error('Error in getPayGroup', e);
                return null;
            }
        }
        function getLastDateOfMonth(month, year) {
            // month: 1 for January, 12 for December
            var date = new Date(year, month, 0);

            var day = date.getDate();
            var monthNum = date.getMonth() + 1;
            var yearStr = date.getFullYear();

            // Add leading zeros manually
            var dayStr = (day < 10 ? '0' : '') + day;
            var monthStr = (monthNum < 10 ? '0' : '') + monthNum;

            return dayStr + '/' + monthStr + '/' + yearStr;
        }

        /**
         * Retrieves Wage Period details for a Pay Group.
         * @param {string} payGroup Pay Group.
         * @returns {string|null} Wage details as "EndDate#StartDate#Month#Year" or null if not found.
         */
        function searchWagePeriod(payGroup) {
            try {
                var wagePeriodSql = "SELECT * FROM customrecord_hris_wage_period_details WHERE custrecord_hris_pay_group = " + payGroup + " AND isinactive = 'F'";
                var records = getResult(wagePeriodSql);
                if (records.length > 0) {
                    var endDate = records[0].custrecord_hris_end_date;
                    var startDate = records[0].custrecord_hris_start_date;
                    var month = records[0].custrecord_hris_month;
                    var year = records[0].custrecord_hris_year;
                    return endDate + "#" + startDate + "#" + month + "#" + year;
                }
                return null;
            } catch (e) {
                log.error('Error in searchWagePeriod', e);
                return null;
            }
        }
        /**
         * Executes a SuiteQL query and returns results as a mapped array.
         * @param {string} pSQL The SQL query string.
         * @returns {Array} Query results as mapped objects.
         */
        function getResult(pSQL) {
            var queryResults = query.runSuiteQL({ query: pSQL });
            return queryResults.asMappedResults();
        }

        /**
         * Handles errors and summarizes the script execution.
         * @param {Object} summary The summary of the Map/Reduce execution.
         */
        function summarize(summary) {
            summary.mapSummary.errors.iterator().each(function (key, error) {
                log.error('Map Error for Key: ' + key, error);
                return true;
            });
            summary.reduceSummary.errors.iterator().each(function (key, error) {
                log.error('Reduce Error for Key: ' + key, error);
                return true;
            });
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            // summarize: summarize
        };
    });