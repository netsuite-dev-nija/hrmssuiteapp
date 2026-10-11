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

         var apiUrl ='https://11951030.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=826&deploy=1';
        var apiMethod = 'POST';

     
        try {
            for (var i = 0; i < requests.length; i++) {
                var req = requests[i];
                log.debug('Processing request', JSON.stringify(req));

              //  var punchTypeId = punchTypeValues[req.punchType];
                var timesheetId = null;
                var attendanceRecord;
                var regtype =" ";
               
             timesheetId = getExistingTimesheetId(req.empId, req.regDate);
             
                   if(req.attedanceDetailId) {
                     attendanceRecord = record.load({
                            type: 'customrecord_hris_emp_daily_attend_proje',
                            id: req.attedanceDetailId,
                            isDynamic: true
                        });
                        regtype = "Update";
                   }
                   else {
                       attendanceRecord = record.create({
                        type: 'customrecord_hris_emp_daily_attend_proje',
                        isDynamic: true
                    });
                    regtype = "Add";
                   }
                   
                
               

                // ---------- Common fields ----------
                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_project_emp',
                    value: req.empId
                });

                if (req.regDate) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_attend_date',
                        value: format.parse({
                            value: req.regDate,
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
            
               if(req.regin && req.regout){
                var workingHours = calculateWorkingHours(req.regin, req.regout);
                  attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_project_details_regin',
                        value: req.regin
                    });
                     attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_project_details_regout',
                        value: req.regout
                    });
                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_pro_reghrs',
                    value: workingHours
                });

               } 
              

             /*    if (req.source) {
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
                } */

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
               if(req.remark){

                    attendanceRecord.setValue({
                        fieldId: 'custrecord_hris_emp_daily_pro_remarks',
                        value: req.remark
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
                    fieldId: 'custrecord_hris_emp_daily_regapi_url',
                    value: apiUrl
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_api_method',
                    value: 'POST'
                });
             
attendanceRecord.setValue({
                    fieldId: 'custrecord_hris_emp_daily_regjson',
                    value: JSON.stringify(req)
                });
            
               
                var recordId = attendanceRecord.save();
                log.audit('Attendance Detail saved', 'ID: ' + recordId);

                results.push({
                    Status: true,
                    Action: regtype,
                    StatusCode: 200,
                    Message: 'Success',
                    Attendanceid: timesheetId || req.attendanceId || null,
                    Attendancedetailid: recordId,
                    //InternalId: recordId,
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