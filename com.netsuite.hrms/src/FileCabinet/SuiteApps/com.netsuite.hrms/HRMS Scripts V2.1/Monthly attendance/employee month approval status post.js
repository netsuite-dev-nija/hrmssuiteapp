/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(["N/ui/serverWidget", "N/search", "N/log", "N/task", "N/redirect", "N/record", "N/runtime", "N/format", "N/query", "N/currentRecord", "N/https", "N/url"],
    function (serverWidget, searchModule, logModule, taskModule, redirectModule, recordModule, runtimeModule, format, query, currentRecord, https, urlMod) {
      var monthMapping = {
            '1': 'January',
            '2': 'February',
            '3': 'March',
            '4': 'April',
            '5': 'May',
            '6': 'June',
            '7': 'July',
            '8': 'August',
            '9': 'September',
            '10': 'October',
            '11': 'November',
            '12': 'December',
        };
      var yearMapping = {
        '1': '2019',
        '2': '2020',
        '3': '2021',
        '4': '2022',
        '5': '2023',
        '6': '2024',
        '7': '2025',
        '8': '2026',
        };
    
        // Function to add a leading zero to single-digit numbers
        function padZero(num) {
            return (num < 10 ? '0' : '') + num;
        }

        // Function to get the abbreviated day name from day index
        function getDayName(dayIndex) {
            switch (dayIndex) {
                case 0: return 'Sun';
                case 1: return 'Mon';
                case 2: return 'Tue';
                case 3: return 'Wed';
                case 4: return 'Thu';
                case 5: return 'Fri';
                case 6: return 'Sat';
                default: return '';
            }
        }
        function onRequest(context) {
            var sublistValues = context.request.parameters;
            logModule.debug("sublistValues", sublistValues);


// Create a form
var form = serverWidget.createForm({
    title: "Employee Monthly attendance Approval Process",
});

           // Add fields to the form
var monthField = form.addField({
    id: "custpage_month",
    type: serverWidget.FieldType.SELECT,
    label: "Month",
    source: "customlist_hris_month_list",
});
monthField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            var yearField = form.addField({
                id: "custpage_year",
                type: serverWidget.FieldType.SELECT,
                label: "Year",
                source: "customlist_hris_year_master",
            });
            yearField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            // var projectField = form.addField({
            //     id: "custpage_project",
            //     type: serverWidget.FieldType.SELECT,
            //     label: "Project",
            //     source: "customrecord_cseg_njt_seg_proj",
            // });
            // projectField.updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.DISABLED
            // });
            // var projectsegField = form.addField({
            //     id: "custpage_projectseg",
            //     type: serverWidget.FieldType.SELECT,
            //     label: "Project Site",
            //     source: "customrecord_cseg_njt_seg_pros",
            // });
            // projectsegField.updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.DISABLED
            // });
            var subsidiaryfield=form.addField({
                id: "custpage_subsi",
                type: serverWidget.FieldType.SELECT,
                label: "Subsidairy",
                source: "subsidiary",
            });
            subsidiaryfield.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
           var empcatfield=form.addField({
                id: "custpage_empcat",
                type: serverWidget.FieldType.SELECT,
                label: "Employee Category",
                source: "customrecord_hris_employeecategory",
            });
            empcatfield.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            var nextapprovalField = form.addField({
                id: "custpage_nextapproval",
                type: serverWidget.FieldType.SELECT,
                label: "Approval Status",
                source: "customlist_njt_monthly_status_list",
            });
           /*  var mrStatus = form.addField({
                id: 'custpage_mr_status',
                type: serverWidget.FieldType.SELECT,
                label: 'MRS Status Field',
                //container: 'status'
            });
            mrStatus.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED,
            }); */
        
            form.addSubmitButton({
                label: "Submit",
            });
          // Set client script module path
            //form.clientScriptModulePath = "./approval status in monthly attendance cl.js";

            if (context.request.method === "GET") {
               /* var statusMr = 1
                log.debug("statusMr", statusMr); */
                var monthFied = context.request.parameters.custparam_month;
                var yearField = context.request.parameters.custparam_year;
                logModule.debug("yearField", yearField);
                // var projectField = context.request.parameters.custparam_project;
                // var projectsegField = context.request.parameters.custparam_projectseg;
               var subsidiaryfield=context.request.parameters.custparam_subsi;
              var empcatfield=context.request.parameters.custparam_empcat;
                if (monthFied) {
                    form.getField({ id: "custpage_month" }).defaultValue = monthFied;
                }
                if (yearField) {
                    form.getField({ id: "custpage_year" }).defaultValue = yearField;
                }
                // if (projectField) {
                //     form.getField({ id: "custpage_project" }).defaultValue = projectField;
                // }
                // if (projectsegField) {
                //     form.getField({ id: "custpage_projectseg" }).defaultValue = projectsegField;
                // }
                if (subsidiaryfield) {
                    form.getField({ id: "custpage_subsi" }).defaultValue = subsidiaryfield;
                }
                logModule.debug("subsidiaryfieldcheckpart1", subsidiaryfield);
               if (empcatfield) {
                    form.getField({ id: "custpage_empcat" }).defaultValue = empcatfield;
                }
                var sublist = createSublist(form);
                setSublistvalue(sublist, query, monthFied, yearField, subsidiaryfield,empcatfield);
                context.response.writePage(form);
            } else if (context.request.method === "POST") {
                var monthFied = sublistValues.custpage_month;
                var yearField = sublistValues.custpage_year;
                // var projectField = sublistValues.custpage_project;
                //  var projectsegField = sublistValues.custpage_projectseg;
                var subsidiaryfield=sublistValues.custpage_subsi;
                var nextapprovalField=sublistValues.custpage_nextapproval;
              var empcatfield = sublistValues.custpage_empcat;

                logModule.debug("monthFied", monthFied);
                logModule.debug("yearField", yearField);
                //logModule.debug("vendorValue", vendorValue);
               /*  var statusQuery = "select custrecord_hris_mr_sts,BUILTIN.DF(custrecord_hris_mr_sts)as name from customrecord_hris_mr_status_bar_rec where id=7";
                var queryResults = query.runSuiteQL({
                    query: statusQuery
                });
                var records = queryResults.asMappedResults();

                if (records.length > 0) {
                    for (var r = 0; r < records.length; r++) {
                        var record = records[r];
                        var name = record.name;
                        var id = record.custrecord_hris_mr_sts; // Assuming 'id' is the value you want to set

                        mrStatus.addSelectOption({
                            value: id,
                            text: name,
                            isSelected: true
                        });
                         
                       
                    }
                }
                 
                var statusMr = context.request.parameters.custpage_mr_status; */

                var rowArray = sublistValues.employeesheetdata.split("\u0002");
                var selectArray = [];

                for (var line = 0; line < rowArray.length; line++) {
                    var columnArray = rowArray[line].split("\u0001");
                  logModule.debug("columnArray",columnArray);
                    var selectObj = {};
                    var select = columnArray[0];
                     if (select == 'T') {
                        selectObj.childId =columnArray[15];
                        selectObj.nextapprovalField = nextapprovalField;
                        selectArray.push(selectObj);
                    }
                }
                logModule.debug("selectArray", selectArray);
                var mrTask = taskModule.create({
                    taskType: taskModule.TaskType.MAP_REDUCE,
                    scriptId: "customscript_n21_approver_sts_mr",
                   // deploymentId: "customdeploy_njt_approver_sts_mr",
                    params: {
                        custscript_n21_column_array_selectmr: JSON.stringify(selectArray)
                    }
                });
                var mrTaskId = mrTask.submit();
                log.debug("mrTaskId", mrTaskId);

                // Redirect to the second Suitelet with manager and date values as parameters
                redirectModule.toSuitelet({
                    scriptId: 'customscript_n21_emp_month_appr_pro',
                    deploymentId: 'customdeploy_n21_emp_month_appr_pro',
                });

                context.response.writePage(form);
            }
        }

        function createSublist(form) {
            var salesSublist = form.addSublist({
                id: "employeesheet",
                type: serverWidget.SublistType.LIST,
                label: "Employee Monthly Sheet List",
            });
            salesSublist.addMarkAllButtons();
            salesSublist.addRefreshButton();
            salesSublist.addField({
                id: "custpage_de_check",
                type: serverWidget.FieldType.CHECKBOX,
                label: "Select",
            });
            var empid = salesSublist.addField({
                id: "custpage_de_empid",
                type: serverWidget.FieldType.SELECT,
                label: "Employee ID",
                source:"employee"
            });
          empid.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            }); 
            var empcode = salesSublist.addField({
                id: "custpage_de_empidcode",
                type: serverWidget.FieldType.TEXT,
                label: "Employee Code",
            });
           
            salesSublist.addField({
                id: "custpage_de_name",
                type: serverWidget.FieldType.TEXT,
                label: "Employee Name",
            });

            var projectCode = salesSublist.addField({
                id: "custpage_project_code",
                type: serverWidget.FieldType.SELECT,
                label: "Project Code",
                source:"customrecord_cseg_njt_seg_proj"
            });
            projectCode.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            }); 
            var projectSite = salesSublist.addField({
                id: "custpage_site",
                type: serverWidget.FieldType.SELECT,
                label: "Project Site",
                source:"customrecord_cseg_njt_seg_pros"
            });
            projectSite.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            }); 
            /* attenchildid.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            }); */
            var Noofpresent = salesSublist.addField({
                id: "custpage_noofpresent",
                type: serverWidget.FieldType.TEXT,
                label: "No of Present",
            });
            var noofabsent=salesSublist.addField({
                id: "custpage_noofabsent",
                type: serverWidget.FieldType.TEXT,
                label: "No Of Absent",
            }); 
            var weeklyOt=salesSublist.addField({
                id: "custpage_weeklyot",
                type: serverWidget.FieldType.TEXT,
                label: "Weeklyoff OT Hours",
            });
            var holidayOt=salesSublist.addField({
                id: "custpage_holiot",
                type: serverWidget.FieldType.TEXT,
                label: "Holiday OT Hours",
            });
            var rotHours=salesSublist.addField({
                id: "custpage_rothours",
                type: serverWidget.FieldType.TEXT,
                label: "ROT Hours",
            });
            var Latemin=salesSublist.addField({
                id: "custpage_latemin",
                type: serverWidget.FieldType.TEXT,
                label: "Late Min",
            });
            var Latehrs=salesSublist.addField({
                id: "custpage_latehrs",
                type: serverWidget.FieldType.TEXT,
                label: "Late Hours",
            });
            var employeeintid = salesSublist.addField({
                id: "custpage_de_empintid",
                type: serverWidget.FieldType.TEXT,
                label: "Employee ID",
                //source:"employee Id"
            });
          employeeintid.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var childId = salesSublist.addField({
                id: "custpage_de_chilid",
                type: serverWidget.FieldType.TEXT,
                label: "Child ID",
                //source:"employee Id"
            });
          childId.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            

            return salesSublist;
        }

         function setSublistvalue(sublist, query, monthFied, yearField, subsidiaryfield,empcatfield) {
            try {
                var setsqlquery = "SELECT " +
                "A.custrecord_hrms_month_absentdays AS absent_count, " +
                "A.custrecord_hrms_month_empid AS employeeid, " +
                "BUILTIN.DF(A.custrecord_hrms_month_empid) AS emp_name, " +
                "A.custrecord_hrms_month_holidayothrs AS holi_ot, " +
                "A.isInactive, " +
                "A.id AS child_id, " +
                "A.custrecord_hrms_month_monthid, " +
                "A.custrecord_hrms_month_paydate, " +
                "A.custrecord_hrms_month_paygroup, " +
                "A.custrecord_hrms_month_presentdays AS presenting_count, " +
                "A.custrecord_hrms_month_project AS project_name, " +
                "A.custrecord_hrms_month_projectsite AS project_seg, " +
                "A.custrecord_hrms_month_rothrs AS rotOt, " +
                "A.scriptId, " +
                "A.custrecord_hrms_month_weeklyothrs AS weekly_ot, " +
                "A.custrecord_hrms_month_yearid, " +
                "A.custrecord_hrms_month_rothrs AS rot_ot, " +
                "A.custrecord_hrms_month_late_mins AS latemin, " +
                "A.custrecord_hrms_month_late_hrs AS latehrs, " +
                "C.subsidiary, " +
                "C.custentity_hris_empcode AS emp_code " +
            "FROM " +
                "CUSTOMRECORD_HRMS_MONTHLYATTENDANCE A " +
            "INNER JOIN " +
                "employee C " +
            "ON " +
                "A.custrecord_hrms_month_empid = C.id " +
            "WHERE " +
                "A.custrecord_hrms_month_monthid = " + monthFied + " " +               
                "AND A.custrecord_hrms_month_yearid = " + yearField + " " +
                "AND C.subsidiary = " + subsidiaryfield + " ";

// Conditionally add employee category filter
if (empcatfield) {
    setsqlquery += "AND C.custentity_hris_empcategory = " + empcatfield + " ";
}

setsqlquery += "AND (A.custrecord_njt_hrms_monthly_status = 2 OR A.custrecord_njt_hrms_monthly_status IS NULL);";
            


                logModule.debug("Generated SQL Query", setsqlquery);
        
                // Run the SuiteQL query
                var queryResult = query.runSuiteQL({ query: setsqlquery });
                var tsResult = queryResult.asMappedResults();
                logModule.debug("tsResult",tsResult);
                logModule.debug("tsResult length",tsResult.length);
        
                // Loop through the results and set sublist values
                for (var loop = 0; loop < tsResult.length; loop++) {
                    var rec = tsResult[loop];
        
                    var empid = rec.employeeid||"";
                    var empname = rec.emp_name;
                    var empCode=rec.emp_code ||"";
                    var project=rec.project_name;
                    var projectSeg=rec.project_seg;
                    var internalAttendanceType = rec.presenting_count || 0; // Default to 0 if PresentCount is null
                    var absentCount = rec.absent_count || 0;
                    var weeklyOTHours = rec.weekly_ot || 0;
                    var holiOt=rec.holi_ot || 0;
                    var rotOt=rec.rot_ot || 0;
                    var childId=rec.child_id;
                    var latemin=rec.latemin||0;
                    var latehrs=rec.latehrs||0;
        
                    

                    try {
                        if(empid){
                         sublist.setSublistValue({
                            id: "custpage_de_empid",
                            line: loop,
                            value: empid||"",
                            ignoreFieldChange: true,
                        }); 
                        }
                         if(empCode){
                           sublist.setSublistValue({
                            id: "custpage_de_empidcode",
                            line: loop,
                            value: empCode,
                            ignoreFieldChange: true,
                        });
                         }
                        if(empname){
                           sublist.setSublistValue({
                            id: "custpage_de_name",
                            line: loop,
                            value: empname,
                            ignoreFieldChange: true,
                        });
                        }
                       if(project){
                         sublist.setSublistValue({
                            id: "custpage_project_code",
                            line: loop,
                            value: project,
                            ignoreFieldChange: true,
                        });
                       }
                        if(projectSeg){
                          sublist.setSublistValue({
                            id: "custpage_site",
                            line: loop,
                            value: projectSeg,
                            ignoreFieldChange: true,
                        });
                        }
                        if(internalAttendanceType){
                          sublist.setSublistValue({
                            id: "custpage_noofpresent",
                            line: loop,
                            value: internalAttendanceType.toString(),
                            ignoreFieldChange: true,
                        });
                        }
                        
                       // if(absentCount){
                          sublist.setSublistValue({
                            id: "custpage_noofabsent",
                            line: loop,
                            value: absentCount.toString(),
                            ignoreFieldChange: true,
                        });
                       // }
                       // if(weeklyOTHours){
                          sublist.setSublistValue({
                            id: "custpage_weeklyot",
                            line: loop,
                            value: weeklyOTHours.toString(),
                            ignoreFieldChange: true,
                        });
                        //}
                      //  if(holiOt){
                          sublist.setSublistValue({
                            id: "custpage_holiot",
                            line: loop,
                            value: holiOt.toString(),
                            ignoreFieldChange: true,
                        });
                      //  }
                       // if(rotOt){
                          sublist.setSublistValue({
                            id: "custpage_rothours",
                            line: loop,
                            value: rotOt.toString(),
                            ignoreFieldChange: true,
                        });
                       // }
                       // if(latemin){
                          sublist.setSublistValue({
                            id: "custpage_latemin",
                            line: loop,
                            value: latemin.toString(),
                            ignoreFieldChange: true,
                        });
                       // }
                       // if(latehrs){
                           sublist.setSublistValue({
                            id: "custpage_latehrs",
                            line: loop,
                            value: latehrs.toString(),
                            ignoreFieldChange: true,
                        });
                      //  }
                       
                      if(empid){
                        sublist.setSublistValue({
                            id: "custpage_de_empintid",
                            line: loop,
                            value: empid||"",
                            ignoreFieldChange: true,
                        });
                      }
                        if(childId){
                          sublist.setSublistValue({
                            id: "custpage_de_chilid",
                            line: loop,
                            value: childId||"",
                            ignoreFieldChange: true,
                        });
                        }
                        
                       
        
                    } catch (e) {
                        logModule.error("Error setting sublist value at line " + loop, e);
                    }
                }
            } catch (error) {
                logModule.error("Error in setSublistvalue function", error);
            }
        }
        
        return {
            onRequest: onRequest,
        };
    });
