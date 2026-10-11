/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NAuthor Vanitha / Fixed by Expert
 */
define(['N/log', 'N/query'], function(log, query) {

    function get(context) {
        try {
            log.audit('=== LEAVE CALCULATION START ===', JSON.stringify(context));

            // Fix: Remove extra quotes from input (some UIs send "'15/11/2025'")
            var fromDateStr = (context.fromdate || '').toString().replace(/['"]/g, '').trim();
            var toDateStr   = (context.todate || '').toString().replace(/['"]/g, '').trim();
            var empId       = context.nsId;
            var leaveType   = context.leaveType; // Added param

            log.audit('CLEANED INPUT', { fromDateStr: fromDateStr, toDateStr: toDateStr, empId: empId, leaveType: leaveType });

            // 1. Fetch Leave Configuration
            var includeWeekOff = false;
            var includeHoliday = false;
            
            if (leaveType) {
                var configSql = "SELECT custrecord_hris_lveconfig_includeweekoff, custrecord_hris_lveconfig_includeholiday " +
                                "FROM customrecord_hris_leaveconfig WHERE id = " + leaveType;
                var configResults = query.runSuiteQL({ query: configSql }).asMappedResults();
                
                if (configResults.length > 0) {
                    includeWeekOff = (configResults[0].custrecord_hris_lveconfig_includeweekoff === 'T' || configResults[0].custrecord_hris_lveconfig_includeweekoff === true);
                    includeHoliday = (configResults[0].custrecord_hris_lveconfig_includeholiday === 'T' || configResults[0].custrecord_hris_lveconfig_includeholiday === true);
                }
            }

            // 2. Total inclusive days
            var totalDays = getTotalDays(fromDateStr, toDateStr);
            log.audit('TOTAL DAYS', totalDays);

            // 3. Get all dates in range (dd/mm/yyyy)
            var allDates = getAllDatesInRange(fromDateStr, toDateStr);

            // 4. Employee weekly off days
            var weeklyOffDays = getEmployeeWeeklyOffs(empId);
            log.audit('EMPLOYEE WEEKLY OFF', weeklyOffDays);

            // 5. Public holidays (stored as dd/mm/yyyy string)
            var holidayDates = getPublicHolidays(fromDateStr, toDateStr);
            log.audit('PUBLIC HOLIDAYS', holidayDates);

            // --- START VALIDATION ---
            var fromDayName = getDayName(fromDateStr);
            var toDayName = getDayName(toDateStr);

            // Check if From Date or To Date is a Weekly Off
            if (weeklyOffDays.indexOf(fromDayName) !== -1 || weeklyOffDays.indexOf(toDayName) !== -1) {
                return JSON.stringify({ Status: 'Failure', message: 'The Applied date is weekly off' });
            }

            // Check if From Date or To Date is a Holiday
            if (holidayDates.indexOf(fromDateStr) !== -1 || holidayDates.indexOf(toDateStr) !== -1) {
                return JSON.stringify({ Status: 'Failure', message: 'The Applied date is holiday' });
            }
            // --- END VALIDATION ---

            // 6. Count deductions
            var weeklyOffCount = 0;
            var holidayCount = 0;
            var statusList = [];

            allDates.forEach(function(dateStr) {
                var dayName = getDayName(dateStr);
                var status = 'normal';

                if (weeklyOffDays.indexOf(dayName) !== -1) {
                    weeklyOffCount++;
                    status = 'weekly-off';
                }
                if (holidayDates.indexOf(dateStr) !== -1) {
                    holidayCount++;
                    status = 'public-holiday';
                }

                statusList.push(dateStr + ' - ' + status);
            });

            log.audit('WEEKLY OFF COUNT', weeklyOffCount);
            log.audit('HOLIDAY COUNT', holidayCount);

            // 7. Final leave days logic based on Config
            // If include is false, we subtract it from the total leave
            var finalDays = totalDays;
            if (includeWeekOff === false) {
                finalDays = finalDays - weeklyOffCount;
            }
            if (includeHoliday === false) {
                finalDays = finalDays - holidayCount;
            }
            
            log.audit('FINAL LEAVE DAYS', finalDays);

            // 8. Return
            return JSON.stringify({
                Status: 'Success',
                finaldays: finalDays,
                message: statusList
            });

        } catch (e) {
            log.error('SCRIPT ERROR', e.name + ': ' + e.message);
            return JSON.stringify({ Status: 'Failure', message: e.message });
        }
    }

    // Safe padStart (for old NetSuite versions)
    function padStart(str, targetLength, padString) {
        str = str.toString();
        padString = padString || '0';
        while (str.length < targetLength) {
            str = padString + str;
        }
        return str;
    }

    // Convert dd/mm/yyyy → Date object
    function parseDate(dateStr) {
        var p = dateStr.split('/');
        return new Date(p[2], p[1] - 1, p[0]);
    }

    // Total inclusive days
    function getTotalDays(fromStr, toStr) {
        var from = parseDate(fromStr);
        var to = parseDate(toStr);
        return Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Get all dates in range as ["15/11/2025", "16/11/2025", ...]
    function getAllDatesInRange(fromStr, toStr) {
        var dates = [];
        var current = parseDate(fromStr);
        var end = parseDate(toStr);

        while (current <= end) {
            var dd = padStart(current.getDate(), 2);
            var mm = padStart(current.getMonth() + 1, 2);
            var yyyy = current.getFullYear();
            dates.push(dd + '/' + mm + '/' + yyyy);
            current.setDate(current.getDate() + 1);
        }
        log.debug('DATES IN RANGE', dates);
        return dates;
    }

    // Get day name (Sunday, Monday, etc.)
    function getDayName(dateStr) {
        var date = parseDate(dateStr);
        var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    }

    // Get employee weekly off days
    function getEmployeeWeeklyOffs(empId) {
        var sql = "SELECT BUILTIN.DF(custentity_hris_empweeklyoffs) AS offdays FROM employee WHERE id = " + empId;
        log.debug('SQL WEEKLY OFF', sql);
        var result = query.runSuiteQL({ query: sql }).asMappedResults();
        if (!result || result.length === 0) return [];
        var str = (result[0].offdays || '').trim();
        return str ? str.split(',').map(function(d) { return d.trim(); }) : [];
    }

    // Get public holidays (stored as text dd/mm/yyyy)
    function getPublicHolidays(fromStr, toStr) {
        var sql = "SELECT custrecord_hris_holiday_date " +
                  "FROM customrecord_hris_holiday_master " +
                  "WHERE custrecord_hris_holiday_date >= '" + fromStr + "' " +
                  "AND custrecord_hris_holiday_date <= '" + toStr + "'";
        log.debug('SQL HOLIDAYS', sql);
        var result = query.runSuiteQL({ query: sql }).asMappedResults();
        var dates = [];
        if (result) {
            for (var i = 0; i < result.length; i++) {
                dates.push(result[i].custrecord_hris_holiday_date);
            }
        }
        return dates;
    }

    return { get: get };
});