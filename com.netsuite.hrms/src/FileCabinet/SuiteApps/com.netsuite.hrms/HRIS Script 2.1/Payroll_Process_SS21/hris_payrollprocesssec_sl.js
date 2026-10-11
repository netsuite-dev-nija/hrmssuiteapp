/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @Description Converted to SuiteScript 2.1 (functionality unchanged)
 */
var Email;
define(['N/log', 'N/search', 'N/record', 'N/runtime', 'N/ui/serverWidget', 'N/query', 'N/redirect', 'N/task', 'N/url', 'N/email'],
    function (log, search, record, runtime, serverWidget, query, redirect, task, url, email) {
        Email = email;
        function onRequest(context) {
            if (context.request.method === 'GET') {
                var sublistArray = [];

                var WagePeriod = context.request.parameters.custscript_wagemonth;
                var WagePeriodtxt = context.request.parameters.custscript_wagemonthtxt;
                var WageYear = context.request.parameters.custscript_emp_year;
                var WagePeriodNew = context.request.parameters.custscript_emp_period;
                var Paygrp = context.request.parameters.custscript_paygroup;
                var Subsidiary = context.request.parameters.custscript_hris_subsidiary;
                log.debug('context', 'Paygrp......' + Paygrp);
                log.debug('context', 'WagePeriod........' + WagePeriod);
                log.debug('context', 'WagePeriodtxt........' + WagePeriodtxt);
                log.debug('context', 'WageYear........####' + WageYear);
                log.debug('context', 'WagePeriodNew........*************' + WagePeriodNew);
                log.debug('context', 'Subsidiary' + Subsidiary);

                var Emp_List = serverWidget.createForm({
                    title: 'Pay Process'
                });

                var emp_Paygrp = Emp_List.addField({
                    id: 'custpage_paygroup',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Pay Group',
                    source: 'customrecord_hris_process_groupmaster'
                });
                emp_Paygrp.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });
                emp_Paygrp.defaultValue = Paygrp;
                var subsidiary = Emp_List.addField({
                    id: 'custpage_subsidiary',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Subsidiary',
                    source: 'subsidiary'
                });
                subsidiary.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });
                subsidiary.defaultValue = Subsidiary;

                var Pay_Date = Emp_List.addField({
                    id: 'custpage_paydate',
                    type: serverWidget.FieldType.DATE,
                    label: 'Pay Date',

                });
                Pay_Date.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });
                Pay_Date.defaultValue = WagePeriodNew;
                // Pay_Date.isDisabled = true;

                var wage_Period = Emp_List.addField({
                    id: 'custpage_wageperiod',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Pay Month'
                });
                wage_Period.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });
                wage_Period.defaultValue = WagePeriodtxt;

                var wage_Year = Emp_List.addField({
                    id: 'custpage_wageyr',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Year'
                });
                wage_Year.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });
                wage_Year.defaultValue = WageYear;

                var Employee_count = Emp_List.addField({
                    id: 'custscript_counter',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Employee count',
                    source: 'employeecount'
                });
                Employee_count.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });
                Employee_count.defaultValue = context.request.parameters.custscript_emp_count;

                var pay_freq = Emp_List.addField({
                    id: 'custpage_payfrq',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Pay Freq'
                });
                pay_freq.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });
                pay_freq.defaultValue = context.request.parameters.custscript_payfreq_seq;

                var emp_sublist = Emp_List.addSublist({
                    id: 'custpage_apm_employee_sublist',
                    type: serverWidget.SublistType.LIST,
                    label: 'Employee List'
                });
                emp_sublist.addMarkAllButtons();
                // emp_sublist.addUnMarkAllButtons();
                emp_sublist.addField({
                    id: 'custscript_apm_check',
                    type: serverWidget.FieldType.CHECKBOX,
                    label: 'Checkbox'
                }).defaultValue = true;

                emp_sublist.addField({
                    id: 'custpage_empcode',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Employee code'
                });



                emp_sublist.addField({
                    id: 'custpage_em',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Employee Name'
                });
                var emplid = emp_sublist.addField({
                    id: 'custpage_empid',
                    type: serverWidget.FieldType.FLOAT,
                    label: 'Employee ID'
                });
                emplid.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });


                /*          var sqlemp = "select a.custrecord_hris_empchange_employee_nam,BUILTIN.DF(a.custrecord_hris_empchange_employee_nam)as empname,max(custrecord_hris_empchange_increment_eff),a.custrecord_hris_empchange_emp_pay_pro_gp, a.custrecord_hris_empchange_date_of_join, \
                         a.custrecord_hris_empchange_emp_code from customrecord_hris_employee_compen_change a \
                         inner join employee b on b.id = a.custrecord_hris_empchange_employee_nam \
                         WHERE custrecord_hris_empchange_emp_active_sts = 1 \
                         and custrecord_hris_empchange_emp_pay_pro_gp= " + Paygrp + " and custrecord_hris_empchange_subsidiary =" +Subsidiary+" and a.custrecord_hris_empchange_date_of_join < ='"+WagePeriodNew+"' and b.isinactive ='F' \
                         GROUP BY a.custrecord_hris_empchange_employee_nam,BUILTIN.DF(a.custrecord_hris_empchange_employee_nam),a.custrecord_hris_empchange_emp_pay_pro_gp, a.custrecord_hris_empchange_date_of_join,a.custrecord_hris_empchange_emp_code ";
              */

                var sqlemp = "select a.custrecord_hris_empchange_employee_nam,BUILTIN.DF(a.custrecord_hris_empchange_employee_nam)as empname,max(custrecord_hris_empchange_increment_eff),a.custrecord_hris_empchange_emp_pay_pro_gp, a.custrecord_hris_empchange_date_of_join, \
					a.custrecord_hris_empchange_emp_code from customrecord_hris_employee_compen_change a \
					inner join employee b on b.id = a.custrecord_hris_empchange_employee_nam \
					WHERE custrecord_hris_empchange_emp_active_sts = 1 \
					and custrecord_hris_empchange_emp_pay_pro_gp= " + Paygrp + " and custrecord_hris_empchange_subsidiary =" + Subsidiary + " and a.custrecord_hris_empchange_date_of_join < ='" + WagePeriodNew + "' and b.isinactive ='F' \
					GROUP BY a.custrecord_hris_empchange_employee_nam,BUILTIN.DF(a.custrecord_hris_empchange_employee_nam),a.custrecord_hris_empchange_emp_pay_pro_gp, a.custrecord_hris_empchange_date_of_join,a.custrecord_hris_empchange_emp_code ";


                log.debug("sqlemp", sqlemp);
                var queryRes = query.runSuiteQL({ query: sqlemp });

                empResult = queryRes.asMappedResults();
                log.audit("Empresult", empResult.length);

                if (empResult.length > 0) {

                    for (var loop = 0; loop < empResult.length; loop++) {
                        var emprow = empResult[loop];
                        var doj = emprow.custrecord_hris_empchange_date_of_join;
                        var emp_id = emprow.empname
                        //  log.debug('empid',emp_id);

                        var emp_code = emprow.custrecord_hris_empchange_emp_code;
                        /*  log.debug('emp_code',emp_code);
                         log.debug("getEmployee : doj",doj); */
                        var employeeid = emprow.custrecord_hris_empchange_employee_nam
                        //   log.debug('Employee Id',employeeid)
                        /* 	if (WagePeriodNew >= doj) 
                            { */

                        sublistArray.push({
                            custpage_em: emp_id,
                            custpage_empcode: emp_code
                        });
                        emp_sublist.setSublistValue({
                            id: 'custpage_em',
                            line: loop,
                            value: emp_id
                        });
                        emp_sublist.setSublistValue({
                            id: 'custpage_empcode',
                            line: loop,
                            value: emp_code
                        });
                        emp_sublist.setSublistValue({
                            id: 'custpage_empid',
                            line: loop,
                            value: employeeid
                        });

                        //  }    
                    }

                    //1.0
                    //  Emp_List.clientScriptModulePath = 'SuiteScripts/Solas HRIS/hris_payprocess_cl';
                    //2.0

                    Emp_List.addSubmitButton({
                        label: 'Start Pay Process'
                    });
                    Emp_List.clientScriptModulePath = './hris_payrollprocess_cl';
                    context.response.writePage(Emp_List);
                } else {
                    context.response.write('<b>Data Not Found for the selected PAY GROUP</b>');
                }
            }
            if (context.request.method == 'POST') {
                var param = {};
                var checked_emps_name = [];
                //var empList = '';
                //For Array 1 -10
                var empList1 = [];
                var empList2 = [];
                var empList3 = [];
                var empList4 = [];
                var empList5 = [];
                var count = 0;
                var payGroup = context.request.parameters.custpage_paygroup;
                // log.debug('POST', 'payGroup***********==' + payGroup);

                var wageMonth = context.request.parameters.custpage_wageperiod;
                //log.debug('POST', 'wageMonth***********==' + wageMonth);

                var year = context.request.parameters.custpage_wageyr;
                //  log.debug('POST', 'Year***********==' + year);

                var payfreq = context.request.parameters.custpage_payfrq;

                var Subsidiaryid = context.request.parameters.custpage_subsidiary;

                var sublistCount = context.request.getLineCount({
                    group: 'custpage_apm_employee_sublist'
                });
                //log.debug('POST', 'sublistCount***********== ' + sublistCount);
                if (sublistCount > 0) {
                    for (var i = 0; i < sublistCount; i++) {
                        var checked_emps = context.request.getSublistValue({
                            group: 'custpage_apm_employee_sublist',
                            name: 'custscript_apm_check',
                            line: i
                        });

                        //log.debug('POST', 'checked_emps***********==' + checked_emps);
                        if (checked_emps == 'T') {
                            /* checked_emps_name = context.request.getSublistValue({
                                group: 'custpage_apm_employee_sublist',
                                name: 'custpage_em',
                                line: i
                            }); */
                            checked_emps_name = context.request.getSublistValue({
                                group: 'custpage_apm_employee_sublist',
                                name: 'custpage_empid',
                                line: i
                            });

                            //  empList += '#' + parseInt(checked_emps_name);
                            // empList.push(parseInt(checked_emps_name))
                         //   if (count < 500) {

                                empList1.push({
                                    empid: parseInt(checked_emps_name),
                                    paygroup: payGroup,
                                    wagemonth: wageMonth,
                                    linecount: count,
                                    yeartext: year,
                                    payfreq: payfreq,
                                    subsidiary: Subsidiaryid

                                })


                         //   }
                       /*     else if (count >= 500 && count < 1000) {
 

                                empList2.push({
                                    empid: parseInt(checked_emps_name),
                                    paygroup: payGroup,
                                    wagemonth: wageMonth,
                                    linecount: count,
                                    yeartext: year,
                                    payfreq: payfreq,
                                    subsidiary: Subsidiaryid


                                })
                            }
                            else if (count >= 1000 && count < 1500) {


                                empList3.push({
                                    empid: parseInt(checked_emps_name),
                                    paygroup: payGroup,
                                    wagemonth: wageMonth,
                                    linecount: count,
                                    yeartext: year,
                                    payfreq: payfreq,
                                    subsidiary: Subsidiaryid


                                })

                            }
                            else if (count >= 1500 && count < 2000) {


                                empList4.push({
                                    empid: parseInt(checked_emps_name),
                                    paygroup: payGroup,
                                    wagemonth: wageMonth,
                                    linecount: count,
                                    yeartext: year,
                                    payfreq: payfreq,
                                    subsidiary: Subsidiaryid


                                })

                            }
                            else if (count >= 2000 && count < 3000) {


                                empList5.push({
                                    empid: parseInt(checked_emps_name),
                                    paygroup: payGroup,
                                    wagemonth: wageMonth,
                                    linecount: count,
                                    yeartext: year,
                                    payfreq: payfreq,
                                    subsidiary: Subsidiaryid


                                })

                            }*/
                            count++;
                            //log.debug('POST', 'checked_emps_name***********==' + checked_emps_name);
                        }



                        var senderid = -5;

                    }

                    log.audit('POST', 'empList1***********==' + JSON.stringify(empList1));
                  //  log.audit('POST', 'empList2***********==' + JSON.stringify(empList2));
                  //  log.audit('POST', 'empList3***********==' + JSON.stringify(empList3));
                  //  log.audit('POST', 'empList4***********==' + JSON.stringify(empList4));
                 //   log.audit('POST', 'empList5***********==' + JSON.stringify(empList5));
                    var Sendemail = Email.send({
                        author: senderid,
                        recipients: 'florence@nijatech.com',
                        subject: 'Employee List',
                        body: JSON.stringify(empList1),
                        isInternalOnly: true
                    });

                    // Batch1
                    var mrTask1 = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_hris_payroll_process_mrs",
                       // deploymentId: "customdeploy_hris_payroll_process_mrs",
                        params: {


                            custscript_hrms_preempid: JSON.stringify(empList1),
                        }
                    });
                    var mrTaskId1 = mrTask1.submit();
                    log.debug("mrTaskId1", mrTaskId1);
                    // Batch2

                    var mrTask2 = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_hris_payroll_process_mrs",
                        //deploymentId: "customdeploy_hris_payroll_process2_mrs",
                        params: {



                            custscript_hrms_preempid: JSON.stringify(empList2),

                        }
                    });
          /*          var mrTask2Id = mrTask2.submit();
                    log.debug("mrTask2Id", mrTask2Id);

                    // Batch3
                    var mrTask3 = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_hris_payroll_process_mrs",
                        //deploymentId: "customdeploy_hris_payroll_process3_mrs",
                        params: {



                            custscript_hrms_preempid: JSON.stringify(empList3),

                        }
                    });
                    var mrTask3Id = mrTask3.submit();
                    log.debug("mrTask3Id", mrTask3Id);


                    //Batch 4
                    var mrTask4 = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_hris_payroll_process_mrs",
                        //deploymentId: "customdeploy_hris_payroll_process4_mrs",
                        params: {



                            custscript_hrms_preempid: JSON.stringify(empList4),

                        }
                    });
                    var mrTask4Id = mrTask4.submit();
                    log.debug("mrTask4Id", mrTask4Id);
                    // Batch 5

                    var mrTask5 = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_hris_payroll_process_mrs",
                        //deploymentId: "customdeploy_hris_payroll_process5_mrs",
                        params: {



                            custscript_hrms_preempid: JSON.stringify(empList5),

                        }
                    });
                    var mrTask5Id = mrTask5.submit();
                    log.debug("mrTask5Id", mrTask5Id);*/




                        
    /*                
                      // Batch1
                    var mrTask1 = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_hris_payroll_process_mrs",
                        deploymentId: "customdeploy_hris_payroll_process_mrs",
                        params: {


                            custscript_hrms_preempid: JSON.stringify(empList1),
                        }
                    });
                    var mrTaskId1 = mrTask1.submit();
                    log.debug("mrTaskId1", mrTaskId1);
                    
                    // Batch2
                    
                                        var mrTask2 = task.create({
                                            taskType: task.TaskType.MAP_REDUCE,
                                            scriptId: "customscript_hris_payrollbatch1_mrs",
                                            deploymentId: "customdeploy_hris_payrollbatch1_mrs",
                                            params: {
                                              
                                               
                    
                                                    custscript_hrms_preempidbatch1 : JSON.stringify(empList2),
                                        	
                                            }
                                        });
                                        var mrTask2Id = mrTask2.submit();
                                        log.debug("mrTask2Id", mrTask2Id);
                    
                    // Batch3
                                        var mrTask3 = task.create({
                                            taskType: task.TaskType.MAP_REDUCE,
                                            scriptId: "customscript_hris_payrollbatch2_mrs",
                                            deploymentId: "customdeploy_hris_payrollbatch2_mrs",
                                            params: {
                                              
                                               
                    
                                                    custscript_hrms_preempidbatch2 : JSON.stringify(empList3),
                                        	
                                            }
                                        });
                                        var mrTask3Id = mrTask3.submit();
                                        log.debug("mrTask5Id", mrTask3Id);
                    
                    
                                        //Batch 4
                                        var mrTask4 = task.create({
                                            taskType: task.TaskType.MAP_REDUCE,
                                            scriptId: "customscript_hris_payrollbatch3_mrs",
                                            deploymentId: "customdeploy_hris_payrollbatch3_mrs",
                                            params: {
                                              
                                               
                    
                                                    custscript_hrms_preempidbatch3 : JSON.stringify(empList4),
                                        	
                                            }
                                        });
                                        var mrTask4Id = mrTask4.submit();
                                        log.debug("mrTask4Id", mrTask4Id);
                                        // Batch 5
                    
                                        var mrTask5 = task.create({
                                            taskType: task.TaskType.MAP_REDUCE,
                                            scriptId: "customscript_hris_payrollbatch4_mrs",
                                            deploymentId: "customdeploy_hris_payrollbatch4_mrs",
                                            params: {
                                              
                                               
                    
                                                    custscript_hrms_preempidbatch4 : JSON.stringify(empList4),
                                        	
                                            }
                                        });
                                        var mrTask5Id = mrTask5.submit();
                                        log.debug("mrTask5Id", mrTask5Id);
                    
                  */

                    redirect.toSuitelet({
                        scriptId: 'customscript_hris_payrollprocess_sl',
                        deploymentId: 'customdeploy_hris_payrollprocess_sl'
                    });
                }
            }

        }



        function _logValidation(value) {
            return (value !== 'null' && value !== null && value !== '' && value !== undefined && value !== 'undefined' && !isNaN(value));
        }

        return {
            onRequest: onRequest
        };
    }
);
