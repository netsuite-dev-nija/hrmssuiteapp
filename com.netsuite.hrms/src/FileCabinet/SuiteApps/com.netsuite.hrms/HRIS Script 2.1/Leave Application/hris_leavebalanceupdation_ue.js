/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/search', 'N/query', 'N/format', 'N/record', 'N/currentRecord', 'N/url', './moment.js', 'N/runtime'],
    function (search, query, format, record, currentRecord, url, moment, runtime) {


        function beforeSubmit(scriptContext) {
            // Leave Balance Apply
            if (scriptContext.type == scriptContext.UserEventType.CREATE) {
                var error = 'Leaves exceed the leave balance available';
                var newRecord = scriptContext.newRecord;
                var leaveType = newRecord.getValue('custrecord_hris_lve_leavetype');
                var totalDays = parseFloat(newRecord.getValue('custrecord_hris_lve_totalnodays')) || 0;
                var employee = newRecord.getValue('custrecord_hris_lve_employeename');

                log.debug('leaveType', leaveType);
                log.debug('totalDays', totalDays);
                log.debug('employee', employee);

                var seqNoData = getsequenceno(leaveType,search);
                var seqNoSplit = seqNoData.split('#');
                var seqNo = seqNoSplit[0];

                //if (![3, 2, 8, 13].includes(parseInt(seqNo))) {
                if(seqNo !=3 && seqNo !=2 && seqNo !=8 && seqNo !=13){    
                    var leaveBalanceResults = searchLeaveBalance(leaveType, employee,search);
                    if (leaveBalanceResults.length > 0) {
                        var leaveBalance = parseFloat(leaveBalanceResults[0].getValue('custrecord_hris_lvbal_available_leave_ba')) || 0;
                        var appliedBal = parseFloat(leaveBalanceResults[0].getValue('custrecord_hris_lvbal_total_applied_days')) || 0;
                        var finalAppliedDays = appliedBal + totalDays;

                        log.debug('leaveBalance', leaveBalance);
                        log.debug('finalAppliedDays', finalAppliedDays);

                        if (finalAppliedDays > leaveBalance) {
                            throw new Error(error);
                        }
                    }
                }
           

            // Leave Application Record 
            var newRecord = scriptContext.newRecord;
            var emp_name = newRecord.getValue({ fieldId: 'custrecord_hris_lve_employeename' });
            var errornew = 'This record is already Present for the applied date';

            var frm_dt_VL = newRecord.getValue({ fieldId: 'custrecord_hris_lve_fromdate' });
         //  var frm_date_val = format.parse({ value: frm_dt_VL, type: format.Type.DATE });
           var frm_date_val = moment(frm_dt_VL).format('DD/MM/YYYY');
           log.audit('frm_date_val',frm_date_val)
          //  var frm_date_val= frm_dt_VL;
            
            var to_DTVL = newRecord.getValue({ fieldId: 'custrecord_hris_lve_todate' });
           // var to_date_val = format.parse({ value: to_DTVL, type: format.Type.DATE });
           var to_date_val = moment(to_DTVL).format('DD/MM/YYYY');
           log.audit('to_date_val',to_date_val);
          // var to_date_val = to_DTVL;
            
            if (frm_date_val && to_date_val) {
                var searchdate = search.create({
                    type: 'customrecord_hris_leaveapplication',
                    filters: [
                        ['custrecord_hris_lve_employeename', 'is', emp_name],
                        'AND',
                        ['custrecord_hris_lve_hrmsapprovalstatus', 'noneof', 3],
                        'AND',
                        ['custrecord_hris_lve_cancel_leavestatus', 'noneof', 2],
                        'AND',
                        /* [
                            [
                                ['custrecord_hris_lve_fromdate', 'within', frm_date_val, to_date_val],
                                'OR',
                                ['custrecord_hris_lve_todate', 'within', frm_date_val, to_date_val],
                                'OR',
                                [
                                    ['custrecord_hris_lve_fromdate', 'onorafter', frm_date_val],
                                    'AND',
                                    ['custrecord_hris_lve_todate', 'onorbefore', to_date_val]
                                ]
                            ]
                        ] */

                        [[["custrecord_hris_lve_fromdate","within",frm_date_val,to_date_val]],
                        "OR",[["custrecord_hris_lve_todate","within",frm_date_val,to_date_val]],
                        "OR",[["custrecord_hris_lve_fromdate","onorafter",frm_date_val],
                        "AND",["custrecord_hris_lve_todate","onorbefore",to_date_val]]]

                    ],
                    columns: [
                        'custrecord_hris_lve_fromdate',
                        'custrecord_hris_lve_todate',
                        'custrecord_hris_lve_leavetype'
                    ]
                }).run().getRange({ start: 0, end: 1000 });
                log.audit('Searchdate',searchdate.length);

                if (searchdate.length > 0) {
                    for (var i = 0; i < searchdate.length; i++) {
                        /* var present_frm_dt = format.parse({ value: searchdate[i].getValue('custrecord_hris_lve_fromdate'), type: format.Type.DATE });
                        var present_to_dt = format.parse({ value: searchdate[i].getValue('custrecord_hris_lve_todate'), type: format.Type.DATE });

                        var E_leavetype = newRecord.getValue({ fieldId: 'custrecord_hris_lve_leavetype' });
                        var leave_type = search.lookupFields({ type: 'customrecord_hris_leaveconfig', id: E_leavetype, columns: ['externalid'] }).externalid;

                        if (leave_type !== '6' && (
                            (frm_date_val <= present_frm_dt && to_date_val >= present_frm_dt) ||
                            (frm_date_val >= present_frm_dt && frm_date_val <= present_to_dt)
                        )) { */
                            throw new Error(errornew);
                        //}
                    }
                }
            }
       
        }
            // Emergency Leave Deduction in Annual
            if (scriptContext.type !== scriptContext.UserEventType.CREATE && scriptContext.type !== scriptContext.UserEventType.DELETE) {
                var flag = 0;

                log.debug('##################:', '******************');

                var rec_id = scriptContext.newRecord.id;
                log.debug('rec_id :', ' rec_id' + rec_id);

                if (_logValidation(rec_id)) {

                    var leave_record = record.load({
                        type: 'customrecord_hris_leaveapplication',
                        id: rec_id
                    });
                    log.debug('leave_record :', 'leave_record' + leave_record);

                    var leave_type = leave_record.getValue('custrecord_hris_lve_leavetype');
                    log.debug('leave_type :', 'leave_type' + leave_type);
                    var seq_no = get_sequence_no(leave_type, query);

                    var hireDate = leave_record.getValue('custrecord_hris_lve_hiredate');
                    var employee = leave_record.getValue('custrecord_hris_lve_employeename');
                    log.debug('employee', 'employee =' + employee);

                    var leave_status = leave_record.getValue('custrecord_hris_lve_hrmsapprovalstatus');
                    log.debug('leave_status :', 'leave_status' + leave_status);

                    var leaveCANCEL_status = leave_record.getValue('custrecord_hris_lve_cancel_leavestatus');
                    log.debug('leaveCANCEL_status :', 'leaveCANCEL_status' + leaveCANCEL_status);

                    var cancelCHECk = leave_record.getValue('custrecord_hris_lve_cancellation');
                    log.debug('cancelCHECk :', 'cancelCHECk' + cancelCHECk);

                    var tot_no_days = leave_record.getValue('custrecord_hris_lve_totalnodays') || 0;
                    log.debug('tot_no_days', 'tot_no_days =' + tot_no_days);

                    var curDate = new Date();
                    var annualcheck = 0;
                    var annualseqno = 3;
                    //  var annualleavetype =1;
                    var annualleavetype = get_annualleave_type(annualseqno, query);
                    if (seq_no == 2 && employee && hireDate) {
                        log.debug("Inside")
                        //    var empQuery = "select * from employee  where id = " + employee + " and isinactive ='F'";
                        var empQuery = "select b.id as empcatagoryid ,b.custrecord_hris_empcat_seqno as seqno from employee  a join\
                      customrecord_hris_employeecategory b on  a.custentity_hris_empcategory = b.id where a.id =" + employee + " and b.isinactive='F'"

                        var queryResults = query.runSuiteQL({
                            query: empQuery,
                        });
                        var empQueryrecords = queryResults.asMappedResults();
                        // var visatextField = recordObj.getField("custpage_visaprocessingtext");

                        if (empQueryrecords.length > 0) {
                            var rec = empQueryrecords[0];
                            // var empcatagory = rec.custentity_hris_empcategory;
                            var empcatagory = rec.seqno;
                        }
                        log.audit("empcatagory", empcatagory)
                        if (empcatagory == 1 || empcatagory == 3) {

                            var compareDate = moment(hireDate).add(670, 'days');
                            compareDate = format.parse({
                                value: compareDate,
                                type: format.Type.DATE
                            });


                            if (compareDate >= curDate) {
                                annualcheck = 1;
                                // return false;
                            }
                            // Annual Leave Rejoin date Checking
                            var leaveQuery = "select * from customrecord_hris_leaveapplication  where custrecord_hris_lve_leavetype in(" + annualleavetype + ")\
                         and custrecord_hris_lve_workresume ='T' and  isinactive ='F'and custrecord_hris_lve_employeename ="+ employee;

                            var queryResults = query.runSuiteQL({
                                query: leaveQuery,
                            });
                            log.debug("Labour Leavequery", leaveQuery);
                            var leaveQueryrecords = queryResults.asMappedResults();
                            // var visatextField = recordObj.getField("custpage_visaprocessingtext");

                            if (leaveQueryrecords.length > 0) {
                                var rec = leaveQueryrecords[0];
                                var rejoindate = rec.custrecord_hris_lve_actualresumedate;
                                rejoindate = format.parse({
                                    value: rejoindate,
                                    type: format.Type.DATE
                                });
                                var compareDate = moment(rejoindate).add(670, 'days');
                                compareDate = format.parse({
                                    value: compareDate,
                                    type: format.Type.DATE
                                });


                                if (compareDate >= curDate) {

                                    log.debug("Not completion of 22 months of rejoining date of the previous annual leave.");
                                    annualcheck = 1;
                                    // return false;

                                }
                            }



                        }
                        else if (empcatagory == 2) {

                            log.debug('Inside Office staff');
                            var compareDate = moment(hireDate).add(365, 'days');
                            compareDate = format.parse({
                                value: compareDate,
                                type: format.Type.DATE
                            });

                            log.debug("Staff Comparedate 1", compareDate);
                            if (compareDate >= curDate) {
                                log.debug('Not completion of 12 months of service')
                                annualcheck = 1;
                                //  return false;
                            }
                            // Annual Leave Rejoin date Checking
                            var leaveQuery = "select * from customrecord_hris_leaveapplication  where custrecord_hris_lve_leavetype in(" + annualleavetype + ")\
                         and custrecord_hris_lve_workresume ='T' and  isinactive ='F'and custrecord_hris_lve_employeename ="+ employee;
                            log.debug("Staff Leavequery", leaveQuery);
                            var queryResults = query.runSuiteQL({
                                query: leaveQuery,
                            });

                            var leaveQueryrecords = queryResults.asMappedResults();
                            // var visatextField = recordObj.getField("custpage_visaprocessingtext");

                            if (leaveQueryrecords.length > 0) {
                                var rec = leaveQueryrecords[0];
                                var rejoindate = rec.custrecord_hris_lve_actualresumedate;
                                rejoindate = format.parse({
                                    value: rejoindate,
                                    type: format.Type.DATE
                                });
                                var compareDate = moment(rejoindate).add(365, 'days');
                                compareDate = format.parse({
                                    value: compareDate,
                                    type: format.Type.DATE
                                });


                                if (compareDate >= curDate) {

                                    log.debug('Not completion of 22 months of service')
                                    annualcheck = 1;
                                    //return false;

                                }
                            }


                        }
                        var total_applied = 0;
                        var leavebalancetaken = 0;
                        log.audit('annualcheck', annualcheck)
                        if (leave_status == 2 && annualcheck == 1) {
                            //var annualleavetype =2;
                            if (cancelCHECk == false) {

                                var leavebalQuery = "select * from customrecord_hris_leavebalance  where custrecord_hris_lvbal_leave_type in(" + annualleavetype + ")\
                                and isinactive ='F'and custrecord_hris_lvbal_employee_name ="+ employee;

                                var queryResults = query.runSuiteQL({
                                    query: leavebalQuery,
                                });
                                var leavebalQueryrecords = queryResults.asMappedResults();
                                // var visatextField = recordObj.getField("custpage_visaprocessingtext");

                                if (leavebalQueryrecords.length > 0) {
                                    var rec = leavebalQueryrecords[0];
                                    var leavebalid = rec.id;
                                    total_applied = rec.custrecord_hris_lvbal_total_applied_days || 0;
                                    leavebalancetaken = rec.custrecord_hris_lvbal_leave_balance_take || 0;


                                    log.debug('total_applied', 'total_applied =' + total_applied);

                                    var final_days = parseFloat(total_applied) + parseFloat(tot_no_days);
                                    var final_leavetaken = parseFloat(leavebalancetaken) + parseFloat(tot_no_days)
                                    log.debug('final_days', 'final_days =' + final_days);


                                    var updatedleavebalid = record.submitFields({
                                        type: 'customrecord_hris_leavebalance',
                                        id: leavebalid,
                                        values: {
                                            'custrecord_hris_lvbal_total_applied_days': final_days,
                                            'custrecord_hris_lvbal_leave_balance_take': final_leavetaken
                                        },
                                        options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        }
                                    });
                                    log.debug(" updatedleavebalid", updatedleavebalid)


                                }
                                // }
                            }
                            else if (cancelCHECk == true && leaveCANCEL_status == 2) {

                                var leavebalQuery = "select * from customrecord_hris_leavebalance  where custrecord_hris_lvbal_leave_type in(" + annualleavetype + ")\
                            and isinactive ='F'and custrecord_hris_lvbal_employee_name ="+ employee;

                                var queryResults = query.runSuiteQL({
                                    query: leavebalQuery,
                                });
                                var leavebalQueryrecords = queryResults.asMappedResults();
                                // var visatextField = recordObj.getField("custpage_visaprocessingtext");

                                if (leavebalQueryrecords.length > 0) {
                                    var rec = leavebalQueryrecords[0];

                                    total_applied = rec.custrecord_hris_lvbal_total_applied_days || 0;
                                    leavebalancetaken = rec.custrecord_hris_lvbal_leave_balance_take || 0;
                                    var leavebalid = rec.id;

                                    log.debug('total_applied', 'total_applied =' + total_applied);

                                    var final_days = parseFloat(total_applied) - parseFloat(tot_no_days);
                                    log.debug('final_days', 'final_days =' + final_days);
                                    var final_leavetaken = parseFloat(leavebalancetaken) - parseFloat(tot_no_days)

                                    var updatedleavebalid = record.submitFields({
                                        type: 'customrecord_hris_leavebalance',
                                        id: leavebalid,
                                        values: {
                                            'custrecord_hris_lvbal_total_applied_days': final_days,
                                            'custrecord_hris_lvbal_leave_balance_take': final_leavetaken
                                        },
                                        options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        }
                                    });
                                    log.debug(" updatedleavebalid", updatedleavebalid)


                                }

                            }
                        }

                        if (leave_status == 3 && annualcheck == 1) {

                            var leavebalQuery = "select * from customrecord_hris_leavebalance  where custrecord_hris_lvbal_leave_type in(" + annualleavetype + ")\
                        and isinactive ='F'and custrecord_hris_lvbal_employee_name ="+ employee;

                            var queryResults = query.runSuiteQL({
                                query: leavebalQuery,
                            });
                            var leavebalQueryrecords = queryResults.asMappedResults();
                            // var visatextField = recordObj.getField("custpage_visaprocessingtext");

                            if (leavebalQueryrecords.length > 0) {
                                var rec = leavebalQueryrecords[0];

                                total_applied = rec.custrecord_hris_lvbal_total_applied_days || 0;
                                leavebalancetaken = rec.custrecord_hris_lvbal_leave_balance_take || 0;
                                var leavebalid = rec.id;

                                log.debug('total_applied', 'total_applied =' + total_applied);

                                var final_days = parseFloat(total_applied) - parseFloat(tot_no_days);
                                log.debug('final_days', 'final_days =' + final_days);
                                var final_leavetaken = parseFloat(leavebalancetaken) - parseFloat(tot_no_days)

                                var updatedleavebalid = record.submitFields({
                                    type: 'customrecord_hris_leavebalance',
                                    id: leavebalid,
                                    values: {
                                        'custrecord_hris_lvbal_total_applied_days': final_days,
                                        'custrecord_hris_lvbal_leave_balance_take': final_leavetaken
                                    },
                                    options: {
                                        enableSourcing: false,
                                        ignoreMandatoryFields: true
                                    }
                                });
                                log.debug(" updatedleavebalid", updatedleavebalid)


                            }

                        }
                    }
                }
            }
        }

        function _logValidation(value) {
            return (value !== null && value !== undefined && value !== '');
        }
        function afterSubmit(scriptContext) {
            if (scriptContext.type !== scriptContext.UserEventType.DELETE) {
                var newRecord = scriptContext.newRecord;
                var RECid = newRecord.id;
                var LoadRec = record.load({ type: 'customrecord_hris_leaveapplication', id: RECid });
                var Leave_type = LoadRec.getValue({ fieldId: 'custrecord_hris_lve_leavetype' });
                var Employee = LoadRec.getValue({ fieldId: 'custrecord_hris_lve_employeename' });
    
                var sequence_value = get_sequence_no(Leave_type,query);
                if (sequence_value === '5') {
                    var status = LoadRec.getValue({ fieldId: 'custrecord_hris_lve_hrmsapprovalstatus' });
                    var cancel_status = LoadRec.getValue({ fieldId: 'custrecord_hris_lve_cancel_leavestatus' });
                    var valid_till_date = LoadRec.getValue({ fieldId: 'custrecord_hris_lve_validtilldate' });
    
                    var filters = [
                        ['custrecord_hris_rcomp_valid_till_date', 'on', valid_till_date],
                        'AND',
                        ['custrecord_hris_rcomp_employee_name', 'is', Employee]
                    ];
    
                    var compoff_record_result = search.create({
                        type: 'customrecord_hris_lve_raise_comp_off',
                        filters: filters,
                        columns: ['internalid']
                    }).run().getRange({ start: 0, end: 1 });
    
                    if (compoff_record_result.length > 0) {
                        var id = compoff_record_result[0].getValue({ name: 'internalid' });
                        record.submitFields({
                            type: 'customrecord_hris_lve_raise_comp_off',
                            id: id,
                            values: { 'custrecord_hris_rcomp_checked': status === '3' || cancel_status === '2' ? 'F' : 'T' }
                        });
                    }
                }
            }
        }
    
        
    
        return {
            beforeSubmit: beforeSubmit,
            afterSubmit:afterSubmit
        };
    });
function get_sequence_no(leave_type, query) {

    var leavesequencesql = "select * from customrecord_hris_leaveconfig where id ='" + leave_type + "' and isinactive ='F'"
    log.debug("leavesequencesql", leavesequencesql);
    var queryResult = query.runSuiteQL({
        query: leavesequencesql,
    });
    var leavesequencesqlrecords = queryResult.asMappedResults();


    log.debug(" leavesequencesqlrecords.length", leavesequencesqlrecords.length);
    if (leavesequencesqlrecords.length > 0) {


        var sequence_no = leavesequencesqlrecords[0].custrecord_hris_lvecnfg_seqno;
    }
    return sequence_no;
}
function get_annualleave_type(sequence_no, query) {
var annualleavetypearray=[];
    var leavesequencesql = "select * from customrecord_hris_leaveconfig where custrecord_hris_lvecnfg_seqno = " + sequence_no + " and isinactive ='F'"
    log.debug("leavesequencesql", leavesequencesql);
    var queryResult = query.runSuiteQL({
        query: leavesequencesql,
    });
    var leavesequencesqlrecords = queryResult.asMappedResults();


    log.debug(" leavesequencesqlrecords.length", leavesequencesqlrecords.length);
    if (leavesequencesqlrecords.length > 0) {
        for(var i=0;i<leavesequencesqlrecords.length;i++){
            var annualleavetype = leavesequencesqlrecords[0].id;
            annualleavetypearray.push(annualleavetype);
        }


       
    }
    return annualleavetypearray;
}
function searchLeaveBalance(leaveType, employee,search) {
    var leaveBalanceResults = search.create({
        type: 'customrecord_hris_leavebalance',
        filters: [
            ['custrecord_hris_lvbal_leave_type', 'is', leaveType],
            'AND',
            ['custrecord_hris_lvbal_employee_name', 'is', employee],
            'AND',
            ['isinactive', 'is', 'F']
        ],
        columns: [
            'internalid',
            'custrecord_hris_lvbal_total_applied_days',
            'custrecord_hris_lvbal_available_leave_ba'
        ]
    }).run().getRange({ start: 0, end: 1 });

    return leaveBalanceResults;
}

function getsequenceno(leaveType,search) {
    var results = search.create({
        type: 'customrecord_hris_leaveconfig',
        filters: [['internalid', 'is', leaveType]],
        columns: [
            'custrecord_hris_lvecnfg_seqno',
            'custrecord_hris_lveconfig_allowneglevbal',
            'custrecord_hris_lvecfg_maxnegativebal'
        ]
    }).run().getRange({ start: 0, end: 1 });

    if (results.length > 0) {
        return results[0].getValue('custrecord_hris_lvecnfg_seqno') + "#" +
            results[0].getValue('custrecord_hris_lveconfig_allowneglevbal') + "#" +
            results[0].getValue('custrecord_hris_lvecfg_maxnegativebal');
    }
    return "0#F#0";
}
