/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *@NModuleScope Public
 */

var SEARCH, MOMENT, RECORD, QUERY;
define(['N/currentRecord', 'N/record', 'N/search', './moment.js', 'N/format', 'N/query'],
    function (currentRecord, record, search, moment, format, query) {
        SEARCH = search;
        MOMENT = moment;
        RECORD = record;
        QUERY = query;

        function pageInit(context) {
            debugger;
            try {

                var leaverecord = context.currentRecord;

                var flag = getUrlParameter('flag');
                log.debug('Flag Check', flag);
                if (flag == 1) {

                    var empid = getUrlParameter('empid');
                    var leaverecordid = getUrlParameter('leaverecordid')
                    leaverecord.setValue({
                        fieldId: 'custrecord_hrms_lveset_empname',
                        value: empid,
                        ignoreFieldChange: false,
                        forceSyncSourcing: true
                    });

                    leaverecord.setValue({
                        fieldId: 'custpage_leave_app_no',
                        value: leaverecordid,
                        ignoreFieldChange: false,
                        forceSyncSourcing: true
                    });

                    /*   leaverecord.setValue({
                          fieldId: 'custrecord_hrms_lveset_leaverefno',
                          value: leaverecordid,
                          ignoreFieldChange: true,
                          forceSyncSourcing: true
                      }); */

                    /*   var fromdate =  leaverecord.getValue('custrecord_hrms_lveset_fromdate')
                      var previousDate = moment(fromdate, "dd/mm/yyyy").subtract(1, 'days').format("dd/mm/yyyy");
                          if (previousDate) {
                              previousDate = format.format({
                                  value: previousDate,
                                  type: format.Type.DATE,
                                  timezone: format.Timezone.ASIA_MUSCAT
                              });
                              leaverecord.setValue({
                                 fieldId: 'custrecord_hrms_lveset_lastworkingdate',
                                 value: previousDate,
                                 ignoreFieldChange:true
                             });
                            
                          } */
                }


            } catch (e) {
                log.error('Error in pageInit', e);
            }
        }

        function fieldChanged(context) {
            try {
                debugger;
                var recordObj = context.currentRecord;






                if (context.fieldId == "custrecord_hrms_lveset_empname") {



                    var empID = recordObj.getValue('custrecord_hrms_lveset_empname');
                    if (empID) {



                        var paygroup = getpaygroup(empID);



                        if (paygroup != null && paygroup != "undefined" && paygroup != "") {
                            recordObj.setValue({
                                fieldId: 'custrecord_hrms_lveset_paygroup',
                                value: paygroup,
                                ignoreFieldChange: true
                            });
                            var componenttype = get_paycomponent(paygroup);
                            // Getting Wage Period
                            var get_wage_date = search_wageperiod(paygroup);
                            var w_Date = get_wage_date.toString().split("#");
                            var end_date = w_Date[0];
                            var start_date = w_Date[1];
                            var wage_month = w_Date[2];
                            var wage_year = w_Date[3];
                            if (componenttype != null && componenttype != "undefined" && componenttype != "") {
                                recordObj.setValue({
                                    fieldId: 'custrecord_hrms_lveset_paycomponent',
                                    value: componenttype,
                                    ignoreFieldChange: true
                                });
                            }
                            var paygroup = recordObj.getValue('custrecord_hrms_lveset_paygroup');


                            var componentsql = "select * from customrecord_hris_payroll_component where \
                      custrecord_hris__sequence_no_ in(7,61) and custrecord_hris_pay_process_group ="+ paygroup;
                            log.debug('componentsql', componentsql);
                            var componentsqlrecords = getResult(componentsql);
                            var sublistcount = recordObj.getLineCount({
                                sublistId: 'recmachcustrecord_hrms_addded_settlelink'
                            });
                            log.debug("sublistcount", sublistcount);
                            if (sublistcount > 0) {
                                for (var h = sublistcount - 1; h >= 0; h--) {
                                    recordObj.removeLine({
                                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                        line: h
                                    });
                                }
                            }
                            if (componentsqlrecords.length > 0) {
                                for (var k = 0; k < componentsqlrecords.length; k++) {
                                    var paycomponent = componentsqlrecords[k].id;
                                    var componenttype = componentsqlrecords[k].custrecord_hris_payroll_component_type;
                                    var seqno = componentsqlrecords[k].custrecord_hris__sequence_no_;

                                    recordObj.selectNewLine({
                                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',

                                    });
                                    recordObj.setCurrentSublistValue({
                                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                        fieldId: 'custrecord_hrms_addded_processgrp',
                                        value: paygroup,
                                        line: k,
                                        ignoreFieldChange: true,
                                    });
                                    recordObj.setCurrentSublistValue({
                                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                        fieldId: 'custrecord_hrms_addded_paycomponent',
                                        value: paycomponent,
                                        line: k,
                                        ignoreFieldChange: true,
                                    });
                                    recordObj.setCurrentSublistValue({
                                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                        fieldId: 'custrecord_hrms_addded_componenttype',
                                        value: componenttype,
                                        line: k,
                                        ignoreFieldChange: true,
                                    });
                                    recordObj.setCurrentSublistValue({
                                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                        fieldId: 'custrecord_hrms_addded_payseqno',
                                        value: seqno,
                                        line: k,
                                        ignoreFieldChange: true,
                                    });

                                    recordObj.commitLine({
                                        sublistId: 'recmachcustrecord_hrms_addded_settlelink'
                                    });
                                }
                            }
                        }

                        if (get_wage_date != null && get_wage_date != "undefined" && get_wage_date != "") {
                            end_date = format.parse({
                                value: end_date,
                                type: format.Type.DATE
                            });
                            recordObj.setValue({
                                fieldId: 'custrecord_hrms_lveset_paydt',
                                value: end_date,
                                ignoreFieldChange: true
                            });
                            recordObj.setValue({
                                fieldId: 'custrecord_hrms_lveset_month',
                                value: wage_month,
                                ignoreFieldChange: true
                            });
                            recordObj.setValue({
                                fieldId: 'custrecord_hrms_lveset_year',
                                value: wage_year,
                                ignoreFieldChange: true
                            });

                          /*   var leaveapplsql = "select * from customrecord_hris_leaveapplication where custrecord_hris_lve_employeename = '" + empID + "' and custrecord_hris_lve_leavetype=2 and\
                            custrecord_hris_lve_hrmsapprovalstatus =2 and custrecord_hris_lve_cancellation='F' and\
                             custrecord_hris_lve_leavesettlement = 'T' and custrecord_hris_lve_settlerefno  is null"
                          */ 
                             var leaveapplsql ="select a.id as id , a.name as name from customrecord_hris_leaveapplication a\
                                     join customrecord_hris_leaveconfig b on a.custrecord_hris_lve_leavetype = b.id \
                                   where a.custrecord_hris_lve_employeename = '" + empID + "'\
                                    and b.custrecord_hris_lvecnfg_seqno =3 and\
                                     a.custrecord_hris_lve_hrmsapprovalstatus =2 and a.custrecord_hris_lve_cancellation='F' and a.custrecord_hris_lve_leavesettlement = 'T' and a.custrecord_hris_lve_settlement_refno is null"
                       // Fist remove select Option from the field
                            var leaveapplsqlrecords = getResult(leaveapplsql);
                            log.debug('leaveappsql', leaveapplsql);
                            // log.debug('records in getEmpTotalLeaveTaken', JSON.stringify(records));
                            var empLeaveAppField = recordObj.getField({
                                fieldId: 'custpage_leave_app_no'
                            });
                            // log.debug('empLeaveAppField', empLeaveAppField);
                            empLeaveAppField.removeSelectOption({
                                value: null
                            });
                            if (leaveapplsqlrecords.length > 0) {
                                for (var i = 0; i < leaveapplsqlrecords.length; i++) {
                                    var leaveAppNoValue = leaveapplsqlrecords[i].id;
                                    var leaveAppNoText = leaveapplsqlrecords[i].name;
                                    empLeaveAppField.insertSelectOption({
                                        value: leaveAppNoValue,
                                        text: leaveAppNoText
                                    });
                                }
                                if (leaveapplsqlrecords.length == 1) {
                                    recordObj.setValue({
                                        fieldId: 'custrecord_hrms_lveset_leaverefno',
                                        value: leaveAppNoValue,
                                        ignoreFieldChange: false
                                    });
                                }
                            }
                            else if (leaveapplsqlrecords.length == 0) {
                                recordObj.setValue({
                                    fieldId: 'custrecord_hrms_lveset_leaverefno',
                                    value: '',
                                    ignoreFieldChange: false
                                });
                            }


                        }




                    }

                }
                if (context.fieldId == 'custrecord_hrms_lveset_paygroup') {

                    /* var paygroup = recordObj.getValue('custrecord_hrms_lveset_paygroup');

                  
                    var componentsql = "select * from customrecord_hris_payroll_component where \
                      custrecord_hris__sequence_no_ in(7,61) and custrecord_hris_pay_process_group ="+ paygroup;
                    log.debug('componentsql', componentsql);
                    var componentsqlrecords = getResult(componentsql);

                    if (componentsqlrecords.length > 0) {
                        for (var k = 0; k < componentsqlrecords.length; k++) {
                            var paycomponent = componentsqlrecords[k].id;
                            var componenttype = componentsqlrecords[k].custrecord_hris_payroll_component_type;
                            var seqno =componentsqlrecords[k].custrecord_hris__sequence_no_;

                            recordObj.selectNewLine({
                                sublistId: 'recmachcustrecord_hrms_addded_settlelink',

                            });
                            recordObj.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                fieldId: 'custrecord_hrms_addded_processgrp',
                                value: paygroup,
                                line: k,
                                ignoreFieldChange: true,
                            });
                            recordObj.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                fieldId: 'custrecord_hrms_addded_paycomponent',
                                value: paycomponent,
                                line: k,
                                ignoreFieldChange: true,
                            });
                            recordObj.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                fieldId: 'custrecord_hrms_addded_componenttype',
                                value: componenttype,
                                line: k,
                                ignoreFieldChange: true,
                            });
                            recordObj.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                fieldId: 'custrecord_hrms_addded_payseqno',
                                value: seqno,
                                line: k,
                                ignoreFieldChange: true,
                            });

                            recordObj.commitLine({
                                sublistId: 'recmachcustrecord_hrms_addded_settlelink'
                            });
                        }
                    } */

                }
                if (context.sublistId == 'recmachcustrecord_hrms_loandet_settlelink' && context.fieldId == 'custrecord_hrms_loandet_amount') {
                    var outstandingamt = recordObj.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                        fieldId: 'custrecord_hrms_loandet_outstandingamt'
                    }) || 0;
                    var amounttobepaid = recordObj.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                        fieldId: 'custrecord_hrms_loandet_amount'
                    }) || 0;
                    if (amounttobepaid > outstandingamt) {
                        alert("Amount To be Paid is Exceed the Outstanding Amount");
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                            fieldId: 'custrecord_hrms_loandet_amount',
                            value: outstandingamt.toFixed(2),
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                    }

                }
                if (context.fieldId == 'custrecord_hrms_lveset_paidthropayroll') {
                    var paidpayroll = recordObj.getValue('custrecord_hrms_lveset_paidthropayroll');
                    log.debug('paidpayroll', paidpayroll);
                    if (paidpayroll == true) {
                        recordObj.setValue({
                            fieldId: 'custrecord_hrms_lveset_salaryadvancedays',
                            value: 0,
                            ignoreFieldChange: true
                        });
                        recordObj.setValue({
                            fieldId: 'custrecord_hrms_lveset_salaryadvance',
                            value: 0,
                            ignoreFieldChange: true
                        });
                    }

                }
                /*   if (context.fieldId = 'custrecord_hrms_lveset_salarycalc') {
  
                      debugger;
                      var salarycheck = recordObj.getValue('custrecord_hrms_lveset_salarycalc');
                      var settlementid = recordObj.getValue('id') || '';
                      if (salarycheck == true) {
                          var emp = recordObj.getValue('custrecord_hrms_lveset_empname');
                          var fromdate = recordObj.getValue('custrecord_hrms_lveset_fromdate');
                          var rejoindate = recordObj.getValue('custrecord_hrms_lveset_rejoindate') || '';
                          var hiredate = recordObj.getValue('custrecord_hrms_lveset_dateofjoin');
                          var employeecatagory = recordObj.getValue('custrecord_hrms_lveset_empcatagory');
                          var paygroup = recordObj.getValue('custrecord_hrms_lveset_paygroup');
                          var AdvanceSalDays = recordObj.getValue('custrecord_hrms_lveset_salaryadvancedays');
                          var advancesalaryamount = 0;
  
                          var get_wage_date = search_wageperiod(paygroup);
                          var w_Date = get_wage_date.toString().split("#");
                          var end_date = w_Date[0];
                          var start_date = w_Date[1];
                          var wage_month = w_Date[2];
                          var wage_year = w_Date[3];
                          var CalDays = w_Date[4];
                          var GetSalary = EmpSalaryDetails(emp, paygroup);
                          log.debug("GetSalary", JSON.stringify(GetSalary));
  
                          var FetchSalaryDetails = CollectSalaryDetails(AdvanceSalDays, CalDays, GetSalary);
                          log.debug("FetchSalaryDetails", JSON.stringify(FetchSalaryDetails));
                          var sublistcount = recordObj.getLineCount({
                              sublistId: 'recmachcustrecord_hrms_saladv_settlelink'
                          });
                          log.debug('sublistcount', sublistcount);
  
  
                          if (FetchSalaryDetails != null && FetchSalaryDetails.length > 0) {
                              if (sublistcount > 0) {
                                  for (var h = sublistcount - 1; h >= 0; h--) {
                                      recordObj.removeLine({
                                          sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                                          line: h
                                      });
                                  }
                                  if (settlementid != '') {
                                      var advancesalarysql = "select * from customrecord_hrms_salaryadvancedetails where custrecord_hrms_saladv_settlelink =" + settlementid;
                                      log.debug('advancesalarysql ', advancesalarysql);
  
  
                                      var queryResults = query.runSuiteQL({
                                          query: advancesalarysql
                                      });
  
                                      var advancesalarysqlrecords = queryResults.asMappedResults();
                                      if (advancesalarysqlrecords.length > 0) {
                                          for (var k = 0; k < advancesalarysqlrecords.length; k++) {
                                              var advanceid = advancesalarysqlrecords[k].id;
                                              log.debug('advanceid', advanceid);
                                              record.delete({
                                                  type: 'customrecord_hrms_salaryadvancedetails',
                                                  id: advanceid
                                              });
                                          }
                                      }
                                  }
                              }
  
                              // for refresh the sublist
  
                              for (var j = 0; j < FetchSalaryDetails.length; j++) {
                                  var paygroup = FetchSalaryDetails[j].paygroup;
                                  var Code = FetchSalaryDetails[j].code || '';
                                  var Amount = FetchSalaryDetails[j].amount || 0;
                                  var Name = FetchSalaryDetails[j].name || '';
                                  var componenttype = FetchSalaryDetails[j].componenttype;
                                  var seqno = FetchSalaryDetails[j].seqno;
                                  var salaryamount = FetchSalaryDetails[j].salaryamount;
  
  
  
  
                                  recordObj.selectNewLine({
                                      sublistId: 'recmachcustrecord_hrms_saladv_settlelink'
                                  });
                                  recordObj.setCurrentSublistValue({
                                      sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                                      fieldId: 'custrecord_hrms_saladv_paygroup',
                                      value: paygroup,
                                      ignoreFieldChange: true,
                                      forceSyncSourcing: true
                                  });
                                  recordObj.setCurrentSublistValue({
                                      sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                                      fieldId: 'custrecord_hrms_saladv_payrollcomponent',
                                      value: Code,
                                      ignoreFieldChange: true,
                                      forceSyncSourcing: true
                                  });
                                  recordObj.setCurrentSublistValue({
                                      sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                                      fieldId: 'custrecord_hrms_saladv_monthlyamount',
                                      value: Amount,
                                      ignoreFieldChange: true,
                                      forceSyncSourcing: true
                                  });
                                  recordObj.setCurrentSublistValue({
                                      sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                                      fieldId: 'custrecord_hrms_saladv_salaryamount',
                                      value: salaryamount,
                                      ignoreFieldChange: true,
                                      forceSyncSourcing: true
                                  });
                                  recordObj.setCurrentSublistValue({
                                      sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                                      fieldId: 'custrecord_hrms_saladv_componenttype',
                                      value: componenttype,
                                      ignoreFieldChange: true,
                                      forceSyncSourcing: true
                                  });
                                  recordObj.setCurrentSublistValue({
                                      sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                                      fieldId: 'custrecord_hrms_saladv_sequenceno',
                                      value: seqno,
                                      ignoreFieldChange: true,
                                      forceSyncSourcing: true
                                  });
                                  advancesalaryamount = parseFloat(advancesalaryamount) + parseFloat(salaryamount);
                                  recordObj.commitLine({
                                      sublistId: 'recmachcustrecord_hrms_saladv_settlelink'
                                  });
                              }
                          }
                          advancesalaryamount = advancesalaryamount.toFixed(2);
                          recordObj.setValue({
                              fieldId: 'custrecord_hrms_lveset_salaryadvance',
                              value: advancesalaryamount,
                              ignoreFieldChange: true
                          });
  
                      }
                  } */
                if (context.fieldId == "custpage_leave_app_no") {
                    // Get Leave Application number
                    var LeaveAppNo = recordObj.getValue('custpage_leave_app_no');
                    log.debug('LeaveAppNo', LeaveAppNo);
                    // Set Value
                    recordObj.setValue({
                        fieldId: 'custrecord_hrms_lveset_leaverefno',
                        value: LeaveAppNo,
                        ignoreFieldChange: false
                    });

                }
                /*  if(context.fieldId=='custrecord_hrms_lveset_fromdate'){
                     var fromdatenew = recordObj.getValue('custrecord_hrms_lveset_fromdate');
                     var parsedDate = format.parse({
                         value: fromdatenew,
                         type: format.Type.DATE
                     });
                     //var previousDate = moment(fromdate, "dd/mm/yyyy").subtract(1, 'days').format("dd/mm/yyyy");
                     var previousDate = parsedDate.setDate(parsedDate.getDate() - 1);
     
                     // Format the previous date to the NetSuite date format
                     previousDate = format.parse({
                         value: parsedDate,
                         type: format.Type.DATE
                     });
                   
                     recordObj.setValue({
                         fieldId: 'custrecord_hrms_lveset_lastworkingdate',
                         value: previousDate,
                         ignoreFieldChange: true
                     });
 
                 }
  */
            } catch (e) {
                log.error("Error in fieldChanged", e);
            }
        }
        function lineInit(context) {
            try {
                debugger;

                var recordObj = context.currentRecord;

                if (context.sublistId == 'recmachcustrecord_hrms_addded_settlelink' && context.fieldId == 'custrecord_hrms_addded_processgrp') {
                    var paygroup = recordObj.getValue('custrecord_hrms_lveset_paygroup');
                    recordObj.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                        fieldId: 'custrecord_hrms_addded_processgrp',
                        value: paygroup,
                        ignoreFieldChange: false,
                    });
                }

            }
            catch (e) {
                log.debug("error in lineinit : " + e);

            }
        }


        function saveRecord(context) {
            try {
                debugger;

                var recordObj = context.currentRecord;

                /* 
                                var sublistcount = recordObj.getLineCount({
                                    sublistId: 'recmachcustrecord_hrms_addded_settlelink'
                                });
                                log.debug("sublistcount", sublistcount);
                
                
                                var otheraddition = 0;
                                var otherdeduction = 0;
                                var settleamount = 0;
                                for (var i = 0; i < sublistcount; i++) {
                
                                    recordObj.selectLine({
                                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                        line: i
                                    });
                
                                    var amount = recordObj.getSublistValue({
                                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                        fieldId: 'custrecord_hrms_addded_amount',
                                        line: i,
                
                                    }) || 0;
                                    var componenttype = recordObj.getSublistValue({
                                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                                        fieldId: 'custrecord_hrms_addded_componenttype',
                                        line: i,
                
                                    });
                                    if (componenttype == 1) {
                                        otheraddition = parseFloat(otheraddition) + parseFloat(amount);
                                    }
                                    else if (componenttype == 2) {
                                        otherdeduction = parseFloat(otherdeduction) + parseFloat(amount);
                                    }
                                    recordObj.commitLine({
                                        sublistId: 'recmachcustrecord_hrms_addded_settlelink'
                                    });
                                }
                                otheraddition = otheraddition.toFixed(2);
                                otherdeduction = otherdeduction.toFixed(2);
                                recordObj.setValue({
                                    fieldId: 'custrecord_hrms_lveset_additionamount',
                                    value: otheraddition,
                                    ignoreFieldChange: true
                
                                });
                                recordObj.setValue({
                                    fieldId: 'custrecord_hrms_lveset_deductionamount',
                                    value: otherdeduction,
                                    ignoreFieldChange: true
                
                                });
                 */
                var totalloanamount = 0;
                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hrms_loandet_settlelink'
                });
                log.debug("sublistcount", sublistcount);


                for (var i = 0; i < sublistcount; i++) {

                    recordObj.selectLine({
                        sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                        line: i
                    });

                    var amount = recordObj.getSublistValue({
                        sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                        fieldId: 'custrecord_hrms_loandet_amount',
                        line: i,

                    }) || 0;
                    totalloanamount = parseFloat(totalloanamount) + parseFloat(amount);
                    recordObj.commitLine({
                        sublistId: 'recmachcustrecord_hrms_loandet_settlelink'
                    });
                }
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_loan_amount',
                    value: totalloanamount.toFixed(2),
                    ignoreFieldChange: true

                });


                var leavesalaryamt = recordObj.getValue('custrecord_hrms_lveset_lvesalaryamount') || 0;
                var salaryadvanceamt = recordObj.getValue('custrecord_hrms_lveset_salaryadvance') || 0;
                var hraamount = recordObj.getValue('custrecord_hrms_lveset_hraamount') || 0;
                var airticketamount = recordObj.getValue('custrecord_hrms_lveset_airticketamount') || 0;
                var loanamount = recordObj.getValue('custrecord_hrms_lveset_loan_amount') || 0;
                var otheradditionamt = recordObj.getValue('custrecord_hrms_lveset_additionamount') || 0;
                var otherdeductionamt = recordObj.getValue('custrecord_hrms_lveset_deductionamount') || 0;
                settleamount = (parseFloat(leavesalaryamt) + parseFloat(salaryadvanceamt) + parseFloat(hraamount) + parseFloat(airticketamount) + parseFloat(otheradditionamt)) - (parseFloat(loanamount) + parseFloat(otherdeductionamt));
                settleamount = settleamount.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_settleamount',
                    value: settleamount,
                    ignoreFieldChange: true

                });
                return true;
            }
            catch (e) {
                log.debug("error in saveRecord : " + e);

            }
        }
        function getUrlParameter(param) {
            //   debugger;
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] == param) {
                    return decodeURIComponent(pair[1]);
                }
            }
            return (false);
        }








        function leavesalary() {

            debugger;
            try {
                var recordObj = currentRecord.get();
                var AdvanceSalDays = 0;
                var NetPay = 0;
                var Basic = 0;
                var EmpLeaveSalBase = 0;
                var NoOfYears = 0;
                var airticketyears = 0;
                var DayBasic = 0;
                var DayLeaveSal = 0;
                var SalAdvanceAmt = 0;
                var LeaveSalAmt = 0;
                var airticketamount = 0;
                var airamount = 0;
                var salaryadvanceamt = 0;
                var HRAAmt = 0;
                var settleamount = 0;
                var actualsettleamount = 0;

                var emp = recordObj.getValue('custrecord_hrms_lveset_empname');
                var fromdatenew = recordObj.getValue('custrecord_hrms_lveset_fromdate');
                var rejoindate = recordObj.getValue('custrecord_hrms_lveset_rejoindate') || '';
                var hiredate = recordObj.getValue('custrecord_hrms_lveset_dateofjoin');
                var employeecatagoryid = recordObj.getValue('custrecord_hrms_lveset_empcatagory');
                var paygroup = recordObj.getValue('custrecord_hrms_lveset_paygroup');
                var NoOfDays = recordObj.getValue('custrecord_hrms_lveset_totleavedays');
                var previousDate = recordObj.getValue('custrecord_hrms_lveset_lastworkingdate');
                var settlementid = recordObj.getValue('id') || '';
                var NoOfWorkingdays = 0;
                var NoOfWorkingyears = 0;
                var yearleavecal = 0;
                var monthleavecal = 0;
                var yearairticketcal = 0;
                var monthairticketcal = 0;


                var fromdate = previousDate;


                // Payroll Enddate
                var get_wage_date = search_wageperiod(paygroup);
                var w_Date = get_wage_date.toString().split("#");
                var end_date = w_Date[0];
                var start_date = w_Date[1];
                var wage_month = w_Date[2];
                var wage_year = w_Date[3];
                var CalDays = w_Date[4];
                // CalDays=30;
                start_date = format.parse({
                    value: start_date,
                    type: format.Type.DATE
                });
                //--Salary Advance Days
                AdvanceSalDays = CountDays_BetweenTwodatesWorking(start_date, fromdate);

                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_salaryadvancedays',
                    value: AdvanceSalDays,
                    ignoreFieldChange: true
                });
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_actsaladvancedays',
                    value: AdvanceSalDays,
                    ignoreFieldChange: true
                });


                //AdvanceSalDays = calculateDateDifference(start_date, fromdate);

                //--Net pay
                NetPay = getnetpay(emp);

                //--DayBasic
                Basic = daybasic(emp);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_basicsalary',
                    value: Basic,
                    ignoreFieldChange: true
                });

                //--EmpLeaveSalBased on component total
                EmpLeaveSalBase = getempleavesalbase(emp);

                //--No of working years
                if (rejoindate != '') {
                    NoOfYears = CountDays_BetweenTwodates(rejoindate, fromdate);

                }
                else if (rejoindate == '') {
                    NoOfYears = CountDays_BetweenTwodates(hiredate, fromdate);

                }
                NoOfWorkingyears = CountDays_BetweenTwodates(hiredate, fromdatenew);
                NoOfWorkingdays = CountDays_BetweenTwodatesWorkingdays(hiredate, fromdatenew);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_noofyears',
                    value: NoOfWorkingyears,
                    ignoreFieldChange: true
                });
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_noofdays',
                    value: NoOfWorkingdays,
                    ignoreFieldChange: true
                });

                //Airticket years
                airticketyears = CountDays_BetweenTwodates(hiredate, fromdate);

                //    --Calender Days for payroll month


                //--Day Basic 
                DayBasic = Basic / CalDays;
                var DayBasicnew = Basic / 30;
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_rateperday',
                    value: DayBasicnew.toFixed(2),
                    ignoreFieldChange: true
                });


                //--Day LeaveSalary
                DayLeaveSal = EmpLeaveSalBase / CalDays;

                //--Days between payroll date to leave start date for advance salary calculation
                SalAdvanceAmt = (NetPay / CalDays) * AdvanceSalDays;
                SalAdvanceAmt = SalAdvanceAmt.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_salaryadvance',
                    value: SalAdvanceAmt,
                    ignoreFieldChange: true
                });
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_actsaladvanceamt',
                    value: SalAdvanceAmt,
                    ignoreFieldChange: true
                });
            var employeecatagory = getemployeecatagorysequence(employeecatagoryid);
                if (employeecatagory == 1 || employeecatagory == 3) {
                    if (NoOfYears) {
                        var durationWorkedArray = NoOfYears.split(".");
                        var yearsWorked = durationWorkedArray[0];
                        var monthsWorked = durationWorkedArray[1];
                        monthsWorked = "." + monthsWorked;
                    }
                    // In  SAP LeaveSalAmt = ROUND(TO_INT(:NoOfYears)* :EmpLeaveSalBase + (:NoOfYears - TO_INT(:NoOfYears))*:EmpLeaveSalBase/11*12); 

                    //LeaveSalAmt = (yearsWorked * EmpLeaveSalBase) + ((NoOfYears - monthsWorked) * EmpLeaveSalBase / 11 * 12);
                    yearleavecal = EmpLeaveSalBase * 335 / (365 * 11 / 12);
                    monthleavecal = (monthsWorked * 365) * EmpLeaveSalBase / (365 * 11 / 12);
                    //LeaveSalAmt = (yearsWorked * EmpLeaveSalBase) + ((NoOfYears - yearsWorked) * EmpLeaveSalBase / 11 * 12);
                    LeaveSalAmt = (yearsWorked * yearleavecal) + monthleavecal;
                }
                else {
                    // In SAP LeaveSalAmt = ROUND(:EmpLeaveSalBase * :NoOfYears); 

                    LeaveSalAmt = EmpLeaveSalBase * NoOfYears;
                }
                LeaveSalAmt = LeaveSalAmt.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_lvesalaryamount',
                    value: LeaveSalAmt,
                    ignoreFieldChange: true
                });

                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_actlvesalaryamt',
                    value: LeaveSalAmt,
                    ignoreFieldChange: true
                });
                // Loan Advance Amount
                var salaryadvanceamt = advancesalary(emp);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_loan_amount',
                    value: salaryadvanceamt,
                    ignoreFieldChange: true
                });
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_actloanamount',
                    value: salaryadvanceamt,
                    ignoreFieldChange: true
                });

                // airticketamount = getairticketamount(paygroup, NoOfYears);
                /*   var fomatrejoindate =  moment(rejoindate, "dd/mm/yyyy");
                  console.log('Formatrejoindate',fomatrejoindate);
   */
                debugger;
                if (employeecatagory == 1 || employeecatagory == 3) {
                    airticketamount = getairticketamount(paygroup, NoOfYears);
                    if (NoOfYears) {
                        var durationWorkedArray = NoOfYears.split(".");
                        var yearsWorked = durationWorkedArray[0];
                        var monthsWorked = durationWorkedArray[1];
                        monthsWorked = "." + monthsWorked;
                    }
                    // In  SAP LeaveSalAmt = ROUND(TO_INT(:NoOfYears)* :EmpLeaveSalBase + (:NoOfYears - TO_INT(:NoOfYears))*:EmpLeaveSalBase/11*12); 

                    //airamount = (yearsWorked * airticketamount) + ((NoOfYears - monthsWorked) * airticketamount / 11 * 12);

                    /*  var yearleavecal = EmpLeaveSalBase*335/(365*11/12);
                     var monthleavecal = (monthsWorked*365)*EmpLeaveSalBase/(365*11/12);
                     LeaveSalAmt = (yearsWorked * yearleavecal) + monthleavecal; */
                    yearairticketcal = airticketamount * 335 / (365 * 11 / 12);
                    monthairticketcal = (monthsWorked * 365) * airticketamount / (365 * 11 / 12);
                    airamount = (yearsWorked * yearairticketcal) + monthairticketcal;
                }
                else {
                    /*  var formatrejoindate=null;
                    if(rejoindate){
                     var formatrejoindate = format.format({
                         value: rejoindate,
                         type: format.Type.DATE
                     });
                    } */
                    airticketamount = getairticketamountLabour(paygroup, NoOfYears, rejoindate, airticketyears)
                    airamount = airticketamount;
                }
                airamount = airamount.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_airticketamount',
                    value: airamount,
                    ignoreFieldChange: true
                });
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_actairticketamt',
                    value: airamount,
                    ignoreFieldChange: true
                });


                //      ---------------HRA Calculation
                var HRA = gerhra(emp);
                // Vanitha mam told HRA Comment 
                /*   if (NoOfDays >= 30) {
                      HRAAmt = HRA;
                  }
                  else {
                      HRAAmt = (HRA / 30) * NoOfDays;
                  } */
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_hraamount',
                    value: HRAAmt,
                    ignoreFieldChange: true
                });
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_acthraamount',
                    value: HRAAmt,
                    ignoreFieldChange: true
                });

                /*   var sublistcount = recordObj.getLineCount({
                      sublistId: 'recmachcustrecord_hrms_addded_settlelink'
                  });
                  log.debug("sublistcount", sublistcount);
  
  
                  var otheraddition = 0;
                  var otherdeduction = 0;
                  for (var i = 0; i < sublistcount; i++) {
  
                      recordObj.selectLine({
                          sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                          line: i
                      });
  
                      var amount = recordObj.getSublistValue({
                          sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                          fieldId: 'custrecord_hrms_addded_amount',
                          line: i,
  
                      }) || 0;
                      var componenttype = recordObj.getSublistValue({
                          sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                          fieldId: 'custrecord_hrms_addded_componenttype',
                          line: i,
  
                      });
                      if (componenttype == 1) {
                          otheraddition = parseFloat(otheraddition) + parseFloat(amount);
                      }
                      else if (componenttype == 2) {
                          otherdeduction = parseFloat(otherdeduction) + parseFloat(amount);
                      }
                      recordObj.commitLine({
                          sublistId: 'recmachcustrecord_hrms_addded_settlelink'
                      });
                  }
                  otheraddition = otheraddition.toFixed(2);
                  otherdeduction = otherdeduction.toFixed(2);
                  recordObj.setValue({
                      fieldId: 'custrecord_hrms_lveset_additionamount',
                      value: otheraddition,
                      ignoreFieldChange: true
  
                  });
                  recordObj.setValue({
                      fieldId: 'custrecord_hrms_lveset_deductionamount',
                      value: otherdeduction,
                      ignoreFieldChange: true
  
                  });
   */
                var GetSalary = EmpSalaryDetails(emp, paygroup);
                log.debug("GetSalary", JSON.stringify(GetSalary));

                var FetchSalaryDetails = CollectSalaryDetails(AdvanceSalDays, CalDays, GetSalary);
                log.debug("FetchSalaryDetails", JSON.stringify(FetchSalaryDetails));
                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hrms_saladv_settlelink'
                });
                log.debug('sublistcount', sublistcount);
                // for refresh the sublist

                debugger;
                if (FetchSalaryDetails != null && FetchSalaryDetails.length > 0) {
                    if (sublistcount > 0) {
                        for (var h = sublistcount - 1; h >= 0; h--) {
                            recordObj.removeLine({
                                sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                                line: h
                            });
                        }
                        if (settlementid != '') {
                            var advancesalarysql = "select * from customrecord_hrms_salaryadvancedetails where custrecord_hrms_saladv_settlelink =" + settlementid;
                            log.debug('advancesalarysql ', advancesalarysql);


                            var queryResults = query.runSuiteQL({
                                query: advancesalarysql
                            });

                            var advancesalarysqlrecords = queryResults.asMappedResults();
                            if (advancesalarysqlrecords.length > 0) {
                                for (var k = 0; k < advancesalarysqlrecords.length; k++) {
                                    var advanceid = advancesalarysqlrecords[k].id;
                                    log.debug('advanceid', advanceid);
                                    record.delete({
                                        type: 'customrecord_hrms_salaryadvancedetails',
                                        id: advanceid
                                    });
                                }
                            }
                        }
                    }

                    for (var j = 0; j < FetchSalaryDetails.length; j++) {
                        var paygroup = FetchSalaryDetails[j].paygroup;
                        var Code = FetchSalaryDetails[j].code || '';
                        var Amount = FetchSalaryDetails[j].amount || 0;
                        var Name = FetchSalaryDetails[j].name || '';
                        var componenttype = FetchSalaryDetails[j].componenttype;
                        var seqno = FetchSalaryDetails[j].seqno;
                        var salaryamount = FetchSalaryDetails[j].salaryamount;



                        recordObj.selectNewLine({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink'
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_paygroup',
                            value: paygroup,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_payrollcomponent',
                            value: Code,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_monthlyamount',
                            value: Amount,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_salaryamount',
                            value: salaryamount,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_componenttype',
                            value: componenttype,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_sequenceno',
                            value: seqno,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });


                        recordObj.commitLine({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink'
                        });
                    }
                }
                var LoanDetails = getloandetails(emp);
                log.debug("LoanDetails", JSON.stringify(LoanDetails));
                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hrms_loandet_settlelink'
                });
                log.debug('sublistcount', sublistcount);
                if (sublistcount > 0) {
                    for (var h = sublistcount - 1; h >= 0; h--) {
                        recordObj.removeLine({
                            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                            line: h
                        });
                    }
                }
                var totalloanamount = 0;
                if (LoanDetails != null && LoanDetails.length > 0) {


                    for (var j = 0; j < LoanDetails.length; j++) {
                        var loanid = LoanDetails[j].loanid;
                        var loantype = LoanDetails[j].loantype;
                        var loanamt = LoanDetails[j].loanamt || 0;
                        var paidamt = LoanDetails[j].paidamt || 0;
                        var outstandingamt = LoanDetails[j].outstandingamt || 0;




                        recordObj.selectNewLine({
                            sublistId: 'recmachcustrecord_hrms_loandet_settlelink'
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                            fieldId: 'custrecord_hrms_loandet_loanno',
                            value: loanid,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                            fieldId: 'custrecord_hrms_loandet_loantype',
                            value: loantype,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                            fieldId: 'custrecord_hrms_loandet_loanamount',
                            value: loanamt.toFixed(2),
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                            fieldId: 'custrecord_hrms_loandet_paidamount',
                            value: paidamt.toFixed(2),
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                            fieldId: 'custrecord_hrms_loandet_outstandingamt',
                            value: outstandingamt.toFixed(2),
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                            fieldId: 'custrecord_hrms_loandet_amount',
                            value: outstandingamt.toFixed(2),
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });

                        totalloanamount = parseFloat(totalloanamount) + parseFloat(outstandingamt);
                        recordObj.commitLine({
                            sublistId: 'recmachcustrecord_hrms_loandet_settlelink'
                        });
                    }

                }
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_loan_amount',
                    value: totalloanamount.toFixed(2),
                    ignoreFieldChange: true

                });
                var leavesalaryamt = recordObj.getValue('custrecord_hrms_lveset_lvesalaryamount') || 0;
                var salaryadvanceamt = recordObj.getValue('custrecord_hrms_lveset_salaryadvance') || 0;
                var hraamount = recordObj.getValue('custrecord_hrms_lveset_hraamount') || 0;
                var airticketamount = recordObj.getValue('custrecord_hrms_lveset_airticketamount') || 0;
                var loanamount = recordObj.getValue('custrecord_hrms_lveset_loan_amount') || 0;

                // Getting Actual Amount
                var actualleavesalaryamt = recordObj.getValue('custrecord_hrms_lveset_actlvesalaryamt') || 0;
                var actualsalaryadvanceamt = recordObj.getValue('custrecord_hrms_lveset_actsaladvanceamt') || 0;
                var actualhraamount = recordObj.getValue('custrecord_hrms_lveset_acthraamount') || 0;
                var actualairticketamount = recordObj.getValue('custrecord_hrms_lveset_actairticketamt') || 0;
                var actualloanamount = recordObj.getValue('custrecord_hrms_lveset_actloanamount') || 0;


                var otheradditionamt = recordObj.getValue('custrecord_hrms_lveset_additionamount') || 0;
                var otherdeductionamt = recordObj.getValue('custrecord_hrms_lveset_deductionamount') || 0;
                settleamount = (parseFloat(leavesalaryamt) + parseFloat(salaryadvanceamt) + parseFloat(hraamount) + parseFloat(airticketamount) + parseFloat(otheradditionamt)) - (parseFloat(loanamount) + parseFloat(otherdeductionamt));
                settleamount = settleamount.toFixed(2);
                actualsettleamount = (parseFloat(actualleavesalaryamt) + parseFloat(actualsalaryadvanceamt) + parseFloat(actualhraamount) + parseFloat(actualairticketamount) + parseFloat(otheradditionamt)) - (parseFloat(actualloanamount) + parseFloat(otherdeductionamt));
                actualsettleamount = actualsettleamount.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_settleamount',
                    value: settleamount,
                    ignoreFieldChange: true

                });
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_actsettleamount',
                    value: actualsettleamount,
                    ignoreFieldChange: true

                });
                var salaryamount = parseFloat(salaryadvanceamt) + parseFloat(otheradditionamt);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_salaryadvanceamt',
                    value: salaryamount,
                    ignoreFieldChange: true

                });

            }
            catch (e) {
                log.error("Error in leavesalary", e);
                // log.debug("Error in getEmpTotalLeaveTaken : " + e);
            }

        }
        function recalculate() {

            debugger;
            try {
                var recordObj = currentRecord.get();

                var settlementid = recordObj.getValue('id') || '';

                var emp = recordObj.getValue('custrecord_hrms_lveset_empname');
                var fromdate = recordObj.getValue('custrecord_hrms_lveset_fromdate');
                var rejoindate = recordObj.getValue('custrecord_hrms_lveset_rejoindate') || '';
                var hiredate = recordObj.getValue('custrecord_hrms_lveset_dateofjoin');
                var employeecatagory = recordObj.getValue('custrecord_hrms_lveset_empcatagory');
                var paygroup = recordObj.getValue('custrecord_hrms_lveset_paygroup');
                var AdvanceSalDays = recordObj.getValue('custrecord_hrms_lveset_salaryadvancedays');
                var advancesalaryamount = 0;
                var otamount = recordObj.getValue('custrecord_hrms_lveset_otamount') || 0;
                var settleamount = 0;
                var actualsettleamount = 0;
                var get_wage_date = search_wageperiod(paygroup);
                var w_Date = get_wage_date.toString().split("#");
                var end_date = w_Date[0];
                var start_date = w_Date[1];
                var wage_month = w_Date[2];
                var wage_year = w_Date[3];
                var CalDays = w_Date[4];

                // CalDays=30;

              // As per Vanitha mam told comment that validation 30/01/2024  
               /*  var GetSalary = EmpSalaryDetails(emp, paygroup);
                log.debug("GetSalary", JSON.stringify(GetSalary));

                var FetchSalaryDetails = CollectSalaryDetails(AdvanceSalDays, CalDays, GetSalary);
                log.debug("FetchSalaryDetails", JSON.stringify(FetchSalaryDetails));
                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hrms_saladv_settlelink'
                });
                log.debug('sublistcount', sublistcount);


                if (FetchSalaryDetails != null && FetchSalaryDetails.length > 0) {
                    if (sublistcount > 0) {
                        for (var h = sublistcount - 1; h >= 0; h--) {
                            recordObj.removeLine({
                                sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                                line: h
                            });
                        }
                        if (settlementid != '') {
                            var advancesalarysql = "select * from customrecord_hrms_salaryadvancedetails where custrecord_hrms_saladv_settlelink =" + settlementid;
                            log.debug('advancesalarysql ', advancesalarysql);


                            var queryResults = query.runSuiteQL({
                                query: advancesalarysql
                            });

                            var advancesalarysqlrecords = queryResults.asMappedResults();
                            if (advancesalarysqlrecords.length > 0) {
                                for (var k = 0; k < advancesalarysqlrecords.length; k++) {
                                    var advanceid = advancesalarysqlrecords[k].id;
                                    log.debug('advanceid', advanceid);
                                    record.delete({
                                        type: 'customrecord_hrms_salaryadvancedetails',
                                        id: advanceid
                                    });
                                }
                            }
                        }
                    }

                    // for refresh the sublist

                    for (var j = 0; j < FetchSalaryDetails.length; j++) {
                        var paygroup = FetchSalaryDetails[j].paygroup;
                        var Code = FetchSalaryDetails[j].code || '';
                        var Amount = FetchSalaryDetails[j].amount || 0;
                        var Name = FetchSalaryDetails[j].name || '';
                        var componenttype = FetchSalaryDetails[j].componenttype;
                        var seqno = FetchSalaryDetails[j].seqno;
                        var salaryamount = FetchSalaryDetails[j].salaryamount;




                        recordObj.selectNewLine({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink'
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_paygroup',
                            value: paygroup,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_payrollcomponent',
                            value: Code,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_monthlyamount',
                            value: Amount,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_salaryamount',
                            value: salaryamount,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_componenttype',
                            value: componenttype,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink',
                            fieldId: 'custrecord_hrms_saladv_sequenceno',
                            value: seqno,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        advancesalaryamount = parseFloat(advancesalaryamount) + parseFloat(salaryamount);
                        recordObj.commitLine({
                            sublistId: 'recmachcustrecord_hrms_saladv_settlelink'
                        });
                    }
                }
                advancesalaryamount = parseFloat(advancesalaryamount) + parseFloat(otamount);
                advancesalaryamount = advancesalaryamount.toFixed(2);

                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_salaryadvance',
                    value: advancesalaryamount,
                    ignoreFieldChange: true
                });

                // }

                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hrms_addded_settlelink'
                });
                log.debug("sublistcount", sublistcount);


                var otheraddition = 0;
                var otherdeduction = 0;
                for (var i = 0; i < sublistcount; i++) {

                    recordObj.selectLine({
                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                        line: i
                    });

                    var amount = recordObj.getSublistValue({
                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                        fieldId: 'custrecord_hrms_addded_amount',
                        line: i,

                    }) || 0;
                    var componenttype = recordObj.getSublistValue({
                        sublistId: 'recmachcustrecord_hrms_addded_settlelink',
                        fieldId: 'custrecord_hrms_addded_componenttype',
                        line: i,

                    });
                    if (componenttype == 1) {
                        otheraddition = parseFloat(otheraddition) + parseFloat(amount);
                    }
                    else if (componenttype == 2) {
                        otherdeduction = parseFloat(otherdeduction) + parseFloat(amount);
                    }
                    recordObj.commitLine({
                        sublistId: 'recmachcustrecord_hrms_addded_settlelink'
                    });
                }
                otheraddition = otheraddition.toFixed(2);
                otherdeduction = otherdeduction.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_additionamount',
                    value: otheraddition,
                    ignoreFieldChange: true

                });
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_deductionamount',
                    value: otherdeduction,
                    ignoreFieldChange: true

                });
 */                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hrms_loandet_settlelink'
                });
                log.debug("sublistcount", sublistcount);


                var totalloanamount = 0;

                for (var i = 0; i < sublistcount; i++) {

                    recordObj.selectLine({
                        sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                        line: i
                    });

                    var amount = recordObj.getSublistValue({
                        sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
                        fieldId: 'custrecord_hrms_loandet_amount',
                        line: i,

                    }) || 0;
                    totalloanamount = parseFloat(totalloanamount) + parseFloat(amount);
                    recordObj.commitLine({
                        sublistId: 'recmachcustrecord_hrms_loandet_settlelink'
                    });
                }
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_loan_amount',
                    value: totalloanamount.toFixed(2),
                    ignoreFieldChange: true

                });

                var leavesalaryamt = recordObj.getValue('custrecord_hrms_lveset_lvesalaryamount') || 0;
                var salaryadvanceamt = recordObj.getValue('custrecord_hrms_lveset_salaryadvance') || 0;
                var hraamount = recordObj.getValue('custrecord_hrms_lveset_hraamount') || 0;
                var airticketamount = recordObj.getValue('custrecord_hrms_lveset_airticketamount') || 0;
                var loanamount = recordObj.getValue('custrecord_hrms_lveset_loan_amount') || 0;
                var otheradditionamt = recordObj.getValue('custrecord_hrms_lveset_additionamount') || 0;
                var otherdeductionamt = recordObj.getValue('custrecord_hrms_lveset_deductionamount') || 0;
                //actual
                var actualleavesalaryamt = recordObj.getValue('custrecord_hrms_lveset_actlvesalaryamt') || 0;
                var actualsalaryadvanceamt = recordObj.getValue('custrecord_hrms_lveset_actsaladvanceamt') || 0;
                var actualhraamount = recordObj.getValue('custrecord_hrms_lveset_acthraamount') || 0;
                var actualairticketamount = recordObj.getValue('custrecord_hrms_lveset_actairticketamt') || 0;
                var actualloanamount = recordObj.getValue('custrecord_hrms_lveset_actloanamount') || 0;

                settleamount = (parseFloat(leavesalaryamt) + parseFloat(salaryadvanceamt) + parseFloat(hraamount) + parseFloat(airticketamount) + parseFloat(otheradditionamt)) - (parseFloat(loanamount) + parseFloat(otherdeductionamt));
                settleamount = settleamount.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_settleamount',
                    value: settleamount,
                    ignoreFieldChange: true

                });

                var salaryamount = parseFloat(salaryadvanceamt) + parseFloat(otheradditionamt);
                recordObj.setValue({
                    fieldId: 'custrecord_hrms_lveset_salaryadvanceamt',
                    value: salaryamount,
                    ignoreFieldChange: true

                });

                actualsettleamount = (parseFloat(actualleavesalaryamt) + parseFloat(actualsalaryadvanceamt) + parseFloat(actualhraamount) + parseFloat(actualairticketamount) + parseFloat(otheradditionamt)) - (parseFloat(actualloanamount) + parseFloat(otherdeductionamt));
                actualsettleamount = actualsettleamount.toFixed(2);

                recordObj.setValue({
                    fieldId: 'custrecord_hrms_actlveset_settleamount',
                    value: actualsettleamount,
                    ignoreFieldChange: true

                });
            }
            catch (e) {
                log.error("Error in recalculate", e);
                // log.debug("Error in getEmpTotalLeaveTaken : " + e);
            }

        }
        function jvcreation() {
            debugger;

            try {


                var jvarray = [];
                var currentrecord = currentRecord.get()
                var leaveSettlemenID = currentrecord.id;
                var newRecordObj = record.load({
                    type: 'customrecord_hrms_leavesettlement',
                    id: leaveSettlemenID,
                    isDynamic: true,
                });

                var approvalStatus = newRecordObj.getValue('custrecord_hrms_lveset_approvalstatus');

                log.debug("approvalStatus", approvalStatus);
                var leaveAppNo = newRecordObj.getValue('custrecord_hrms_lveset_leaverefno') || '';
                log.debug("leaveAppNo", leaveAppNo);
                var jeno = newRecordObj.getValue('custrecord_hrms_lveset_jevoucherno') || '';
                log.debug('jeno', jeno);

                var empid = newRecordObj.getValue('custrecord_hrms_lveset_empname');
                var empname = newRecordObj.getValue('custrecord_hrms_lveset_emplegalname');
                var paygroup = newRecordObj.getValue('custrecord_hrms_lveset_paygroup');
                var paymonth = newRecordObj.getValue('custrecord_hrms_lveset_month');
                var paymonthname = newRecordObj.getText('custrecord_hrms_lveset_month');
                var yearname = newRecordObj.getText('custrecord_hrms_lveset_year');
                var year = newRecordObj.getValue('custrecord_hrms_lveset_year');
                var paycomponent = newRecordObj.getValue('custrecord_hrms_lveset_paycomponent');
                var subsidiaries = newRecordObj.getValue('custrecord_hrms_lveset_subsidiary');
                var leavesalaryamt = newRecordObj.getValue('custrecord_hrms_lveset_lvesalaryamount') || 0;

                //  var salaryadvanceamt = newRecordObj.getValue('custrecord_hrms_lveset_salaryadvance') || 0
                var salaryadvanceamt = newRecordObj.getValue('custrecord_hrms_lveset_salaryadvanceamt') || 0
                var hraamount = newRecordObj.getValue('custrecord_hrms_lveset_hraamount') || 0;
                var airticketamount = newRecordObj.getValue('custrecord_hrms_lveset_airticketamount') || 0;
                var loanamount = newRecordObj.getValue('custrecord_hrms_lveset_loan_amount') || 0;
                var otheradditionamt = newRecordObj.getValue('custrecord_hrms_lveset_additionamount') || 0;
                var otherdeductionamt = newRecordObj.getValue('custrecord_hrms_lveset_deductionamount') || 0;
                var paydate = newRecordObj.getValue('custrecord_hrms_lveset_paydt');
                var docdate = newRecordObj.getValue('custrecord_hrms_lveset_docdate');
                jvarray.push({
                    'leavesettleid': leaveSettlemenID,
                    'empid': empid,
                    'empname': empname,
                    'paygroup': paygroup,
                    'paymonth': paymonth,
                    'year': year,
                    'paycomponent': paycomponent,
                    'subsidiary': subsidiaries,
                    'paymonthname': paymonthname,
                    'yearname': yearname,
                    'paydate': paydate,
                    'leavesalaryamt': leavesalaryamt,
                    'salaryadvanceamt': salaryadvanceamt,
                    'hraamount': hraamount,
                    'airticketamount': airticketamount,
                    'loanamount': loanamount,
                    'otheradditionamt': otheradditionamt,
                    'otherdeductionamt': otherdeductionamt,
                    'docdate': docdate

                });
                log.debug('JV Array', jvarray);

                var paycomponent = jvarray[0].paycomponent;
                log.debug('Paycomponent', paycomponent);
                var subsidiariesRes = jvarray[0].subsidiary;

                // According to vanitha mam 
                // var today = jvarray[0].paydate;
                var today = jvarray[0].docdate;

                var year = jvarray[0].yearname;
                var paygroupParameter = jvarray[0].paygroup;

                //  var monthParameter = jvarray[0].paymonth;
                var monthParameter = getMonthFromDate(today);
                var month = getMonth(monthParameter);
                var yearParameter = getYearFromDate(today);
                // var yearParameter = jvarray[0].year;
                var emp = jvarray[0].empid;
                var empTxt = jvarray[0].empname;

                var leavesalaryamt = jvarray[0].leavesalaryamt;
                var salaryadvanceamt = jvarray[0].salaryadvanceamt;
                var hraamount = jvarray[0].hraamount;
                var airticketamount = jvarray[0].airticketamount;
                var loanamount = jvarray[0].loanamount;
                var otheradditionamt = jvarray[0].otheradditionamt;
                var otherdeductionamt = jvarray[0].otherdeductionamt;
                var settleamount = 0;

                //   settleamount=(parseFloat(leavesalaryamt)+parseFloat(salaryadvanceamt)+parseFloat(hraamount)+parseFloat(airticketamount)+parseFloat(otheradditionamt))-(parseFloat(loanamount)+parseFloat(otherdeductionamt))
                settleamount = (parseFloat(leavesalaryamt) + parseFloat(salaryadvanceamt) + parseFloat(airticketamount)) - (parseFloat(loanamount));
                /*   var componentsql = " select * from  customrecord_hris_payroll_component where id  =" + paycomponent;
  
                  log.debug('componentsql  ', componentsql);
  
  
                  var queryResults = query.runSuiteQL({
                      query: componentsql
                  });
  
                  var componentsqlrecords = queryResults.asMappedResults();
                  if (componentsqlrecords.length > 0) {
                      var sett_comp_accountCodeID = componentsqlrecords[0].custrecord_hris_account_name || '';
                      log.debug('Account id', sett_comp_accountCodeID);
                  }
   */


                var jvObject = record.create({
                    type: 'journalentry',
                    isDynamic: true
                });
                var debit = 0;
                jvObject.setValue('customform', 101);

                jvObject.setValue('approvalstatus', 2);
                jvObject.setValue('subsidiary', subsidiariesRes);
                jvObject.setValue('trandate', today);
                jvObject.setText('postingperiod', month + " " + year);
                //by florence
                //jvObject.setValue('custbody_auto_num_business_area', 12);
                jvObject.setValue('memo', 'Leave Settlement for ' + month + ' ' + year);
                //jvObject.setValue('custbody_dept_jv', departmentParam);
                jvObject.setValue('custbody_hris_paygroup_jv', paygroupParameter);
                jvObject.setValue('custbody_hris_jv_month', monthParameter);
                // jvObject.setValue('custbody_hris_jv_year', yearParameter);
                yearParameter = getyearid(yearParameter)
                jvObject.setValue('custbody_hris_jv_year', yearParameter);
                jvObject.setValue('custbody_hris_jv_employeename', emp);
                jvObject.setValue('custbody_hris_jv_emplegalname', empTxt);


                if (salaryadvanceamt > 0) {
                    Deduct = parseFloat(salaryadvanceamt)
                    // var get_paycomponent = getleavesalarycomponent(paygroup);
                    var get_paycomponent = getadvancesalarycomponent(paygroup);
                    var getpaycomponent = get_paycomponent.toString().split("#");

                    var comp_accountCodeID = getpaycomponent[0];
                    var paycompname = getpaycomponent[2];
                    jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account', comp_accountCodeID); //Credit Account code//Component_Code
                    jvObject.setCurrentSublistValue('line', 'debit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'credit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                    jvObject.setCurrentSublistValue('line', 'entity', emp);
                    jvObject.setCurrentSublistValue('line', 'entity_display', empTxt);
                    jvObject.commitLine('line')

                }
                if (leavesalaryamt > 0) {
                    Deduct = parseFloat(leavesalaryamt)
                    //var get_paycomponent = getadvancesalarycomponent(paygroup);
                    var get_paycomponent = getleavesalarycomponent(paygroup);
                    var getpaycomponent = get_paycomponent.toString().split("#");
                    var comp_accountCodeID = getpaycomponent[0];
                    var paycompname = getpaycomponent[2];
                    jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account', comp_accountCodeID); //Credit Account code//Component_Code
                    jvObject.setCurrentSublistValue('line', 'debit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'credit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                    jvObject.setCurrentSublistValue('line', 'entity', emp);
                    jvObject.setCurrentSublistValue('line', 'entity_display', empTxt);
                    jvObject.commitLine('line')
                }
                if (airticketamount > 0) {
                    Deduct = parseFloat(airticketamount)
                    var get_paycomponent = getairticketcomponent(paygroup);
                    var getpaycomponent = get_paycomponent.toString().split("#");
                    var comp_accountCodeID = getpaycomponent[0];
                    var paycompname = getpaycomponent[2];
                    jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account', comp_accountCodeID); //Credit Account code//Component_Code
                    jvObject.setCurrentSublistValue('line', 'debit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'credit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                    jvObject.setCurrentSublistValue('line', 'entity', emp);
                    jvObject.setCurrentSublistValue('line', 'entity_display', empTxt);
                    jvObject.commitLine('line')


                }
                if (loanamount > 0) {
                    Deduct = parseFloat(loanamount)
                    var get_paycomponent = getloancomponent(paygroup);
                    var getpaycomponent = get_paycomponent.toString().split("#");
                    var comp_accountCodeID = getpaycomponent[0];
                    var paycompname = getpaycomponent[2];
                    jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account', comp_accountCodeID); //Credit Account code//Component_Code
                    jvObject.setCurrentSublistValue('line', 'debit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'credit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                    jvObject.setCurrentSublistValue('line', 'entity', emp);
                    jvObject.setCurrentSublistValue('line', 'entity_display', empTxt);
                    jvObject.commitLine('line')


                }
                //   jvObject.setCurrentSublistValue('line', 'class', 12);



                var get_paycomponent = getleavesettlementcomponent(paygroup);
                var getpaycomponent = get_paycomponent.toString().split("#");
                var sett_comp_accountCodeID = getpaycomponent[0];
                var paycompname = getpaycomponent[2];
                log.debug('Account id', sett_comp_accountCodeID);
                Deduct = settleamount;
                jvObject.selectNewLine('line');
                jvObject.setCurrentSublistValue('line', 'account', sett_comp_accountCodeID); //Credit Account code//Component_Code
                jvObject.setCurrentSublistValue('line', 'debit', 0.0);
                jvObject.setCurrentSublistValue('line', 'credit', Deduct.toFixed(2));
                jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                jvObject.setCurrentSublistValue('line', 'entity', emp);
                jvObject.setCurrentSublistValue('line', 'entity_display', empTxt);
                //   jvObject.setCurrentSublistValue('line', 'class', 12);
                jvObject.commitLine('line')
                var jvrecordId = jvObject.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                log.debug("jvrecordid", jvrecordId);

                var leavesettleID = record.submitFields({
                    type: 'customrecord_hrms_leavesettlement',
                    id: leaveSettlemenID,
                    values: {
                        'custrecord_hrms_lveset_jevoucherno': jvrecordId
                    }
                });

                log.debug("Info", "Leave settlement voucher Updated. Internal ID : " + leavesettleID);

                var url = '/app/common/custom/custrecordentry.nl?rectype=1100&id=' + leavesettleID


                window.location.href = url;
            }
            catch (e) {
                log.error("Error in JV Creation", e);
                // log.debug("Error in getEmpTotalLeaveTaken : " + e);
            }

        }
        function getMonthFromDate(date) {
            if (!date) {
                throw new Error("Date is required");
            }

            // Convert the date to a JavaScript Date object if necessary
            const jsDate = new Date(date);

            // Get the month (0-indexed, so add 1)
            const month = jsDate.getMonth() + 1;

            return month;
        }
        function getYearFromDate(date) {
            if (!date) {
                throw new Error("Date is required");
            }

            // Convert the date to a JavaScript Date object if necessary
            const jsDate = new Date(date);

            // Get the year
            const year = jsDate.getFullYear();

            return year;
        }
        function getleavesettlementcomponent(paygroup) {
            var comp_accountCodeID = ''
            var componentsql = " select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid  from  customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 48 \
            and isinactive ='F'and custrecord_hris_pay_process_group  =" + paygroup;

            log.debug('componentsql  ', componentsql);


            var queryResults = query.runSuiteQL({
                query: componentsql
            });

            var componentsqlrecords = queryResults.asMappedResults();
            if (componentsqlrecords.length > 0) {
                var paycompid = componentsqlrecords[0].paycompid;
                var paycompname = componentsqlrecords[0].paycompname;
                comp_accountCodeID = componentsqlrecords[0].accountid;
                log.debug('Account id', comp_accountCodeID);
            }

            return comp_accountCodeID + "#" + paycompid + "#" + paycompname;
        }
        function getleavesalarycomponent(paygroup) {
            var comp_accountCodeID = ''
            var componentsql = " select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component\
             where custrecord_hris__sequence_no_ = 51 and isinactive ='F' and custrecord_hris_pay_process_group  =" + paygroup;

            log.debug('componentsql  ', componentsql);


            var queryResults = query.runSuiteQL({
                query: componentsql
            });

            var componentsqlrecords = queryResults.asMappedResults();
            if (componentsqlrecords.length > 0) {
                var paycompid = componentsqlrecords[0].paycompid;
                var paycompname = componentsqlrecords[0].paycompname;
                comp_accountCodeID = componentsqlrecords[0].accountid;
                log.debug('Account id', comp_accountCodeID);
            }

            return comp_accountCodeID + "#" + paycompid + "#" + paycompname;
        }
        function getloancomponent(paygroup) {
            var comp_accountCodeID = ''
            var componentsql = " select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 62\
            and isinactive ='F' and custrecord_hris_pay_process_group  =" + paygroup;

            log.debug('componentsql  ', componentsql);


            var queryResults = query.runSuiteQL({
                query: componentsql
            });

            var componentsqlrecords = queryResults.asMappedResults();
            if (componentsqlrecords.length > 0) {
                var paycompid = componentsqlrecords[0].paycompid;
                var paycompname = componentsqlrecords[0].paycompname;
                comp_accountCodeID = componentsqlrecords[0].accountid;
                log.debug('Account id', comp_accountCodeID);
            }

            return comp_accountCodeID + "#" + paycompid + "#" + paycompname;
        }
        function getyearid(yearname) {

            var yearsql = " select * from  customlist_hris_year_master where  isinactive ='F' and name=" + yearname;

            log.debug('yearsql  ', yearsql);


            var queryResults = query.runSuiteQL({
                query: yearsql
            });

            var yearsqlrecords = queryResults.asMappedResults();
            if (yearsqlrecords.length > 0) {
                var yearid = yearsqlrecords[0].id;

            }

            return yearid;
        }
        function getadvancesalarycomponent(paygroup) {
            var comp_accountCodeID = ''
            var componentsql = " select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component\
             where custrecord_hris__sequence_no_ = 52 and isinactive ='F' and custrecord_hris_pay_process_group  =" + paygroup;

            log.debug('componentsql  ', componentsql);


            var queryResults = query.runSuiteQL({
                query: componentsql
            });

            var componentsqlrecords = queryResults.asMappedResults();
            if (componentsqlrecords.length > 0) {
                var paycompid = componentsqlrecords[0].paycompid;
                var paycompname = componentsqlrecords[0].paycompname;
                comp_accountCodeID = componentsqlrecords[0].accountid;
                log.debug('Account id', comp_accountCodeID);
            }

            return comp_accountCodeID + "#" + paycompid + "#" + paycompname;
        }
        function getairticketcomponent(paygroup) {
            var comp_accountCodeID = ''
            var componentsql = " select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component\
             where custrecord_hris__sequence_no_ = 36 and isinactive ='F' and custrecord_hris_pay_process_group  =" + paygroup;

            log.debug('componentsql  ', componentsql);


            var queryResults = query.runSuiteQL({
                query: componentsql
            });

            var componentsqlrecords = queryResults.asMappedResults();
            if (componentsqlrecords.length > 0) {
                var paycompid = componentsqlrecords[0].paycompid;
                var paycompname = componentsqlrecords[0].paycompname;
                comp_accountCodeID = componentsqlrecords[0].accountid;
                log.debug('Account id', comp_accountCodeID);
            }

            return comp_accountCodeID + "#" + paycompid + "#" + paycompname;
        }
        function getMonth(monthParameter) {
            if (monthParameter == 1) {
                return 'Jan'
            }
            else if (monthParameter == 2) {
                return 'Feb'
            }
            else if (monthParameter == 3) {
                return 'Mar'
            }
            else if (monthParameter == 4) {
                return 'Apr'
            }
            else if (monthParameter == 5) {
                return 'May'
            }
            else if (monthParameter == 6) {
                return 'Jun'
            }
            else if (monthParameter == 7) {
                return 'Jul'
            }
            else if (monthParameter == 8) {
                return 'Aug'
            }
            else if (monthParameter == 9) {
                return 'Sep'
            }
            else if (monthParameter == 10) {
                return 'Oct'
            }
            else if (monthParameter == 11) {
                return 'Nov'
            }
            else if (monthParameter == 12) {
                return 'Dec'
            }
        }//End function getMon

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            // lineInit:lineInit,
            saveRecord: saveRecord,
            leavesalary: leavesalary,
            jvcreation: jvcreation,
            recalculate: recalculate
            // validateField: validateField
        }
    });

function calculateDateDifference(startDate, endDate) {
    // Parse dates if they are in string format
    var parsedStartDate = format.parse({
        value: startDate,
        type: format.Type.DATE
    });
    /*  var parsedEndDate = format.parse({
          value: endDate,
          type: format.Type.DATE
      }); */
    // var parsedStartDate = startDate
    var parsedEndDate = endDate

    // Calculate the difference in milliseconds
    var differenceInMilliseconds = parsedEndDate - parsedStartDate;

    // Convert milliseconds to days
    var differenceInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);

    return differenceInDays;
}











function formatDate(date) {
    date = new Date(date);

    var day = ('0' + date.getDate()).slice(-2);
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var year = date.getFullYear();

    return day + "/" + month + "/" + year;
}

function EmpSalaryDetails(emp, paygroup) {
    debugger;
    try {
        var DataArray = []


        var employeesalarysql = "select b.custrecord_hris_cde_payroll_component as paycomponent, BUILTIN.DF(b.custrecord_hris_cde_payroll_component) as paycomponentname ,\
                                      b.custrecord_hris_cde_monthly as amount,c.custrecord_hris_payroll_component_type as componenttype  from customrecord_hris_employee_compen_change a join \
                                      customrecord_hris_compensation_details_e b on a.id = b.custrecord_hris_employee_data_change\
                                       join customrecord_hris_payroll_component c on b.custrecord_hris_cde_payroll_component = c.id\
                                       where a.custrecord_hris_empchange_employee_nam ='"+ emp + "' and a.custrecord_hris_empchange_emp_pay_pro_gp =" + paygroup + " and b.custrecord_hris_cde_monthly > 0";

        log.debug('employeesalarysql', employeesalarysql);
        var employeesalarysqlrecords = getResult(employeesalarysql);

        if (employeesalarysqlrecords.length > 0) {

            for (var j = 0; j < employeesalarysqlrecords.length; j++) {

                var Code = employeesalarysqlrecords[j].paycomponent;
                var Name = employeesalarysqlrecords[j].paycomponentname;
                var Amount = employeesalarysqlrecords[j].amount;
                var PayType = employeesalarysqlrecords[j].componenttype



                DataArray.push({
                    'code': Code,
                    'name': Name,
                    'amount': Amount,
                    'type': PayType
                });
            }
        }



        return DataArray;
    } catch (e) {
        log.error("Error in EmpSalaryDetails", e);
        log.debug("Error in EmpSalaryDetails : " + JSON.stringify(e));
    }
}


function advancesalary(emp, fromdate) {
    var salaryadvanceamt = 0;

    var employeesalarysql = "SELECT COALESCE(SUM(custrecord_hris_loan_outstanding_amount), 0) as advanceamt\
                        FROM  customrecord_hris_empchange_loan_applicn WHERE \
    custrecord_hris_loan_outstanding_amount > 0 and custrecord_hris_loan_emp_name =" + emp;
    log.debug('employeesalarysql', employeesalarysql);
    var employeesalarysqlrecords = getResult(employeesalarysql);

    if (employeesalarysqlrecords.length > 0) {

        salaryadvanceamt = employeesalarysqlrecords[0].advanceamt
    }

    return salaryadvanceamt
}
function getloandetails(emp) {
    var loanarray = [];

    var employeesalarysql = "SELECT * FROM  customrecord_hris_empchange_loan_applicn WHERE \
custrecord_hris_loan_outstanding_amount > 0 and custrecord_hris_loan_emp_name =" + emp;
    log.debug('employeesalarysql', employeesalarysql);
    var employeesalarysqlrecords = getResult(employeesalarysql);

    if (employeesalarysqlrecords.length > 0) {
        for (var l = 0; l < employeesalarysqlrecords.length; l++) {
            var loanrecord = employeesalarysqlrecords[l];
            var loanid = loanrecord.id;
            var loantype = loanrecord.custrecord_hris_loan_loan_type;
            var loanamt = loanrecord.custrecord_hris_loan_amount || 0;
            var paidamt = loanrecord.custrecord_hris_loan_paid_amount || 0;
            var outstandingamt = loanrecord.custrecord_hris_loan_outstanding_amount || 0;
            loanarray.push({
                'loanid': loanid,
                'loantype': loantype,
                'loanamt': loanamt,
                'paidamt': paidamt,
                'outstandingamt': outstandingamt
            });
        }



    }
    log.debug('Loan Array', loanarray);
    if (loanarray.length > 0) {
        return loanarray;
    } else {
        return null;
    }


}

function getairticketamount(paygroup, workingyears) {
    var airticketamount = 0;
    var airticketsql = "select * from customrecord_hris_ticket_master where (custrecord_hris_tkt_fromyear >= " + workingyears + " or custrecord_hris_tkt_toyear > = " + workingyears + ")\
     and (custrecord_hris_tkt_fromyear<= "+ workingyears + " or custrecord_hris_tkt_toyear < = " + workingyears + ") and custrecord_hris_status=1 and custrecord_hris_employee_type =" + paygroup
    log.debug('airticketsql', airticketsql);
    var airticketsqlrecords = getResult(airticketsql);

    if (airticketsqlrecords.length > 0) {
        airticketamount = airticketsqlrecords[0].custrecord_hris_actual_amount;
    }
    return airticketamount
}


function getairticketamountLabour(paygroup, workingyears, rejoindate, airticketyears) {
    var airticketamount = 0;

    debugger;
    console.log('Formatrejoindate', rejoindate);

    /*  var airticketsql = "Select Case When NVL('"+rejoindate+"','')='' Then SUM(AIRTCKTWOR) else SUM(AIRTCKTWR) end as AIRTCKT\
     from (Select *,CASE WHEN "+workingyears+" >=custrecord_hris_tkt_toyear THEN custrecord_hris_tkt_toyear*custrecord_hris_actual_amount\
     WHEN "+workingyears+"<custrecord_hris_tkt_fromyear THEN 0 ELSE ("+workingyears+"-custrecord_hris_tkt_fromyear)*custrecord_hris_actual_amount END as AIRTCKTWOR,\
     CASE WHEN "+workingyears+">=custrecord_hris_tkt_toyear THEN 0 \
     WHEN "+workingyears+" < custrecord_hris_tkt_fromyear THEN 0 ELSE "+workingyears+"*custrecord_hris_actual_amount END as AIRTCKTWR,\
     custrecord_hris_actual_amount from customrecord_hris_ticket_master  where custrecord_hris_status =1 and custrecord_hris_employee_type ="+paygroup+")";
      */

    /*  var airticketsql = "Select Case When NVL('" + rejoindate + "','')='' Then SUM(AIRTCKTWOR) else SUM(AIRTCKTWR) end as AIRTCKT\
     from (Select *,CASE WHEN "+ airticketyears + " >=custrecord_hris_tkt_toyear THEN custrecord_hris_tkt_toyear*custrecord_hris_actual_amount\
     WHEN "+ airticketyears + "<custrecord_hris_tkt_fromyear THEN 0 ELSE (" + workingyears + "-custrecord_hris_tkt_fromyear)*custrecord_hris_actual_amount END as AIRTCKTWOR,\
     CASE WHEN "+ airticketyears + ">=custrecord_hris_tkt_toyear THEN 0 \
     WHEN "+ airticketyears + " < custrecord_hris_tkt_fromyear THEN 0 ELSE " + workingyears + "*custrecord_hris_actual_amount END as AIRTCKTWR,\
     custrecord_hris_actual_amount from customrecord_hris_ticket_master  where custrecord_hris_status =1 and custrecord_hris_employee_type ="+ paygroup + ")";
  */
    var airticketsql = "Select  SUM(AIRTCKTWOR) as withoutrejoinamt , SUM(AIRTCKTWR) as withrejoinamt  \
	from (Select CASE WHEN "+ airticketyears + " >=custrecord_hris_tkt_toyear THEN custrecord_hris_tkt_toyear*custrecord_hris_actual_amount\
	WHEN "+ airticketyears + "<custrecord_hris_tkt_fromyear THEN 0 ELSE (" + workingyears + "-custrecord_hris_tkt_fromyear)*custrecord_hris_actual_amount END as AIRTCKTWOR,\
	CASE WHEN "+ airticketyears + ">=custrecord_hris_tkt_toyear THEN 0 \
	WHEN "+ airticketyears + " < custrecord_hris_tkt_fromyear THEN 0 ELSE " + workingyears + "*custrecord_hris_actual_amount END as AIRTCKTWR,\
	custrecord_hris_actual_amount from customrecord_hris_ticket_master  where custrecord_hris_status =1 and custrecord_hris_employee_type ="+ paygroup + ")";

    log.debug('airticketsql', airticketsql);
    console.log('airticketsql', airticketsql)
    var airticketsqlrecords = getResult(airticketsql);

    if (airticketsqlrecords.length > 0) {
        if (rejoindate == '') {
            airticketamount = airticketsqlrecords[0].withoutrejoinamt;
        }
        else {
            airticketamount = airticketsqlrecords[0].withrejoinamt;
        }

    }
    return airticketamount
}






function getnetpay(empid) {
    var netpay = 0;
    try {
        var empcompensql = "Select * from customrecord_hris_employee_compen_change  where custrecord_hris_empchange_employee_nam= " + empid + "  and isinactive ='F'";
        log.debug('empcompensql', empcompensql);
        // log.debug(empLeaveTakenSQL);
        var empcompensqlrecords = getResult(empcompensql);
        // log.debug('records in getEmpTotalLeaveTaken', JSON.stringify(records));
        if (empcompensqlrecords.length > 0) {
            netpay = empcompensqlrecords[0].custrecord_hris_empchange_month_cross_sy;

        }
        return netpay;

    }
    catch (e) {
        log.error("Error in getnetpay", e);
        // log.debug("Error in getEmpTotalLeaveTaken : " + e);
    }
}
function daybasic(empid) {
    var basic = 0;
    try {

        var empcompensql = "select COALESCE(sum(b.custrecord_hris_cde_monthly),0) as basic from  customrecord_hris_employee_compen_change a \
                  join customrecord_hris_compensation_details_e b on a.id = b.custrecord_hris_employee_data_change\
                    join customrecord_hris_payroll_component c on b.custrecord_hris_cde_payroll_component = c.id \
                    where a.custrecord_hris_empchange_employee_nam= "+ empid + "  and a.isinactive ='F' and c.custrecord_hris__sequence_no_ =1 "
        log.debug('empcompensql', empcompensql);
        // log.debug(empLeaveTakenSQL);
        var empcompensqlrecords = getResult(empcompensql);
        // log.debug('records in getEmpTotalLeaveTaken', JSON.stringify(records));
        if (empcompensqlrecords.length > 0) {
            basic = empcompensqlrecords[0].basic;

        }
        return basic;

    }
    catch (e) {
        log.error("Error in getbasicpay", e);
        // log.debug("Error in getEmpTotalLeaveTaken : " + e);
    }

}
function gerhra(empid) {
    var hraamount = 0;
    try {

        var empcompensql = "select COALESCE(sum(b.custrecord_hris_cde_monthly),0) as basic from  customrecord_hris_employee_compen_change a \
                  join customrecord_hris_compensation_details_e b on a.id = b.custrecord_hris_employee_data_change\
                    join customrecord_hris_payroll_component c on b.custrecord_hris_cde_payroll_component = c.id \
                    where a.custrecord_hris_empchange_employee_nam= "+ empid + "  and a.isinactive ='F' and c.custrecord_hris__sequence_no_ =2 "
        log.debug('empcompensql', empcompensql);
        // log.debug(empLeaveTakenSQL);
        var empcompensqlrecords = getResult(empcompensql);
        // log.debug('records in getEmpTotalLeaveTaken', JSON.stringify(records));
        if (empcompensqlrecords.length > 0) {
            hraamount = empcompensqlrecords[0].basic;

        }
        return hraamount;

    }
    catch (e) {
        log.error("Error in gethra", e);
        // log.debug("Error in getEmpTotalLeaveTaken : " + e);
    }

}
function getempleavesalbase(empid) {
    var leavesalbase = 0;
    try {

        var empcompensql = "select COALESCE(sum(b.custrecord_hris_cde_monthly),0) as leavebase from  customrecord_hris_employee_compen_change a \
                  join customrecord_hris_compensation_details_e b on a.id = b.custrecord_hris_employee_data_change\
                    join customrecord_hris_payroll_component c on b.custrecord_hris_cde_payroll_component = c.id \
                    where a.custrecord_hris_empchange_employee_nam= "+ empid + "  and a.isinactive ='F' and c.custrecord_hris_consider_for_encashment ='T' "
        log.debug('empcompensql', empcompensql);
        // log.debug(empLeaveTakenSQL);
        var empcompensqlrecords = getResult(empcompensql);
        // log.debug('records in getEmpTotalLeaveTaken', JSON.stringify(records));
        if (empcompensqlrecords.length > 0) {
            leavesalbase = empcompensqlrecords[0].leavebase;

        }
        return leavesalbase;

    }
    catch (e) {
        log.error("Error in getempleavesalbase", e);
        // log.debug("Error in getEmpTotalLeaveTaken : " + e);
    }

}
function getpaygroup(empid) {
    try {
        var empcompensql = "Select * from customrecord_hris_employee_compen_change  where custrecord_hris_empchange_employee_nam= " + empid + "  and isinactive ='F'";
        log.debug('empcompensql', empcompensql);
        // log.debug(empLeaveTakenSQL);
        var empcompensqlrecords = getResult(empcompensql);
        // log.debug('records in getEmpTotalLeaveTaken', JSON.stringify(records));
        if (empcompensqlrecords.length > 0) {
            var paygroup = empcompensqlrecords[0].custrecord_hris_empchange_emp_pay_pro_gp;

        }
        return paygroup;

    }
    catch (e) {
        log.error("Error in getpaygroup", e);
        // log.debug("Error in getEmpTotalLeaveTaken : " + e);
    }
}
function search_wageperiod(pay_group) {
    // debugger;
    try {
        var wageperiodsql = "Select * from customrecord_hris_wage_period_details  where custrecord_hris_pay_group= " + pay_group + "  and isinactive ='F'";
        log.debug(' wageperiodsql', wageperiodsql);
        // log.debug(empLeaveTakenSQL);
        var wageperiodsqlrecords = getResult(wageperiodsql);
        // log.debug('records in getEmpTotalLeaveTaken', JSON.stringify(records));
        if (wageperiodsqlrecords.length > 0) {

            var WagePeriod_EndDate = wageperiodsqlrecords[0].custrecord_hris_end_date;
            var start_date = wageperiodsqlrecords[0].custrecord_hris_start_date;
            var wage_month = wageperiodsqlrecords[0].custrecord_hris_month;
            var wage_year = wageperiodsqlrecords[0].custrecord_hris_year;
            var wage_cycledays = wageperiodsqlrecords[0].custrecord_hris_wage_cycle_day_s;

        }
        return WagePeriod_EndDate + "#" + start_date + "#" + wage_month + "#" + wage_year + "#" + wage_cycledays;

    }
    catch (e) {
        log.error("Error in getwageperiod", e);
        // log.debug("Error in getEmpTotalLeaveTaken : " + e);
    }
}
function getemployeecatagorysequence(empcatagoryid){
try{
    var empcatagorysql ="select * from customrecord_hris_employeecategory where id=" +empcatagoryid;
    log.debug('empcatagorysql', empcatagorysql);

    var empcatagorysqlrecords = getResult(empcatagorysql);

    if (empcatagorysqlrecords.length > 0) {
        var empcatid = empcatagorysqlrecords[0].custrecord_hris_empcat_seqno;
    }
return empcatid;

}
 catch (e) {
        log.error("Error in getemployeecatagorysequence", e);
        // log.debug("Error in getEmpTotalLeaveTaken : " + e);
    }
}
function get_paycomponent(pay_group) {
    //  debugger;
    try {

        var componentsql = "select * from customrecord_hris_payroll_component  where custrecord_hris_pay_process_group = " + pay_group + " and isinactive ='F'\
                             and custrecord_hris__sequence_no_ =48 "
        log.debug(' componentsql', componentsql);

        var componentsqlrecords = getResult(componentsql);

        if (componentsqlrecords.length > 0) {

            var componentid = componentsqlrecords[0].id;


        }
        return componentid;

    }
    catch (e) {
        log.error("Error in getpaycomponent", e);
        // log.debug("Error in getEmpTotalLeaveTaken : " + e);
    }
}
function getResult(pSQL) {
    // log.debug("QUERY", pSQL);
    var queryResults = QUERY.runSuiteQL({
        query: pSQL
    });
    var records = queryResults.asMappedResults();
    return records;
}

function CountDays_BetweenTwodatesWorking(startDate, endDate) {
    // debugger;
    try {

        var count = 0;
        var momentStartDate = MOMENT(startDate);

        momentStartDate = momentStartDate
        momentStartDate = momentStartDate.subtract(1, 'days');
        var momentEndDate = MOMENT(endDate);
        var duration = MOMENT.duration(momentEndDate.diff(momentStartDate));
        count = duration.asDays();
        return count;
    } catch (e) {
        log.debug("CountDays_BetweenTwodates/Error", JSON.stringify(e));
    }
}
function CountDays_BetweenTwodates(startDate, endDate) {
    // debugger;
    try {
        // log.debug('startDate',startDate);
        // log.debug('endDate',endDate);
        var count = 0;
        var momentStartDate = MOMENT(startDate);

        momentStartDate = momentStartDate.subtract(1, 'days'); // Subtract 1 day. Because we want to include both Start and End dates.
        //momentStartDate = momentStartDate 

        var momentEndDate = MOMENT(endDate);
        var duration = MOMENT.duration(momentEndDate.diff(momentStartDate));
        count = duration.asDays();
        count = count / 365;

        count = parseFloat(count).toFixed(2)



        return count;
    } catch (e) {
        log.debug("CountDays_BetweenTwodates/Error", JSON.stringify(e));
    }
}
function CountDays_BetweenTwodatesWorkingdays(startDate, endDate) {
    // debugger;
    try {
        // log.debug('startDate',startDate);
        // log.debug('endDate',endDate);
        var count = 0;
        var momentStartDate = MOMENT(startDate);

        //momentStartDate = momentStartDate.subtract(1, 'days'); // Subtract 1 day. Because we want to include both Start and End dates.
        //momentStartDate = momentStartDate 

        var momentEndDate = MOMENT(endDate);
        var duration = MOMENT.duration(momentEndDate.diff(momentStartDate));
        count = duration.asDays();




        return count;
    } catch (e) {
        log.debug("CountDays_BetweenTwodates/Error", JSON.stringify(e));
    }
}

function EmpSalaryDetails(emp, paygroup) {
    // debugger;
    try {
        var DataArray = []


        var employeesalarysql = "select b.custrecord_hris_cde_payroll_component as paycomponent, BUILTIN.DF(b.custrecord_hris_cde_payroll_component) as paycomponentname ,\
                                     b.custrecord_hris_cde_monthly as amount,c.custrecord_hris_payroll_component_type as componenttype,c.custrecord_hris__sequence_no_ as seqno  from customrecord_hris_employee_compen_change a join \
                                     customrecord_hris_compensation_details_e b on a.id = b.custrecord_hris_employee_data_change\
                                      join customrecord_hris_payroll_component c on b.custrecord_hris_cde_payroll_component = c.id\
                                      where a.custrecord_hris_empchange_employee_nam ='"+ emp + "' and a.custrecord_hris_empchange_emp_pay_pro_gp =" + paygroup + "";// and b.custrecord_hris_cde_monthly > 0";    

        log.debug('employeesalarysql', employeesalarysql);
        var employeesalarysqlrecords = getResult(employeesalarysql);

        if (employeesalarysqlrecords.length > 0) {

            for (var j = 0; j < employeesalarysqlrecords.length; j++) {


                var Code = employeesalarysqlrecords[j].paycomponent;
                var Name = employeesalarysqlrecords[j].paycomponentname;
                var Amount = employeesalarysqlrecords[j].amount;
                var PayType = employeesalarysqlrecords[j].componenttype;
                var seqno = employeesalarysqlrecords[j].seqno



                DataArray.push({
                    'paygroup': paygroup,
                    'code': Code,
                    'name': Name,
                    'amount': Amount,
                    'type': PayType,
                    'seqno': seqno
                });
            }
        }



        return DataArray;
    } catch (e) {
        log.error("Error in EmpSalaryDetails", e);
        log.debug("Error in EmpSalaryDetails : " + JSON.stringify(e));
    }
}
function CollectSalaryDetails(data, CalDays, Salary) {
    //  debugger;
    try {
        //  if (data.length > 0) {
        var DataArray = [];
        /* for (var m = 0; m < data.length; m++) {
            var Days_ = data[m].days || 0;
            var Month_ = data[m].monthcount || 0;
            var Month_Name = data[m].month || '';
            var Month_id = data[m].id || '';
            var year = data[m].year||'';
            var paydate = data[m].paydate||''; */
        var Days_ = data || 0;
        var Month_ = CalDays || 30;
        for (var i = 0; i < Salary.length; i++) {
            var paygroup = Salary[i].paygroup;
            var Code = Salary[i].code || '';
            var Name = Salary[i].name || '';
            var Amount = Salary[i].amount || 0;
            var Type = Salary[i].type || '';
            var seqno = Salary[i].seqno;
            var convert = Math.round(Amount * 100) / 100;
            var Cal1 = convert / Month_;
            var leaveSettlement = Cal1 * parseInt(Days_);
            var leaveSettlement1 = Math.round(leaveSettlement * 100) / 100;

            var Total = 0;
            if (Type == 1) {
                Total = leaveSettlement1;
            } else {
                Total = -Math.abs(leaveSettlement1);
            }

            DataArray.push({
                'paygroup': paygroup,
                'code': Code,
                'name': Name,
                'amount': Amount,
                'salaryamount': Total,
                'componenttype': Type,
                'seqno': seqno

            });
        }
        // }
        log.debug("Collect Salary", DataArray);
        if (DataArray.length > 0) {
            return DataArray;
        } else {
            return null;
        }

        //  }
    } //try
    catch (e) {
        log.debug('CollectSalaryDetails/Error', e);
        log.error("Error in CollectSalaryDetails", e);
        log.debug("Error in CollectSalaryDetails : " + JSON.stringify(e));
    }
}
