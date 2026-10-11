/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @Description Converted to SuiteScript 2.1 (functionality unchanged)
 */
define(['N/record', 'N/log', 'N/query', 'N/format', 'N/ui/serverWidget','N/http'],
    function (record, log, query, format, serverWidget,http) {

        function onRequest(context) {
            if (context.request.method === 'GET') {
               // var settlementId = context.request.parameters.id || 5;
 var settlementId = context.request.parameters.settlementId;
                if (!settlementId) {
                    context.response.write('<h3>Error: Settlement ID is required.</h3>');
                    return;
                }
               

        try {
            var jvId = createJournalEntry(settlementId);

            // Direct Redirect to Record
           /*  var url = '/app/common/custom/custrecordentry.nl?rectype=2241&id=' + settlementId;
            context.response.sendRedirect({
                type: http.RedirectType.RECORD,
                id: settlementId,
                url: url
            }); */
         /*    var redirectUrl = '/app/common/custom/custrecordentry.nl?rectype=2241&id=' + settlementId;
                    
                    context.response.sendRedirect({
                        type: serverWidget.RedirectType.RECORD,
                        id: settlementId,
                        url: redirectUrl
                    }); */
/* 
                    var successHtml = '<h2 style="color:green;">Journal Entry Created Successfully!</h2>' +
                                      '<p><b>JV Internal ID:</b> ' + jvId + '</p>' +
                                      '<p>Redirecting to record...</p>';

                    context.response.write(successHtml);

                    // Redirect after a short delay (or direct)
                    context.response.sendRedirect({
                        type: serverWidget.RedirectType.RECORD,
                        id: settlementId,
                        url: '/app/common/custom/custrecordentry.nl?rectype=2241&id=' + settlementId
                    }); */
                    var html = '<h2 style="color:green;">Journal Entry Created Successfully!</h2>' +
                               '<p><b>Journal Entry ID:</b> ' + jvId + '</p>' +
                               '<p>Redirecting to record...</p>' +
                               '<script>setTimeout(function(){ window.location.href = "/app/common/custom/custrecordentry.nl?rectype=2241&id=' + settlementId + '"; }, 1500);</script>';

                    context.response.write(html);
            // Success Message + Redirect Link
                  /*   var html = '<h2 style="color:green;">Journal Entry Created Successfully!</h2>' +
                               '<p><b>Journal Entry ID:</b> ' + jvId + '</p>' +
                               '<p><a href="/app/common/custom/custrecordentry.nl?rectype=2241&id=' + settlementId + '" style="font-size:16px;">→ Go to Final Settlement Record</a></p>';

                    context.response.write(html); */

        } catch (e) {
            log.error('JV Creation Failed', e);
            context.response.write('<h3 style="color:red;">Error Creating Journal Entry: ' + e.message + '</h3>');
        }

              
            }
        }

        function createJournalEntry(settlementId) {
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
             var payyear = newRecordObj.getValue('custrecord_hris_fin_year');
            var subsidiaries = newRecordObj.getText('custrecord_hris_fin_subsidiary');
            var subsidiary =  newRecordObj.getValue('custrecord_hris_fin_subsidiary');

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
            var employeecategory = employeecat;
            var hrisDetails = getEmployeeHRISDetails(empid);
            var stdDeptName = hrisDetails ? hrisDetails.stddeptname : '';
            var locationName = hrisDetails ? hrisDetails.locationname : '';
            var stdDeptId = hrisDetails ? hrisDetails.stddeptid : '';
            var locationId = hrisDetails ? hrisDetails.locationid:'';
            var debit=0;
            var credit =0;
            var totaldebit= 0;
            var totalcredit = 0;
            var month = getMonth(paymonth);
            var today = newRecordObj.getValue('custrecord_hris_fin_pay_date');
            var emp =empid;
            var processtype =2;
                var jvObject = record.create({ type: 'journalentry', isDynamic: true });

            jvObject.setValue('customform', 162);
            jvObject.setValue('approvalstatus', 1);
            jvObject.setValue('subsidiary', subsidiary);
            jvObject.setValue('trandate', today);
            jvObject.setText('postingperiod', month + " " + yearname);
            jvObject.setValue('memo', 'Final Settlement for ' + month + ' ' + yearname);
            jvObject.setValue('custbody_hris_paygroup_jv', paygroup);
            jvObject.setValue('custbody_hris_jv_month', paymonth);
            jvObject.setValue('custbody_hris_jv_year',payyear);
            jvObject.setValue('custbody_hris_jv_employeename', empid);
          //  jvObject.setValue('custbody_hris_jv_emplegalname', empname);
             jvObject.setValue('custbody_hris_passjv_processtype', processtype);
            var previewLines = [];

            // Salary Advance
            if (salaryadvanceamt > 0) {
                var salaryDetails = getleavesalarycomponentwise(settlementId);
                salaryDetails.forEach(function(comp) {
                    var amt = parseFloat(comp.salaryamount) || 0;
                    if (amt > 0) {
                        var pendAcc = getpendingsalarycomponentaccount(paygroup, employeecat, department, subdepartment, comp.paycompid, newRecordObj.getValue('custrecord_hris_fin_subsidiary'));
                        var pendArr = pendAcc ? pendAcc.split("#") : [];
                     /*    previewLines.push({
                            dr: amt, cr: 0, account: pendArr[2] || '', memo: comp.paycompname || '',
                            stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                            hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                            locationName: locationName
                        }); */
                    debit=amt;
                    credit =0;
                    totaldebit = parseFloat(debit)+parseFloat(totaldebit);
                        totalcredit = parseFloat(credit)+parseFloat(totalcredit);
                          addJVLine(jvObject, pendArr[0], Deduct, 0,comp.paycompname, emp, department, subdepartment, stdDeptId, locationId, employeecategory);
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
           /*      previewLines.push({ 
                    dr: 0, cr: Deduct, account: netAccArr[3] || '', memo: netArr[2] || '',
                    stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                    hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                    locationName: locationName
                }); */
                    debit=0;
                    credit =Deduct;
                    totaldebit = parseFloat(debit)+parseFloat(totaldebit);
                        totalcredit = parseFloat(credit)+parseFloat(totalcredit);
                 addJVLine(jvObject, netAccArr[1], 0,Deduct, netArr [2], emp, department, subdepartment, stdDeptId, locationId, employeecategory);
            }

            // Gratuity
            if (gradutityamt > 0) {
                var gratComp = getgrautitycomponent(paygroup);
                var gratArr = gratComp ? gratComp.split("#") : [];
                var gratAccount = getgrautitycomponentaccount(paygroup, employeecat, department, subdepartment, gratArr[1], newRecordObj.getValue('custrecord_hris_fin_subsidiary'));
                var gratAccArr = gratAccount ? gratAccount.split("#") : [];
                var Deduct = parseFloat(gradutityamt);
            /*     previewLines.push({ 
                    dr: Deduct, cr: 0, account: gratAccArr[2] || '', memo: gratArr[2] || '',
                    stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                    hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                    locationName: locationName
                }); */
                    debit=Deduct;
                    credit =0;
                    totaldebit = parseFloat(debit)+parseFloat(totaldebit);
                        totalcredit = parseFloat(credit)+parseFloat(totalcredit);
                  addJVLine(jvObject, gratAccArr[0], Deduct, 0, gratArr[2], emp, department, subdepartment, stdDeptId, locationId, employeecategory);
            }

            // Loan
            if (loanamount > 0) {
                var loanDetails = loanamountcomponentwise(settlementId);
                loanDetails.forEach(function(comp) {
                    var amt = parseFloat(comp.salaryamount) || 0;
                    var paycomponent = comp.paycompid;
                    var loanAccount = getloancomponentaccount(paygroup, employeecat, department, subdepartment, paycomponent, newRecordObj.getValue('custrecord_hris_fin_subsidiary'));
                    var loanAccArr = loanAccount ? loanAccount.split("#") : [];
                   /*  previewLines.push({ 
                        dr: 0, cr: amt, account: loanAccArr[2] || '', memo: comp.paycompname || '',
                        stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                        hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                        locationName: locationName
                    }); */
                        debit=0;
                    credit =amt;
                    totaldebit = parseFloat(debit)+parseFloat(totaldebit);
                        totalcredit = parseFloat(credit)+parseFloat(totalcredit);
                    addJVLine(jvObject,  loanAccArr[0], 0,Deduct, comp.paycompname, emp, department, subdepartment, stdDeptId, locationId, employeecategory);
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
                       /*  previewLines.push({ 
                            dr: amt, cr: 0, account: otherAccArr[2] || '', memo: comp.paycompname || '',
                            stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                            hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                            locationName: locationName
                        }); */
                            debit=amt;
                    credit =0;
                    totaldebit = parseFloat(debit)+parseFloat(totaldebit);
                        totalcredit = parseFloat(credit)+parseFloat(totalcredit);
                         addJVLine(jvObject, otherAccArr [0], Deduct, 0, comp.paycompname, emp, department, subdepartment, stdDeptId, locationId, employeecategory);
                    } else if (componenttype == 2) {
                     /*    previewLines.push({ 
                            dr: 0, cr: amt, account: otherAccArr[3] || '', memo: comp.paycompname || '',
                            stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                            hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                            locationName: locationName
                        }); */
                            debit=0;
                    credit =amt;
                    totaldebit = parseFloat(debit)+parseFloat(totaldebit);
                        totalcredit = parseFloat(credit)+parseFloat(totalcredit);
                        addJVLine(jvObject, otherAccArr[0], 0, Deduct,comp.paycompname, emp, department, subdepartment, stdDeptId, locationId, employeecategory);
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
              /*   previewLines.push({ 
                    dr: Deduct, cr: 0, account: leaveAccArr[2] || '', memo: leaveArr[2] || '',
                    stdDeptName: stdDeptName, hrmsdepartmentname: hrmsdepartmentname,
                    hrmasubdepartmentname: hrmasubdepartmentname, employeecatname: employeecatname,
                    locationName: locationName
                }); */
                    debit=Deduct;
                    credit =0;
                    totaldebit = parseFloat(debit)+parseFloat(totaldebit);
                        totalcredit = parseFloat(credit)+parseFloat(totalcredit);
                  addJVLine(jvObject, leaveAccArr[0], Deduct, 0, leaveArr[2], emp, department, subdepartment, stdDeptId, locationId, employeecategory);
            }
            // if (parseFloat(totaldebit).toFixed(2) != parseFloat(totalcredit).toFixed(2)) {
             if (parseFloat(totaldebit) != parseFloat(totalcredit)) {
                        throw 'Debit Amount and Credit Amount should be same';
                    }
            var jvrecordId = '';

           /*   var jvrecordId = jvObject.save({ enableSourcing: true, ignoreMandatoryFields: true });

            // Update settlement record
            record.submitFields({
                type: 'customrecord_hris_finasettlement_process',
                id: settlementId,
                values: { 'custrecord_hris_fin_jo_no': jvrecordId }
            });

            log.debug("JV Created", "ID: " + jvrecordId); */
            return { jvId: jvrecordId };

          
        }


         function addJVLine(jvObject, account, debit, credit, memo, entity, department, subdepartment, stdDeptId, locationId, employeecategory) {
            jvObject.selectNewLine('line');
            jvObject.setCurrentSublistValue('line', 'account', account);
         /*    jvObject.setCurrentSublistValue('line', 'debit', debit.toFixed(2));
            jvObject.setCurrentSublistValue('line', 'credit', credit.toFixed(2)); */
               jvObject.setCurrentSublistValue('line', 'debit', debit);
            jvObject.setCurrentSublistValue('line', 'credit', credit);
            jvObject.setCurrentSublistValue('line', 'memo', memo);
            jvObject.setCurrentSublistValue('line', 'entity', entity);

            if (locationId) jvObject.setCurrentSublistValue('line', 'location', locationId);
            if (department) jvObject.setCurrentSublistValue('line', 'cseg_hris_empdept', department);
            if (stdDeptId) jvObject.setCurrentSublistValue('line', 'department', stdDeptId);
            if (subdepartment) {
                jvObject.setCurrentSublistValue('line', 'cseg_hris_empsubdpt', subdepartment);
                jvObject.setCurrentSublistValue('line', 'custcol_hris_jv_subdepartment', subdepartment);
            }
            if (employeecategory) jvObject.setCurrentSublistValue('line', 'custcol_hris_jv_employeecategory', employeecategory);

            jvObject.commitLine('line');
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