/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @Description Converted to SuiteScript 2.1 (functionality unchanged)
 */
define(['N/record', 'N/log', 'N/query', 'N/format', 'N/ui/serverWidget'],
    function (record, log, query, format, serverWidget) {

        function onRequest(context) {
            if (context.request.method === 'GET') {
               // var settlementId = context.request.parameters.id || 5;
 var settlementId = context.request.parameters.settlementId;
                if (!settlementId) {
                    context.response.write('<h3>Error: Settlement ID is required.</h3>');
                    return;
                }

                try {
                    var report = generateJVReport(settlementId);

                    var form = serverWidget.createForm({
                        title: 'Final Settlement JV Preview Report'
                    });

                    form.addButton({
                        id: 'custpage_excelbtn',
                        label: 'Export As Excel',
                        functionName: 'exportToExcel'
                    });

                    var htmlField = form.addField({
                        id: 'custpage_report_html',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Detailed Preview'
                    });
                    htmlField.defaultValue = report.html;

                    var script = '<script>' +
                        'function exportToExcel() {' +
                        '  var table = document.getElementById("resultsTable");' +
                        '  var html = table.outerHTML;' +
                        '  var url = "data:application/vnd.ms-excel," + encodeURIComponent(html);' +
                        '  var link = document.createElement("a");' +
                        '  link.href = url;' +
                        '  link.download = "Final_Settlement_JV_Report.xls";' +
                        '  document.body.appendChild(link);' +
                        '  link.click();' +
                        '  document.body.removeChild(link);' +
                        '}' +
                        '</script>';

                    htmlField.defaultValue += script;

                    context.response.writePage(form);

                } catch (e) {
                    log.error('Report Error', e);
                    context.response.write('<h3 style="color:red;">Error: ' + e.message + '</h3>');
                }
            }
        }

        function generateJVReport(settlementId) {
            var newRecordObj = record.load({
                type: 'customrecord_hris_finasettlement_process',
                id: settlementId,
                isDynamic: true
            });

            var empid = newRecordObj.getValue('custrecordhris_fin_emplo_name');
            var empname = newRecordObj.getText('custrecordhris_fin_emplo_name');
            var paygroup = newRecordObj.getValue('custrecord_hris_fin_payprocessgrp');
            var paymonth = newRecordObj.getValue('custrecord_hris_fin_paymonth');
            var yearname = newRecordObj.getText('custrecord_hris_fin_year');
            var subsidiaries = newRecordObj.getText('custrecord_hris_fin_subsidiary');

            var leavesalaryamt = parseFloat(newRecordObj.getValue('custrecord_hris_fin_leave_salary_amt')) || 0;
            var salaryadvanceamt = parseFloat(newRecordObj.getValue('custrecord_hris_fin_salaryadvanceamount')) || 0;
            var loanamount = parseFloat(newRecordObj.getValue('custrecord_hris_fin_loan_amt')) || 0;
            var gradutityamt = parseFloat(newRecordObj.getValue('custrecord_hris_fin_gratuity_amount')) || 0;
            var otheraddition = parseFloat(newRecordObj.getValue('custrecord_hris_fin_other_addition')) || 0;
            var otherdeduction = parseFloat(newRecordObj.getValue('custrecord_hris_fin_other_deduction')) || 0;
            var netamount = parseFloat(newRecordObj.getValue('custrecord_hris_fin_net_amt')) || 0;

            var employeeRecord = record.load({ type: record.Type.EMPLOYEE, id: empid, isDynamic: false });
            var department = employeeRecord.getValue('custentity_hris_empdepartment_new');
            var subdepartment = employeeRecord.getValue('custentity_hris_empsubdepartment__');
            var hrmsdepartmentname = employeeRecord.getText('custentity_hris_empdepartment_new');
            var hrmasubdepartmentname = employeeRecord.getText('custentity_hris_empsubdepartment__');
            
            var employeecat = newRecordObj.getValue('custrecord_hirs_fin_employee_cat');
            var employeecatname = newRecordObj.getText('custrecord_hirs_fin_employee_cat');

            var hrisDetails = getEmployeeHRISDetails(empid);
            var stdDeptName = hrisDetails ? hrisDetails.stddeptname : '';
            var locationName = hrisDetails ? hrisDetails.locationname : '';

            var month = getMonth(paymonth);

            var previewLines = [];

            // Salary Advance
            if (salaryadvanceamt > 0) {
                var salaryDetails = getleavesalarycomponentwise(settlementId);
                log.debug('Salary Advance Details Count', salaryDetails.length);
                salaryDetails.forEach(function(comp) {

                    var amt = parseFloat(comp.salaryamount) || 0;
                    if (amt > 0) {
                        var pendAcc = getpendingsalarycomponentaccount(paygroup, employeecat, department, subdepartment, comp.paycompid, newRecordObj.getValue('custrecord_hris_fin_subsidiary'));

                        var pendArr = pendAcc ? pendAcc.split("#") : [];
                        previewLines.push({
                            dr: amt, cr: 0, account: pendArr[2] || '', memo: comp.paycompname || '',
                            stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                            hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                            locationName: locationName
                        });
                    }
                });
            }

            // Net Amount
            if (netamount > 0) {
                var netComp = getnetpaycomponent(paygroup);
                var netArr = netComp ? netComp.split("#") : [];
                var netAccount = getnetpaycomponentaccount(paygroup, employeecat, department, subdepartment, netArr[1], newRecordObj.getValue('custrecord_hris_fin_subsidiary'));
                var netAccArr = netAccount ? netAccount.split("#") : [];
                var Deduct = parseFloat(netamount);
                previewLines.push({ 
                    dr: 0, cr: Deduct, account: netAccArr[3] || '', memo: netArr[2] || '',
                    stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                    hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                    locationName: locationName
                });
            }

            // Gratuity
            if (gradutityamt > 0) {
                var gratComp = getgrautitycomponent(paygroup);
                var gratArr = gratComp ? gratComp.split("#") : [];
                var gratAccount = getgrautitycomponentaccount(paygroup, employeecat, department, subdepartment, gratArr[1], newRecordObj.getValue('custrecord_hris_fin_subsidiary'));
                var gratAccArr = gratAccount ? gratAccount.split("#") : [];
                var Deduct = parseFloat(gradutityamt);
                previewLines.push({ 
                    dr: Deduct, cr: 0, account: gratAccArr[2] || '', memo: gratArr[2] || '',
                    stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                    hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                    locationName: locationName
                });
            }

            // Loan
            if (loanamount > 0) {
                var loanDetails = loanamountcomponentwise(settlementId);
                loanDetails.forEach(function(comp) {
                    var amt = parseFloat(comp.salaryamount) || 0;
                    var paycomponent = comp.paycompid;
                    var loanAccount = getloancomponentaccount(paygroup, employeecat, department, subdepartment, paycomponent, newRecordObj.getValue('custrecord_hris_fin_subsidiary'));
                    var loanAccArr = loanAccount ? loanAccount.split("#") : [];
                    previewLines.push({ 
                        dr: 0, cr: amt, account: loanAccArr[2] || '', memo: comp.paycompname || '',
                        stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                        hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                        locationName: locationName
                    });
                });
            }

            // Other Addition / Deduction
            if (otheraddition > 0 || otherdeduction > 0) {
                var otherDetails = getothercomponentwise(settlementId);
                otherDetails.forEach(function(comp) {
                    var amt = parseFloat(comp.salaryamount) || 0;
                    var paycomponent = comp.paycompid;
                    var componenttype = comp.componenttype;
                    var otherAccount = getothercomponentaccount(paygroup, employeecat, department, subdepartment, paycomponent, newRecordObj.getValue('custrecord_hris_fin_subsidiary'));
                    var otherAccArr = otherAccount ? otherAccount.split("#") : [];

                    if (componenttype == 1) {
                        previewLines.push({ 
                            dr: amt, cr: 0, account: otherAccArr[2] || '', memo: comp.paycompname || '',
                            stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                            hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                            locationName: locationName
                        });
                    } else if (componenttype == 2) {
                        previewLines.push({ 
                            dr: 0, cr: amt, account: otherAccArr[2] || '', memo: comp.paycompname || '',
                            stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                            hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                            locationName: locationName
                        });
                    }
                });
            }

            // Leave Salary
            if (leavesalaryamt > 0) {
                var leaveComp = getleavesettlementcomponent(paygroup);
                var leaveArr = leaveComp ? leaveComp.split("#") : [];
                var leaveAccount = getleavecomponentaccount(paygroup, employeecat, department, subdepartment, leaveArr[1], newRecordObj.getValue('custrecord_hris_fin_subsidiary'));
                var leaveAccArr = leaveAccount ? leaveAccount.split("#") : [];
                var Deduct = parseFloat(leavesalaryamt);
                previewLines.push({ 
                    dr: Deduct, cr: 0, account: leaveAccArr[2] || '', memo: leaveArr[2] || '',
                    stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                    hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                    locationName: locationName
                });
            }

            var html = buildReportHTML(previewLines, subsidiaries, paymonth, yearname, empname);

            return { html: html };
        }

          function buildReportHTML(lines, subsidiary, monthParam, yearParam, empName) {
            if (!lines || lines.length === 0) {
                return '<h3 style="color:orange;">No data found for this settlement.</h3>';
            }

          /*   var html = '<style type="text/css">table{border-collapse:collapse;width:100%;margin-top:20px;}' +
                       'th,td{border:1px solid #ccc;padding:8px;text-align:left;font-family:Verdana,sans-serif;}' +
                       'th{background-color:#607799;color:white;font-weight:bold;}' +
                       'tr:hover td{background-color:#E2E4E0;}</style>';

            html += '<table id="resultsTable" style="width:100%;">'; */
               var html = '<style type="text/css">';
      html += ".tbl tr:hover td { background-color: #B4B6B3 };";
      html += "</style>";
      html = '<table id="resultsTable" class="display" style="width:100%; margin-top:20px;">';

      html += '<tr height="14" style="height:20.5pt">';

            html += '<tr height="14" style="height:20.5pt"><td colspan="12" style="font-size:12pt;font-weight:700;font-family:Verdana;text-align:center;">' +
                    'Final Settlement Journal - ' + getMonthName(monthParam) + ' ' + yearParam + '</td></tr>';

            html += '<tr height="14"><td colspan="12" align="center" style="font-size:12pt;font-weight:700;font-family:Verdana;">' +
                    subsidiary + '</td></tr>';

            html += '<tr height="14"><td colspan="12" align="left" style="background-color:#E2E4E0;font-size:12pt;font-weight:700;font-weight:bold;">' +
                    'Employee: ' + empName + '</td></tr>';

            html += '<tr style="height:25.5pt">' +
                    '<td style="background-color:#607799;font-size:16px;color:white;">DR/CR</td>' +
                    '<td style="background-color:#607799;font-size:16px;color:white;">Account</td>' +                    
                    '<td style="background-color:#607799;font-size:16px;color:white;">Department</td>' +
                    '<td style="background-color:#607799;font-size:16px;color:white;">HRMS Department</td>' +
                    '<td style="background-color:#607799;font-size:16px;color:white;">HRMS Subdepartment</td>' +
                    '<td style="background-color:#607799;font-size:16px;color:white;">Location</td>' +
                    '<td style="background-color:#607799;font-size:16px;color:white;">Employee Category</td>' +
                    '<td style="background-color:#607799;font-size:16px;color:white;">Memo</td>' +
                    '<td style="background-color:#607799;font-size:16px;color:white;">Debit</td>' +
                    '<td style="background-color:#607799;font-size:16px;color:white;">Credit</td></tr>';

            var totaldebit = 0.0;
            var totalcredit = 0.0;

            lines.forEach(function(line) {
                var debitamt = parseFloat(line.dr) || 0;
                var creditamt = parseFloat(line.cr) || 0;
                var acctxt = (debitamt > 0) ? 'DR' : 'CR';

                totaldebit += debitamt;
                totalcredit += creditamt;

                html += '<tr height="14" style="height:20.5pt;background-color:#E2E4E0;">' +
                        '<td align="center">' + acctxt + '</td>' +
                        '<td align="center">' + (line.account || '') + '</td>' +
                        
                        '<td>' + (line.stdDeptName || '') + '</td>' +
                        '<td>' + (line.hrmsdepartmentname || '') + '</td>' +
                        '<td>' + (line.hrmasubdepartmentname || '') + '</td>' +
                        '<td>' + (line.locationName || '') + '</td>' +
                        '<td>' + (line.employeecatname || '') + '</td>' +
                        '<td>' + (line.memo || '') + '</td>' +
                        '<td align="right">' + debitamt.toFixed(2) + '</td>' +
                        '<td align="right">' + creditamt.toFixed(2) + '</td></tr>';
            });

            html += '<tr height="14" style="height:10.5pt;background-color:#B4B6B3;">' +
                    '<td colspan="8">&nbsp;</td>' +
                    '<td align="right"><b>' + totaldebit.toFixed(2) + '</b></td>' +
                    '<td align="right"><b>' + totalcredit.toFixed(2) + '</b></td></tr></table>';

            return html;
        }

        // ====================== HELPER FUNCTIONS ======================

        function getMonthName(monthParameter) {
            var months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return months[parseInt(monthParameter)] || '';
        }

        function getMonth(monthParameter) {
            var months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return months[monthParameter] || '';
        }

        function getEmployeeHRISDetails(empId) {
            try {
                var sql = "SELECT D.ID AS deptId, D.name AS deptName, D.parent AS deptParentId, " +
                          "BUILTIN.DF(D.parent) AS deptParentName, " +
                          "S.custrecord_hris_standlocation AS locationId, " +
                          "BUILTIN.DF(S.custrecord_hris_standlocation) AS locationName " +
                          "FROM employee E " +
                          "LEFT JOIN department D ON E.custentity_hris_empdepartment_new = D.custrecord_hris_departmenthrms " +
                          "AND (E.custentity_hris_empsubdepartment__ = D.custrecord_hris_subdepartmenthrms OR D.custrecord_hris_subdepartmenthrms IS NULL) " +
                          "LEFT JOIN subsidiary S ON E.subsidiary = S.id " +
                          "WHERE E.id = " + empId;

                var results = query.runSuiteQL({ query: sql }).asMappedResults();
                if (results.length === 0) return null;

                var row = results[0];
                var stdDeptName = row.deptparentid ? row.deptparentname + " : " + row.deptname : row.deptname;

                return {
                    stddeptname: stdDeptName,
                    stddeptid: row.deptid,
                    locationid: row.locationid,
                    locationname: row.locationname
                };
            } catch (e) {
                log.error('getEmployeeHRISDetails', e);
                return null;
            }
        }

        function getleavesalarycomponentwise(leaveSettlemenID) {
            var sql = "SELECT c.id as paycompid, BUILTIN.DF(c.id) as paycompname, c.custrecord_hris_account_name as accountid, " +
                      "c.custrecord_hris_payroll_component_type as componenttype, b.custrecord_hris_saladv_salaryamount salaryamount " +
                      "FROM customrecord_hris_finasettlement_process a " +
                      "JOIN customrecord_hris_salaryadvancedetails b ON a.id = b.custrecord_hris_saladv_settlelink " +
                      "JOIN customrecord_hris_payroll_component c ON b.custrecord_hris_saladv_payrollcomponent = c.id " +
                      "WHERE a.id = " + leaveSettlemenID;
            return query.runSuiteQL({ query: sql }).asMappedResults();
        }

        function loanamountcomponentwise(leaveSettlemenId) {
            var sql = "SELECT c.id AS paycompid, BUILTIN.DF(c.id) AS paycompname, c.custrecord_hris_account_name AS accountid, " +
                      "c.custrecord_hris_payroll_component_type AS componenttype, b.custrecord_njt_fin_settl_amt_paid AS salaryamount " +
                      "FROM customrecord_njt_fin_sett_loan_details b " +
                      "JOIN customrecord_hris_loan_master d ON d.id = b.custrecord_njt_fin_set_loan_type " +
                      "JOIN customrecord_hris_payroll_component c ON d.custrecord_hris_loan_component = c.id " +
                      "WHERE b.custrecord_njt_fin_loan_set_link = " + leaveSettlemenId;
            return query.runSuiteQL({ query: sql }).asMappedResults();
        }

        function getothercomponentwise(leaveSettlemenID) {
            var sql = "SELECT c.id AS paycompid, BUILTIN.DF(c.id) AS paycompname, c.custrecord_hris_account_name AS accountid, " +
                      "c.custrecord_hris_payroll_component_type AS componenttype, b.custrecord_hirs_fin_det_amount AS salaryamount " +
                      "FROM customrecord_hris_finasettlement_details b " +
                      "JOIN customrecord_hris_payroll_component c ON b.custrecord_hris_fin_details_paycom = c.id " +
                      "WHERE b.custrecord_hris_finset_link = " + leaveSettlemenID;
            return query.runSuiteQL({ query: sql }).asMappedResults();
        }

        function getgrautitycomponent(paygroup) {
            var sql = "SELECT id as paycompid, BUILTIN.DF(id) paycompname, custrecord_hris_account_name as accountid " +
                      "FROM customrecord_hris_payroll_component " +
                      "WHERE custrecord_hris__sequence_no_ = 47 AND custrecord_hris_pay_process_group = " + paygroup;
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? res[0].accountid + "#" + res[0].paycompid + "#" + res[0].paycompname : '';
        }

        function getleavesettlementcomponent(paygroup) {
            var sql = "SELECT id as paycompid, BUILTIN.DF(id) paycompname, custrecord_hris_account_name as accountid " +
                      "FROM customrecord_hris_payroll_component " +
                      "WHERE custrecord_hris__sequence_no_ = 46 AND custrecord_hris_pay_process_group = " + paygroup + " AND isinactive = 'F'";
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? res[0].accountid + "#" + res[0].paycompid + "#" + res[0].paycompname : '';
        }

        function getnetpaycomponent(paygroup) {
            var sql = "SELECT id as paycompid, BUILTIN.DF(id) paycompname, custrecord_hris_account_name as accountid " +
                      "FROM customrecord_hris_payroll_component " +
                      "WHERE custrecord_hris__sequence_no_ = 100 AND isinactive ='F' AND custrecord_hris_pay_process_group = " + paygroup;
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? res[0].accountid + "#" + res[0].paycompid + "#" + res[0].paycompname : '';
        }

        function getpendingsalarycomponentaccount(paygroup, employeecategory, department, subdepartment, paycomponent, subsidiary) {
            var sql = "SELECT custrecord_hris_acctmap_glcode, custrecord_hris_acctmap_salarypayableacc, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_glcode) as glcodename, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_salarypayableacc) as salaryname " +
                      "FROM customrecord_hris_accountmapping " +
                      "WHERE custrecord_hris_acctmap_paygroup = " + paygroup +
                      " AND custrecord_hris_acctmap_department = " + department +
                      " AND custrecord_hris_acctmap_employeecategory = " + employeecategory +
                      " AND custrecord_hris_acctmap_paycomponent = " + paycomponent +
                      " AND custrecord_hris_acctmap_subsidiary = " + subsidiary +
                      " AND custrecord_hris_acctmap_subdepartment = " + subdepartment +
                      " AND isinactive = 'F'";
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            if (res.length > 0) {
                return res[0].custrecord_hris_acctmap_glcode + "#" + res[0].custrecord_hris_acctmap_salarypayableacc + 
                       "#" + (res[0].glcodename || '') + "#" + (res[0].salaryname || '');
            }
            return '';
        }

        function getgrautitycomponentaccount(paygroup, employeecategory, department, subdepartment, paycomponent, subsidiary) {
            var sql = "SELECT custrecord_hris_acctmap_glcode, custrecord_hris_acctmap_salarypayableacc, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_glcode) as glcodename, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_salarypayableacc) as salaryname " +
                      "FROM customrecord_hris_accountmapping " +
                      "WHERE custrecord_hris_acctmap_paygroup = " + paygroup +
                      " AND custrecord_hris_acctmap_department = " + department +
                      " AND custrecord_hris_acctmap_employeecategory = " + employeecategory +
                      " AND custrecord_hris_acctmap_paycomponent = " + paycomponent +
                      " AND custrecord_hris_acctmap_subsidiary = " + subsidiary +
                      " AND custrecord_hris_acctmap_subdepartment = " + subdepartment +
                      " AND custrecord_hris_acctmap_accuraltype = 3 " +
                      " AND custrecord_hris_acctmap_transactiontype = 7 " +
                      " AND isinactive = 'F'";
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            if (res.length > 0) {
                return res[0].custrecord_hris_acctmap_glcode + "#" + res[0].custrecord_hris_acctmap_salarypayableacc + 
                       "#" + (res[0].glcodename || '') + "#" + (res[0].salaryname || '');
            }
            return '';
        }

        function getleavecomponentaccount(paygroup, employeecategory, department, subdepartment, paycomponent, subsidiary) {
            var sql = "SELECT custrecord_hris_acctmap_glcode, custrecord_hris_acctmap_salarypayableacc, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_glcode) as glcodename, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_salarypayableacc) as salaryname " +
                      "FROM customrecord_hris_accountmapping " +
                      "WHERE custrecord_hris_acctmap_paygroup = " + paygroup +
                      " AND custrecord_hris_acctmap_department = " + department +
                      " AND custrecord_hris_acctmap_employeecategory = " + employeecategory +
                      " AND custrecord_hris_acctmap_paycomponent = " + paycomponent +
                      " AND custrecord_hris_acctmap_subsidiary = " + subsidiary +
                      " AND custrecord_hris_acctmap_subdepartment = " + subdepartment +
                      " AND custrecord_hris_acctmap_accuraltype = 1 " +
                      " AND custrecord_hris_acctmap_transactiontype = 3 " +
                      " AND isinactive = 'F'";
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            if (res.length > 0) {
                return res[0].custrecord_hris_acctmap_glcode + "#" + res[0].custrecord_hris_acctmap_salarypayableacc + 
                       "#" + (res[0].glcodename || '') + "#" + (res[0].salaryname || '');
            }
            return '';
        }

        function getloancomponentaccount(paygroup, employeecategory, department, subdepartment, paycomponent, subsidiary) {
            var sql = "SELECT custrecord_hris_acctmap_glcode, custrecord_hris_acctmap_salarypayableacc, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_glcode) as glcodename, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_salarypayableacc) as salaryname " +
                      "FROM customrecord_hris_accountmapping " +
                      "WHERE custrecord_hris_acctmap_paygroup = " + paygroup +
                      " AND custrecord_hris_acctmap_department = " + department +
                      " AND custrecord_hris_acctmap_employeecategory = " + employeecategory +
                      " AND custrecord_hris_acctmap_paycomponent = " + paycomponent +
                      " AND custrecord_hris_acctmap_subsidiary = " + subsidiary +
                      " AND custrecord_hris_acctmap_subdepartment = " + subdepartment +
                      " AND isinactive = 'F'";
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            if (res.length > 0) {
                return res[0].custrecord_hris_acctmap_glcode + "#" + res[0].custrecord_hris_acctmap_salarypayableacc + 
                       "#" + (res[0].glcodename || '') + "#" + (res[0].salaryname || '');
            }
            return '';
        }

        function getothercomponentaccount(paygroup, employeecategory, department, subdepartment, paycomponent, subsidiary) {
            var sql = "SELECT custrecord_hris_acctmap_glcode, custrecord_hris_acctmap_salarypayableacc, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_glcode) as glcodename, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_salarypayableacc) as salaryname " +
                      "FROM customrecord_hris_accountmapping " +
                      "WHERE custrecord_hris_acctmap_paygroup = " + paygroup +
                      " AND custrecord_hris_acctmap_department = " + department +
                      " AND custrecord_hris_acctmap_employeecategory = " + employeecategory +
                      " AND custrecord_hris_acctmap_paycomponent = " + paycomponent +
                      " AND custrecord_hris_acctmap_subsidiary = " + subsidiary +
                      " AND custrecord_hris_acctmap_subdepartment = " + subdepartment +
                      " AND isinactive = 'F'";
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            if (res.length > 0) {
                return res[0].custrecord_hris_acctmap_glcode + "#" + res[0].custrecord_hris_acctmap_salarypayableacc + 
                       "#" + (res[0].glcodename || '') + "#" + (res[0].salaryname || '');
            }
            return '';
        }

        function getnetpaycomponentaccount(paygroup, employeecategory, department, subdepartment, paycomponent, subsidiary) {
            var sql = "SELECT custrecord_hris_acctmap_glcode, custrecord_hris_acctmap_salarypayableacc, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_glcode) as glcodename, " +
                      "BUILTIN.DF(custrecord_hris_acctmap_salarypayableacc) as salaryname " +
                      "FROM customrecord_hris_accountmapping " +
                      "WHERE custrecord_hris_acctmap_paygroup = " + paygroup +
                      " AND custrecord_hris_acctmap_department = " + department +
                      " AND custrecord_hris_acctmap_employeecategory = " + employeecategory +
                      " AND custrecord_hris_acctmap_paycomponent = " + paycomponent +
                      " AND custrecord_hris_acctmap_subsidiary = " + subsidiary +
                      " AND custrecord_hris_acctmap_subdepartment = " + subdepartment +
                      " AND isinactive = 'F'";
            var res = query.runSuiteQL({ query: sql }).asMappedResults();
            if (res.length > 0) {
                return res[0].custrecord_hris_acctmap_glcode + "#" + res[0].custrecord_hris_acctmap_salarypayableacc + 
                       "#" + (res[0].glcodename || '') + "#" + (res[0].salaryname || '');
            }
            return '';
        }

        return {
            onRequest: onRequest
        };
    });