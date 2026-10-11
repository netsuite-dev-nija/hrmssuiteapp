/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
var Email;
define(["N/ui/serverWidget", "N/search", "N/log", "N/task", "N/redirect", "N/record", "N/runtime", "N/format", "N/query", "N/currentRecord", "N/https", "N/url", 'N/email'],
    function (serverWidget, search, log, task, redirect, record, runtime, format, query, currentRecord, https, url, email) {
        Email = email;

        function onRequest(context) {
            var sublistValues = context.request.parameters;
            log.debug("sublistValues", sublistValues);

            var currentUser = runtime.getCurrentUser();

            var roleId = currentUser.role;      // Role internal ID
            var roleName = currentUser.roleId;

            var userId = runtime.getCurrentUser().id;
            log.debug("Logged in User ID", userId);

            var form = serverWidget.createForm({
                title: "Employee Regular Monthly attendance",
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
            var paygroupField = form.addField({
                id: "custpage_paygroup",
                type: serverWidget.FieldType.SELECT,
                label: "Pay Group",
                source: "customrecord_hris_process_groupmaster",
            });
            paygroupField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            var subsidiaryfield = form.addField({
                id: "custpage_subsi",
                type: serverWidget.FieldType.SELECT,
                label: "Subsidairy",
                source: "subsidiary",
            });
            subsidiaryfield.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            var locationfield = form.addField({
                id: "custpage_location",
                type: serverWidget.FieldType.SELECT,
                label: "Location",
                source: "customrecord_cseg_hris_emploc",
            });
            locationfield.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            var employeecount = form.addField({
                id: 'custpage_count',
                type: serverWidget.FieldType.INTEGER,
                label: 'COUNT',
            });
            employeecount.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED,
            });

            form.addSubmitButton({
                label: "Submit",
            });

            if (context.request.method === "GET") {
                var statusMr = 1;
                log.debug("statusMr", statusMr);
                var monthFied = context.request.parameters.custparam_month;
                var yearField = context.request.parameters.custparam_year;
                var payGroup = context.request.parameters.custparam_paygroup;
                var locationField = context.request.parameters.custparam_location;
                log.debug("yearField", yearField);
                log.debug('monthFied', monthFied);
                log.debug('payGroup', payGroup);
                log.debug('locationField', locationField);
                var subsidiaryfield = context.request.parameters.custparam_subsi;
                log.debug("subsidiaryfieldcheck", subsidiaryfield);

                if (monthFied) {
                    form.getField({ id: "custpage_month" }).defaultValue = monthFied;
                }
                if (yearField) {
                    form.getField({ id: "custpage_year" }).defaultValue = yearField;
                }
                if (payGroup) {
                    form.getField({ id: "custpage_paygroup" }).defaultValue = payGroup;
                }
                if (locationField) {
                    form.getField({ id: "custpage_location" }).defaultValue = locationField;
                }
                if (subsidiaryfield) {
                    form.getField({ id: "custpage_subsi" }).defaultValue = subsidiaryfield;
                }

                // Fetch Start and End dates from customrecord_hris_wage_period_details
                var wagePeriodDates = getWagePeriodDates(payGroup, monthFied, yearField);
                var WStartDate = wagePeriodDates.startDate;
                var WEndDate = wagePeriodDates.endDate;

                log.emergency('WStartDate', WStartDate);
                log.emergency('WEndDate', WEndDate);

                var sublist = createSublist(form);
                var setcount = setSublistvalue(sublist, query, monthFied, yearField, subsidiaryfield, WStartDate, WEndDate, locationField, roleId, userId);
                employeecount.defaultValue = parseInt(setcount);
                context.response.writePage(form);
            } else if (context.request.method === "POST") {
                var monthFied = sublistValues.custpage_month;
                var yearField = sublistValues.custpage_year;
                var payGroup = sublistValues.custpage_paygroup;
                var subsidiaryfield = sublistValues.custpage_subsi;
                var departmentField = sublistValues.custpage_department;
                var locationField = sublistValues.custpage_location;

                log.debug("monthFied", monthFied);
                log.debug("yearField", yearField);
                log.debug("payGroup", payGroup);

                var wagePeriodDates = getWagePeriodDates(payGroup, monthFied, yearField);
                var WStartDate = wagePeriodDates.startDate;
                var WEndDate = wagePeriodDates.endDate;

                var statusQuery = "select custrecord_hris_mr_sts,BUILTIN.DF(custrecord_hris_mr_sts)as name from customrecord_hris_mr_status_bar_rec where id=15";
                var queryResults = query.runSuiteQL({
                    query: statusQuery
                });
                var records = queryResults.asMappedResults();

                var statusMr = context.request.parameters.custpage_mr_status;
                var rowArray = sublistValues.employeesheetdata.split("\u0002");
                var selectArray = [];

                for (var line = 0; line < rowArray.length; line++) {
                    var columnArray = rowArray[line].split("\u0001");
                    log.debug("coulmnArray", columnArray);
                    var selectObj = {};
                    var select = columnArray[0];
                    if (select == 'T') {
                        selectObj.empid = columnArray[2];
                        selectObj.noPresntId = columnArray[7];
                        selectObj.noAbsentId = columnArray[8];
                        selectObj.noweeklyId = "";
                        selectObj.noholiId = "";
                        selectObj.norotId = columnArray[9];
                        selectObj.intempId = columnArray[10];
                        selectObj.parId = columnArray[11];
                        selectObj.monthFiedid = monthFied;
                        selectObj.yearFiedidid = yearField;
                        selectObj.processid = true;
                        selectObj.WStartDate = WStartDate;
                        selectObj.WEndDate = WEndDate;
                        selectObj.compOff = columnArray[12];
                        selectObj.compOffRound = columnArray[13];
                        selectArray.push(selectObj);
                    }
                }
                log.emergency("selectArray", selectArray);
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: "customscript_hr21_dailytomon_process_mrs",
                    deploymentId: "customdeploy_hr21_dailytomon_process_mrs",
                    params: {
                        custscript_hris_dailytomon_array: JSON.stringify(selectArray)
                    }
                });
                var mrTaskId = mrTask.submit();
                log.debug("mrTaskId", mrTaskId);

                redirect.toSuitelet({
                    scriptId: "customscript_hr21_dailytomon_status_sl",
                    deploymentId: "customdeploy_hr21_dailytomon_status_sl",
                    parameters: {
                        custscript_chqall_tskid: mrTaskId,
                    }
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
                label: "Employee",
                source: "employee"
            });
           empid.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            var empcode = salesSublist.addField({
                id: "custpage_de_empidcode",
                type: serverWidget.FieldType.TEXT,
                label: "Employee Code"
            });
            empcode.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            var empname = salesSublist.addField({
                id: "custpage_de_name",
                type: serverWidget.FieldType.TEXT,
                label: "Employee Name"
            });
            empname.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            var projectCode = salesSublist.addField({
                id: "custpage_project_code",
                type: serverWidget.FieldType.SELECT,
                label: "Project Code",
                source: "customrecord_cseg_njt_seg_proj"
            });
            projectCode.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            var projectSite = salesSublist.addField({
                id: "custpage_site",
                type: serverWidget.FieldType.SELECT,
                label: "Project Site",
                source: "customrecord_cseg_njt_seg_pros"
            });
            projectSite.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var Noofpresent = salesSublist.addField({
                id: "custpage_noofpresent",
                type: serverWidget.FieldType.TEXT,
                label: "No of Present",
            });
            var noofabsent = salesSublist.addField({
                id: "custpage_noofabsent",
                type: serverWidget.FieldType.TEXT,
                label: "No Of Absent",
            });
            var rotHours = salesSublist.addField({
                id: "custpage_rothours",
                type: serverWidget.FieldType.TEXT,
                label: "OT Hours",
            });
            var employeeintid = salesSublist.addField({
                id: "custpage_de_empintid",
                type: serverWidget.FieldType.TEXT,
                label: "Employee ID",
            });
            employeeintid.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var parid = salesSublist.addField({
                id: "custpage_parid",
                type: serverWidget.FieldType.TEXT,
                label: "Parent ID",
            });
            parid.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            var compOffField = salesSublist.addField({
                id: "custpage_compoff",
                type: serverWidget.FieldType.TEXT,
                label: "Comp Off"
            });
            compOffField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            var compOffRoundField = salesSublist.addField({
                id: "custpage_compoffround",
                type: serverWidget.FieldType.TEXT,
                label: "Comp Off Roundoff"
            });
            compOffRoundField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            return salesSublist;
        }

        function setSublistvalue(sublist, query, monthField, yearField, subsidiaryfield, WStartDate, WEndDate, locationField, roleId, userId) {
            try {
                var count = 0;
                var managerFilter = (roleId == 1294 || roleId == 3) ? "" : " AND C.custentity_hris_emplinemanger = " + userId + " ";
                var locationFilter = locationField ? " AND C.custentity_hris_empdlocation_new = " + locationField + " " : "";

                // 1. Timesheet Query grouping safely by employee, date, and project
                var tsSql = 
                    "SELECT " +
                    "    employee_id, " +
                    "    COUNT(DISTINCT timesheet_date) AS present_count, " +
                    "    SUM(ot_hours) AS ot_hours, " +
                    "    SUM(emp_actual_working_hours) AS emp_actual_working_hours " +
                    "FROM (" +
                    "    SELECT " +
                    "        T.custrecord_hris_daily_time_over_emp AS employee_id, " +
                    "        T.custrecord_hris_dail_timeheet_date AS timesheet_date, " +
                    "        T.custrecord_hris_daily_time_projectoveral AS project, " +
                    "        SUM(NVL(T.custrecord_hris_dailytime_othoursoverall, 0)) AS ot_hours, " +
                    "        SUM(NVL(T.custrecord_hris_daily_time_workinghours, 0)) AS emp_actual_working_hours " +
                    "    FROM customrecord_hris_daily_timesheet_overal T " +
                    "    JOIN employee C ON T.custrecord_hris_daily_time_over_emp = C.id " +
                    "    WHERE " +
                    "        T.custrecord_hris_dail_timeheet_date BETWEEN TO_DATE('" + WStartDate + "', 'DD/MM/YYYY') AND TO_DATE('" + WEndDate + "', 'DD/MM/YYYY') " +
                    "        AND C.subsidiary = " + subsidiaryfield + " " +
                    locationFilter +
                    "    GROUP BY " +
                    "        T.custrecord_hris_daily_time_over_emp, " +
                    "        T.custrecord_hris_dail_timeheet_date, " +
                    "        T.custrecord_hris_daily_time_projectoveral " +
                    ") " +
                    "GROUP BY " +
                    "    employee_id";

                // 2. Leave Application Query (Paid = Present, Unpaid = Absent)
                var leaveSql = 
                    "SELECT " +
                    "    LA.id AS leave_application_id, " +
                    "    LA.custrecord_hris_lve_employeename AS employee_id, " +
                    "    TO_CHAR(LA.custrecord_hris_lve_fromdate, 'YYYY-MM-DD') AS from_date, " +
                    "    TO_CHAR(LA.custrecord_hris_lve_todate, 'YYYY-MM-DD') AS to_date, " +
                    "    LC.custrecord_hris_lveconfig_unpaid AS is_unpaid " +
                    "FROM " +
                    "    customrecord_hris_leaveapplication LA " +
                    "JOIN " +
                    "    customrecord_hris_leaveconfig LC ON LA.custrecord_hris_lve_leavetype = LC.id " +
                    "JOIN " +
                    "    employee C ON LA.custrecord_hris_lve_employeename = C.id " +
                    "WHERE " +
                    "    LA.custrecord_hris_lve_fromdate <= TO_DATE('" + WEndDate + "', 'DD/MM/YYYY') " +
                    "    AND LA.custrecord_hris_lve_todate >= TO_DATE('" + WStartDate + "', 'DD/MM/YYYY') " +
                    "    AND C.subsidiary = " + subsidiaryfield + " " +
                    locationFilter +
                    "    AND (LA.custrecord_hris_lve_cancellation = 'F' OR LA.custrecord_hris_lve_cancellation IS NULL)";

                log.debug("Generated Timesheet SQL", tsSql);
                log.debug("Generated Leave SQL", leaveSql);

                var employeeMap = {};

                // Process Timesheet Data
                var tsResult = query.runSuiteQL({ query: tsSql }).asMappedResults();
                for (var i = 0; i < tsResult.length; i++) {
                    var empId = tsResult[i].employee_id;
                    if (!employeeMap[empId]) {
                        employeeMap[empId] = {
                            employee_id: empId,
                            present_count: 0,
                            absent_count: 0,
                            ot_hours: 0
                        };
                    }
                    employeeMap[empId].present_count += parseFloat(tsResult[i].present_count || 0);
                    employeeMap[empId].ot_hours += parseFloat(tsResult[i].ot_hours || 0);
                }

                // Process Leave Data
                var leaveResult = query.runSuiteQL({ query: leaveSql }).asMappedResults();
                var rangeStart = parseDMY(WStartDate);
                var rangeEnd = parseDMY(WEndDate);
                for (var j = 0; j < leaveResult.length; j++) {
                    var leaveRow = leaveResult[j];
                    var empId = leaveRow.employee_id;
                    if (!empId || !leaveRow.from_date || !leaveRow.to_date) continue;

                    if (!employeeMap[empId]) {
                        employeeMap[empId] = {
                            employee_id: empId,
                            present_count: 0,
                            absent_count: 0,
                            ot_hours: 0
                        };
                    }

                    var leaveFrom = parseISO(leaveRow.from_date);
                    var leaveTo = parseISO(leaveRow.to_date);
                    var overlapStart = leaveFrom > rangeStart ? leaveFrom : rangeStart;
                    var overlapEnd = leaveTo < rangeEnd ? leaveTo : rangeEnd;

                    var dayCount = 0;
                    if (overlapStart <= overlapEnd) {
                        dayCount = Math.floor((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
                    }

                    var unpaidVal = String(leaveRow.is_unpaid).toUpperCase();
                    var isUnpaid = (leaveRow.is_unpaid === true || unpaidVal === 'T' || unpaidVal === 'TRUE' || unpaidVal === '1');

                    if (isUnpaid) {
                        employeeMap[empId].absent_count += dayCount;
                    } else {
                        employeeMap[empId].present_count += dayCount;
                    }
                }

                var lineIndex = 0;
                for (var empKey in employeeMap) {
                    var empData = employeeMap[empKey];
                    var empid = empData.employee_id || "";
                    var internalAttendanceType = empData.present_count || 0;
                    var absentCount = empData.absent_count || 0; 
                    var rotOt = empData.ot_hours || 0;
                    var compOff = 0;
                    var compOffRound = 0;

                    try {
                        sublist.setSublistValue({
                            id: "custpage_de_empid",
                            line: lineIndex,
                            value: empid || "",
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_de_empintid",
                            line: lineIndex,
                            value: empid || "",
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_noofpresent",
                            line: lineIndex,
                            value: internalAttendanceType.toString(),
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_noofabsent",
                            line: lineIndex,
                            value: absentCount.toString(),
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_rothours",
                            line: lineIndex,
                            value: rotOt.toString(),
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_compoff",
                            line: lineIndex,
                            value: compOff.toFixed(2),
                            ignoreFieldChange: true,
                        });
                        sublist.setSublistValue({
                            id: "custpage_compoffround",
                            line: lineIndex,
                            value: compOffRound.toString(),
                            ignoreFieldChange: true,
                        });
                        count++;
                        lineIndex++;
                    } catch (e) {
                        log.error("Error setting sublist value at line " + lineIndex, e);
                    }
                }
            } catch (error) {
                log.error("Error in setSublistvalue function", error);
            }
            return count;
        }

        function getWagePeriodDates(payGroup, monthField, yearField) {
            var startDate = "";
            var endDate = "";
            try {
                var wageSql = 
                    "SELECT " +
                    "    TO_CHAR(custrecord_hris_start_date, 'DD/MM/YYYY') AS start_date, " +
                    "    TO_CHAR(custrecord_hris_end_date, 'DD/MM/YYYY') AS end_date " +
                    "FROM customrecord_hris_wage_period_details " +
                    "WHERE isinactive = 'F' " +
                    "  AND custrecord_hris_pay_group = " + payGroup + " " +
                    "  AND custrecord_hris_month = " + monthField + " " +
                    "  AND custrecord_hris_year = " + yearField;

                log.debug("Wage Period SQL", wageSql);
                var wageResults = query.runSuiteQL({ query: wageSql }).asMappedResults();
                if (wageResults && wageResults.length > 0) {
                    startDate = wageResults[0].start_date;
                    endDate = wageResults[0].end_date;
                }
            } catch (e) {
                log.error("Error fetching Wage Period Details", e);
            }
            return {
                startDate: startDate,
                endDate: endDate
            };
        }

        function parseDMY(str) {
            var parts = String(str).split('/');
            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }

        function parseISO(str) {
            var parts = String(str).split('-');
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }

        return {
            onRequest: onRequest,
        };
    });