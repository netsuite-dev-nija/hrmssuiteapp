/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @Description Converted to SuiteScript 2.1 (functionality unchanged)
 */

var SEARCH, MOMENT, RECORD, QUERY;
define(['N/currentRecord', 'N/record', 'N/search','./moment.js', 'N/format', 'N/query','N/url'],
    function (currentRecord, record, search, moment, format, query,url) {
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

                    //  var empid = getUrlParameter('empid');
                    var leaverecordid = getUrlParameter('leaverecordid')
                    /*   leaverecord.setValue({
                          fieldId: 'custrecordhris_fin_emplo_name',
                          value: empid,
                          ignoreFieldChange: false,
                          forceSyncSourcing: true
                      }); */

                    /*    leaverecord.setValue({
                           fieldId: 'custpage_leave_app_no',
                           value: leaverecordid,
                           ignoreFieldChange: false,
                           forceSyncSourcing: true
                       }); */

                    leaverecord.setValue({
                        fieldId: 'custrecord_hrms_lveset_leaverefno',
                        value: leaverecordid,
                        ignoreFieldChange: false,
                        forceSyncSourcing: true
                    });

                    /*   var fromdate =  leaverecord.getValue('custrecord_hris_fin_date_of_leave')
                      var previousDate = moment(fromdate, "dd/mm/yyyy").subtract(1, 'days').format("dd/mm/yyyy");
                          if (previousDate) {
                              previousDate = format.format({
                                  value: previousDate,
                                  type: format.Type.DATE,
                                  timezone: format.Timezone.ASIA_MUSCAT
                              });
                              leaverecord.setValue({
                                 fieldId: 'custrecord_hris_fin_lastwork_date',
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
                //  debugger;
                var recordObj = context.currentRecord;

                // Check if we are in the correct sublist and field
                 if (context.sublistId == 'recmachcustrecord_hris_fin_link_overtime' && context.fieldId == 'custrecord_hris_fin_overtime_hours') {
                  //debugger;
                    // Get the rate
                    var rate = recordObj.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_fin_link_overtime',
                        fieldId: 'custrecord_hris_fin_over_rate'
                    }) || 0;
    
                    // Get the hours
                    var hours = recordObj.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_fin_link_overtime',
                        fieldId: 'custrecord_hris_fin_overtime_hours'
                    }) || 0;
    
                    // Calculate the amount
                    var amount = parseFloat(rate) * parseFloat(hours);
    
                    // Set the calculated amount in the `custrecord_hris_fin_over_amount` field
                    recordObj.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_fin_link_overtime',
                        fieldId: 'custrecord_hris_fin_over_amount',
                        value: amount.toFixed(2), // Format to 2 decimal places
                        ignoreFieldChange: true
                    });
    
                    log.debug({
                        title: 'Field Changed',
                        details: 'Rate: ' + rate + ', Hours: ' + hours + ', Amount: ' + amount
                    });
                } 

                if (context.fieldId == "custrecordhris_fin_emplo_name") {

                    // All APPROVED Annual Leaves which has more than 10 days and also Leave Considered as should TRUE should come here.
                    var empID = recordObj.getValue('custrecordhris_fin_emplo_name');
                    if (empID) {



                        var paygroup = getpaygroup(empID);


                        var componenttype = get_paycomponent(paygroup);
                        // Getting Wage Period
                        var get_wage_date = search_wageperiod(paygroup);
                        var w_Date = get_wage_date.toString().split("#");
                        var end_date = w_Date[0];
                        var start_date = w_Date[1];
                        var wage_month = w_Date[2];
                        var wage_year = w_Date[3];
                        if (paygroup != null && paygroup != "undefined" && paygroup != "") {
                            recordObj.setValue({
                                fieldId: 'custrecord_hris_fin_payprocessgrp',
                                value: paygroup,
                                ignoreFieldChange: false
                            });
                        }
                        if (componenttype != null && componenttype != "undefined" && componenttype != "") {
                            recordObj.setValue({
                                fieldId: 'custrecord_hris_fin_payroll_componet',
                                value: componenttype,
                                ignoreFieldChange: true
                            });
                        }
                        if (get_wage_date != null && get_wage_date != "undefined" && get_wage_date != "") {
                            end_date = format.parse({
                                value: end_date,
                                type: format.Type.DATE
                            });
                            recordObj.setValue({
                                fieldId: 'custrecord_hris_fin_pay_date',
                                value: end_date,
                                ignoreFieldChange: true
                            });
                            recordObj.setValue({
                                fieldId: 'custrecord_hris_fin_paymonth',
                                value: wage_month,
                                ignoreFieldChange: true
                            });
                            recordObj.setValue({
                                fieldId: 'custrecord_hris_fin_year',
                                value: wage_year,
                                ignoreFieldChange: true
                            });


                        }
                       var lastPayDate = get_last_pay_process_date(empID);
                
                if (lastPayDate) {
                    // Parse string date to Date Object for NetSuite field
                    var parsedLastPayDate = format.parse({
                        value: lastPayDate,
                        type: format.Type.DATE
                    });
                    
                    // Set the retrieved date into the "Last Pay Date" field
                    recordObj.setValue({
                        fieldId: 'custrecord_hris_final_settlement_last_pa',
                        value: parsedLastPayDate,
                        ignoreFieldChange: true
                    });
                }

         var lastotPayDate = get_last_ot_process_date(empID);
                
                if (lastotPayDate) {
                    // Parse string date to Date Object for NetSuite field
                    var parsedLastotPayDate = format.parse({
                        value: lastotPayDate,
                        type: format.Type.DATE
                    });
                    
                    // Set the retrieved date into the "Last Pay Date" field
                    recordObj.setValue({
                        fieldId: 'custrecord_hris_fin_ot_lastpaydate',
                        value: parsedLastotPayDate,
                        ignoreFieldChange: true
                    });
                }


 var lastleaveaccuralDate = get_last_leave_accural_date(empID);
                
                if (lastleaveaccuralDate) {
                    // Parse string date to Date Object for NetSuite field
                    var parsedlastleaveaccuralDate = format.parse({
                        value: lastleaveaccuralDate,
                        type: format.Type.DATE
                    });
                    
                    // Set the retrieved date into the "Last Pay Date" field
                    recordObj.setValue({
                        fieldId: 'custrecord_hris_fin_last_lveaccural_date',
                        value: parsedlastleaveaccuralDate,
                        ignoreFieldChange: true
                    });
                }

             
var lastgratuityaccuralDate = get_last_gratuity_accural_date(empID);
                
                if (lastgratuityaccuralDate) {
                    // Parse string date to Date Object for NetSuite field
                    var parsedlastgratuityaccuralDate = format.parse({
                        value: lastgratuityaccuralDate,
                        type: format.Type.DATE
                    });
                    
                    // Set the retrieved date into the "Last Pay Date" field
                    recordObj.setValue({
                        fieldId: 'custrecord_hris_fin_last_gratacc_date',
                        value: parsedlastgratuityaccuralDate,
                        ignoreFieldChange: true
                    });
                }    

                    }

                }

                
                if (context.fieldId == 'custrecord_hris_fin_payprocessgrp') {
                    debugger;
                    var paygroup = recordObj.getValue('custrecord_hris_fin_payprocessgrp');

                    //comment sublist removeline
                      var sublistcount = recordObj.getLineCount({
                         sublistId: 'recmachcustrecord_hris_finset_link'
                     });
                     log.debug('sublistcount', sublistcount);
                     // for refresh the sublist
                     if (sublistcount > 0) {
                         for (var k = sublistcount - 1; k >= 0; k--) {
                             recordObj.removeLine({
                                 sublistId: 'recmachcustrecord_hris_finset_link',
                                 line: k
                             });
                         }
                     }
                     var componentsql = "select * from customrecord_hris_payroll_component where isinactive='F' and  \
                        custrecord_hris__sequence_no_ in(20,61) and custrecord_hris_pay_process_group ="+ paygroup;
                     log.debug('componentsql', componentsql);
                     var componentsqlrecords = getResult(componentsql);
 
                     if (componentsqlrecords.length > 0) {
                         for (var k = 0; k < componentsqlrecords.length; k++) {
                             var paycomponent = componentsqlrecords[k].id;
                             var compType = componentsqlrecords[k].custrecord_hris_payroll_component_type;
                             var psqno = componentsqlrecords[k].custrecord_hris__sequence_no_;
 
                             recordObj.selectNewLine({
                                 sublistId: 'recmachcustrecord_hris_finset_link',
 
                             });
                             recordObj.setCurrentSublistValue({
                                 sublistId: 'recmachcustrecord_hris_finset_link',
                                 fieldId: 'custrecord_hris_fin_detailsprocessgrp',
                                 value: paygroup,
                                 line: k,
                                 ignoreFieldChange: false,
                                 forceSyncSourcing:true,
                             });
                             recordObj.setCurrentSublistValue({
                                 sublistId: 'recmachcustrecord_hris_finset_link',
                                 fieldId: 'custrecord_hris_fin_details_paycom',
                                 value: paycomponent,
                                 line: k,
                                 ignoreFieldChange: false,
                                 forceSyncSourcing:true,
                             });
                              recordObj.setCurrentSublistValue({
                                 sublistId: 'recmachcustrecord_hris_finset_link',
                                 fieldId: 'custrecord_hris_fin_detai_comtype',
                                 value: compType,
                                 line: k,
                                 ignoreFieldChange: true,
                                 forceSyncSourcing:true,
                             });
                             recordObj.setCurrentSublistValue({
                                 sublistId: 'recmachcustrecord_hris_finset_link',
                                 fieldId: 'custrecord_hris_fin_detai_paycomposeqno',
                                 value: psqno,
                                 line: k,
                                 ignoreFieldChange: true,
                                 forceSyncSourcing:true,
                             });
 
                             recordObj.commitLine({
                                 sublistId: 'recmachcustrecord_hris_finset_link'
                             });
                         }
                     }
                    //comment sublist removeline overtime
                    var sublistcount = recordObj.getLineCount({
                        sublistId: 'recmachcustrecord_hris_fin_link_overtime'
                    });
                    log.debug('sublistcount', sublistcount);
                    // for refresh the sublist
                    if (sublistcount > 0) {
                        for (var t = sublistcount - 1; t >= 0; t--) {
                            recordObj.removeLine({
                                sublistId: 'recmachcustrecord_hris_fin_link_overtime',
                                line: t
                            });
                        }
                    }
                    var overtimesql = "SELECT pc.*, ot.custrecord_hris_overtime_value_cal as rate " +
                        "FROM customrecord_hris_payroll_component AS pc " +
                        "INNER JOIN customrecord_hris_overtime_type AS ot " +
                        "ON pc.id = ot.custrecord_hris_overtime_paycomponent " +
                        "WHERE pc.custrecord_hris__sequence_no_ = 38 " +
                        "AND pc.custrecord_hris_pay_process_group = " + paygroup;
                    log.debug('overtimesql', overtimesql);
                    var overtimeqlrecords = getResult(overtimesql);
                    if (overtimeqlrecords.length > 0) {
                        for (var t = 0; t < overtimeqlrecords.length; t++) {
                            var paycomponent = overtimeqlrecords[t].id;
                            var compType = overtimeqlrecords[t].custrecord_hris_payroll_component_type;
                            var psqno = overtimeqlrecords[t].custrecord_hris__sequence_no_;
                            var rate = overtimeqlrecords[t].rate;

                            recordObj.selectNewLine({
                                sublistId: 'recmachcustrecord_hris_fin_link_overtime',

                            });
                            recordObj.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_hris_fin_link_overtime',
                                fieldId: 'custrecord_hris_fin_over_paygrp',
                                value: paygroup,
                                line: t,
                                ignoreFieldChange: true,
                            });
                            recordObj.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_hris_fin_link_overtime',
                                fieldId: 'custrecord_hris_fin_payroll_comp',
                                value: paycomponent,
                                line: t,
                                ignoreFieldChange: true,
                            });
                            recordObj.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_hris_fin_link_overtime',
                                fieldId: 'custrecord_hris_fin_over_comp_type',
                                value: compType,
                                line: t,
                                ignoreFieldChange: true,
                            });
                            recordObj.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_hris_fin_link_overtime',
                                fieldId: 'custrecord_hris_fin_overtime_seq_no',
                                value: psqno,
                                line: t,
                                ignoreFieldChange: true,
                            });
                            recordObj.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_hris_fin_link_overtime',
                                fieldId: 'custrecord_hris_fin_over_rate',
                                value: rate,
                                line: t,
                                ignoreFieldChange: true,
                            });

                            recordObj.commitLine({
                                sublistId: 'recmachcustrecord_hris_fin_link_overtime'
                            });
                        }
                    }

                }


                if (context.fieldId == 'custrecord_hris_fin_date_of_leave' || context.fieldId == 'custrecord_hris_fin_unpaid_during_nperid') {
                    debugger;
                    var doj = recordObj.getValue('custrecord_hris_fin_date_of_join');
                    var dol = recordObj.getValue('custrecord_hris_fin_date_of_leave');
                    var unpaiddays = recordObj.getValue('custrecord_hris_fin_unpaid_during_nperid')||0;
                    /*   if (doj && dol) {
                          var diff = calculateYearsAndMonths(doj, dol);
  
                          if (diff) {
                              var formattedDifference = diff.years + '.' + diff.months;
                              recordObj.setValue({
                                  fieldId: 'custrecord_hris_fin_no_of_years_of_serv',
                                  value: formattedDifference
                              })
                          }
                      } */
                     if(doj && dol) {
                    NoOfWorkingyears = CountDays_BetweenTwodates(doj, dol,unpaiddays);
                  
                    recordObj.setValue({
                        fieldId: 'custrecord_hris_fin_no_of_years_of_serv',
                        value: NoOfWorkingyears,
                        ignoreFieldChange: true
                    });
                }
                }

                if (context.sublistId == 'recmachcustrecord_njt_fin_loan_set_link' && context.fieldId == 'custrecord_njt_fin_settl_amt_paid') {
                    var outstandingamt = recordObj.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
                        fieldId: 'custrecord_njt_fin_sett_outstand_amt'
                    }) || 0;
                    var amounttobepaid = recordObj.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
                        fieldId: 'custrecord_njt_fin_settl_amt_paid'
                    }) || 0;
                    if (amounttobepaid > outstandingamt) {
                        alert("Amount To be Paid is Exceed the Outstanding Amount");
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
                            fieldId: 'custrecord_njt_fin_settl_amt_paid',
                            value: outstandingamt.toFixed(2),
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                    }

                }


            } catch (e) {
                log.error("Error in fieldChanged", e);
            }
        }
       function get_last_pay_process_date(empID) {
        var lastPayDate = "";

        // Create search on Pay Process record
        var payProcessSearch = search.create({
            type: 'customrecord_hris_pay_process',
          filters: [
    ['custrecord_hris_pay_proc_employee', 'anyof', empID],
    'AND',
    ['custrecord_hris_pay_proc_process_type', 'anyof', 1],
    'AND',
    ['isinactive', 'is', 'F'] 
],
            /* columns: [
                // Sorting by Internal ID Descending to get the "Last Created" record
                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.DESC
                }),
                // Retrieve the Pay Date
                search.createColumn({
                    name: 'custrecord_hris_pay_proc_pay_date'
                })
            ] */
           columns:
   [
      search.createColumn({
         name: "custrecord_hris_pay_proc_pay_date",
         summary: "MAX",
         label: "Date"
      })
   ]
        });

        var searchResult = payProcessSearch.run().getRange({
            start: 0,
            end: 1
        });

        if (searchResult && searchResult.length > 0) {
            lastPayDate = searchResult[0].getValue({
                name: 'custrecord_hris_pay_proc_pay_date',
                summary: "MAX"
            });
        }

        return lastPayDate;
    }
       function get_last_ot_process_date(empID) {
        var lastPayDate = "";

        // Create search on Pay Process record
        var payProcessSearch = search.create({
            type: 'customrecord_hris_pay_process',
           filters: [
    ['custrecord_hris_pay_proc_employee', 'anyof', empID],
    'AND',
    ['custrecord_hris_pay_proc_process_type', 'anyof', 4],
    'AND',
    ['isinactive', 'is', 'F'] 
],
           /*  columns: [
                // Sorting by Internal ID Descending to get the "Last Created" record
                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.DESC
                }),
                // Retrieve the Pay Date
                search.createColumn({
                    name: 'custrecord_hris_pay_proc_pay_date'
                })
            ] */
           columns:
   [
      search.createColumn({
         name: "custrecord_hris_pay_proc_pay_date",
         summary: "MAX",
         label: "Date"
      })
   ]
        });

        var searchResult = payProcessSearch.run().getRange({
            start: 0,
            end: 1
        });

        if (searchResult && searchResult.length > 0) {
            lastPayDate = searchResult[0].getValue({
                name: 'custrecord_hris_pay_proc_pay_date',
                summary: "MAX"
            });
        }

        return lastPayDate;
    }
     function get_last_leave_accural_date(empID) {
        var lastPayDate = "";

        // Create search on Pay Process record
        var payProcessSearch = search.create({
            type: 'customrecord_hris_monthly_accural_trans',
           filters: [
    ['custrecord_hris_accural_empid', 'anyof', empID],
    'AND',
    ['custrecord_hris_accural_trans_type', 'anyof', 1],
    'AND',
    ['custrecord_hris_accural_type', 'anyof', 1],
    'AND',
    ['isinactive', 'is', 'F'] 
],
         /*    columns: [
                // Sorting by Internal ID Descending to get the "Last Created" record
                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.DESC
                }),
                // Retrieve the Pay Date
                search.createColumn({
                    name: 'custrecord_hris_accural_date'
                })
            ] */
           columns:
   [
      search.createColumn({
         name: "custrecord_hris_accural_date",
         summary: "MAX",
         label: "Date"
      })
   ]
        });

        var searchResult = payProcessSearch.run().getRange({
            start: 0,
            end: 1
        });

        if (searchResult && searchResult.length > 0) {
            lastPayDate = searchResult[0].getValue({
                name: 'custrecord_hris_accural_date',   
                summary: "MAX"
            });
        }

        return lastPayDate;
    }
     function get_last_gratuity_accural_date(empID) {
        var lastPayDate = "";

        // Create search on Pay Process record
        var payProcessSearch = search.create({
            type: 'customrecord_hris_monthly_accural_trans',
           filters: [
    ['custrecord_hris_accural_empid', 'anyof', empID],
    'AND',
    ['custrecord_hris_accural_trans_type', 'anyof', 6],
    'AND',
    ['custrecord_hris_accural_type', 'anyof', 3],
    'AND',
    ['isinactive', 'is', 'F'] 
],
           /*  columns: [
                // Sorting by Internal ID Descending to get the "Last Created" record
                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.DESC
                }),
                // Retrieve the Pay Date
                search.createColumn({
                    name: 'custrecord_hris_accural_date'
                })
            ] */
           columns:
   [
      search.createColumn({
         name: "custrecord_hris_accural_date",
         summary: "MAX",
         label: "Date"
      })
   ]
        });

        var searchResult = payProcessSearch.run().getRange({
            start: 0,
            end: 1
        });

        if (searchResult && searchResult.length > 0) {
            lastPayDate = searchResult[0].getValue({
                name: 'custrecord_hris_accural_date',
                summary: "MAX"
            });
        }

        return lastPayDate;
    }
        function lineInit(context) {
            try {
                debugger;

                var recordObj = context.currentRecord;

                if (context.sublistId == 'recmachcustrecord_hris_finset_link' && context.fieldId == 'custrecord_hris_fin_detailsprocessgrp') {
                    var paygroup = recordObj.getValue('custrecord_hris_fin_payprocessgrp');
                    recordObj.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_finset_link',
                        fieldId: 'custrecord_hris_fin_detailsprocessgrp',
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

                /*  var sublistcount = recordObj.getLineCount({
                     sublistId: 'recmachcustrecord_hris_finset_link'
                 });
                 log.debug("sublistcount", sublistcount);
 
                 var otheraddition = 0;
                 var otherdeduction = 0;
 
                 // First loop: Calculate other additions and deductions
                 for (var i = 0; i < sublistcount; i++) {
                     var amount = recordObj.getSublistValue({
                         sublistId: 'recmachcustrecord_hris_finset_link',
                         fieldId: 'custrecord_hirs_fin_det_amount',
                         line: i
                     }) || 0;
 
                     var componenttype = recordObj.getSublistValue({
                         sublistId: 'recmachcustrecord_hris_finset_link',
                         fieldId: 'custrecord_hris_fin_detai_comtype',
                         line: i
                     });
 
                     if (componenttype == 1) {
                         otheraddition += parseFloat(amount);
                     } else if (componenttype == 2) {
                         otherdeduction += parseFloat(amount);
                     }
                 }
 
                 // Set other addition and deduction values
                 recordObj.setValue({
                     fieldId: 'custrecord_hris_fin_other_addition',
                     value: otheraddition.toFixed(2),
                     ignoreFieldChange: true
                 });
                 recordObj.setValue({
                     fieldId: 'custrecord_hris_fin_other_deduction',
                     value: otherdeduction.toFixed(2),
                     ignoreFieldChange: true
                 });
  */

              /*   var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hris_fin_link_overtime'
                });
                log.debug("sublistcount", sublistcount);

                var overtimeAmt = 0;

                // First loop: Calculate other additions and deductions
                for (var q = 0; q < sublistcount; q++) {
                    var amount = recordObj.getSublistValue({
                        sublistId: 'recmachcustrecord_hris_fin_link_overtime',
                        fieldId: 'custrecord_hris_fin_over_amount',
                        line: q
                    }) || 0;

                    overtimeAmt += parseFloat(amount);
                }

                // Set overtime values
                recordObj.setValue({
                    fieldId: 'custrecord_hirs_fin_otamt',
                    value: overtimeAmt.toFixed(2),
                    ignoreFieldChange: true
                }); */

                /* var leavesalaryamt = recordObj.getValue('custrecord_hris_fin_leave_salary_amt') || 0;
                var otAmt = recordObj.getValue('custrecord_hirs_fin_otamt') || 0;
                var salaryadvanceamt = recordObj.getValue('custrecord_hris_fin_salarys_advance') || 0;
                //var hraamount = recordObj.getValue('custrecord_hrms_lveset_hraamount')||0;
                var airticketamount = recordObj.getValue('custrecord_hris_fin_airtick_amt') || 0;
                var loanamount = recordObj.getValue('custrecord_hris_fin_loan_amt') || 0;
                var otheradditionamt = recordObj.getValue('custrecord_hris_fin_other_addition') || 0;
                var otherdeductionamt = recordObj.getValue('custrecord_hris_fin_other_deduction') || 0;
                settleamount = (parseFloat(leavesalaryamt) + parseFloat(salaryadvanceamt) + parseFloat(otAmt) + parseFloat(airticketamount) + parseFloat(otheradditionamt)) - (parseFloat(loanamount) + parseFloat(otherdeductionamt));
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_net_amt',
                    value: settleamount,
                    ignoreFieldChange: true
        
                }); */
               /*  var Linecount=recordObj.getLineCount({
                    sublistId:"recmachcustrecord_hris_final_sett_link"
                });
                for(v=0;v<Linecount;v++){
                    var ishandover=recordObj.getSublistValue({
                        sublistId:"recmachcustrecord_hris_final_sett_link",
                        fieldId:"custrecord_hris_asset_handoverdone",
                        line:v
                    });
                    if(ishandover == false){
                        alert('Some asset handover is pending');
                        return false; // Prevent save
                    }
                } */

                return true; // Allow the record to be saved
            } catch (e) {
                log.debug("Error in saveRecord: ", e.message);
                return false; // Prevent record save on error
            }
        }


        function recalculate() {

            debugger;
            try {
                var recordObj = currentRecord.get();

                var settlementid = recordObj.getValue('id') || '';

                var emp = recordObj.getValue('custrecordhris_fin_emplo_name');
                var fromdate = recordObj.getValue('custrecord_hris_fin_date_of_leave');
                var dol = recordObj.getValue('custrecord_hris_fin_date_of_leave');
                var rejoindate = recordObj.getValue('custrecord_hris_fin_rejoin_date') || '';
                var hiredate = recordObj.getValue('custrecord_hris_fin_date_of_join');
                var employeecatagory = recordObj.getValue('custrecord_hirs_fin_employee_cat');
                var paygroup = recordObj.getValue('custrecord_hris_fin_payprocessgrp');
                var AdvanceSalDays = recordObj.getValue('custrecord_hris_fin_salary_advance');
                var advancesalaryamount = 0;

                var get_wage_date = search_wageperiod(paygroup);
                var w_Date = get_wage_date.toString().split("#");
                var end_date = w_Date[0];
                var start_date = w_Date[1];
                var wage_month = w_Date[2];
                var wage_year = w_Date[3];
                var CalDays = w_Date[4];
                // CalDays=30;
               var GetSalary = EmpSalaryDetails(emp, paygroup);
                log.debug("GetSalary", JSON.stringify(GetSalary));

                var FetchSalaryDetails = CollectSalaryDetails(AdvanceSalDays, CalDays, GetSalary);
                log.debug("FetchSalaryDetails", JSON.stringify(FetchSalaryDetails));
                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hris_saladv_settlelink'
                });
                log.debug('sublistcount', sublistcount);


                if (FetchSalaryDetails != null && FetchSalaryDetails.length > 0) {
                    if (sublistcount > 0) {
                        for (var h = sublistcount - 1; h >= 0; h--) {
                            recordObj.removeLine({
                                sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                                line: h
                            });
                        }
                        if (settlementid != '') {
                            var advancesalarysql = "select * from customrecord_hris_salaryadvancedetails where 	custrecord_hris_saladv_settlelink =" + settlementid;
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
                                        type: 'customrecord_hris_salaryadvancedetails',
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
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink'
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_paygroup',
                            value: paygroup,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_payrollcomponent',
                            value: Code,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_monthlyamount',
                            value: Amount,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_salaryamount',
                            value: salaryamount,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_componenttype',
                            value: componenttype,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_sequenceno',
                            value: seqno,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        advancesalaryamount = parseFloat(advancesalaryamount) + parseFloat(salaryamount);
                        recordObj.commitLine({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink'
                        });
                    }
                }
                advancesalaryamount = advancesalaryamount.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_salarys_advance',
                    value: advancesalaryamount,
                    ignoreFieldChange: true
                });
 
            
                // }

                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hris_finset_link'
                });
                log.debug("sublistcount", sublistcount);


                var otheraddition = 0;
                var otherdeduction = 0;
                for (var i = 0; i < sublistcount; i++) {

                    recordObj.selectLine({
                        sublistId: 'recmachcustrecord_hris_finset_link',
                        line: i
                    });

                    var amount = recordObj.getSublistValue({
                        sublistId: 'recmachcustrecord_hris_finset_link',
                        fieldId: 'custrecord_hirs_fin_det_amount',
                        line: i,

                    }) || 0;
                    var componenttype = recordObj.getSublistValue({
                        sublistId: 'recmachcustrecord_hris_finset_link',
                        fieldId: 'custrecord_hris_fin_detai_comtype',
                        line: i,

                    });
                    if (componenttype == 1) {
                        otheraddition = parseFloat(otheraddition) + parseFloat(amount);
                    }
                    else if (componenttype == 2) {
                        otherdeduction = parseFloat(otherdeduction) + parseFloat(amount);
                    }
                    recordObj.commitLine({
                        sublistId: 'recmachcustrecord_hris_finset_link'
                    });
                }
                otheraddition = otheraddition.toFixed(2);
                otherdeduction = otherdeduction.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_other_addition',
                    value: otheraddition,
                    ignoreFieldChange: true

                });
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_other_deduction',
                    value: otherdeduction,
                    ignoreFieldChange: true

                });
              /*   var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hris_fin_link_overtime'
                });
                log.debug("sublistcount", sublistcount);

                var overtimeAmt = 0;

                // Initialize overtimeAmt
                var overtimeAmt = 0;

                // Loop through the sublist to calculate the total overtime amount
                for (var q = 0; q < sublistcount; q++) {
                    var amount = recordObj.getSublistValue({
                        sublistId: 'recmachcustrecord_hris_fin_link_overtime',
                        fieldId: 'custrecord_hris_fin_over_amount',
                        line: q
                    }) || 0;

                    overtimeAmt += parseFloat(amount);
                }

                // Round overtimeAmt to two decimal places
                overtimeAmt = parseFloat(overtimeAmt.toFixed(2));

                // Get the current value of salary advance
                var salaryadvanceamt = parseFloat(recordObj.getValue('custrecord_hris_fin_salarys_advance') || 0);
 */
                var otheraddition = recordObj.getValue('custrecord_hris_fin_other_addition') || 0;
                // Calculate the new salary advance amount
              
               /*  var newSalaryAdvanceAmt = salaryadvanceamt;
              
                var salaryadvance = salaryadvanceamt;
                
                recordObj.setValue({
                    fieldId: 'custrecord_hirs_fin_otamt',
                    value: overtimeAmt,
                    ignoreFieldChange: true
                });

                
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_salarys_advance',
                    value: newSalaryAdvanceAmt.toFixed(2),
                    ignoreFieldChange: true
                });

                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_salaryadvanceamount',
                    value: salaryadvance.toFixed(2),
                    ignoreFieldChange: true
                }); */

                //recalculate loan details
                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_njt_fin_loan_set_link'
                });
                log.debug("sublistcount", sublistcount);


                var totalloanamount = 0;

                for (var i = 0; i < sublistcount; i++) {

                    recordObj.selectLine({
                        sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
                        line: i
                    });

                    var amount = recordObj.getSublistValue({
                        sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
                        fieldId: 'custrecord_njt_fin_settl_amt_paid',
                        line: i,

                    }) || 0;
                    totalloanamount = parseFloat(totalloanamount) + parseFloat(amount);
                    recordObj.commitLine({
                        sublistId: 'recmachcustrecord_njt_fin_loan_set_link'
                    });
                }
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_loan_amt',
                    value: totalloanamount.toFixed(2),
                    ignoreFieldChange: true

                });


                var leavesalaryamt = recordObj.getValue('custrecord_hris_fin_leave_salary_amt') || 0;
                var salaryadvanceamt = recordObj.getValue('custrecord_hris_fin_salarys_advance') || 0;
                //var hraamount = recordObj.getValue('custrecord_hrms_lveset_hraamount') || 0;
                var airticketamount = recordObj.getValue('custrecord_hris_fin_airtick_amt') || 0;
                var loanamount = recordObj.getValue('custrecord_hris_fin_loan_amt') || 0;
                var otheradditionamt = recordObj.getValue('custrecord_hris_fin_other_addition') || 0;
                var otherdeductionamt = recordObj.getValue('custrecord_hris_fin_other_deduction') || 0;
                var gradutityamt = recordObj.getValue('custrecord_hris_fin_gratuity_amount') || 0;
                var otAmt = recordObj.getValue('custrecord_hirs_fin_otamt') || 0;
                settleamount = (parseFloat(leavesalaryamt) + parseFloat(salaryadvanceamt) + parseFloat(otAmt) + parseFloat(gradutityamt) + parseFloat(airticketamount) + parseFloat(otheradditionamt)) - (parseFloat(loanamount) + parseFloat(otherdeductionamt));
                settleamount = settleamount.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_net_amt',
                    value: settleamount,
                    ignoreFieldChange: true

                });
                // actual amount
                var actualleavesalaryamt = recordObj.getValue('custrecord_hris_fin_actlvesalaryamt') || 0;
                var actualsalaryadvanceamt = recordObj.getValue('custrecord_hris_fin_actsaladvanceamt') || 0;

                var actualairticketamount = recordObj.getValue('custrecord_hris_fin_actairticketamount') || 0;
                var actualloanamount = recordObj.getValue('custrecord_hris_fin_actloanamount') || 0;
                var actualgradutityamt = recordObj.getValue('custrecord_hris_fin_actgratuityamt') || 0;


                actualsettleamount = (parseFloat(actualleavesalaryamt) + parseFloat(actualsalaryadvanceamt) + parseFloat(otAmt) + parseFloat(actualgradutityamt) + parseFloat(actualairticketamount) + parseFloat(otheradditionamt)) - (parseFloat(actualloanamount) + parseFloat(otherdeductionamt));
                actualsettleamount = actualsettleamount.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_actnetamount',
                    value: actualsettleamount,
                    ignoreFieldChange: true

                });


            }
            catch (e) {
                log.error("Error in recalculate", e);
                // log.debug("Error in getEmpTotalLeaveTaken : " + e);
            }

        }

        //jv creation
        function jvcreation() {
            debugger;

            try {


                var jvarray = [];
                var currentrecord = currentRecord.get()
                var leaveSettlemenID = currentrecord.id;
                var newRecordObj = record.load({
                    type: 'customrecord_hris_finasettlement_process',
                    id: leaveSettlemenID,
                    isDynamic: true,
                });

                var approvalStatus = newRecordObj.getValue('custrecord_hris_fin_approva');

                log.debug("approvalStatus", approvalStatus);
                /*  var leaveAppNo = newRecordObj.getValue('custrecord_hrms_lveset_leaverefno') || '';
                 log.debug("leaveAppNo", leaveAppNo); */
                var jeno = newRecordObj.getValue('custrecord_hris_fin_jo_no') || '';
                log.debug('jeno', jeno);

                var empid = newRecordObj.getValue('custrecordhris_fin_emplo_name');
                var empname = newRecordObj.getValue('custrecordhris_fin_emplo_name');
                var paygroup = newRecordObj.getValue('custrecord_hris_fin_payprocessgrp');
                var paymonth = newRecordObj.getValue('custrecord_hris_fin_paymonth');
                var paymonthname = newRecordObj.getText('custrecord_hris_fin_paymonth');
                var yearname = newRecordObj.getText('custrecord_hris_fin_year');
                var year = newRecordObj.getValue('custrecord_hris_fin_year');
                var paycomponent = newRecordObj.getValue('custrecord_hris_fin_payroll_componet');
                var subsidiaries = newRecordObj.getValue('custrecord_hris_fin_subsidiary');
                var leavesalaryamt = newRecordObj.getValue('custrecord_hris_fin_leave_salary_amt') || 0;
                var employeecategory = newRecordObj.getValue('custrecord_hirs_fin_employee_cat');


                //  var salaryadvanceamt = newRecordObj.getValue('custrecord_hris_fin_salarys_advance') || 0

                var salaryadvanceamt = newRecordObj.getValue('custrecord_hris_fin_salaryadvanceamount') || 0
                //var hraamount = newRecordObj.getValue('custrecord_hrms_lveset_hraamount') || 0;
                var airticketamount = newRecordObj.getValue('custrecord_hris_fin_airtick_amt') || 0;
                var loanamount = newRecordObj.getValue('custrecord_hris_fin_loan_amt') || 0;
                var otheradditionamt = newRecordObj.getValue('custrecord_hris_fin_other_addition') || 0;
                var otherdeductionamt = newRecordObj.getValue('custrecord_hris_fin_other_deduction') || 0;
                var gradutityamt = newRecordObj.getValue('custrecord_hris_fin_gratuity_amount') || 0;
                var paydate = newRecordObj.getValue('custrecord_hris_fin_pay_date');
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
                    //'hraamount': hraamount,
                    'airticketamount': airticketamount,
                    'loanamount': loanamount,
                    'otheradditionamt': otheradditionamt,
                    'otherdeductionamt': otherdeductionamt,
                    'gradutityamt': gradutityamt,
                    'employeecategory': employeecategory

                });
                log.debug('JV Array', jvarray);

                /* var paycomponent = jvarray[0].paycomponent;
                log.debug('Paycomponent', paycomponent); */
                var subsidiariesRes = jvarray[0].subsidiary;
                var today = jvarray[0].paydate;

                var year = jvarray[0].yearname;
                var paygroupParameter = jvarray[0].paygroup;
                var monthParameter = jvarray[0].paymonth;
                var month = getMonth(monthParameter);
                var yearParameter = jvarray[0].year;
                var emp = jvarray[0].empid;
                var empTxt = jvarray[0].empname;
                var grautityamt = jvarray[0].gradutityamt;
                var employeecategory = jvarray[0].employeecategory;
                var subsidiary = jvarray[0].subsidiary;
                var paygroup = jvarray[0].paygroup;
                var employeecatagory = jvarray[0].employeecategory;
var employeeRecord = record.load({
            type: record.Type.EMPLOYEE,
            id: emp,
            isDynamic: false // Set to true if you need to trigger field sourcing/scripts
        });

        // 3. Get the specific field values
        var department = employeeRecord.getValue({
            fieldId: 'custentity_hris_empdepartment_new'
        });

        var subdepartment = employeeRecord.getValue({
            fieldId: 'custentity_hris_empsubdepartment__'
        });

        

// Call the function
var hrisDetails = getEmployeeHRISDetails(emp);

if (hrisDetails !== null) {

    // === Extract into individual variables ===
    var stdDeptName  = hrisDetails.stddeptname || '';
    var stdDeptId    = hrisDetails.stddeptid || '';
    var locationId   = hrisDetails.locationid || '';
    var locationName = hrisDetails.locationname || '';  

    // Now you can use them easily
    log.debug('Department Name', stdDeptName);
    log.debug('Department ID', stdDeptId);
    log.debug('Location Name', locationName);
    log.debug('Location ID', locationId);

    

} else {
    log.audit('No Data', 'HRIS details not found for employee ' + emp);
}
                var leavesalaryamt = jvarray[0].leavesalaryamt;
                var salaryadvanceamt = jvarray[0].salaryadvanceamt;
                var hraamount = jvarray[0].hraamount;
                var airticketamount = jvarray[0].airticketamount;
                var loanamount = jvarray[0].loanamount;
                var otheradditionamt = jvarray[0].otheradditionamt;
                var otherdeductionamt = jvarray[0].otherdeductionamt;
                var settleamount = 0;
                //   settleamount=(parseFloat(leavesalaryamt)+parseFloat(salaryadvanceamt)+parseFloat(hraamount)+parseFloat(airticketamount)+parseFloat(otheradditionamt))-(parseFloat(loanamount)+parseFloat(otherdeductionamt))
                settleamount = (parseFloat(leavesalaryamt) + parseFloat(salaryadvanceamt) + parseFloat(airticketamount) + parseFloat(grautityamt)) - parseFloat(loanamount)
               /*  var componentsql = " select * from  customrecord_hris_payroll_component where id  =" + paycomponent;

                log.debug('componentsql  ', componentsql);


                var queryResults = query.runSuiteQL({
                    query: componentsql
                });

                var componentsqlrecords = queryResults.asMappedResults();
                if (componentsqlrecords.length > 0) {
                    var sett_comp_accountCodeID = componentsqlrecords[0].custrecord_hris_account_name || '';
                    log.debug('Account id', sett_comp_accountCodeID);
                } */



                var jvObject = record.create({
                    type: 'journalentry',
                    isDynamic: true
                });
                var debit = 0;
                jvObject.setValue('customform', 162);

                jvObject.setValue('approvalstatus', 2);
                jvObject.setValue('subsidiary', subsidiariesRes);
                jvObject.setValue('trandate', today);
                jvObject.setText('postingperiod', month + " " + year);
                //by florence
                //jvObject.setValue('custbody_auto_num_business_area', 12);
                jvObject.setValue('memo', 'Final Settlement for ' + month + ' ' + year);
                //jvObject.setValue('custbody_dept_jv', departmentParam);
                jvObject.setValue('custbody_hris_paygroup_jv', paygroupParameter);
                jvObject.setValue('custbody_hris_jv_month', monthParameter);
                jvObject.setValue('custbody_hris_jv_year', yearParameter);
                //jvObject.setValue('custbody_hris_passjv_processtype', processType);
                /* if(processType == '2')
                { */
                jvObject.setValue('custbody_hris_jv_employeename', emp);
                jvObject.setValue('custbody_hris_jv_emplegalname', empTxt);
                //}

                if (salaryadvanceamt > 0) {

                    var FetchSalaryDetails = getleavesalarycomponentwise(leaveSettlemenID);
                    log.debug("FetchSalaryDetails", JSON.stringify(FetchSalaryDetails));
                    if (FetchSalaryDetails != null && FetchSalaryDetails.length > 0) {

                        for (var j = 0; j < FetchSalaryDetails.length; j++) {
                            var paycompid = FetchSalaryDetails[j].paycompid;
                            var paycompname1 = FetchSalaryDetails[j].paycompname || '';
                            var comp_accountCodeID1 = FetchSalaryDetails[j].comp_accountCodeID || '';
                            var componenttype = FetchSalaryDetails[j].componenttype;
                            var salaryamount = FetchSalaryDetails[j].salaryamount;




                            if (componenttype == 1) {

                                Deduct = parseFloat(salaryamount)
                                /*   var get_paycomponent = getleavesalarycomponent(paygroup);
                                  var getpaycomponent = get_paycomponent.toString().split("#");
              
                                  var comp_accountCodeID = getpaycomponent[0];
                                  var paycompname = getpaycomponent[2];
                                   */
                                jvObject.selectNewLine('line');
                                jvObject.setCurrentSublistValue('line', 'account', comp_accountCodeID1); //Credit Account code//Component_Code
                                jvObject.setCurrentSublistValue('line', 'debit', Deduct.toFixed(2));
                                jvObject.setCurrentSublistValue('line', 'credit', 0.0);
                                jvObject.setCurrentSublistValue('line', 'memo', paycompname1);
                                jvObject.setCurrentSublistValue('line', 'entity', emp);
                                jvObject.commitLine('line')

                                //salary payable component
                                var get_paycomponent = getsalarypayablecomponent(paygroup);
                                var getpaycomponent = get_paycomponent.toString().split("#");

                                var comp_accountCodeID = getpaycomponent[0];
                                var paycompname = getpaycomponent[2];

                                jvObject.selectNewLine('line');
                                jvObject.setCurrentSublistValue('line', 'account', comp_accountCodeID); //Credit Account code//Component_Code
                                jvObject.setCurrentSublistValue('line', 'debit', 0.0);
                                jvObject.setCurrentSublistValue('line', 'credit', Deduct.toFixed(2));
                                jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                                jvObject.setCurrentSublistValue('line', 'entity', emp);
                                jvObject.commitLine('line')



                            }
                            else {

                                Deduct = parseFloat(salaryamount)
                                /*   var get_paycomponent = getleavesalarycomponent(paygroup);
                                  var getpaycomponent = get_paycomponent.toString().split("#");
              
                                  var comp_accountCodeID = getpaycomponent[0];
                                  var paycompname = getpaycomponent[2];
                                   */
                                jvObject.selectNewLine('line');
                                jvObject.setCurrentSublistValue('line', 'account', comp_accountCodeID1); //Credit Account code//Component_Code
                                jvObject.setCurrentSublistValue('line', 'debit', 0.0);
                                jvObject.setCurrentSublistValue('line', 'credit', Deduct.toFixed(2));
                                jvObject.setCurrentSublistValue('line', 'memo', paycompname1);
                                jvObject.setCurrentSublistValue('line', 'entity', emp);
                                jvObject.commitLine('line')

                                //salary payable component
                                var get_paycomponent = getsalarypayablecomponent(paygroup);
                                var getpaycomponent = get_paycomponent.toString().split("#");

                                var comp_accountCodeID = getpaycomponent[0];
                                var paycompname = getpaycomponent[2];

                                jvObject.selectNewLine('line');
                                jvObject.setCurrentSublistValue('line', 'account', comp_accountCodeID); //Credit Account code//Component_Code
                                jvObject.setCurrentSublistValue('line', 'debit', Deduct.toFixed(2));
                                jvObject.setCurrentSublistValue('line', 'credit', 0.0);
                                jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                                jvObject.setCurrentSublistValue('line', 'entity', emp);
                                jvObject.commitLine('line')


                            }
                        }
                    }

                }
                if (grautityamt > 0) {
                    // gratuity debit
                    Deduct = parseFloat(grautityamt)

                    var get_paycomponent = getgrautitycomponent(paygroup);
                    var getpaycomponent = get_paycomponent.toString().split("#");
                    var comp_accountCodeID = getpaycomponent[0];
                    var paycomponent = getpaycomponent[1];
                    var paycompname = getpaycomponent[2];
                    var getgratuityaccountdetails = getgrautitycomponentaccount(paygroup,employeecatagory,department,subdepartment,paycomponent,subsidiary);
                    
                    var getgratuityaccount=getgratuityaccountdetails.toString().split("#"); 
                    var debitaccount=getgratuityaccount[0];
                    var creditaccount=getgratuityaccount[1];
                    jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account',debitaccount); //Credit Account code//Component_Code
                    jvObject.setCurrentSublistValue('line', 'debit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'credit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                    jvObject.setCurrentSublistValue('line', 'entity', emp);
                    
                        if (locationId != '') {
                            jvObject.setCurrentSublistValue({ 
                                sublistId: 'line', 
                                fieldId: 'location', 
                                value: locationId , 
                                ignoreFieldChange: true,
                                forceSyncSourcing: true 
                            });
                        }
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'cseg_hris_empdept',
                            value: department,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                         if(stdDeptId!=''){

                            jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department',
                            value: stdDeptId,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                        }
                    
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'custcol_hris_jv_employeecategory',
                            value: employeecategory
                        });
                       
                         jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'cseg_hris_empsubdpt',
                            value:subdepartment,
                           // ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'custcol_hris_jv_subdepartment',
                            value:subdepartment,
                            //ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                      
                        jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'cseg_hris_empdept', value: department });
                    jvObject.commitLine('line')

                    //gratuity credit
                    Deduct = parseFloat(grautityamt)

                  
                    jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account', creditaccount); //Credit Account code//Component_Code
                    jvObject.setCurrentSublistValue('line', 'debit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'credit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                    jvObject.setCurrentSublistValue('line', 'entity', emp);
                    
                        if (locationId != '') {
                            jvObject.setCurrentSublistValue({ 
                                sublistId: 'line', 
                                fieldId: 'location', 
                                value: locationId , 
                                ignoreFieldChange: true,
                                forceSyncSourcing: true 
                            });
                        }
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'cseg_hris_empdept',
                            value: department,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                         if(stdDeptId!=''){

                            jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department',
                            value: stdDeptId,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                        }
                    
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'custcol_hris_jv_employeecategory',
                            value: employeecategory
                        });
                       
                         jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'cseg_hris_empsubdpt',
                            value:subdepartment,
                           // ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'custcol_hris_jv_subdepartment',
                            value:subdepartment,
                            //ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                      
                        jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'cseg_hris_empdept', value: department });
    

                    jvObject.commitLine('line')


                }
                //loan amount 
                if (loanamount > 0) {
                    Deduct = parseFloat(loanamount)
                    var get_paycomponent = getloancomponent(paygroup);
                    var getpaycomponent = get_paycomponent.toString().split("#");
                    var comp_accountCodeID = getpaycomponent[0];
                      var paycomponent = getpaycomponent[1];
                    var paycompname = getpaycomponent[2];
                      var getloanaccountdetails = getloancomponentaccount(paygroup,employeecatagory,department,subdepartment,paycomponent,subsidiary);
                    var getloanaccount=getloanaccountdetails.toString().split("#"); 
                    var debitaccount=getloanaccount[0];
                    var creditaccount=getloanaccount[1];
                    jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account', debitaccount); //Debit Account code//Component_Code
                    jvObject.setCurrentSublistValue('line', 'debit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'credit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                    jvObject.setCurrentSublistValue('line', 'entity', emp);
                    jvObject.setCurrentSublistValue('line', 'entity_display', empTxt);
                    
                        if (locationId != '') {
                            jvObject.setCurrentSublistValue({ 
                                sublistId: 'line', 
                                fieldId: 'location', 
                                value: locationId , 
                                ignoreFieldChange: true,
                                forceSyncSourcing: true 
                            });
                        }
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'cseg_hris_empdept',
                            value: department,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                         if(stdDeptId!=''){

                            jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department',
                            value: stdDeptId,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                        }
                    
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'custcol_hris_jv_employeecategory',
                            value: employeecategory
                        });
                       
                         jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'cseg_hris_empsubdpt',
                            value:subdepartment,
                           // ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'custcol_hris_jv_subdepartment',
                            value:subdepartment,
                            //ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                      
                        jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'cseg_hris_empdept', value: department });

                    jvObject.commitLine('line')

                       jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account', creditaccount); //Credit Account code//Component_Code
                    jvObject.setCurrentSublistValue('line', 'debit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'credit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                    jvObject.setCurrentSublistValue('line', 'entity', emp);
                    jvObject.setCurrentSublistValue('line', 'entity_display', empTxt);
                    
                        if (locationId != '') {
                            jvObject.setCurrentSublistValue({ 
                                sublistId: 'line', 
                                fieldId: 'location', 
                                value: locationId , 
                                ignoreFieldChange: true,
                                forceSyncSourcing: true 
                            });
                        }
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'cseg_hris_empdept',
                            value: department,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                         if(stdDeptId!=''){

                            jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department',
                            value: stdDeptId,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                        }
                    
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'custcol_hris_jv_employeecategory',
                            value: employeecategory
                        });
                       
                         jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'cseg_hris_empsubdpt',
                            value:subdepartment,
                           // ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'custcol_hris_jv_subdepartment',
                            value:subdepartment,
                            //ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                      
                        jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'cseg_hris_empdept', value: department });

                    jvObject.commitLine('line')





                }
                if (leavesalaryamt > 0) {
                    //leave salary debit
                    Deduct = parseFloat(leavesalaryamt)
                   // var get_paycomponent = getadvancesalarycomponentdebit(paygroup);
                    var get_paycomponent = getleavesettlementcomponent(paygroup);
                    var getpaycomponent = get_paycomponent.toString().split("#");
                    var comp_accountCodeID = getpaycomponent[0];
                      var paycomponent = getpaycomponent[1];
                    var paycompname = getpaycomponent[2];
                        var getleaveaccountdetails = getleavecomponentaccount(paygroup,employeecatagory,department,subdepartment,paycomponent,subsidiary);
                    var getleaveaccount=getleaveaccountdetails.toString().split("#"); 
                    var debitaccount=getleaveaccount[0];
                    var creditaccount=getleaveaccount[1];
                    jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account',debitaccount); //Credit Account code//Component_Code
                    jvObject.setCurrentSublistValue('line', 'debit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'credit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                    jvObject.setCurrentSublistValue('line', 'entity', emp);
                    
                        if (locationId != '') {
                            jvObject.setCurrentSublistValue({ 
                                sublistId: 'line', 
                                fieldId: 'location', 
                                value: locationId , 
                                ignoreFieldChange: true,
                                forceSyncSourcing: true 
                            });
                        }
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'cseg_hris_empdept',
                            value: department,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                         if(stdDeptId!=''){

                            jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department',
                            value: stdDeptId,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                        }
                    
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'custcol_hris_jv_employeecategory',
                            value: employeecategory
                        });
                       
                         jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'cseg_hris_empsubdpt',
                            value:subdepartment,
                           // ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'custcol_hris_jv_subdepartment',
                            value:subdepartment,
                            //ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                      
                        jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'cseg_hris_empdept', value: department });

                    jvObject.commitLine('line')

                   
                  
                    jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account', creditaccount); //Credit Account code//Component_Code
                    jvObject.setCurrentSublistValue('line', 'debit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'credit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                    jvObject.setCurrentSublistValue('line', 'entity', emp);
                    
                        if (locationId != '') {
                            jvObject.setCurrentSublistValue({ 
                                sublistId: 'line', 
                                fieldId: 'location', 
                                value: locationId , 
                                ignoreFieldChange: true,
                                forceSyncSourcing: true 
                            });
                        }
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'cseg_hris_empdept',
                            value: department,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                         if(stdDeptId!=''){

                            jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department',
                            value: stdDeptId,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        });
                        }
                    
                           jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'custcol_hris_jv_employeecategory',
                            value: employeecategory
                        });
                       
                         jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'cseg_hris_empsubdpt',
                            value:subdepartment,
                           // ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'custcol_hris_jv_subdepartment',
                            value:subdepartment,
                            //ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        });
                      
                        jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'cseg_hris_empdept', value: department });

                    jvObject.commitLine('line')
                }
              
               
           /*      var jvrecordId = jvObject.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                log.debug("jvrecordid", jvrecordId);

                var leavesettleID = record.submitFields({
                    type: 'customrecord_hris_finasettlement_process',
                    id: leaveSettlemenID,
                    values: {
                        'custrecord_hris_fin_jo_no': jvrecordId
                    }
                }); */

                log.debug("Info", "Leave settlement voucher Updated. Internal ID : " + leavesettleID);

                var url = '/app/common/custom/custrecordentry.nl?rectype=2241&id=' + leavesettleID


                window.location.href = url;
            }
            catch (e) {
                log.error("Error in JV Creation", e.message);
                // log.debug("Error in getEmpTotalLeaveTaken : " + e);
            }

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
        }

        function getadvancesalarycomponentdebit(paygroup) {
            var comp_accountCodeID = ''
            var componentsql = " select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 51 and custrecord_hris_pay_process_group  =" + paygroup;

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
        function getadvancesalarycomponentcredit(paygroup) {
            var comp_accountCodeID = ''
            var componentsql = " select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 48 and custrecord_hris_pay_process_group  =" + paygroup;

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
            var componentsql = "select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 48 and custrecord_hris_pay_process_group  =" + paygroup;

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
        function getsalarypayablecomponent(paygroup) {
            var comp_accountCodeID = ''
            var componentsql = "select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 81 and custrecord_hris_pay_process_group  =" + paygroup;

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
        function getleavesettlementcomponent(paygroup) {
            debugger;
            var comp_accountCodeID = ''
            var componentsql = "select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component where isinactive = 'F' and custrecord_hris__sequence_no_ = 46 and custrecord_hris_pay_process_group  =" + paygroup;

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

        function getleavesalarycomponentwise(leaveSettlemenID) {
            var comp_accountCodeID = ''
            var DataArray = [];
            var componentsql = "select c.id as paycompid,BUILTIN.DF(c.id) as paycompname,c.custrecord_hris_account_name as accountid,\
                            c.custrecord_hris_payroll_component_type as componenttype, b.custrecord_hris_saladv_salaryamount salaryamount  from customrecord_hris_finasettlement_process a \
                            join customrecord_hris_salaryadvancedetails b on a.id=b.custrecord_hris_saladv_settlelink join\
                             customrecord_hris_payroll_component c on b.custrecord_hris_saladv_payrollcomponent = c.id\
                             where a.id="+ leaveSettlemenID + ""
            log.debug('componentsql  ', componentsql);


            var queryResults = query.runSuiteQL({
                query: componentsql
            });

            var componentsqlrecords = queryResults.asMappedResults();
            if (componentsqlrecords.length > 0) {
                for (var i = 0; i < componentsqlrecords.length; i++) {

                    var paycompid = componentsqlrecords[i].paycompid;
                    var paycompname = componentsqlrecords[i].paycompname;
                    comp_accountCodeID = componentsqlrecords[i].accountid;
                    log.debug('Account id', comp_accountCodeID);
                    var componenttype = componentsqlrecords[i].componenttype;
                    var salaryamount = componentsqlrecords[i].salaryamount;
                    DataArray.push({
                        'paycompid': paycompid,
                        'paycompname': paycompname,
                        'comp_accountCodeID': comp_accountCodeID,
                        'componenttype': componenttype,
                        'salaryamount': salaryamount,


                    });


                }
            }

            return DataArray;
        }
        //grautity account amount
        function getgrautitycomponent(paygroup) {
            debugger;
            var comp_accountCodeID = ''
            var componentsql = " select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 47 and custrecord_hris_pay_process_group  =" + paygroup;

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
        

  function getgrautitycomponentaccount(paygroup,employeecategory,department,subdepartment,paycomponent,subsidiary) {
    debugger;
            var comp_accountCodeID = ''
               var componentsql ="select * from customrecord_hris_accountmapping where custrecord_hris_acctmap_paygroup ="+paygroup+" and custrecord_hris_acctmap_department = "+department +" \
                         and custrecord_hris_acctmap_employeecategory = " + employeecategory + " and custrecord_hris_acctmap_paycomponent = " + paycomponent + " and custrecord_hris_acctmap_subsidiary = " + subsidiary + " \
                          and custrecord_hris_acctmap_subdepartment = " + subdepartment + " and custrecord_hris_acctmap_accuraltype =3 and custrecord_hris_acctmap_transactiontype=7 and isinactive ='F'";
            log.debug('componentsql  ', componentsql);


            var queryResults = query.runSuiteQL({
                query: componentsql
            });

            var componentsqlrecords = queryResults.asMappedResults();
            if (componentsqlrecords.length > 0) {
                var glaccount = componentsqlrecords[0].custrecord_hris_acctmap_glcode;
                var salaryaccount = componentsqlrecords[0].custrecord_hris_acctmap_salarypayableacc;
              
            }

            return glaccount + "#" + salaryaccount;
        }
 function getleavecomponentaccount(paygroup,employeecategory,department,subdepartment,paycomponent,subsidiary) {
    debugger;
            var comp_accountCodeID = ''
               var componentsql ="select * from customrecord_hris_accountmapping where custrecord_hris_acctmap_paygroup ="+paygroup+" and custrecord_hris_acctmap_department = "+department +" \
                         and custrecord_hris_acctmap_employeecategory = " + employeecategory + " and custrecord_hris_acctmap_paycomponent = " + paycomponent + " and custrecord_hris_acctmap_subsidiary = " + subsidiary + " \
                          and custrecord_hris_acctmap_subdepartment = " + subdepartment + " and custrecord_hris_acctmap_accuraltype =1 and custrecord_hris_acctmap_transactiontype=3 and isinactive ='F'";
            log.debug('componentsql  ', componentsql);


            var queryResults = query.runSuiteQL({
                query: componentsql
            });

            var componentsqlrecords = queryResults.asMappedResults();
            if (componentsqlrecords.length > 0) {
                var glaccount = componentsqlrecords[0].custrecord_hris_acctmap_glcode;
                var salaryaccount = componentsqlrecords[0].custrecord_hris_acctmap_salarypayableacc;
              
            }

            return glaccount + "#" + salaryaccount;
        }
function getloancomponentaccount(paygroup,employeecategory,department,subdepartment,paycomponent,subsidiary) {
    debugger;
            var comp_accountCodeID = ''
               var componentsql ="select * from customrecord_hris_accountmapping where custrecord_hris_acctmap_paygroup ="+paygroup+" and custrecord_hris_acctmap_department = "+department +" \
                         and custrecord_hris_acctmap_employeecategory = " + employeecategory + " and custrecord_hris_acctmap_paycomponent = " + paycomponent + " and custrecord_hris_acctmap_subsidiary = " + subsidiary + " \
                          and custrecord_hris_acctmap_subdepartment = " + subdepartment + "  and isinactive ='F'";
            log.debug('componentsql  ', componentsql);


            var queryResults = query.runSuiteQL({
                query: componentsql
            });

            var componentsqlrecords = queryResults.asMappedResults();
            if (componentsqlrecords.length > 0) {
                var glaccount = componentsqlrecords[0].custrecord_hris_acctmap_glcode;
                var salaryaccount = componentsqlrecords[0].custrecord_hris_acctmap_salarypayableacc;
              
            }

            return glaccount + "#" + salaryaccount;
        }
        function getEmployeeHRISDetails  (empId)  {
            debugger;
        try {
            var sql = " SELECT \
                    D.ID AS deptId, \
                    D.name AS deptName, \
                    D.parent AS deptParentId, \
                    BUILTIN.DF(D.parent) AS deptParentName, \
                    S.custrecord_hris_standlocation AS locationId, \
                    BUILTIN.DF(S.custrecord_hris_standlocation) AS locationName \
                FROM employee E \
                LEFT JOIN  department D ON E.custentity_hris_empdepartment_new = D.custrecord_hris_departmenthrms \
                AND (E.custentity_hris_empsubdepartment__ = D.custrecord_hris_subdepartmenthrms OR D.custrecord_hris_subdepartmenthrms IS NULL) \
                LEFT JOIN subsidiary S ON E.subsidiary = S.id \
                WHERE E.id = " + empId + " "
                log.emergency('getEmployeeHRISDetails SQL', sql);

            var queryResults = query.runSuiteQL({
                query: sql,               
            }).asMappedResults();

            if (queryResults.length === 0) {
                log.audit('getEmployeeHRISDetails', 'No record found for empId: ' + empId);
                return null;
            }

       var row = queryResults[0];

        // Fixed: No backticks
        var stdDeptName = row.deptparentid
            ? row.deptparentname + " : " + row.deptname
            : row.deptname;

        return {
            stddeptname: stdDeptName,
            stddeptid: row.deptid,
            locationid: row.locationid,
            locationname: row.locationname
        };
    } catch (e) {
        log.error('getEmployeeHRISDetails Error', e.message);
        return null;
    }
    };

   
        function getairticketcomponentdebit(paygroup) {
            var comp_accountCodeID = ''
            var componentsql = " select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 37 and custrecord_hris_pay_process_group  =" + paygroup;

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
        function getairticketcomponentcredit(paygroup) {
            var comp_accountCodeID = ''
            var componentsql = " select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid from  customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 36 and custrecord_hris_pay_process_group  =" + paygroup;

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

        function getotherdeduction(paygroup) {
            var comp_accountCodeID = ''
            var componentsql = " select id as paycompid,BUILTIN.DF(id) paycompname,custrecord_hris_account_name as accountid  from  customrecord_hris_payroll_component where custrecord_hris__sequence_no_ = 64 and custrecord_hris_pay_process_group  =" + paygroup;

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

        //loan payroll component
        function getloancomponent(paygroup) {
            debugger;
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
        function additiondeduction(paygroup, currentRecord) {
            var recordObj = currentRecord.get();
            var componentsql = "select * from customrecord_hris_payroll_component where \
             custrecord_hris__sequence_no_ in(20,61) and custrecord_hris_pay_process_group ="+ paygroup;
            log.debug('componentsql', componentsql);
            var componentsqlrecords = getResult(componentsql);

            if (componentsqlrecords.length > 0) {
                for (var k = 0; k < componentsqlrecords.length; k++) {
                    var paycomponent = componentsqlrecords[k].id;

                    recordObj.selectNewLine({
                        sublistId: 'recmachcustrecord_hris_finset_link',
                        line: i
                    });
                    recordObj.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_finset_link',
                        fieldId: 'custrecord_hris_fin_detailsprocessgrp',
                        value: paygroup,
                        ignoreFieldChange: false,
                    });
                    recordObj.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_finset_link',
                        fieldId: 'custrecord_hris_fin_details_paycom',
                        value: paycomponent,
                        ignoreFieldChange: false,
                    });

                    recordObj.commitLine({
                        sublistId: 'recmachcustrecord_hris_finset_link'
                    });
                }
            }
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

 function createJVPreview() {
    debugger;
            var recordObj= currentRecord.get();
       var settlementId = recordObj.id;

    if (!settlementId) {
        alert("Please save the record first!");
        return;
    }     
            // Resolve Suitelet URL
            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_hris_final_setjv_report_jv', 
                deploymentId: 'customdeploy_hris_final_setjv_report_jv', 
                params: {
                
                    settlementId: settlementId
                }
            });

            // Open PDF in new tab
            window.open(suiteletUrl);
        }
function createjvcreation() {
    debugger;
            var recordObj= currentRecord.get();
       var settlementId = recordObj.id;

    if (!settlementId) {
        alert("Please save the record first!");
        return;
    }     
            // Resolve Suitelet URL
            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_hris_final_setjv_creatio_jv', 
                deploymentId: 'customdeploy_hris_final_setjv_creatio_jv', 
                params: {
                
                    settlementId: settlementId
                }
            });

            // Open PDF in new tab
            window.open(suiteletUrl);
        }

        function leavesalary() {

            debugger;
            try {
                var recordObj = currentRecord.get();
                var settlementid = recordObj.getValue('id') || '';
                var AdvanceSalDays = 0;
                var NetPay = 0;
                var Basic = 0;
                var EmpLeaveSalBase = 0;
                var NoOfYears = 0;
                var airticketyears = 0;
                var yearleavecal = 0;
                var monthleavecal = 0;
                var DayBasic = 0;
                var DayLeaveSal = 0;
                var SalAdvanceAmt = 0;
                var LeaveSalAmt = 0;
                var leavesalaryamount = 0;
                var airticketamount = 0;
                var airamount = 0;
                var salaryadvanceamt = 0;
                var gratuitybasic = 0;
                var leavegrosspay = 0;
                var HRAAmt = 0;
                var gratuityAmt = 0;
                var gratuityprovision = 0;
                var gratuitydifference = 0;
                var advancesalaryamount = 0;
                var leavegrosspay =0;
                  var emp = recordObj.getValue('custrecordhris_fin_emplo_name');
                var fromdate = recordObj.getValue('custrecord_hris_fin_date_of_leave');
                var dol = recordObj.getValue('custrecord_hris_fin_date_of_leave');
                var leavingdate = recordObj.getValue('custrecord_hris_fin_date_of_leave');
                var rejoindate = recordObj.getValue('custrecord_hris_fin_rejoin_date') || '';
                var hiredate = recordObj.getValue('custrecord_hris_fin_date_of_join');
                var employeecatagoryid = recordObj.getValue('custrecord_hirs_fin_employee_cat');
                var leaveentitlement = recordObj.getValue('custrecord_hris_fin_leave_entitlement');
                var paygroup = recordObj.getValue('custrecord_hris_fin_payprocessgrp');
                var NoOfDays = recordObj.getValue('custrecord_hrms_lveset_totleavedays');
                var grosspay = 0;
              var lastFinDate=recordObj.getValue('custrecord_hris_final_settlement_last_pa');
                var yearairticketcal = 0;
                var monthairticketcal = 0;
                var salarypendinglopdays = 0;
                var salarypendingattendancelopdays = 0;
    if(lastFinDate){
       var finLastDate = format.parse({
                    value: lastFinDate,
                    type: format.Type.DATE
                });
    }          

      var lopdaysdetails = getLopDays(emp);
             
                var lopdays = lopdaysdetails.lopdays || 0;
                recordObj.setValue({
                    fieldId:'custrecord_hris_fin_unpaid_during_nperid',                                    
                    value: lopdays, 
                    ignoreFieldChange: true
                });

                   var doj = recordObj.getValue('custrecord_hris_fin_date_of_join');
                    var dol = recordObj.getValue('custrecord_hris_fin_date_of_leave');
                    var unpaiddays = recordObj.getValue('custrecord_hris_fin_unpaid_during_nperid')||0;
                  
                     if(doj && dol) {
                    NoOfWorkingyears = CountDays_BetweenTwodates(doj, dol,unpaiddays);
                  
                    recordObj.setValue({
                        fieldId: 'custrecord_hris_fin_no_of_years_of_serv',
                        value: NoOfWorkingyears,
                        ignoreFieldChange: true
                    });
                }
                    var NoOfYears = recordObj.getValue('custrecord_hris_fin_no_of_years_of_serv');
                //Last Working Date
                var parsedDate = format.parse({
                    value: fromdate,
                    type: format.Type.DATE
                });
                //var previousDate = moment(fromdate, "dd/mm/yyyy").subtract(1, 'days').format("dd/mm/yyyy");
                var previousDate = parsedDate.setDate(parsedDate.getDate() - 1);

                // Format the previous date to the NetSuite date format
                previousDate = format.parse({
                    value: parsedDate,
                    type: format.Type.DATE
                });
                // previousDate = moment(previousDate, "dd/mm/yyyy") */
                /* if (previousDate) {
                        previousDate = format.format({
                            value: previousDate,
                            type: format.Type.DATE,
                            timezone: format.Timezone.ASIA_MUSCAT
                        }); */
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_lastwork_date',
                    value: previousDate,
                    ignoreFieldChange: true
                });

                //}

                var details = getLeavingDateDetails(leavingdate, format);
                if (details) {
                var leavingmonth = details.month;
                var leavingyear = details.year;
                gratuityprovision =getgratuityprovision(leavingmonth, leavingyear,emp);
                 recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_gratuit_provamt',
                    value: gratuityprovision.toFixed(2),
                    ignoreFieldChange: true
                });
        
         
            log.debug('Extracted Date', 'Month: ' + details.month + ' Year: ' + details.year);
        }


        var prevInfo = getPreviousMonthDate(leavingdate, format);

if (prevInfo && gratuityprovision==0) {
    var prevYear = prevInfo.year;
    var prevMonth = prevInfo.month;
    var prevMonthPadded = prevInfo.monthPadded;
    var prevYearMonth = prevInfo.yearMonthString;   // Best for SQL queries

    log.debug('Previous Month Info', {
        year: prevYear,
        month: prevMonth,
        monthPadded: prevMonthPadded,
        yearMonth: prevYearMonth
    });
 gratuityprovision =getgratuityprovision(prevMonth, prevYear,emp);
                 recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_gratuit_provamt',
                    value: gratuityprovision.toFixed(2),
                    ignoreFieldChange: true
                });
   
}
var leavebalance = searchLeaveBalance(emp);
 recordObj.setValue({
            fieldId: 'custrecord_hris_fin_annual_leave_availab',
            value: leavebalance,
            ignoreFieldChange: true
        });

          leavegrosspay=  gettingleaveaccuralbasesalary(emp); 
          recordObj.setValue({
            fieldId: 'custrecord_hris_fin_grosspay',
            value: leavegrosspay,
            ignoreFieldChange: true
        });
        var accuralcatdays =getLeaveAccuralcatDays(leaveentitlement,employeecatagoryid);
            leavesalaryamount= (parseFloat(leavegrosspay)/parseFloat(accuralcatdays))*parseFloat(leavebalance);
        recordObj.setValue({
            fieldId: 'custrecord_hris_fin_leave_salary_amt',
            value: leavesalaryamount.toFixed(4),
            ignoreFieldChange: true
        });
           recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_actlvesalaryamt',
                    value: leavesalaryamount.toFixed(4),
                    ignoreFieldChange: true
                });
                var get_wage_date = search_wageperiod(paygroup);
                var w_Date = get_wage_date.toString().split("#");
                var end_date = w_Date[0];
                var start_date = w_Date[1];
                var wage_month = w_Date[2];
                var wage_year = w_Date[3];
                var CalDays = w_Date[4];
                  //--Salary Advance Days fromdate is 1 day prior to the leaving date
// Changed on 07/09/2026
               // AdvanceSalDays = CountDays_BetweenTwodatesWorking(finLastDate, fromdate);
                 AdvanceSalDays = CountDays_BetweenTwodatesWorking(finLastDate, dol);
                salarypendinglopdays =getLopDayspendingsalary(emp,leavingdate,finLastDate,format);
                var attendance = getAttendanceSummary(emp, finLastDate, leavingdate,format);



if (attendance.length > 0) {
    var presentCount = attendance[0].present_count;
   salarypendingattendancelopdays  = attendance[0].absent_count;
    var weeklyOT = attendance[0].weekly_ot;
    var holidayOT = attendance[0].holi_ot;
    var rotationOT = attendance[0].rot_ot;

    log.debug("Present", presentCount);
    log.debug("Absent", salarypendingattendancelopdays);
    log.debug("Weekly OT", weeklyOT);
}
             //   salarypendingattendancelopdays = getSalaryPendingAttendanceLopDays(emp, finLastDate, fromdate);

                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_total_salpenddays',
                    value: AdvanceSalDays,
                    ignoreFieldChange: true
                });
                if (salarypendinglopdays > 0) {
                    
                    var totalpendingdays = parseFloat(AdvanceSalDays) -parseFloat(salarypendinglopdays) ;
                    recordObj.setValue({
                        fieldId: 'custrecord_hris_fin_salpendlopdays',
                        value: salarypendinglopdays,
                        ignoreFieldChange: true
                    }); 
                }
                else if (salarypendingattendancelopdays > 0) {
                     var totalpendingdays = parseFloat(AdvanceSalDays) -parseFloat(salarypendingattendancelopdays) ;
                     recordObj.setValue({
                        fieldId: 'custrecord_hris_fin_salpendlopdays',
                        value: salarypendingattendancelopdays,
                        ignoreFieldChange: true
                    });
                }   
                else{
                    var totalpendingdays = parseFloat(AdvanceSalDays)
                }  
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_salary_advance',
                    value: totalpendingdays,
                    ignoreFieldChange: true
                });

                
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_actsaladvancedays',
                    value: totalpendingdays,
                    ignoreFieldChange: true
                });

                  var GetSalary = EmpSalaryDetails(emp, paygroup);
                log.debug("GetSalary", JSON.stringify(GetSalary));

              //  var FetchSalaryDetails = CollectSalaryDetails(AdvanceSalDays, CalDays, GetSalary);
              var FetchSalaryDetails = CollectSalaryDetails(totalpendingdays, CalDays, GetSalary);
                log.debug("FetchSalaryDetails", JSON.stringify(FetchSalaryDetails));
                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hris_saladv_settlelink'
                });
                log.debug('sublistcount', sublistcount);


                if (FetchSalaryDetails != null && FetchSalaryDetails.length > 0) {
                    if (sublistcount > 0) {
                        for (var h = sublistcount - 1; h >= 0; h--) {
                            recordObj.removeLine({
                                sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                                line: h
                            });
                        }
                        if (settlementid != '') {
                            var advancesalarysql = "select * from customrecord_hris_salaryadvancedetails where 	custrecord_hris_saladv_settlelink =" + settlementid;
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
                                        type: 'customrecord_hris_salaryadvancedetails',
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
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink'
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_paygroup',
                            value: paygroup,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_payrollcomponent',
                            value: Code,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_monthlyamount',
                            value: Amount,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_salaryamount',
                            value: salaryamount,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_componenttype',
                            value: componenttype,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_sequenceno',
                            value: seqno,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        advancesalaryamount = parseFloat(advancesalaryamount) + parseFloat(salaryamount);
                        recordObj.commitLine({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink'
                        });
                    }
                }
                advancesalaryamount = advancesalaryamount.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_salarys_advance',
                    value: advancesalaryamount,
                    ignoreFieldChange: true
                });
 
             /*       DayBasic = Basic / CalDays;

                //--Day LeaveSalary
                DayLeaveSal = EmpLeaveSalBase / CalDays;

                //--Days between payroll date to leave start date for advance salary calculation
                SalAdvanceAmt = (NetPay / CalDays) * AdvanceSalDays;
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_salarys_advance',
                    value: SalAdvanceAmt.toFixed(2),
                    ignoreFieldChange: true
                });
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_actsaladvanceamt',
                    value: SalAdvanceAmt.toFixed(2),
                    ignoreFieldChange: true
                });


                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_salaryadvanceamount',
                    value: SalAdvanceAmt.toFixed(2),
                    ignoreFieldChange: true
                }); */

                        recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_salarys_advance',
                    value: advancesalaryamount,
                    ignoreFieldChange: true
                });
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_actsaladvanceamt',
                    value: advancesalaryamount,
                    ignoreFieldChange: true
                });


                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_salaryadvanceamount',
                    value: advancesalaryamount,
                    ignoreFieldChange: true
                });

                start_date = format.parse({
                    value: start_date,
                    type: format.Type.DATE
                });
                //--Salary Advance Days
             /*    AdvanceSalDays = CountDays_BetweenTwodatesWorking(finLastDate, fromdate);

                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_salary_advance',
                    value: AdvanceSalDays,
                    ignoreFieldChange: true
                });
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_actsaladvancedays',
                    value: AdvanceSalDays,
                    ignoreFieldChange: true
                });
 */

                //--Net pay
                NetPay = getnetpay(emp);

                //--DayBasic
                Basic = daybasic(emp);
                 
                gratuitybasic = gettinggratuitycompoamount(emp);

                //--EmpLeaveSalBased on component total
                EmpLeaveSalBase = getempleavesalbase(emp);

               /*  //--No of working years
                if (rejoindate != '') {
                    NoOfYears = CountDays_BetweenTwodates(rejoindate, fromdate);
                } else if (rejoindate == '') {
                    NoOfYears = CountDays_BetweenTwodates(hiredate, fromdate);
                } */

                //Airticket years
                airticketyears = CountDays_BetweenTwodates(hiredate, fromdate);

                //    --Calender Days for payroll month


                //--Day Basic 
                DayBasic = Basic / CalDays;

                //--Day LeaveSalary
                DayLeaveSal = EmpLeaveSalBase / CalDays;

              
                var employeecatagory = getemployeecatagorysequence(employeecatagoryid);
             
                    
                LeaveSalAmt = getleavesalaryamount(emp);
                LeaveSalAmt = LeaveSalAmt.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_leave_prov_amount',
                    value: LeaveSalAmt,
                    ignoreFieldChange: true
                });

              /*   recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_actlvesalaryamt',
                    value: LeaveSalAmt,
                    ignoreFieldChange: true
                }); */
                // Loan Advance Amount
                var salaryadvanceamt = advancesalary(emp);
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_loan_amt',
                    value: salaryadvanceamt,
                    ignoreFieldChange: true
                });

                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_actloanamount',
                    value: salaryadvanceamt,
                    ignoreFieldChange: true
                });
      
         

              

          
         
              gratuityAmt=calculateGratuity(gratuitybasic, NoOfYears,paygroup);
                //gratuityAmt = getgratuityaccuralamount(emp)
                gratuityAmt = gratuityAmt.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_gratuity_amount',
                    value: gratuityAmt,
                    ignoreFieldChange: true,
                });
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_actgratuityamt',
                    value: gratuityAmt,
                    ignoreFieldChange: true,
                });
                    recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_basicpay',
                    value: gratuitybasic,
                    ignoreFieldChange: true,
                });
                        var provAmt     = parseFloat(recordObj.getValue('custrecord_hris_fin_gratuit_provamt')) || 0;
        var gratuityAmt = parseFloat(recordObj.getValue('custrecord_hris_fin_gratuity_amount')) || 0;

        // Difference = Provision - Actual Gratuity
        // If gratuityAmt is greater → Result will be NEGATIVE
        gratuitydifference = Math.abs(provAmt - gratuityAmt);
        recordObj.setValue({
            fieldId: 'custrecord_hris_fin_gratuit_difference',
            value: gratuitydifference.toFixed(2)
        });
              /*   var GetSalary = EmpSalaryDetails(emp, paygroup);
                log.debug("GetSalary", JSON.stringify(GetSalary));

                var FetchSalaryDetails = CollectSalaryDetails(AdvanceSalDays, CalDays, GetSalary);
                log.debug("FetchSalaryDetails", JSON.stringify(FetchSalaryDetails));
                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_hris_saladv_settlelink'
                });
                log.debug('sublistcount', sublistcount);
                // for refresh the sublist
                if (sublistcount > 0) {
                    for (var h = sublistcount - 1; h >= 0; h--) {
                        recordObj.removeLine({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            line: h
                        });
                    }
                }

                if (FetchSalaryDetails != null && FetchSalaryDetails.length > 0) {

                    for (var j = 0; j < FetchSalaryDetails.length; j++) {
                        var paygroup = FetchSalaryDetails[j].paygroup;
                        var Code = FetchSalaryDetails[j].code || '';
                        var Amount = FetchSalaryDetails[j].amount || 0;
                        var Name = FetchSalaryDetails[j].name || '';
                        var componenttype = FetchSalaryDetails[j].componenttype;
                        var seqno = FetchSalaryDetails[j].seqno;
                        var salaryamount = FetchSalaryDetails[j].salaryamount;



                        recordObj.selectNewLine({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink'
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_paygroup',
                            value: paygroup,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_payrollcomponent',
                            value: Code,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_monthlyamount',
                            value: Amount,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_salaryamount',
                            value: salaryamount,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_componenttype',
                            value: componenttype,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink',
                            fieldId: 'custrecord_hris_saladv_sequenceno',
                            value: seqno,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });


                        recordObj.commitLine({
                            sublistId: 'recmachcustrecord_hris_saladv_settlelink'
                        });
                    }
                } */

                //loan details custom record
                var LoanDetails = getloandetails(emp);
                log.debug("LoanDetails", JSON.stringify(LoanDetails));
                var sublistcount = recordObj.getLineCount({
                    sublistId: 'recmachcustrecord_njt_fin_loan_set_link'
                });
                log.debug('sublistcount', sublistcount);
                if (sublistcount > 0) {
                    for (var h = sublistcount - 1; h >= 0; h--) {
                        recordObj.removeLine({
                            sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
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
                            sublistId: 'recmachcustrecord_njt_fin_loan_set_link'
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
                            fieldId: 'custrecord_njt_fin_set_loan_rec',
                            value: loanid,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
                            fieldId: 'custrecord_njt_fin_set_loan_type',
                            value: loantype,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
                            fieldId: 'custrecord_njt_fin_set_loan_amount',
                            value: loanamt.toFixed(2),
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
                            fieldId: 'custrecord_njt_fin_sett_paid_amt',
                            value: paidamt.toFixed(2),
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
                            fieldId: 'custrecord_njt_fin_sett_outstand_amt',
                            value: outstandingamt.toFixed(2),
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_njt_fin_loan_set_link',
                            fieldId: 'custrecord_njt_fin_settl_amt_paid',
                            value: outstandingamt.toFixed(2),
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });

                        totalloanamount = parseFloat(totalloanamount) + parseFloat(outstandingamt);
                        recordObj.commitLine({
                            sublistId: 'recmachcustrecord_njt_fin_loan_set_link'
                        });
                    }

                }
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_loan_amt',
                    value: totalloanamount.toFixed(2),
                    ignoreFieldChange: true

                });
                var leavesalaryamt = recordObj.getValue('custrecord_hris_fin_leave_salary_amt') || 0;
                var salaryadvanceamt = recordObj.getValue('custrecord_hris_fin_salarys_advance') || 0;
                //var hraamount = recordObj.getValue('custrecord_hrms_lveset_hraamount') || 0;
                var airticketamount = recordObj.getValue('custrecord_hris_fin_airtick_amt') || 0;
                var loanamount = recordObj.getValue('custrecord_hris_fin_loan_amt') || 0;
                var otheradditionamt = recordObj.getValue('custrecord_hris_fin_other_addition') || 0;
                var otherdeductionamt = recordObj.getValue('custrecord_hris_fin_other_deduction') || 0;
                var gradutityamt = recordObj.getValue('custrecord_hris_fin_gratuity_amount') || 0;
                var otAmt = recordObj.getValue('custrecord_hirs_fin_otamt') || 0;

                settleamount = (parseFloat(leavesalaryamt) + parseFloat(salaryadvanceamt) + parseFloat(otAmt) + parseFloat(gradutityamt) + parseFloat(airticketamount) + parseFloat(otheradditionamt)) - (parseFloat(loanamount) + parseFloat(otherdeductionamt));
                settleamount = settleamount.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_net_amt',
                    value: settleamount,
                    ignoreFieldChange: true

                });

                // actual amount
                var actualleavesalaryamt = recordObj.getValue('custrecord_hris_fin_actlvesalaryamt') || 0;
                var actualsalaryadvanceamt = recordObj.getValue('custrecord_hris_fin_actsaladvanceamt') || 0;

                var actualairticketamount = recordObj.getValue('custrecord_hris_fin_actairticketamount') || 0;
                var actualloanamount = recordObj.getValue('custrecord_hris_fin_actloanamount') || 0;
                var actualgradutityamt = recordObj.getValue('custrecord_hris_fin_actgratuityamt') || 0;


                actualsettleamount = (parseFloat(actualleavesalaryamt) + parseFloat(actualsalaryadvanceamt) + parseFloat(otAmt) + parseFloat(actualgradutityamt) + parseFloat(actualairticketamount) + parseFloat(otheradditionamt)) - (parseFloat(actualloanamount) + parseFloat(otherdeductionamt));
                actualsettleamount = actualsettleamount.toFixed(2);
                recordObj.setValue({
                    fieldId: 'custrecord_hris_fin_actnetamount',
                    value: actualsettleamount,
                    ignoreFieldChange: true

                });
                var handover=false;
                var assetissuedetails=getassetissuedetails(emp);

                log.audit("assetissuedetails",assetissuedetails);
                if (assetissuedetails.length > 0) {
                  for (var asset = 0; asset < assetissuedetails.length; asset++) {
                      recordObj.selectNewLine({
                          sublistId: 'recmachcustrecord_hris_final_sett_link'
                      });
              
                      var detail = assetissuedetails[asset];
              
                      // Map each field below
                      recordObj.setCurrentSublistValue({
                          sublistId: 'recmachcustrecord_hris_final_sett_link',
                          fieldId: 'custrecord_hris_aset_req_id',
                          value: detail.reqId,
                          ignoreFieldChange:true
                      });
                      if (detail.requestDate) {
                        var formattedDate = format.format({
                            value: detail.requestDate,
                            type: format.Type.DATE
                        });
                        var partsexpiry = formattedDate.split('/');
          var dateObjexpiry = new Date(partsexpiry[2], partsexpiry[1] - 1, partsexpiry[0]);
   
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_final_sett_link',
                            fieldId: 'custrecord_hris_assst_request_date',
                            value: dateObjexpiry,
                            ignoreFieldChange: true
                        });
                    }
                      
                      recordObj.setCurrentSublistValue({
                          sublistId: 'recmachcustrecord_hris_final_sett_link',
                          fieldId: 'custrecord_hris_asset_ass_type',
                          value: detail.assetType,
                          ignoreFieldChange: true
                      });
                      
                      recordObj.setCurrentSublistValue({
                          sublistId: 'recmachcustrecord_hris_final_sett_link',
                          fieldId: 'custrecord_hris_asset_ass_name',
                          value: detail.assetName,
                          ignoreFieldChange: true
                      });
                      
                      recordObj.setCurrentSublistValue({
                          sublistId: 'recmachcustrecord_hris_final_sett_link',
                          fieldId: 'custrecord_hris_asset_employee_name',
                          value: detail.employeeName,
                          ignoreFieldChange: true
                      });
                      
                      recordObj.setCurrentSublistValue({
                          sublistId: 'recmachcustrecord_hris_final_sett_link',
                          fieldId: 'custrecord_hris_asset_emplo_code',
                          value: detail.employeeCode,
                          ignoreFieldChange: true
                      });
                      
                      // recordObj.setCurrentSublistValue({ sublistId: 'recmachcustrecord_hris_final_sett_link', fieldId: 'custrecord_hris_asset', value: detail.asset });


                      recordObj.setCurrentSublistValue({
                          sublistId: 'recmachcustrecord_hris_final_sett_link',
                          fieldId: 'custrecord_hris_asset_comment',
                          value: detail.comment,
                          ignoreFieldChange: true
                      });
                      
                     
                      recordObj.setCurrentSublistValue({
                          sublistId: 'recmachcustrecord_hris_final_sett_link',
                          fieldId: 'custrecord_hris_asset_issues_form_dept_n',
                          value: detail.department,
                          ignoreFieldChange: false,
                          forceSyncSourcing: true
                      });
                      recordObj.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_final_sett_link',
                        fieldId: 'custrecord_hris_asset_sub_department_',
                        value: detail.subDepartment,
                        ignoreFieldChange: true,
                        forceSyncSourcing: true
                    });
                    if(detail.handoverDone == "T"){
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_final_sett_link',
                            fieldId: 'custrecord_hris_asset_handoverdone',
                            value: true,
                            ignoreFieldChange: true
                        });
                    }
                    else if(detail.handoverDone == "F"){
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_final_sett_link',
                            fieldId: 'custrecord_hris_asset_handoverdone',
                            value: false,
                            ignoreFieldChange: true
                        });
                    }
                    
                      if(detail.issueDate){
                        var formattedDateissue = format.format({
                            value: detail.requestDate,
                            type: format.Type.DATE
                        });
                        var partsexpiry = formattedDateissue.split('/');
          var dateObjexpiryissue = new Date(partsexpiry[2], partsexpiry[1] - 1, partsexpiry[0]);
   
                      recordObj.setCurrentSublistValue({
                          sublistId: 'recmachcustrecord_hris_final_sett_link',
                          fieldId: 'custrecord_hris_asset_isu_date',
                          value: dateObjexpiryissue,
                          ignoreFieldChange: true
                      });
                    }
                    if(detail.remarks)
                    recordObj.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_final_sett_link',
                        fieldId: 'custrecord_hris_aset_remarks',
                        value: detail.remarks,
                        ignoreFieldChange: true
                    });
                    if(detail.location){
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_final_sett_link',
                            fieldId: 'custrecord_hris_asset_locations_',
                            value: detail.location,
                            ignoreFieldChange: true
                        });
                    }
                    if(detail.issuedby){
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_final_sett_link',
                            fieldId: 'custrecord_hris_asset_isu_by',
                            value:detail.issuedby,
                            ignoreFieldChange: true
                        });
                    }
                      if(detail.handoverid){
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_final_sett_link',
                            fieldId: 'custrecord_hris_asset_handoverid',
                            value:detail.handoverid,
                            ignoreFieldChange: true
                        });
                      }
                      if(detail.asset){
                        recordObj.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_hris_final_sett_link',
                            fieldId: 'custrecord_hris_asset',
                            value:detail.asset,
                            ignoreFieldChange: true
                        });
                      }
                     
                      
                   
                      if( detail.cseg2){
                      recordObj.setCurrentSublistValue({
                          sublistId: 'recmachcustrecord_hris_final_sett_link',
                          fieldId: 'custrecordcseg2',
                          value: detail.cseg2,
                          ignoreFieldChange: true
                      });
                    }
                      recordObj.commitLine({
                          sublistId: 'recmachcustrecord_hris_final_sett_link'
                      });
                  }
              }
           
     
            }
            catch (e) {
    // e.message contains the specific error description
    log.error("Error in leavesalary", "Error message: " + e.message);
    
    // If you want to see the full stack trace for debugging:
    log.error("Error in leavesalary - Full Details", e); 
}

        }

        return {
            //pageInit: pageInit,
            fieldChanged: fieldChanged,
            // lineInit:lineInit,
            saveRecord: saveRecord,
            leavesalary: leavesalary,
            jvcreation: jvcreation,
            recalculate: recalculate,
            createJVPreview:createJVPreview,
            createjvcreation: createjvcreation
            // validateField: validateField
        }
    });
function getemployeecatagorysequence(empcatagoryid) {
    try {
        var empcatagorysql = "select * from customrecord_hris_employeecategory where id =  " + empcatagoryid;
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
  function getPreviousMonthDate(paydate, format) {
    try {
        if (!paydate) return null;

        var currentDate = format.parse({
            value: paydate,
            type: format.Type.DATE
        });

        var currentYear = currentDate.getFullYear();
        var currentMonth = currentDate.getMonth(); // 0 = January

        var prevMonth = currentMonth - 1;
        var prevYear = currentYear;

        if (prevMonth < 0) {
            prevMonth = 11; // December
            prevYear = currentYear - 1;
        }

        // Return object with clear month and year
        return {
            year: prevYear,
            month: prevMonth + 1,           // Convert to 1-based (1=Jan, 12=Dec)
            monthPadded: (prevMonth + 1 < 10 ? '0' : '') + (prevMonth + 1),
            yearMonthString: prevYear + '-' + (prevMonth + 1 < 10 ? '0' : '') + (prevMonth + 1)
        };

    } catch (e) {
        log.error('getPreviousMonthDate Error', e);
        return null;
    }
}
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
    function gettingleaveaccuralbasesalary(empid) {
            var sql = "SELECT SUM(b.custrecord_hris_cde_monthly) AS amount " +
                      "FROM customrecord_hris_employee_compen_change a " +
                      "JOIN customrecord_hris_compensation_details_e b ON a.id = b.custrecord_hris_employee_data_change " +
                      "JOIN customrecord_hris_payroll_component c ON b.custrecord_hris_cde_payroll_component = c.id " +
                      "WHERE a.custrecord_hris_empchange_employee_nam = " + empid + 
                      " AND c.custrecord_hris_leaveaccural = 'T' AND a.isinactive = 'F'";
            var res = QUERY.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? parseFloat(res[0].amount || 0) : 0;
        }
  function getLopDays(empid) {
            var lopdays = 0;
            var lopdaysfinal = 0;
   /*  var sql = "SELECT SUM(custrecord_hris_ule_noof_days) AS lopdays, " +
              "SUM(custrecord_hris_ule_final_days) AS lopdaysfinal " +
              "FROM customrecord_hris_unpaid_leave_entry " +
              "WHERE custrecord_hris_ule_employee_name = " + empid + 
              " AND custrecord_hris_ule_month = " + month + 
              " AND custrecord_hris_ule_year = " + year; */
               var sql = "SELECT SUM(custrecord_hris_ule_noof_days) AS lopdays, " +
              "SUM(custrecord_hris_ule_final_days) AS lopdaysfinal " +
              "FROM customrecord_hris_unpaid_leave_entry " +
              "WHERE  isinactive = 'F' AND custrecord_hris_ule_employee_name = " + empid  ;
      log.emergency('getLopDays SQL', sql);        
              
    var res = QUERY.runSuiteQL({ query: sql }).asMappedResults();
    
    // Returns an object with both values, defaulting to 0 if null
    return res.length > 0 ? {
        lopdays: parseFloat(res[0].lopdays || 0),
        lopdaysfinal: parseFloat(res[0].lopdaysfinal || 0)
    } : { lopdays: 0, lopdaysfinal: 0 };
}
function getLopDayspendingsalary(empid,leavingdate,lastpaydate,format) {
     leavingdate = format.format({
            value: leavingdate,
            type: format.Type.DATE
        });
         lastpaydate = format.format({
            value: lastpaydate,
            type: format.Type.DATE
        });
            var lopdays = 0;
            var lopdaysfinal = 0;
   
               var sql = "SELECT SUM(custrecord_hris_ule_noof_days) AS lopdays, " +
              "SUM(custrecord_hris_ule_final_days) AS lopdaysfinal " +
              "FROM customrecord_hris_unpaid_leave_entry " +
              "WHERE  isinactive = 'F' AND custrecord_hris_ule_employee_name = " + empid + "  "+ 
              "AND custrecord_hris_ule_pay_date BETWEEN '"+lastpaydate+"' AND '"+leavingdate+"' "; ;
      log.emergency('getLopDayspendingsalary SQL', sql);        
              
    var res = QUERY.runSuiteQL({ query: sql }).asMappedResults();
    
    // Returns an object with both values, defaulting to 0 if null
    return res.length > 0 ? {
        lopdays: parseFloat(res[0].lopdays || 0),
        lopdaysfinal: parseFloat(res[0].lopdaysfinal || 0)
    } : { lopdays: 0, lopdaysfinal: 0 };
}


    function getAttendanceSummary(empId, startDate, endDate,format) {
         startDate = format.format({
            value: startDate,
            type: format.Type.DATE
        });
         endDate = format.format({
            value: endDate,
            type: format.Type.DATE
        });

    var sql = "SELECT " +
        "A.custrecord_njt_emp_atten_employee AS employeeid, " +
        "C.entityid AS emp_name, " +
        "C.id AS emp_code, " +
        "C.custentity_hris_empdepartment_new AS departmentt, " +
        "SUM(CASE " +
        "WHEN B.custrecord_njt_emp_daily_intatt NOT IN (17,16,10,1,12,15) THEN 1 " +
        "WHEN B.custrecord_njt_emp_daily_intatt IN (12,15) THEN 0.5 " +
        "ELSE 0 END) AS present_count, " +
        "SUM(CASE " +
        "WHEN B.custrecord_njt_emp_daily_intatt IN (17,16,10,1) THEN 1 " +
        "WHEN B.custrecord_njt_emp_daily_intatt IN (12,15) THEN 0.5 " +
        "ELSE 0 END) AS absent_count, " +
        "SUM(CASE " +
        "WHEN B.custrecord_njt_overtime_type = 1 THEN B.custrecord_njt_ot_hours " +
        "ELSE 0 END) AS weekly_ot, " +
        "SUM(CASE " +
        "WHEN B.custrecord_njt_overtime_type = 2 THEN B.custrecord_njt_ot_hours " +
        "ELSE 0 END) AS holi_ot, " +
        "SUM(CASE " +
        "WHEN B.custrecord_njt_overtime_type = 3 THEN B.custrecord_njt_ot_hours " +
        "ELSE 0 END) AS rot_ot " +
        "FROM CUSTOMRECORD_NJT_EMP_DAILY_ATTENDANCE A " +
        "LEFT JOIN CUSTOMRECORD_NJT_EMP_DAILY_ATTEN_CH B " +
        "ON B.custrecord_njt_emp_daily_parent = A.id " +
        "JOIN employee C " +
        "ON A.custrecord_njt_emp_atten_employee = C.id " +
        "WHERE B.custrecord_njt_daily_atten_emp = " + empId + " " +
        "AND B.custrecord_njt_emp_daily_date BETWEEN '" + startDate + "' AND '" + endDate + "' " +
        "GROUP BY " +
        "A.custrecord_njt_emp_atten_employee, " +
        "C.entityid, " +
        "C.id, " +
        "C.custentity_hris_empdepartment_new " +
        "ORDER BY A.custrecord_njt_emp_atten_employee";

    log.debug("Attendance SQL", sql);

    var results = QUERY.runSuiteQL({
        query: sql
    }).asMappedResults();

    log.debug("Attendance Results", results);

    return results;
}

  

function calculateGratuity(basicSalary, netServiceYears,paygroup) {
    if (netServiceYears < 1) return 0;

    const dailySalary = basicSalary / 30;
    
    // Calculate days based on brackets
    var firstfive =Math.min(netServiceYears, 5)
    var firstcaldays =gettinggratuitycalculationdays(firstfive,paygroup);
    log.emergency('firstcaldays',firstcaldays);

   // const firstFiveYears = Math.min(netServiceYears, 5) * 21;

      const firstFiveYears = Math.min(netServiceYears, 5) * firstcaldays;
      log.emergency('firstFiveYears',firstFiveYears)
      var secondcaldays = gettinggratuitycalculationdays(netServiceYears,paygroup)
log.emergency('secondcaldays',secondcaldays);

    //const yearsAboveFive = Math.max(netServiceYears - 5, 0) * 30;
    
 const yearsAboveFive = Math.max(netServiceYears - 5, 0) * secondcaldays;

log.emergency('yearsAboveFive',yearsAboveFive);
    const calculatedAmount = dailySalary * (firstFiveYears + yearsAboveFive);
    log.emergency('calculatedAmount',calculatedAmount);
    // Apply the cap (Maximum of 2 years' salary)
    const capAmount = basicSalary * 24;
    log.emergency('capAmount',capAmount)
    return Math.min(calculatedAmount, capAmount);
}
function searchLeaveBalance(empInternalId) {
            debugger;
            var result = [];
            var finalleavebal = 0;
            // var leavebalancesql = "select * from customrecord_hris_leavebalance where custrecord_hris_lvbal_employee_name = '" + empInternalId + "' and  custrecord_hris_lvbal_leave_type = '"+leavetype+"' and isinactive ='F'"

            var leavebalancesql = "select a.*,b.custrecord_hris_lvecfg_accuraldays as accuraldays from customrecord_hris_leavebalance a join customrecord_hris_leaveconfig b on a.custrecord_hris_lvbal_leave_type=b.id\
            where a.custrecord_hris_lvbal_employee_name = '" + empInternalId + "'  and a.isinactive ='F'\
            and b.custrecord_hris_lvecnfg_seqno = 3 "


            log.debug("leavebalancesql", leavebalancesql);
            var queryResult = QUERY.runSuiteQL({
                query: leavebalancesql,
            });
            var leavebalancesqlrecords = queryResult.asMappedResults();


            log.debug(" leavebalancesqlrecords.length", leavebalancesqlrecords.length);
            if (leavebalancesqlrecords.length > 0) {
                var obdate = leavebalancesqlrecords[0].custrecord_hris_lvbal_obdate;
                var obleavebalance = leavebalancesqlrecords[0].custrecord_hris_lvbal_openingbalance || 0;
                var leavebalcredited = leavebalancesqlrecords[0].custrecord_hris_lvbal_leave_balance_cred || 0;
                var leavebaltaken = leavebalancesqlrecords[0].custrecord_hris_lvbal_leave_balance_take || 0;
                var availableleavebal = leavebalancesqlrecords[0].custrecord_hris_lvbal_available_leave_ba || 0;
                var accuraldays = leavebalancesqlrecords[0].accuraldays || 1;
                var leavebalid = leavebalancesqlrecords[0].id;
                log.debug('Leavebalance Id', leavebalid);
              
                return availableleavebal;

            }
        }
function gettinggratuitycalculationdays(years, paygroup) {
            log.debug('gettinggratuitycalculationdays Input', { years: years, paygroup: paygroup });
            var sql = ''
                + 'SELECT custrecord_hris_days_for_calculation '
                + 'FROM customrecord_hris_gratuity_slab '
                + 'WHERE ' + years + ' BETWEEN custrecord_hris_from_year AND custrecord_hris_to_year '
                + ' AND custrecord_hris_gratuity_pay_group = ' + paygroup + ' AND isinactive = \'F\'';
        log.debug('gratuitycalcualtiondays')    
            var res = QUERY.runSuiteQL({ query: sql }).asMappedResults();
            var val = res.length > 0 ? parseFloat(res[0].custrecord_hris_days_for_calculation) : 0;
            log.debug('gettinggratuitycalculationdays Result', val);
            return val;
        }
           function getLeaveAccuralDays(leaveEntitlement, employeeCategory) {
            var sql = "SELECT custrecord_hris_lvecfg_accuraldays_month FROM customrecord_hris_leaveconfig " +
                      "WHERE BUILTIN.MNFILTER(custrecord_hris_lvecfg_leaveentitlement, 'MN_INCLUDE', '', 'FALSE', " + leaveEntitlement + ") = 'T' " +
                      "AND BUILTIN.MNFILTER(custrecord_hris_lvecfg_employee_catagory, 'MN_INCLUDE', '', 'FALSE', " + employeeCategory + ") = 'T' " +
                      "AND custrecord_hris_lvecnfg_seqno = 3 AND isinactive = 'F'";
            var res = QUERY.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? parseFloat(res[0].custrecord_hris_lvecfg_accuraldays_month || 0) : 0;
        }

        function getLeaveAccuralcatDays(leaveEntitlement, employeeCategory) {
            var sql = "SELECT custrecord_hris_lvecfg_noofdaysto_credit FROM customrecord_hris_leaveconfig " +
                      "WHERE BUILTIN.MNFILTER(custrecord_hris_lvecfg_leaveentitlement, 'MN_INCLUDE', '', 'FALSE', " + leaveEntitlement + ") = 'T' " +
                      "AND BUILTIN.MNFILTER(custrecord_hris_lvecfg_employee_catagory, 'MN_INCLUDE', '', 'FALSE', " + employeeCategory + ") = 'T' " +
                      "AND custrecord_hris_lvecnfg_seqno = 3 AND isinactive = 'F'";
            var res = QUERY.runSuiteQL({ query: sql }).asMappedResults();
            return res.length > 0 ? parseFloat(res[0].custrecord_hris_lvecfg_noofdaysto_credit || 0) : 0;
        }
function calculateGratuityAmount(paygroup, NoOfYears, DayBasic) {
    debugger;
    var gratuityAmount = 0; // Total gratuity amount

    var fullYearGratuity = 0; // Gratuity for the first 5 years
    var remainingYearGratuity = 0; // Gratuity for remaining years
    var daysForCalculationuptofive = 21;
    var daysForCalculation = 30;
    // getting gratuity slap up to 5
    var gratuityslapsql = "select * from customrecord_hris_gratuity_slab  where custrecord_hris_gratuity_pay_group =" + paygroup + " \
                 and custrecord_hris_gratuity_sequence_no =1 and isinactive='F'";
    log.debug('gratuityslapsql', gratuityslapsql);
    var gratuityslapsqlrecords = getResult(gratuityslapsql);

    if (gratuityslapsqlrecords.length > 0) {
        daysForCalculationuptofive = gratuityslapsqlrecords[0].custrecord_hris_days_for_calculation;



    }
    // getting gratuity slap greater than 5
    var gratuityslapsql = "select * from customrecord_hris_gratuity_slab  where custrecord_hris_gratuity_pay_group =" + paygroup + " \
and custrecord_hris_gratuity_sequence_no =2 and isinactive='F'";
    log.debug('gratuityslapsql', gratuityslapsql);
    var gratuityslapsqlrecords = getResult(gratuityslapsql);

    if (gratuityslapsqlrecords.length > 0) {
        daysForCalculation = gratuityslapsqlrecords[0].custrecord_hris_days_for_calculation;



    }
    if (NoOfYears > 5) {
        var fullYears = 5; // First 5 years
        var remainingYears = NoOfYears - fullYears; // Remaining years

        // Gratuity for the first 5 years
        fullYearGratuity = DayBasic * daysForCalculationuptofive * fullYears;

        // Gratuity for remaining years
        if (remainingYears > 5) {
            remainingYearGratuity = DayBasic * daysForCalculation * remainingYears; // Rate 30 for remaining years > 5
        } else {
            remainingYearGratuity = DayBasic * daysForCalculationuptofive * remainingYears; // Rate 21 for remaining years <= 5
        }

        // Total gratuity amount
        gratuityAmount = fullYearGratuity + remainingYearGratuity;
    } else {
        // If NoOfYears is less than or equal to 5, calculate directly
        fullYearGratuity = DayBasic * daysForCalculationuptofive * NoOfYears;
        gratuityAmount = fullYearGratuity; // No remaining years in this case
    }

    return gratuityAmount.toFixed(2); // Total gratuity
    // Gratuity for remaining years
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

function getleavesalaryamount(empid) {
    debugger;
    var leaveaccuralamount = 0
    /*     var leaveaccuralsql ="SELECT SUM(COALESCE(custrecord_hris_accural_amount, 0)) AS accuralamount,\
                          SUM(COALESCE(custrecord_hris_accural_utilised_amount, 0)) AS utilisedamount,\
                          SUM(COALESCE(custrecord_hris_accural_amount, 0)) - SUM(COALESCE(custrecord_hris_accural_utilised_amount, 0)) as balanceamount\
                          FROM customrecord_hris_monthly_accural_trans where custrecord_hris_accural_type =1 and \
                          custrecord_hris_accural_trans_type=1 and custrecord_hris_accural_empid = " + empid+" and isinactive='F'"
    */

    /*    var leaveaccuralsql ="SELECT SUM(COALESCE(a.custrecord_hris_accural_amount, 0)) AS accuralamount,\
       SUM(COALESCE(a.custrecord_hris_accural_utilised_amount, 0)) AS utilisedamount,\
       SUM(COALESCE(a.custrecord_hris_accural_amount, 0)) - SUM(COALESCE(a.custrecord_hris_accural_utilised_amount, 0)) as balanceamount\
       FROM a.customrecord_hris_monthly_accural_trans  a join customrecord_hris_accuraltype_master b\
        on a.custrecord_hris_accural_type=b.id \
       join customrecord_hrms_accural_transactiontyp c on a.custrecord_hris_accural_trans_type =c.id\
         where  b.custrecord_hris_accural_seqno=1 and c.custrecord_hris_accural_trans_seqno=1\
      and a.custrecord_hris_accural_empid = " + empid+" and b.isinactive='F'"
*/


    var leaveaccuralsql = "SELECT T0.accuralamount,T1.utilisedamount,COALESCE(T0.accuralamount, 0) - COALESCE(T1.utilisedamount, 0) as balanceamount\
                                    FROM (SELECT a.custrecord_hris_accural_empid,SUM(COALESCE(a.custrecord_hris_accural_amount, 0)) AS accuralamount\
                                    FROM customrecord_hris_monthly_accural_trans a JOIN customrecord_hris_accuraltype_master b\
                                     ON a.custrecord_hris_accural_type = b.id JOIN customrecord_hrms_accural_transactiontyp c\
                                      ON a.custrecord_hris_accural_trans_type = c.id WHERE b.custrecord_hris_accural_seqno = 1\
                                    AND c.custrecord_hris_accural_trans_seqno = 1  AND a.custrecord_hris_accural_empid = "+ empid + "\
                                    AND a.isinactive = 'F' GROUP BY  a.custrecord_hris_accural_empid) T0\
                                    LEFT JOIN ( SELECT  a1.custrecord_hris_accural_empid,SUM(COALESCE(a1.custrecord_hris_accural_utilised_amount, 0)) AS utilisedamount,\
                                     FROM customrecord_hris_monthly_accural_trans a1  JOIN customrecord_hris_accuraltype_master b1 ON a1.custrecord_hris_accural_type = b1.id\
                                JOIN customrecord_hrms_accural_transactiontyp c1 ON a1.custrecord_hris_accural_trans_type = c1.id\
                                WHERE b1.custrecord_hris_accural_seqno = 1  AND c1.custrecord_hris_accural_trans_seqno = 3 AND a1.custrecord_hris_accural_empid = "+ empid + "\
                                AND a1.isinactive = 'F' GROUP BY a1.custrecord_hris_accural_empid ) T1\
                                ON T0.custrecord_hris_accural_empid = T1.custrecord_hris_accural_empid"
    log.debug('leaveaccuralsql  ', leaveaccuralsql);


    /*     var queryResults = query.runSuiteQL({
            query:  leaveaccuralsql
        });
 
        var  leaveaccuralsqlrecords = queryResults.asMappedResults();
 */
    var leaveaccuralsqlrecords = getResult(leaveaccuralsql);
    if (leaveaccuralsqlrecords.length > 0) {
        var leaverecord = leaveaccuralsqlrecords[0];
        leaveaccuralamount = leaverecord.balanceamount || 0


    }
    return leaveaccuralamount;

}
function getleavedays(empid) {
    debugger;
    var leaveaccuraldays = 0
    /*   var leaveaccuralsql="select sum(COALESCE(a.custrecord_hris_accural_days,0)) as accuralleave ,\
                    sum(COALESCE(a.custrecord_hris_accural_utilised_leave,0)) as utilisedleave,\
                     sum(COALESCE(a.custrecord_hris_accural_days,0))+sum(COALESCE(a.custrecord_hris_accural_leave_canceldays,0))- \
                     sum(COALESCE(a.custrecord_hris_accural_utilised_leave,0)) as accuraldays,\
                     sum(COALESCE(a.custrecord_hris_accural_leave_canceldays,0)) as cancelday\
                 from a.customrecord_hris_monthly_accural_trans  a join customrecord_hris_accuraltype_master b\
                  on a.custrecord_hris_accural_type=b.id join customrecord_hrms_accural_transactiontyp c on\
                   a.custrecord_hris_accural_trans_type =c.id where b.custrecord_hris_accural_seqno=1  and\
                    a.custrecord_hris_accural_empid= " + empid+"\
                    and a.isinactive='F'"
    */


    var leaveaccuraldayssql = "SELECT T0.utilisedleave,T0.cancelday,T2.accuredleave,T1.settledleave,\
             COALESCE(T0.utilisedleave, 0) - (COALESCE(T1.settledleave, 0) + COALESCE(T0.cancelday, 0)) AS accuraldays ,\
             COALESCE(T2.accuredleave, 0) + (COALESCE(T0.cancelday, 0) - COALESCE(T0.utilisedleave, 0)) AS balanceutilised\
               from(\
                     SELECT a.custrecord_hris_accural_empid,\
                     SUM(COALESCE(a.custrecord_hris_accural_utilised_leave, 0)) AS utilisedleave,\
                     SUM(COALESCE(a.custrecord_hris_accural_leave_canceldays, 0)) AS cancelday\
                FROM\
            customrecord_hris_monthly_accural_trans a\
                 JOIN\
                customrecord_hris_accuraltype_master b ON a.custrecord_hris_accural_type = b.id\
                JOIN\
                customrecord_hrms_accural_transactiontyp c ON a.custrecord_hris_accural_trans_type = c.id\
                 WHERE\
b.custrecord_hris_accural_seqno = 1 and c.custrecord_hris_accural_trans_seqno=5\
AND a.custrecord_hris_accural_empid = "+ empid + "\
GROUP BY a.custrecord_hris_accural_empid\
) T0 LEFT JOIN ( SELECT a1.custrecord_hris_accural_empid,SUM(COALESCE(a1.custrecord_hris_accural_utilised_leave, 0)) AS settledleave\
FROM customrecord_hris_monthly_accural_trans a1 JOIN customrecord_hris_accuraltype_master b1 ON a1.custrecord_hris_accural_type = b1.id\
JOIN customrecord_hrms_accural_transactiontyp c1 ON a1.custrecord_hris_accural_trans_type = c1.id\
WHERE b1.custrecord_hris_accural_seqno = 1 AND c1.custrecord_hris_accural_trans_seqno = 3\
AND a1.custrecord_hris_accural_empid = "+ empid + " GROUP BY  a1.custrecord_hris_accural_empid) T1\
 ON T0.custrecord_hris_accural_empid = T1.custrecord_hris_accural_empid\
 LEFT JOIN ( SELECT a2.custrecord_hris_accural_empid,SUM(COALESCE(a2.custrecord_hris_accural_days, 0)) AS accuredleave\
  FROM customrecord_hris_monthly_accural_trans a2 JOIN customrecord_hris_accuraltype_master b2 ON a2.custrecord_hris_accural_type = b2.id \
  JOIN customrecord_hrms_accural_transactiontyp c2 ON a2.custrecord_hris_accural_trans_type = c2.id\
   WHERE b2.custrecord_hris_accural_seqno = 1 and c2.custrecord_hris_accural_trans_seqno = 1 AND a2.custrecord_hris_accural_empid = "+ empid + "\
   GROUP BY a2.custrecord_hris_accural_empid) T2 ON T0.custrecord_hris_accural_empid = T2.custrecord_hris_accural_empid"
    log.debug('leaveaccuraldayssql  ', leaveaccuraldayssql);





    /* var queryResults = query.runSuiteQL({
        query:  leaveaccuraldayssql
    });
 
    var  leaveaccuraldayssqlrecords = queryResults.asMappedResults(); */
    var leaveaccuraldayssqlrecords = getResult(leaveaccuraldayssql);
    if (leaveaccuraldayssqlrecords.length > 0) {
        var leaverecord = leaveaccuraldayssqlrecords[0];
        leaveaccuraldays = leaverecord.accuraldays || 0


    }
    return leaveaccuraldays;

}
function getairtickeaccuralamount(empid) {
    debugger;
    var leaveaccuralamount = 0
    /*             var leaveaccuralsql ="SELECT SUM(COALESCE(custrecord_hris_accural_amount, 0)) AS accuralamount,\
                          SUM(COALESCE(custrecord_hris_accural_utilised_amount, 0)) AS utilisedamount,\
                          SUM(COALESCE(custrecord_hris_accural_amount, 0)) - SUM(COALESCE(custrecord_hris_accural_utilised_amount, 0)) as balanceamount\
                          FROM customrecord_hris_monthly_accural_trans where custrecord_hris_accural_type =2 and \
                          custrecord_hris_accural_trans_type=2 and custrecord_hris_accural_empid = " + empid+" and isinactive='F'"
    
    */

    /*   var leaveaccuralsql ="SELECT SUM(COALESCE(a.custrecord_hris_accural_amount, 0)) AS accuralamount,\
      SUM(COALESCE(a.custrecord_hris_accural_utilised_amount, 0)) AS utilisedamount,\
      SUM(COALESCE(a.custrecord_hris_accural_amount, 0)) - SUM(COALESCE(a.custrecord_hris_accural_utilised_amount, 0)) as balanceamount\
      FROM customrecord_hris_monthly_accural_trans a join customrecord_hris_accuraltype_master b on a.custrecord_hris_accural_type=b.id \
      join customrecord_hrms_accural_transactiontyp c on a.custrecord_hris_accural_trans_type =c.id where b.custrecord_hris_accural_seqno=2\
       and c.custrecord_hris_accural_trans_seqno=2\
     and a.custrecord_hris_accural_empid = " + empid+" and a.isinactive='F'"
*/

    var airticketaccuralsql = "SELECT T0.accuralamount,T1.utilisedamount,COALESCE(T0.accuralamount, 0) - COALESCE(T1.utilisedamount, 0) as balanceamount\
                     FROM (SELECT a.custrecord_hris_accural_empid,SUM(COALESCE(a.custrecord_hris_accural_amount, 0)) AS accuralamount\
                     FROM customrecord_hris_monthly_accural_trans a JOIN customrecord_hris_accuraltype_master b\
                      ON a.custrecord_hris_accural_type = b.id JOIN customrecord_hrms_accural_transactiontyp c\
                       ON a.custrecord_hris_accural_trans_type = c.id WHERE b.custrecord_hris_accural_seqno = 2\
                     AND c.custrecord_hris_accural_trans_seqno = 2  AND a.custrecord_hris_accural_empid = "+ empid + "\
                     AND a.isinactive = 'F' GROUP BY  a.custrecord_hris_accural_empid) T0\
                     LEFT JOIN ( SELECT  a1.custrecord_hris_accural_empid,SUM(COALESCE(a1.custrecord_hris_accural_utilised_amount, 0)) AS utilisedamount,\
                      FROM customrecord_hris_monthly_accural_trans a1  JOIN customrecord_hris_accuraltype_master b1 ON a1.custrecord_hris_accural_type = b1.id\
                 JOIN customrecord_hrms_accural_transactiontyp c1 ON a1.custrecord_hris_accural_trans_type = c1.id\
                 WHERE b1.custrecord_hris_accural_seqno = 2  AND c1.custrecord_hris_accural_trans_seqno = 4 AND a1.custrecord_hris_accural_empid = "+ empid + "\
                 AND a1.isinactive = 'F' GROUP BY a1.custrecord_hris_accural_empid ) T1\
                 ON T0.custrecord_hris_accural_empid = T1.custrecord_hris_accural_empid"



    log.debug('airticketaccuralsql  ', airticketaccuralsql);


    /*  var queryResults = query.runSuiteQL({
         query:  airticketaccuralsql
     });
 
     var  airticketaccuralsqlrecords = queryResults.asMappedResults(); */
    var airticketaccuralsqlrecords = getResult(airticketaccuralsql);
    if (airticketaccuralsqlrecords.length > 0) {
        var leaverecord = airticketaccuralsqlrecords[0];
        leaveaccuralamount = leaverecord.balanceamount || 0


    }
    return leaveaccuralamount;

}
 function getgratuityprovision(Month, Year, empid) {
            try {
                var sql = "SELECT SUM(custrecord_hris_accural_currentliability) AS currentliability, SUM(custrecord_hris_accural_prevliability) as prevliability,  SUM(custrecord_hris_accural_amount) AS totalAmount " +
                          "FROM customrecord_hris_monthly_accural_trans " +
                          "WHERE custrecord_hris_accural_type = 3 and custrecord_hris_accural_trans_type=6 and isinactive='F' and custrecord_hris_accural_empid = " + empid +
                          " AND custrecord_hris_accural_month = " + Month +
                          " AND BUILTIN.DF(custrecord_hris_accural_year)= '" + Year + "'";
                 log.debug('getgratuityprovision SQL', sql);       
                var res = QUERY.runSuiteQL({ query: sql }).asMappedResults();
                return res.length > 0 ? parseFloat(res[0].currentliability || 0) : 0;
            } catch (e) {
                return 0;
            }
        }
function getgratuityaccuralamount(empid) {
    debugger;
    var leaveaccuralamount = 0
    /*             var leaveaccuralsql ="SELECT SUM(COALESCE(custrecord_hris_accural_amount, 0)) AS accuralamount,\
                          SUM(COALESCE(custrecord_hris_accural_utilised_amount, 0)) AS utilisedamount,\
                          SUM(COALESCE(custrecord_hris_accural_amount, 0)) - SUM(COALESCE(custrecord_hris_accural_utilised_amount, 0)) as balanceamount\
                          FROM customrecord_hris_monthly_accural_trans where custrecord_hris_accural_type =2 and \
                          custrecord_hris_accural_trans_type=2 and custrecord_hris_accural_empid = " + empid+" and isinactive='F'"
    
    */

    /*   var leaveaccuralsql ="SELECT SUM(COALESCE(a.custrecord_hris_accural_amount, 0)) AS accuralamount,\
      SUM(COALESCE(a.custrecord_hris_accural_utilised_amount, 0)) AS utilisedamount,\
      SUM(COALESCE(a.custrecord_hris_accural_amount, 0)) - SUM(COALESCE(a.custrecord_hris_accural_utilised_amount, 0)) as balanceamount\
      FROM customrecord_hris_monthly_accural_trans a join customrecord_hris_accuraltype_master b on a.custrecord_hris_accural_type=b.id \
      join customrecord_hrms_accural_transactiontyp c on a.custrecord_hris_accural_trans_type =c.id where b.custrecord_hris_accural_seqno=2\
       and c.custrecord_hris_accural_trans_seqno=2\
     and a.custrecord_hris_accural_empid = " + empid+" and a.isinactive='F'"
*/

    var gratuityaccuralsql = "SELECT T0.accuralamount,T1.utilisedamount,COALESCE(T0.accuralamount, 0) - COALESCE(T1.utilisedamount, 0) as balanceamount\
                     FROM (SELECT a.custrecord_hris_accural_empid,SUM(COALESCE(a.custrecord_hris_accural_amount, 0)) AS accuralamount\
                     FROM customrecord_hris_monthly_accural_trans a JOIN customrecord_hris_accuraltype_master b\
                      ON a.custrecord_hris_accural_type = b.id JOIN customrecord_hrms_accural_transactiontyp c\
                       ON a.custrecord_hris_accural_trans_type = c.id WHERE b.custrecord_hris_accural_seqno = 3\
                     AND c.custrecord_hris_accural_trans_seqno = 6  AND a.custrecord_hris_accural_empid = "+ empid + "\
                     AND a.isinactive = 'F' GROUP BY  a.custrecord_hris_accural_empid) T0\
                     LEFT JOIN ( SELECT  a1.custrecord_hris_accural_empid,SUM(COALESCE(a1.custrecord_hris_accural_utilised_amount, 0)) AS utilisedamount,\
                      FROM customrecord_hris_monthly_accural_trans a1  JOIN customrecord_hris_accuraltype_master b1 ON a1.custrecord_hris_accural_type = b1.id\
                 JOIN customrecord_hrms_accural_transactiontyp c1 ON a1.custrecord_hris_accural_trans_type = c1.id\
                 WHERE b1.custrecord_hris_accural_seqno = 3  AND c1.custrecord_hris_accural_trans_seqno = 7 AND a1.custrecord_hris_accural_empid = "+ empid + "\
                 AND a1.isinactive = 'F' GROUP BY a1.custrecord_hris_accural_empid ) T1\
                 ON T0.custrecord_hris_accural_empid = T1.custrecord_hris_accural_empid"



    log.debug('gratuityaccuralsql  ', gratuityaccuralsql);


    /*  var queryResults = query.runSuiteQL({
         query:  airticketaccuralsql
     });
 
     var  airticketaccuralsqlrecords = queryResults.asMappedResults(); */
    var gratuityaccuralsqlrecords = getResult(gratuityaccuralsql);
    if (gratuityaccuralsqlrecords.length > 0) {
        var leaverecord = gratuityaccuralsqlrecords[0];
        leaveaccuralamount = leaverecord.balanceamount || 0


    }
    return leaveaccuralamount;

}
function gettinggratuitycompoamount(empid) {
            log.debug('gettinggratuitycompoamount Input', empid);
            var sql = ''
                + 'SELECT SUM(b.custrecord_hris_cde_monthly) AS amount '
                + 'FROM customrecord_hris_employee_compen_change a '
                + 'JOIN customrecord_hris_compensation_details_e b ON a.id = b.custrecord_hris_employee_data_change '
                + 'JOIN customrecord_hris_payroll_component c ON b.custrecord_hris_cde_payroll_component = c.id '
                + 'WHERE a.custrecord_hris_empchange_employee_nam = ' + empid + ' '
                + ' AND c.custrecord_hris_gratuity = \'T\' AND a.isinactive = \'F\'';

            
    log.emergency(" gratuityamountsql",sql)    

            var res =QUERY.runSuiteQL({ query: sql }).asMappedResults();
                 var amount  = res[0].amount || 0;
            var previousamount = res[0].previous_amount||0;

            var val = res.length > 0 ? parseFloat(res[0].amount || 0) : 0;
            log.debug('gettinggratuitycompoamount Result', val);
            return val;
        }
function advancesalary(emp, fromdate) {
    var salaryadvanceamt = 0;

    var employeesalarysql = "SELECT COALESCE(SUM(custrecord_hris_loan_outstanding_amount), 0) as advanceamt\
                         FROM  customrecord_hris_empchange_loan_applicn WHERE \
     custrecord_hris_loan_emp_name =" + emp;
    log.debug('employeesalarysql', employeesalarysql);
    var employeesalarysqlrecords = getResult(employeesalarysql);

    if (employeesalarysqlrecords.length > 0) {

        salaryadvanceamt = employeesalarysqlrecords[0].advanceamt
    }

    return salaryadvanceamt
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

/**
 * Extracts month and year from a Date of Leaving
 * @param {string} leaveDate - The date string from the field
 * @param {Object} formatModule - The 'N/format' module
 */
function getLeavingDateDetails(leaveDate, format) {
    try {
        if (!leaveDate) return null;

        // Parse the date string based on user preferences
        var dateObj = format.parse({
            value: leaveDate,
            type: format.Type.DATE
        });

        var year = dateObj.getFullYear();
        var month = dateObj.getMonth() + 1; // Convert 0-11 to 1-12

        return {
            year: year,
            month: month,
            monthPadded: (month < 10 ? '0' : '') + month,
            yearMonthString: year + '-' + (month < 10 ? '0' : '') + month
        };

    } catch (e) {
        log.error('getLeaveDateDetails Error', e);
        return null;
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
     debugger;
    try {

        var count = 0;
        var momentStartDate = MOMENT(startDate);

        momentStartDate = momentStartDate
        //momentStartDate = momentStartDate.subtract(1, 'days');
        momentStartDate = momentStartDate.add(1, 'days')
        var momentEndDate = MOMENT(endDate);
        var duration = MOMENT.duration(momentEndDate.diff(momentStartDate));
        count = duration.asDays() + 1;
        return count;
    } catch (e) {
        log.debug("CountDays_BetweenTwodates/Error", JSON.stringify(e));
    }
}
function CountDays_BetweenTwodates(startDate, endDate,unpaiddays) {
     debugger;
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
        count = count - parseFloat(unpaiddays);
        var yeardays = 365.21
        count = count / parseFloat(yeardays);

        count = parseFloat(count).toFixed(5)



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
                                       where a.isinactive='F'and c.custrecord_hris_leaveaccural = 'T' and a.custrecord_hris_empchange_employee_nam ='"+ emp + "' and a.custrecord_hris_empchange_emp_pay_pro_gp =" + paygroup + "";// and b.custrecord_hris_cde_monthly > 0";    

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
      debugger;
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
         //   var leaveSettlement = Cal1 * parseInt(Days_);
          var leaveSettlement = Cal1 * parseFloat(Days_);
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
function calculateYearsAndMonths(startDate, endDate) {
    debugger;
    var start = new Date(startDate);
    var end = new Date(endDate);

    if (start > end) {
        return null;
    }

    var years = end.getFullYear() - start.getFullYear();
    var months = end.getMonth() - start.getMonth();

    if (months < 0) {
        years--;
        months += 12;
    }

    return { years: years, months: months };
}
function getassetissuedetails(emp){
    var sqlQuery = "SELECT " +
    "custrecord_hris_aset_req_id, " +
    "custrecord_hris_assst_request_date, " +
    "custrecord_hris_asset_ass_type, " +
    "custrecord_hris_asset_ass_name, " +
    "custrecord_hris_asset_employee_name, " +
    "custrecord_hris_asset_emplo_code, " +
    "custrecord_hris_aset_remarks, " +
    "custrecord_hris_asset_issues_form_dept_n, " +
    "custrecord_hris_asset_sub_department_, " +
    "custrecord_hris_asset_locations_, " +
    "custrecord_hris_asset_isu_date, " +
    "custrecord_hris_asset_handoverdone, " +
    "custrecord_hris_asset_isu_by, "+
    "custrecord_hris_asset_handoverid, "+
    "custrecord_hris_asset_comment, " +
    "custrecordcseg2, " +
    "custrecord_hris_asset " +
    "FROM customrecord_hris_asset_issues_form " +
    "WHERE custrecord_hris_asset_employee_name = " + emp;

var results = getResult(sqlQuery);
var assetarray=[];
if (results.length > 0) {
    for (var r = 0; r < results.length; r++) {
        var row = results[r];

        var reqId = row.custrecord_hris_aset_req_id;
        var requestDate = row.custrecord_hris_assst_request_date;
        var assetType = row.custrecord_hris_asset_ass_type;
        var assetName = row.custrecord_hris_asset_ass_name;
        var employeeName = row.custrecord_hris_asset_employee_name;
        var employeeCode = row.custrecord_hris_asset_emplo_code;
        var remarks = row.custrecord_hris_aset_remarks;
        var department = row.custrecord_hris_asset_issues_form_dept_n;
        var subDepartment = row.custrecord_hris_asset_sub_department_;
        var location = row.custrecord_hris_asset_locations_;
        var issueDate = row.custrecord_hris_asset_isu_date;
        var handoverDone = row.custrecord_hris_asset_handoverdone;
        var comment = row.custrecord_hris_asset_comment;
        var cseg2 = row.custrecordcseg2;
        var asset = row.custrecord_hris_asset;
        var issuedby=row.custrecord_hris_asset_isu_by;
        var handoverid=row.custrecord_hris_asset_handoverid;

        assetarray.push({
        reqId: reqId,
        requestDate: requestDate,
        assetType: assetType,
        assetName: assetName,
        employeeName: employeeName,
        employeeCode: employeeCode,
        remarks: remarks,
        department: department,
        subDepartment: subDepartment,
        location: location,
        issueDate: issueDate,
        handoverDone: handoverDone,
        comment: comment,
        cseg2: cseg2,
        asset: asset,
        issuedby:issuedby,
        handoverid:handoverid
    });

        // Example log
        log.debug("Row " + (r + 1), {
            reqId: reqId,
            assetName: assetName,
            issueDate: issueDate,
            employeeCode: employeeCode
        });
    }
}
return assetarray;

}
