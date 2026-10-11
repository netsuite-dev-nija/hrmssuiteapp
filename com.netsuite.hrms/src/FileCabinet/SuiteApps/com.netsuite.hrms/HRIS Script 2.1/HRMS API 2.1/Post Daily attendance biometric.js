/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */

define(['N/record', 'N/error', 'N/log', 'N/format','N/query'], function (record, error, log, format,query) {

    function formatTime(timeString) {
        if (!timeString) return null;

        var [time, modifier] = timeString.split(" ");
        var [hours, minutes] = time.split(":");

        // Convert to 24-hour format
        hours = parseInt(hours, 10);
        if (modifier.toLowerCase() === "pm" && hours < 12) {
            hours += 12;
        } else if (modifier.toLowerCase() === "am" && hours === 12) {
            hours = 0;
        }

        // Return formatted time string in HH:mm format
        return ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2); // HH:mm
    }
/**
   * Checks if a bio transaction already exists.
   */
  function isBioTranExists(biotranid,source) {
  /*   var sql =
      "SELECT id FROM customrecord_njt_daily_attendance_bio WHERE \ 
      custrecord_njt_trans_bio_id = '" + biotranid + "' and BUILTIN.DF(custrecord_njt_bio_source) = '" + source +"'";
 */    
var sql = "SELECT id FROM customrecord_njt_daily_attendance_bio " +
          "WHERE custrecord_njt_trans_bio_id = '" + biotranid + "' " +
          "AND BUILTIN.DF(custrecord_njt_bio_source) = '" + source + "'";
      log.debug("isBioTranExistssql", sql);
    var queryResult = query.runSuiteQL({ query: sql });
    var records = queryResult.asMappedResults();
    return records.length > 0;
  }
    function createAttendanceRecords(context) {
        if (!context || context.length === 0) {
            log.error('Invalid context', 'Context is empty or undefined');
            return [{
                Status: false,
                StatusCode: 400,
                Message: 'Invalid context',
                ErrorMessage: 'Context is empty or undefined'
            }];
        }

        log.debug('context', JSON.stringify(context));

        var requests = Array.isArray(context) ? context : [context];
        var customRecordType = 'customrecord_njt_daily_attendance_bio';
       // var apiUrl = 'https://9699878.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=3649&deploy=1';
        var apiUrl ='https://11951030.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=606&deploy=1';
        var apiMethod = 'POST';

        var punchTypeValues = {
            "IN": 1,
            "OUT": 2
        };

        var sourceValues = {
            "Biometric": 1,
            "Mob": 2,
            "Web": 3
        };

        var attendanceMethodValues = {
            "AT": 1,
            "OT": 2
        };

        var results = [];

        try {
            for (var i = 0; i < requests.length; i++) {
                var requestBody = requests[i];
                log.debug('Processing request', JSON.stringify(requestBody));

                var isBTranExists = isBioTranExists(requestBody.mobileUniqId,requestBody.source);
      if (!isBTranExists) {


                var attendanceRecord = record.create({
                    type: customRecordType,
                    isDynamic: true,
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_njt_trans_bio_id',
                    value: requestBody.mobileUniqId
                });
                attendanceRecord.setValue({
                    fieldId: 'custrecord_njt_bio_emp_name',
                    value: requestBody.empName
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_njt_employee_name',
                    value: requestBody.empId
                });

                if (requestBody.punchTime) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_njt_bio_punch_time',
                        value: requestBody.punchTime
                    });
                }
  log.debug('requestBody.bioDate',requestBody.bioDate);
                if (requestBody.bioDate) {
                    var dateParts = requestBody.bioDate.split("-");
                    log.debug('dateParts.length',dateParts.length);
                    //if (dateParts.length === 3) {
                        // var formattedDate = dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0];
                           var formattedDate = requestBody.bioDate;
                          log.debug('formattedDate',formattedDate);
                        attendanceRecord.setValue({
                            fieldId: 'custrecord_njt_bio_date',
                            value: format.parse({
                                value: formattedDate,
                                type: format.Type.DATE
                            })
                        });
                    //}
                }

                if (requestBody.bioTime) {
                    var parsedTime = format.parse({
                        value: formatTime(requestBody.bioTime),
                        type: format.Type.TIMEOFDAY // Parse time to TimeOfDay type
                    });
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_njt_bio_time',
                        value: parsedTime
                    });
                }

                if (requestBody.punchType) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_njt_bio_punch_type',
                        value: punchTypeValues[requestBody.punchType]
                    });
                }

                if (requestBody.source) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_njt_bio_source',
                        value: sourceValues[requestBody.source]
                    });
                }

                if (requestBody.latitude) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_njt_bio_latitude',
                        value: requestBody.latitude
                    });
                }

                if (requestBody.longitude) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_njt_bio_longitude',
                        value: requestBody.longitude
                    });
                }

                if (requestBody.address) {
                    attendanceRecord.setValue({
                        fieldId: 'custrecord_njt_bio_address',
                        value: requestBody.address
                    });
                }

                // Set attendance method
                if (requestBody.attendanceMethod) {
                    var attendanceMethodValue = attendanceMethodValues[requestBody.attendanceMethod];
                    if (attendanceMethodValue) {
                        attendanceRecord.setValue({
                            fieldId: 'custrecord_hris_bio_attendancemethod',
                            value: attendanceMethodValue
                        });
                    }
                }

                if (requestBody.mobileid) {
                    attendanceRecord.setValue({ fieldId: 'custrecord_njt_bio_sno', value: requestBody.mobileid });
                }
                if(requestBody.shift){
                    attendanceRecord.setValue({ fieldId: 'custrecord_njt_bio_shift', value: requestBody.shift });

                }
                if(requestBody.project){
                    attendanceRecord.setValue({ fieldId: 'custrecord_njt_bio_project', value: requestBody.project });

                }
        if(requestBody.site){
                    attendanceRecord.setValue({ fieldId: 'custrecord_njt_bio_projectsite', value: requestBody.site });

                }
         if(requestBody.stage){
                    attendanceRecord.setValue({ fieldId: 'custrecord_hris_daily_attend_project_sta', value: requestBody.stage });

                }


                // Setting additional fields
                attendanceRecord.setValue({
                    fieldId: 'custrecord_njt_bio_response_code',
                    value: 200
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_njt_bio_process_status',
                    value: 2
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_njt_bio_response_status',
                    value: 'Success'
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_njt_bio_response_message',
                    value: 'Record created successfully'
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_njt_bio_api_url',
                    value: apiUrl
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_njt_bio_api_method',
                    value: 'POST'
                });

                attendanceRecord.setValue({
                    fieldId: 'custrecord_njt_bio_json_data',
                    value: JSON.stringify(requestBody)
                });

                var recordId = attendanceRecord.save();
                log.debug('Record created successfully', recordId);

                results.push({
                    Status: true,
                    StatusCode: 200,
                    Message: 'Success',
                    Response: 'Record created successfully',
                    InternalId: recordId,
                    ErrorMessage: null
                });
            }
        } 
        } catch (e) {
            log.error('Error processing requests', e);
            var errorMessage = (e && e.message) ? e.message : 'Unknown error';
            results.push({
                Status: false,
                StatusCode: 400,
                Message: 'Error',
                ErrorMessage: errorMessage
            });
        }

        return results;
    }

    return {
        post: createAttendanceRecords,
    };
});

