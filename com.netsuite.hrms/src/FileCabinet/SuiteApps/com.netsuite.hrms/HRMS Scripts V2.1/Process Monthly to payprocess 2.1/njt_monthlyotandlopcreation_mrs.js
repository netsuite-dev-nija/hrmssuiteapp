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
                log.debug({ title: 'Visa Checking Data', details: scriptParams.getParameter({ name: 'custscript_njt_monthpay' }) });

                /* record.submitFields({
                    type: "customrecord_hris_mr_status_bar_rec",
                    id: 8,
                    values: {
                        custrecord_hris_mr_sts: 2
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                }); */
                return JSON.parse(scriptParams.getParameter({ name: 'custscript_njt_monthpay' }));
            }

            catch (e) {

                log.error({
                    title: 'Error in MRS',
                    details: e.message
                });
               /*  record.submitFields({
                    type: "customrecord_hris_mr_status_bar_rec",
                    id: 8,
                    values: {
                        custrecord_hris_mr_sts: 1
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                }); */
            }
        }

        /**
         * Processes each input record in the Map stage.
         * Adds Pay Group information and writes data to context.
         * @param {Object} context The Map/Reduce context object.
         */
        function map(context) {
            var data = JSON.parse(context.value);
            log.debug('Map Data', data);


            context.write({
                key: data.empid,
                value: JSON.stringify(data)
            });
        }

        /**
         * Creates and saves a custom monthly attendance record.
         * @param {Object} data Data for creating the record.
         * @returns {number|null} The ID of the created record, or null if an error occurs.
         */
        /**
 * Creates and saves a custom monthly attendance record.
 * @param {Object} data Data for creating the record.
 * @returns {number|null} The ID of the created record, or null if an error occurs.
 */
        function createMonthlyAttendanceRecord(data, query, format) {
            try {

                var monthlyattensql = "Select * from customrecord_hrms_monthlyattendance where id = " + data.parId;
                var queryResult = query.runSuiteQL({ query: monthlyattensql });
                var tsResult = queryResult.asMappedResults();
                log.debug("tsResult", tsResult);
                log.debug("tsResult length", tsResult.length);

                // Loop through the results and set sublist values
                for (var loop = 0; loop < tsResult.length; loop++) {
                    var rec = tsResult[loop];
                    var empid = rec.custrecord_hrms_month_empid || "";
                    var project = rec.custrecord_hrms_month_project;
                    var projectSeg = rec.custrecord_hrms_month_projectsite;
                    var presentdays = rec.custrecord_hrms_month_presentdays || 0; // Default to 0 if PresentCount is null
                    var absentdays = rec.custrecord_hrms_month_absentdays || 0;
                    log.debug("Absent Days", absentdays);
                    var weeklyOTHours = rec.custrecord_hrms_month_weeklyothrs || 0;
                    log.debug("weeklyOTHours", weeklyOTHours);
                    var holiOt = rec.custrecord_hrms_month_holidayothrs || 0;
                    log.debug('Holidayot', holiOt);
                    var rotOt = rec.custrecord_hrms_month_rothrs || 0;
                    log.debug('rotOt', rotOt);
                    var latemin = rec.custrecord_hrms_month_late_mins || 0;
                    var latehrs = rec.custrecord_hrms_month_late_hrs || 0;
                    var monthid = rec.custrecord_hrms_month_monthid;
                    var yearid = rec.custrecord_hrms_month_yearid;
                    var paygroup = rec.custrecord_hrms_month_paygroup;
                    log.debug("paygroup", paygroup)

                    var wageDetails = searchWagePeriod(paygroup);
                    if (wageDetails) {
                        var wageDetailsArray = wageDetails.split('#');
                        var payDate = wageDetailsArray[0]; // End date as Pay Date
                        var startDate = wageDetailsArray[1];
                        var wageMonth = wageDetailsArray[2];
                        var wageYear = wageDetailsArray[3];
                    } else {
                        log.error('Wage Period Not Found', 'No wage period found for pay group: ' + paygroup);
                    }
                    var parId = rec.id
                    var remark = 'This Entry is created from monthly attendance'
                    //var monthlysalarysql ="select * from customrecord_hris_monthlysalinput where custrecord_hris_mthsal_empname ='" +empid+"' and\

                    // As Per Vanitha mam told 05/05/2025 the seperate wise OT Caculation done 
                   /*  if (weeklyOTHours != 0 || holiOt != 0 || rotOt != 0) {
                        log.debug("weekotcheck");
                        var salaryAmtweeklyot = 0;
                        var salaryAmtholiot = 0;
                        var salaryAmtrotot = 0;
                        var totalotamt = 0;
                        var overtimeratetotal = 0;
                        var othrstotral = 0;
                        var otsequence = 1;
                        var paycomponent = getPayrollcomponent(paygroup, otsequence);
                        log.debug('paycomponent', paycomponent)
                        var monthlysalaryrecord = record.create({
                            type: 'customrecord_hris_monthlysalinput',
                            isDynamic: true
                        });

                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_empname', value: empid });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paygroup', value: paygroup });
                        if (payDate) {

                            payDate = format.parse({
                                value: payDate,
                                type: format.Type.DATE
                            });
                            monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paydt', value: payDate });
                        }
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_month', value: monthid });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_year', value: yearid });

                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paycomponent', value: paycomponent, ignoreFieldChange: false });
                        var overtimesearchweekly = getweeklyotrate();
                        var overtime_splitweekly = overtimesearchweekly.split('#')
                        var overtimerateweekly = overtime_splitweekly[0];
                        var overtimeidweekly = overtime_splitweekly[1];
                        log.debug("overtimerateweekly", overtimerateweekly);

                        var overtimesearchholiday = getholidayottate();
                        var overtime_splitholiday = overtimesearchholiday.split('#')
                        var overtimerateholiday = overtime_splitholiday[0];
                        var overtimeidholiday = overtime_splitholiday[1];
                        log.debug("overtimerateholiday", overtimerateholiday);


                        var overtimesearchrot = getrotrate();
                        var overtime_splitrot = overtimesearchrot.split('#')
                        var overtimeraterot = overtime_splitrot[0];
                        var overtimeidrot = overtime_splitrot[1];
                        log.debug("overtimeraterot", overtimeraterot);

                        var basicamt = getbasicpay(empid);
                        log.debug("Basicamt", basicamt);

                        othrstotral = weeklyOTHours + holiOt + rotOt;
                        log.debug("othrstotral", othrstotral);

                        overtimeratetotal = parseFloat(overtimerateweekly) + parseFloat(overtimerateholiday) + parseFloat(overtimeraterot);
                        log.debug("overtimeratetotal", overtimeratetotal);
                        var overtimeratetotalnew = overtimeratetotal.toFixed(2);

                        //calculate hours amount
                        var basichouramt = parseFloat(basicamt) / 240;
                        log.debug("basicHouramt", basichouramt);
                        //comment by vishal
                        // Basic hourly Wage = Basic pay / 240
                        //Basic hourly wage = 450 / 240 = 1.875
                        //Overtime Pay=Basic Hourly Wage×1.5×Overtime Hours
                        //overtime pay = 1.875*1.5*8 = 22.5
                        //this changes based on bin purpose only below 4 lines only
                        salaryAmtweeklyot =
                            parseFloat(basichouramt * overtimerateweekly * weeklyOTHours);
                        log.debug('salaryAmtweeklyot', salaryAmtweeklyot)

                        var otAmtWeek = ((basicamt / 30) / 9);
                        log.debug("otAmtWeek", otAmtWeek);
                        var otAmtWeeksalAmt = ((basicamt / 30) / 9) * weeklyOTHours;
                        log.debug("otAmtWeeksalAmt", otAmtWeeksalAmt);


                        salaryAmtholiot =
                            parseFloat(basichouramt * overtimerateholiday * holiOt);
                        log.debug('SalaryamtholsalaryAmtholiot', salaryAmtholiot);
                        //this changes based on bin purpose only below 4 lines only
                        var otAmtho = ((basicamt / 30) / 9);
                        log.debug("otAmtho", otAmtho);
                        var otAmtHosalAmt = ((basicamt / 30) / 9) * holiOt;
                        log.debug("otAmtHosalAmt", otAmtHosalAmt);

                        salaryAmtrotot =
                            parseFloat(basichouramt * overtimeraterot * rotOt);
                        //this changes based on bin purpose only below 4 lines only
                        var otAmtro = ((basicamt / 30) / 9);
                        log.debug("otAmtro", otAmtro);
                        var otAmtRosalAmt = ((basicamt / 30) / 9) * rotOt;
                        log.debug("otAmtRosalAmt", otAmtRosalAmt);

                        totalotamt = otAmtWeeksalAmt + otAmtHosalAmt + otAmtRosalAmt;
                        log.debug("totalotamt", totalotamt);







                        // monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_overtime_type', value: overtimeid, ignoreFieldChange: true });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_total_hours_days', value: othrstotral, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_ot_allowances_r', value: overtimeratetotalnew, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_salaryamount', value: totalotamt, ignoreFieldChange: true });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_remarks', value: remark, ignoreFieldChange: true });



                        var monthlysalweeklyrecordId = monthlysalaryrecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });

                        log.debug('Created Monthly salary overtime Record', 'Record ID: ' + monthlysalweeklyrecordId);
                    } */
                    // Added seperate rate with OT Caculation


                    if (weeklyOTHours != 0) {
                        var salaryAmt = 0;
                        var otsequence = 1;
                        var paycomponent = getPayrollcomponent(paygroup, otsequence);
                        log.debug('paycomponent weekly', paycomponent);
                        
                        var overtimeDetails = getWeeklyOTRate(paygroup, otsequence);
                      log.debug("overtimeDetails",overtimeDetails);
                        var overtimerate = overtimeDetails.rate || 1.5;
                      log.debug("overtimerate",overtimerate);
                        var overtimeid = overtimeDetails.id || null;
                      log.debug("overtimeid",overtimeid);
                        
                        var monthlysalaryrecord = record.create({
                            type: 'customrecord_hris_monthlysalinput',
                            isDynamic: true
                        });

                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_empname', value: empid });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paygroup', value: paygroup });
                        if (payDate) {
                            payDate = format.parse({
                                value: payDate,
                                type: format.Type.DATE
                            });
                            monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paydt', value: payDate });
                        }
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_month', value: monthid });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_year', value: yearid });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paycomponent', value: paycomponent, ignoreFieldChange: false });
                        
                        /* var basicamt = getbasicpay(empid);
                        log.debug("Basicamt", basicamt);
                        var basichouramt = parseFloat(basicamt) / 240;
                        log.debug("basicHouramt", basichouramt); */
                          var result = getbasicpay(empid);
var basicamt = result.basicpay;
var overHr = result.over;

log.debug("Basicamt", basicamt);
log.debug("Over Time Hours", overHr);

var basichouramtDay = basicamt /30;
log.debug("basichouramtDay", basichouramtDay);
                      var basichouramtHour = basichouramtDay /overHr;
log.debug("basichouramtHour", basichouramtHour);
                        salaryAmt = parseFloat(basichouramtHour * overtimerate * weeklyOTHours);
                        log.debug('Weekly OT Salaryamt', salaryAmt);
                        
                       // monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_overtime_type', value: overtimeid, ignoreFieldChange: true });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_total_hours_days', value: weeklyOTHours, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_ot_allowances_r', value: overtimerate, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_salaryamount', value: salaryAmt, ignoreFieldChange: true });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_remarks', value: remark, ignoreFieldChange: true });

                        var monthlysalweeklyrecordId = monthlysalaryrecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });
                        log.debug('Created Monthly salary weeklyot Record', 'Record ID: ' + monthlysalweeklyrecordId);
                    }
                    if (holiOt != 0) {
                        var salaryAmt = 0;
                        var otsequence = 2;
                        var paycomponent = getPayrollcomponent(paygroup, otsequence);
                        log.debug('paycomponent holiday', paycomponent);
                        
                        var overtimeDetails = getHolidayOTRate(paygroup, otsequence);
                        var overtimerate = overtimeDetails.rate || 1.5;
                        var overtimeid = overtimeDetails.id || null;
                        
                        var monthlysalaryrecord = record.create({
                            type: 'customrecord_hris_monthlysalinput',
                            isDynamic: true
                        });

                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_empname', value: empid, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paygroup', value: paygroup });
                        if (payDate) {
                            payDate = format.parse({
                                value: payDate,
                                type: format.Type.DATE
                            });
                            monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paydt', value: payDate });
                        }
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_month', value: monthid });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_year', value: yearid });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paycomponent', value: paycomponent, ignoreFieldChange: false });
                        
                       /*  var basicamt = getbasicpay(empid);
                        log.debug("Basicamt", basicamt);
                        var basichouramt = parseFloat(basicamt) / 240;
                        log.debug("basicHouramt", basichouramt); */
                      var result = getbasicpay(empid);
var basicamt = result.basicpay;
var overHr = result.over;

log.debug("Basicamt", basicamt);
log.debug("Over Time Hours", overHr);

var basichouramtDay = basicamt /30;
log.debug("basichouramtDay", basichouramtDay);
                      var basichouramtHour = basichouramtDay /overHr;
log.debug("basichouramtHour", basichouramtHour);
                        
                        salaryAmt = parseFloat(basichouramtHour * overtimerate * holiOt);
                        log.debug('Holiday OT Salaryamt', salaryAmt);
                        
                        //monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_overtime_type', value: overtimeid, ignoreFieldChange: true });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_total_hours_days', value: holiOt, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_ot_allowances_r', value: overtimerate, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_salaryamount', value: salaryAmt, ignoreFieldChange: true });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_remarks', value: remark, ignoreFieldChange: true });

                        var monthlysalholidayrecordId = monthlysalaryrecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });
                        log.debug('Created Monthly salary holiday Record', 'Record ID: ' + monthlysalholidayrecordId);
                    }


                    if (rotOt != 0) {
                        var salaryAmt = 0;
                        var otsequence = 3;
                        var paycomponent = getPayrollcomponent(paygroup, otsequence);
                        log.debug('paycomponent rot', paycomponent);
                        
                        var overtimeDetails = getROTRate(paygroup, otsequence);
                        var overtimerate = overtimeDetails.rate || 1.25;
                        var overtimeid = overtimeDetails.id || null;
                        
                        var monthlysalaryrecord = record.create({
                            type: 'customrecord_hris_monthlysalinput',
                            isDynamic: true
                        });

                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_empname', value: empid, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paygroup', value: paygroup });
                        if (payDate) {
                            payDate = format.parse({
                                value: payDate,
                                type: format.Type.DATE
                            });
                            monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paydt', value: payDate });
                        }
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_month', value: monthid });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_year', value: yearid });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paycomponent', value: paycomponent, ignoreFieldChange: false });
                        
                       /*  var basicamt = getbasicpay(empid);
                        log.debug("Basicamt", basicamt);
                        var basichouramt = parseFloat(basicamt) / 240;
                        log.debug("basicHouramt", basichouramt); */
                      var result = getbasicpay(empid);
var basicamt = result.basicpay;
var overHr = result.over;

log.debug("Basicamt", basicamt);
log.debug("Over Time Hours", overHr);

var basichouramtDay = basicamt /30;
log.debug("basichouramtDay", basichouramtDay);
                      var basichouramtHour = basichouramtDay /overHr;
log.debug("basichouramtHour", basichouramtHour);
                        
                        salaryAmt = parseFloat(basichouramtHour * overtimerate * rotOt);
                        log.debug('ROT OT Salaryamt', salaryAmt);
                        
                       // monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_overtime_type', value: overtimeid, ignoreFieldChange: true });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_total_hours_days', value: rotOt, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_ot_allowances_r', value: overtimerate, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_salaryamount', value: salaryAmt, ignoreFieldChange: true });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_remarks', value: remark, ignoreFieldChange: true });

                        var monthlysalrotrecordId = monthlysalaryrecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });
                        log.debug('Created Monthly salary ROT Record', 'Record ID: ' + monthlysalrotrecordId);
                    }                    

                    // 29/04/2025 As Per Vanitha mam told it should be comment because 
                    // from unpaid leave entry only absent day is calculated automatically so it need not be create here

                        if (absentdays != 0) {
   
                           var unpaidleaverecord = record.create({
                               type: 'customrecord_hris_unpaid_leave_entry',
                               isDynamic: true
                           });
                           var reaons = 'This Entry is created from monthly attendance'
                           unpaidleaverecord.setValue({ fieldId: 'custrecord_hris_ule_employee_name', value: empid, ignoreFieldChange: false });
                           unpaidleaverecord.setValue({ fieldId: 'custrecord_hris_ule_pay_group', value: paygroup, ignoreFieldChange: true });
                           if (payDate) {
   
                               payDate = format.parse({
                                   value: payDate,
                                   type: format.Type.DATE
                               });
                               unpaidleaverecord.setValue({ fieldId: 'custrecord_hris_ule_pay_date', value: payDate, ignoreFieldChange: true });
                           }
                           unpaidleaverecord.setValue({ fieldId: 'custrecord_hris_ule_month', value: monthid, ignoreFieldChange: true });
                           unpaidleaverecord.setValue({ fieldId: 'custrecord_hris_ule_year', value: yearid, ignoreFieldChange: true });
                           unpaidleaverecord.setValue({ fieldId: 'custrecord_hris_ule_noof_days', value: absentdays, ignoreFieldChange: true });
                           unpaidleaverecord.setValue({ fieldId: 'custrecord_hris_ule_final_days', value: absentdays, ignoreFieldChange: true });
                           unpaidleaverecord.setValue({ fieldId: 'custrecord_hris_ule_reason', value: reaons, ignoreFieldChange: true });
                           var unpaidleaverecordrecordId = unpaidleaverecord.save({
                               enableSourcing: true,
                               ignoreMandatoryFields: true
                           });;
   
                           log.debug('Created unpaid leave Record', 'Record ID: ' + unpaidleaverecordrecordId);
   
   
                       }
                    // calculate late hrs deduction
                    if (latemin != 0 || latehrs != 0) {
                        var salaryAmt = 0;
                        var otsequence = 4;
                        var paycomponent = getPayrollcomponentLatededuction(paygroup, otsequence);
                        log.debug('paycomponentdeduc', paycomponent);
                        var grosssalry = getgrosssalary(empid);
                        log.debug("grosssalryamount", grosssalry);
                        var workhrs = 9;
                        var workhrspermoth = 9 * 30;
                        log.debug("workhrspermoth", workhrspermoth);
                        var workminspermonth = workhrspermoth * 60;
                        log.debug("workminspermonth", workminspermonth);
                        var grosssalpermin = grosssalry / workminspermonth;
                        log.debug("grosssalpermin", grosssalpermin);

                        var latehrtomin = latehrs * 60;
                        log.debug("latehrtomin", latehrtomin);
                        var totallatemin = latehrtomin + latemin;
                        log.debug("totallatemin", totallatemin);

                        var deductionAmount = totallatemin * grosssalpermin;
                        log.debug("deductionAmount", deductionAmount);

                        var Salaryamt = grosssalry - deductionAmount;
                        Salaryamt = Salaryamt.toFixed(2);
                        log.debug("Salaryamt", Salaryamt);

                        var monthlysalaryrecord = record.create({
                            type: 'customrecord_hris_monthlysalinput',
                            isDynamic: true
                        });

                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_empname', value: empid, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paygroup', value: paygroup });
                        if (payDate) {

                            payDate = format.parse({
                                value: payDate,
                                type: format.Type.DATE
                            });
                            monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paydt', value: payDate });
                        }
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_month', value: monthid });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_year', value: yearid });

                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_paycomponent', value: paycomponent, ignoreFieldChange: false });

                        // monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_overtime_type', value: overtimeid, ignoreFieldChange: true });
                        // monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_total_hours_days', value: rotOt, ignoreFieldChange: false });
                        // monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_ot_allowances_r', value: overtimerate, ignoreFieldChange: false });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_salaryamount', value: deductionAmount, ignoreFieldChange: true });
                        monthlysalaryrecord.setValue({ fieldId: 'custrecord_hris_mthsal_remarks', value: remark, ignoreFieldChange: true });



                        var monthlysalweeklyrecordId = monthlysalaryrecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });;

                        log.debug('Created Monthly salary Latededuction Record', 'Record ID: ' + monthlysalweeklyrecordId);











                    }
                    // Update the related daily attendance record
                    if (data.parId) {
                        record.submitFields({
                            type: 'customrecord_hrms_monthlyattendance',
                            id: parseInt(data.parId, 10),
                            values: {

                                custrecord_hrms_month_processcompleted: true
                            }
                        });
                        log.debug('Updated Monthly  Attendance Record', 'Record ID: ' + data.parId);
                    }


                }
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
                    var recordId = createMonthlyAttendanceRecord(data, query, format);

                });
               /*  record.submitFields({
                    type: "customrecord_hris_mr_status_bar_rec",
                    id: 8,
                    values: {
                        custrecord_hris_mr_sts: 1
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                }); */
            } catch (e) {
                log.error({
                    title: 'Error in MRS',
                    details: e.message
                });
               /*  record.submitFields({
                    type: "customrecord_hris_mr_status_bar_rec",
                    id: 8,
                    values: {
                        custrecord_hris_mr_sts: 1
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                }); */
            }
        }

        /**
         * Retrieves the Pay Group for an employee.
         * @param {number} empId Employee ID.
         * @returns {string|null} Pay Group or null if not found.
         */
        function getPayGroup(empId) {
            try {
                var empCompSql = "SELECT * FROM customrecord_hris_employee_compen_change WHERE custrecord_hris_empchange_employee_nam = " + empId + " AND isinactive = 'F'";
                var records = getResult(empCompSql);
                return records.length > 0 ? records[0].custrecord_hris_empchange_emp_pay_pro_gp : null;
            } catch (e) {
                log.error('Error in getPayGroup', e);
                return null;
            }
        }
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
        function getPayrollcomponentLatededuction(paygroup, otsequence) {
            try {


                var paycompsql = "select * from customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 63 and isinactive='F' \
                and custrecord_hris_overtime_type_seq_no =" + otsequence + " and custrecord_hris_pay_process_group= " + paygroup
                var recordspayrollcomp = getResult(paycompsql);
                log.debug("recordspayrollcomp", recordspayrollcomp);
                return recordspayrollcomp.length > 0 ? recordspayrollcomp[0].id : null;
            } catch (e) {
                log.error('Error in getPayrollcomponent', e);
                return null;
            }
        }
        function getPayrollcomponent(paygroup, otsequence) {
            try {


                var paycompsql = "select * from customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 38 and isinactive='F' \
                and custrecord_hris_overtime_type_seq_no =" + otsequence + " and custrecord_hris_pay_process_group= " + paygroup
                log.debug('Paucompsql',paycompsql)
                var recordspayrollcomp = getResult(paycompsql);
                log.debug("recordspayrollcomp", recordspayrollcomp);
                return recordspayrollcomp.length > 0 ? recordspayrollcomp[0].id : null;
            } catch (e) {
                log.error('Error in getPayrollcomponent', e);
                return null;
            }
        }

        function getbasicpay(empid) {
    try {
        var empcompensql = "SELECT COALESCE(SUM(b.custrecord_hris_cde_monthly), 0) AS monthlyamt, " +
                          "c.custrecord_hris_overtime_hours AS over_time " +
                          "FROM customrecord_hris_employee_compen_change a " +
                          "JOIN customrecord_hris_compensation_details_e b ON a.id = b.custrecord_hris_employee_data_change " +
                          "JOIN customrecord_hris_payroll_component c ON b.custrecord_hris_cde_payroll_component = c.id " +
                          "WHERE a.custrecord_hris_empchange_employee_nam = " + empid + " " +
                          "AND c.isinactive = 'F' AND c.custrecord_hris_overtime_calculation = 'T' " +
                          "GROUP BY c.custrecord_hris_overtime_hours"; // Added GROUP BY to avoid issues with SUM

        log.debug('empcompensql', empcompensql);
        var records = getResult(empcompensql);

        if (records.length > 0) {
            var basicpay = parseFloat(records[0].monthlyamt) || 0;
            var over = parseFloat(records[0].over_time) || 0;

            return {
                basicpay: basicpay,
                over: over
            };
        } else {
            return {
                basicpay: 0,
                over_time: 0
            };
        }
    } catch (e) {
        log.error('Error in getbasicpay', e);
        return {
            basicpay: 0,
            over_time: 0
        };
    }
}

        function getWeeklyOTRate(paygroup, otsequence) {
            try {
                var paycompsql = "SELECT id, custrecord_hris_overtime_rate_ FROM customrecord_hris_payroll_component " +
                                "WHERE custrecord_hris__sequence_no_ = 38 AND isinactive='F' " +
                                "AND custrecord_hris_overtime_type_seq_no = " + otsequence + " " +
                                "AND custrecord_hris_pay_process_group = " + paygroup;
                log.debug('Weekly OT SQL', paycompsql);
                var records = getResult(paycompsql);
                log.debug("Weekly OT Records", records);
                
                if (records.length > 0) {
                    return {
                        rate: parseFloat(records[0].custrecord_hris_overtime_rate_ || 1),
                        id: records[0].id
                    };
                }
                return { rate: 1, id: null };
            } catch (e) {
                log.error('Error in getWeeklyOTRate', e);
                return { rate: 1, id: null };
            }
        }
        function getHolidayOTRate(paygroup, otsequence) {
            try {
                var paycompsql = "SELECT id, custrecord_hris_overtime_rate_ FROM customrecord_hris_payroll_component " +
                                "WHERE custrecord_hris__sequence_no_ = 38 AND isinactive='F' " +
                                "AND custrecord_hris_overtime_type_seq_no = " + otsequence + " " +
                                "AND custrecord_hris_pay_process_group = " + paygroup;
                log.debug('Holiday OT SQL', paycompsql);
                var records = getResult(paycompsql);
                log.debug("Holiday OT Records", records);
                
                if (records.length > 0) {
                    return {
                        rate: parseFloat(records[0].custrecord_hris_overtime_rate_ || 1),
                        id: records[0].id
                    };
                }
                return { rate: 1, id: null };
            } catch (e) {
                log.error('Error in getHolidayOTRate', e);
                return { rate: 1, id: null };
            }
        }
        function getgrosssalary(empid) {
            var empcompensationsql = "SELECT custrecord_hris_empchange_month_cross_sy,custrecord_hris_empchange_employee_nam FROM customrecord_hris_employee_compen_change WHERE custrecord_hris_empchange_employee_nam=" + empid + "";
            var records = getResult(empcompensationsql);
            if (records.length > 0) {
                var grosssalry = records[0].custrecord_hris_empchange_month_cross_sy || 0;
                // var overtimeid = records[0].id;

            }
            return grosssalry;
        }
        function getROTRate(paygroup, otsequence) {
            try {
                var paycompsql = "SELECT id, custrecord_hris_overtime_rate_ FROM customrecord_hris_payroll_component " +
                                "WHERE custrecord_hris__sequence_no_ = 38 AND isinactive='F' " +
                                "AND custrecord_hris_overtime_type_seq_no = " + otsequence + " " +
                                "AND custrecord_hris_pay_process_group = " + paygroup;
                log.debug('ROT OT SQL', paycompsql);
                var records = getResult(paycompsql);
                log.debug("ROT OT Records", records);
                
                if (records.length > 0) {
                    return {
                        rate: parseFloat(records[0].custrecord_hris_overtime_rate_ || 1),
                        id: records[0].id
                    };
                }
                return { rate: 1, id: null };
            } catch (e) {
                log.error('Error in getROTRate', e);
                return { rate: 1, id: null };
            }
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
            summarize: summarize
        };
    });
