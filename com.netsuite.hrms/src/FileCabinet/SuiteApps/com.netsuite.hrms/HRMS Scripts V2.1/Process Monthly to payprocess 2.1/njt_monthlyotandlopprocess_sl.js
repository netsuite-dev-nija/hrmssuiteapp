/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(["N/ui/serverWidget", "N/search", "N/log", "N/task", "N/redirect", "N/record", "N/runtime", "N/format", "N/query", "N/currentRecord", "N/https", "N/url"],
    function (serverWidget, searchModule, logModule, taskModule, redirectModule, recordModule, runtimeModule, format, query, currentRecord, https, urlMod) {
              // Function to add a leading zero to single-digit numbers
        function padZero(num) {
            return (num < 10 ? '0' : '') + num;
        }

        
        function onRequest(context) {
            var sublistValues = context.request.parameters;
            logModule.debug("sublistValues", sublistValues);


// Create a form
var form = serverWidget.createForm({
    title: "Monthly Attendance Process",
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
            var empcode=form.addField({
                id: "custpage_empcode",
                type: serverWidget.FieldType.SELECT,
                label: "Employee Code"
            
          });
          empcode.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
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
           /* var mrStatus = form.addField({
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
          // form.clientScriptModulePath = "./njt_monthlyotandlop_cs.js";


            if (context.request.method === "GET") {
               /* var statusMr = 1
                log.debug("statusMr", statusMr); */
                var monthFied = context.request.parameters.custparam_month;
                var yearField = context.request.parameters.custparam_year;
                logModule.debug("yearField", yearField);
                // var projectField = context.request.parameters.custparam_project;
                // var projectsegField = context.request.parameters.custparam_projectseg;
                var subsidiaryfield = context.request.parameters.custparam_subsi;
                 logModule.debug("subsidiaryfieldcheck", subsidiaryfield);
                 var epcodee = context.request.parameters.custparam_empcode;
         logModule.debug("epcodeecheck", epcodee);
              var empcatfield=context.request.parameters.custparam_empcat;
                 if (epcodee) {
                    form.getField({ id: "custpage_empcode" }).defaultValue = epcodee;
                }
                logModule.debug("epcodee", epcodee);

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
                setSublistvalue(sublist, query, monthFied, yearField, subsidiaryfield,epcodee,empcatfield);
                context.response.writePage(form);
            } else if (context.request.method === "POST") {
                var monthFied = sublistValues.custpage_month;
                var yearField = sublistValues.custpage_year;
                var projectField = sublistValues.custpage_project;
                 var projectsegField = sublistValues.custpage_projectseg;
                 var subsidiaryfield=sublistValues.custpage_subsi;
                 var epcCode=sublistValues.custpage_empcode;
              var empcatfield = sublistValues.custpage_empcat;


                logModule.debug("monthFied", monthFied);
                logModule.debug("yearField", yearField);
                logModule.debug("kkkk", epcCode);

                //logModule.debug("vendorValue", vendorValue);
/* var statusQuery = "select custrecord_hris_mr_sts,BUILTIN.DF(custrecord_hris_mr_sts)as name from customrecord_hris_mr_status_bar_rec where id=8";
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
                log.debug("rowArray",rowArray);
                var selectArray = [];

                for (var line = 0; line < rowArray.length; line++) {
                    var columnArray = rowArray[line].split("\u0001");
                    log.debug("columnArray",columnArray);

                    var selectObj = {};
                    var select = columnArray[0];
                     if (select == 'T') {
                        selectObj.empid = columnArray[2];
                        selectObj.employeeCode = columnArray[3];
                        selectObj.employeeName = columnArray[4];
                        // selectObj.projectId = columnArray[4]; // Extract internalAtten value
                        // selectObj.projectSegid = columnArray[5];
                        selectObj.noPresntId = columnArray[5];
                        selectObj.noAbsentId =columnArray[6];
                        selectObj.noweeklyId =columnArray[7];
                        selectObj.noholiId =columnArray[8];
                        selectObj.norotId =columnArray[9];
                        selectObj.latemin =columnArray[10];
                        selectObj.latehrs =columnArray[11];
                        // selectObj.norotId =columnArray[10];
                        selectObj.intempId =columnArray[12];
                        selectObj.parId =columnArray[13];
                        // selectObj.parId = parseInt(columnArray[12], 10);

                        selectObj.monthFiedid = monthFied;
                        selectObj.yearFiedidid = yearField;
                        selectObj.processid = true;
                        selectArray.push(selectObj);
                    }
                }
                logModule.debug("selectArray", selectArray);
                var mrTask = taskModule.create({
                    taskType: taskModule.TaskType.MAP_REDUCE,
                    scriptId: "customscript_njt_monthly_payproces_mrmon",
                    //deploymentId: "customdeploy_njt_monthattepayprocess_mrs",
                    params: {
                        custscript_njt_monthpay: JSON.stringify(selectArray)
                    }
                });
                var mrTaskId = mrTask.submit();
                log.debug("mrTaskId", mrTaskId);

                // Redirect to the second Suitelet with manager and date values as parameters
                redirectModule.toSuitelet({
                    scriptId: "customscript_hris_finalized_process_stsl",
                    deploymentId: "customdeploy_hris_finalized_process_stsl",
                    parameters: {
                        custscript_chqall_tskid_final: mrTaskId,
                    }
                });

                context.response.writePage(form);
            }
        }

        function createSublist(form) {
            var salesSublist = form.addSublist({
                id: "employeesheet",
                type: serverWidget.SublistType.LIST,
                label: "Monthly Attendance Sheet List",
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

            // var projectCode = salesSublist.addField({
            //     id: "custpage_project_code",
            //     type: serverWidget.FieldType.SELECT,
            //     label: "Project Code",
            //     source:"customrecord_cseg_njt_seg_proj"
            // });
            // projectCode.updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.HIDDEN
            // }); 
            // var projectSite = salesSublist.addField({
            //     id: "custpage_site",
            //     type: serverWidget.FieldType.SELECT,
            //     label: "Project Site",
            //     source:"customrecord_cseg_njt_seg_pros"
            // });
            // projectSite.updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.HIDDEN
            // }); 
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
            var parid = salesSublist.addField({
                id: "custpage_parid",
                type: serverWidget.FieldType.TEXT,
                label: "Parent ID",
                //source:"employee Id"
            });
          parid.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            
            

            return salesSublist;
        }

         function setSublistvalue(sublist, query, monthField, yearField, subsidiaryfield,epcodee,empcatfield) {
            try {
             /*   var setsqlquery = "SELECT " +
    "A.id AS parent_id, " + // Added parent_id from A.id
    "A.custrecord_njt_emp_atten_employee AS employeeid, " +
    "C.entityid AS emp_name, " +
    "C.custentity_hris_empcode AS emp_code, " +
    "B.custrecord_njt_emp_daily_project AS project, " +
    "B.custrecord_njt_project_site AS project_site, " +
    "SUM(CASE WHEN B.custrecord_njt_emp_daily_intatt = 1 THEN 1 ELSE 0 END) AS present_count, " +
    "SUM(CASE WHEN B.custrecord_njt_emp_daily_intatt = 2 THEN 1 ELSE 0 END) AS absent_count, " +
    "SUM(CASE WHEN B.custrecord_njt_overtime_type = 1 THEN B.custrecord_njt_ot_hours ELSE 0 END) AS weekly_ot, " +
    "SUM(CASE WHEN B.custrecord_njt_overtime_type = 2 THEN B.custrecord_njt_ot_hours ELSE 0 END) AS holi_ot, " +
    "SUM(CASE WHEN B.custrecord_njt_overtime_type = 3 THEN B.custrecord_njt_ot_hours ELSE 0 END) AS rot_ot " +
"FROM " +
    "CUSTOMRECORD_NJT_EMP_DAILY_ATTENDANCE A " +
"LEFT JOIN " +
    "CUSTOMRECORD_NJT_EMP_DAILY_ATTEN_CH B ON B.custrecord_njt_emp_daily_parent = A.id " +
"JOIN " +
    "employee C ON A.custrecord_njt_emp_atten_employee = C.id " +
"WHERE " +
    "A.custrecord_njt_emp_atten_month = '" + monthField + "' " +
    "AND A.custrecord_njt_emp_atten_year = '" + yearField + "' " +
    "AND B.custrecord_njt_emp_daily_project = '" + projectField + "' " +
    "AND B.custrecord_njt_project_site = '" + projectsegField + "' " +
    "AND A.custrecord_njt_monthly_atten_process = 'F' " +
"GROUP BY " +
    "A.id, " + // Added A.id to the GROUP BY clause
    "A.custrecord_njt_emp_atten_employee, " +
    "C.entityid, " +
    "C.custentity_hris_empcode, " +
    "B.custrecord_njt_emp_daily_project, " +
    "B.custrecord_njt_project_site " +
"ORDER BY " +
    "A.custrecord_njt_emp_atten_employee";*/

   
 /*    var monthlysql ="select a.*,e.entityid AS emp_name, e.custentity_hris_empcode AS emp_code from customrecord_hrms_monthlyattendance\
                    a join customlist_hris_month_list b  on a.custrecord_hrms_month_monthid = b.id \
                     join customlist_hris_year_master c on a.custrecord_hrms_month_yearid = c.id join\
                      employee e on e.id = a.custrecord_hrms_month_empid  where b.name ='"+monthField+"' and b.isinactive='F' and c.name='"+yearField+"'\
                     and custrecord_hrms_month_project ='"+projectField+"' and custrecord_hrms_month_projectsite ='" +projectsegField+"'  and c.isinactive='F'"
 */
if(epcodee){
    var monthlysql = 
    "SELECT a.*, " +
    "e.entityid AS emp_name, " +
    "e.custentity_hris_empcode AS emp_code, " +
    "e.subsidiary, " +
    "e.id, " +
    "a.custrecord_hrms_month_late_mins AS latemin, " +
    "a.custrecord_hrms_month_late_hrs AS latehrs, " +
    "FROM customrecord_hrms_monthlyattendance a " +
    "JOIN customlist_hris_month_list b ON a.custrecord_hrms_month_monthid = b.id " +
    "JOIN customlist_hris_year_master c ON a.custrecord_hrms_month_yearid = c.id " +
    "JOIN employee e ON e.id = a.custrecord_hrms_month_empid " +
    "WHERE b.id = " + monthField + " " +
    "AND b.isinactive = 'F' " +
    "AND c.id = " + yearField + " " +
    "AND a.custrecord_njt_hrms_monthly_status = 1 " +
    "AND e.id = '" + epcodee + "' " +
    "AND e.subsidiary = '" + subsidiaryfield + "' " +
    "AND c.isinactive = 'F';";

    
    
 
                logModule.debug("Monthly SQL Query", monthlysql);
        
                // Run the SuiteQL query
                var queryResult = query.runSuiteQL({ query: monthlysql });
                var tsResult = queryResult.asMappedResults();
                logModule.debug("tsResult",tsResult);
                logModule.debug("tsResult length",tsResult.length);
        
                // Loop through the results and set sublist values
                for (var loop = 0; loop < tsResult.length; loop++) {
                    var rec = tsResult[loop];
        
                    var empid = rec.custrecord_hrms_month_empid||"";
                    var empname = rec.emp_name;
                    var empCode=rec.emp_code;
                    var project=rec.custrecord_hrms_month_project;
                    var projectSeg=rec.custrecord_hrms_month_projectsite;
                    var internalAttendanceType = rec.custrecord_hrms_month_presentdays || 0; // Default to 0 if PresentCount is null
                    var absentCount = rec.custrecord_hrms_month_absentdays || 0;
                    var weeklyOTHours = rec.custrecord_hrms_month_weeklyothrs || 0;
                    var holiOt=rec.custrecord_hrms_month_holidayothrs || 0;
                    var rotOt=rec.custrecord_hrms_month_rothrs || 0;
                     var parId=rec.id     
                     var latemin=rec.latemin||0;
                     var latehrs=rec.latehrs||0;

                     log.debug("parIdfromquery",parId);
                    

                    try {
                        
                         sublist.setSublistValue({
                            id: "custpage_de_empid",
                            line: loop,
                            value: empid||"",
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_de_empintid",
                            line: loop,
                            value: empid||"",
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_de_name",
                            line: loop,
                            value: empname,
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_de_empidcode",
                            line: loop,
                            value: empCode,
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_project_code",
                            line: loop,
                            value: project,
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_site",
                            line: loop,
                            value: projectSeg,
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_noofpresent",
                            line: loop,
                            value: internalAttendanceType.toString(),
                            ignoreFieldChange: true,
                        });
                        
                        sublist.setSublistValue({
                            id: "custpage_noofabsent",
                            line: loop,
                            value: absentCount.toString(),
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_weeklyot",
                            line: loop,
                            value: weeklyOTHours.toString(),
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_holiot",
                            line: loop,
                            value: holiOt.toString(),
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_rothours",
                            line: loop,
                            value: rotOt.toString(),
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_latemin",
                            line: loop,
                            value: latemin.toString(),
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_latehrs",
                            line: loop,
                            value: latehrs.toString(),
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_parid",
                            line: loop,
                            value: parId,
                            ignoreFieldChange: true,
                        });
        
                    } catch (e) {
                        logModule.error("Error setting sublist value at line " + loop, e);
                    }
                }
            }
            else{
                
                var monthlysql = 
    "SELECT a.*, e.entityid AS emp_name, e.custentity_hris_empcode AS emp_code, e.subsidiary " +
    "FROM customrecord_hrms_monthlyattendance a " +
    "JOIN customlist_hris_month_list b ON a.custrecord_hrms_month_monthid = b.id " +
    "JOIN customlist_hris_year_master c ON a.custrecord_hrms_month_yearid = c.id " +
    "JOIN employee e ON e.id = a.custrecord_hrms_month_empid " +
    "WHERE b.id = " + monthField + " AND b.isinactive = 'F' " +
     "AND c.id = " + yearField + " AND a.custrecord_njt_hrms_monthly_status = 1 " +
    "AND e.subsidiary = '" + subsidiaryfield + "' ";

// Conditionally add employee category filter
if (empcatfield) {
    monthlysql += "AND e.custentity_hris_empcategory = " + empcatfield + " ";
}

monthlysql += "AND c.isinactive = 'F' and a.custrecord_hrms_month_processcompleted='F'";




           logModule.debug("Monthly SQL Query", monthlysql);
   
           // Run the SuiteQL query
           var queryResult = query.runSuiteQL({ query: monthlysql });
           var tsResult = queryResult.asMappedResults();
           logModule.debug("tsResult",tsResult);
           logModule.debug("tsResult length",tsResult.length);
   
           // Loop through the results and set sublist values
           for (var loop = 0; loop < tsResult.length; loop++) {
               var rec = tsResult[loop];
   
               var empid = rec.custrecord_hrms_month_empid||"";
               var empname = rec.emp_name;
               var empCode=rec.emp_code;
               var project=rec.custrecord_hrms_month_project;
               var projectSeg=rec.custrecord_hrms_month_projectsite;
               var internalAttendanceType = rec.custrecord_hrms_month_presentdays || 0; // Default to 0 if PresentCount is null
               var absentCount = rec.custrecord_hrms_month_absentdays || 0;
               var weeklyOTHours = rec.custrecord_hrms_month_weeklyothrs || 0;
               var holiOt=rec.custrecord_hrms_month_holidayothrs || 0;
               var rotOt=rec.custrecord_hrms_month_rothrs || 0;
               var parId=rec.id     
               

               try {
                   
                    sublist.setSublistValue({
                       id: "custpage_de_empid",
                       line: loop,
                       value: empid||"",
                       ignoreFieldChange: true,
                   });
                   sublist.setSublistValue({
                       id: "custpage_de_empintid",
                       line: loop,
                       value: empid||"",
                       ignoreFieldChange: true,
                   });
                   sublist.setSublistValue({
                       id: "custpage_de_name",
                       line: loop,
                       value: empname,
                       ignoreFieldChange: true,
                   });
                   sublist.setSublistValue({
                       id: "custpage_de_empidcode",
                       line: loop,
                       value: empCode,
                       ignoreFieldChange: true,
                   });
                   sublist.setSublistValue({
                       id: "custpage_project_code",
                       line: loop,
                       value: project,
                       ignoreFieldChange: true,
                   });
                   sublist.setSublistValue({
                       id: "custpage_site",
                       line: loop,
                       value: projectSeg,
                       ignoreFieldChange: true,
                   });
                   sublist.setSublistValue({
                       id: "custpage_noofpresent",
                       line: loop,
                       value: internalAttendanceType.toString(),
                       ignoreFieldChange: true,
                   });
                   
                   sublist.setSublistValue({
                       id: "custpage_noofabsent",
                       line: loop,
                       value: absentCount.toString(),
                       ignoreFieldChange: true,
                   });
                   sublist.setSublistValue({
                       id: "custpage_weeklyot",
                       line: loop,
                       value: weeklyOTHours.toString(),
                       ignoreFieldChange: true,
                   });
                   sublist.setSublistValue({
                       id: "custpage_holiot",
                       line: loop,
                       value: holiOt.toString(),
                       ignoreFieldChange: true,
                   });
                   sublist.setSublistValue({
                       id: "custpage_rothours",
                       line: loop,
                       value: rotOt.toString(),
                       ignoreFieldChange: true,
                   });
                   sublist.setSublistValue({
                       id: "custpage_parid",
                       line: loop,
                       value: parId,
                       ignoreFieldChange: true,
                   });
   
               } catch (e) {
                   logModule.error("Error setting sublist value at line " + loop, e);
               }
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
