/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/search', 'N/query', 'N/format', 'N/record', 'N/currentRecord', 'N/url', './moment.js', 'N/runtime'],
    (search, query, format, record, currentRecord, url, moment, runtime) => {

        const beforeSubmit = (scriptContext) => {
            // Leave Balance Apply
            if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                const error = 'Leaves exceed the leave balance available';
                const newRecord = scriptContext.newRecord;
                const leaveType = newRecord.getValue('custrecord_hris_lve_leavetype');
                const totalDays = parseFloat(newRecord.getValue('custrecord_hris_lve_totalnodays')) || 0;
                const employee = newRecord.getValue('custrecord_hris_lve_employeename');

                log.debug('leaveType', leaveType);
                log.debug('totalDays', totalDays);
                log.debug('employee', employee);

                const seqNoData = getsequenceno(leaveType, search);
                const seqNoSplit = seqNoData.split('#');
                const seqNo = seqNoSplit[0];

                if (seqNo != 3 && seqNo != 2 && seqNo != 8 && seqNo != 13) {
                    const leaveBalanceResults = searchLeaveBalance(leaveType, employee, search);
                    if (leaveBalanceResults.length > 0) {
                        const leaveBalance = parseFloat(leaveBalanceResults[0].getValue('custrecord_hris_lvbal_available_leave_ba')) || 0;
                        const appliedBal = parseFloat(leaveBalanceResults[0].getValue('custrecord_hris_lvbal_total_applied_days')) || 0;
                        const finalAppliedDays = appliedBal + totalDays;

                        log.debug('leaveBalance', leaveBalance);
                        log.debug('finalAppliedDays', finalAppliedDays);

                        if (finalAppliedDays > leaveBalance) {
                            throw new Error(error);
                        }
                    }
                }

                // Leave Application Record - Overlap Check
                const emp_name = newRecord.getValue({ fieldId: 'custrecord_hris_lve_employeename' });
                const errornew = 'This record is already Present for the applied date';

                const frm_dt_VL = newRecord.getValue({ fieldId: 'custrecord_hris_lve_fromdate' });
                const frm_date_val = moment(frm_dt_VL).format('DD/MM/YYYY');
                log.audit('frm_date_val', frm_date_val);

                const to_DTVL = newRecord.getValue({ fieldId: 'custrecord_hris_lve_todate' });
                const to_date_val = moment(to_DTVL).format('DD/MM/YYYY');
                log.audit('to_date_val', to_date_val);

                if (frm_date_val && to_date_val) {
                    const searchdate = search.create({
                        type: 'customrecord_hris_leaveapplication',
                        filters: [
                            ['custrecord_hris_lve_employeename', 'is', emp_name],
                            'AND',
                            ['custrecord_hris_lve_hrmsapprovalstatus', 'noneof', 3],
                            'AND',
                            ['custrecord_hris_lve_cancel_leavestatus', 'noneof', 2],
                            'AND',
                            [
                                [['custrecord_hris_lve_fromdate', 'within', frm_date_val, to_date_val]],
                                'OR',
                                [['custrecord_hris_lve_todate', 'within', frm_date_val, to_date_val]],
                                'OR',
                                [
                                    ['custrecord_hris_lve_fromdate', 'onorafter', frm_date_val],
                                    'AND',
                                    ['custrecord_hris_lve_todate', 'onorbefore', to_date_val]
                                ]
                            ]
                        ],
                        columns: [
                            'custrecord_hris_lve_fromdate',
                            'custrecord_hris_lve_todate',
                            'custrecord_hris_lve_leavetype'
                        ]
                    }).run().getRange({ start: 0, end: 1000 });

                    log.audit('Searchdate', searchdate.length);

                    if (searchdate.length > 0) {
                        throw new Error(errornew);
                    }
                }
            }

            // Emergency Leave Deduction in Annual
            if (scriptContext.type !== scriptContext.UserEventType.CREATE &&
                scriptContext.type !== scriptContext.UserEventType.DELETE) {

                log.debug('##################:', '******************');

                const rec_id = scriptContext.newRecord.id;
                log.debug('rec_id :', ' rec_id' + rec_id);

                if (_logValidation(rec_id)) {
                    const leave_record = record.load({
                        type: 'customrecord_hris_leaveapplication',
                        id: rec_id
                    });
                    log.debug('leave_record :', 'leave_record' + leave_record);

                    const leave_type = leave_record.getValue('custrecord_hris_lve_leavetype');
                    log.debug('leave_type :', 'leave_type' + leave_type);

                    const seq_no = get_sequence_no(leave_type, query);
                    const hireDate = leave_record.getValue('custrecord_hris_lve_hiredate');
                    const employee = leave_record.getValue('custrecord_hris_lve_employeename');
                    log.debug('employee', 'employee =' + employee);

                    const leave_status = leave_record.getValue('custrecord_hris_lve_hrmsapprovalstatus');
                    log.debug('leave_status :', 'leave_status' + leave_status);

                    const leaveCANCEL_status = leave_record.getValue('custrecord_hris_lve_cancel_leavestatus');
                    log.debug('leaveCANCEL_status :', 'leaveCANCEL_status' + leaveCANCEL_status);

                    const cancelCHECk = leave_record.getValue('custrecord_hris_lve_cancellation');
                    log.debug('cancelCHECk :', 'cancelCHECk' + cancelCHECk);

                    const tot_no_days = leave_record.getValue('custrecord_hris_lve_totalnodays') || 0;
                    log.debug('tot_no_days', 'tot_no_days =' + tot_no_days);

                    const curDate = new Date();
                    let annualcheck = 0;
                    const annualseqno = 3;
                    const annualleavetype = get_annualleave_type(annualseqno, query);

                    if (seq_no == 2 && employee && hireDate) {
                        log.debug('Inside');

                        const empQuery = `select b.id as empcatagoryid ,b.custrecord_hris_empcat_seqno as seqno 
                            from employee a 
                            join customrecord_hris_employeecategory b on a.custentity_hris_empcategory = b.id 
                            where a.id = ${employee} and b.isinactive='F'`;

                        const empQueryrecords = query.runSuiteQL({ query: empQuery }).asMappedResults();

                        let empcatagory = '';
                        if (empQueryrecords.length > 0) {
                            empcatagory = empQueryrecords[0].seqno;
                        }
                        log.audit('empcatagory', empcatagory);

                        if (empcatagory == 1 || empcatagory == 3) {
                            let compareDate = moment(hireDate).add(670, 'days');
                            compareDate = format.parse({ value: compareDate, type: format.Type.DATE });

                            if (compareDate >= curDate) {
                                annualcheck = 1;
                            }

                            // Annual Leave Rejoin date Checking
                            const leaveQuery = `select * from customrecord_hris_leaveapplication  
                                where custrecord_hris_lve_leavetype in(${annualleavetype})
                                and custrecord_hris_lve_workresume ='T' 
                                and isinactive ='F'
                                and custrecord_hris_lve_employeename = ${employee}`;

                            const leaveQueryrecords = query.runSuiteQL({ query: leaveQuery }).asMappedResults();
                            log.debug('Labour Leavequery', leaveQuery);

                            if (leaveQueryrecords.length > 0) {
                                let rejoindate = leaveQueryrecords[0].custrecord_hris_lve_actualresumedate;
                                rejoindate = format.parse({ value: rejoindate, type: format.Type.DATE });

                                compareDate = moment(rejoindate).add(670, 'days');
                                compareDate = format.parse({ value: compareDate, type: format.Type.DATE });

                                if (compareDate >= curDate) {
                                    log.debug('Not completion of 22 months of rejoining date of the previous annual leave.');
                                    annualcheck = 1;
                                }
                            }
                        } else if (empcatagory == 2) {
                            log.debug('Inside Office staff');

                            let compareDate = moment(hireDate).add(365, 'days');
                            compareDate = format.parse({ value: compareDate, type: format.Type.DATE });
                            log.debug('Staff Comparedate 1', compareDate);

                            if (compareDate >= curDate) {
                                log.debug('Not completion of 12 months of service');
                                annualcheck = 1;
                            }

                            // Annual Leave Rejoin date Checking
                            const leaveQuery = `select * from customrecord_hris_leaveapplication  
                                where custrecord_hris_lve_leavetype in(${annualleavetype})
                                and custrecord_hris_lve_workresume ='T' 
                                and isinactive ='F'
                                and custrecord_hris_lve_employeename = ${employee}`;

                            log.debug('Staff Leavequery', leaveQuery);
                            const leaveQueryrecords = query.runSuiteQL({ query: leaveQuery }).asMappedResults();

                            if (leaveQueryrecords.length > 0) {
                                let rejoindate = leaveQueryrecords[0].custrecord_hris_lve_actualresumedate;
                                rejoindate = format.parse({ value: rejoindate, type: format.Type.DATE });

                                compareDate = moment(rejoindate).add(365, 'days');
                                compareDate = format.parse({ value: compareDate, type: format.Type.DATE });

                                if (compareDate >= curDate) {
                                    log.debug('Not completion of 22 months of service');
                                    annualcheck = 1;
                                }
                            }
                        }

                        let total_applied = 0;
                        let leavebalancetaken = 0;
                        log.audit('annualcheck', annualcheck);

                        if (leave_status == 2 && annualcheck == 1) {
                            if (cancelCHECk == false) {
                                const leavebalQuery = `select * from customrecord_hris_leavebalance  
                                    where custrecord_hris_lvbal_leave_type in(${annualleavetype})
                                    and isinactive ='F'
                                    and custrecord_hris_lvbal_employee_name = ${employee}`;

                                const leavebalQueryrecords = query.runSuiteQL({ query: leavebalQuery }).asMappedResults();

                                if (leavebalQueryrecords.length > 0) {
                                    const rec = leavebalQueryrecords[0];
                                    const leavebalid = rec.id;
                                    total_applied = rec.custrecord_hris_lvbal_total_applied_days || 0;
                                    leavebalancetaken = rec.custrecord_hris_lvbal_leave_balance_take || 0;

                                    log.debug('total_applied', 'total_applied =' + total_applied);

                                    const final_days = parseFloat(total_applied) + parseFloat(tot_no_days);
                                    const final_leavetaken = parseFloat(leavebalancetaken) + parseFloat(tot_no_days);
                                    log.debug('final_days', 'final_days =' + final_days);

                                    const updatedleavebalid = record.submitFields({
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
                                    log.debug('updatedleavebalid', updatedleavebalid);
                                }
                            } else if (cancelCHECk == true && leaveCANCEL_status == 2) {
                                const leavebalQuery = `select * from customrecord_hris_leavebalance  
                                    where custrecord_hris_lvbal_leave_type in(${annualleavetype})
                                    and isinactive ='F'
                                    and custrecord_hris_lvbal_employee_name = ${employee}`;

                                const leavebalQueryrecords = query.runSuiteQL({ query: leavebalQuery }).asMappedResults();

                                if (leavebalQueryrecords.length > 0) {
                                    const rec = leavebalQueryrecords[0];
                                    total_applied = rec.custrecord_hris_lvbal_total_applied_days || 0;
                                    leavebalancetaken = rec.custrecord_hris_lvbal_leave_balance_take || 0;
                                    const leavebalid = rec.id;

                                    log.debug('total_applied', 'total_applied =' + total_applied);

                                    const final_days = parseFloat(total_applied) - parseFloat(tot_no_days);
                                    log.debug('final_days', 'final_days =' + final_days);
                                    const final_leavetaken = parseFloat(leavebalancetaken) - parseFloat(tot_no_days);

                                    const updatedleavebalid = record.submitFields({
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
                                    log.debug('updatedleavebalid', updatedleavebalid);
                                }
                            }
                        }

                        if (leave_status == 3 && annualcheck == 1) {
                            const leavebalQuery = `select * from customrecord_hris_leavebalance  
                                where custrecord_hris_lvbal_leave_type in(${annualleavetype})
                                and isinactive ='F'
                                and custrecord_hris_lvbal_employee_name = ${employee}`;

                            const leavebalQueryrecords = query.runSuiteQL({ query: leavebalQuery }).asMappedResults();

                            if (leavebalQueryrecords.length > 0) {
                                const rec = leavebalQueryrecords[0];
                                total_applied = rec.custrecord_hris_lvbal_total_applied_days || 0;
                                leavebalancetaken = rec.custrecord_hris_lvbal_leave_balance_take || 0;
                                const leavebalid = rec.id;

                                log.debug('total_applied', 'total_applied =' + total_applied);

                                const final_days = parseFloat(total_applied) - parseFloat(tot_no_days);
                                log.debug('final_days', 'final_days =' + final_days);
                                const final_leavetaken = parseFloat(leavebalancetaken) - parseFloat(tot_no_days);

                                const updatedleavebalid = record.submitFields({
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
                                log.debug('updatedleavebalid', updatedleavebalid);
                            }
                        }
                    }
                }
            }
        };

        const afterSubmit = (scriptContext) => {
            if (scriptContext.type !== scriptContext.UserEventType.DELETE) {
                const newRecord = scriptContext.newRecord;
                const RECid = newRecord.id;

                const LoadRec = record.load({
                    type: 'customrecord_hris_leaveapplication',
                    id: RECid
                });

                const Leave_type = LoadRec.getValue({ fieldId: 'custrecord_hris_lve_leavetype' });
                const Employee = LoadRec.getValue({ fieldId: 'custrecord_hris_lve_employeename' });

                const sequence_value = get_sequence_no(Leave_type, query);

                if (sequence_value === '5') {
                    const status = LoadRec.getValue({ fieldId: 'custrecord_hris_lve_hrmsapprovalstatus' });
                    const cancel_status = LoadRec.getValue({ fieldId: 'custrecord_hris_lve_cancel_leavestatus' });
                    const valid_till_date = LoadRec.getValue({ fieldId: 'custrecord_hris_lve_validtilldate' });

                    const filters = [
                        ['custrecord_hris_rcomp_valid_till_date', 'on', valid_till_date],
                        'AND',
                        ['custrecord_hris_rcomp_employee_name', 'is', Employee]
                    ];

                    const compoff_record_result = search.create({
                        type: 'customrecord_hris_lve_raise_comp_off',
                        filters: filters,
                        columns: ['internalid']
                    }).run().getRange({ start: 0, end: 1 });

                    if (compoff_record_result.length > 0) {
                        const id = compoff_record_result[0].getValue({ name: 'internalid' });
                        record.submitFields({
                            type: 'customrecord_hris_lve_raise_comp_off',
                            id: id,
                            values: {
                                'custrecord_hris_rcomp_checked': (status === '3' || cancel_status === '2') ? 'F' : 'T'
                            }
                        });
                    }
                }
            }
        };

        const _logValidation = (value) => {
            return (value !== null && value !== undefined && value !== '');
        };

        return {
            beforeSubmit,
            afterSubmit
        };
    });

// =====================================================
// Helper Functions (outside the define for compatibility)
// =====================================================

const get_sequence_no = (leave_type, query) => {
    const leavesequencesql = `select * from customrecord_hris_leaveconfig where id ='${leave_type}' and isinactive ='F'`;
    log.debug('leavesequencesql', leavesequencesql);

    const leavesequencesqlrecords = query.runSuiteQL({ query: leavesequencesql }).asMappedResults();
    log.debug('leavesequencesqlrecords.length', leavesequencesqlrecords.length);

    if (leavesequencesqlrecords.length > 0) {
        return leavesequencesqlrecords[0].custrecord_hris_lvecnfg_seqno;
    }
    return '';
};

const get_annualleave_type = (sequence_no, query) => {
    const annualleavetypearray = [];
    const leavesequencesql = `select * from customrecord_hris_leaveconfig where custrecord_hris_lvecnfg_seqno = ${sequence_no} and isinactive ='F'`;
    log.debug('leavesequencesql', leavesequencesql);

    const leavesequencesqlrecords = query.runSuiteQL({ query: leavesequencesql }).asMappedResults();
    log.debug('leavesequencesqlrecords.length', leavesequencesqlrecords.length);

    if (leavesequencesqlrecords.length > 0) {
        for (let i = 0; i < leavesequencesqlrecords.length; i++) {
            annualleavetypearray.push(leavesequencesqlrecords[i].id);
        }
    }
    return annualleavetypearray;
};

const searchLeaveBalance = (leaveType, employee, search) => {
    return search.create({
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
};

const getsequenceno = (leaveType, search) => {
    const results = search.create({
        type: 'customrecord_hris_leaveconfig',
        filters: [['internalid', 'is', leaveType]],
        columns: [
            'custrecord_hris_lvecnfg_seqno',
            'custrecord_hris_lveconfig_allowneglevbal',
            'custrecord_hris_lvecfg_maxnegativebal'
        ]
    }).run().getRange({ start: 0, end: 1 });

    if (results.length > 0) {
        return results[0].getValue('custrecord_hris_lvecnfg_seqno') + '#' +
            results[0].getValue('custrecord_hris_lveconfig_allowneglevbal') + '#' +
            results[0].getValue('custrecord_hris_lvecfg_maxnegativebal');
    }
    return '0#F#0';
};