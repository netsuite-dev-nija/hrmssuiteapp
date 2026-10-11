/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(["N/record", "N/search", "N/log", "N/format", "N/query", "N/runtime","./moment.js"], function (
    record,
    search,
    log,
    format,
    query,
    runtime,
    moment
) {



    function getInputData() {
        try {

            // Construct SuiteQL query with multiple employee IDs
            var biolistarray = [];
            var today = new Date();
            //var today ='05/10/2025'
            var yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            log.debug("Today", today);
            //log.debug("Yesterday", yesterday);

            /*     var parts = today.split('/');
    var day = parseInt(parts[0]);
    var month = parseInt(parts[1]) - 1; // months are 0-indexed
    var year = parseInt(parts[2]);
    
    var dateObj = new Date(year, month, day);
    
    // Step 2: Subtract one day
    dateObj.setDate(dateObj.getDate() - 1);
    
    // Step 3: Format back to DD/MM/YYYY
    var  yesterday =
      ('0' + dateObj.getDate()).slice(-2) + '/' +
      ('0' + (dateObj.getMonth() + 1)).slice(-2) + '/' +
      dateObj.getFullYear(); */

            log.debug('Previous Day', yesterday);

            /*   var scriptParams = runtime.getCurrentScript().getParameter({ name: 'custscript_hris_bioemplist' });
            log.debug({ title: 'Script Parameters', details: scriptParams });
        
            var params;
            try {
              params = JSON.parse(scriptParams);
            } catch (e) {
              log.error({ title: 'Parameter Parse Error', details: 'Failed to parse custscript_hris_bioemplist: ' + e.toString() });
              return [];
            }
        
            if (!Array.isArray(params) || params.length === 0) {
              log.error({ title: 'Invalid Parameters', details: 'custscript_hris_bioemplist is empty or not an array' });
              return [];
            } */

            // Extract parameters
            // var param = params[0]; // Assuming single object as per provided format
            //  var biodate = param.biodate
            /*  var fromdate = param.fromdate;
             var todate = param.todate;
             var subsidiary = param.subsidiary
          */
            // Parse employee IDs from string like "(94801,94806)"

            var options = {
                type: "customrecord_hris_empdailyatten_sync",
                id: 1,
                isDynamic: true
            };
            var rec = record.load(options);

            var configlastSyncDate = rec.getValue({ fieldId: 'custrecord_hris_atten_sync_dt' });
            var configlastSyncTime = rec.getValue({ fieldId: 'custrecord_hris_atten_sync_time' });
            var configerrorSyncDate = rec.getValue({ fieldId: 'custrecord_hris_atten_errorsync_dt' });

            log.debug('Raw lastSyncDate', configlastSyncDate);
            log.debug('Formatted lastSyncDate', format.format({ value: configlastSyncDate, type: format.Type.DATE, timezone: format.Timezone.ASIA_MUSCAT }));

            var lastSyncDate = format.format({ value: configlastSyncDate, type: format.Type.DATE, timezone: format.Timezone.ASIA_MUSCAT });
            var lastSyncTime = format.format({ value: configlastSyncTime, type: format.Type.DATETIME, timezone: format.Timezone.ASIA_MUSCAT });
            log.debug({
                title: 'lastSyncDate',
                details: lastSyncDate
            });
            log.debug({
                title: 'lastSyncTime',
                details: lastSyncTime
            });
            var startDateAndTime = formatBioDate(lastSyncDate) + ' ' + formatBioTime(lastSyncTime);

            log.debug({
                title: 'startDateAndTime',
                details: startDateAndTime
            });
            /* var dt = new Date();
            dt = '03/10/2025'
            var currentDate = dt; */
            // var formatyesterday = format.format({ value: yesterday, type: format.Type.DATE, timezone: format.Timezone.ASIA_MUSCAT });
             var formatyesterday = moment(yesterday).utc().format("DD/MM/YYYY");
            log.emergency('formatyesterday', formatyesterday)
            var dt = today;
            // dt = '03/10/2025'
            var currentDate = formatyesterday;
            // log.debug('Raw dt', dt.toISOString());
            /*   var currentDate = format.format({ value: dt, type: format.Type.DATE, timezone: format.Timezone.ASIA_MUSCAT });
              log.debug('Computed currentDate', currentDate);
              var manualDate = new Date(dt.getTime() + (dt.getTimezoneOffset() * 60000) + (4 * 60 * 60000)).toISOString().split('T')[0].split('-');
              var manualCurrentDate = manualDate[2] + '/' + manualDate[1] + '/' + manualDate[0];
             */ /*  if (currentDate != lastSyncDate) {
                 // log.debug('Using manual currentDate', manualCurrentDate);
                 currentDate = lastSyncDate;
             } */
            // var subsidiary = 13
            var customrecord_njt_daily_attendance_bioSearchObj = search.create({
                type: "customrecord_njt_daily_attendance_bio",
                filters:
                    [

                        ["custrecord_njt_bio_date", "within", currentDate, currentDate],
                        /*    "AND",
                           ["custrecord_njt_employee_name.subsidiary", "anyof", subsidiary] */


                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_njt_bio_date",
                            summary: "GROUP",
                            label: "Bio Date"
                        }),
                        search.createColumn({
                            name: "custrecord_njt_employee_name",
                            summary: "GROUP",
                            label: "Employee Name"
                        }),
                        search.createColumn({
                            name: "custrecord_njt_bio_time",
                            summary: "MIN",
                            label: "Clock IN"
                        }),
                        search.createColumn({
                            name: "custrecord_njt_bio_time",
                            summary: "MAX",
                            label: "Clock OUT"
                        }),
                        /* search.createColumn({
                            name: "formulatext",
                            summary: "MAX",
                            formula: "TO_CHAR(FLOOR((MAX({custrecord_njt_bio_time}) - MIN({custrecord_njt_bio_time})) * 24), 'FM00') || ':' || TO_CHAR(ROUND(60 * ((MAX({custrecord_njt_bio_time}) - MIN({custrecord_njt_bio_time})) * 24 - FLOOR((MAX({custrecord_njt_bio_time}) - MIN({custrecord_njt_bio_time})) * 24))), 'FM00')",
                            label: "Total Hours"
                        }) */
                        search.createColumn({
                            name: "formulatext",
                            summary: "MAX",
                            formula: "TO_CHAR(FLOOR(((MAX({custrecord_njt_bio_time}) - TRUNC(MAX({custrecord_njt_bio_time}))) -(MIN({custrecord_njt_bio_time}) - TRUNC(MIN({custrecord_njt_bio_time})))) * 24))  || '.' ||  TO_CHAR(FLOOR(MOD((((MAX({custrecord_njt_bio_time}) - TRUNC(MAX({custrecord_njt_bio_time}))) - (MIN({custrecord_njt_bio_time}) - TRUNC(MIN({custrecord_njt_bio_time})))) * 1440), 60)), 'FM00')",
                            label: "Total Hours"
                        })
                    ]
            });

            var searchResultCount = customrecord_njt_daily_attendance_bioSearchObj.runPaged().count;
            log.debug("customrecord_njt_daily_attendance_bioSearchObj result count", searchResultCount);




            customrecord_njt_daily_attendance_bioSearchObj.run().each(function (result) {
                var bioDate = result.getValue({
                    name: "custrecord_njt_bio_date",
                    summary: "GROUP"
                });

                var employeeName = result.getValue({
                    name: "custrecord_njt_employee_name",
                    summary: "GROUP"
                });

                var clockIn = result.getValue({
                    name: "custrecord_njt_bio_time",
                    summary: "MIN"
                });

                var clockOut = result.getValue({
                    name: "custrecord_njt_bio_time",
                    summary: "MAX"
                });

                var totalHours = result.getValue({
                    name: "formulatext",
                    summary: "MAX"
                });

                log.debug("Result", {
                    bioDate: bioDate,
                    employeeName: employeeName,
                    clockIn: clockIn,
                    clockOut: clockOut,
                    totalHours: totalHours
                });
                biolistarray.push({
                    'bioDate': bioDate,
                    'employeeName': employeeName,
                    'clockIn': clockIn,
                    'clockOut': clockOut,
                    'totalHours': totalHours,
                    'dt': dt

                })

                return true; // continue to next result
            });

            return biolistarray;


        } catch (e) {
            log.error({ title: 'GetInputdata', details: e.toString() });
            return [];
        }
    }
    /**
     * Maps each employee record for attendance creation.
     * @param {Object} context - The context object containing the SuiteQL result.
     */
    function map(context) {
        try {
            var result = JSON.parse(context.value);

            var bioDate = result.bioDate;
            var employeeName = result.employeeName || '';
            var clockIn = result.clockIn;
            var clockOut = result.clockOut;
            var totalHours = result.totalHours;
            var dt = result.dt;

            log.emergency("Processing Employee", {
                bioDate: bioDate,
                employeeName: employeeName,
                clockIn: clockIn,
                clockOut: clockOut,
                totalHours: totalHours
            });



            // Check for existing record
            if (employeeName != '') {
                var existingRecordId = findExistingRecord(employeeName, bioDate, clockIn, clockOut, totalHours);
            }

            /*   if (!existingRecordId) {
                  log.debug(
                      "Record Not Exists",
                     
                  );
                  return;
              } */

            // Update lastSyncDate before potential failures
            //var dt = bioDate;
            var newLastSyncTime = format.format({ value: dt, type: format.Type.DATETIME, timezone: format.Timezone.ASIA_MUSCAT });
            log.emergency('newLastSyncTime', newLastSyncTime);
            var newLastSyncDate = newLastSyncTime.split(' ')[0]; // Extract date part (e.g., "23/8/2025")
            log.emergency('Updating lastSyncDate', newLastSyncDate);
            setLastSalesSyncDate(newLastSyncDate, dt, format);


            // setLastSalesSyncDate(dt, dt,format);

        } catch (e) {
            //log.error({ title: 'Map Error', details: e.toString() });
            //return [];
            log.error('ERROR in Map', JSON.stringify(e));

            // Ensure lastSyncDate is updated even if an exception occurs
            var newLastSyncTime = format.format({ value: dt, type: format.Type.DATETIME, timezone: format.Timezone.ASIA_MUSCAT });
            log.emergency('newLastSyncTime', newLastSyncTime);
            // var newLastSyncDate = newLastSyncTime.split(' ')[0];
            var newLastSyncDate = format.parse({
                value: format.format({
                    value: dt,
                    type: format.Type.DATE,
                    timezone: format.Timezone.ASIA_MUSCAT
                }),
                type: format.Type.DATE
            });
            log.debug('Updating lastSyncDate after exception', newLastSyncDate);
            setLastSalesSyncDateerror(newLastSyncDate, dt, format);
            //setLastSalesSyncDateerror(dt, dt,format);
        }

    }


    function findExistingRecord(employeeId, startdate, clockIn, clockOut, totalHours) {
        //log.debug('Inside');

        var dailychildquery = "select * from customrecord_njt_emp_daily_atten_ch where custrecord_njt_daily_atten_emp = " + employeeId + " \
                          and custrecord_hris_emp_daily_nightshift ='F' and  custrecord_hris_emp_daily_prevnightshift ='F' \
                         and custrecord_njt_emp_daily_date ='" + startdate + "' and isinactive='F'";

        log.debug("dailychildquery", dailychildquery);
        var queryResults = query.runSuiteQL({
            query: dailychildquery
        });

        var dailychildqueryrecords = queryResults.asMappedResults();
        var actualworkinghrs = 0;
        var actualworkinghrsdecimal = 0;
        var totalWorkingHours = 0;
        if (dailychildqueryrecords.length > 0) {
            var dailychildid = dailychildqueryrecords[0].id;
            var lunchtime = dailychildqueryrecords[0].custrecord_njt_emp_daily_lunch_time || '0';
            var dailyattentype = dailychildqueryrecords[0].custrecord_njt_emp_daily_intatt;
            /*  if ((totalHours != '00:00'||totalHours!='0:00') && dailyattentype == 23) {
                 var internalAttendanceType = 18;
 
             }
             else if (dailyattentype == 23 && (totalHours == '00:00'||totalHours=='0:00')) {
                 var internalAttendanceType = 23;
 
             } */
            // Accoding to mam told 08/10/2025
            /*  if ((totalHours != '00:00') && dailyattentype == 23) {
                var internalAttendanceType = 18;

            }
            else if (dailyattentype == 23 && (totalHours == '00:00')) {
                var internalAttendanceType = 23;

            }
            else{
                 var internalAttendanceType =dailyattentype;
            } */
            if (((clockIn) || (clockOut)) && dailyattentype == 23) {
                var internalAttendanceType = 18;

            }

            else {
                var internalAttendanceType = dailyattentype;
            }
            if ((totalHours != '00:00' || totalHours != '0:00')) {
                actualworkinghrs = subtractTimeDecimal(totalHours, lunchtime)
            }

            // actualworkinghrsdecimal = getTimeDiffDecimal(clockIn,clockOut);
            actualworkinghrsdecimal = getDecimalDifference(clockIn, clockOut);
            log.emergency('actualworkinghrsdecimal', actualworkinghrsdecimal)

            if (actualworkinghrsdecimal != 0) {
                totalWorkingHours = actualworkinghrsdecimal.toFixed(2);
                actualworkinghrsdecimal = parseFloat(actualworkinghrsdecimal) - parseFloat(lunchtime);
            }
           /*  var updatedchildid = record.submitFields({
                type: 'customrecord_njt_emp_daily_atten_ch',
                id: dailychildid,
                values: {
                    'custrecord_njt_emp_daily_in_time': clockIn,
                    'custrecord_njt_emp_daily_out_time': clockOut,
                    'custrecord_njt_emp_daily_totalhours': totalHours,
                    'custrecord_njt_emp_daily_totalworkinghrs': totalWorkingHours,
                    'custrecord_hris_actual_woking_hours_dura': totalHours,
                    'custrecord_hris_actual_woking_hours': actualworkinghrsdecimal.toFixed(2),
                    'custrecord_njt_emp_daily_intatt': internalAttendanceType
                }
            }); */

            // Changed as per vanitha mam told 15/12/2025 three field should be updated as same format

             var updatedchildid = record.submitFields({
                type: 'customrecord_njt_emp_daily_atten_ch',
                id: dailychildid,
                values: {
                    'custrecord_njt_emp_daily_in_time': clockIn,
                    'custrecord_njt_emp_daily_out_time': clockOut,
                    'custrecord_njt_emp_daily_totalhours':totalWorkingHours,
                    'custrecord_njt_emp_daily_totalworkinghrs': actualworkinghrsdecimal.toFixed(2),
                    'custrecord_hris_actual_woking_hours_dura': totalHours,
                    'custrecord_hris_actual_woking_hours': actualworkinghrsdecimal.toFixed(2),
                    'custrecord_njt_emp_daily_intatt': internalAttendanceType
                }
            });

            log.debug('updated Child Id', updatedchildid);
            return updatedchildid

        }
        else {

            return null;
        }





    }


    function setConfigValue(fieldId, value) {
        var options = {
            type: "customrecord_hris_empdailyatten_sync",
            id: 1,
            isDynamic: true
        };
        try {
            var rec = record.load(options);
            rec.setValue({ fieldId: fieldId, value: value });
            var saveResult = rec.save();
            log.debug('Config value updated', { fieldId: fieldId, value: value, saveResult: saveResult });
        } catch (e) {
            log.error('Error saving config value', JSON.stringify(e));
        }
    }

    function setLastSalesSyncDateold(pdate, ptime, format) {
        log.emergency('pdate', pdate)
        /*  var formattedDate = format.parse({
             value: pdate,
             type: format.Type.DATE,
             timezone: format.Timezone.ASIA_MUSCAT
         });
         var formattedTime = ptime;  */// Use raw Date object for time
        var formattedDate = format.parse({
            value: format.format({
                value: ptime,
                type: format.Type.DATE,
                timezone: format.Timezone.ASIA_MUSCAT
            }),
            type: format.Type.DATE
        });
        var formattedTime = format.format({
            value: ptime,
            type: format.Type.DATETIME
        });

        log.audit('setLastSalesSyncDate Input', { date: formattedDate, time: formattedTime });
        setConfigValue("custrecord_hris_atten_sync_dt", formattedDate);
        setConfigValue("custrecord_hris_atten_sync_time", formattedTime);
    }
    function setLastSalesSyncDateerrorold(pdate, ptime, format) {
        /*  var formattedDate = format.parse({
             value: pdate,
             type: format.Type.DATE,
             timezone: format.Timezone.ASIA_MUSCAT
         }); */
        var formattedDate = format.parse({
            value: format.format({
                value: ptime,
                type: format.Type.DATE,
                timezone: format.Timezone.ASIA_MUSCAT
            }),
            type: format.Type.DATE
        });
        // var formattedTime = ptime; // Use raw Date object for time
        var formattedTime = format.format({
            value: ptime,
            type: format.Type.DATETIME
        });
        log.audit('setLastSalesSyncDate Input', { date: formattedDate, time: formattedTime });
        setConfigValue("custrecord_hris_atten_sync_dt", formattedDate);
        setConfigValue("custrecord_hris_atten_sync_time", formattedTime);
        setConfigValue("custrecord_hris_atten_errorsync_dt", formattedDate);

    }

    function setLastSalesSyncDate(pdate, ptime, format) {
        log.emergency('ptime',ptime)
      
         var dt = new Date(ptime);

        // Step 2: Format for DateTime field (convert properly to timezone)
        var formattedDateTime = format.format({
            value: dt,
            type: format.Type.DATETIME,
            timezone: format.Timezone.ASIA_MUSCAT // change to your timezone if needed
        });

        // Step 3: Format for Date field (date only)
        var formattedDate = format.format({
            value: dt,
            type: format.Type.DATE,
            timezone: format.Timezone.ASIA_MUSCAT
        });

        // Step 4: Parse back into correct NetSuite types
        var nsDateTime = format.parse({
            value: formattedDateTime,
            type: format.Type.DATETIME
        });

        var nsDate = format.parse({
            value: formattedDate,
            type: format.Type.DATE
        });


        log.audit('setLastSalesSyncDate Input', { date: nsDate, time: nsDateTime });
        setConfigValue("custrecord_hris_atten_sync_dt", nsDate);
        setConfigValue("custrecord_hris_atten_sync_time", nsDateTime);
    }
    function setLastSalesSyncDateerror(pdate, ptime, format) {
      log.emergency('ptime',ptime)
      
         var dt = new Date(ptime);

        // Step 2: Format for DateTime field (convert properly to timezone)
        var formattedDateTime = format.format({
            value: dt,
            type: format.Type.DATETIME,
            timezone: format.Timezone.ASIA_MUSCAT // change to your timezone if needed
        });

        // Step 3: Format for Date field (date only)
        var formattedDate = format.format({
            value: dt,
            type: format.Type.DATE,
            timezone: format.Timezone.ASIA_MUSCAT
        });

        // Step 4: Parse back into correct NetSuite types
        var nsDateTime = format.parse({
            value: formattedDateTime,
            type: format.Type.DATETIME
        });

        var nsDate = format.parse({
            value: formattedDate,
            type: format.Type.DATE
        });


        log.audit('setLastSalesSyncDate Input', { date: nsDate, time: nsDateTime });
        setConfigValue("custrecord_hris_atten_sync_dt", nsDate);
        setConfigValue("custrecord_hris_atten_sync_time", nsDateTime);

    }
    function formatNSDate(dt) {
        var dt1 = dt.split(" ")[0];
        var dd = dt1.split("-")[2];
        var mm = dt1.split("-")[1];
        var yy = dt1.split("-")[0];
        log.debug("formatNSDate", { "dt": dt1, "dd": dd, "mm": mm, "yy": yy });
        return dd + '/' + mm + '/' + yy;
    }

    function formatNSTime(dt) {
        var dt1 = dt.split(" ")[1];
        log.debug("formatNSTime", { "dt": dt1 });
        return dt1;
    }

    function formatBioTime(tm) {
        var sTime = tm.split(" ")[1];
        var t = sTime.split(":");
        var hh = t[0];
        var mm = t[1];
        var ss = t[2];
        var ampm = tm.split(" ")[2];
        if (ampm == 'pm') {
            hh = 12 + parseInt(hh);
        }
        log.debug("formatBioTime", { "hh": hh, "mm": mm, "ss": ss });
        return hh + ':' + mm + ':' + ss;
    }

    function formatBioDate(dt) {
        var formattedDateString = format.format({
            value: dt,
            type: format.Type.DATETIME,
            timezone: format.Timezone.ASIA_MUSCAT
        });
        var dt1 = formattedDateString.split(" ")[0];
        var parsedDateStringAsRawDateObject = format.parse({
            value: dt1,
            type: format.Type.DATE,
        });
        var dd = parsedDateStringAsRawDateObject.getUTCDate();
        var mm = parsedDateStringAsRawDateObject.getUTCMonth() + 1; // January is 0!
        var yyyy = parsedDateStringAsRawDateObject.getUTCFullYear();
        if (dd < 10) {
            dd = '0' + dd;
        }
        if (mm < 10) {
            mm = '0' + mm;
        }
        log.debug("formatBioDate", { "dt": dt, "dd": dd, "mm": mm, "yyyy": yyyy });
        return yyyy + '-' + mm + '-' + dd;
    }

    function subtractTimeDecimal(baseTime, timeToSubtract) {
        log.debug('baseTime', baseTime);
        log.debug('timeToSubtract', timeToSubtract)
        // Convert "HH:mm" to total minutes
        var parts = baseTime.split(".");
        var totalMinutes = (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);

        // ParseFloat value (e.g., "1.30" = 1.3 hours = 78 mins)
        var subtractMinutes = Math.round(parseFloat(timeToSubtract) * 60);

        var resultMinutes = totalMinutes - subtractMinutes;

        // Normalize to positive minutes within 24h
        resultMinutes = ((resultMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);

        var hours = Math.floor(resultMinutes / 60);
        var minutes = resultMinutes % 60;
        log.debug('Hours', hours);
        log.debug('minutes', minutes);

        return String(hours).padStart(2, "0") + "." + String(minutes).padStart(2, "0");
    }

    // Example


    function getTimeDiffDecimal(start, end) {
        var startParts = start.split(':');
        var endParts = end.split(':');

        var startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
        var endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);

        var diffMinutes = endMinutes - startMinutes;
        return (diffMinutes / 60).toFixed(2); // decimal hours
    }
    function getDecimalDifference(startTime, endTime) {
        // startTime and endTime in format "hh:mm am/pm"
        function parseTime(t) {
            var parts = t.match(/(\d+):(\d+)\s*(am|pm)/i);
            var hours = parseInt(parts[1], 10);
            var minutes = parseInt(parts[2], 10);
            var ampm = parts[3].toLowerCase();

            if (ampm === "pm" && hours !== 12) hours += 12;
            if (ampm === "am" && hours === 12) hours = 0;

            return (hours * 60) + minutes; // total minutes since midnight
        }

        var startMinutes = parseTime(startTime);
        var endMinutes = parseTime(endTime);

        var diffMinutes = endMinutes - startMinutes;
        var diffDecimal = diffMinutes / 60; // convert to decimal hours

        return diffDecimal;
    }
    function getResult(pSQL) {
        var queryResults = query.runSuiteQL({ query: pSQL });
        return queryResults.asMappedResults();
    }

    /**
     * The reduce stage is not used in this script.
     * @param {Object} context - The context object for the reduce stage.
     */
    function reduce(context) {
        // Not needed for this script
    }

    /**
     * Handles post-process logic.
     * @param {Object} summary - The summary object for the script execution.
     */
    function summarize(summary) {
        // Handle any post-process logic here
    }
    function getyearid(yearname) {
        var yearid = '';
        var yearsql =
            "SELECT id FROM customlist_hris_year_master WHERE name = '" + yearname + "'";
        log.debug("yearsql", yearsql);

        var queryResult = query.runSuiteQL({
            query: yearsql,
        });
        var results = queryResult.asMappedResults();

        if (results.length > 0) {
            yearid = results[0].id;

        }

        return yearid;
    }
    function getyearname(yearid) {
        var yearname = '';
        var yearsql =
            "SELECT name FROM customlist_hris_year_master WHERE id = " + yearid + "";
        log.debug("yearsql", yearsql);

        var queryResult = query.runSuiteQL({
            query: yearsql,
        });
        var results = queryResult.asMappedResults();

        if (results.length > 0) {
            yearname = results[0].name;

        }

        return yearname;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize,
    };
});