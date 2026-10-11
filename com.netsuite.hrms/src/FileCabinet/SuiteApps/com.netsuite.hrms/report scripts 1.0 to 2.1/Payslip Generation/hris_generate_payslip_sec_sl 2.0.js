/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope Public
*/
define([
    "N/ui/serverWidget",
    "N/search",
    "N/log",
    "N/task",
    "N/redirect",
    "N/record",
    "N/runtime",
    "N/format",
    "N/query",
    "N/file"
 ], function (
    serverWidget,
    search,
    log,
    taskModule,
    redirectModule,
    recordModule,
    runtimeModule,
    formatModule,
    query,
    fileModule
 ) {

    // Main onRequest function for Suitelet
    function onRequest(context) {
        try {
            
 
            // Create the form for selecting month and year
            var form = serverWidget.createForm({
                title: "Payprocess Filter",
            });
            var request = context.request;
            var sublistArray = [];
            var WagePeriod = request.parameters.custscript_payslip_wagemonth_sec;
            var Paygrp = request.parameters.custscript_payslip_paygroup_sec;
            var yearFieldYY = request.parameters.custscript_payslip_year_sec;
           
log.debug("yearFieldYY", yearFieldYY); // Check if value is coming correctly

if (yearFieldYY) {
    var statusQuery = "SELECT name FROM customlist_hris_year_master WHERE id = "+yearFieldYY+"";

    var queryResults = query.runSuiteQL({
        query: statusQuery,
        // params: [yearFieldYY] 
    });

    var records = queryResults.asMappedResults();
    log.debug("Query Results", records); // Debug to check the output

    if (records.length > 0) {
        for (var r = 0; r < records.length; r++) {
            var record = records[r];
            var getyearvalue = record.name;
            //var yrfrommaster = record.custrecord_hris_end_year;

            log.debug("Record Data", {
                getyearvalue: getyearvalue,
                //yrfrommaster: yrfrommaster
            });
        }
    } else {
        log.debug("No records found for yearFieldYY", yearFieldYY);
    }
} else {
    log.error("Error", "yearFieldYY is undefined or empty");
}

            var subsidiary = request.parameters.subsidiary;
            var Emp_count = request.parameters.custscript_payslip_emp_count_sec;
            var processType = request.parameters.custscript_apm_process_type;
            var yr=yearFieldYY;
            log.debug("Request Initialoarams", {
                WagePeriod: request.parameters.custscript_payslip_wagemonth_sec,
                Paygrp: request.parameters.custscript_payslip_paygroup_sec,
                yr:yearFieldYY,
                subsidiary: request.parameters.subsidiary,
                Emp_count: request.parameters.custscript_payslip_emp_count_sec,
                processType: request.parameters.custscript_apm_process_type
            });
            
            // var getyearvalue = searchYear(yr);
                var wagePeriodTxt = getWageperiodtext(WagePeriod);

                // var form = serverWidget.createForm({ title: 'Pay Slip' });
                
                var emp_Paygrp = form.addField({
                    id: 'custpage_paygroup',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Pay Group',
                    source: 'customrecord_hris_process_groupmaster'
                }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                emp_Paygrp.defaultValue = Paygrp;

                form.addField({
                    id: 'custpage_wageperiod',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Pay Month'
                }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED }).defaultValue = wagePeriodTxt;

                form.addField({
                    id: 'custpage_yr',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Year'
                }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED }).defaultValue = getyearvalue;

                form.addField({
                    id: 'custscript_counter',
                    type: serverWidget.FieldType.INTEGER,
                    label: 'Employee count'
                }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                // .defaultValue = Emp_count;

                form.addField({
                    id: 'custscript_subsidiary',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Subsidiary',
                    source: 'subsidiary'
                }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED }).defaultValue = subsidiary;

              form.addField({
                id: 'processtype',
                type: serverWidget.FieldType.SELECT,
                label: 'Process Type',
                source: 'customlist_hris_process_type_list'
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED }).defaultValue = processType;
           
                form.addButton({
                    id: 'custpage_genpayslip_button',
                    label: 'Generate Payslip',
                    functionName: 'genpayslip()'
                });
                form.addButton({
                    id: 'custpage_genpayslip_button',
                    label: 'Send Email',
                    functionName: 'sendemail()'
                });
               // form.clientScriptFileId = 1432;
                 // form.clientScriptModulePath = './hris_generate_payslip 2.0_cs.js';
                form.clientScriptModulePath = './hris_generate_payslip 2.0_cs.js';
            if (context.request.method === "GET") {
            var sublist = createSublist(form);
                
                    setSublistvalue(sublist, Paygrp, subsidiary, yr, WagePeriod,processType,query);
                    context.response.writePage(form);
            }    
            
            

           
    
        } catch (e) {
            log.error({
                title: "Error in Suitelet",
                details: e
            });
            context.response.write("An error occurred: " + e.message);
        }
    }
    function createSublist(form){
        var emp_sublist = form.addSublist({
            id: 'custpage_apm_employee_sublist_payslip',
            type: serverWidget.SublistType.LIST,
            label: 'Employee List'
        });
    emp_sublist.addMarkAllButtons();
    emp_sublist.addField({ id: 'custscript_apm_check_payslip', type: serverWidget.FieldType.CHECKBOX, label: 'Checkbox' });
    emp_sublist.addField({ id: 'custpage_empcode', type: serverWidget.FieldType.TEXT, label: 'Employee Code' });
    emp_sublist.addField({ id: 'custpage_emid', type: serverWidget.FieldType.TEXT, label: 'Employee ID' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
    emp_sublist.addField({ id: 'custpage_em', type: serverWidget.FieldType.TEXT, label: 'Employee Name' });
    emp_sublist.addField({ id: 'custpage_em_email', type: serverWidget.FieldType.TEXT, label: 'Employee Payslip Email' });
    emp_sublist.addField({ id: 'custpage_comment', type: serverWidget.FieldType.TEXT, label: 'Comment' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
    return emp_sublist;   
}
    function getWageperiodtext(WagePeriod) {
        const monthMap = {
            '1': 'January', '2': 'February', '3': 'March', '4': 'April',
            '5': 'May', '6': 'June', '7': 'July', '8': 'August',
            '9': 'September', '10': 'October', '11': 'November', '12': 'December'
        };
        return monthMap[WagePeriod] || '';
    }
    function setSublistvalue(sublist, Paygrp, subsidiary, yr, WagePeriod,processType,query){
        if(subsidiary){
    //         var queryString = 
    //         "SELECT " +
    //     "   MAX(id) AS internalid, " +
    //     "   MAX(custrecord_hris_pay_proc_employee_code) AS emp_code, " +
    //     "   custrecord_hris_pay_proc_employee AS emp_id, " +
    //     // "   MAX(custrecord_hris_pay_proc_employee_paysli) AS empemail, " +
    //     "   MAX(custrecord_hris_pay_proc_employee_legal) AS empname " +
    // "FROM customrecord_hris_pay_process " +

    //     "WHERE custrecord_hris_pay_proc_pay_group = '" + Paygrp + "' " +
    //     "AND custrecord_hris_pay_proc_company_name = '" + subsidiary + "' " +
    //     "AND custrecord_hris_pay_proc_year = '" + yr + "' " +
    //     "AND custrecord_hris_pay_proc_pay_month = '" + WagePeriod + "' " +
    //     "AND custrecord_hris_pay_proc_process_type = '" + processType + "' " +
    //     "GROUP BY custrecord_hris_pay_proc_employee";
    var queryString = 
    "SELECT " + 
    "   MAX(pp.id) AS internalid, " + 
    "   MAX(pp.custrecord_hris_pay_proc_employee_code) AS emp_code, " + 
    "   pp.custrecord_hris_pay_proc_employee AS emp_id, " + 
    "   e.email AS empemail, " + 
    "   MAX(pp.custrecord_hris_pay_proc_employee_legal) AS empname " + 
    "FROM customrecord_hris_pay_process pp " + 
    "LEFT JOIN employee e ON pp.custrecord_hris_pay_proc_employee = e.id " + 
    "WHERE pp.custrecord_hris_pay_proc_pay_group = '" + Paygrp + "' " + 
    "AND pp.custrecord_hris_pay_proc_company_name = '" + subsidiary + "' " + 
    "AND pp.custrecord_hris_pay_proc_year = '" + yr + "' " + 
    "AND pp.custrecord_hris_pay_proc_pay_month = '" + WagePeriod + "' " + 
    "AND pp.custrecord_hris_pay_proc_process_type = '" + processType + "' " + 
    "GROUP BY pp.custrecord_hris_pay_proc_employee, e.email;";


        var queryResults = query.runSuiteQL({
            query: queryString
        });
        log.debug("queryResultsno2",queryResults);
        var records = queryResults.asMappedResults();

        if (records.length > 0) {
            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var EmpIntId=record.internalid;
                var Empcode=record.emp_code;
                var EmpId=record.emp_id;
                var Empemail=record.empemail;
                var EmpName=record.empname;

                log.debug("Employee Internal ID", EmpIntId);
                log.debug("Employee Code", Empcode);
                log.debug("Employee ID", EmpId);
                log.debug("Employee Email", Empemail);
                sublist.setSublistValue({ id: 'custscript_apm_check_payslip', line: r, value: "T" });

                sublist.setSublistValue({ id: 'custpage_em', line: r, value: EmpName||"" });
                sublist.setSublistValue({ id: 'custpage_emid', line: r, value: EmpId });
                sublist.setSublistValue({ id: 'custpage_empcode', line: r, value: Empcode });
                sublist.setSublistValue({ id: 'custpage_em_email', line: r, value: Empemail || '-none-' });

            }
        }
    }
    else{
        var queryString = 
    "SELECT " + 
    "   MAX(pp.id) AS internalid, " + 
    "   MAX(pp.custrecord_hris_pay_proc_employee_code) AS emp_code, " + 
    "   pp.custrecord_hris_pay_proc_employee AS emp_id, " + 
    "   e.email AS empemail, " + 
    "   MAX(pp.custrecord_hris_pay_proc_employee_legal) AS empname " + 
    "FROM customrecord_hris_pay_process pp " + 
    "LEFT JOIN employee e ON pp.custrecord_hris_pay_proc_employee = e.id " + 
    "WHERE pp.custrecord_hris_pay_proc_pay_group = '" + Paygrp + "' " + 
    // "AND pp.custrecord_hris_pay_proc_company_name = '" + subsidiary + "' " + 
    "AND pp.custrecord_hris_pay_proc_year = '" + yr + "' " + 
    "AND pp.custrecord_hris_pay_proc_pay_month = '" + WagePeriod + "' " + 
    "AND pp.custrecord_hris_pay_proc_process_type = '" + processType + "' " + 
    "GROUP BY pp.custrecord_hris_pay_proc_employee, e.email;";


        var queryResults = query.runSuiteQL({
            query: queryString
        });
        log.debug("queryResultsno2",queryResults);
        var records = queryResults.asMappedResults();

        if (records.length > 0) {
            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var EmpIntId=record.internalid;
                var Empcode=record.emp_code;
                var EmpId=record.emp_id;
                EmpId=parseFloat(EmpId,10);
                var Empemail=record.empemail;
                var EmpName=record.empname;

                log.debug("Employee Internal ID", EmpIntId);
                log.debug("Employee Code", Empcode);
                log.debug("Employee ID", EmpId);
                log.debug("Employee Email", Empemail);
                sublist.setSublistValue({ id: 'custscript_apm_check_payslip', line: r, value: "T" });

                sublist.setSublistValue({ id: 'custpage_em', line: r, value: EmpName||"" });
                sublist.setSublistValue({ id: 'custpage_emid', line: r, value: EmpId});
                sublist.setSublistValue({ id: 'custpage_empcode', line: r, value: Empcode });
                sublist.setSublistValue({ id: 'custpage_em_email', line: r, value: Empemail || '-none-' });

            }
        }
    }
}

    // function searchYear(yearId) {
    //     var queryString = "SELECT name FROM customrecord_hris_payroll_financial_year WHERE id = "+yearId+"";
    
    //     var queryResults = query.runSuiteQL({
    //         query: queryString,
    //         // params: [yearId]
    //     }).asMappedResults();
    
    //     return queryResults.length > 0 ? queryResults[0].name : '';
    // }
    
    return {
        onRequest: onRequest
    };
 });