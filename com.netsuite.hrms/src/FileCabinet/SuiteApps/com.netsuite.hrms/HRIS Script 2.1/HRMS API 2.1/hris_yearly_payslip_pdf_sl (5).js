function suitelethris(request, response) {
	try {
		var context = nlapiGetContext();

		if (request.getMethod() == 'GET') {
			//var LogoURL = "https://5250636.app.netsuite.com/core/media/media.nl?id=451&c=5250636&h=cc49c9ad7433b123fd22&fcts=20190101225712&whence=";
			var LogoURL="https://9699878.app.netsuite.com/core/media/media.nl?id=1&c=9699878&h=ybmZka8dSH5VcCI9TkIpt1HMb9xMOEzLvyJoZ3Jzb1Fo0UV0";
			LogoURL = LogoURL.toString().replace(/&/g, "&amp;");
			var FormData = "";

			var paygroup = request.getParameter('paygroup');
			var employee = request.getParameter('employee');
			var stdate = request.getParameter('stdate');
			stdate = nlapiStringToDate(stdate);
			var enddate = request.getParameter('enddate');
			enddate = nlapiStringToDate(enddate);

			var FirstEndDate = new Date(stdate.getFullYear(), parseInt(stdate.getMonth()) + 1, 0);
			var LastEndDate = new Date(enddate.getFullYear(), parseInt(enddate.getMonth()) + 1, 0);

			var Month = [];
			var Year = [];
			var YearInDight = [];
			while (FirstEndDate <= LastEndDate) {
				//Month.push(parseInt(FirstEndDate.getMonth()) + 1);
				// For Month list change Florence
				var Month1 = parseInt(FirstEndDate.getMonth()) + 1;
				Month1 = gethrisMonth(Month1);
				Month.push(Month1);
				var val = FirstEndDate.getFullYear();
				nlapiLogExecution('DEBUG', 'val', val);

				var YearId = get_Year_id(val);
				nlapiLogExecution('DEBUG', 'YearId::::::::::', YearId);
				Year.push(YearId);
				YearInDight.push(val);
				FirstEndDate = nlapiAddMonths(FirstEndDate, 1)
			}


			var Currency = searchCurrency(paygroup);

			var emp_details = new Array()
			emp_details = get_emp_details(paygroup, employee)
			var split_emp_details = emp_details.split('#')
			var empl_name = split_emp_details[0];
			nlapiLogExecution('DEBUG', '', 'empl_name===========**' + empl_name);
			var dept = split_emp_details[1];
			nlapiLogExecution('DEBUG', '', 'dept===========**' + dept);
			var str_dept;
			if (dept != null && dept != '' && dept != 'undefined') {
				if (dept.lastIndexOf(':') != -1) {
					var str_start_val = dept.lastIndexOf(':') + 1;

					str_dept = dept.substring(str_start_val)
				} //End of if(dept.lastIndexOf(':') != -1)
				else {
					str_dept = dept
				} //End of else	
			} //End of if(dept != null && dept != '' && dept != 'undefined')
			nlapiLogExecution('DEBUG', '', 'str_dept===========**' + str_dept);
			var grade = split_emp_details[2];
			nlapiLogExecution('DEBUG', '', 'grade===========**' + grade);
			var designation = split_emp_details[3];
			nlapiLogExecution('DEBUG', '', 'designation===========**' + designation);
			var bank_name = split_emp_details[4];
			nlapiLogExecution('DEBUG', '', 'bank_name===========**' + bank_name);
			var bank_account_no = split_emp_details[5];
			nlapiLogExecution('DEBUG', '', 'bank_account_no===========**' + bank_account_no);
			var date_of_join = split_emp_details[6];
			emp_code = nlapiEscapeXML(emp_code)
			nlapiLogExecution('DEBUG', '', 'emp_code===========**' + emp_code);
			nlapiLogExecution('DEBUG', '', 'Month===========**' + Month);
			nlapiLogExecution('DEBUG', '', 'Month===========**' + Month.length);
			var _mode = '';
			if (CheckValidOrNot(Month) && CheckValidOrNot(Year)) {

				var DataFound = '';

				for (var i = 0; i < Month.length; i++) {

					var RemainingUsage = context.getRemainingUsage()

					if (i > 0) {
						if (_mode) {
							FormData += "<p style=\"page-break-after: always\"></p>";
						}
					}

					nlapiLogExecution('DEBUG', '', 'Month[i]===========**' + Month[i]);
					nlapiLogExecution('DEBUG', '', 'Year[i]===========**' + Year[i]);

					var SpecialHoursSearch = nlapiSearchRecord("customrecord_hris_monthlysalinput", null,
						[
							["isinactive", "is", "F"],
							"AND",
							["custrecord_hris_mthsal_empname", "anyof", employee],
							"AND",
							["custrecord_hris_mthsal_paygroup", "anyof", paygroup],
							"AND",
							["custrecord_hris_mthsal_month", "anyof", Month[i]],
							"AND",
							["custrecord_hris_mthsal_year", "anyof", Year[i]],
							"AND",
							["custrecord_hris_mthsal_paycomponent.custrecord_hris__sequence_no_", "equalto", "38"],
							"AND",
							["custrecord_hris_mthsal_overtime_type", "anyof", "1"]
						],
						[
							new nlobjSearchColumn("custrecord_hris_mthsal_empname", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_mthsal_overtime_type", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_mthsal_total_hours_days", null, "SUM")
						]
					);

					var SpecialHours = '';
					if (SpecialHoursSearch) {
						SpecialHours = SpecialHoursSearch[0].getValue("custrecord_hris_mthsal_total_hours_days", null, "SUM");
					}
					if (SpecialHours == 0 || !SpecialHoursSearch) {
						SpecialHours = '';
					}

					////////
					var NormalHoursSearch = nlapiSearchRecord("customrecord_hris_monthlysalinput", null,
						[
							["isinactive", "is", "F"],
							"AND",
							["custrecord_hris_mthsal_empname", "anyof", employee],
							"AND",
							["custrecord_hris_mthsal_paygroup", "anyof", paygroup],
							"AND",
							["custrecord_hris_mthsal_month", "anyof", Month[i]],
							"AND",
							["custrecord_hris_mthsal_year", "anyof", Year[i]],
							"AND",
							["custrecord_hris_mthsal_paycomponent.custrecord_hris__sequence_no_", "equalto", "38"],
							"AND",
							["custrecord_hris_mthsal_overtime_type", "anyof", "2"]
						],
						[
							new nlobjSearchColumn("custrecord_hris_mthsal_empname", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_mthsal_overtime_type", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_mthsal_total_hours_days", null, "SUM")
						]
					);

					var NormalHours = '';
					if (NormalHoursSearch) {
						NormalHours = NormalHoursSearch[0].getValue("custrecord_hris_mthsal_total_hours_days", null, "SUM");
					}
					if (NormalHours == 0 || !NormalHoursSearch) {
						NormalHours = '';
					}


					var UnpaidLeaveSearch = nlapiSearchRecord("customrecord_hris_unpaid_leave_entry", null,
						[
							["isinactive", "is", "F"],
							"AND",
							["custrecord_hris_ule_employee_name", "anyof", employee],
							"AND",
							["custrecord_hris_ule_month", "anyof", Month[i]],
							"AND",
							["custrecord_hris_ule_year", "anyof", Year[i]],
							"AND",
							[["custrecord_hris_ule_leave_type.custrecord_hris_lvecnfg_seqno","equalto","2"],
							"OR",
							["custrecord_hris_ule_leave_type.custrecord_hris_lvecnfg_seqno","equalto","13"]]
						],
						[
							new nlobjSearchColumn("custrecord_hris_ule_employee_name", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_ule_noof_days", null, "SUM")
						]
					);

					var NewUnpaidDays = 0;
					if (UnpaidLeaveSearch) {
						NewUnpaidDays = UnpaidLeaveSearch[0].getValue("custrecord_hris_ule_noof_days", null, "SUM");
					}


					

					var firstDay = new Date(YearInDight[i], Month[i] - 1, 1);
					var lastDay = new Date(YearInDight[i], Month[i], 0);

					firstDay = nlapiDateToString(firstDay);
					lastDay = nlapiDateToString(lastDay);

					var LeaveDaysSearch = nlapiSearchRecord("customrecord_hris_leaveapplication", null,
						[
							[[["custrecord_hris_lve_employeename", "anyof", employee], "AND", ["custrecord_hris_lve_leavetype.custrecord_hris_lvecnfg_seqno", "equalto", "3"], "AND", ["custrecord_hris_lve_hrmsapprovalstatus", "anyof", "2"], "AND", ["custrecord_hris_lve_cancellation", "is", "F"], "AND", [["custrecord_hris_lve_fromdate", "within", firstDay, lastDay], "OR", ["custrecord_hris_lve_todate", "within", firstDay, lastDay]]]],
							"OR",
							[[["custrecord_hris_lve_employeename", "anyof", employee], "AND", ["custrecord_hris_lve_leavetype.custrecord_hris_lvecnfg_seqno", "equalto", "3"], "AND", ["custrecord_hris_lve_hrmsapprovalstatus", "anyof", "2"], "AND", ["custrecord_hris_lve_cancellation", "is", "T"], "AND", ["custrecord_hris_lve_cancel_leavestatus", "anyof", "3"], "AND", [["custrecord_hris_lve_fromdate", "within", firstDay, lastDay], "OR", ["custrecord_hris_lve_todate", "within", firstDay, lastDay]]]]
						],
						[
							new nlobjSearchColumn("created").setSort(true),
							new nlobjSearchColumn("name"),
							new nlobjSearchColumn("custrecord_hris_lve_fromdate"),
							new nlobjSearchColumn("custrecord_hris_lve_todate"),
						]
					);

					var NewLeaveDays = 0;
					if (LeaveDaysSearch) {
						nlapiLogExecution('DEBUG', 'LeaveDaysSearch:::::::::', LeaveDaysSearch.length);

						for (var m = 0; m < LeaveDaysSearch.length; m++) {
							var FROMDATE = LeaveDaysSearch[m].getValue("custrecord_hris_lve_fromdate");
							var TODATE = LeaveDaysSearch[m].getValue("custrecord_hris_lve_todate");
							FROMDATE = nlapiStringToDate(FROMDATE);
							TODATE = nlapiStringToDate(TODATE);
							if (FROMDATE.getMonth() == TODATE.getMonth()) {
								nlapiLogExecution('DEBUG', 'Enter1:::::::::', 'Enter1');


								var DiFFDAYS = DaysBetweenDates(FROMDATE, TODATE)
								NewLeaveDays = NewLeaveDays + parseInt(DiFFDAYS)
							}
							else {
								nlapiLogExecution('DEBUG', 'Enter2:::::::::', 'Enter2');

								if (FROMDATE.getMonth() == parseInt(Month[i]) - 1) {
									nlapiLogExecution('DEBUG', 'Enter2.1:::::::::', 'Enter2.1');

									var DiFFDAYS = DaysBetweenDates(FROMDATE, nlapiStringToDate(lastDay));
									NewLeaveDays = NewLeaveDays + parseInt(DiFFDAYS);
								}
								else if (TODATE.getMonth() == parseInt(Month[i]) - 1) {
									nlapiLogExecution('DEBUG', 'Enter2.2:::::::::', 'Enter2.2');

									var DiFFDAYS = DaysBetweenDates(nlapiStringToDate(firstDay), TODATE);
									NewLeaveDays = NewLeaveDays + parseInt(DiFFDAYS);
								}
								else if (parseInt(Month[i]) - 1 > FROMDATE.getMonth() && parseInt(Month[i]) - 1 < TODATE.getMonth()) {
									nlapiLogExecution('DEBUG', 'Enter2.3:::::::::', 'Enter2.3');

									var DiFFDAYS = new Date(_year_degit, Month[i], 0);
									NewLeaveDays = NewLeaveDays + parseInt(DiFFDAYS);
								}
							}

						}
					}



					var ARREARDAYS_Search = nlapiSearchRecord("customrecord_hris_pay_process", null,
						[
							["isinactive", "is", "F"],
							"AND",
							["custrecord_hris_pay_proc_pay_group", "anyof", paygroup],
							"AND",
							["custrecord_hris_pay_proc_employee", "anyof", employee],
							"AND",
							["custrecord_hris_pay_proc_pay_month", "anyof", Month[i]],
							"AND",
							["custrecord_hris_pay_proc_year", "anyof", Year[i]]
						],
						[
							new nlobjSearchColumn("custrecord_hris_pay_proc_employee", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_arrear_days", null, "MAX")
						]
					);

					var ARREARDAYS = '';
					if (ARREARDAYS_Search) {
						ARREARDAYS = ARREARDAYS_Search[0].getValue("custrecord_hris_pay_proc_arrear_days", null, "MAX")
					}




					var FixedEarningSearch = nlapiSearchRecord("customrecord_hris_pay_process", null,
						[
							["isinactive", "is", "F"],
							"AND",
							["custrecord_hris_pay_proc_pay_month", "anyof", Month[i]],
							"AND",
							["custrecord_hris_pay_proc_year", "anyof", Year[i]],
							"AND",
							["custrecord_hris_pay_proc_pay_group", "anyof", paygroup],
							"AND",
							["custrecord_hris_pay_proc_employee", "anyof", employee],
							"AND",
							["custrecord_hris_pay_proc_component_type", "anyof", "1"],
							"AND",
							["custrecord_hris_pay_proc_process_type", "anyof", "1"],
							/* 		   "AND", 
						   ["custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_ ","anyof","1"]
*/
							//						   "AND", 
							//						   ["custrecord_hris_pay_proc_payroll_compone.custrecord_apm_pc_calculation_type","anyof","1"]
						],
						[
							new nlobjSearchColumn("custrecord_hris_pay_proc_employee", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_employee_code", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_employee_legal", null, "GROUP"),
							new nlobjSearchColumn("hiredate", "custrecord_hris_pay_proc_employee", "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_payroll_compone", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris__sequence_no_", "custrecord_hris_pay_proc_payroll_compone", "GROUP").setSort(false),

							new nlobjSearchColumn("custrecord_hris_pay_proc_actual_gross_ea", null, "SUM"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_lop_days_final", null, "MAX"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_paid_days", null, "MAX")

						]
					);

					nlapiLogExecution('DEBUG', 'FixedEarningSearch::::::::', FixedEarningSearch)

					var emp_code, date_of_join, emp_legal_name, stand_month_days, str_dept, pay_days, designation;
					if (FixedEarningSearch) {
						// remove the comment line for pay_days by florence on 23/05/2024

						// emp_code = FixedEarningSearch[0].getValue("custrecord_hris_pay_proc_employee_code", null, "GROUP");
						// date_of_join = FixedEarningSearch[0].getValue("hiredate", "custrecord_hris_pay_proc_employee", "GROUP");
						// emp_legal_name = FixedEarningSearch[0].getValue("custrecord_hris_pay_proc_employee_legal", null, "GROUP");
						// emp_code = FixedEarningSearch[0].getValue("custrecord_hris_pay_proc_employee_code", null, "GROUP");
						// pay_days = FixedEarningSearch[0].getValue("custrecord_hris_pay_proc_paid_days", null, "MAX");

// remove the comment line for pay_days by florence on 23/05/2024
						 emp_code = FixedEarningSearch[0].getValue("custrecord_hris_pay_proc_employee_code", null, "GROUP");
						 date_of_join = FixedEarningSearch[0].getValue("hiredate", "custrecord_hris_pay_proc_employee", "GROUP");
						 emp_legal_name = FixedEarningSearch[0].getValue("custrecord_hris_pay_proc_employee_legal", null, "GROUP");
						 emp_code = FixedEarningSearch[0].getValue("custrecord_hris_pay_proc_employee_code", null, "GROUP");
						 pay_days = FixedEarningSearch[0].getValue("custrecord_hris_pay_proc_paid_days", null, "MAX");


					}
					stand_month_days = getmonth_days(Month[i], Year[i]);




					var DeductionSearch = nlapiSearchRecord("customrecord_hris_pay_process", null,
						[
							["isinactive", "is", "F"],
							"AND",
							["custrecord_hris_pay_proc_pay_month", "anyof", Month[i]],
							"AND",
							["custrecord_hris_pay_proc_year", "anyof", Year[i]],
							"AND",
							["custrecord_hris_pay_proc_pay_group", "anyof", paygroup],
							"AND",
							["custrecord_hris_pay_proc_employee", "anyof", employee],
							"AND",
							["custrecord_hris_pay_proc_component_type", "anyof", "2"],
							"AND",
							["custrecord_hris_pay_proc_process_type", "anyof", "1"]
						],
						[
							new nlobjSearchColumn("custrecord_hris_pay_proc_employee", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_employee_code", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_employee_legal", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_payroll_compone", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_actual_gross_de", null, "SUM")
						]
					);


			

					var EmpDataSearch = nlapiSearchRecord("customrecord_hris_pay_process", null,
						[
							["isinactive", "is", "F"],
							"AND",
							["custrecord_hris_pay_proc_pay_group", "anyof", paygroup],
							"AND",
							["custrecord_hris_pay_proc_pay_month", "anyof", Month[i]],
							"AND",
							["custrecord_hris_pay_proc_year", "anyof", Year[i]],
							"AND",
							["custrecord_hris_pay_proc_employee", "anyof", employee],
							"AND",
							["custrecord_hris_pay_proc_componet_sequen", "equalto", '100']
						],
						[
							new nlobjSearchColumn("custrecord_hris_pay_proc_employee", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_employee_code", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_employee_legal", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_department", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_subdept", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_designation", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_date_of_joining", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_company_name", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_pay_group", null, "GROUP"),
							//new nlobjSearchColumn("custrecord_apm_pp_paymentmode",null,"GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_business_areat", null, "GROUP"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_arrear_days", null, "MAX"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_paid_days", null, "MAX"),
							new nlobjSearchColumn("custrecord_hris_pay_proc_lop_days", null, "MAX"),



						]
					);

					var emp_legal_name, emp_code, str_dept, designation, date_of_join, SUBSIDIARYTEXT, email_id, pygrp, add, ARREARDAYS, paidDays, lopDAYS, paymode, business_Unit,subdept;
					if (EmpDataSearch) {
						emp_legal_name = EmpDataSearch[0].getValue("custrecord_hris_pay_proc_employee_legal", null, "GROUP");
						emp_code = EmpDataSearch[0].getValue("custrecord_hris_pay_proc_employee_code", null, "GROUP");
						str_dept = EmpDataSearch[0].getText("custrecord_hris_pay_proc_department", null, "GROUP");
						subdept= EmpDataSearch[0].getText("custrecord_hris_pay_proc_subdept",null,"GROUP");
						designation = EmpDataSearch[0].getText("custrecord_hris_pay_proc_designation", null, "GROUP");
						date_of_join = EmpDataSearch[0].getValue("custrecord_hris_pay_proc_date_of_joining", null, "GROUP");
						SUBSIDIARYTEXT = EmpDataSearch[0].getText("custrecord_hris_pay_proc_company_name", null, "GROUP");
						pygrp = EmpDataSearch[0].getText("custrecord_hris_pay_proc_pay_group", null, "GROUP");
						//paymode = EmpDataSearch[0].getText("custrecord_apm_pp_paymentmode",null,"GROUP");
						business_Unit = EmpDataSearch[0].getValue("custrecord_hris_pay_proc_business_areat", null, "GROUP");

						//ARREARDAYS = EmpDataSearch[0].getValue("custrecord_hris_pay_proc_arrear_days",null,"MAX");
						paidDays = EmpDataSearch[0].getValue("custrecord_hris_pay_proc_paid_days", null, "MAX");
						lopDAYS = EmpDataSearch[0].getValue("custrecord_hris_pay_proc_lop_days", null, "MAX");

					}

					//var SUBSIDIARYTEXT = nlapiLookupField('employee', employee, 'subsidiarynohierarchy', true);
					var SubsidId = nlapiLookupField('employee', employee, 'subsidiary');
					var SubsidAdd = nlapiLookupField('subsidiary', SubsidId, 'address1');

					var MONTHSNAMES = ['null', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

					_mode = '';
					if (CheckValidOrNot(DeductionSearch) || CheckValidOrNot(FixedEarningSearch)) {
						DataFound = 'Enter';

						FormData += " <table style=\"width:80%;\" align=\"center\" border=\"0\">";
						FormData += "		<tr style=\"width:100%;\">";
						FormData += "			<td width=\"75%\" style=\" align:center;\" ><img src=\"" + LogoURL + "\"  style=\"width:130px; height:60px;\"></img></td>";
						FormData += "		</tr>";
						FormData += "		<tr style=\"width:100%;\">";
						FormData += "            <td width=\"25%\"  align=\"center\"  style=\"font-size:13; font-weight:bold;\" >" + nlapiEscapeXML(SUBSIDIARYTEXT) + "<\/td>";
						FormData += "		</tr>";
						FormData += "		<tr style=\"width:100%;\">";
						FormData += "            <td width=\"25%\"  align=\"center\" style=\"font-size:8\">" + nlapiEscapeXML(SubsidAdd) + "<\/td>";
						FormData += "		</tr>";
						FormData += " </table>";

						FormData += "<table border=\"1\" width=\"80%\" align=\"center\" style=\"font-size:8\"  margin-top=\"40px\">";
						FormData += "	<tr border-bottom=\"1\">";
						FormData += "		<td colspan=\"4\">";
						FormData += "		<p align=\"center\" style=\"font-size:10\"><b>Payslip for " + MONTHSNAMES[Month[i]] + " " + YearInDight[i] + "<\/b><\/p><\/td>";
						FormData += "	<\/tr>";

						FormData += "	<tr>";
						FormData += "		<td><b>Employee Code:<\/b><\/td>";
						FormData += "		<td>" + nlapiEscapeXML(emp_code) + "<\/td>";
						FormData += "		<td><b>Date of Joining:<\/b><\/td>";
						FormData += "		<td>" + date_of_join + "<\/td>";
						FormData += "	<\/tr>";
						FormData += "	<tr>";
						FormData += "		<td><b>Employee:<\/b><\/td>";
						FormData += "		<td>" + nlapiEscapeXML(emp_legal_name) + "<\/td>";//empl_name
						FormData += "		<td><b>Standard Month Days:<\/b><\/td>";
						FormData += "		<td>" + stand_month_days + "<\/td>";
						FormData += "	<\/tr>";
						FormData += "	<tr>";
						FormData += "		<td><b>Department:<\/b><\/td>";
						FormData += "	<td>" + nlapiEscapeXML(str_dept) + "<\/td>";
						FormData += "		<td><b> Paid Days:<\/b><\/td>";
						FormData += "		<td>" + pay_days + "<\/td>";
						FormData += "	<\/tr>";
						FormData += "	<tr>";
						FormData += "		<td><b>Designation:<\/b><\/td>";
						FormData += "		<td>" + nlapiEscapeXML(designation) + "<\/td>";
						FormData += "		<td><b>Unpaid Days:<\/b><\/td>";//Grade/Band removed by Sumant Kumar
						FormData += "		<td>" + NewUnpaidDays + "<\/td>"; //lop_days
						FormData += "	<\/tr>";

						FormData += "	<tr>";
						FormData += "		<td><b>Branch Name:<\/b><\/td>";
						FormData += "		<td>" + nlapiEscapeXML(SUBSIDIARYTEXT) + "<\/td>";
						FormData += "		<td><b>Voucher ID:<\/b><\/td>";
						FormData += "		<td><\/td>";
						FormData += "	<\/tr>";
					/* 	FormData += "	<tr>";
						FormData += "		<td><b>Business Unit:<\/b><\/td>";
						FormData += "		<td>" + nlapiEscapeXML(ValueOrNot(business_Unit)) + "<\/td>";
						FormData += "		<td><b>Leave Days:<\/b><\/td>";
						FormData += "		<td>" + NewLeaveDays + "<\/td>";
						FormData += "	<\/tr>";
 */
						FormData += "	<tr>";
						FormData += "		<td><b>Sub Department:<\/b><\/td>";
						FormData += "		<td>" + nlapiEscapeXML(ValueOrNot(subdept)) + "<\/td>";
						FormData += "		<td><b>Leave Days:<\/b><\/td>";
						FormData += "		<td>" + NewLeaveDays + "<\/td>";
						FormData += "	<\/tr>";
						FormData += "	<tr>";

						FormData += "		<td><b><\/b><\/td>";
						FormData += "		<td><\/td>";
						FormData += "		<td><b>Arrear Days:<\/b><\/td>";
						FormData += "		<td>" + ARREARDAYS + "<\/td>";
						FormData += "	<\/tr>";
						FormData += "	<tr>";
						FormData += "		<td colspan=\"4\"><b>Over Time Hours<\/b><\/td>";
						FormData += "	<\/tr>";
						FormData += "	<tr>";
						FormData += "		<td><b>Normal:<\/b><\/td>";
						FormData += "		<td>" + SpecialHours + "<\/td>";
						FormData += "		<td><b>Special:<\/b><\/td>";
						FormData += "		<td>" + NormalHours + "<\/td>";
						FormData += "	<\/tr>";

						FormData += "<\/table>";


						var GrossSal = 0.00;
						/*  _logValidation(GrossSal)
						 {
							GrossSal = 0.00;
						 } */
						var TotalDeduction = 0.00;

						FormData += "    <table id=\"payrolldtls\"  width=\"80%\" align=\"center\" border=\"1\" font-weight=\"normal\" border-top=\"0\">";
						FormData += "		<tr style=\"width:100%; font-weight:bold\">";
						FormData += "            <td  align=\"center\" font-size=\"10px\">Salary Renumeration <\/td>";
						FormData += "            <td  align=\"center\" font-size=\"10px\">" + MONTHSNAMES[Month[i]] + " Month Earnings<\/td>";
						FormData += "            <td  align=\"center\" font-size=\"10px\">Deductions Head<\/td>";
						FormData += "            <td  align=\"center\" font-size=\"10px\" border-right=\"0px\">" + MONTHSNAMES[Month[i]] + " Month Deductions<\/td>";
						FormData += "         <\/tr>";

						if (!DeductionSearch && FixedEarningSearch) {
							nlapiLogExecution('DEBUG', 'Enter', 'Case:::::1')

							for (var k = 0; k < FixedEarningSearch.length; k++) {

								FormData += "		<tr style=\"width:100%;\">";
								FormData += "            <td align=\"left\" font-size=\"10px\">" + nlapiEscapeXML(FixedEarningSearch[k].getText("custrecord_hris_pay_proc_payroll_compone", null, "GROUP")) + "<\/td>";
								FormData += "            <td align=\"right\" font-size=\"10px\">" + parseFloat(FixedEarningSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_ea", null, "SUM")).toFixed(2) + "<\/td>";
								FormData += "            <td align=\"left\" font-size=\"10px\"><\/td>";
								FormData += "            <td align=\"left\" font-size=\"10px\" border-right=\"0px\"><\/td>";
								FormData += "         <\/tr>";

								GrossSal = parseFloat(GrossSal) + parseFloat(GetZero(FixedEarningSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_ea", null, "SUM")));
							}
						} else if (DeductionSearch && !FixedEarningSearch) {
							nlapiLogExecution('DEBUG', 'Enter', 'Case:::::2')

							for (var k = 0; k < DeductionSearch.length; k++) {
								nlapiLogExecution('DEBUG', 'Test1', 'Test1---')
								FormData += "		<tr style=\"width:100%;\">";
								FormData += "            <td align=\"left\" font-size=\"10px\"><\/td>";
								FormData += "            <td align=\"right\" font-size=\"10px\"><\/td>";
								nlapiLogExecution('DEBUG', 'Test1.0', 'Test1.0---')
								FormData += "            <td align=\"left\" font-size=\"10px\">" + nlapiEscapeXML(DeductionSearch[k].getText("custrecord_hris_pay_proc_payroll_compone", null, "GROUP")) + "<\/td>";
								/* var DeductionValue = DeductionSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_de", null, "SUM")||0;
								nlapiLogExecution('DEBUG', 'Deduction', 'Deduction1.0---',DeductionValue);  */
								FormData += "            <td align=\"right\" font-size=\"10px\" border-right=\"0px\">" + ValueOrNot(DeductionSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_de", null, "SUM")) + "<\/td>";
								FormData += "         <\/tr>";
								var EarnValue = 0.00;
								EarnValue = returnZero(DeductionSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_ea", null, "SUM"));
								nlapiLogExecution('DEBUG', 'Earning', 'Earning1.0---', EarnValue);
								_logValidation(EarnValue)
								{
									EarnValue = 0.00;
								}
								GrossSal = parseFloat(GrossSal) + parseFloat(EarnValue); //+ parseFloat(returnZero(FixedEarningSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_ea", null, "SUM")));
								nlapiLogExecution('DEBUG', 'Test1.1', 'Test1.1---')
								TotalDeduction = parseFloat(TotalDeduction) + parseFloat(GetZero(DeductionSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_de", null, "SUM")));
								nlapiLogExecution('DEBUG', 'Test1.2', 'Test1.2---')
							}
							nlapiLogExecution('DEBUG', 'Test2', 'Test2---')
						}

						else if (DeductionSearch && FixedEarningSearch) {

							nlapiLogExecution('DEBUG', 'Enter', 'Case:::::3')

							if (parseInt(FixedEarningSearch.length) >= parseInt(DeductionSearch.length)) {
								nlapiLogExecution('DEBUG', 'Enter', 'Case:::::3.1')

								for (var k = 0; k < FixedEarningSearch.length; k++) {

									FormData += "		<tr style=\"width:100%;\">";
									FormData += "            <td align=\"left\" font-size=\"10px\">" + nlapiEscapeXML(FixedEarningSearch[k].getText("custrecord_hris_pay_proc_payroll_compone", null, "GROUP")) + "<\/td>";
									FormData += "            <td align=\"right\" font-size=\"10px\">" + parseFloat(FixedEarningSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_ea", null, "SUM")).toFixed(2) + "<\/td>";
									if (parseInt(DeductionSearch.length) >= parseInt(k) + 1) {
										FormData += "            <td align=\"left\" font-size=\"10px\">" + nlapiEscapeXML(DeductionSearch[k].getText("custrecord_hris_pay_proc_payroll_compone", null, "GROUP")) + "<\/td>";
										FormData += "            <td align=\"right\" font-size=\"10px\" border-right=\"0px\">" + ValueOrNot(DeductionSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_de", null, "SUM")) + "<\/td>";
										TotalDeduction = parseFloat(TotalDeduction) + parseFloat(DeductionSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_de", null, "SUM"));

									} else {
										FormData += "            <td align=\"left\" font-size=\"10px\"><\/td>";
										FormData += "            <td align=\"left\" font-size=\"10px\" border-right=\"0px\"><\/td>";
									}

									FormData += "         <\/tr>";



									GrossSal = parseFloat(GrossSal) + parseFloat(FixedEarningSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_ea", null, "SUM"));
								}
							} else if (parseInt(FixedEarningSearch.length) < parseInt(DeductionSearch.length)) {
								nlapiLogExecution('DEBUG', 'Enter', 'Case:::::3.2')

								for (var k = 0; k < DeductionSearch.length; k++) {

									FormData += "		<tr style=\"width:100%;\">";

									if (parseInt(FixedEarningSearch.length) >= parseInt(k) + 1) {
										FormData += "            <td align=\"left\" font-size=\"10px\">" + nlapiEscapeXML(FixedEarningSearch[k].getText("custrecord_hris_pay_proc_payroll_compone", null, "GROUP")) + "<\/td>";
										FormData += "            <td align=\"right\" font-size=\"10px\">" + ValueOrNot(FixedEarningSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_ea", null, "SUM")) + "<\/td>";
										GrossSal = parseFloat(GrossSal) + parseFloat(GetZero(FixedEarningSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_ea", null, "SUM")));

									} else {
										FormData += "            <td align=\"left\" font-size=\"10px\"><\/td>";
										FormData += "            <td align=\"left\" font-size=\"10px\"><\/td>";
									}

									FormData += "            <td align=\"left\" font-size=\"10px\">" + nlapiEscapeXML(DeductionSearch[k].getText("custrecord_hris_pay_proc_payroll_compone", null, "GROUP")) + "<\/td>";
									FormData += "            <td align=\"right\" font-size=\"10px\" border-right=\"0px\">" + ValueOrNot(DeductionSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_de", null, "SUM")) + "<\/td>";
									FormData += "         <\/tr>";

									TotalDeduction = parseFloat(TotalDeduction) + parseFloat(GetZero(DeductionSearch[k].getValue("custrecord_hris_pay_proc_actual_gross_de", null, "SUM")));
								}
							}
						}


						FormData += "		<tr style=\"width:100%;font-weight:bold\">";
						FormData += "            <td  align=\"left\" font-size=\"10px\">Gross Pay<\/td>";
						FormData += "            <td  align=\"right\" font-size=\"10px\"><b>" + parseFloat(GrossSal).toFixed(2) + "</b><\/td>";
						FormData += "            <td  align=\"left\" font-size=\"10px\">Total Deduction <\/td>";
						FormData += "            <td  align=\"right\" font-size=\"10px\" border-right=\"0px\" >" + parseFloat(TotalDeduction).toFixed(2) + "<\/td>";
						FormData += "         <\/tr>";



						var NetPaySearch = nlapiSearchRecord("customrecord_hris_pay_process", null,
							[
								["isinactive", "is", "F"],
								"AND",
								["custrecord_hris_pay_proc_pay_month", "anyof", Month[i]],
								"AND",
								["custrecord_hris_pay_proc_year", "anyof", Year[i]],
								"AND",
								["custrecord_hris_pay_proc_pay_group", "anyof", paygroup],
								"AND",
								["custrecord_hris_pay_proc_employee", "anyof", employee],
								"AND",
								["custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_", "equalto", "100"],
								"AND",
								["custrecord_hris_pay_proc_process_type", "anyof", "1"]
							],
							[
								new nlobjSearchColumn("custrecord_hris_pay_proc_employee", null, "GROUP"),
								new nlobjSearchColumn("custrecord_hris_pay_proc_employee_code", null, "GROUP"),
								new nlobjSearchColumn("custrecord_hris_pay_proc_payroll_compone", null, "GROUP"),
								new nlobjSearchColumn("custrecord_hris_pay_proc_value", null, "SUM")
							]
						);

						var NetPay = 0.00;
						if (NetPaySearch) {
							NetPay = NetPaySearch[0].getValue("custrecord_hris_pay_proc_value", null, "SUM")
						}




						var net_pay;
						var net_pay_in_words

						if (NetPay != null) {
							net_pay = NetPay

							var split_net_pay = net_pay.split('.')
							var paise_amount = split_net_pay[1]
							var space = '   '
							var actual_net_pay;
							if (paise_amount != null && paise_amount != '' && paise_amount != 'undefined' && paise_amount != '00' && paise_amount != 0) {
								if (net_pay.indexOf('-') != -1) {
									net_pay = Math.abs(net_pay)
									net_pay = net_pay.toFixed(2)
									net_pay = net_pay.toString()

									actual_net_pay = '-' + net_pay
									net_pay_in_words = Currency + space + 'Minus' + toWordsFunc(net_pay) //+ 'Paise Only'
								} else {
									net_pay = Math.abs(net_pay)
									net_pay = net_pay.toFixed(2)
									net_pay = net_pay.toString()
									actual_net_pay = net_pay
									net_pay_in_words = Currency + space + toWordsFunc(net_pay) //+ 'Paise Only'
								}

							} //End of if(paise_amount != null && paise_amount != '' && paise_amount != 'undefined' && paise_amount != 00 && paise_amount != 0)
							else {
								//  ////nlapiLogExecution('DEBUG','In main','net_pay in before 2nd if=='+net_pay)
								if (net_pay.indexOf('-') != -1) {
									net_pay = Math.abs(net_pay)
									net_pay = net_pay.toFixed(2)
									net_pay = net_pay.toString()

									actual_net_pay = '-' + net_pay
									//nlapiLogExecution('DEBUG','In main','Currency=='+Currency)
									net_pay_in_words = Currency + space + ' Minus ' + toWordsFunc(net_pay) + 'Only'
								} else {
									net_pay = Math.abs(net_pay)
									net_pay = net_pay.toFixed(2)
									net_pay = net_pay.toString()
									actual_net_pay = net_pay
									//nlapiLogExecution('DEBUG','In main','Currency=='+Currency)
									net_pay_in_words = Currency + space + toWordsFunc(net_pay) + 'Only'
								}
							} //End of else

						} //End of if (net_pay_res != null) 
						else {
							actual_net_pay = ''
							net_pay_in_words = ''
						}

						nlapiLogExecution('DEBUG', 'NetPay', 'NetPay==' + NetPay)


						FormData += "		<tr style=\"width:100%;\">";
						FormData += "            <td  align=\"left\" font-size=\"10px\" border-right=\"0px\"><b>Net Pay</b><\/td>";
						FormData += "            <td  align=\"right\" font-size=\"10px\" border-right=\"0px\"><b>" + parseFloat(NetPay).toFixed(2) + "</b><\/td>";
						FormData += "            <td  align=\"center\" font-size=\"10px\" border-right=\"0px\"><\/td>";
						FormData += "            <td  align=\"center\" font-size=\"10px\" border-right=\"0px\"><\/td>";
						FormData += "         <\/tr>";

						FormData += "		<tr style=\"width:100%;\" border-bottom=\"0\">";
						FormData += "            <td  align=\"left\" font-size=\"10px\" border-right=\"0px\"><b>Net Pay (In Words) </b><\/td>";
						FormData += "            <td colspan=\"3\"  align=\"left\" font-size=\"10px\" border-right=\"0px\">" + nlapiEscapeXML(net_pay_in_words) + "<\/td>";
						FormData += "         <\/tr>";

						FormData += " 	 </table>";




						var PreparedBy = nlapiLookupField('customrecord_hris_payslipsignaturedetail', 1, 'custrecord_hris_paysignempname')
						var ApprovedBy = nlapiLookupField('customrecord_hris_payslipsignaturedetail', 2, 'custrecord_hris_paysignempname')
						var AuthorisedBy = nlapiLookupField('customrecord_hris_payslipsignaturedetail', 3, 'custrecord_hris_paysignempname')

						FormData += " <table align=\"center\" style=\"width:80%;margin-top:50px;\">";
						FormData += "		<tr style=\"width:100%;\">";
						FormData += "			<td style=\"width:27%; align:center; border-bottom:solid 1px;\" font-size=\"10px\">" + nlapiEscapeXML(PreparedBy) + "</td>";
						FormData += "			<td style=\"width:10%; align:center; \"></td>";
						FormData += "			<td style=\"width:27%; align:center; border-bottom:solid 1px;\" font-size=\"10px\">" + nlapiEscapeXML(ApprovedBy) + "</td>";
						FormData += "			<td style=\"width:10%; align:center; \"></td>";
						FormData += "			<td style=\"width:28%; align:center; border-bottom:solid 1px;\" font-size=\"10px\">" + nlapiEscapeXML(AuthorisedBy) + "</td>";
						FormData += "			<td style=\"width:10%; align:center; \"></td>";
						FormData += "			<td style=\"width:28%; align:center; border-bottom:solid 1px;\" font-size=\"10px\"></td>";
						FormData += "		</tr>";
						FormData += "		<tr style=\"width:100%;\">";
						FormData += "			<td style=\" align:center; \"><p style=\"font-weight:bold; font-size:9px;\">Prepared By</p></td>";
						FormData += "			<td style=\" align:center; \"></td>";
						FormData += "			<td style=\" align:center; \"><p style=\"font-weight:bold; font-size:9px;\">Approved By</p></td>";
						FormData += "			<td style=\" align:center; \"></td>";
						FormData += "			<td style=\" align:center; \"><p style=\"font-weight:bold; font-size:9px;\">Authorised By</p></td>";
						FormData += "			<td style=\" align:center; \"></td>";
						FormData += "			<td style=\" align:center; \"><p style=\"font-weight:bold; font-size:9px;\">Received By</p></td>";
						FormData += "		</tr>";
						FormData += " </table>";

						FormData += " <table align=\"center\" style=\"width:80%;margin-top:5px;\" border-top=\"0.1\">";
						FormData += "		<tr style=\"width:100%;\">";
						FormData += "			<td></td>";
						FormData += "		</tr>";
						FormData += " </table>";

						FormData += " <table align=\"center\" style=\"width:80%;margin-top:3px;\" >";
						FormData += "		<tr style=\"width:100%;\">";
						FormData += "			<td><p style=\"font-weight:bold; font-size:9px;\">This is a system generated document, hence signature not required.</p></td>";
						FormData += "		</tr>";
						FormData += "		<tr style=\"width:100%;\">";
						FormData += "			<td><p style=\"font-weight:bold; font-size:9px;\">Payslip Generated on :" + nlapiDateToString(new Date()) + "</p></td>";
						FormData += "		</tr>";
						FormData += " </table>";

						_mode = 'enter';

					}


				}

				var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";
				xml += "<pdf>";
				xml += "	<head>";
				xml += "		<meta name=\"title\" value=\"Pay_Slip " + empl_name + "\"/>";
				xml += "		<meta name=\"viewer-fullscreen\" value=\"false\"/>";

				xml += " 		<style>";
				xml += "        #payrolldtls td {";
				xml += "            border-right: solid 1px;";
				xml += "        }";
				xml += "        #payrolldtls tr {";
				xml += "            border-bottom: solid 1px;";
				xml += "        }";
				xml += "   	 	</style>";


				xml += "	</head>";
				xml += "	<body font-family=\"Helvetica\" padding-left=\"0.3in\" padding-right=\"0.3in\"  padding-top=\"0.5in\"  padding-bottom=\"0.2in\"  header=\"myheader\"  footer=\"myfooter\" >";
				xml += "		" + FormData + "";
				xml += "	</body>";
				xml += "</pdf>";

				if (CheckValidOrNot(DataFound)) {
					var file = nlapiXMLToPDF(xml);
					response.setContentType("PDF", "Pay_Slip " + empl_name + ".pdf", "inline");
					response.write(file.getValue());
				}

				if (!CheckValidOrNot(DataFound)) {
					response.write("<p><b>No result found for selected Criteria</b></p>");
				}


				var context = nlapiGetContext();
				//  //////nlapiLogExecution('DEBUG', 'remaining usage', context.getRemainingUsage());
				var RemainingUsage = context.getRemainingUsage()
				nlapiLogExecution('DEBUG', 'Usage Check', 'RemainingUsage =***********' + RemainingUsage);

			}

		}
	} catch (e) {
		nlapiLogExecution('DEBUG', 'ERROR', e.message);
		if (e.message == 'Script Execution Usage Limit Exceeded') {
			response.write("<p><b>Maximum Date Range is One Year</b></p>");

		}

	}

}
function _logValidation(value) {
	if (value != 'null' && value != null && value != null && value != '' && value != undefined && value != undefined && value != 'undefined' && value != 'undefined' && value != 'NaN' && value != NaN) {
		return true;
	}
	else {
		return false;
	}
}
function CheckValidOrNot(value) {
	if ((value != null) && (value != '') && (value != undefined) && (value.toString() != 'NaN')) {
		return true;
	} else {
		return false;
	}
}

function ValueOrNot(Value) {
	if (CheckValidOrNot(Value) && Value != '- None -') {
		return Value;
	} else {
		return 0;
	}
}

function returnZero(value) {
	if ((value != null) && (value != '') && (value != undefined) && (value.toString() != 'NaN')) {
		return value;
	} else {
		return 0;
	}
}

function addCommas(nStr) {
	nStr += '';
	var x = nStr.split('.');
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

function daysBetweenTwoDays(date1, date2) {
	var diffTime = Math.abs(new Date(date2).getTime() - new Date(date1).getTime());
	var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return parseInt(diffDays) + 1;
}

function DateWithMontName(date) {
	if (CheckValidOrNot(date)) {
		var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
		var DateWithMontName = nlapiStringToDate(date).getDate() + '-' + months[nlapiStringToDate(date).getMonth()] + '-' + nlapiStringToDate(date).getFullYear();
		return DateWithMontName;
	}
	return '';
}

function GetZero(Value) {
	if (CheckValidOrNot(Value) && Value != '- None -') {
		return Value;
	} else {
		return 0;
	}
}

function trueorfalse(value) {
	if (value == 'T') {
		return 'Yes';
	} else {
		return 'No';
	}
}

function searchFinrecord(fin_year_val1) {
	////nlapiLogExecution('DEBUG', 'In LOP', 'fin_year_val1=^^^^^===================' + fin_year_val1)
	var fStartMonth;
	var fStartYear;
	var fEndMonth;
	var fEndyear;
	var Filters = new Array();
	fin_year_val1 = fin_year_val1.toString()
	Filters.push(new nlobjSearchFilter('name', null, 'is', fin_year_val1));
	var Column = new Array();
	Column.push(new nlobjSearchColumn('internalid'));
	Column.push(new nlobjSearchColumn('custrecord_hris_start_month'));
	Column.push(new nlobjSearchColumn('custrecord_hris_start_year'));
	Column.push(new nlobjSearchColumn('custrecord_hris_end_month'));
	Column.push(new nlobjSearchColumn('custrecord_hris_end_year'));
	var searchFinYr = nlapiSearchRecord('customrecord_hris_payroll_financial_year', null, Filters, Column);
	////nlapiLogExecution('DEBUG', 'In LOP', 'searchFinYr=^^^^^===================' + searchFinYr.length)
	if (searchFinYr != null) {
		fStartMonth = searchFinYr[0].getValue('custrecord_hris_start_month');
		fStartYear = searchFinYr[0].getValue('custrecord_hris_start_year');
		fEndMonth = searchFinYr[0].getValue('custrecord_hris_end_month');
		fEndyear = searchFinYr[0].getValue('custrecord_hris_end_year');
	}
	////nlapiLogExecution('DEBUG', 'In LOP', 'fStartMonth=^^^^^===================' + fStartMonth);

	//return fStartMonth+"#"+ fStartYear +"#"+fEndMonth +"#"+ fEndyear
	return fStartYear;
}



function searchFinrecordYearText(fin_year_val1) {
	////nlapiLogExecution('DEBUG', 'In LOP', 'fin_year_val1=^^^^^===================' + fin_year_val1)
	var fStartYearText;
	var Filters = new Array();
	fin_year_val1 = fin_year_val1.toString()
	Filters.push(new nlobjSearchFilter('name', null, 'is', fin_year_val1));
	var Column = new Array();
	Column.push(new nlobjSearchColumn('internalid'));
	Column.push(new nlobjSearchColumn('custrecord_hris_start_month'));
	Column.push(new nlobjSearchColumn('custrecord_hris_start_year'));
	Column.push(new nlobjSearchColumn('custrecord_hris_end_month'));
	Column.push(new nlobjSearchColumn('custrecord_hris_end_year'));
	var searchFinYr = nlapiSearchRecord('customrecord_hris_payroll_financial_year', null, Filters, Column);
	if (searchFinYr != null) {
		fStartYearText = searchFinYr[0].getText('custrecord_hris_start_year');

	}

	return fStartYearText;
}
function gethrisMonth(monthParameter) {
	if (monthParameter == 1) {
		return '1';
	} else if (monthParameter == 2) {
		return '2';
	} else if (monthParameter == 3) {
		return '3';
	} else if (monthParameter == 4) {
		return '4';
	} else if (monthParameter == 5) {
		return '5';
	} else if (monthParameter == 6) {
		return '6';
	} else if (monthParameter == 7) {
		return '7';
	} else if (monthParameter == 8) {
		return '8';
	} else if (monthParameter == 9) {
		return '9';
	} else if (monthParameter == 10) {
		return '10';
	} else if (monthParameter == 11) {
		return '11';
	} else if (monthParameter == 12) {
		return '12';
	}
}
function getmonth_in_number(wage_month) {
	var x;
	switch (wage_month) {
		case 'January':
			x = '1'
			break;
		case 'February':
			x = '2'
			break;
		case 'March':
			x = '3'
			break;
		case 'April':
			x = '4'
			break;
		case 'May':
			x = '5'
			break;
		case 'June':
			x = '6'
			break;
		case 'July':
			x = '7'
			break;
		case 'August':
			x = '8'
			break;
		case 'September':
			x = '9'
			break;
		case 'October':
			x = '10'
			break;
		case 'November':
			x = '11'
			break;
		case 'December':
			x = '12'
			break;
	} //End of switch (wage_month)
	return x
}



function get_Year_id(val) {
	nlapiLogExecution('DEBUG', 'val::::::::::', val)
	val = val.toString();
	nlapiLogExecution('DEBUG', 'val---', val)
	var year_id;
	var customlist_hris_year_masterSearch = nlapiSearchRecord("customlist_hris_year_master", null,
		[
			["name", "startswith", val]
		],
		[
			new nlobjSearchColumn("internalid"),
			new nlobjSearchColumn("name")
		]
	);
	nlapiLogExecution('DEBUG', 'customlist_hris_year_masterSearch::::::::::', customlist_hris_year_masterSearch)

	if (customlist_hris_year_masterSearch) {
		year_id = customlist_hris_year_masterSearch[0].getValue('internalid');

	}
	nlapiLogExecution('DEBUG', 'year_id', year_id)
	return year_id
}

function getmonth_days(wage_month, year) {
	var standard_month_days;
	var _yearText = nlapiLookupField('customlist_hris_year_master', year, 'name');
	standard_month_days = new Date(_yearText, wage_month, 0).getDate();
	return standard_month_days
}


function toWordsFunc(s) {
	var str = ''

	var th = new Array('Crore ', 'Lakhs ', 'Thousand ', 'Hundred ');

	// uncomment this line for English Number System

	// var th = ['','thousand','million', 'milliard','billion'];
	var dg = new Array('10000000', '100000', '1000', '100');

	var dem = s.substr(s.lastIndexOf('.') + 1)

	//lastIndexOf(".")
	//alert(dem)
	s = parseInt(s)
	//alert('passed value'+s)
	var d
	var n1, n2
	while (s >= 100) {
		for (var k = 0; k < 4; k++) {
			//alert('s ki value'+s)
			d = parseInt(s / dg[k])
			//alert('d='+d)
			if (d > 0) {
				if (d >= 20) {
					//alert ('in 2nd if ')
					n1 = parseInt(d / 10)
					//alert('n1'+n1)
					n2 = d % 10
					//alert('n2'+n2)
					printnum2(n1)
					printnum1(n2)
				} else
					printnum1(d)
				str = str + th[k]
			}
			s = s % dg[k]
		}
	}
	if (s >= 20) {
		n1 = parseInt(s / 10)
		n2 = s % 10
	} else {
		n1 = 0
		n2 = s
	}

	printnum2(n1)
	printnum1(n2)
	if (dem > 0) {
		decprint(dem)
	}
	return str

	function decprint(nm) {
		// alert('in dec print'+nm)
		if (nm >= 20) {
			n1 = parseInt(nm / 10)
			n2 = nm % 10
		} else {
			n1 = 0
			n2 = parseInt(nm)
		}
		//alert('n2=='+n2)
		//str = str + 'And '//Line commented by Sumant Kumar
		str = str + 'and ' //Line added by Sumant Kumar

		printnum2(n1)

		printnum1(n2)
	}

	function printnum1(num1) {
		//alert('in print 1'+num1)
		switch (num1) {
			case 1:
				str = str + 'One '
				break;
			case 2:
				str = str + 'Two '
				break;
			case 3:
				str = str + 'Three '
				break;
			case 4:
				str = str + 'Four '
				break;
			case 5:
				str = str + 'Five '
				break;
			case 6:
				str = str + 'Six '
				break;
			case 7:
				str = str + 'Seven '
				break;
			case 8:
				str = str + 'Eight '
				break;
			case 9:
				str = str + 'Nine '
				break;
			case 10:
				str = str + 'Ten '
				break;
			case 11:
				str = str + 'Eleven '
				break;
			case 12:
				str = str + 'Twelve '
				break;
			case 13:
				str = str + 'Thirteen '
				break;
			case 14:
				str = str + 'Fourteen '
				break;
			case 15:
				str = str + 'Fifteen '
				break;
			case 16:
				str = str + 'Sixteen '
				break;
			case 17:
				str = str + 'Seventeen '
				break;
			case 18:
				str = str + 'Eighteen '
				break;
			case 19:
				str = str + 'Nineteen '
				break;
		}
	}

	function printnum2(num2) {
		// alert('in print 2'+num2)
		switch (num2) {
			case 2:
				str = str + 'Twenty '
				break;
			case 3:
				str = str + 'Thirty '
				break;
			case 4:
				str = str + 'Forty '
				break;
			case 5:
				str = str + 'Fifty '
				break;
			case 6:
				str = str + 'Sixty '
				break;
			case 7:
				str = str + 'Seventy '
				break;
			case 8:
				str = str + 'Eighty '
				break;
			case 9:
				str = str + 'Ninety '
				break;
		}
		// alert('str in loop2'+str)
	}
}

function searchCurrency(paygroup) {
	var currencyname;
	var Filters = new Array();
	Filters.push(new nlobjSearchFilter('internalid', null, 'is', paygroup));
	Filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	var column = new Array();
	column.push(new nlobjSearchColumn('name')); //
	column.push(new nlobjSearchColumn('custrecord_hris__currency'));
	var searchEarnGrossCheck = nlapiSearchRecord('customrecord_hris_process_groupmaster', null, Filters, column);
	if (searchEarnGrossCheck != null) {
		PaygrpName = searchEarnGrossCheck[0].getValue('name');
		currencyname = searchEarnGrossCheck[0].getText('custrecord_hris__currency');
	} //End if(searchEarnGrossCheck !=null)
	return currencyname;
}


function get_emp_details(paygroup, employee) {
	nlapiLogExecution('DEBUG', 'get_emp_details()*********', 'paygroup********** ' + paygroup)
	nlapiLogExecution('DEBUG', 'get_emp_details()*********', 'employee********** ' + employee)
	var filters1 = new Array();
	var columns1 = new Array();

	filters1.push(new nlobjSearchFilter('custrecord_hris_empchange_emp_pay_pro_gp', null, 'is', paygroup))
	filters1.push(new nlobjSearchFilter('custrecord_hris_empchange_employee_nam', null, 'is', employee))

	columns1.push(new nlobjSearchColumn('internalid', null, 'max'));

	var searchEmp = nlapiSearchRecord('customrecord_hris_employee_compen_change', null, filters1, columns1);

	if (searchEmp != null) {
		for (var i = 0; i < searchEmp.length; i++) {
			var emp_data_chg_id = searchEmp[i].getValue('internalid', null, 'max');

			var o_emp_data_change = nlapiLoadRecord('customrecord_hris_employee_compen_change', emp_data_chg_id);

			var s_emp_name = o_emp_data_change.getFieldText('custrecord_hris_empchange_employee_nam')
			s_emp_first_name = formatAndReplaceMessageForAnd(s_emp_name)

			var s_department = o_emp_data_change.getFieldText('custrecord_hris_empchange_department')
			s_department = formatAndReplaceMessageForAnd(s_department)

			var s_grade = o_emp_data_change.getFieldText('custrecord_hris_empchange_grade')
			s_grade = formatAndReplaceMessageForAnd(s_grade)

			var designation = o_emp_data_change.getFieldText('custrecord_hris_empchange_designation')
			designation = formatAndReplaceMessageForAnd(designation)

			var bank_name = o_emp_data_change.getFieldText('custrecord_hris_empchange_bank_name')
			bank_name = formatAndReplaceMessageForAnd(bank_name)

			var bank_acc_no = o_emp_data_change.getFieldValue('custrecord_hris_empchange_bank_acc_no')

			var doj = o_emp_data_change.getFieldValue('custrecord_hris_empchange_date_of_join');
			return s_emp_name + '#' + s_department + "#" + s_grade + "#" + designation + "#" + bank_name + "#" + bank_acc_no + "#" + doj;
		}

	}

}


function formatAndReplaceMessageForAnd(messgaeToBeSendParaAnd) {
	messgaeToBeSendParaAnd = messgaeToBeSendParaAnd.toString();

	messgaeToBeSendParaAnd = nlapiEscapeXML(messgaeToBeSendParaAnd)//messgaeToBeSendParaAnd.replace(/&/g, "&"); /// /g

	return messgaeToBeSendParaAnd;
}


function DaysBetweenDates(val1, val2) {
	//var date1 = nlapiStringToDate(val1);
	//var date2 = nlapiStringToDate(val2);
	var date1 = val1;
	var date2 = val2;

	var diffTime = Math.abs(date2.getTime() - date1.getTime());
	var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return diffDays + 1;
}