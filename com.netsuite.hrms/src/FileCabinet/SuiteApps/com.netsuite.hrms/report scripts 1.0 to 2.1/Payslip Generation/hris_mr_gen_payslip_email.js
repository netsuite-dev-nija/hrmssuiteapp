/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 *
 * Description: Generates payslip PDFs for selected employees using dynamic design & mapping,
 * saves them in File Cabinet (folder 14198), creates/updates payslip record, and emails the PDF.
 * ALL strings (SQL + HTML) are built using += concatenation — NO template literals.
 */
define([
  "N/record",
  "N/file",
  "N/render",
  "N/runtime",
  "N/task",
  "N/log",
  "N/query",
  "N/format",
  "N/email",
  "N/search"
], function (record, file, render, runtime, task, log, query, format, email, search) {

  // ========================================================================
  // GET INPUT DATA
  // ========================================================================
  function getInputData() {
    var scriptObj = runtime.getCurrentScript();
    var empPaygrp = scriptObj.getParameter({ name: "custscript_apm_payslip_printA" });
    var empTCount = scriptObj.getParameter({ name: "custscript_apm_checked_empA" });
    var employeeList = scriptObj.getParameter({ name: "custscript_apm_emp_nameA" });
    var empWageMonth = scriptObj.getParameter({ name: "custscript_apm_wage_mthA" });
    var yearVal = scriptObj.getParameter({ name: "custscript_apm_yearA" });
    var Subsidiary = scriptObj.getParameter({ name: "custscript_subsi_valueA" });

    log.debug("Script Parameters", {
      empPaygrp: empPaygrp,
      empTCount: empTCount,
      employeeList: employeeList,
      empWageMonth: empWageMonth,
      yearVal: yearVal,
      Subsidiary: Subsidiary,
    });

    var empIds = employeeList
      ? employeeList.split(",").map(function (empId) {
          return parseInt(empId.trim(), 10);
        })
      : [];

    log.debug("Employee IDs", empIds);

    record.submitFields({
      type: "customrecord_hris_mr_status_bar_rec",
      id: 11,
      values: { custrecord_hris_mr_sts: 2 },
      options: { enableSourcing: false, ignoreMandatoryFields: true }
    });

    return empIds;
  }

  // ========================================================================
  // MAP PHASE
  // ========================================================================
  function map(context) {
    var empId = parseInt(context.value, 10);
    log.debug("Mapping Employee ID", empId);
    try {
      var scriptObj = runtime.getCurrentScript();
      var empPaygrp = scriptObj.getParameter({ name: "custscript_apm_payslip_printA" });
      var empWageMonth = scriptObj.getParameter({ name: "custscript_apm_wage_mthA" });
      var yearVal = scriptObj.getParameter({ name: "custscript_apm_yearA" });
      var Subsidiary = scriptObj.getParameter({ name: "custscript_subsi_valueA" });

      var empData = {
        id: empId,
        empPaygrp: empPaygrp,
        empWageMonth: empWageMonth,
        yearVal: yearVal,
        Subsidiary: Subsidiary
      };

      context.write({
        key: empId.toString(),
        value: JSON.stringify(empData),
      });
    } catch (error) {
      log.error("Map Error for Employee ID: " + empId, error);
    }
  }

  // ========================================================================
  // REDUCE PHASE
  // ========================================================================
  function reduce(context) {
    var empId = context.key;
    log.debug("Reducing Employee ID", empId);
    try {
      var empData = JSON.parse(context.values[0]);
      var empPaygrp = empData.empPaygrp;
      var empWageMonth = empData.empWageMonth;
      var yearVal = empData.yearVal;
      var Subsidiary = empData.Subsidiary;
      var endYear = yearVal;

      var fileId = generatePayslip(empId, empPaygrp, empWageMonth, yearVal, endYear, Subsidiary);
      log.debug("Generated File ID for Employee " + empId, fileId);

      var payslipRecordId = createpaysliprecord(fileId, empId, empPaygrp, empWageMonth, yearVal, endYear, Subsidiary);
      log.debug("Payslip Record ID", payslipRecordId);

      var fileObj = file.load({ id: fileId });

      // === GET EMPLOYEE EMAIL USING += CONCATENATION ===
      var empEmailQuery = "";
      empEmailQuery += "SELECT custentity_hris_emp_payslip_emailid ";
      empEmailQuery += "FROM employee ";
      empEmailQuery += "WHERE id = " + empId;
      var emailResults = query.runSuiteQL({ query: empEmailQuery });
      var emailRecords = emailResults.asMappedResults();
      var empEmail = emailRecords.length > 0 ? emailRecords[0].custentity_hris_emp_payslip_emailid : null;

      if (!empEmail) {
        log.error("No email found for Employee ID", empId);
      } else {
        email.send({
          author: -5,
          recipients: empEmail,
          subject: "Your Monthly Payslip - " + empWageMonth + " " + endYear,
          body: "Dear Employee,\n\nPlease find your payslip attached.\n\nRegards,\nHR Team",
          attachments: [fileObj]
        });
        log.audit("Email sent successfully to", empEmail);
      }

      context.write(fileId.toString());
    } catch (error) {
      log.error("Reduce Error for Employee ID: " + empId, error);
    }
  }

  // ========================================================================
  // SUMMARIZE PHASE
  // ========================================================================
  function summarize(summary) {
    var pdfFiles = [];
    summary.output.iterator().each(function (key, value) {
      pdfFiles.push(value);
      return true;
    });
    log.debug("Generated PDF Files", pdfFiles);

    record.submitFields({
      type: "customrecord_hris_mr_status_bar_rec",
      id: 11,
      values: { custrecord_hris_mr_sts: 1 },
      options: { enableSourcing: false, ignoreMandatoryFields: true }
    });

    summary.mapErrors.iterator().each(function (key, error) {
      log.error("Map Error for Key: " + key, error);
      return true;
    });
    summary.reduceErrors.iterator().each(function (key, error) {
      log.error("Reduce Error for Key: " + key, error);
      return true;
    });
  }

  // ========================================================================
  // PAYSLIP GENERATION – FULL HTML BUILT WITH += 
  // ========================================================================
  function generatePayslip(empId, empPaygrp, empWageMonth, yearVal, endYear, Subsidiary) {
    try {
      var empRec = record.load({ type: record.Type.EMPLOYEE, id: empId, isDynamic: false });
      var subsidiaryId = empRec.getValue({ fieldId: "subsidiary" });
      var subsidiaryRec = record.load({ type: "subsidiary", id: subsidiaryId });
      var subsidiaryLogo = subsidiaryRec.getValue({ fieldId: "logo" });
      var logotag1 = "";

      if (subsidiaryLogo) {
        var logoFile = file.load({ id: subsidiaryLogo });
        var logoUrl = logoFile.url.replace(/&/gi, "&amp;");
        var prefix = "https://2772245.app.netsuite.com";
        logotag1 += '<img src="' + prefix + logoUrl + '" style="width:100pt;height:100pt;"/>';
      }

      var employeeCode = empRec.getText({ fieldId: "custentity_hris_empcode" }) || "";
      var employeeName = empRec.getValue({ fieldId: "custentity_hris_emplegalname" }) || "";
      var designation = empRec.getText({ fieldId: "custentity_hris_empdesignation" }) || "";
      var department = empRec.getText({ fieldId: "custentity_hris_empdepartment_new" }) || "";
      var bankAccount = empRec.getValue({ fieldId: "custentity_hris_emp_bankaccno" }) || "";
      var emiratesId = empRec.getValue({ fieldId: "custentity_hris_empemiratesno" }) || "";
      var bankName = empRec.getText({ fieldId: "custentity_hris_empbankname" }) || "";
      var ibanno = empRec.getValue({ fieldId: "custentity_hris_empbankibanacctno" }) || "";

      var dateOfJoining = empRec.getValue({ fieldId: "hiredate" });
      var formattedDateofjoin = dateOfJoining
        ? format.format({ value: new Date(dateOfJoining), type: format.Type.DATE })
        : "";

      var compData = getCompensationFromPayProcess(empId, empPaygrp, empWageMonth, endYear);
      var basicSalary = compData.basicSalary || 0;
      var allowancesList = compData.allowances || [];

      var payDetailsDeduction = getpayprocessdetailsdynamic(empId, endYear, empPaygrp, empWageMonth, 2);
      var monthlyDeduction = getMonthlySalaryAmount(empId, endYear, empPaygrp, empWageMonth, 2);
      var salaryadvance = payDetailsDeduction[58] || { amount: 0, name: "Salary Advance" };
      var otherdeduction = monthlyDeduction[61] || { amount: 0, name: "Other Deduction" };
      var loan = payDetailsDeduction[62] || { amount: 0, name: "Loan" };
      var latededuction = payDetailsDeduction[63] || { amount: 0, name: "Late Deduction" };

      var totaldeduction =
        parseFloat(salaryadvance.amount) +
        parseFloat(otherdeduction.amount) +
        parseFloat(loan.amount) +
        parseFloat(latededuction.amount);

      var monthlyEarning = getMonthlySalaryAmount(empId, endYear, empPaygrp, empWageMonth, 1);
      var payDetailsEarning = getpayprocessdetailsdynamic(empId, endYear, empPaygrp, empWageMonth, 1);
      var overtime = monthlyEarning[38] || { amount: 0, name: "Overtime" };
      var incentive = monthlyEarning[10] || { amount: 0, name: "Incentive" };
      var commission = payDetailsEarning[11] || { amount: 0, name: "Commission" };
      var bonus = payDetailsEarning[24] || { amount: 0, name: "Bonus" };
      var otherallowance = payDetailsEarning[8] || { amount: 0, name: "Other Allowances" };

      var leaveDetails = getLeaveSettlementDetails(empId, empWageMonth, endYear);
      var leavesettlement = { amount: parseFloat(leaveDetails.leavesettlement || 0), name: "Leave Settlement" };
      var airticket = { amount: parseFloat(leaveDetails.airticketamount || 0), name: "Airticket Amount" };

      var totalallowance = 0;
      allowancesList.forEach(function (item) {
        totalallowance += parseFloat(item.amount || 0);
      });

      var totaladdition =
        parseFloat(otherallowance.amount) +
        parseFloat(overtime.amount) +
        parseFloat(incentive.amount) +
        parseFloat(commission.amount) +
        parseFloat(bonus.amount) +
        leavesettlement.amount +
        airticket.amount;

      var grosssalary = parseFloat(basicSalary) + totalallowance + totaladdition;
      var netsalary = grosssalary - totaldeduction;

      var payabledays = getworkdaysfrompayproc(empId, empPaygrp, empWageMonth, endYear) || "";
      var loanbalanceamount = getloanbalance(empId) || 0;
      var overtimehrs = getovertimehours(empId, endYear, empPaygrp, empWageMonth, 38) || "";

      // === BUILD HTML USING += LINE BY LINE ===
      var earningsHtml = "";
      earningsHtml += "<tr>";
      earningsHtml += "  <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'>Basic</td>";
      earningsHtml += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + formatCurrency(basicSalary) + "</td>";
      earningsHtml += "  <td style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      earningsHtml += "  <td align='right' style='width:22%; border-bottom: 1px solid black;'></td>";
      earningsHtml += "</tr>";

      var allowancesHtml = "";
      allowancesList.forEach(function (item) {
        allowancesHtml += "<tr>";
        allowancesHtml += "  <td style='width:30%; padding-left:15px; border-right: 1px solid black; border-bottom: 1px solid black;'>" + item.name + "</td>";
        allowancesHtml += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + formatCurrency(item.amount) + "</td>";
        allowancesHtml += "  <td style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
        allowancesHtml += "  <td align='right' style='width:22%; border-bottom: 1px solid black;'></td>";
        allowancesHtml += "</tr>";
      });

      var additions = [
        { label: otherallowance.name, value: otherallowance.amount },
        { label: overtime.name, value: overtime.amount },
        { label: bonus.name, value: bonus.amount },
        { label: incentive.name, value: incentive.amount },
        { label: commission.name, value: commission.amount },
        { label: leavesettlement.name, value: leavesettlement.amount },
        { label: airticket.name, value: airticket.amount }
      ];

      var additionsHtml = "";
      additions.forEach(function (add) {
        if (add.value > 0) {
          additionsHtml += "<tr>";
          additionsHtml += "  <td style='width:30%; padding-left:15px; border-right: 1px solid black; border-bottom: 1px solid black;'>" + add.label + "</td>";
          additionsHtml += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + formatCurrency(add.value) + "</td>";
          additionsHtml += "  <td style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
          additionsHtml += "  <td align='right' style='width:22%; border-bottom: 1px solid black;'></td>";
          additionsHtml += "</tr>";
        }
      });

      // === FULL tablexmlheader BUILT WITH += LINE BY LINE ===
      var tablexmlheader = "";
      tablexmlheader += "<table style='width:100%; font-size:15pt; font-family: Calibri, sans-serif; border-collapse: collapse; border-top: 1px solid black; border-left: 1px solid black; border-right: 1px solid black; border-bottom: 0.95pt dashed gray; padding-top:10px;'>";
      tablexmlheader += "  <tr>";
      tablexmlheader += "    <td style='width:40%; text-align:left;'>" + logotag1 + "</td>";
      tablexmlheader += "    <td style='width:60%;'>";
      tablexmlheader += "      <span style='font-size:10pt;color:brown;padding-left:35px;display:inline-block;margin-bottom:18px;'><b></b><br /></span>";
      tablexmlheader += "      <span style='font-size:8pt;color:brown;padding-left:35px;display:inline-block;'><b></b></span>";
      tablexmlheader += "    </td>";
      tablexmlheader += "  </tr>";
      tablexmlheader += "</table>";

      tablexmlheader += "<table style='width:100%;font-size:10pt;font-family: Calibri, sans-serif;border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black;'>";
      tablexmlheader += "  <tr><td align='center' style='width:100%;color:brown;padding-top:10px;padding-bottom:10px;'><b>Salary Slip for the month of " + empWageMonth + " - " + endYear + "</b></td></tr>";
      tablexmlheader += "</table>";

      tablexmlheader += "<table style='width:100%;font-size:10pt;font-family: Calibri, sans-serif; border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; background-color: #f0f0f0;'>";
      tablexmlheader += "  <tr><td align='center' style='width:100%;color:brown;'><b>Employee Information</b></td></tr>";
      tablexmlheader += "</table>";

      tablexmlheader += "<table style='width:100%;font-size:7pt;font-family: Calibri, sans-serif; border-left: 1px solid black; border-right: 1px solid black;'>";
      tablexmlheader += "  <tr>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>SID</td>";
      tablexmlheader += "    <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'>114 Employee No: / / " + employeeCode + "</td>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Designation</td>";
      tablexmlheader += "    <td style='width:30%; border-bottom: 1px solid black;'>" + designation + "</td>";
      tablexmlheader += "  </tr>";
      tablexmlheader += "  <tr>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Name</td>";
      tablexmlheader += "    <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + employeeName + "</td>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Department</td>";
      tablexmlheader += "    <td style='width:30%; border-bottom: 1px solid black;'>" + department + "</td>";
      tablexmlheader += "  </tr>";
      tablexmlheader += "  <tr>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Emirates ID</td>";
      tablexmlheader += "    <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + emiratesId + "</td>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Date Of Joining</td>";
      tablexmlheader += "    <td style='width:30%; border-bottom: 1px solid black;'>" + formattedDateofjoin + "</td>";
      tablexmlheader += "  </tr>";
      tablexmlheader += "</table>";

      tablexmlheader += "<table style='width:100%;font-size:10pt;font-family: Calibri, sans-serif; border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; background-color: #f0f0f0;'>";
      tablexmlheader += "  <tr>";
      tablexmlheader += "    <td align='center' style='width:50%;color:brown;border-right:1px solid black;'>Employee Attendance</td>";
      tablexmlheader += "    <td align='center' style='width:50%;color:brown;'>Salary Transferred To</td>";
      tablexmlheader += "  </tr>";
      tablexmlheader += "</table>";

      tablexmlheader += "<table style='width:100%;font-size:7pt;font-family: Calibri, sans-serif; border-left: 1px solid black; border-right: 1px solid black;'>";
      tablexmlheader += "  <tr>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Payable Days</td>";
      tablexmlheader += "    <td align='center' style='width:9%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + payabledays + "</td>";
      tablexmlheader += "    <td style='width:12%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "    <td style='width:9%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Bank Name</td>";
      tablexmlheader += "    <td style='width:30%; border-bottom: 1px solid black;'>" + bankName + "</td>";
      tablexmlheader += "  </tr>";
      tablexmlheader += "  <tr>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Leave Allowed</td>";
      tablexmlheader += "    <td align='center' style='width:9%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "    <td style='width:12%; border-right: 1px solid black; border-bottom: 1px solid black;'>Working Day</td>";
      tablexmlheader += "    <td align='center' style='width:9%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + payabledays + "</td>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>ACCOUNT NO</td>";
      tablexmlheader += "    <td style='width:30%; border-bottom: 1px solid black;'>" + bankAccount + "</td>";
      tablexmlheader += "  </tr>";
      tablexmlheader += "  <tr>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Leave Taken</td>";
      tablexmlheader += "    <td align='center' style='width:9%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "    <td style='width:12%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "    <td style='width:9%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>IBAN Number</td>";
      tablexmlheader += "    <td style='width:30%; border-bottom: 1px solid black;'>" + ibanno + "</td>";
      tablexmlheader += "  </tr>";
      tablexmlheader += "</table>";

      tablexmlheader += "<table style='width:100%;font-size:7pt;font-family: Calibri, sans-serif; border-left: 1px solid black; border-right: 1px solid black;'>";
      tablexmlheader += "  <tr>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Loan Balance</td>";
      tablexmlheader += "    <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + formatCurrency(loanbalanceamount) + "</td>";
      tablexmlheader += "    <td style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Overtime</td>";
      tablexmlheader += "    <td style='width:30%; border-bottom: 1px solid black;'>" + overtimehrs + "</td>";
      tablexmlheader += "  </tr>";
      tablexmlheader += "</table>";

      tablexmlheader += "<table style='width:100%;font-size:10pt;font-family: Calibri, sans-serif; border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black; background-color: #f0f0f0;'>";
      tablexmlheader += "  <tr><td align='center' style='width:100%;color:brown;'><b>Salary Calculations</b></td></tr>";
      tablexmlheader += "</table>";

      tablexmlheader += "<table style='width:100%;font-size:8pt;font-family: Calibri, sans-serif; border-left: 1px solid black; border-right: 1px solid black;'>";
      tablexmlheader += "  <tr>";
      tablexmlheader += "    <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'><b>Earnings</b></td>";
      tablexmlheader += "    <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>Amount (Dhs)</td>";
      tablexmlheader += "    <td style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'><b>Deductions</b></td>";
      tablexmlheader += "    <td align='right' style='width:22%; border-bottom: 1px solid black;'>Amount (Dhs)</td>";
      tablexmlheader += "  </tr>";

      tablexmlheader += earningsHtml;

      tablexmlheader += "<tr>";
      tablexmlheader += "  <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + salaryadvance.name + "</td>";
      tablexmlheader += "  <td align='right' style='width:22%; border-bottom: 1px solid black;'>" + formatCurrency(salaryadvance.amount) + "</td>";
      tablexmlheader += "</tr>";

      tablexmlheader += "<tr>";
      tablexmlheader += "  <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + otherdeduction.name + "</td>";
      tablexmlheader += "  <td align='right' style='width:22%; border-bottom: 1px solid black;'>" + formatCurrency(otherdeduction.amount) + "</td>";
      tablexmlheader += "</tr>";

      tablexmlheader += "<tr>";
      tablexmlheader += "  <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + loan.name + "</td>";
      tablexmlheader += "  <td align='right' style='width:22%; border-bottom: 1px solid black;'>" + formatCurrency(loan.amount) + "</td>";
      tablexmlheader += "</tr>";

      tablexmlheader += "<tr>";
      tablexmlheader += "  <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + latededuction.name + "</td>";
      tablexmlheader += "  <td align='right' style='width:22%; border-bottom: 1px solid black;'>" + formatCurrency(latededuction.amount) + "</td>";
      tablexmlheader += "</tr>";

      tablexmlheader += "<tr>";
      tablexmlheader += "  <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'><b>Allowances :</b></td>";
      tablexmlheader += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td align='right' style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'>Total Deductions</td>";
      tablexmlheader += "  <td align='right' style='width:22%; border-bottom: 1px solid black;'>" + formatCurrency(totaldeduction) + "</td>";
      tablexmlheader += "</tr>";

      tablexmlheader += allowancesHtml;

      tablexmlheader += "<tr>";
      tablexmlheader += "  <td align='right' style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'>Total Allowances</td>";
      tablexmlheader += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + formatCurrency(totalallowance) + "</td>";
      tablexmlheader += "  <td style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td align='right' style='width:22%; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "</tr>";

      tablexmlheader += "<tr>";
      tablexmlheader += "  <td style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'><b>Additions:</b></td>";
      tablexmlheader += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td align='right' style='width:22%; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "</tr>";

      tablexmlheader += additionsHtml;

      tablexmlheader += "<tr>";
      tablexmlheader += "  <td align='right' style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'>Total Additions</td>";
      tablexmlheader += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'>" + formatCurrency(totaladdition) + "</td>";
      tablexmlheader += "  <td style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "  <td align='right' style='width:22%; border-bottom: 1px solid black;'></td>";
      tablexmlheader += "</tr>";

      tablexmlheader += "<tr>";
      tablexmlheader += "  <td align='right' style='width:30%; border-right: 1px solid black; border-bottom: 1px solid black;'><b>Gross Salary</b></td>";
      tablexmlheader += "  <td align='right' style='width:20%; border-right: 1px solid black; border-bottom: 1px solid black;'><b>" + formatCurrency(grosssalary) + "</b></td>";
      tablexmlheader += "  <td align='right' style='width:28%; border-right: 1px solid black; border-bottom: 1px solid black; color:blue'><b>Net Salary</b></td>";
      tablexmlheader += "  <td align='right' style='width:22%; border-bottom: 1px solid black; color:blue'>" + formatCurrency(netsalary) + "</td>";
      tablexmlheader += "</tr>";
      tablexmlheader += "</table>";

      var amountInWords = convertAmountToWords(netsalary);
      tablexmlheader += "<table style='width:100%; font-size:8pt; font-family: Calibri, sans-serif; border-left: 1px solid black; border-right: 1px solid black; border-bottom:1px solid black;'>";
      tablexmlheader += "  <tr><td style='width:100%;'>Amount In words : " + amountInWords + "</td></tr>";
      tablexmlheader += "</table>";

      tablexmlheader += "<table style='width:100%; font-size:8pt; font-family: Calibri, sans-serif; border-left: 1px solid black; border-right: 1px solid black; border-bottom:1px solid black;'>";
      tablexmlheader += "  <tr><td style='width:100%;'>Remarks :</td></tr>";
      tablexmlheader += "</table>";

      tablexmlheader += "<table style='width:100%; font-size:6pt; font-family: Calibri, sans-serif; line-height: 50; border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black;'>";
      tablexmlheader += "  <tr style='margin-top:60%;'><td style='width:50%;'></td><td align='right' style='width:50%;'>System generated No signature required</td></tr>";
      tablexmlheader += "</table>";

      // Render PDF
      var templateFile = file.load({ id: 3364 });
      var htmlContent = templateFile.getContents();
      htmlContent = htmlContent.replace("{{tablexmlplaceholder}}", tablexmlheader);

      var renderer = render.create();
      renderer.templateContent = htmlContent;
      var pdfFile = renderer.renderAsPdf();

      var pdfFileObj = file.create({
        name: "Payslip_" + empId + "_" + empWageMonth + "_" + endYear + ".pdf",
        fileType: file.Type.PDF,
        contents: pdfFile.getContents(),
        folder: 14399,
        isOnline: true
      });
      var fileId = pdfFileObj.save();
      log.debug("Saved PDF File ID", fileId);
      return fileId;

    } catch (error) {
      log.error("Error Generating Payslip for Employee " + empId, error);
      throw error;
    }
  }

  // ========================================================================
  // HELPER FUNCTIONS (ALL SQL USING +=)
  // ========================================================================
  function formatCurrency(value) {
    return format.format({ value: parseFloat(value) || 0, type: format.Type.CURRENCY });
  }

  function createpaysliprecord(fileId, empId, empPaygrp, empWageMonth, yearVal, endYear, Subsidiary) {
    try {
      var monthId = getmonthidfrommaster(empWageMonth);
      var yearId = getyearidfrommaster(endYear);

      var payslipquery = "";
      payslipquery += "SELECT id FROM customrecord_hris_emp_payslip_monh ";
      payslipquery += "WHERE custrecord_hris_emp_payslip_empid = " + empId + " ";
      payslipquery += "AND custrecord_hris_emp_payslip_month = " + monthId + " ";
      payslipquery += "AND custrecord_hris_payslip_year = " + yearId + " ";
      payslipquery += "AND isinactive = 'F'";
      var results = query.runSuiteQL({ query: payslipquery }).asMappedResults();

      var payslipRec;
      if (results.length > 0) {
        payslipRec = record.load({ type: "customrecord_hris_emp_payslip_monh", id: results[0].id, isDynamic: true });
      } else {
        payslipRec = record.create({ type: "customrecord_hris_emp_payslip_monh", isDynamic: true });
      }

      payslipRec.setValue({ fieldId: "custrecord_hris_emp_payslip_empid", value: empId });
      payslipRec.setValue({ fieldId: "custrecord_hris_emp_payslip_month", value: monthId });
      payslipRec.setValue({ fieldId: "custrecord_hris_payslip_year", value: yearId });
      payslipRec.setValue({ fieldId: "custrecord_hris_payslip_payslip", value: fileId });

      return payslipRec.save({ enableSourcing: true, ignoreMandatoryFields: false });
    } catch (e) {
      log.error("Error creating/updating payslip record", e);
      throw e;
    }
  }

  function getCompensationFromPayProcess(empId, paygroup, month, year) {
    var sql = "";
    sql += "SELECT pp.custrecord_hris_pay_proc_componet_sequen AS seq_no, ";
    sql += "pp.custrecord_hris_pay_proc_value AS amount, ";
    sql += "BUILTIN.DF(de.custrecord_hris_cde_payroll_component) AS component_name ";
    sql += "FROM customrecord_hris_employee_compen_change ec ";
    sql += "JOIN customrecord_hris_compensation_details_e de ON ec.id = de.custrecord_hris_employee_data_change ";
    sql += "JOIN customrecord_hris_pay_process pp ON pp.custrecord_hris_pay_proc_payroll_compone = de.custrecord_hris_cde_payroll_component ";
    sql += "WHERE ec.custrecord_hris_empchange_employee_nam = " + empId + " ";
    sql += "AND pp.custrecord_hris_pay_proc_employee = " + empId + " ";
    sql += "AND pp.custrecord_hris_pay_proc_pay_group = " + paygroup + " ";
    sql += "AND BUILTIN.DF(pp.custrecord_hris_pay_proc_pay_month) = '" + month + "' ";
    sql += "AND BUILTIN.DF(pp.custrecord_hris_pay_proc_year) = '" + year + "' ";
    sql += "AND de.custrecord_hris_cde_payroll_component IS NOT NULL";
    var results = query.runSuiteQL({ query: sql }).asMappedResults();
    var basicSalary = 0;
    var allowances = [];
    results.forEach(function (row) {
      var amount = parseFloat(row.amount) || 0;
      if (row.seq_no == 1) basicSalary = amount;
      else allowances.push({ name: row.component_name || "Allowance", amount: amount });
    });
    return { basicSalary: basicSalary, allowances: allowances };
  }

  function getpayprocessdetailsdynamic(empId, endYear, empPaygrp, empWageMonth, type) {
    var sql = "";
    sql += "SELECT p.custrecord_hris_pay_proc_componet_sequen AS seqnum, ";
    sql += "p.custrecord_hris_pay_proc_value AS amount, ";
    sql += "BUILTIN.DF(p.custrecord_hris_pay_proc_payroll_compone) AS name ";
    sql += "FROM employee e ";
    sql += "JOIN customrecord_hris_pay_process p ON p.custrecord_hris_pay_proc_employee = e.id ";
    sql += "WHERE p.custrecord_hris_pay_proc_pay_group = " + empPaygrp + " ";
    sql += "AND BUILTIN.DF(p.custrecord_hris_pay_proc_pay_month) = '" + empWageMonth + "' ";
    sql += "AND BUILTIN.DF(p.custrecord_hris_pay_proc_year) = '" + endYear + "' ";
    sql += "AND p.custrecord_hris_pay_proc_component_type = " + type + " ";
    sql += "AND e.id = " + empId;
    var results = query.runSuiteQL({ query: sql }).asMappedResults();
    var map = {};
    results.forEach(function (r) { if (r.seqnum) map[r.seqnum] = { amount: r.amount, name: r.name || "Unknown" }; });
    return map;
  }

  function getMonthlySalaryAmount(empId, endYear, empPaygrp, empWageMonth, type) {
    var sql = "";
    sql += "SELECT A.custrecord_hris_mthsal_salaryamount AS amount, ";
    sql += "B.custrecord_hris__sequence_no_ AS seqnum, B.name AS name ";
    sql += "FROM customrecord_hris_monthlysalinput AS A ";
    sql += "LEFT JOIN customrecord_hris_payroll_component AS B ON B.id = A.custrecord_hris_mthsal_paycomponent ";
    sql += "WHERE BUILTIN.DF(A.custrecord_hris_mthsal_month) = '" + empWageMonth + "' ";
    sql += "AND A.custrecord_hris_mthsal_paygroup = " + empPaygrp + " ";
    sql += "AND BUILTIN.DF(A.custrecord_hris_mthsal_year) = '" + endYear + "' ";
    sql += "AND A.custrecord_hris_mthsal_empname = " + empId + " ";
    sql += "AND A.custrecord_hris_mthsal_componenttype = " + type;
    var results = query.runSuiteQL({ query: sql }).asMappedResults();
    var map = {};
    results.forEach(function (r) { if (r.seqnum) map[r.seqnum] = { amount: r.amount, name: r.name || "Unknown" }; });
    return map;
  }

  function getLeaveSettlementDetails(empId, empWageMonth, endYear) {
    var sql = "";
    sql += "SELECT custrecord_hrms_lveset_lvesalaryamount AS leavesettlement, ";
    sql += "custrecord_hrms_lveset_airticketamount AS airticketamount ";
    sql += "FROM customrecord_hrms_leavesettlement ";
    sql += "WHERE custrecord_hrms_lveset_empname = " + empId + " ";
    sql += "AND BUILTIN.DF(custrecord_hrms_lveset_month) = '" + empWageMonth + "' ";
    sql += "AND BUILTIN.DF(custrecord_hrms_lveset_year) = '" + endYear + "'";
    var rs = query.runSuiteQL({ query: sql }).asMappedResults();
    return rs.length ? rs[0] : { leavesettlement: 0, airticketamount: 0 };
  }

  function getworkdaysfrompayproc(empId, empPaygrp, empWageMonth, endYear) {
    var sql = "";
    sql += "SELECT p.custrecord_hris_pay_proc_paid_days ";
    sql += "FROM employee e ";
    sql += "JOIN customrecord_hris_pay_process p ON p.custrecord_hris_pay_proc_employee = e.id ";
    sql += "WHERE p.custrecord_hris_pay_proc_pay_group = " + empPaygrp + " ";
    sql += "AND BUILTIN.DF(p.custrecord_hris_pay_proc_pay_month) = '" + empWageMonth + "' ";
    sql += "AND BUILTIN.DF(p.custrecord_hris_pay_proc_year) = '" + endYear + "' ";
    sql += "AND e.id = " + empId;
    var rs = query.runSuiteQL({ query: sql }).asMappedResults();
    return rs.length ? rs[0].custrecord_hris_pay_proc_paid_days : "";
  }

  function getloanbalance(empId) {
    var sql = "";
    sql += "SELECT custrecord_hris_loan_outstanding_amount ";
    sql += "FROM customrecord_hris_empchange_loan_applicn ";
    sql += "WHERE custrecord_hris_loan_emp_name = " + empId;
    var rs = query.runSuiteQL({ query: sql }).asMappedResults();
    return rs.length ? (rs[0].custrecord_hris_loan_outstanding_amount || 0) : 0;
  }

  function getovertimehours(empId, endYear, empPaygrp, empWageMonth, seqnum) {
    var sql = "";
    sql += "SELECT A.custrecord_hris_mthsal_total_hours_days AS othrs ";
    sql += "FROM customrecord_hris_monthlysalinput AS A ";
    sql += "LEFT JOIN customrecord_hris_payroll_component AS B ON B.id = A.custrecord_hris_mthsal_paycomponent ";
    sql += "WHERE BUILTIN.DF(A.custrecord_hris_mthsal_month) = '" + empWageMonth + "' ";
    sql += "AND A.custrecord_hris_mthsal_paygroup = " + empPaygrp + " ";
    sql += "AND BUILTIN.DF(A.custrecord_hris_mthsal_year) = '" + endYear + "' ";
    sql += "AND A.custrecord_hris_mthsal_empname = " + empId + " ";
    sql += "AND B.custrecord_hris__sequence_no_ = " + seqnum;
    var rs = query.runSuiteQL({ query: sql }).asMappedResults();
    return rs.length ? (rs[0].othrs || "") : "";
  }

  function getmonthidfrommaster(monthName) {
    var sql = "";
    sql += "SELECT id FROM customlist_hris_month_list ";
    sql += "WHERE name = '" + monthName + "'";
    var rs = query.runSuiteQL({ query: sql }).asMappedResults();
    return rs.length > 0 ? rs[0].id : null;
  }

  function getyearidfrommaster(yearName) {
    var sql = "";
    sql += "SELECT id FROM customlist_hris_year_master ";
    sql += "WHERE name = '" + yearName + "'";
    var rs = query.runSuiteQL({ query: sql }).asMappedResults();
    return rs.length > 0 ? rs[0].id : null;
  }

  function convertAmountToWords(amount) {
    if (!amount || amount <= 0) return "Zero Dirhams Only";
    var words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                 'Seventeen', 'Eighteen', 'Nineteen'];
    var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    var thousands = ['', 'Thousand', 'Million', 'Billion'];

    function numToWords(n) {
      if (n === 0) return '';
      if (n < 20) return words[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + words[n % 10] : '');
      if (n < 1000) return words[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
      return '';
    }

    var integerPart = Math.floor(amount);
    var decimalPart = Math.round((amount - integerPart) * 100);
    var result = '';

    if (integerPart === 0) result = 'Zero Dirhams';
    else {
      var parts = [];
      var num = integerPart;
      var idx = 0;
      while (num > 0) {
        var chunk = num % 1000;
        if (chunk) {
          var txt = numToWords(chunk);
          if (txt) parts.unshift(txt + (thousands[idx] ? ' ' + thousands[idx] : ''));
        }
        num = Math.floor(num / 1000);
        idx++;
      }
      result = parts.join(' ') + ' Dirhams';
    }

    if (decimalPart > 0) result += ' and ' + numToWords(decimalPart) + ' Fils';
    return result.trim() + ' Only';
  }

  return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize
  };
});