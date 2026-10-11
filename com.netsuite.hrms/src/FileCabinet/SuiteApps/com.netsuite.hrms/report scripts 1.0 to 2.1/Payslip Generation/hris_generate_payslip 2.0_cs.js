/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/ui/dialog', 'N/runtime', 'N/url', 'N/currentRecord', 'N/log', 'N/https'],
    function (record, search, dialog, runtime, url, currentRecord, log, https) {

        function pageInit(context) {
            var rec = context.currentRecord;
            var empTCount = 0;

            var iLineCount = rec.getLineCount({ sublistId: 'custpage_apm_employee_sublist_payslip' });

            if (iLineCount) {
                for (var i = 0; i < iLineCount; i++) {
                    var checkedEmp = rec.getSublistValue({
                        sublistId: 'custpage_apm_employee_sublist_payslip',
                        fieldId: 'custscript_apm_check_payslip',
                        line: i
                    });
                    if (checkedEmp === true) {
                        empTCount++;
                    }
                }
                rec.setValue({
                    fieldId: "custscript_counter",
                    value: empTCount,
                    ignoreFieldChange: false
                });
            }
        }

        function fieldChanged(context) {
            var rec = context.currentRecord;
            var empTCount = 0;

            if (context.sublistId === "custpage_apm_employee_sublist_payslip" && context.fieldId === "custscript_apm_check_payslip") {
                var iLineCount = rec.getLineCount({ sublistId: 'custpage_apm_employee_sublist_payslip' });

                if (iLineCount) {
                    for (var i = 0; i < iLineCount; i++) {
                        var checkedEmp = rec.getSublistValue({
                            sublistId: 'custpage_apm_employee_sublist_payslip',
                            fieldId: 'custscript_apm_check_payslip',
                            line: i
                        });
                        if (checkedEmp === true) {
                            empTCount++;
                        }
                    }
                    rec.setValue({
                        fieldId: "custscript_counter",
                        value: empTCount,
                        ignoreFieldChange: true
                    });
                }
            }
        }

        function genpayslip() {
        debugger; // Keep for debugging

        var rec = currentRecord.get();
        var employeeList = [];
        var empTCount = 0;
         var payslipcheck=1;    
        // Get values from Suitelet fields
        var empPaygrp    = rec.getValue({ fieldId: 'custpage_paygroup' });
        var empWageMonth = rec.getValue({ fieldId: 'custpage_wageperiod' });
        var yearVal      = rec.getValue({ fieldId: 'custpage_yr' });
        var subsidiary   = rec.getValue({ fieldId: 'custscript_subsidiary' });
        var processtype = rec.getValue({ fieldId: 'processtype' });

        // Count selected employees
        var iLineCount = rec.getLineCount({ sublistId: 'custpage_apm_employee_sublist_payslip' });

        if (iLineCount > 0) {
            for (var i = 0; i < iLineCount; i++) {
                var checkedEmp = rec.getSublistValue({
                    sublistId: 'custpage_apm_employee_sublist_payslip',
                    fieldId: 'custscript_apm_check_payslip',
                    line: i
                });

                if (checkedEmp === true) {
                    empTCount++;
                    var empId = rec.getSublistValue({
                        sublistId: 'custpage_apm_employee_sublist_payslip',
                        fieldId: 'custpage_emid',
                        line: i
                    });
                    employeeList.push(empId);
                }
            }

            if (empTCount > 0) {
                // ONLY ONE ALERT – as requested
                alert('Payslip is processing...');

                // Trigger Map/Reduce in background (no more alerts)
                triggerMapReduce(
                    empPaygrp,
                    empTCount,
                    employeeList,
                    empWageMonth,
                    yearVal,
                    subsidiary,
                    processtype,
                    payslipcheck
                );

            } else {
                alert('Please select at least one employee');
            }
        } else {
            alert('No employees available to process.');
        }
    }

    /**
     * Fire Map/Reduce via HTTPS GET – silent background execution
     */
    function triggerMapReduce(empPaygrp, empTCount, employeeList, empWageMonth, yearVal, subsidiary,processtype,payslipcheck) {
        log.emergency('processtype',processtype)
        try {
            var pdfUrlmrs = url.resolveScript({
                scriptId: 'customscript_hr21_generate_paypdf_sls',
                deploymentId: 'customdeploy_hr21_generate_paypdf_sls',
                params: {
                    custscript_apm_payslip_print: empPaygrp,
                    custscript_apm_checked_emp: empTCount,
                    custscript_apm_emp_name: employeeList.join(','),
                    custscript_apm_wage_mth: empWageMonth,
                    custscript_apm_year: yearVal,
                    custscript_subsi_value: subsidiary,
                    custscript_hris_payslipmailcheck:payslipcheck,
                    custscript_processtype:processtype
                }
            });

            // Fire and forget – no response handling, no extra alerts
            https.get({ url: pdfUrlmrs });

        } catch (e) {
            // Even on error, no extra alert – keep it minimal
            console.error('Silent error in triggerMapReduce:', e);
        }
    }

        function sendemailold() {
            var rec = currentRecord.get();
            var employeeList = [];
            var empTCount = 0;

            var empPaygrp = rec.getValue({ fieldId: 'custpage_paygroup' });
            var empWageMonth = rec.getValue({ fieldId: 'custpage_wageperiod' });
            var yearVal = rec.getValue({ fieldId: 'custpage_yr' });
            var subsidiary = rec.getValue({ fieldId: "custscript_subsidiary" });

            var iLineCount = rec.getLineCount({ sublistId: 'custpage_apm_employee_sublist_payslip' });

            if (iLineCount) {
                for (var i = 0; i < iLineCount; i++) {
                    var checkedEmp = rec.getSublistValue({
                        sublistId: 'custpage_apm_employee_sublist_payslip',
                        fieldId: 'custscript_apm_check_payslip',
                        line: i
                    });

                    if (checkedEmp === true) {
                        empTCount++;
                        var empId = rec.getSublistValue({
                            sublistId: 'custpage_apm_employee_sublist_payslip',
                            fieldId: 'custpage_emid',
                            line: i
                        });
                        employeeList.push(empId);
                    }
                }

                if (empTCount > 0) {
                    var pdfUrlA = url.resolveScript({
                        scriptId: 'customscript_hr21_gen_paypdf_sluiemail',
                        deploymentId: 'customdeploy_hr21_gen_paypdf_sluiemail',
                        params: {
                            custscript_apm_payslip_printA: empPaygrp,
                            custscript_apm_checked_empA: empTCount,
                            custscript_apm_emp_nameA: employeeList.join(','),
                            custscript_apm_wage_mthA: empWageMonth,
                            custscript_apm_yearA: yearVal,
                            custscript_subsi_valueA: subsidiary
                        }
                    });

                    https.get({ url: pdfUrlA });
                    dialog.alert({ title: 'Success', message: 'Email event is triggered. It will take some time, please wait.' });
                } else {
                    dialog.alert({ title: 'Warning', message: 'Please select at least one employee' });
                }
            }
        }
         function sendemail() {
            debugger;
            var rec = currentRecord.get();
            var employeeList = [];
            var empTCount = 0;
             var payslipcheck=2;
            var empPaygrp = rec.getValue({ fieldId: 'custpage_paygroup' });
            var empWageMonth = rec.getValue({ fieldId: 'custpage_wageperiod' });
            var yearVal = rec.getValue({ fieldId: 'custpage_yr' });
            var subsidiary = rec.getValue({ fieldId: "custscript_subsidiary" });
             var processtype = rec.getValue({ fieldId: 'processtype' });
            var iLineCount = rec.getLineCount({ sublistId: 'custpage_apm_employee_sublist_payslip' });

            if (iLineCount) {
                for (var i = 0; i < iLineCount; i++) {
                    var checkedEmp = rec.getSublistValue({
                        sublistId: 'custpage_apm_employee_sublist_payslip',
                        fieldId: 'custscript_apm_check_payslip',
                        line: i
                    });

                    if (checkedEmp === true) {
                        empTCount++;
                        var empId = rec.getSublistValue({
                            sublistId: 'custpage_apm_employee_sublist_payslip',
                            fieldId: 'custpage_emid',
                            line: i
                        });
                        employeeList.push(empId);
                    }
                }

                if (empTCount > 0) {
                    var pdfUrlmrs = url.resolveScript({
                        scriptId: 'customscript_hr21_generate_paypdf_sls',
                        deploymentId: 'customdeploy_hr21_generate_paypdf_sls',
                        params: {
                            custscript_apm_payslip_print: empPaygrp,
                            custscript_apm_checked_emp: empTCount,
                            custscript_apm_emp_name: employeeList.join(','), // Encoding
                            custscript_apm_wage_mth: empWageMonth,
                            custscript_apm_year: yearVal,
                            custscript_subsi_value: subsidiary,
                            custscript_hris_payslipmailcheck:payslipcheck,
                            custscript_processtype:processtype
                        }
                    });
                    https.get({ url: pdfUrlmrs });
                     dialog.alert({ title: 'Success', message: 'Email event is triggered. It will take some time, please wait.' });

                    // window.open(pdfUrlmrs, '_blank');
                    /* var pdfUrl = url.resolveScript({
                        scriptId: 'customscript_payslip_pdf_js_viewer_sut',
                        deploymentId: 'customdeploy_payslip_pdf_js_viewer_sut',
                        params: {
                            custscript_apm_payslip_print: empPaygrp,
                            custscript_apm_checked_emp: empTCount,
                            custscript_apm_emp_name: employeeList.join(','),
                            custscript_apm_wage_mth: empWageMonth,
                            custscript_apm_year: yearVal,
                            custscript_subsi_value: subsidiary
                        }
                    });
                    window.open(pdfUrl, '_blank'); */

                } else {
                    dialog.alert({ title: 'Warning', message: 'Please select at least one employee' });
                }
            }
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            genpayslip: genpayslip,
            sendemail: sendemail
        };
    });