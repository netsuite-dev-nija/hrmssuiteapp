/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/query', 'N/file', 'N/format'],
    function(log, record, query, file, format) {

        function doGet(params) {
            try {
                // 1. Capture parameters
                // Using hardcoded values from your snippet for testing, 
                // but usually you'd use: var empId = params.empid;
                /* var empId = 318949;
                var empWageMonth = 3;
                var yearVal = 8;
                var processtype = 1;
 */

                 /*  var empId = 1985;
                var empWageMonth = 8;
                var yearVal = 7;
                var processtype = 4; */
 
                   var empId = params.empid; 
            var empWageMonth = params.month;
            var yearVal = params.year;
            var processtype = params.processtype;

              /*     var payprocessquery = "SELECT * FROM customrecord_hris_pay_process a  " +
                "WHERE a.custrecord_hris_pay_proc_employee = " + empId + " AND a.custrecord_hris_pay_proc_component_type = 1 " +
                "AND a.custrecord_hris_pay_proc_pay_group = " + empPaygrp + " AND a.custrecord_hris_pay_proc_pay_month = '" + empWageMonth + "' " +
                "AND a.custrecord_hris_pay_proc_year = '" + yearVal + "' AND a.custrecord_hris_pay_proc_process_type = " + processtype + " ";
                
              */   
              /*    var checkDataSql = "SELECT COUNT(*) as count FROM customrecord_hris_pay_process " +
                           "WHERE custrecord_hris_pay_proc_employee = " + empId + " " +
                           "AND custrecord_hris_pay_proc_pay_month = '" + empWageMonth + "' " +
                           "AND custrecord_hris_pay_proc_year = '" + yearVal + "' " +
                           "AND custrecord_hris_pay_proc_process_type = " + processtype;
 */

        // Changed as per mam told 10/06/2026 if payslip wage period is not there is does not show data to mobile
/* var checkDataSql =" SELECT COUNT(*) as count " +
                   " FROM customrecord_hris_pay_process p " +
                 " JOIN customrecord_hris_payslip_releasewageper w " +
                " ON p.custrecord_hris_pay_proc_process_type = w.custrecord_hris_psrele_processtype  " +
                " AND p.custrecord_hris_pay_proc_pay_month = w.custrecord_hris_psrele_month   " +
              " AND p.custrecord_hris_pay_proc_year = w.custrecord_hris_psrele_year  " +
            " AND p.custrecord_hris_pay_proc_pay_group = w.custrecord_hris_psrele_paygroup  " +
            "   WHERE p.isinactive='F' and  p.custrecord_hris_pay_proc_pay_month = " + empWageMonth +" " +
       "   AND p.custrecord_hris_pay_proc_year = " + yearVal + " " +
  "   AND p.custrecord_hris_pay_proc_process_type = " + processtype + " " +
  "  and w.custrecord_hris_psrele_payslipmobile='T' AND p.custrecord_hris_pay_proc_employee = " + empId ;
 */

  // Changed for ot and bonus if ot is not there it will create a single entry for net pay and if ot is there it will show the details in mobile app as per mam told 10/06/2026
var checkDataSql =" SELECT COUNT(*) as count , p.custrecord_hris_pay_proc_employee,BUILTIN.DF(p.custrecord_hris_pay_proc_employee) as empname" +
                   " FROM customrecord_hris_pay_process p " +
                 " JOIN customrecord_hris_payslip_releasewageper w " +
                " ON p.custrecord_hris_pay_proc_process_type = w.custrecord_hris_psrele_processtype  " +
                " AND p.custrecord_hris_pay_proc_pay_month = w.custrecord_hris_psrele_month   " +
              " AND p.custrecord_hris_pay_proc_year = w.custrecord_hris_psrele_year  " +
            " AND p.custrecord_hris_pay_proc_pay_group = w.custrecord_hris_psrele_paygroup  " +
            "   WHERE p.isinactive='F' and  p.custrecord_hris_pay_proc_pay_month = " + empWageMonth +" " +
       "   AND p.custrecord_hris_pay_proc_year = " + yearVal + " " +
  "   AND p.custrecord_hris_pay_proc_process_type = " + processtype + " " +
  "  and w.custrecord_hris_psrele_payslipmobile='T' AND p.custrecord_hris_pay_proc_employee = " + empId + " "+
  " GROUP BY p.custrecord_hris_pay_proc_employee,BUILTIN.DF(p.custrecord_hris_pay_proc_employee)  " +
  " HAVING  COUNT(*)!= 1 ";




         log.emergency('checkDataSql',checkDataSql);
 
        var countResult = query.runSuiteQL({ query: checkDataSql }).asMappedResults();
        
        //if (!countResult || countResult[0].count == 0) {
        if (!countResult || countResult.length === 0) {
            return JSON.stringify({
                Status: "No Data",
                ResponseCode: "404",
                Message: "No payroll records found for the selected period."
            });
        }
            
                // 2. Load Employee Record
                var empRec = record.load({
                    type: record.Type.EMPLOYEE,
                    id: empId,
                    isDynamic: false
                });

                var subsidiaryId = empRec.getValue({ fieldId: 'subsidiary' });
                   var subsidiaryRec = record.load({
                type: 'subsidiary',
                id: subsidiaryId
            });

           var subsidiaryLogo = subsidiaryRec.getValue({ fieldId: 'logo' });
            var subsidiaryaddress = subsidiaryRec.getValue({ fieldId: 'mainaddress_text' });
            var subdiaryphone = subsidiaryRec.getValue({ fieldId: 'custrecord_njt_tell_phone' });
            var subsidiaryemail = subsidiaryRec.getValue({ fieldId: 'email' });
            log.debug('subsidiaryLogo', subsidiaryLogo);
            log.debug('subsidiaryaddress', subsidiaryaddress);
            log.debug('subdiaryphone', subdiaryphone);
            log.debug('subsidiaryemail', subsidiaryemail);
            var logotag1 = '';
           
            if (subsidiaryLogo) {
          var logotag = file.load({ id: subsidiaryLogo }).url;
        //  logotag = logotag.replace(/&/gi, "&amp;");
           var prefix = "https://11951030.app.netsuite.com";
          logotag = prefix + logotag;
        /*  logotag1 =
            '<img src="' + logotag + '" style="width:100pt;height:100pt;"/>';
       */  }
              var employeeCode   = empRec.getText({ fieldId: 'custentity_hris_empcode' });
            var employeeName   = empRec.getValue({ fieldId: 'custentity_hris_emplegalname' });
            var designation    = empRec.getText({ fieldId: 'custentity_hris_empdesignation' });
            var department     = empRec.getText({ fieldId: 'custentity_hris_empdepartment_new' });
            var dateOfJoining  = empRec.getValue({ fieldId: 'custentity_hris_date_of_joining' })||'';
            var bankAccount    = empRec.getValue({ fieldId: 'custentity_hris_emp_bankaccno' });
            var emiratesId     = empRec.getValue({ fieldId: 'custentity_hris_empemiratesno' });
            var bankName       = empRec.getText({ fieldId: 'custentity_hris_empbankname' });
            var location = empRec.getText({fieldId:'custentity_hris_empdlocation_new'})||'';
            var ibanNumber=  empRec.getValue({ fieldId: 'custentity_hris_empbankibanacctno' })||'';
 var PaygrpName = empRec.getText({fieldId:"custentity_hris_emppayrollgroup"})||'';
 var empPaygrp = empRec.getValue({fieldId:'custentity_hris_emppayrollgroup'})||'';
              log.debug('employeeCode', employeeCode);
            log.debug('Employee Name', employeeName);
            log.debug('Designation', designation);
            log.debug('Department', department);
            log.debug('DOJ', dateOfJoining);
            log.debug('Bank Account', bankAccount);
            log.debug('Emirates ID', emiratesId);
            log.debug('Bank Name', bankName);
            log.debug('Location',location);
            log.debug('paygroup',empPaygrp);
             
                var dateOfJoining = empRec.getValue({ fieldId: 'custentity_hris_date_of_joining' }) || '';
                
                var formattedDateofjoin = '';
                if (dateOfJoining) {
                    formattedDateofjoin = format.format({
                        value: new Date(dateOfJoining),
                        type: format.Type.DATE
                    });
                }
            if(processtype==1){    
                // 4. Fetch Payroll Data
                var lopdetails = getpaidandlopdetails(empId, yearVal, empPaygrp, empWageMonth, processtype);
                var parts = lopdetails.split("#");
                var paiddays = parts[0];
                var lopdays = parts[1];

                 var resultstartdateenddate = getwageperiodetails(
          empPaygrp,
          empWageMonth,
         yearVal
        );
        log.debug("resultstartdateenddate", resultstartdateenddate);
        if(resultstartdateenddate){
           var wagedetails= resultstartdateenddate.split('#');
       
        /* var wagePeriodArray = resultstartdateenddate.wagePeriodArray;
        var wagePeriodDetails = resultstartdateenddate.wagePeriodDetails; */
       /*  var Staratdate = wagePeriodDetails.Staratdate;
        var Enddate = wagePeriodDetails.Enddate;
         var standarddays = wagePeriodDetails.standarddays; */
          var Staratdate = wagedetails[0]
        var Enddate = wagedetails[1];
         var standarddays = wagedetails[2];
        log.audit("Staratdate", Staratdate);
        log.audit("Enddate", Enddate);
    }
var leavedays =getleavedaysfromattendace(empId, empPaygrp, empWageMonth, yearVal,Staratdate,Enddate)
          var formatedenddate = new Date(Enddate);

        // Format to dd/mm/yyyy
        formatedenddate = format.format({
          value: formatedenddate,
          type: format.Type.DATE,
        });

        log.debug("formatedenddate", formatedenddate);
                var earningcomponents = getearningdetails(empId, yearVal, empPaygrp, empWageMonth, processtype);
                var deductioncomponents = getdeductiondetails(empId, yearVal, empPaygrp, empWageMonth, processtype);

                // 5. Construct Response
                var response = {
                    Status: "Success",
                    ResponseCode: "200",
                    records: [{

                                 empId:empId,
                                  code: employeeCode,
                                  logotag:logotag,
                                    subsidiaryaddress:subsidiaryaddress,
                                  subdiaryphone:subdiaryphone,
                                  subsidiaryemail:subsidiaryemail,
                                  subsidiaryId:subsidiaryId,
                                  

        name: employeeName,
        designation: designation,
        department: department,
        doj: formattedDateofjoin,
        bank: bankName,
        account: bankAccount,
        iban: ibanNumber,
       // emiratesId: emiratesId,
        location: location,
        totalPaidDays: paiddays,
        leavedays:leavedays,
        totalLopDays: lopdays,
        totalworkingdays:parseInt(standarddays),
        startdate:Staratdate,
        paymentdate:Enddate,
        PaygrpName:PaygrpName,
        empPaygrp:empPaygrp,
                        earningdetails: earningcomponents,
                        deductiondetails: deductioncomponents
                    }]
                };
            }
            else if (processtype==4){
                var resultstartdateenddate = getotwageperiodetails(
          empPaygrp,
          empWageMonth,
          yearVal
        );

        log.debug("resultstartdateenddate", resultstartdateenddate);
        var wagePeriodArray = resultstartdateenddate.wagePeriodArray;
        var wagePeriodDetails = resultstartdateenddate.wagePeriodDetails;
        var Staratdate = wagePeriodDetails.Staratdate;
        var Enddate = wagePeriodDetails.Enddate;
        log.emergency("OT Staratdate", Staratdate);
        log.emergency("OT Enddate", Enddate);
         var otandbonuscomponents = getotandbonusdetails(
          empId,
          yearVal,
          empPaygrp,
          empWageMonth,        
          processtype
        );
         var response = {
                    Status: "Success",
                    ResponseCode: "200",
                    records: [{
                                empId:empId,
                                  code: employeeCode,
                                  logotag:logotag,
                                  subsidiaryaddress:subsidiaryaddress,
                                  subdiaryphone:subdiaryphone,
                                  subsidiaryemail:subsidiaryemail,
                                  subsidiaryId:subsidiaryId,
        name: employeeName,
        designation: designation,
        department: department,
        doj: formattedDateofjoin,
        bank: bankName,
        account: bankAccount,
        iban: ibanNumber,
       // emiratesId: emiratesId,
        location: location,
        stardate:Staratdate,
        paymentdate:Enddate,
        PaygrpName:PaygrpName,
        empPaygrp:empPaygrp,
                      
                        otdetails: otandbonuscomponents
                    }]
                };

    }
                // CRITICAL: Ensure this is the ONLY return in the success path
                return JSON.stringify(response);

            } catch (e) {
                log.error({ title: 'Error executing RESTlet', details: e });
                return JSON.stringify({ Status: "Error", Message: e.message });
            }
        }

        // --- Helper Functions (Logic remains same as your snippet) ---

        function getpaidandlopdetails(empId, yearVal, empPaygrp, empWageMonth, processtype) {
            var paiddays = 0, lopdays = 0;
            var sql = "SELECT distinct NVL(custrecord_hris_pay_proc_paid_days, 0) AS paiddays, " +
                "NVL(custrecord_hris_pay_proc_lop_days, 0) AS lopdays FROM customrecord_hris_pay_process a " +
                "JOIN customrecord_hris_payroll_component b ON a.custrecord_hris_pay_proc_payroll_compone = b.id " +
                "WHERE a.custrecord_hris_pay_proc_employee = " + empId + " AND a.custrecord_hris_pay_proc_pay_group = " + empPaygrp + " " +
                "AND a.custrecord_hris_pay_proc_pay_month = '" + empWageMonth + "' AND a.custrecord_hris_pay_proc_year = '" + yearVal + "' " +
                "AND a.custrecord_hris_pay_proc_process_type = " + processtype + " AND b.custrecord_hris_show_in_pay_slips = 'T'";

            var results = query.runSuiteQL({ query: sql }).asMappedResults();
            if (results.length > 0) {
                paiddays = results[0].paiddays;
                lopdays = results[0].lopdays;
            }
            return paiddays + "#" + lopdays;
        }

        function getwageperiodetails(empPaygrp, empWageMonth, yearVal) {
            var wagePeriodQuery = "SELECT custrecord_hris_start_date as startdate, custrecord_hris_end_date as enddate, custrecord_hris_wage_cycle_day_s as standarddays " +
                "FROM customrecord_hris_wage_period_details WHERE custrecord_hris_pay_group = " + empPaygrp + " " +
                "AND custrecord_hris_month = '" + empWageMonth + "' AND custrecord_hris_year = '" + yearVal + "'";
           /*  var results = query.runSuiteQL({ query: sql }).asMappedResults();
            return {
                wagePeriodDetails: results.length > 0 ? results[0] : {},
                wagePeriodArray: results
            }; */
                log.debug("Generated SQL Query", wagePeriodQuery);
    
        var queryResults = query.runSuiteQL({ query: wagePeriodQuery });
        log.debug("Query Results", queryResults);

        var wagePeriodRecords = queryResults.asMappedResults();
       var wagePeriodRecords = queryResults.asMappedResults();
      var  Staratdate="";
     var Enddate ="";
     var standarddays = "";

        if (wagePeriodRecords.length > 0) {
          for (var i = 0; i < wagePeriodRecords.length; i++) {
            var record = wagePeriodRecords[i];
           // wagePeriodDetails = {
              Staratdate= record.startdate,
              Enddate=record.enddate,
              standarddays=record.standarddays
           // };
           /*  log.debug("Wage Period Details from Query", wagePeriodDetails);
            wagePeriodArray.push(wagePeriodDetails); */
          }
        }
             return Staratdate + "#" + Enddate + "#" + standarddays ;
        }

        function getearningdetails(empId, yearVal, empPaygrp, empWageMonth, processtype) {
            var payprocessquery = "SELECT a.custrecord_hris_pay_proc_payroll_compone AS payrollcomponent,BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone) AS payname, SUM(a.custrecord_hris_pay_proc_actual_gross_ea) AS amount " +
                "FROM customrecord_hris_pay_process a JOIN customrecord_hris_payroll_component b ON a.custrecord_hris_pay_proc_payroll_compone = b.id " +
                "WHERE a.custrecord_hris_pay_proc_employee = " + empId + " AND a.custrecord_hris_pay_proc_component_type = 1 " +
                "AND a.custrecord_hris_pay_proc_pay_group = " + empPaygrp + " AND a.custrecord_hris_pay_proc_pay_month = '" + empWageMonth + "' " +
                "AND a.custrecord_hris_pay_proc_year = '" + yearVal + "' AND a.custrecord_hris_pay_proc_process_type = " + processtype + " " +
                "AND b.custrecord_hris_show_in_pay_slips = 'T' GROUP BY a.custrecord_hris_pay_proc_payroll_compone,BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone), b.custrecord_hris__sequence_no_ ORDER BY b.custrecord_hris__sequence_no_";
                 log.emergency('earningpayprocessquery',payprocessquery);
            return query.runSuiteQL({ query: payprocessquery }).asMappedResults();
            
   /*  var queryResults = query.runSuiteQL({ query:payprocessquery });
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
    } */
        }

        function getdeductiondetails(empId, yearVal, empPaygrp, empWageMonth, processtype) {
           /*  var payprocessquery = "SELECT a.custrecord_hris_pay_proc_payroll_compone AS payrollcomponent,BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone) AS payname, SUM(a.custrecord_hris_pay_proc_actual_gross_de) AS amount " +
                "FROM customrecord_hris_pay_process a JOIN customrecord_hris_payroll_component b ON a.custrecord_hris_pay_proc_payroll_compone = b.id " +
                "WHERE a.custrecord_hris_pay_proc_employee = " + empId + " AND a.custrecord_hris_pay_proc_component_type = 2 " +
                "AND a.custrecord_hris_pay_proc_pay_group = " + empPaygrp + " AND a.custrecord_hris_pay_proc_pay_month = '" + empWageMonth + "' " +
                "AND a.custrecord_hris_pay_proc_year = '" + yearVal + "' AND a.custrecord_hris_pay_proc_process_type = " + processtype + " " +
                "AND b.custrecord_hris_show_in_pay_slips = 'T' GROUP BY a.custrecord_hris_pay_proc_payroll_compone,BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone), b.custrecord_hris__sequence_no_ ORDER BY b.custrecord_hris__sequence_no_";
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
      " BUILTIN.DF(a.custrecord_hris_pay_proc_payroll_compone),b.custrecord_hris__sequence_no_   " +
      " UNION ALL " + 
      " SELECT " +
    " NULL AS payrollcomponent, 'Unpaid Amount' AS payname, SUM(a.custrecord_hris_pay_proc_lop_amount) AS totalamount, " +
     " NULL AS seqno " +
" FROM customrecord_hris_pay_process a " +
" JOIN customrecord_hris_payroll_component b " +
"     ON a.custrecord_hris_pay_proc_payroll_compone = b.id " +
" WHERE a.isinactive = 'F' " +
"  AND a.custrecord_hris_pay_proc_employee =" + empId + " " +
"  AND a.custrecord_hris_pay_proc_pay_group = " + empPaygrp + " " +
"  AND BUILTIN.DF(a.custrecord_hris_pay_proc_pay_month) = '" + empWageMonth + "' " +
"  AND BUILTIN.DF(a.custrecord_hris_pay_proc_year) = '" + yearVal + "' " +
"  AND a.custrecord_hris_pay_proc_process_type = " + processtype + " " +
"  AND b.custrecord_hris_show_in_pay_slips = 'T' " +
" ORDER BY seqno"


           
                log.emergency('deductionpayprocessquery',payprocessquery);
                return query.runSuiteQL({ query: payprocessquery }).asMappedResults();
             
    /* var queryResults = query.runSuiteQL({ query:payprocessquery });
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
    } */
        }
         function getleavedaysfromattendace(empId, empPaygrp, empWageMonth, yearVal,startdate,enddate) {
    
      var leavequery = "select COUNT(*) AS leavecount from customrecord_njt_emp_daily_atten_ch  a \
              join customrecord_hris_leaveconfig b on a.custrecord_njt_emp_daily_intatt = b.custrecord_hris_lveattntype \
              join employee e on e.id =a.custrecord_njt_daily_atten_emp \
              where a.custrecord_njt_emp_daily_date >='"+startdate+"'  and a.custrecord_njt_emp_daily_date <='"+enddate+"' \
              and a.custrecord_njt_daily_atten_emp ="+empId+" and e.custentity_hris_emppayrollgroup="+empPaygrp+" \
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
function getotandbonusdetails(
    empId,
    yearVal,
    empPaygrp,
    empWageMonth,   
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
      "AND  a.custrecord_hris_pay_proc_pay_month  = '" +empWageMonth +"' " + 
      "AND a.custrecord_hris_pay_proc_year = '" +yearVal +"' " +
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
    function getotwageperiodetails(empPaygrp, empWageMonth, yearVal) {
    var wagePeriodQuery =
      "SELECT " +
      "custrecord_hris_lvestart_date AS startdate, " +
      "custrecord_hris_lveend_date AS enddate " +
      "FROM customrecord_hris_lvewage_period_details " +
      "WHERE custrecord_hris_lvepay_group = " +
      empPaygrp +
      " " +
      "AND custrecord_hris_lvemonth = '" +
      empWageMonth +
      "' " +
      "AND custrecord_hris_lveyear = '" +
      yearVal +
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
        return { get: doGet };
    });