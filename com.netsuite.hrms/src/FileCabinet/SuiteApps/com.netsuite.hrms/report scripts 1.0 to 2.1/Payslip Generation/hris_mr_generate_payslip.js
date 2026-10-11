/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 *
 * Description: Generates payslip PDFs for selected employees, saves them in the File Cabinet,
 * and creates/updates custom payslip records. Uses original design and file/folder IDs.
 */
define([
    'N/record', 'N/file', 'N/render', 'N/runtime', 'N/task', 'N/log', 'N/query', 'N/format','N/search','N/xml','N/email'
], function (record, file, render, runtime, task, log, query, format,search,xml,email) {

    // ========================================================================
    // GET INPUT DATA
    // ========================================================================
    function getInputData() {
        var scriptObj = runtime.getCurrentScript();

        var empPaygrp     = scriptObj.getParameter({ name: 'custscript_a21_payslip_printb' });
        var empTCount     = scriptObj.getParameter({ name: 'custscript_a21_checked_empb' });
        var employeeList  = scriptObj.getParameter({ name: 'custscript_a21_emp_nameb' });
        var empWageMonth  = scriptObj.getParameter({ name: 'custscript_a21_wage_mthb' });
        var yearVal       = scriptObj.getParameter({ name: 'custscript_a21_yearb' });
        var Subsidiary    = scriptObj.getParameter({ name: 'custscript_sub21_valueb' });
        var payslipcheck = scriptObj.getParameter({ name: "custscript_hr21_payslipmailcheckb" });       
        var processtype  = scriptObj.getParameter({ name: "custscript_hr21_payslip_processtypeb" });
        log.debug('Script Parameters', {
            empPaygrp: empPaygrp,
            empTCount: empTCount,
            employeeList: employeeList,
            empWageMonth: empWageMonth,
            yearVal: yearVal,
            Subsidiary: Subsidiary,
            payslipcheck:payslipcheck,
            processtype:processtype
        });

        // Convert employee list to array of integers
        var empIds = employeeList
            ? employeeList.split(',').map(function (empId) { return parseInt(empId.trim(), 10); })
            : [];

        log.debug('Employee IDs', empIds);

        // Set status bar to "Running" (2)
    /*     record.submitFields({
            type: 'customrecord_hris_mr_status_bar_rec',
            id: 11,
            values: { custrecord_hris_mr_sts: 2 },
            options: { enableSourcing: false, ignoreMandatoryFields: true }
        }); */

        return empIds;
    }

    // ========================================================================
    // MAP PHASE
    // ========================================================================
    function map(context) {
        var empId = parseInt(context.value, 10);
        log.debug('Mapping Employee ID', empId);

        try {
            var scriptObj = runtime.getCurrentScript();
            var empPaygrp     = scriptObj.getParameter({ name: 'custscript_a21_payslip_printb' });
            var empWageMonth  = scriptObj.getParameter({ name: 'custscript_a21_wage_mthb' });
            var yearVal       = scriptObj.getParameter({ name: 'custscript_a21_yearb' });
            var Subsidiary    = scriptObj.getParameter({ name: 'custscript_sub21_valueb' });
            var payslipcheck = scriptObj.getParameter({ name: "custscript_hr21_payslipmailcheckb" });
             var processtype  = scriptObj.getParameter({ name: "custscript_hr21_payslip_processtypeb" });
            var empData = {
                id: empId,
                empPaygrp: empPaygrp,
                empWageMonth: empWageMonth,
                yearVal: yearVal,
                Subsidiary: Subsidiary,
                 payslipcheck:payslipcheck,
                 processtype:processtype
            };

            context.write({
                key: empId.toString(),
                value: JSON.stringify(empData)
            });
        } catch (error) {
            log.error('Map Error for Employee ID: ' + empId, error);
        }
    }

    // ========================================================================
    // REDUCE PHASE
    // ========================================================================
    function reduce(context) {
        var empId = context.key;
        log.debug('Reducing Employee ID', empId);

        try {
            var empData = JSON.parse(context.values[0]);
            var empPaygrp     = empData.empPaygrp;
            var empWageMonth  = empData.empWageMonth;
            var yearVal       = empData.yearVal;
            var Subsidiary    = empData.Subsidiary;
            var payslipcheck=empData.payslipcheck;
            var processtype = empData.processtype;
           var endYear = yearVal;

            // Generate PDF and get file ID
            var fileId = generatePayslip(empId, empPaygrp, empWageMonth, yearVal, endYear, Subsidiary,processtype);
            log.debug('Generated File ID for Employee ' + empId, fileId);


        // 🔹 Get Employee Email
        if(payslipcheck==2){
        var empEmailQuery = "SELECT email,custentity_hris_emp_payslip_emailid FROM employee WHERE id = " + empId;
        // var empEmailQuery = "SELECT custentity_hris_emp_payslip_emailid FROM employee WHERE id = " + empId;
        var emailResults = query.runSuiteQL({ query: empEmailQuery });
        var emailRecords = emailResults.asMappedResults();
       // var empEmail = (emailRecords.length > 0) ? emailRecords[0].email : null;
 var empEmail = (emailRecords.length > 0) ? emailRecords[0].custentity_hris_emp_payslip_emailid : null;        

        if (!empEmail) {
            log.error("No email found for Employee ID", empId);
            return;
        }
        var emailFile = file.load({
              id: fileId
            })
            var emailFileUrl = emailFile.url;
        // 🔹 Send Payslip via Email
        email.send({
            author: -5, // -5 means system user
            recipients: empEmail,
            subject: "Your Monthly Payslip",
            body: "Dear Employee,\n\nPlease find your payslip attached.\n\nRegards,\nHR Team",
            attachments: [emailFile]
        });

        log.emergency("Email sent successfully to", empEmail);
      }

            // Create or update payslip custom record
            var payslipRecordId = createpaysliprecord(fileId, empId, empPaygrp, empWageMonth, yearVal, endYear, Subsidiary, query,processtype);
            log.debug('Payslip Record ID', payslipRecordId);

            // Write file ID to context for summarize
            context.write(fileId.toString());

        } catch (error) {
            log.error('Reduce Error for Employee ID: ' + empId, error);
        }
    }

    // ========================================================================
    // SUMMARIZE PHASE
    // ========================================================================
    function summarize(summary) {
        var pdfFiles = [];

     /*    summary.output.iterator().each(function (key, value) {
            pdfFiles.push(value);
            return true;
        });

        log.debug('Generated PDF Files', pdfFiles);

        // Set status bar to "Completed" (1)
      
        // Log any errors
        summary.mapErrors.iterator().each(function (key, error) {
            log.error('Map Error for Key: ' + key, error);
            return true;
        });

        summary.reduceErrors.iterator().each(function (key, error) {
            log.error('Reduce Error for Key: ' + key, error);
            return true;
        }); */
    }

    // ========================================================================
    // PAYSLIP GENERATION (EXACT DESIGN PRESERVED)
    // ========================================================================
    function generatePayslip(empId, empPaygrp, empWageMonth, yearVal, endYear, Subsidiary,processtype) {
        try {
            // Load Employee Record
            var empRec = record.load({
                type: record.Type.EMPLOYEE,
                id: empId,
                isDynamic: false
            });

            var subsidiaryId = empRec.getValue({ fieldId: 'subsidiary' });
            log.debug('subsidiaryId', subsidiaryId);

            var subsidiaryRec = record.load({
                type: 'subsidiary',
                id: subsidiaryId
            });

            var subsidiaryLogo = subsidiaryRec.getValue({ fieldId: 'logo' });
            var logotag1 = '';
           
            if (subsidiaryLogo) {
          var logotag = file.load({ id: subsidiaryLogo }).url;
          logotag = logotag.replace(/&/gi, "&amp;");
          var prefix = "https://2772245.app.netsuite.com";
          logotag = prefix + logotag;
          logotag1 =
            '<img src="' + logotag + '" style="width:100pt;height:100pt;"/>';
        }

            // Get Employee Details
            var employeeCode   = empRec.getText({ fieldId: 'custentity_hris_empcode' });
            var employeeName   = empRec.getValue({ fieldId: 'custentity_hris_emplegalname' });
            var designation    = empRec.getText({ fieldId: 'custentity_hris_empdesignation' });
            var department     = empRec.getText({ fieldId: 'custentity_hris_empdepartment_new' });
            var dateOfJoining  = empRec.getValue({ fieldId: 'custentity_hris_date_of_joining' });
            var bankAccount    = empRec.getValue({ fieldId: 'custentity_hris_emp_bankaccno' });
            var emiratesId     = empRec.getValue({ fieldId: 'custentity_hris_empemiratesno' });
            var bankName       = empRec.getText({ fieldId: 'custentity_hris_empbankname' });
            var location = empRec.getText({fieldId:'custentity_hris_empdlocation_new'})||'';
            var ibanNumber=  empRec.getValue({ fieldId: 'custentity_hris_empbankibanacctno' })||'';

              log.debug('employeeCode', employeeCode);
            log.debug('Employee Name', employeeName);
            log.debug('Designation', designation);
            log.debug('Department', department);
            log.debug('DOJ', dateOfJoining);
            log.debug('Bank Account', bankAccount);
            log.debug('Emirates ID', emiratesId);
            log.debug('Bank Name', bankName);
            log.debug('Location',location);
            var dateObj = new Date(dateOfJoining);
department=escapeXML(department);
      // Format to dd/mm/yyyy
      var formattedDateofjoin = format.format({
        value: dateObj,
        type: format.Type.DATE
      });

      log.debug('Formatted Date', formattedDateofjoin);


   var lopdetails = getpaidandlopdetails(
          empId,
          yearVal,
          empPaygrp,
          empWageMonth,
          earning,
          processtype
        );
        var parts = lopdetails.split("#");
var paiddays = parts[0];
var lopdays = parts[1];


  // Get wage period details
        var resultstartdateenddate = getwageperiodetails(
          empPaygrp,
          empWageMonth,
          endYear
        );
        log.debug("resultstartdateenddate", resultstartdateenddate);
        var wagePeriodArray = resultstartdateenddate.wagePeriodArray;
        var wagePeriodDetails = resultstartdateenddate.wagePeriodDetails;
        var Staratdate = wagePeriodDetails.Staratdate;
        var Enddate = wagePeriodDetails.Enddate;
        log.audit("Staratdate", Staratdate);
        log.audit("Enddate", Enddate);
var leavedays =getleavedaysfromattendace(empId, empPaygrp, empWageMonth, endYear,Staratdate,Enddate)
          var formatedenddate = new Date(Enddate);

        // Format to dd/mm/yyyy
        formatedenddate = format.format({
          value: formatedenddate,
          type: format.Type.DATE,
        });

        log.debug("formatedenddate", formatedenddate);
     

        var tablexmlheader = "";

   tablexmlheader +=
          "<table style='width:100%; font-size:15pt; font-family: Calibri, sans-serif; border-collapse: collapse; border-top: 1px solid black; border-left: 1px solid black; border-right: 1px solid black; border-collapse: collapse;border-bottom: 0.95pt dashed gray;padding-top:10px;'>";
        tablexmlheader += "<tr>";
        tablexmlheader +=
          "<td style='width:50pt;height:50pt; text-align:left;'>" + logotag1 + "</td>";
           tablexmlheader += "</tr>";
        tablexmlheader += "</table>";
           

 if(processtype==1){   
        tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;border-collapse:collapse;border:none;margin:0 auto;'>";
        /* tablexmlheader +=
          "<tr><th colspan='4' style='text-align:center;padding:8px;font-size:12pt;font-weight:bold;border:none;'>Payslip for the month " +
          empWageMonth +
          " - " +
          endYear +
          "</th></tr>"; */

          tablexmlheader +=
    "<tr><td align='center' colspan='4' style='text-align:center; padding:8px; font-size:12pt; font-weight:bold; border:none;'>Payslip for the month " +
    empWageMonth +
    " - " +
    endYear +
    "</td></tr>";
        tablexmlheader += "</table>";

        tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;border-collapse:collapse;border:none;margin:0 auto;'>";
        tablexmlheader += "<tr></tr>";
        tablexmlheader += "</table>";

        tablexmlheader +=
          "<table style='width:100%;border-collapse:collapse;font-family:Calibri, sans-serif;font-size:10pt;'>";

        tablexmlheader +=
          "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>Employee ID</td><td style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
          employeeCode +
          "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>Emp Name</td><td style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
          employeeName +
          "</td></tr>";

        tablexmlheader +=
          "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Designation</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
          designation +
          "</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Date of Joining</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
          formattedDateofjoin +
          "</td></tr>";

        tablexmlheader +=
          "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Department</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
          department +
          "</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Work Location</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
          location +
          "</td></tr>";

        tablexmlheader +=
          "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Bank Name</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
          bankName +
          "</td><td style='border-top:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>IBAN Number</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>" +
          ibanNumber +
          "</td></tr>";

        tablexmlheader +=
          "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Total Working Days</td><td style='border-top:1px solid black;border-left:1px solid black;border-right:1px solid black;padding:6px;'> " +paiddays+"</td></tr>";

        tablexmlheader +=
          "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Unpaid Leave</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'> " + lopdays +"</td></tr>";

        tablexmlheader +=
          "<tr><td style='border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>Leave Days</td><td  style='border-top:1px solid black;border-right:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'> "+leavedays+"</td></tr>";

        tablexmlheader += "</table>";


        
      tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td></td></tr>";
     tablexmlheader += "</table>";  
      tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td></td></tr>";
     tablexmlheader += "</table>";

        tablexmlheader +=
          "<table style='width:100%;border-collapse:collapse;font-family:Calibri, sans-serif;font-size:10pt;'>";
        tablexmlheader +=
          "<tr><td style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;font-weight:bold;'>Earnings</td><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;font-weight:bold;'>Amount(AED)</td><td style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;font-weight:bold;'>Deductions</td><td style='width:15%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;font-weight:bold;'>Amount(AED)</td></tr>";
        var earning =1;
        var deduction =2;
        var earningcomponents = getearningdetails(
          empId,
          yearVal,
          empPaygrp,
          empWageMonth,
          earning,
          processtype
        );
        var deductioncomponents = getdeductiondetails(
          empId,
          yearVal,
          empPaygrp,
          empWageMonth,
          deduction,
          processtype
        );
  log.emergency('earningcomponentslength',earningcomponents.length)
  log.emergency('deductioncomponentslength',deductioncomponents.length)

        if (earningcomponents.length>0 && earningcomponents !== "undefined") {
          log.emergency('Inside')
          if (deductioncomponents.length > 0 && deductioncomponents != "undefined") {
            if (earningcomponents.length > deductioncomponents.length) {
                 var totalgross=0;
                var totaldeduction=0;
              for (var i = 0; i < earningcomponents.length; i++) {
             
                var earningname = "";
                var earningamount = "";
                var deductionname = "";
                var deductionamount = "";
                var earningrecord = earningcomponents[i];
                var earningname = earningrecord.payname || "";
                var earningamount = earningrecord.amount;
                totalgross=parseFloat(totalgross)+parseFloat(earningamount||0);
                for (var j = i; j < deductioncomponents.length; j++) {
                  var deductionrecord = deductioncomponents[i];
                  var deductionname = deductionrecord.payname || "";
                  var deductionamount = deductionrecord.amount || 0;
                  totaldeduction=parseFloat(totaldeduction)+parseFloat(deductionamount||0);
                }
                // tablexmlheader += "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Bank Name</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>" + bankName + "</td><td style='border-top:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>IBAN Number</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>" + ibanNumber + "</td></tr>";
             /*    tablexmlheader +=
                  "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  earningname +
                  "</td><td align='right' style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  earningamount +
                  "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'> " +
                  deductionname +
                  "</td><td align='right'style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  deductionamount +
                  "</td></tr>"; */

                  
                  tablexmlheader +=
  "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  earningname +
  "</td><td align='right' style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  earningamount +
  "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  deductionname +
  "</td><td align='right' style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
  deductionamount +
  "</td></tr>";

              }
            }
            else if(earningcomponents.length == deductioncomponents.length) {
              for (var i = 0; i < earningcomponents.length; i++) {
                var earningname = "";
                var earningamount = "";
                var deductionname = "";
                var deductionamount = "";
                var earningrecord = earningcomponents[i];
                var earningname = earningrecord.payname || "";
                var earningamount = earningrecord.amount;
                 totalgross=parseFloat(totalgross)+parseFloat(earningamount||0);
                for (var j = i; j < deductioncomponents.length; j++) {
                  var deductionrecord = deductioncomponents[i];
                  var deductionname = deductionrecord.payname || "";
                  var deductionamount = deductionrecord.amount || 0;
                   totaldeduction=parseFloat(totaldeduction)+parseFloat(deductionamount||0);
                }
                // tablexmlheader += "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Bank Name</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>" + bankName + "</td><td style='border-top:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>IBAN Number</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>" + ibanNumber + "</td></tr>";
               /*  tablexmlheader +=
                  "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  earningname +
                  "</td><td align='right' style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  earningamount +
                  "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'> " +
                  deductionname +
                  "</td><td align='right' style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  deductionamount +
                  "</td></tr>"; */

                  
                  tablexmlheader +=
  "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  earningname +
  "</td><td align='right' style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  earningamount +
  "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  deductionname +
  "</td><td align='right' style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
  deductionamount +
  "</td></tr>";

              }
            }
            else if(earningcomponents.length < deductioncomponents.length) {
              for (var i = 0; i < deductioncomponents.length; i++) {
                var earningname = "";
                var earningamount = "";
                var deductionname = "";
                var deductionamount = "";
                   var deductionrecord = deductioncomponents[i];
                  var deductionname = deductionrecord.payname || "";
                  var deductionamount = deductionrecord.amount || 0;
                   totaldeduction=parseFloat(totaldeduction)+parseFloat(deductionamount||0);
                
                for (var j = i; j < earningcomponents.length; j++) {
                  var earningrecord = earningcomponents[i];
                var earningname = earningrecord.payname || "";
                var earningamount = earningrecord.amount;
                 totalgross=parseFloat(totalgross)+parseFloat(earningamount||0);
               
                }
                // tablexmlheader += "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Bank Name</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>" + bankName + "</td><td style='border-top:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>IBAN Number</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>" + ibanNumber + "</td></tr>";
               /*  tablexmlheader +=
                  "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  earningname +
                  "</td><td align='right' style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  earningamount +
                  "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'> " +
                  deductionname +
                  "</td><td align='right' style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  deductionamount +
                  "</td></tr>"; */

                  
                  tablexmlheader +=
  "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  earningname +
  "</td><td align='right' style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  earningamount +
  "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  deductionname +
  "</td><td align='right' style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
  deductionamount +
  "</td></tr>";

              }
            }

          }
           
          else{
             var totalgross=0;
                var totaldeduction=0
             for (var i = 0; i < earningcomponents.length; i++) {
             
                var earningname = "";
                var earningamount = "";
                var deductionname = "";
                var deductionamount = "";
                var earningrecord = earningcomponents[i];
                var earningname = earningrecord.payname || "";
                var earningamount = earningrecord.amount;
                   totalgross=parseFloat(totalgross)+parseFloat(earningamount||0);
                    totaldeduction=parseFloat(totaldeduction)+parseFloat(deductionamount||0);
                // tablexmlheader += "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Bank Name</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>" + bankName + "</td><td style='border-top:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>IBAN Number</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>" + ibanNumber + "</td></tr>";
               /*  tablexmlheader +=
                  "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  earningname +
                  "</td><td align='right' style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  earningamount +
                  "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'> " +
                  deductionname +
                  "</td><td align='right' style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  deductionamount +
                  "</td></tr>"; */
                  
                  tablexmlheader +=
  "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  earningname +
  "</td><td align='right' style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  earningamount +
  "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  deductionname +
  "</td><td align='right' style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
  deductionamount +
  "</td></tr>";

              }
            

          }
        }
        else  if (earningcomponents.length==0 && deductioncomponents.length > 0 ) {
           var totalgross=0;
                var totaldeduction=0

          for (var i = 0; i < deductioncomponents.length; i++) {
                var earningname = "";
                var earningamount = 0;
                var deductionname = "";
                var deductionamount = 0;
                   var deductionrecord = deductioncomponents[i];
                  var deductionname = deductionrecord.payname || "";
                  var deductionamount = deductionrecord.amount || 0;
                // totalgross=parseFloat(totalgross)+parseFloat(earningamount||0);
                  totaldeduction=parseFloat(totaldeduction)+parseFloat(deductionamount||0);
            
                // tablexmlheader += "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Bank Name</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>" + bankName + "</td><td style='border-top:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>IBAN Number</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>" + ibanNumber + "</td></tr>";
             /*    tablexmlheader +=
                  "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  earningname +
                  "</td><td align='right' style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  earningamount +
                  "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'> " +
                  deductionname +
                  "</td><td align='right' style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  deductionamount +
                  "</td></tr>"; */

                  
                  tablexmlheader +=
  "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  earningname +
  "</td><td align='right' style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  earningamount +
  "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
  deductionname +
  "</td><td align='right' style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
  deductionamount +
  "</td></tr>";

              }
           


        }  
        
         tablexmlheader +=
    "<tr>" +
        "<td style='width:15%;border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>Gross Salary</td>" +
        "<td align='right' style='width:35%;border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;text-align:right;'>" +
            totalgross +
        "</td>" +
        "<td style='width:20%;border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>Total Deduction</td>" +
        "<td align='right' style='width:30%;border-top:1px solid black;border-bottom:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;text-align:right;'>" +
            totaldeduction +
        "</td>" +
    "</tr>";         

        tablexmlheader += "</table>";


   tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td></td></tr>";
     tablexmlheader += "</table>";      
        var netpay=0;
    if(totalgross>=totaldeduction){
       netpay=parseFloat(totalgross)-parseFloat(totaldeduction);

    }
    else{
      netpay=parseFloat(totaldeduction)-parseFloat(totalgross);
    }
var amountInWords = convertAmountToWords(netpay)
         tablexmlheader +=
          "<table style='width:100%;border-collapse:collapse;font-family:Calibri, sans-serif;font-size:10pt;'>";
        tablexmlheader +=
          "<tr><td style='width:35%;border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>Netsalary Paid</td><td align='right' style='width:15%;border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>"+netpay+"</td><td style='width:35%;border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>Payment Date</td><td style='width:15%;border-top:1px solid black;border-bottom:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'> " +Enddate+"</td></tr>";
        tablexmlheader += "</table>"; 
         tablexmlheader +=
          "<table style='width:100%;border-collapse:collapse;font-family:Calibri, sans-serif;font-size:10pt;'>";
        
        tablexmlheader +=
          "<tr><td style='width:35%;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>Netsalary In Words</td><td style='width:65%;border-bottom:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'> "+amountInWords+"</td></tr>";
     
          tablexmlheader += "</table>";  
          
      tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td></td></tr>";
     tablexmlheader += "</table>";  
      tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td></td></tr>";
     tablexmlheader += "</table>";
      tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td style='width:35%;padding:6px;'>* This is a electronic generated Pay-slip. </td></tr>";
     tablexmlheader += "</table>";          

     
  }
  else if(processtype==4){
     var resultstartdateenddate = getotwageperiodetails(
          empPaygrp,
          empWageMonth,
          endYear
        );

        log.debug("resultstartdateenddate", resultstartdateenddate);
        var wagePeriodArray = resultstartdateenddate.wagePeriodArray;
        var wagePeriodDetails = resultstartdateenddate.wagePeriodDetails;
        var Staratdate = wagePeriodDetails.Staratdate;
        var Enddate = wagePeriodDetails.Enddate;
        log.emergency("OT Staratdate", Staratdate);
        log.emergency("OT Enddate", Enddate);
        
      /*     var formatedenddate = new Date(Enddate);

        // Format to dd/mm/yyyy
        formatedenddate = format.format({
          value: formatedenddate,
          type: format.Type.DATE,
        });
log.audit("formatEnddate", formatedenddate); */

     tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;border-collapse:collapse;border:none;margin:0 auto;'>";
        /* tablexmlheader +=
          "<tr><th colspan='4' style='text-align:center;padding:8px;font-size:12pt;font-weight:bold;border:none;'>Payslip for the month " +
          empWageMonth +
          " - " +
          endYear +
          "</th></tr>"; */

          tablexmlheader +=
    "<tr><td align='center' colspan='4' style='text-align:center; padding:8px; font-size:12pt; font-weight:bold; border:none;'>Payslip for the month " +
    empWageMonth +
    " - " +
    endYear +
    "</td></tr>";
        tablexmlheader += "</table>";

        tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;border-collapse:collapse;border:none;margin:0 auto;'>";
        tablexmlheader += "<tr></tr>";
        tablexmlheader += "</table>";

        tablexmlheader +=
          "<table style='width:100%;border-collapse:collapse;font-family:Calibri, sans-serif;font-size:10pt;'>";

        tablexmlheader +=
          "<tr><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>Employee ID</td><td style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
          employeeCode +
          "</td><td style='width:20%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>Emp Name</td><td style='width:30%;border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
          employeeName +
          "</td></tr>";

        tablexmlheader +=
          "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Designation</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
          designation +
          "</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Date of Joining</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
          formattedDateofjoin +
          "</td></tr>";

        tablexmlheader +=
          "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Department</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
          department +
          "</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Work Location</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'>" +
          location +
          "</td></tr>";

        tablexmlheader +=
          "<tr><td style='border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>Bank Name</td><td style='border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>" +
          bankName +
          "</td><td style='border-top:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>IBAN Number</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>" +
          ibanNumber +
          "</td></tr>";

        tablexmlheader += "</table>";


        
      tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td></td></tr>";
     tablexmlheader += "</table>";  
      tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td></td></tr>";
     tablexmlheader += "</table>";

      tablexmlheader +=
          "<table style='width:100%;border-collapse:collapse;font-family:Calibri, sans-serif;font-size:10pt;'>";
        tablexmlheader +=
          "<tr><td style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;font-weight:bold;'>Earnings</td><td style='width:15%;border-top:1px solid black;border-left:1px solid black;padding:6px;border-right:1px solid black;font-weight:bold;'>Amount(AED)</td><td style='width:35%;padding:6px;'></td><td style='width:15%;padding:6px;'></td></tr>";
        var earning =1;
        
        var otandbonuscomponents = getotandbonusdetails(
          empId,
          yearVal,
          empPaygrp,
          empWageMonth,
          earning,
          processtype
        );
   var totalgross=0;
                var totaldeduction=0
             for (var i = 0; i < otandbonuscomponents.length; i++) {
              log.audit('OT and Bonus Inside')
             
           var earningname = "";
                var earningamount = "";
                var deductionname = "";
                var deductionamount = "";
                var earningrecord = otandbonuscomponents[i];
                var earningname = earningrecord.payname || "";
                var earningamount = earningrecord.amount;
                var othours = earningrecord.othours;
                var seqno = earningrecord.seqno;
                   totalgross=parseFloat(totalgross)+parseFloat(earningamount);
               if (seqno==38){
               
                  earningname =  earningname + " (" + othours + ")"

               }    
               else{
                earningname=earningname
               } 
                // tablexmlheader += "<tr><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>Bank Name</td><td style='border-top:1px solid black;border-left:1px solid black;padding:6px;'>" + bankName + "</td><td style='border-top:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>IBAN Number</td><td style='border-top:1px solid black;border-right:1px solid black;border-left:1px solid black;border-bottom:1px solid black;padding:6px;'>" + ibanNumber + "</td></tr>";
                tablexmlheader +=
                  "<tr><td style='width:35%;border-top:1px solid black;border-left:1px solid black;padding:6px;'>" +
                  earningname +
                  "</td><td align='right' style='width:15%;border-top:1px solid black;border-left:1px solid black;border-right:1px solid black;padding:6px;'>" +
                  earningamount +
                  "</td></tr>";
             }


                 var netpay=0;
    
       netpay=parseFloat(totalgross)

             tablexmlheader +=
    "<tr>" +
        "<td style='width:35%;border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>Gross Payment</td>" +
        "<td align='right' style='width:15%;border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;border-right:1px solid black;padding:6px;text-align:right;'>" +
            totalgross +
        "</td>" +
        
    "</tr>";         

        tablexmlheader += "</table>";

         tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td></td></tr>";
     tablexmlheader += "</table>";  
      tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td></td></tr>";
     tablexmlheader += "</table>";
     log.emergency('OT Endate inside',Enddate);
 var amountInWords = convertAmountToWords(netpay)
         tablexmlheader +=
          "<table style='width:100%;border-collapse:collapse;font-family:Calibri, sans-serif;font-size:10pt;'>";
        tablexmlheader +=
          "<tr><td style='width:35%;border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>Net Payment</td><td align='right' style='width:15%;border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>"+netpay+"</td><td style='width:35%;border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>Payment Date</td><td style='width:15%;border-top:1px solid black;border-bottom:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'> " + Enddate +"</td> </tr>";
        tablexmlheader += "</table>"; 
         tablexmlheader +=
          "<table style='width:100%;border-collapse:collapse;font-family:Calibri, sans-serif;font-size:10pt;'>";
        
        tablexmlheader +=
          "<tr><td style='width:35%;border-bottom:1px solid black;border-left:1px solid black;padding:6px;'>Netpayment In Words</td><td style='width:65%;border-bottom:1px solid black;border-right:1px solid black;border-left:1px solid black;padding:6px;'> "+amountInWords+"</td></tr>";
     
          tablexmlheader += "</table>";  
          
      tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td></td></tr>";
     tablexmlheader += "</table>";  
      tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td></td></tr>";
     tablexmlheader += "</table>";
      tablexmlheader +=
          "<table style='width:100%;font-family:Calibri, sans-serif;font-size:10pt;'>";
      tablexmlheader +=
          "<tr><td style='width:35%;padding:6px;'>* This is a electronic generated Pay-slip. </td></tr>";
     tablexmlheader += "</table>";         


  }            // === RENDER USING YOUR TEMPLATE FILE ID 1439 ===
            var fileObj = file.load({ id: 8233 });//536829
            var htmlContent = fileObj.getContents();
            htmlContent = htmlContent.replace('{{tablexmlplaceholder}}', tablexmlheader);

            var renderer = render.create();
            renderer.templateContent = htmlContent;
            var pdfFile = renderer.renderAsPdf();

            // === SAVE PDF IN FOLDER 2015 ===
             var pdfFileObj = file.create({
                name: 'Payslip_' + empId + '_' + empWageMonth + '_' + endYear + '.pdf',
                fileType: file.Type.PDF,
                contents: pdfFile.getContents(),
                folder: 1044,//181881,
                isOnline: true
            });
            var fileId = pdfFileObj.save();
            log.debug('Saved PDF File ID', fileId);
            return fileId;

        } catch (error) {
            log.error('Error Generating Payslip for Employee ' + empId, error);
            throw error;
        }
    }

    // ========================================================================
    // HELPER: CREATE OR UPDATE PAYSLIP RECORD
    // ========================================================================
    function createpaysliprecord(fileId, empId, empPaygrp, empWageMonth, yearVal, endYear, subsidiaryId, query,processtype) {
        try {
            var monthId = getmonthidfrommaster(empWageMonth, query);
            var yearId = getyearidfrommaster(endYear, query);

            var payslipquery = "SELECT id FROM customrecord_hris_emp_payslip_monh " +
                "WHERE custrecord_hris_emp_payslip_empid = " + empId +
                " AND custrecord_hris_emp_payslip_month = " + monthId +
                " AND custrecord_hris_payslip_year = " + yearId +
                " AND custrecord_hris_emp_payslip_processtype = " + processtype+
                " AND isinactive = 'F'";

            var results = query.runSuiteQL({ query: payslipquery });
            var data = results.asMappedResults();

            var payslipRec;
            if (data.length > 0) {
                var payid = data[0].id;
                payslipRec = record.load({
                    type: 'customrecord_hris_emp_payslip_monh',
                    id: payid,
                    isDynamic: true
                });
            } else {
                payslipRec = record.create({
                    type: 'customrecord_hris_emp_payslip_monh',
                    isDynamic: true
                });
            }

            payslipRec.setValue({ fieldId: 'custrecord_hris_emp_payslip_empid', value: empId });
            payslipRec.setValue({ fieldId: 'custrecord_hris_emp_payslip_month', value: monthId });
            payslipRec.setValue({ fieldId: 'custrecord_hris_payslip_year', value: yearId });
            payslipRec.setValue({ fieldId: 'custrecord_hris_payslip_payslip', value: fileId });
            payslipRec.setValue({ fieldId: 'custrecord_hris_emp_payslip_processtype', value: processtype});

            var payslipId = payslipRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: false
            });
            log.debug('Payslip Record Created/Updated', 'Payslip ID: ' + payslipId);
            return payslipId;

        } catch (e) {
            log.error('Error creating payslip record', e);
            throw e;
        }
    }

   function getearningdetails(
    empId,
    yearVal,
    empPaygrp,
    empWageMonth,
    earningordeduction,
    processtype
  ) {
    //var endYear = yearVal;

    /*    var payprocessquery = "SELECT  \
    a.custrecord_hris_pay_proc_payroll_compone AS payrollcomponent, \
    BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone) as payname, \
    SUM(a.custrecord_hris_pay_proc_actual_gross_ea) AS totalamount  FROM  \
    customrecord_hris_pay_process a join customrecord_hris_payroll_component b \
     on a.custrecord_hris_pay_proc_payroll_compone = b.id \
    WHERE \
    a.custrecord_hris_pay_proc_employee = " + empId " \
    AND a.custrecord_hris_pay_proc_component_type = 1 \
    AND a.custrecord_hris_pay_proc_pay_group = " + empPaygrp + " \
    AND BUILTIN.DF(a.custrecord_hris_pay_proc_pay_month) ='" + empWageMonth + "' \
    AND BUILTIN.DF(a.custrecord_hris_pay_proc_year) = '" + yearVal + "' \
and a.custrecord_hris_pay_proc_process_type = "+processtype+" \
and b.custrecord_hris_show_in_pay_slips='T' \
GROUP BY \
    a.custrecord_hris_pay_proc_payroll_compone,  \
    BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone)";    */

    var payprocessquery =
      "SELECT " +
      " a.custrecord_hris_pay_proc_payroll_compone AS payrollcomponent, " +
      " BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone) AS payname, " +
      " SUM(a.custrecord_hris_pay_proc_actual_gross_ea) AS totalamount ,b.custrecord_hris__sequence_no_ as seqno" +
      " FROM customrecord_hris_pay_process a " +
      " JOIN customrecord_hris_payroll_component b " +
      " ON a.custrecord_hris_pay_proc_payroll_compone = b.id " +
      "WHERE a.custrecord_hris_pay_proc_employee = " +
      empId +
      " " +
      "AND a.custrecord_hris_pay_proc_component_type = 1 " +
      "AND a.custrecord_hris_pay_proc_pay_group = " +empPaygrp +" " +
      "AND  BUILTIN.DF(a.custrecord_hris_pay_proc_pay_month)  = '" +empWageMonth +"' " + 
      "AND BUILTIN.DF(a.custrecord_hris_pay_proc_year) = '" +yearVal +"' " +
      "AND a.custrecord_hris_pay_proc_process_type = " +
      processtype +
      " " +
      "AND b.custrecord_hris_show_in_pay_slips = 'T' " +
      "GROUP BY a.custrecord_hris_pay_proc_payroll_compone,b.custrecord_hris__sequence_no_ ," +
      " BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone) order by b.custrecord_hris__sequence_no_";
      log.emergency('earningpayprocessquery',payprocessquery);

    var queryResults = query.runSuiteQL({ query: payprocessquery });
    var payprocessrecords = queryResults.asMappedResults();
    var result = [];
    if (payprocessrecords.length > 0) {
      for (var i = 0; i < payprocessrecords.length; i++) {
        var rec = payprocessrecords[i];
        var payrollcomponet = payprocessrecords[i].payrollcomponent;
        var payname = payprocessrecords[i].payname;
        var amount = payprocessrecords[i].totalamount;

        result.push({
          payrollcomponet: payrollcomponet,
          payname: payname,
          amount: amount,
        });
      }
    }
    return result;
  }

  function getdeductiondetails(
    empId,
    yearVal,
    empPaygrp,
    empWageMonth,
    earningordeduction,
    processtype
  ) {
    //var endYear = yearVal;

    /*   var payprocessquery = "SELECT  \
    a.custrecord_hris_pay_proc_payroll_compone AS payrollcomponent, \
    BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone) as payname, \
    SUM(a.custrecord_hris_pay_proc_actual_gross_ea) AS totalamount  FROM  \
    customrecord_hris_pay_process a join customrecord_hris_payroll_component b \
     on a.custrecord_hris_pay_proc_payroll_compone = b.id \
    WHERE \
    a.custrecord_hris_pay_proc_employee = " + empId " \
    AND a.custrecord_hris_pay_proc_component_type = 2 \
    AND a.custrecord_hris_pay_proc_pay_group = " + empPaygrp + " \
    AND BUILTIN.DF(a.custrecord_hris_pay_proc_pay_month) ='" + empWageMonth + "' \
    AND BUILTIN.DF(a.custrecord_hris_pay_proc_year) = '" + yearVal + "'\
and a.custrecord_hris_pay_proc_process_type = "+processtype+" \
and b.custrecord_hris_show_in_pay_slips='T' \
GROUP BY \
    a.custrecord_hris_pay_proc_payroll_compone,  \
    BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone)"   
     */
    var payprocessquery =
      "SELECT " +
      " a.custrecord_hris_pay_proc_payroll_compone AS payrollcomponent, " +
      " BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone) AS payname, " +
      " SUM(a.custrecord_hris_pay_proc_actual_gross_de) AS totalamount,b.custrecord_hris__sequence_no_ as seqno " +
      " FROM customrecord_hris_pay_process a " +
      " JOIN customrecord_hris_payroll_component b " +
      " ON a.custrecord_hris_pay_proc_payroll_compone = b.id " +
      "WHERE a.custrecord_hris_pay_proc_employee = " +
      empId +
      " " +
      "AND a.custrecord_hris_pay_proc_component_type = 2 " +
      "AND a.custrecord_hris_pay_proc_pay_group = " +empPaygrp +" " +
      "AND  BUILTIN.DF(a.custrecord_hris_pay_proc_pay_month)  = '" +empWageMonth +"' " + 
      "AND BUILTIN.DF(a.custrecord_hris_pay_proc_year) = '" +yearVal +"' " +
      "AND a.custrecord_hris_pay_proc_process_type = " +
      processtype +
      " " +
      "AND b.custrecord_hris_show_in_pay_slips = 'T' " +
      "GROUP BY a.custrecord_hris_pay_proc_payroll_compone, " +
      " BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone),b.custrecord_hris__sequence_no_ order by b.custrecord_hris__sequence_no_";
      log.emergency('deductionpayprocessquery',payprocessquery);
    var queryResults = query.runSuiteQL({ query:payprocessquery });
    var payprocessrecords = queryResults.asMappedResults();
    var result = [];
    if (payprocessrecords.length > 0) {
      for (var i = 0; i < payprocessrecords.length; i++) {
        var rec = payprocessrecords[i];
        var payrollcomponet = payprocessrecords[i].payrollcomponent;
        var payname = payprocessrecords[i].payname;
        var amount = payprocessrecords[i].totalamount;

        result.push({
          payrollcomponet: payrollcomponet,
          payname: payname,
          amount: amount,
        });
      }
    }
    return result;
  }

function escapeXML(input) {
			try {
				var output = '';
				if (input) {
					output = xml.escape({
						xmlText: input
					});
				}
			} catch (e) {
				log.debug('Error in escapeXML', e.message + ' ' + input);
			}
			return output;
		}
  function getotandbonusdetails(
    empId,
    yearVal,
    empPaygrp,
    empWageMonth,
    earningordeduction,
    processtype
  ) {
   
    var payprocessquery =
      "SELECT " +
      " a.custrecord_hris_pay_proc_payroll_compone AS payrollcomponent, " +
      " BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone) AS payname, " +
      " SUM(a.custrecord_hris_pay_proc_actual_gross_ea) AS totalamount,b.custrecord_hris__sequence_no_ as seqno, " +
      " NVL(c.custrecord_hris_mthsal_total_hours_days,0) AS othours FROM  customrecord_hris_pay_process a " +
      " JOIN customrecord_hris_payroll_component b " +
      " ON a.custrecord_hris_pay_proc_payroll_compone = b.id " +
      "  JOIN customrecord_hris_monthlysalinput c " +
      " ON c.custrecord_hris_mthsal_empname = a.custrecord_hris_pay_proc_employee " +
     "   AND a.custrecord_hris_pay_proc_pay_group = c.custrecord_hris_mthsal_paygroup " +
      "  AND a.custrecord_hris_pay_proc_pay_month = c.custrecord_hris_mthsal_month " +
       " AND a.custrecord_hris_pay_proc_year = c.custrecord_hris_mthsal_year " +
       " AND a.custrecord_hris_pay_proc_process_type = c.custrecord_hris_mthsal_processtype " +
	" AND a.custrecord_hris_pay_proc_payroll_compone = c.custrecord_hris_mthsal_paycomponent " +
      "WHERE a.custrecord_hris_pay_proc_employee = " +
      empId +
      " " +
      "AND a.custrecord_hris_pay_proc_pay_group = " +empPaygrp +" " +
      "AND  BUILTIN.DF(a.custrecord_hris_pay_proc_pay_month)  = '" +empWageMonth +"' " + 
      "AND BUILTIN.DF(a.custrecord_hris_pay_proc_year) = '" +yearVal +"' " +
      "AND a.custrecord_hris_pay_proc_process_type = " +
      processtype +
      " " +
      "AND b.custrecord_hris_show_in_pay_slips = 'T' " +
      "GROUP BY a.custrecord_hris_pay_proc_payroll_compone, " +
      " BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone),b.custrecord_hris__sequence_no_, " +
      " c.custrecord_hris_mthsal_total_hours_days order by b.custrecord_hris__sequence_no_";
      log.emergency('deductionpayprocessquery',payprocessquery);
    var queryResults = query.runSuiteQL({ query:payprocessquery });
    var payprocessrecords = queryResults.asMappedResults();
    var result = [];
    if (payprocessrecords.length > 0) {
      for (var i = 0; i < payprocessrecords.length; i++) {
        var rec = payprocessrecords[i];
        var payrollcomponet = payprocessrecords[i].payrollcomponent;
        var payname = payprocessrecords[i].payname;
        var amount = payprocessrecords[i].totalamount;
        var othours = payprocessrecords[i].othours;
        var seqno = payprocessrecords[i].seqno;
        result.push({
          payrollcomponet: payrollcomponet,
          payname: payname,
          amount: amount,
          othours:othours,
          seqno:seqno
        });
      }
    }
    log.audit('OT and Bonus',result);
    return result;
  }
 function getpaidandlopdetails(
    empId,
    yearVal,
    empPaygrp,
    empWageMonth,
    earningordeduction,
    processtype
  ) {
    
    var paiddays =0;
    var lopdays =0;
   var payprocessquery = "SELECT distinct NVL(a.custrecord_hris_pay_proc_paid_days, 0) AS paiddays, "+
            "  NVL(a.custrecord_hris_pay_proc_lop_days, 0) AS lopdays " +
                        " FROM  customrecord_hris_pay_process a join customrecord_hris_payroll_component b on a.custrecord_hris_pay_proc_payroll_compone = b.id "+
            "WHERE a.custrecord_hris_pay_proc_employee = " +
      empId + " " +
      "AND a.custrecord_hris_pay_proc_pay_group = " +empPaygrp +" " +
      "AND  BUILTIN.DF(a.custrecord_hris_pay_proc_pay_month)  = '" +empWageMonth +"' " + 
      "AND BUILTIN.DF(a.custrecord_hris_pay_proc_year) = '" +yearVal +"' " +
      "AND a.custrecord_hris_pay_proc_process_type = " +
      processtype +
      " " +
      "AND b.custrecord_hris_show_in_pay_slips = 'T' AND a.custrecord_hris_pay_proc_paid_days IS NOT NULL " +
    " AND a.custrecord_hris_pay_proc_lop_days IS NOT NULL" ;
   





      log.emergency('paidandloppayprocessquery',payprocessquery);
    var queryResults = query.runSuiteQL({ query:payprocessquery });
    var payprocessrecords = queryResults.asMappedResults();
    var result = [];
    if (payprocessrecords.length > 0) {
      for (var i = 0; i < payprocessrecords.length; i++) {
        var rec = payprocessrecords[i];
         paiddays = payprocessrecords[i].paiddays;
         lopdays = payprocessrecords[i].lopdays;
       
      }
    }
    return paiddays  + "#" + lopdays   
  }
  function getwageperiodetails(empPaygrp, empWageMonth, endYear) {
    var wagePeriodQuery =
      "SELECT " +
      "custrecord_hris_start_date AS startdate, " +
      "custrecord_hris_end_date AS enddate " +
      "FROM customrecord_hris_wage_period_details " +
      "WHERE custrecord_hris_pay_group = " +
      empPaygrp +
      " " +
      "AND BUILTIN.DF(custrecord_hris_month) = '" +
      empWageMonth +
      "' " +
      "AND BUILTIN.DF(custrecord_hris_year) = '" +
      endYear +
      "'";

    log.debug("Generated SQL Query", wagePeriodQuery);
    try {
      var queryResults = query.runSuiteQL({ query: wagePeriodQuery });
      log.debug("Query Results", queryResults);

      var wagePeriodRecords = queryResults.asMappedResults();
      var wagePeriodArray = [];
      var wagePeriodDetails = {};

      if (wagePeriodRecords.length > 0) {
        for (var i = 0; i < wagePeriodRecords.length; i++) {
          var record = wagePeriodRecords[i];
          wagePeriodDetails = {
            Staratdate: record.startdate,
            Enddate: record.enddate,
          };
          log.debug("Wage Period Details from Query", wagePeriodDetails);
          wagePeriodArray.push(wagePeriodDetails);
        }
      }
      return {
        wagePeriodDetails: wagePeriodDetails,
        wagePeriodArray: wagePeriodArray,
      };
    } catch (error) {
      log.error("SQL Execution Error", error);
      return {
        wagePeriodDetails: {},
        wagePeriodArray: [],
      };
    }
  }

   function getotwageperiodetails(empPaygrp, empWageMonth, endYear) {
    var wagePeriodQuery =
      "SELECT " +
      "custrecord_hris_lvestart_date AS startdate, " +
      "custrecord_hris_lveend_date AS enddate " +
      "FROM customrecord_hris_lvewage_period_details " +
      "WHERE custrecord_hris_lvepay_group = " +
      empPaygrp +
      " " +
      "AND BUILTIN.DF(custrecord_hris_lvemonth) = '" +
      empWageMonth +
      "' " +
      "AND BUILTIN.DF(custrecord_hris_lveyear) = '" +
      endYear +
      "'";

    log.debug("Generated SQL Query", wagePeriodQuery);
    try {
      var queryResults = query.runSuiteQL({ query: wagePeriodQuery });
      log.debug("Query Results", queryResults);

      var wagePeriodRecords = queryResults.asMappedResults();
      var wagePeriodArray = [];
      var wagePeriodDetails = {};

      if (wagePeriodRecords.length > 0) {
        for (var i = 0; i < wagePeriodRecords.length; i++) {
          var record = wagePeriodRecords[i];
          wagePeriodDetails = {
            Staratdate: record.startdate,
            Enddate: record.enddate,
          };
          log.debug("Wage Period Details from Query", wagePeriodDetails);
          wagePeriodArray.push(wagePeriodDetails);
        }
      }
      return {
        wagePeriodDetails: wagePeriodDetails,
        wagePeriodArray: wagePeriodArray,
      };
    } catch (error) {
      log.error("SQL Execution Error", error);
      return {
        wagePeriodDetails: {},
        wagePeriodArray: [],
      };
    }
  }
  
    function getmonthidfrommaster(monthName, query) {
        var monthquery = "SELECT id FROM customlist_hris_month_list WHERE name='" + monthName + "'";
        var resultSet = query.runSuiteQL({ query: monthquery }).asMappedResults();
        return resultSet.length > 0 ? resultSet[0].id : null;
    }
    function getleavedaysfromattendace(empId, empPaygrp, empWageMonth, endYear,startdate,enddate) {
    
      var leavequery = "select COUNT(*) AS leavecount from customrecord_hris_leaveapplication  a \
              join customrecord_hris_leaveconfig b on a.custrecord_hris_lve_leavetype = b.id \
              join employee e on e.id =a.custrecord_hris_lve_employeename \
              where a.custrecord_hris_lve_fromdate >='"+startdate+"'  and a.custrecord_hris_lve_todate <='"+enddate+"' \
              and a.custrecord_hris_lve_employeename ="+empId+" and e.custentity_hris_emppayrollgroup="+empPaygrp+" \
               and b.custrecord_hris_lveconfig_unpaid='F' and a.isinactive='F' and b.isinactive='F'"

    log.debug("leavequery", leavequery);
    var queryResults = query.runSuiteQL({ query: leavequery });
    log.debug("queryResults", queryResults);

    var employeeRecords = queryResults.asMappedResults();
   var leavecount

    if (employeeRecords.length > 0) {
      for (var r = 0; r < employeeRecords.length; r++) {
       leavecount= employeeRecords[r].leavecount;
        
      }
      
    }
    return leavecount

  }

    function getyearidfrommaster(yearid, query) {
        var yearquery = "SELECT id FROM customlist_hris_year_master WHERE name='" + yearid + "'";
        var resultSet = query.runSuiteQL({ query: yearquery }).asMappedResults();
        return resultSet.length > 0 ? resultSet[0].id : null;
    }

    

    function getpayprocessdetailsdynamic(empId, yearVal, empPaygrp, empWageMonth, earningordeduction) {
        var endYear = yearVal;
        var payprocessqury = "SELECT " +
            "p.custrecord_hris_pay_proc_componet_sequen AS seqnum, " +
            "p.custrecord_hris_pay_proc_value AS amount " +
            "FROM employee e " +
            "JOIN customrecord_hris_pay_process p ON p.custrecord_hris_pay_proc_employee = e.id " +
            "WHERE p.custrecord_hris_pay_proc_pay_group = " + empPaygrp + " " +
            "AND BUILTIN.DF(p.custrecord_hris_pay_proc_pay_month) = '" + empWageMonth + "' " +
            "AND BUILTIN.DF(p.custrecord_hris_pay_proc_year) = '" + endYear + "' " +
            "AND p.custrecord_hris_pay_proc_component_type = " + earningordeduction + " " +
            "AND e.id = " + empId;
        var queryResults = query.runSuiteQL({ query: payprocessqury });
        var payprocessrecords = queryResults.asMappedResults();
        var result = {};
        if (payprocessrecords.length > 0) {
            for (var i = 0; i < payprocessrecords.length; i++) {
                var rec = payprocessrecords[i];
                if (rec.seqnum != null && rec.amount != null) {
                    result[rec.seqnum] = rec.amount;
                }
            }
        }
        return result;
    }

    function getMonthlySalaryAmount(empId, yearVal, empPaygrp, empWageMonth, earningordeduction) {
        var endYear = yearVal
        var queryString = "SELECT " +
            "A.custrecord_hris_mthsal_salaryamount, " +
            "B.custrecord_hris__sequence_no_ AS seqnum " +
            "FROM customrecord_hris_monthlysalinput AS A " +
            "LEFT JOIN customrecord_hris_payroll_component AS B ON B.id = A.custrecord_hris_mthsal_paycomponent " +
            "WHERE BUILTIN.DF(A.custrecord_hris_mthsal_month) = '" + empWageMonth + "' " +
            "AND A.custrecord_hris_mthsal_paygroup = " + empPaygrp + " " +
            "AND BUILTIN.DF(A.custrecord_hris_mthsal_year) = '" + endYear + "' " +
            "AND A.custrecord_hris_mthsal_empname = " + empId + " " +
            "AND A.custrecord_hris_mthsal_componenttype = " + earningordeduction;
        var results = query.runSuiteQL({ query: queryString });
        var data = results.asMappedResults();
        var resultMap = {};
        if (data.length > 0) {
            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                if (row.seqnum != null && row.custrecord_hris_mthsal_salaryamount != null) {
                    resultMap[row.seqnum] = row.custrecord_hris_mthsal_salaryamount;
                }
            }
        }
        return resultMap;
    }

    function getLeaveSettlementDetails(empId, empWageMonth, endYear) {
        try {
            if (!empWageMonth || !endYear) {
                return { leavesettlement: 0, airticketamount: 0 };
            }
            var leaveQuery = "SELECT " +
                "custrecord_hrms_lveset_lvesalaryamount AS leavesettlement, " +
                "custrecord_hrms_lveset_airticketamount AS airticketamount " +
                "FROM customrecord_hrms_leavesettlement " +
                "WHERE custrecord_hrms_lveset_empname = " + empId + " " +
                "AND BUILTIN.DF(custrecord_hrms_lveset_month) = '" + empWageMonth + "' " +
                "AND BUILTIN.DF(custrecord_hrms_lveset_year) = " + endYear;
            var queryResults = query.runSuiteQL({ query: leaveQuery });
            var leaveRecords = queryResults.asMappedResults();
            var result = { leavesettlement: 0, airticketamount: 0 };
            if (leaveRecords.length > 0) {
                result.leavesettlement = parseFloat(leaveRecords[0].leavesettlement) || 0;
                result.airticketamount = parseFloat(leaveRecords[0].airticketamount) || 0;
            }
            return result;
        } catch (error) {
            log.error("Error fetching leave settlement for ID: " + empId, error);
            return { leavesettlement: 0, airticketamount: 0 };
        }
    }

    function getworkdaysfrompayproc(empId, empPaygrp, empWageMonth, yearVal) {
        var endYear = yearVal;
        var workdtquery = "SELECT " +
            "p.custrecord_hris_pay_proc_paid_days " +
            "FROM employee e " +
            "JOIN customrecord_hris_pay_process p ON p.custrecord_hris_pay_proc_employee = e.id " +
            "WHERE p.custrecord_hris_pay_proc_pay_group = " + empPaygrp + " " +
            "AND BUILTIN.DF(p.custrecord_hris_pay_proc_pay_month) = '" + empWageMonth + "' " +
            "AND BUILTIN.DF(p.custrecord_hris_pay_proc_year) = '" + endYear + "' " +
            "AND e.id = " + empId;
        var queryResults = query.runSuiteQL({ query: workdtquery });
        var employeeRecords = queryResults.asMappedResults();
        return employeeRecords.length > 0 ? employeeRecords[0].custrecord_hris_pay_proc_paid_days : '';
    }

    function getloanbalance(empId) {
        var loanamoubtquery = "SELECT custrecord_hris_loan_outstanding_amount " +
            "FROM customrecord_hris_empchange_loan_applicn " +
            "WHERE custrecord_hris_loan_emp_name = " + empId;
        var results = query.runSuiteQL({ query: loanamoubtquery }).asMappedResults();
        return results.length > 0 ? results[0].custrecord_hris_loan_outstanding_amount || 0 : 0;
    }

    function getovertimehours(empId, yearVal, empPaygrp, empWageMonth, overtimeseqnum) {
        var endYear = yearVal;
        var overtimequery = "SELECT " +
            "A.custrecord_hris_mthsal_total_hours_days AS othrs " +
            "FROM customrecord_hris_monthlysalinput AS A " +
            "LEFT JOIN customrecord_hris_payroll_component AS B ON B.id = A.custrecord_hris_mthsal_paycomponent " +
            "WHERE BUILTIN.DF(A.custrecord_hris_mthsal_month) = '" + empWageMonth + "' " +
            "AND A.custrecord_hris_mthsal_paygroup = " + empPaygrp + " " +
            "AND BUILTIN.DF(A.custrecord_hris_mthsal_year) = '" + endYear + "' " +
            "AND A.custrecord_hris_mthsal_empname = " + empId + " " +
            "AND B.custrecord_hris__sequence_no_ = " + overtimeseqnum;
        var queryResults = query.runSuiteQL({ query: overtimequery });
        var othrsrec = queryResults.asMappedResults();
        return othrsrec.length > 0 ? othrsrec[0].othrs || 0 : '';
    }

    function convertAmountToWords(amount) {
        if (!amount || amount <= 0) return 'Zero Dirhams Only';
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
        if (integerPart === 0) {
            result = 'Zero Dirhams';
        } else {
            var parts = [];
            var num = integerPart;
            var thousandIndex = 0;
            while (num > 0) {
                var chunk = num % 1000;
                if (chunk > 0) {
                    var chunkText = numToWords(chunk);
                    if (chunkText) {
                        parts.unshift(chunkText + (thousands[thousandIndex] ? ' ' + thousands[thousandIndex] : ''));
                    }
                }
                num = Math.floor(num / 1000);
                thousandIndex++;
            }
            result = parts.join(' ') + ' Dirhams';
        }
        if (decimalPart > 0) {
            result += ' and ' + numToWords(decimalPart) + ' Fils';
        }
        return result.trim() + ' Only';
    }

    // ========================================================================
    // RETURN
    // ========================================================================
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});