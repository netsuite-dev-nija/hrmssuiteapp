/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/format', 'N/log', './moment.js'], function (record, search, format, log, moment) {
    var MOMENT = moment;
    /* function afterSubmit(context) {
        try {
            var newRecord = context.newRecord;
            var attenRegID = newRecord.id;
            log.debug("attenRegID", attenRegID);
            var actualworkinghrs = 0;
            // Assuming this script is for customrecord_njt_emp_daily_atten_ch
            if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
                var regularDateValue = newRecord.getValue('custrecord_hr_attend_regular_date');
                log.debug("regularDateValue", regularDateValue);

                if (!regularDateValue) {
                    log.error("Missing Date", "The custrecord_hr_attend_regular_date field is empty or not found.");
                    return;
                }

                var regularDate = format.format({
                    value: new Date(regularDateValue),
                    type: format.Type.DATE
                });
                log.debug("formatted regularDate", regularDate);

                var regularEmployee = newRecord.getValue('custrecord_hr_attend_reg_employee');
                var regularIn = newRecord.getValue('custrecord_hr_attend_regular_reg_in');
                var regularOut = newRecord.getValue('custrecord_hr_attend_regular_reg_out');
                var id = newRecord.getValue('custrecord_hr_attend_reg_daily_id');
                var approvalSts = newRecord.getValue('custrecord_hr_attend_reg_approve_status');

                var regularstartdate = newRecord.getValue('custrecord_hr_attend_regularstartdate') || '';
                var regularenddate = newRecord.getValue('custrecord_hr_attend_regularenddate') || '';
                var dailycheck=newRecord.getValue('custrecord_hr_attend_dailyupdated')||false;
                log.debug("regularEmployee", regularEmployee);
                log.debug("regularIn", regularIn);
                log.debug("regularOut", regularOut);
                log.debug("approvalSts", approvalSts);

                if (!regularEmployee || !regularIn || !regularOut || !regularstartdate||!regularenddate) {
                    log.error("Missing Values", "One or more required values (employee, in time, out time) are missing.");
                    return;
                }

                // Load the customrecord_njt_emp_daily_atten_ch record
                if (id && approvalSts == 2 && dailycheck==false) {
                    var attendanceRecord = record.load({
                        type: 'customrecord_njt_emp_daily_atten_ch',
                        id: id
                    });

                    var existingInTime = attendanceRecord.getValue('custrecord_njt_emp_daily_in_time');
                    var existingOutTime = attendanceRecord.getValue('custrecord_njt_emp_daily_out_time');
                    var lunchtime = attendanceRecord.getValue('custrecord_njt_emp_daily_lunch_time') || 0;
                    var interattentype = attendanceRecord.getValue('custrecord_njt_emp_daily_intatt');
                    log.debug("existingInTime", existingInTime);
                    log.debug("existingOutTime", existingOutTime);

                   
                     if (regularstartdate != '') {
                        var formatregularworkstartdate = format.format({
                            value:new Date(regularstartdate),
                            type: format.Type.DATE
                        });
                    }
                    if (regularenddate != '') {
                        var formatregularworkenddate = format.format({
                            value: new Date(regularenddate),
                            type: format.Type.DATE
                        });
                    }

                    log.emergency('formatregularstartdate',formatregularstartdate);
                     log.emergency('formatregularenddate',formatregularenddate);
                    var totalWorkingHours= calculateHoursDiffdecimal(formatregularworkstartdate,regularIn,formatregularworkenddate,regularOut)
                    log.debug("totalWorkingHours", totalWorkingHours);
                   // actualworkinghrs = subtractTimeDecimal(totalWorkingHours, lunchtime)
                   totalWorkingHours=totalWorkingHours.toFixed(2);
             //       actualworkinghrs=parseFloat(totalWorkingHours)-parseFloat(lunchtime); 
                   actualworkinghrs=parseFloat(totalWorkingHours);
                   log.debug('actualworkinghrs',actualworkinghrs);
                    
                    attendanceRecord.setValue('custrecord_njt_emp_daily_reg_in', regularIn);
                    attendanceRecord.setValue('custrecord_njt_emp_daily_reg_out', regularOut);
                    attendanceRecord.setValue('custrecord_njt_emp_daily_regularizahrs', totalWorkingHours)
                    attendanceRecord.setValue('custrecord_hris_actual_woking_hours', actualworkinghrs);
                    attendanceRecord.setValue('custrecord_njt_emp_daily_attenreglink', attenRegID);
                    if (interattentype == 23) {
                        attendanceRecord.setValue('custrecord_njt_emp_daily_intatt', 18);
                    }
                     if (regularstartdate != '') {
                        var formatregularstartdate = format.parse({
                            value: regularstartdate,
                            type: format.Type.DATE
                        }); 
                        attendanceRecord.setValue('custrecord_njt_emp_daily_reg_startdate', formatregularstartdate);

                    }
                     if (regularenddate != '') {
                        var formatregularenddate = format.parse({
                            value: regularenddate,
                            type: format.Type.DATE
                        }); 
                        attendanceRecord.setValue('custrecord_njt_emp_daily_reg_enddate', formatregularenddate);
                 }

                    var attenChildId = attendanceRecord.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });
                    log.debug('attenChildId', attenChildId);

                     record.submitFields({
                        type: 'customrecord_hr_attend_regularization',
                        id: attenRegID,
                        values: {
                            'custrecord_hr_attend_dailyupdated':true,
                          
                        }
                    }); 

                }





            }
        } catch (e) {
            log.error({
                title: 'Error in afterSubmit function',
                details: e.toString()
            });
        }
    } */
//below working script production
/*  function afterSubmit(context) {
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;

        try {
            var newRecord = context.newRecord;
            var attenRegID = newRecord.id;
            
            var approvalSts = newRecord.getValue('custrecord_hr_attend_reg_approve_status');
            var dailyUpdated = newRecord.getValue('custrecord_hr_attend_dailyupdated');
            var mainAttendanceId = newRecord.getValue('custrecord_hr_attend_reg_daily_id');

            // Only process if Approved (2), not already updated, and linked to a Daily Attendance record
            if (approvalSts == 2 && dailyUpdated == false && mainAttendanceId) {
                
                var employee = newRecord.getValue('custrecord_hr_attend_reg_employee');
                var regIn = newRecord.getValue('custrecord_hr_attend_regular_reg_in');
                var regOut = newRecord.getValue('custrecord_hr_attend_regular_reg_out');
                var projectHeader = newRecord.getValue('custrecord_hris_attendance_reg_project');
                var regDateValue = newRecord.getValue('custrecord_hr_attend_regular_date');

                log.debug("Regularization Triggered", "ID: " + attenRegID + " for Daily Attendance: " + mainAttendanceId);

                // 1. UPSERT the individual Project Detail record
                var existingProjId = null;
                var projFilters = [
                    ['custrecord_hris_daily_timesheet_link', 'anyof', mainAttendanceId]
                ];
                if (projectHeader) {
                    projFilters.push('AND');
                    projFilters.push(['custrecord_hris_daily_emp_project_detail', 'anyof', projectHeader]);
                }

                search.create({
                    type: 'customrecord_hris_emp_daily_attend_proje',
                    filters: projFilters
                }).run().each(function(res) {
                    existingProjId = res.id;
                    return false; 
                });

                var projRec = existingProjId ? 
                    record.load({ type: 'customrecord_hris_emp_daily_attend_proje', id: existingProjId }) : 
                    record.create({ type: 'customrecord_hris_emp_daily_attend_proje' });

                projRec.setValue('custrecord_hris_emp_daily_project_emp', employee);
                projRec.setValue('custrecord_hris_emp_daily_attend_date', new Date(regDateValue));
                projRec.setValue('custrecord_hris_daily_emp_project_detail', projectHeader);
                projRec.setValue('custrecord_hris_project_details_regin', regIn);
                projRec.setValue('custrecord_hris_project_details_regout', regOut);
                projRec.setValue('custrecord_hris_daily_timesheet_link', mainAttendanceId);
                
                var savedProjId = projRec.save();

                // Set project record ID to the custom field
                record.submitFields({
                    type: 'customrecord_hris_emp_daily_attend_proje',
                    id: savedProjId,
                    values: { 'custrecord_hris_project_details_id': savedProjId }
                });

                // 2. AGGREGATE: Search ALL projects to find MIN/MAX using override logic
                var projectSearch = search.create({
                    type: 'customrecord_hris_emp_daily_attend_proje',
                    filters: [['custrecord_hris_daily_timesheet_link', 'anyof', mainAttendanceId]],
                    columns: [
                        'custrecord_hris_emp_daily_attend_date',
                        'custrecord_hris_emp_daily_atte_pro_intim', // Original In
                        'custrecord_hris_emp_daily_pro_outime',    // Original Out
                        'custrecord_hris_project_details_regin',    // Reg In
                        'custrecord_hris_project_details_regout'    // Reg Out
                    ]
                });

                var globalEarliestInDateObj = null;
                var globalLatestOutDateObj = null;
                var earliestInStr = "";
                var latestOutStr = "";

                projectSearch.run().each(function(result) {
                    var attDate = result.getValue('custrecord_hris_emp_daily_attend_date');
                    
                    // LOGIC: If Regularized value exists, it overrides Original value
                    var finalInTime = result.getValue('custrecord_hris_project_details_regin') || result.getValue('custrecord_hris_emp_daily_atte_pro_intim');
                    var finalOutTime = result.getValue('custrecord_hris_project_details_regout') || result.getValue('custrecord_hris_emp_daily_pro_outime');

                    if (finalInTime) {
                        var currentInObj = parseDateTime(attDate, finalInTime);
                        if (!globalEarliestInDateObj || currentInObj < globalEarliestInDateObj) {
                            globalEarliestInDateObj = currentInObj;
                            earliestInStr = finalInTime;
                        }
                    }

                    if (finalOutTime) {
                        var currentOutObj = parseDateTime(attDate, finalOutTime);
                        // Handle overnight crossover
                        if (globalEarliestInDateObj && currentOutObj <= globalEarliestInDateObj) {
                            currentOutObj.setDate(currentOutObj.getDate() + 1);
                        }
                        if (!globalLatestOutDateObj || currentOutObj > globalLatestOutDateObj) {
                            globalLatestOutDateObj = currentOutObj;
                            latestOutStr = finalOutTime;
                        }
                    }
                    return true;
                });

                // 3. CALCULATE Hours
                var totalDecimalHrs = 0;
                var timeFormattedHrs = "00:00";
                var decimalFormattedHrs = "0.00";

                if (globalEarliestInDateObj && globalLatestOutDateObj) {
                    var diffMs = globalLatestOutDateObj - globalEarliestInDateObj;
                    totalDecimalHrs = diffMs / (1000 * 60 * 60);
                    if (totalDecimalHrs < 0) totalDecimalHrs = 0;
                    
                    timeFormattedHrs = decimalToHHMM(totalDecimalHrs);
                    decimalFormattedHrs = totalDecimalHrs.toFixed(2);
                }

                // 4. LOOKUP Internal Attendance status
                var fieldLookUp = search.lookupFields({
                    type: 'customrecord_njt_emp_daily_atten_ch',
                    id: mainAttendanceId,
                    columns: ['custrecord_njt_emp_daily_intatt']
                });
                
                var currentIntAtt = 0;
                if(fieldLookUp.custrecord_njt_emp_daily_intatt && fieldLookUp.custrecord_njt_emp_daily_intatt.length > 0){
                    currentIntAtt = fieldLookUp.custrecord_njt_emp_daily_intatt[0].value;
                }

                // 5. UPDATE Main Record
                var updateValues = {
                    'custrecord_njt_emp_daily_reg_in': earliestInStr,
                    'custrecord_njt_emp_daily_reg_out': latestOutStr,
                    'custrecord_njt_emp_daily_regularizahrs': timeFormattedHrs,
                    'custrecord_hris_actual_woking_hours': decimalFormattedHrs,
                    'custrecord_njt_emp_daily_totalhours': timeFormattedHrs,
                    'custrecord_njt_emp_daily_totalworkinghrs': timeFormattedHrs,
                    'custrecord_njt_emp_daily_attenreglink': attenRegID
                };

                if (currentIntAtt == 23) {
                    updateValues['custrecord_njt_emp_daily_intatt'] = 18;
                }

                record.submitFields({
                    type: 'customrecord_njt_emp_daily_atten_ch',
                    id: mainAttendanceId,
                    values: updateValues
                });

                // 6. Finalize Regularization record
                record.submitFields({
                    type: 'customrecord_hr_attend_regularization',
                    id: attenRegID,
                    values: { 'custrecord_hr_attend_dailyupdated': true }
                });

                log.debug("Process Complete", "In: " + earliestInStr + " Out: " + latestOutStr);
            }
        } catch (e) {
            log.error('Error in Script', e.toString());
        }
    } */
  //27/07/2026 changed working hole days before reg process
/* function afterSubmit(context) {
    if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;

    try {
        var newRecord = context.newRecord;
        var attenRegID = newRecord.id;
        
        var approvalSts = newRecord.getValue('custrecord_hr_attend_reg_approve_status');
        var dailyUpdated = newRecord.getValue('custrecord_hr_attend_dailyupdated');
        var mainAttendanceId = newRecord.getValue('custrecord_hr_attend_reg_daily_id');

        // Only process if Approved (2), not already updated, and linked to a Daily Attendance record
       // if (approvalSts == 2 && dailyUpdated == false && mainAttendanceId) {
      if (approvalSts == 2 && dailyUpdated == false) {
            
            var employee = newRecord.getValue('custrecord_hr_attend_reg_employee');
            var regIn = newRecord.getValue('custrecord_hr_attend_regular_reg_in');
            var regOut = newRecord.getValue('custrecord_hr_attend_regular_reg_out');
            var projectHeader = newRecord.getValue('custrecord_hris_attendance_reg_project');
            var projectStage = newRecord.getValue('custrecord_hris_attendance_reg_pro_stage'); // Added Project Stage
            var regDateValue = newRecord.getValue('custrecord_hr_attend_regular_date');

            log.debug("Regularization Triggered", "ID: " + attenRegID + " for Daily Attendance: " + mainAttendanceId);

            // 1. UPSERT the individual Project Detail record
            var existingProjId = null;
            var projFilters = [
                ['custrecord_hris_daily_timesheet_link', 'anyof', mainAttendanceId]
            ];
            if (projectHeader) {
                projFilters.push('AND');
                projFilters.push(['custrecord_hris_daily_emp_project_detail', 'anyof', projectHeader]);
            }
            // Added filter condition for Stage
            if (projectStage) {
                projFilters.push('AND');
                projFilters.push(['custrecord_hris_diaily_emp_att_stage', 'anyof', projectStage]);
            }

            search.create({
                type: 'customrecord_hris_emp_daily_attend_proje',
                filters: projFilters
            }).run().each(function(res) {
                existingProjId = res.id;
                return false; 
            });

            var projRec = existingProjId ? 
                record.load({ type: 'customrecord_hris_emp_daily_attend_proje', id: existingProjId }) : 
                record.create({ type: 'customrecord_hris_emp_daily_attend_proje' });

            projRec.setValue('custrecord_hris_emp_daily_project_emp', employee);
            projRec.setValue('custrecord_hris_emp_daily_attend_date', new Date(regDateValue));
            projRec.setValue('custrecord_hris_daily_emp_project_detail', projectHeader);
            projRec.setValue('custrecord_hris_diaily_emp_att_stage', projectStage); // Added project stage value
            projRec.setValue('custrecord_hris_project_details_regin', regIn);
            projRec.setValue('custrecord_hris_project_details_regout', regOut);
            projRec.setValue('custrecord_hris_daily_timesheet_link', mainAttendanceId);
            
            var savedProjId = projRec.save();

            // Set project record ID to the custom field
            record.submitFields({
                type: 'customrecord_hris_emp_daily_attend_proje',
                id: savedProjId,
                values: { 'custrecord_hris_project_details_id': savedProjId }
            });

            // 2. AGGREGATE: Search ALL projects to find MIN/MAX using override logic
            var projectSearch = search.create({
                type: 'customrecord_hris_emp_daily_attend_proje',
                filters: [['custrecord_hris_daily_timesheet_link', 'anyof', mainAttendanceId]],
                columns: [
                    'custrecord_hris_emp_daily_attend_date',
                    'custrecord_hris_emp_daily_atte_pro_intim', // Original In
                    'custrecord_hris_emp_daily_pro_outime',    // Original Out
                    'custrecord_hris_project_details_regin',    // Reg In
                    'custrecord_hris_project_details_regout'    // Reg Out
                ]
            });

            var globalEarliestInDateObj = null;
            var globalLatestOutDateObj = null;
            var earliestInStr = "";
            var latestOutStr = "";

            projectSearch.run().each(function(result) {
                var attDate = result.getValue('custrecord_hris_emp_daily_attend_date');
                
                // LOGIC: If Regularized value exists, it overrides Original value
                var finalInTime = result.getValue('custrecord_hris_project_details_regin') || result.getValue('custrecord_hris_emp_daily_atte_pro_intim');
                var finalOutTime = result.getValue('custrecord_hris_project_details_regout') || result.getValue('custrecord_hris_emp_daily_pro_outime');

                if (finalInTime) {
                    var currentInObj = parseDateTime(attDate, finalInTime);
                    if (!globalEarliestInDateObj || currentInObj < globalEarliestInDateObj) {
                        globalEarliestInDateObj = currentInObj;
                        earliestInStr = finalInTime;
                    }
                }

                if (finalOutTime) {
                    var currentOutObj = parseDateTime(attDate, finalOutTime);
                    // Handle overnight crossover
                    if (globalEarliestInDateObj && currentOutObj <= globalEarliestInDateObj) {
                        currentOutObj.setDate(currentOutObj.getDate() + 1);
                    }
                    if (!globalLatestOutDateObj || currentOutObj > globalLatestOutDateObj) {
                        globalLatestOutDateObj = currentOutObj;
                        latestOutStr = finalOutTime;
                    }
                }
                return true;
            });

            // 3. CALCULATE Hours
            var totalDecimalHrs = 0;
            var timeFormattedHrs = "00:00";
            var decimalFormattedHrs = "0.00";

            if (globalEarliestInDateObj && globalLatestOutDateObj) {
                var diffMs = globalLatestOutDateObj - globalEarliestInDateObj;
                totalDecimalHrs = diffMs / (1000 * 60 * 60);
                if (totalDecimalHrs < 0) totalDecimalHrs = 0;
                
                timeFormattedHrs = decimalToHHMM(totalDecimalHrs);
                decimalFormattedHrs = totalDecimalHrs.toFixed(2);
            }

            // 4. LOOKUP Internal Attendance status
            var fieldLookUp = search.lookupFields({
                type: 'customrecord_njt_emp_daily_atten_ch',
                id: mainAttendanceId,
                columns: ['custrecord_njt_emp_daily_intatt']
            });
            
            var currentIntAtt = 0;
            if(fieldLookUp.custrecord_njt_emp_daily_intatt && fieldLookUp.custrecord_njt_emp_daily_intatt.length > 0){
                currentIntAtt = fieldLookUp.custrecord_njt_emp_daily_intatt[0].value;
            }

            // 5. UPDATE Main Record
            var updateValues = {
                'custrecord_njt_emp_daily_reg_in': earliestInStr,
                'custrecord_njt_emp_daily_reg_out': latestOutStr,
                'custrecord_njt_emp_daily_regularizahrs': timeFormattedHrs,
                'custrecord_hris_actual_woking_hours': decimalFormattedHrs,
                'custrecord_njt_emp_daily_totalhours': timeFormattedHrs,
                'custrecord_njt_emp_daily_totalworkinghrs': timeFormattedHrs,
                'custrecord_njt_emp_daily_attenreglink': attenRegID
            };

            if (currentIntAtt == 23) {
                updateValues['custrecord_njt_emp_daily_intatt'] = 18;
            }

            record.submitFields({
                type: 'customrecord_njt_emp_daily_atten_ch',
                id: mainAttendanceId,
                values: updateValues
            });

            // 6. Finalize Regularization record
            record.submitFields({
                type: 'customrecord_hr_attend_regularization',
                id: attenRegID,
                values: { 'custrecord_hr_attend_dailyupdated': true }
            });

            log.debug("Process Complete", "In: " + earliestInStr + " Out: " + latestOutStr);
        }
    } catch (e) {
        log.error('Error in Script', e.toString());
    }
} */

  /* function afterSubmit(context) {
    if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;

    try {
        var newRecord = context.newRecord;
        var attenRegID = newRecord.id;
        
        var approvalSts = newRecord.getValue('custrecord_hr_attend_reg_approve_status');
        var dailyUpdated = newRecord.getValue('custrecord_hr_attend_dailyupdated');
        var mainAttendanceId = newRecord.getValue('custrecord_hr_attend_reg_daily_id');

        // Only process if Approved (2) and not already updated
        if (approvalSts == 2 && dailyUpdated == false) {
            
            var employee = newRecord.getValue('custrecord_hr_attend_reg_employee');
            var regIn = newRecord.getValue('custrecord_hr_attend_regular_reg_in');
            var regOut = newRecord.getValue('custrecord_hr_attend_regular_reg_out');
            var projectHeader = newRecord.getValue('custrecord_hris_attendance_reg_project');
            var projectStage = newRecord.getValue('custrecord_hris_attendance_reg_pro_stage'); 
            var regDateValue = newRecord.getValue('custrecord_hr_attend_regular_date');

            log.debug("Regularization Triggered", "ID: " + attenRegID);

            // --- STEP 0: FIND OR CREATE MAIN ATTENDANCE RECORD ---
            // If the link is missing, we try to find the record by Date and Employee
            if (!mainAttendanceId) {
                log.debug("Missing Main ID", "Searching for existing Daily Attendance record...");
                
                var existingDailySearch = search.create({
                    type: 'customrecord_njt_emp_daily_atten_ch',
                    filters: [
                        ['custrecord_njt_daily_atten_emp', 'anyof', employee], // Check these field names!
                        'AND',
                        ['custrecord_njt_emp_daily_date', 'on', regDateValue]      // Check these field names!
                    ]
                }).run().getRange({ start: 0, end: 1 });

                if (existingDailySearch.length > 0) {
                    mainAttendanceId = existingDailySearch[0].id;
                    log.debug("Main Record Found", "Found ID: " + mainAttendanceId);
                } else {
                    log.debug("Main Record Not Found", "Creating new Daily Attendance record...");
                    var newDailyRec = record.create({
                        type: 'customrecord_njt_emp_daily_atten_ch'
                    });
                    newDailyRec.setValue('custrecord_njt_daily_atten_emp', employee);
                    newDailyRec.setValue('custrecord_njt_emp_daily_date', new Date(regDateValue));
                    // Set default status to "Present" or similar if required by your business logic
                    mainAttendanceId = newDailyRec.save();
                }

                // Update the Regularization record so it's linked for future reference
                record.submitFields({
                    type: 'customrecord_hr_attend_regularization',
                    id: attenRegID,
                    values: { 'custrecord_hr_attend_reg_daily_id': mainAttendanceId }
                });
            }

            // Now that we definitely have a mainAttendanceId, proceed with sublist logic
            
            // 1. UPSERT the individual Project Detail record
            var existingProjId = null;
            var projFilters = [
                ['custrecord_hris_daily_timesheet_link', 'anyof', mainAttendanceId]
            ];
            if (projectHeader) {
                projFilters.push('AND');
                projFilters.push(['custrecord_hris_daily_emp_project_detail', 'anyof', projectHeader]);
            }
            if (projectStage) {
                projFilters.push('AND');
                projFilters.push(['custrecord_hris_diaily_emp_att_stage', 'anyof', projectStage]);
            }

            search.create({
                type: 'customrecord_hris_emp_daily_attend_proje',
                filters: projFilters
            }).run().each(function(res) {
                existingProjId = res.id;
                return false; 
            });

            var projRec = existingProjId ? 
                record.load({ type: 'customrecord_hris_emp_daily_attend_proje', id: existingProjId }) : 
                record.create({ type: 'customrecord_hris_emp_daily_attend_proje' });

            projRec.setValue('custrecord_hris_emp_daily_project_emp', employee);
            projRec.setValue('custrecord_hris_emp_daily_attend_date', new Date(regDateValue));
            projRec.setValue('custrecord_hris_daily_emp_project_detail', projectHeader);
            projRec.setValue('custrecord_hris_diaily_emp_att_stage', projectStage);
            projRec.setValue('custrecord_hris_project_details_regin', regIn);
            projRec.setValue('custrecord_hris_project_details_regout', regOut);
            projRec.setValue('custrecord_hris_daily_timesheet_link', mainAttendanceId);
            
            var savedProjId = projRec.save();

            record.submitFields({
                type: 'customrecord_hris_emp_daily_attend_proje',
                id: savedProjId,
                values: { 'custrecord_hris_project_details_id': savedProjId }
            });

            // 2. AGGREGATE: Search ALL projects to find MIN/MAX
            var projectSearch = search.create({
                type: 'customrecord_hris_emp_daily_attend_proje',
                filters: [['custrecord_hris_daily_timesheet_link', 'anyof', mainAttendanceId]],
                columns: [
                    'custrecord_hris_emp_daily_attend_date',
                    'custrecord_hris_emp_daily_atte_pro_intim',
                    'custrecord_hris_emp_daily_pro_outime',
                    'custrecord_hris_project_details_regin',
                    'custrecord_hris_project_details_regout'
                ]
            });

            var globalEarliestInDateObj = null;
            var globalLatestOutDateObj = null;
            var earliestInStr = "";
            var latestOutStr = "";

            projectSearch.run().each(function(result) {
                var attDate = result.getValue('custrecord_hris_emp_daily_attend_date');
                var finalInTime = result.getValue('custrecord_hris_project_details_regin') || result.getValue('custrecord_hris_emp_daily_atte_pro_intim');
                var finalOutTime = result.getValue('custrecord_hris_project_details_regout') || result.getValue('custrecord_hris_emp_daily_pro_outime');

                if (finalInTime) {
                    var currentInObj = parseDateTime(attDate, finalInTime);
                    if (!globalEarliestInDateObj || currentInObj < globalEarliestInDateObj) {
                        globalEarliestInDateObj = currentInObj;
                        earliestInStr = finalInTime;
                    }
                }

                if (finalOutTime) {
                    var currentOutObj = parseDateTime(attDate, finalOutTime);
                    if (globalEarliestInDateObj && currentOutObj <= globalEarliestInDateObj) {
                        currentOutObj.setDate(currentOutObj.getDate() + 1);
                    }
                    if (!globalLatestOutDateObj || currentOutObj > globalLatestOutDateObj) {
                        globalLatestOutDateObj = currentOutObj;
                        latestOutStr = finalOutTime;
                    }
                }
                return true;
            });

            // 3. CALCULATE Hours
            var totalDecimalHrs = 0;
            var timeFormattedHrs = "00:00";
            var decimalFormattedHrs = "0.00";

            if (globalEarliestInDateObj && globalLatestOutDateObj) {
                var diffMs = globalLatestOutDateObj - globalEarliestInDateObj;
                totalDecimalHrs = diffMs / (1000 * 60 * 60);
                if (totalDecimalHrs < 0) totalDecimalHrs = 0;
                timeFormattedHrs = decimalToHHMM(totalDecimalHrs);
                decimalFormattedHrs = totalDecimalHrs.toFixed(2);
            }

            // 4. LOOKUP Internal Attendance status
            var fieldLookUp = search.lookupFields({
                type: 'customrecord_njt_emp_daily_atten_ch',
                id: mainAttendanceId,
                columns: ['custrecord_njt_emp_daily_intatt']
            });
            
            var currentIntAtt = 0;
            if(fieldLookUp.custrecord_njt_emp_daily_intatt && fieldLookUp.custrecord_njt_emp_daily_intatt.length > 0){
                currentIntAtt = fieldLookUp.custrecord_njt_emp_daily_intatt[0].value;
            }

            // 5. UPDATE Main Record
            var updateValues = {
                'custrecord_njt_emp_daily_reg_in': earliestInStr,
                'custrecord_njt_emp_daily_reg_out': latestOutStr,
                'custrecord_njt_emp_daily_regularizahrs': timeFormattedHrs,
                'custrecord_hris_actual_woking_hours': decimalFormattedHrs,
                'custrecord_njt_emp_daily_totalhours': timeFormattedHrs,
                'custrecord_njt_emp_daily_totalworkinghrs': timeFormattedHrs,
                'custrecord_njt_emp_daily_attenreglink': attenRegID
            };

            if (currentIntAtt == 23) { // Assume 23 is "Absent"
                updateValues['custrecord_njt_emp_daily_intatt'] = 18; // Assume 18 is "Present"
            }

            record.submitFields({
                type: 'customrecord_njt_emp_daily_atten_ch',
                id: mainAttendanceId,
                values: updateValues
            });

            // 6. Finalize Regularization record
            record.submitFields({
                type: 'customrecord_hr_attend_regularization',
                id: attenRegID,
                values: { 'custrecord_hr_attend_dailyupdated': true }
            });

            log.debug("Process Complete", "In: " + earliestInStr + " Out: " + latestOutStr);
        }
    } catch (e) {
        log.error('Error in Script', e.toString());
    }
}
    function parseDateTime(dateVal, timeStr) {
        var dateObj = new Date(dateVal);
        if (!timeStr) return dateObj;
        var timeParts = timeStr.split(':');
        var hours = parseInt(timeParts[0], 10);
        var minutes = parseInt(timeParts[1].split(' ')[0], 10);
        var ampm = timeStr.toLowerCase().indexOf('pm') !== -1;
        if (ampm && hours < 12) hours += 12;
        if (!ampm && hours === 12) hours = 0;
        dateObj.setHours(hours, minutes, 0, 0);
        return dateObj;
    }

    function decimalToHHMM(decimalHrs) {
        var hrs = Math.floor(decimalHrs);
        var mins = Math.round((decimalHrs - hrs) * 60);
        if (mins === 60) {
            hrs += 1; mins = 0;
        }
        return pad(hrs) + ":" + pad(mins);
    }

    function pad(n) { return n < 10 ? '0' + n : n; } */
  function afterSubmit(context) {
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;

        try {
            var newRecord = context.newRecord;
            var attenRegID = newRecord.id;

            var approvalSts = newRecord.getValue('custrecord_hr_attend_reg_approve_status');
            var dailyUpdated = newRecord.getValue('custrecord_hr_attend_dailyupdated');
            var mainAttendanceId = newRecord.getValue('custrecord_hr_attend_reg_daily_id');

            // Only process if Approved (2) and not already updated
            if (approvalSts == 2 && dailyUpdated == false) {

                var employee = newRecord.getValue('custrecord_hr_attend_reg_employee');
                var regIn = newRecord.getValue('custrecord_hr_attend_regular_reg_in');
                var regOut = newRecord.getValue('custrecord_hr_attend_regular_reg_out');
                var projectHeader = newRecord.getValue('custrecord_hris_attendance_reg_project');
                var projectStage = newRecord.getValue('custrecord_hris_attendance_reg_pro_stage');
                var regDateValue = newRecord.getValue('custrecord_hr_attend_regular_date'); // This is a Date Object

                log.debug("Regularization Triggered", "ID: " + attenRegID);

                // FIX: Convert Date Object to String for Search Filters
                var regDateString = format.format({
                    value: regDateValue,
                    type: format.Type.DATE
                });

                // --- STEP 0: FIND OR CREATE MAIN ATTENDANCE RECORD ---
                if (!mainAttendanceId) {
                    log.debug("Missing Main ID", "Searching for existing Daily Attendance record...");

                    var existingDailySearch = search.create({
                        type: 'customrecord_hris_daily_timesheet_overal',
                        filters: [
                            ['custrecord_hris_daily_time_over_emp', 'anyof', employee],
                            'AND',
                            ['custrecord_hris_dail_timeheet_date', 'on', regDateString] // Use the formatted String here
                        ]
                    }).run().getRange({
                        start: 0,
                        end: 1
                    });

                    if (existingDailySearch.length > 0) {
                        mainAttendanceId = existingDailySearch[0].id;
                        log.debug("Main Record Found", "Found ID: " + mainAttendanceId);
                    } else {
                        log.debug("Main Record Not Found", "Creating new Daily Attendance record...");
                        var newDailyRec = record.create({
                            type: 'customrecord_hris_daily_timesheet_overal'
                        });
                        newDailyRec.setValue('custrecord_hris_daily_time_over_emp', employee);
                        newDailyRec.setValue('custrecord_hris_dail_timeheet_date', regDateValue); // Use Date Object for setValue
                        if (projectHeader) {
                            newDailyRec.setValue('custrecord_hris_daily_time_projectoveral', projectHeader);
                        }
                        mainAttendanceId = newDailyRec.save();
                    }

                    // Update the Regularization record link
                    record.submitFields({
                        type: 'customrecord_hr_attend_regularization',
                        id: attenRegID,
                        values: {
                            'custrecord_hr_attend_reg_daily_id': mainAttendanceId
                        }
                    });
                }

                // Calculate Hours directly from regIn and regOut
                var totalDecimalHrs = 0;
                var timeFormattedHrs = "00:00";
                var decimalFormattedHrs = "0.00";

                if (regIn && regOut) {
                    var inDateObj = parseDateTime(regDateValue, regIn);
                    var outDateObj = parseDateTime(regDateValue, regOut);
                    if (outDateObj <= inDateObj) {
                        outDateObj.setDate(outDateObj.getDate() + 1);
                    }
                    var diffMs = outDateObj - inDateObj;
                    totalDecimalHrs = diffMs / (1000 * 60 * 60);
                    if (totalDecimalHrs < 0) totalDecimalHrs = 0;
                    timeFormattedHrs = decimalToHHMM(totalDecimalHrs);
                    decimalFormattedHrs = totalDecimalHrs.toFixed(2);
                }

                // 4. LOOKUP Internal Attendance status
                var fieldLookUp = search.lookupFields({
                    type: 'customrecord_hris_daily_timesheet_overal',
                    id: mainAttendanceId,
                    columns: ['custrecord_hris_internal_attend_ove']
                });

                var currentIntAtt = 0;
                if (fieldLookUp.custrecord_hris_internal_attend_ove && fieldLookUp.custrecord_hris_internal_attend_ove.length > 0) {
                    currentIntAtt = fieldLookUp.custrecord_hris_internal_attend_ove[0].value;
                }

                // 5. UPDATE Main Record
                var updateValues = {
                    'custrecord_hris_reg_time_overallin': regIn,
                    'custrecord_hris_regout_overall': regOut,
                    'custrecord_hris_daily_time_reghours': timeFormattedHrs,
                    'custrecord_hris_actual_woking_hours': decimalFormattedHrs,
                    'custrecord_njt_emp_daily_totalhours': timeFormattedHrs,
                    'custrecord_njt_emp_daily_totalworkinghrs': timeFormattedHrs,
                    'custrecord_njt_emp_daily_attenreglink': attenRegID
                };

                if (projectHeader) {
                    updateValues['custrecord_hris_daily_time_projectoveral'] = projectHeader;
                }

                if (currentIntAtt == 23) { // Assume 23 is Absent
                    updateValues['custrecord_hris_internal_attend_ove'] = 18; // 18 is Present
                }

                record.submitFields({
                    type: 'customrecord_hris_daily_timesheet_overal',
                    id: mainAttendanceId,
                    values: updateValues
                });

                // 6. Finalize Regularization record
                record.submitFields({
                    type: 'customrecord_hr_attend_regularization',
                    id: attenRegID,
                    values: {
                        'custrecord_hr_attend_dailyupdated': true
                    }
                });

                log.debug("Process Complete", "In: " + regIn + " Out: " + regOut);
            }
        } catch (e) {
            log.error('Error in Script', e.toString());
        }
    }

    /**
     * Helper to safely parse Date and Time into a single JS Date Object
     */
    function parseDateTime(dateVal, timeStr) {
        var dateObj;
        if (dateVal instanceof Date) {
            dateObj = new Date(dateVal.getTime());
        } else {
            // Parses string based on User Preferences (dd/MM/yy)
            dateObj = format.parse({
                value: dateVal,
                type: format.Type.DATE
            });
        }

        if (!timeStr) return dateObj;

        var timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeParts) {
            var hours = parseInt(timeParts[1], 10);
            var minutes = parseInt(timeParts[2], 10);
            var ampm = timeParts[3].toUpperCase();

            if (ampm === "PM" && hours !== 12) hours += 12;
            if (ampm === "AM" && hours === 12) hours = 0;

            dateObj.setHours(hours, minutes, 0, 0);
        }
        return dateObj;
    }

    function decimalToHHMM(decimalHrs) {
        var hrs = Math.floor(decimalHrs);
        var mins = Math.round((decimalHrs - hrs) * 60);
        if (mins === 60) {
            hrs += 1;
            mins = 0;
        }
        return pad(hrs) + ":" + pad(mins);
    }

    function pad(n) {
        return n < 10 ? '0' + n : n;
    }

// Note: Ensure your calculateHoursDiffdecimal function is defined in the script scope.
function calculateHoursDiffdecimal(startDate, startTime, endDate, endTime) {
    var start = new Date(startDate + ' ' + startTime);
    var end = new Date(endDate + ' ' + endTime);
    var diff = end.getTime() - start.getTime();
    return (diff / (1000 * 60 * 60));
}

    // Function to parse time in "HH:MM AM/PM" format
    function parseTimeString(timeString) {
        var timeParts = timeString.split(' ');
        var time = timeParts[0].split(':');
        var hours = parseInt(time[0]);
        var minutes = parseInt(time[1]);
        var period = timeParts[1];

        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }

        var date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
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

        // return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
        return (hours < 10 ? "0" + hours : hours) + "." + (minutes < 10 ? "0" + minutes : minutes);

    }

    function caluclateWorkHours(timeIn, timeOut) {

        // debugger;
        log.debug('timeIn', timeIn);
        log.debug('timeOut', timeOut);
        var totalHoursWorked = '';
        var punchTimeIn = MOMENT(timeIn, "HH:mm:ss a");
        log.debug('punchTimeIn', punchTimeIn);
        var punchTimeOut = MOMENT(timeOut, "HH:mm:ss a");
        log.debug('punchTimeOut', punchTimeOut);
        // Hours worked
        var duration;

        if (punchTimeIn <= punchTimeOut) {
            duration = MOMENT.duration(punchTimeOut.diff(punchTimeIn));
            log.debug('duration', duration);
        } else {
            // If Start Time is greater than End time. Mostly for Night Shift (or) Shift timing that runs between two Dates.
            punchTimeIn = MOMENT(punchTimeIn).add(12, 'hours');
            punchTimeOut = MOMENT(MOMENT(punchTimeOut).add(12, 'hours')).add(1, 'days'); // add 1 day because shift starts on the 1st date and end on the next date.
            duration = MOMENT.duration(punchTimeOut.diff(punchTimeIn));
        }
        // Calculate Hours worked
        var hours = parseInt(duration.asHours());
        var minutes = parseInt(duration.asMinutes()) % 60;
        //    totalHoursWorked = ZeroPad(hours) + ':' + ZeroPad(minutes);
        totalHoursWorked = hours + '.' + minutes
        return totalHoursWorked;
    }

function calculateHoursDiffdecimalold(startDate, startTime, endDate, endTime) {
    // Convert dd/mm/yyyy → yyyy-mm-dd (JS compatible)
    log.emergency('startDate',startDate);
    log.emergency('endDate',endDate);

    function parseDate(d) {
        var parts = d.split("/");
        log.audit('Format', parts[2] + "-" + parts[1] + "-" + parts[0]);
        return parts[2] + "-" + parts[1] + "-" + parts[0]; // yyyy-mm-dd
    }
    

    var start = new Date(parseDate(startDate) + " " + startTime);
    var end   = new Date(parseDate(endDate) + " " + endTime);
     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid date or time input: " + startDate + " " + startTime + " / " + endDate + " " + endTime);
    }

    // difference in ms → hours
    var diffHours = (end - start) / (1000 * 60 * 60);

    return diffHours;
}
/**
 * Calculate hours difference safely in SuiteScript
 */
function calculateHoursDiffdecimal(startDate, startTime, endDate, endTime) {
    function parseDateTime(dateStr, timeStr) {
        // dateStr = "15/06/2025"
        var parts = dateStr.split("/");
        var day = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10) - 1; // JS month 0-11
        var year = parseInt(parts[2], 10);

        // timeStr = "10:47 AM"
        var timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!timeParts) throw new Error("Invalid time format: " + timeStr);

        var hour = parseInt(timeParts[1], 10);
        var minute = parseInt(timeParts[2], 10);
        var ampm = timeParts[3].toUpperCase();

        if (ampm === "PM" && hour !== 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;

        return new Date(year, month, day, hour, minute, 0, 0);
    }

    var start = parseDateTime(startDate, startTime);
    var end = parseDateTime(endDate, endTime);

    var diffHours = (end - start) / (1000 * 60 * 60);
    return diffHours;
}


    return {
        afterSubmit: afterSubmit
    };

});