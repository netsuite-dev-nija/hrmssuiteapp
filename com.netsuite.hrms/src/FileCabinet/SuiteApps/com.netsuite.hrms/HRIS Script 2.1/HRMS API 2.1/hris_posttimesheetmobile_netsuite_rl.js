/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/record', 'N/error', 'N/log', 'N/format', 'N/query'], 
function (record, error, log, format, query) {

    // ---------- Helpers ----------

    function formatTime(timeString) {
        if (!timeString) return null;

        var parts = timeString.split(' ');
        var time = parts[0];
        var modifier = (parts[1] || '').toLowerCase();
        var hm = time.split(':');
        var hours = parseInt(hm[0], 10);
        var minutes = hm[1] || '00';

        if (modifier === 'pm' && hours < 12) hours += 12;
        if (modifier === 'am' && hours === 12) hours = 0;

        return ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2);
    }

    function parseDateDDMMYYYY(dateStr) {
        // Expects "11/08/2026" or "11/8/2026"
        var parts = dateStr.split('/');
        var day   = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10) - 1; // JS months are 0-based
        var year  = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }

    function getDayName(dateObj) {
        var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return dayNames[dateObj.getDay()];
    }

    function getYearId(year) {
        var sql = "SELECT id FROM customlist_hris_year_master WHERE name = ? AND isinactive = 'F'";
        var result = query.runSuiteQL({
            query: sql,
            params: [String(year)]
        }).asMappedResults();

        return result.length > 0 ? result[0].id : null;
    }
function getnormalworkinghours() {
        var workinghours = 0;
        var lunchtime = 0;
        var workinghourssql =
            "SELECT * FROM customrecord_hris_shift_master WHERE custrecord_hris_shift_normalshift='T' and isinactive='F'";
        // log.debug("workinghourssql", workinghourssql);

        var queryResult = query.runSuiteQL({
            query: workinghourssql,
        });
        var workinghourssqlresults = queryResult.asMappedResults();

        if (workinghourssqlresults.length > 0) {
            workinghours = workinghourssqlresults[0].custrecord_hris_working_shift_hours;
            lunchtime = workinghourssqlresults[0].custrecord_hris_shift_lunch_time;
            var shiftmaster = workinghourssqlresults[0].id;

        }

        return workinghours + "#" + lunchtime + "#" + shiftmaster;
    }
    function getNormalWorkingHours() {
        var sql = "SELECT id, custrecord_hris_working_shift_hours, custrecord_hris_shift_lunch_time " +
                  "FROM customrecord_hris_shift_master " +
                  "WHERE custrecord_hris_shift_normalshift = 'T' AND isinactive = 'F'";

        var result = query.runSuiteQL({ query: sql }).asMappedResults();

        if (result.length === 0) {
            return { hours: null, lunch: null, shiftId: null };
        }

        return {
            hours: result[0].custrecord_hris_working_shift_hours,
            lunch: result[0].custrecord_hris_shift_lunch_time,
            shiftId: result[0].id
        };
    }

    // Returns the ID if exists, otherwise null
    function getExistingTimesheetId(empId, bioDate) {
        var sql = "SELECT id FROM customrecord_njt_emp_daily_atten_ch " +
                  "WHERE custrecord_njt_emp_daily_date = ? " +
                  "AND custrecord_njt_daily_atten_emp = ? " +
                  "AND isinactive = 'F'";

        var result = query.runSuiteQL({
            query: sql,
            params: [bioDate, empId]
        }).asMappedResults();

        return result.length > 0 ? result[0].id : null;
    }

    function getExistingDailyAttendanceId(empId, month, yearId) {
        var sql = "SELECT id FROM customrecord_njt_emp_daily_attendance " +
                  "WHERE custrecord_njt_emp_atten_month = ? " +
                  "AND custrecord_njt_emp_atten_year = ? " +
                  "AND custrecord_njt_emp_atten_employee = ? " +
                  "AND isinactive = 'F'";

        var result = query.runSuiteQL({
            query: sql,
            params: [month, yearId, empId]
        }).asMappedResults();

        return result.length > 0 ? result[0].id : null;
    }

    function isBioTranExists(attendanceId, attendanceDetailId) {
        if (!attendanceId || !attendanceDetailId) return false;

        var sql = "SELECT id FROM customrecord_hris_emp_daily_attend_proje " +
                  "WHERE id = ? AND custrecord_hris_daily_timesheet_link = ? AND isinactive = 'F'";

        var result = query.runSuiteQL({
            query: sql,
            params: [attendanceDetailId, attendanceId]
        }).asMappedResults();

        return result.length > 0;
    }

    // ---------- Daily Attendance Header + Sublist ----------

    function ensureDailyAttendanceHeader(empId, bioDate) {
        var dateObj = parseDateDDMMYYYY(bioDate);
        var month   = dateObj.getMonth() + 1;          // 1-12
        var year    = dateObj.getFullYear();
        var yearId  = getYearId(year);
        var dayName = getDayName(dateObj);

        if (!yearId) {
            throw error.create({
                name: 'YEAR_NOT_FOUND',
                message: 'Year master not found for year: ' + year
            });
        }
         // Construct SuiteQL query with multiple employee IDs
  /*       var sqlQuery =
            "SELECT id, hiredate FROM employee WHERE  custentity_hris_emp_employeecheck='T' and isinactive='F' hiredate <= '" +
           bioDate +
            "' AND id = " + empId;

    */ var sqlQuery = "SELECT id, hiredate FROM employee " +
          "WHERE custentity_hris_emp_employeecheck = 'T' " +
          "AND isinactive = 'F' " +
          "AND hiredate <= TO_DATE('" + bioDate + "', 'DD/MM/YYYY') " +
          "AND id = " + empId;   
    log.audit({ title: 'sqlquery', details: sqlQuery });

      
            var results = query.runSuiteQL({
                query: sqlQuery
            }).asMappedResults();

            log.debug({ title: 'Result Count', details: results.length });
          
           if (results.length > 0) {
    var empIdFromResult = results[0].id;          // or results[0].ID
    var hireDate = results[0].hiredate; // or results[0].HIREDATE

    log.debug({
        title: 'Values',
        details: 'ID: ' + empIdFromResult + ', Hire Date: ' + hireDate
    });
} else {
    log.debug({ title: 'No records found' });
}
        var headerId = getExistingDailyAttendanceId(empId, month, yearId);

        var attendanceRecord;
        if (headerId) {
            attendanceRecord = record.load({
                type: 'customrecord_njt_emp_daily_attendance',
                id: headerId,
                isDynamic: true
            });
        } else {
            attendanceRecord = record.create({
                type: 'customrecord_njt_emp_daily_attendance',
                isDynamic: true
            });

            attendanceRecord.setValue({ fieldId: 'custrecord_njt_emp_atten_employee', value: empId });
            attendanceRecord.setValue({ fieldId: 'custrecord_njt_emp_atten_month', value: month });
            attendanceRecord.setValue({ fieldId: 'custrecord_njt_emp_atten_year', value: yearId });
        }

        // Add / update the daily line for this date
      //  addOrUpdateDailyLine(attendanceRecord, empId, bioDate, dayName,hireDate);
var employeeId = empId;
var monthToCreate = month;
        var currentYear = year;
          createSublistRecords(
                attendanceRecord,
                currentYear,
                monthToCreate,
                employeeId,
                hireDate
            );
        var savedId = attendanceRecord.save();
        log.audit('Daily Attendance Header', 'ID: ' + savedId);
        var parentRecordId = savedId; // Store the parent record ID for later use
        
         if (parentRecordId) {
                // Calculate the start and end dates for the month
                var daysInMonth = new Date(currentYear, monthToCreate, 0).getDate();
                var startDate = format.format({
                    value: new Date(currentYear, monthToCreate - 1, 1),
                    type: format.Type.DATE
                });
                var endDate = format.format({
                    value: new Date(currentYear, monthToCreate - 1, daysInMonth),
                    type: format.Type.DATE
                });

                // Check if the employee has a duty roster for the specified month and year
                var hasDutyRoster = false;
                var weeklyOffValue = null;
                try {
                    var dutyRosterCheck = query.runSuiteQL({
                        query:
                            "SELECT COUNT(*) AS count, A.custrecord_hris_duty_res_weeklyoff AS weekly_off " +
                            "FROM customrecord_hris_duty_ros_details B " +
                            "JOIN customrecord_hris_duty_res_plan A ON A.id = B.custrecord_hris_duty_ros_link " +
                            "WHERE A.custrecord_hris_duty_res_approval_status =2 and B.custrecord_hris_employee_name_duty_ros = ? " +
                            "AND B.custrecord_hris_duty_ros_date >= TO_DATE(?, 'DD/MM/YYYY') " +
                            "AND B.custrecord_hris_duty_ros_date <= TO_DATE(?, 'DD/MM/YYYY') " +
                            "GROUP BY A.custrecord_hris_duty_res_weeklyoff",
                        params: [employeeId, startDate, endDate],
                    }).asMappedResults();

                    if (dutyRosterCheck.length > 0 && dutyRosterCheck[0].count > 0) {
                        hasDutyRoster = true;
                        weeklyOffValue = dutyRosterCheck[0].weekly_off || null;
                    }
                    log.debug(
                        "Duty Roster Check",
                        "Employee: " + employeeId +
                        " | Start Date: " + startDate +
                        " | End Date: " + endDate +
                        " | Has Duty Roster: " + hasDutyRoster +
                        " | Weekly Off: " + weeklyOffValue
                    );
                } catch (e) {
                    log.error(
                        "Duty Roster Check Error",
                        "Employee: " + employeeId + " | Error: " + e.toString()
                    );
                }

                if (hasDutyRoster) {
                    // Update employee record with weekly off value
                    if (weeklyOffValue) {
                        try {
                            // Convert weekly off value to an array of internal IDs
                            var weeklyOffArray = [];
                            var weeklyOffString = String(weeklyOffValue).trim();
                            log.debug("Raw weeklyOffValue", weeklyOffString);

                            if (weeklyOffString.indexOf(',') !== -1) {
                                weeklyOffArray = weeklyOffString.split(',').map(function (value) {
                                    var trimmedValue = value.trim().toLowerCase();
                                    if (weeklyOffMapping[trimmedValue]) {
                                        return weeklyOffMapping[trimmedValue];
                                    }
                                    return trimmedValue;
                                }).filter(function (value) {
                                    return value !== null && value !== '';
                                });
                            } else {
                                var trimmedValue = weeklyOffString.toLowerCase();
                                weeklyOffArray = [weeklyOffMapping[trimmedValue] || trimmedValue];
                            }

                            if (weeklyOffArray.length > 0) {
                                var employeeRecord = record.load({
                                    type: record.Type.EMPLOYEE,
                                    id: employeeId,
                                    isDynamic: true,
                                });

                                employeeRecord.setValue({
                                    fieldId: "custentity_hris_empweeklyoffs",
                                    value: weeklyOffArray
                                });

                                //employeeRecord.save();
                                var updatedemployeeID = employeeRecord.save({
                                    enableSourcing: true,
                                    ignoreMandatoryFields: true
                                });
                                log.debug('Updated Employee Id', updatedemployeeID);
                                log.debug(
                                    "Employee Weekly Off Updated",
                                    "Employee: " + employeeId + " | Weekly Off Values: " + weeklyOffArray.join(',')
                                );
                            } else {
                                log.debug(
                                    "No Valid Weekly Off Values",
                                    "No valid weekly off values after processing for Employee: " + employeeId
                                );
                            }
                        } catch (e) {
                            log.error(
                                "Error Updating Employee Weekly Off",
                                "Employee: " + employeeId + " | Error: " + e.toString()
                            );
                        }
                    } else {
                        log.debug(
                            "No Weekly Off Value",
                            "No valid weekly off value found for Employee: " + employeeId
                        );
                    }

                    try {
                        setDutyRosterAttendance(
                            attendanceRecord,
                            currentYear,
                            monthToCreate,
                            employeeId,
                            record
                        );
                        log.debug("setDutyRosterAttendance", "Executed successfully");
                    } catch (e) {
                        log.error("Error in setDutyRosterAttendance", e.message || e);
                    }
                } else {
                    try {
                        setweeklyoffvalue(
                            attendanceRecord,
                            currentYear,
                            monthToCreate,
                            employeeId
                        );
                        log.debug("setweeklyoffvalue", "Executed successfully");
                    } catch (e) {
                        log.error("Error in setweeklyoffvalue", e.message || e);
                    }

                    try {
                        setpublicholidaysfunc(
                            attendanceRecord,
                            currentYear,
                            monthToCreate,
                            employeeId
                        );
                        log.debug("setpublicholidaysfunc", "Executed successfully");
                    } catch (e) {
                        log.error("Error in setpublicholidaysfunc", e.message || e);
                    }
                }

                log.emergency("callornot", "Reached after all functions");

                try {
                    setleavedays(attendanceRecord, currentYear, monthToCreate, employeeId,parentRecordId);
                    log.debug("setleavedays", "Executed successfully");
                } catch (e) {
                    log.error("Error in setleavedays", e.message || e);
                }
            }

        return savedId;
    }
 function createSublistRecords(
        attendanceRecord,
        year,
        month,
        employeeId,
        hireDate
    ) {
        var daysInMonth = new Date(year, month, 0).getDate();
        log.debug("Days in Month", daysInMonth);

        var sublistId = "recmachcustrecord_njt_emp_daily_parent";

        var startDay = 1;
        if (
            hireDate &&
            hireDate.getFullYear() === year &&
            hireDate.getMonth() + 1 === month
        ) {
            startDay = hireDate.getDate();
            log.debug("Adjusted Start Day", "Starting from hire date: " + startDay);
        } else {
            log.debug(
                "Using Default Start Day",
                "Hire date not in same month/year, starting from day 1"
            );
        }

        for (var day = startDay; day <= daysInMonth; day++) {
            try {
                var date = new Date(year, month - 1, day);
                var formattedDate = formatDateToDMYYYY(date);
                var parsedDate = format.parse({
                    value: formattedDate,
                    type: format.Type.DATE,
                });
                var dayOfWeek = getDayOfWeek(date);
                if (hireDate && parsedDate < hireDate) {
                    continue;
                }

                attendanceRecord.selectNewLine({ sublistId: sublistId });

                attendanceRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_njt_emp_daily_date",
                    value: parsedDate,
                });

                attendanceRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_njt_emp_daily_enddate",
                    value: parsedDate,
                });

                attendanceRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_njt_emp_daily_day",
                    value: dayOfWeek,
                });

                attendanceRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_njt_daily_atten_emp",
                    value: employeeId,
                });
              attendanceRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_njt_emp_daily_project",
                    value: 609,
                });

                // Set attendance type to empty (no default value)
                /*  attendanceRecord.setCurrentSublistValue({
                   sublistId: sublistId,
                   fieldId: "custrecord_njt_emp_daily_intatt",
                   value: '',
                 }); */
                attendanceRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_njt_emp_daily_intatt",
                    value: 23,
                });

                // Set working hours to empty
                var normalworkinghoursresult = getnormalworkinghours();

                var normalworkinghoursresultdetails = normalworkinghoursresult.split("#");

                var normalworkinghours = normalworkinghoursresultdetails[0]; // "08:30"
                var lunchtime = normalworkinghoursresultdetails[1];
                var shiftmaster = normalworkinghoursresultdetails[2];
                attendanceRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_njt_emp_daily_working_hours",
                    value: normalworkinghours,
                });
                attendanceRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_njt_emp_daily_lunch_time",
                    value: lunchtime,
                });
                attendanceRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: "custrecord_hris_shiftmaser",
                    value: shiftmaster,
                    ignoreFieldChange: false
                });

                attendanceRecord.commitLine({ sublistId: sublistId });

                log.debug(
                    "Sublist Line Added",
                    "Employee: " +
                    employeeId +
                    " | Date: " +
                    formattedDate +
                    " | Day: " +
                    dayOfWeek +
                    " | Attendance Type: Empty" +
                    " | Working Hours: Empty"
                );
            } catch (e) {
                log.error("Error Adding Sublist Line", "Day: " + day + " | Error: " + e.toString());
            }
        }
    }
     function formatDateToDMYYYY(date) {
        var day = date.getDate();
        var month = date.getMonth() + 1; // Months are 0-based
        var year = date.getFullYear();
        return day + "/" + month + "/" + year;
    }
    function getDayOfWeek(date) {
        var days = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ];
        return days[date.getDay()];
    }
     function getResult(pSQL) {
        var queryResults = query.runSuiteQL({ query: pSQL });
        return queryResults.asMappedResults();
    }

     function setweeklyoffvalue(attendanceRecord, yearId, monthId, employeeId) {

        /*  var setsqlquery =
             "SELECT BUILTIN.DF(B.custentity_hris_empweeklyoffs) AS weekly_off, A.custrecord_njt_emp_daily_date, " +
             "A.custrecord_njt_emp_daily_intatt, A.id AS attendance_child_id, A.custrecord_njt_emp_daily_day, " +
             "custentity_hris_empholidays AS holidays FROM employee AS B INNER JOIN customrecord_njt_emp_daily_atten_ch AS A " +
             "ON B.id = A.custrecord_njt_daily_atten_emp WHERE B.id = " +
             employeeId; */
        var setsqlquery =
            "SELECT BUILTIN.DF(B.custentity_hris_empweeklyoffs) AS weekly_off, A.custrecord_njt_emp_daily_date, " +
            "A.custrecord_njt_emp_daily_intatt, A.id AS attendance_child_id, A.custrecord_njt_emp_daily_day, " +
            "custentity_hris_empholidays AS holidays FROM employee AS B INNER JOIN customrecord_njt_emp_daily_atten_ch AS A " +
            "ON B.id = A.custrecord_njt_daily_atten_emp WHERE B.id = " +
            employeeId + "and  TO_CHAR(A.custrecord_njt_emp_daily_date, 'YYYY') = '" + yearId + "' AND EXTRACT(MONTH FROM A.custrecord_njt_emp_daily_date) = " + monthId + ""
        log.debug("SQL Query setfunc", setsqlquery);
        var records = getResult(setsqlquery);
        log.debug("recordsforsetfunc", records);

        var dayMap = {
            0: "sunday",
            1: "monday",
            2: "tuesday",
            3: "wednesday",
            4: "thursday",
            5: "friday",
            6: "saturday",
            sun: "sunday",
            mon: "monday",
            tue: "tuesday",
            wed: "wednesday",
            thu: "thursday",
            fri: "friday",
            sat: "saturday",
        };

        for (var i = 0; i < records.length; i++) {
            var result = records[i];
            var weeklyOff = result.weekly_off;
            var dailyDay = result.custrecord_njt_emp_daily_day;
            var attendanceChildId = result.attendance_child_id;
            var setAttenId = result.custrecord_njt_emp_daily_intatt;
            var attendanceDate = result.custrecord_njt_emp_daily_date;

            log.debug(
                "Raw Values",
                "Employee: " +
                employeeId +
                " | Date: " +
                attendanceDate +
                " | dailyDay: " +
                dailyDay +
                " | weeklyOff: " +
                weeklyOff
            );

            if (weeklyOff && (setAttenId == null || setAttenId == 23)) {
                var weekoffIds = weeklyOff.split(",").map(function (id) {
                    return id.trim().toLowerCase();
                });
                log.debug("weekoffIds", weekoffIds);

                var normalizedDailyDay = dailyDay
                    ? dayMap[dailyDay.toLowerCase()] || dailyDay.trim().toLowerCase()
                    : "";
                log.debug(
                    "Comparing dailyDay",
                    "normalizedDailyDay: " + normalizedDailyDay
                );

                var isWeeklyOff = false;
                for (var j = 0; j < weekoffIds.length; j++) {
                    if (weekoffIds[j] == normalizedDailyDay) {
                        isWeeklyOff = true;
                        try {
                            var attendanceChildRecord = record.load({
                                type: "customrecord_njt_emp_daily_atten_ch",
                                id: attendanceChildId,
                                isDynamic: true,
                            });

                            attendanceChildRecord.setValue({
                                fieldId: "custrecord_njt_emp_daily_intatt",
                                value: 21, // Weekly Off
                            });
                            attendanceChildRecord.setValue({
                                fieldId: "custrecord_njt_emp_daily_working_hours",
                                value: '',
                            });

                            attendanceChildRecord.save();
                            log.debug(
                                "Updated Weekly Off",
                                "Employee: " +
                                employeeId +
                                " | Date: " +
                                attendanceDate +
                                " | Day: " +
                                dailyDay +
                                " | Working Hours: Empty"
                            );
                            break;
                        } catch (e) {
                            log.error(
                                "Error Updating Weekly Off",
                                "Employee: " +
                                employeeId +
                                " | Date: " +
                                attendanceDate +
                                " | Error: " +
                                e.toString()
                            );
                        }
                    }
                }

                /*  if (!isWeeklyOff) {
                     log.debug(
                         "Non-Weekly Off Day",
                         "Employee: " +
                         employeeId +
                         " | Date: " +
                         attendanceDate +
                         " | Day: " +
                         dailyDay +
                         " not in " +
                         weekoffIds
                     );
                     try {
                         var attendanceChildRecord = record.load({
                             type: "customrecord_njt_emp_daily_atten_ch",
                             id: attendanceChildId,
                             isDynamic: true,
                         });
 
                         attendanceChildRecord.setValue({
                             fieldId: "custrecord_njt_emp_daily_intatt",
                             value: 23, // Non-weekly off day
                         });
 
                                             attendanceChildRecord.setValue({
                             fieldId: "custrecord_njt_emp_daily_working_hours",
                             value: '',
                         });
 
                         attendanceChildRecord.save();
                         log.debug(
                             "Updated Non-Weekly Off",
                             "Employee: " +
                             employeeId +
                             " | Date: " +
                             attendanceDate +
                             " | Day: " +
                             dailyDay +
                             " | Working Hours: Empty"
                         );
                     } catch (e) {
                         log.error(
                             "Error Updating Non-Weekly Off",
                             "Employee: " +
                             employeeId +
                             " | Date: " +
                             attendanceDate +
                             " | Error: " +
                             e.toString()
                         );
                     }
                 } */
            } else {
                log.debug(
                    "Skipping Weekly Off",
                    "Attendance ID already set or no weekly off found for Employee: " +
                    employeeId +
                    " | Date: " +
                    attendanceDate
                );
            }
        }
    }

    /**
     * Sets public holidays for the employee.
     * @param {Record} attendanceRecord - The parent attendance record.
     * @param {number} currentYear - The target year.
     * @param {number} monthToCreate - The target month.
     * @param {number} employeeId - The employee ID.
     */
    function setpublicholidaysfunc(
        attendanceRecord,
        currentYear,
        monthToCreate,
        employeeId
    ) {
        var publiholsql =
            "SELECT custrecord_hris_holiday_date FROM customrecord_hris_holiday_master";

        var recordsforpublichol = getResult(publiholsql);
        log.audit("recordsforpublichol", recordsforpublichol);
        var publicHolAttenTypeId = getattendancetypeid(19);
        log.audit("publicHolAttenTypeId", publicHolAttenTypeId);

        if (recordsforpublichol && recordsforpublichol.length > 0) {
            for (var k = 0; k < recordsforpublichol.length; k++) {
                var holidayDate = recordsforpublichol[k].custrecord_hris_holiday_date;
                log.emergency("Holiday Date [" + k + "]", holidayDate);

                var setsqlqueryholiday =
                    "SELECT id FROM customrecord_njt_emp_daily_atten_ch WHERE custrecord_njt_emp_daily_date = '" +
                    holidayDate +
                    "' AND custrecord_njt_daily_atten_emp = " +
                    employeeId;

                log.audit("SQL Query setfunc for publichol", setsqlqueryholiday);
                var recordsholiday = getResult(setsqlqueryholiday);
                log.audit("recordsholidayforsetfunc", recordsholiday);

                for (var z = 0; z < recordsholiday.length; z++) {
                    var result = recordsholiday[z];
                    var Attendancechildid = result.id || "";
                    if (!Attendancechildid) {
                        log.error(
                            "No Attendance Child ID",
                            "Skipping update for holiday date: " + holidayDate
                        );
                        continue;
                    }

                    try {
                        var attendanceRecordchildrec = record.load({
                            type: "customrecord_njt_emp_daily_atten_ch",
                            id: Attendancechildid,
                            isDynamic: true,
                        });

                        attendanceRecordchildrec.setValue({
                            fieldId: "custrecord_njt_emp_daily_intatt",
                            value: publicHolAttenTypeId, // Public Holiday
                        });
                        attendanceRecordchildrec.setValue({
                            fieldId: "custrecord_njt_emp_daily_working_hours",
                            value: '',
                        });

                        attendanceRecordchildrec.save();
                        log.audit(
                            "Attendance Updated",
                            "Attendance type set for child record ID: " + Attendancechildid +
                            " | Working Hours: Empty"
                        );
                    } catch (e) {
                        log.error(
                            "Error Updating Public Holiday",
                            "Child ID: " + Attendancechildid + " | Error: " + e.toString()
                        );
                    }
                }
            }
        }
    }

    /**
     * Updates attendance child records based on approved leave applications
     * @param {Object} attendanceRecord - The parent attendance record
     * @param {number} currentYear - The year to process
     * @param {number} monthToCreate - The month to process
     * @param {number} employeeId - The employee ID to filter leave records
     */
    function setleavedays(attendanceRecord, currentYear, monthToCreate, employeeId,parentRecordId) {

var dailydatesql = "select min( custrecord_njt_emp_daily_date) as minstartdate, max( custrecord_njt_emp_daily_date) as maxstartdate \
     from customrecord_njt_emp_daily_attendance a join customrecord_njt_emp_daily_atten_ch b \
     on a.id = b.custrecord_njt_emp_daily_parent where a.id ="+parentRecordId+"";
log.emergency("dailydatesql", dailydatesql);

        var dailydatesqlrec = getResult(dailydatesql);
        log.emergency("dailydatesqlrec", dailydatesqlrec);
        if(dailydatesqlrec.length > 0){
            var startdate = dailydatesqlrec[0].minstartdate;
            var enddate = dailydatesqlrec[0].maxstartdate;

        /* var leavedetailsquery =
            "SELECT " +
            "A.custrecord_hris_lve_fromdate, " +
            "A.custrecord_hris_lve_employeename AS empidleavapp, " +
            "A.custrecord_hris_lve_todate, " +
            "B.custrecord_hris_lvecnfg_seqno AS seqnum, " +
            "A.custrecord_hris_lve_hrmsapprovalstatus AS leavestatus, " +
            "A.custrecord_hris_attn_type_onleaveapp, " +
            "A.custrecord_hris_lve_cancellation,B.custrecord_hris_lveconfig_unpaid as unpaidcheck " +
            "FROM customrecord_hris_leaveapplication AS A " +
            "INNER JOIN customrecord_hris_leaveconfig AS B " +
            "ON A.custrecord_hris_lve_leavetype = B.id " +
            "WHERE A.custrecord_hris_lve_employeename = " + employeeId + " " +
            "AND A.custrecord_hris_lva_year = " + currentYear + " " +
            "AND A.custrecord_hris_lve_month = " + monthToCreate; */


      
            
            var leavedetailsquery =
    "SELECT " +
    "A.custrecord_hris_lve_fromdate, " +
    "A.custrecord_hris_lve_employeename AS empidleavapp, " +
    "A.custrecord_hris_lve_todate, " +
    "B.custrecord_hris_lvecnfg_seqno AS seqnum, " +
    "A.custrecord_hris_lve_hrmsapprovalstatus AS leavestatus, " +
    "A.custrecord_hris_attn_type_onleaveapp, " +
    "A.custrecord_hris_lve_cancellation, " +
    "B.custrecord_hris_lveconfig_unpaid AS unpaidcheck " +
    "FROM customrecord_hris_leaveapplication AS A " +
    "INNER JOIN customrecord_hris_leaveconfig AS B " +
    "ON A.custrecord_hris_lve_leavetype = B.id " +
    "WHERE A.custrecord_hris_lve_employeename = " + employeeId + " " +
    "AND A.custrecord_hris_lve_fromdate <= TO_DATE('" + enddate + "', 'DD/MM/YYYY') " +
    "AND A.custrecord_hris_lve_todate >= TO_DATE('" + startdate + "', 'DD/MM/YYYY')";


        log.emergency("leavedetailsquery", leavedetailsquery);

        var leavedetialsrec = getResult(leavedetailsquery);
        log.emergency("leavedetialsrec", leavedetialsrec);

        for (var i = 0; i < leavedetialsrec.length; i++) {
            var Leavefromdate = leavedetialsrec[i].custrecord_hris_lve_fromdate;
            log.emergency("Leavefromdate", Leavefromdate);
            var Leavetodate = leavedetialsrec[i].custrecord_hris_lve_todate;
            log.emergency("Leavetodate", Leavetodate);
            var Seqnum = leavedetialsrec[i].seqnum;
            var employeeIdFromLeave = leavedetialsrec[i].empidleavapp;
            var leavestatus = leavedetialsrec[i].leavestatus;
            var leaveType = leavedetialsrec[i].custrecord_hris_attn_type_onleaveapp;
            var cancelchk = leavedetialsrec[i].custrecord_hris_lve_cancellation;
             var unpaidcheck=leavedetialsrec[i].unpaidcheck;
            log.emergency('Unpaidcheck',unpaidcheck);
            log.emergency("cancelchk", cancelchk);

            var matchedAttenTypeId = leaveType;
            log.audit("matchedAttenTypeId", matchedAttenTypeId);

            var weeklyoffAttenTypeId = getattendancetypeid(30);
            log.audit("weeklyoffAttenTypeId", weeklyoffAttenTypeId);
            var publicHolAttenTypeId = getattendancetypeid(19);
            log.audit("publicHolAttenTypeId", publicHolAttenTypeId);

            /*   var presentattentypeid = getattendancetypeid(4);
              log.audit("presentattentypeid", presentattentypeid);
        
         */
            var presentattentypeid = getattendancetypeid(22);
            log.audit("presentattentypeid", presentattentypeid);

            var childAttenDetails = getchildattenid(Leavefromdate, Leavetodate, employeeId,parentRecordId);
            log.audit("childAttenDetails", childAttenDetails);

            for (var j = 0; j < childAttenDetails.length; j++) {
                var attenChildId = childAttenDetails[j].attenchildid;
                var setAttenId = childAttenDetails[j].setattendid;
                var currentDate = childAttenDetails[j].date;
                log.audit("attenChildId[" + j + "]", attenChildId);
                log.audit("setAttenId[" + j + "]", setAttenId);
                log.audit("currentDate[" + j + "]", currentDate);

                 if (
                    leavestatus == 2 &&
                    cancelchk != 'T' &&
                    attenChildId &&
                    unpaidcheck=='T'
                ) {
                    log.emergency("Processing approved leave for update");
                    try {
                        var attendanceChildRecord = record.load({
                            type: "customrecord_njt_emp_daily_atten_ch",
                            id: attenChildId,
                            isDynamic: true,
                        });

                        attendanceChildRecord.setValue({
                            fieldId: "custrecord_njt_emp_daily_intatt",
                            value: matchedAttenTypeId,
                        });
                        attendanceChildRecord.setValue({
                            fieldId: "custrecord_njt_emp_daily_working_hours",
                            value: '',
                        });

                        attendanceChildRecord.save();
                        log.emergency(
                            "Updated Leave",
                            "Child record ID: " + attenChildId +
                            " for date: " + currentDate +
                            " with attendance type: " + matchedAttenTypeId +
                            " | Working Hours: Empty"
                        );
                    } catch (e) {
                        log.error(
                            "Error Updating Leave",
                            "Child ID: " + attenChildId +
                            " | Date: " + currentDate +
                            " | Error: " + e.toString()
                        );
                    }
                }
               else if (
                    leavestatus == 2 &&
                    cancelchk != 'T' &&
                    attenChildId && unpaidcheck =='F'&&
                    setAttenId != weeklyoffAttenTypeId &&
                    setAttenId != publicHolAttenTypeId
                ) {
                    log.emergency("Processing approved leave for update");
                    try {
                        var attendanceChildRecord = record.load({
                            type: "customrecord_njt_emp_daily_atten_ch",
                            id: attenChildId,
                            isDynamic: true,
                        });

                        attendanceChildRecord.setValue({
                            fieldId: "custrecord_njt_emp_daily_intatt",
                            value: matchedAttenTypeId,
                        });
                        attendanceChildRecord.setValue({
                            fieldId: "custrecord_njt_emp_daily_working_hours",
                            value: '',
                        });

                        attendanceChildRecord.save();
                        log.emergency(
                            "Updated Leave",
                            "Child record ID: " + attenChildId +
                            " for date: " + currentDate +
                            " with attendance type: " + matchedAttenTypeId +
                            " | Working Hours: Empty"
                        );
                    } catch (e) {
                        log.error(
                            "Error Updating Leave",
                            "Child ID: " + attenChildId +
                            " | Date: " + currentDate +
                            " | Error: " + e.toString()
                        );
                    }
                }
                
                else if (
                    leavestatus == 2 &&
                    cancelchk == 'T' &&
                    attenChildId &&
                    setAttenId != weeklyoffAttenTypeId &&
                    setAttenId != publicHolAttenTypeId
                ) {
                    log.emergency("Processing cancelled leave");
                    try {
                        var attendanceChildRecord = record.load({
                            type: "customrecord_njt_emp_daily_atten_ch",
                            id: attenChildId,
                            isDynamic: true,
                        });

                        attendanceChildRecord.setValue({
                            fieldId: "custrecord_njt_emp_daily_intatt",
                            value: presentattentypeid,
                        });
                        /*  attendanceChildRecord.setValue({
                             fieldId: "custrecord_njt_emp_daily_working_hours",
                             value: '',
                         });
  */
                        attendanceChildRecord.save();

                        log.emergency(
                            "Updated Cancelled Leave",
                            "Child record ID: " + attenChildId +
                            " for date: " + currentDate +
                            " set to present: " + presentattentypeid +
                            " | Working Hours: Empty"
                        );
                    } catch (e) {
                        log.error(
                            "Error Updating Cancelled Leave",
                            "Child ID: " + attenChildId +
                            " | Date: " + currentDate +
                            " | Error: " + e.toString()
                        );
                    }
                }
            }
        }
    }
}

    /**
     * Retrieves child attendance records for a given date range and employee
     * @param {string} lvfrom - Leave start date
     * @param {string} lvTo - Leave end date
     * @param {number} empid - Employee ID
     * @returns {Array} Array of attendance records
     */
    function getchildattenid(lvfrom, lvTo, empid,parentRecordId) {
        var attenchildquery =
            "SELECT custrecord_njt_emp_daily_date, id, custrecord_njt_emp_daily_intatt " +
            "FROM customrecord_njt_emp_daily_atten_ch " +
            "WHERE custrecord_njt_emp_daily_date >= '" + lvfrom + "' " +
            "AND custrecord_njt_emp_daily_date <= '" + lvTo + "' " +
            "AND custrecord_njt_emp_daily_parent = " +parentRecordId +" AND custrecord_njt_daily_atten_emp = " + empid;

        log.debug("attenchildquery", attenchildquery);

        var attenchildrec = getResult(attenchildquery);
        log.audit("getchildattenid results", attenchildrec);

        var results = [];
        for (var i = 0; i < attenchildrec.length; i++) {
            results.push({
                attenchildid: attenchildrec[i].id || null,
                setattendid: attenchildrec[i].custrecord_njt_emp_daily_intatt || null,
                date: attenchildrec[i].custrecord_njt_emp_daily_date,
            });
        }

        return results.length > 0 ? results : [];
    }

    /**
     * Retrieves attendance type ID based on sequence number.
     * @param {number} Sequencenum - The sequence number for the attendance type.
     * @return {string|null} The attendance type ID.
     */
    function getattendancetypeid(Sequencenum) {
        var attensql =
            "SELECT id FROM customrecord_hris_attendancetype WHERE custrecord_hris_leave_type_seq_no = " +
            Sequencenum;
        log.debug("attensql", attensql);

        var queryResult = query.runSuiteQL({
            query: attensql,
        });
        var results = queryResult.asMappedResults();

        if (results.length > 0) {
            var attentypeid = results[0].id;
            return attentypeid;
        }

        return null;
    }

    function addOrUpdateDailyLine(attendanceRecord, empId, bioDate, dayName, hireDate) {
        var sublistId = 'recmachcustrecord_njt_emp_daily_parent';
        var parsedDate = format.parse({
            value: bioDate,
            type: format.Type.DATE
        });

        // Check if line already exists for this date
        var lineCount = attendanceRecord.getLineCount({ sublistId: sublistId });
        var existingLine = -1;

        for (var i = 0; i < lineCount; i++) {
            var lineDate = attendanceRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_njt_emp_daily_date',
                line: i
            });
            if (lineDate && format.format({ value: lineDate, type: format.Type.DATE }) === bioDate) {
                existingLine = i;
                break;
            }
        }

        if (existingLine >= 0) {
            attendanceRecord.selectLine({ sublistId: sublistId, line: existingLine });
        } else {
            attendanceRecord.selectNewLine({ sublistId: sublistId });
        }

        var shiftInfo = getNormalWorkingHours();

        attendanceRecord.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'custrecord_njt_emp_daily_date',
            value: parsedDate
        });
        attendanceRecord.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'custrecord_njt_emp_daily_enddate',
            value: parsedDate
        });
        attendanceRecord.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'custrecord_njt_emp_daily_day',
            value: dayName
        });
        attendanceRecord.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'custrecord_njt_daily_atten_emp',
            value: empId
        });
        attendanceRecord.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'custrecord_njt_emp_daily_project',
            value: 609                      // hard-coded as in original
        });
        attendanceRecord.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'custrecord_njt_emp_daily_intatt',
            value: 23                       // hard-coded as in original
        });

        if (shiftInfo.hours) {
            attendanceRecord.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_njt_emp_daily_working_hours',
                value: shiftInfo.hours
            });
        }
        if (shiftInfo.lunch) {
            attendanceRecord.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_njt_emp_daily_lunch_time',
                value: shiftInfo.lunch
            });
        }
        if (shiftInfo.shiftId) {
            attendanceRecord.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_hris_shiftmaser',
                value: shiftInfo.shiftId
            });
        }

        attendanceRecord.commitLine({ sublistId: sublistId });
    }

    // ---------- Main Entry Point ----------
/**
 * Calculate working hours in decimal between two times
 * @param {string} inTime  - e.g. "6:00 AM"
 * @param {string} outTime - e.g. "12:00 PM"
 * @returns {number} working hours in decimal (e.g. 6.0, 8.5, 7.75)
 */
function calculateWorkingHours(inTime, outTime) {
    if (!inTime || !outTime) return 0;

    // Convert time string to minutes from midnight
    function timeToMinutes(timeStr) {
        var parts = timeStr.trim().split(' ');
        var time = parts[0];
        var modifier = (parts[1] || '').toLowerCase();

        var hm = time.split(':');
        var hours = parseInt(hm[0], 10);
        var minutes = parseInt(hm[1] || '0', 10);

        if (modifier === 'pm' && hours < 12) {
            hours += 12;
        } else if (modifier === 'am' && hours === 12) {
            hours = 0;
        }

        return (hours * 60) + minutes;
    }

    var inMinutes  = timeToMinutes(inTime);
    var outMinutes = timeToMinutes(outTime);

    // Handle overnight case (Out time next day)
    if (outMinutes < inMinutes) {
        outMinutes += 24 * 60;   // add 24 hours
    }

    var diffMinutes = outMinutes - inMinutes;
    var decimalHours = diffMinutes / 60;

    // Round to 2 decimal places (optional)
    return Math.round(decimalHours * 100) / 100;
}
    function createAttendanceRecords(context) {
        if (!context) {
            return [{
                Status: false,
                StatusCode: 400,
                Message: 'Invalid context',
                ErrorMessage: 'Context is empty or undefined'
            }];
        }

        var requests = Array.isArray(context) ? context : [context];
        var results = [];

         var apiUrl ='https://11951030.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=825&deploy=1';
        var apiMethod = 'POST';

        var punchTypeValues = { 'IN': 1, 'OUT': 2 };
        var sourceValues    = { 'Biometric': 1, 'Mob': 2, 'Web': 3 };

        try {
            for (var i = 0; i < requests.length; i++) {
                var req = requests[i];
                log.debug('Processing request', JSON.stringify(req));

                var punchTypeId = punchTypeValues[req.punchType];
                var timesheetId = null;
                var attendanceRecord;

                // ---------- IN Punch ----------
                if (punchTypeId === 1) {
                    timesheetId = getExistingTimesheetId(req.empId, req.bioDate);

                    if (!timesheetId) {
                        // Create / ensure daily attendance header + line
                        timesheetId = ensureDailyAttendanceHeader(req.empId, req.bioDate);
                    }
                     timesheetId = getExistingTimesheetId(req.empId, req.bioDate);
                    attendanceRecord = record.create({
                        type: 'customrecord_hris_emp_daily_attend_proje',
                        isDynamic: true
                    });
                }
                // ---------- OUT Punch ----------
                else if (punchTypeId === 2) {
                  /*   var exists = isBioTranExists(req.attendanceId, req.attedanceDetailId);

                    if (exists) {
            */             attendanceRecord = record.load({
                            type: 'customrecord_hris_emp_daily_attend_proje',
                            id: req.attedanceDetailId,
                            isDynamic: true
                        });
                    //} 
                    /* else {
                        attendanceRecord = record.create({
                            type: 'customrecord_hris_emp_daily_attend_proje',
                            isDynamic: true
                        });
                    } */
                } else {
                    throw error.create({
                        name: 'INVALID_PUNCH_TYPE',
                        message: 'punchType must be IN or OUT'
                    });
                }

                // ---------- Common fields ----------
                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_project_emp',
                    value: req.empId
                });

                if (req.bioDate) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_attend_date',
                        value: format.parse({
                            value: req.bioDate,
                            type: format.Type.DATE
                        })
                    });
                }

               /*  if (req.bioTime) {
                   
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_atte_pro_intim',
                        value: req.bioTime
                    });
                } */
                 
              var intime =  attendanceRecord.getValue({
                        fieldId: 'custrecord_hris_emp_daily_atte_pro_intim',
                        
                    });

               if(intime && req.bioTime && punchTypeId === 2) {
                var workingHours = calculateWorkingHours(intime, req.bioTime);
                  attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_pro_outime',
                        value: req.bioTime
                    });
                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_pro_workhrs',
                    value: workingHours
                });

               } 
               else if(punchTypeId === 1 && req.bioTime) {
                  attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_atte_pro_intim',
                        value: req.bioTime
                    });
               }    
               /*  if (req.punchType) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_njt_bio_punch_type',
                        value: punchTypeId
                    });
                }
                    */

                if (req.source) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_pro_source',
                        value: sourceValues[req.source]
                    });
                } 

                if (req.latitude) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_pro_latitude',
                        value: req.latitude
                    });
                }

                if (req.longitude) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_pro_longitude',
                        value: req.longitude
                    });
                }

                if (req.address) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_pro_address',
                        value: req.address
                    });
                }

                if (req.project) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_daily_emp_project_detail',
                        value: req.project
                    });
                }

                if (req.stage) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_diaily_emp_att_stage',
                        value: req.stage
                    });
                }
                if(req.standardproject) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_stdproject', 
                        value: req.standardproject
                    });
                }
                if(req.standardprojecttask) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_project_task',
                        value: req.standardprojecttask
                    });
                }
                if (req.shift) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_pro_shift',
                        value: req.shift
                    });
                }

                // Link to timesheet / daily attendance
                if (req.attendanceId) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_daily_timesheet_link',
                        value: req.attendanceId
                    });
                } else if (timesheetId) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_daily_timesheet_link',
                        value: timesheetId
                    });
                }
                if(req.mobileUniqId) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_pro_mobileid',
                        value: req.mobileUniqId
                    });
                }
                   // Setting additional fields
                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_response_code',
                    value: 200
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_proc_status',
                    value: 2
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_response_sts',
                    value: 'Success'
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_response_msg',
                    value: 'Record created successfully'
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_api_url',
                    value: apiUrl
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_api_method',
                    value: 'POST'
                });
                if(punchTypeId ==1){
                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_injson',
                    value: JSON.stringify(req)
                });
                }
                else if(punchTypeId ==2){
attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_outjson',
                    value: JSON.stringify(req)
                });
            }
               
                var recordId = attendanceRecord.save();
                log.audit('Attendance Detail saved', 'ID: ' + recordId);

                results.push({
                    Status: true,
                    Action: punchTypeId === 1 ? 'Add' : 'Update',
                    StatusCode: 200,
                    Message: 'Success',
                    Attendanceid: timesheetId || req.attendanceId || null,
                    Attendancedetailid: recordId,
                  
                    ErrorMessage: null
                });
            }
        } catch (e) {
            log.error('Error processing requests', e);
            results.push({
                Status: false,
                StatusCode: 400,
                Message: 'Error',
                ErrorMessage: e.message || 'Unknown error'
            });
        }

        return results;
    }

    return {
        post: createAttendanceRecords
    };
});