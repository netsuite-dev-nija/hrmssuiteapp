/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([
    'N/search',
    'N/query',
    'N/format',
    'N/record',
    'N/currentRecord',
    'N/url',
    './moment.js',
    'N/runtime'
], (search, query, format, record, currentRecord, url, moment, runtime) => {

    const pageInit = (scriptContext) => {
        try {
            const leaverecord = scriptContext.currentRecord;

            if (scriptContext.mode === 'create') {
                const windowUrl = window.location.href;
                const urlParams = new URL(windowUrl).searchParams;
                const emp = urlParams.get('record.custrecord_hris_lve_employeename');

                if (emp) {
                    leaverecord.setValue({
                        fieldId: 'custrecord_hris_lve_employeename',
                        value: emp,
                        ignoreFieldChange: true,
                        forceSyncSourcing: true
                    });
                }
            }
        } catch (e) {
            console.log('error in pageInit : ' + e);
        }
    };

    const fieldChanged = (scriptContext) => {
        try {
            const leaverecord = scriptContext.currentRecord;

            // =====================================================
            // From Date / To Date / Total Days
            // =====================================================
            if (scriptContext.fieldId === 'custrecord_hris_lve_fromdate' ||
                scriptContext.fieldId === 'custrecord_hris_lve_todate' ||
                scriptContext.fieldId === 'custrecord_hris_lve_totalnodays') {

                let fromdate = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_fromdate' }) || '';
                let todate = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_todate' }) || '';

                const approvalstatus = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_hrmsapprovalstatus' });
                const leavetype = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_leavetype' }) || '';
                const Leave_type_seqno = get_sequence_no(leavetype);

                // ----- Annual Leave Balance Calculation -----
                if (fromdate && approvalstatus != 2 && Leave_type_seqno == 3) {
                    fromdate = format.parse({ value: fromdate, type: format.Type.DATE });
                    if (todate) {
                        todate = format.parse({ value: todate, type: format.Type.DATE });
                    }

                    const empname = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_employeename' }) || '';
                    const empDetails = getEmployeeStatus(empname);

                    if (empDetails && empDetails.length > 0) {
                        const empDetailsRecord = empDetails[0];
                        const empStatus = empDetailsRecord.empStatus;
                        const empJoinDate = empDetailsRecord.empJoinDate;

                        const empHireDateObj = format.parse({
                            value: empJoinDate,
                            type: format.Type.DATE
                        });

                        if (empStatus == 3) {
                            let dateConsidered;
                            let finalleavebal = 0;

                            const obDetails = getEmployeeOBDetails(empname, leavetype);

                            if (obDetails && obDetails.length > 0) {
                                const obDetailsecord = obDetails[0];
                                const obDate = obDetailsecord.obdate;

                                const parsedOBDate = format.parse({
                                    value: obDate,
                                    type: format.Type.DATE
                                });

                                dateConsidered = new Date(parsedOBDate);
                                dateConsidered.setDate(dateConsidered.getDate() + 1);
                            } else {
                                dateConsidered = empHireDateObj;
                            }

                            finalleavebal = searchLeaveBalance(
                                empname, query, empHireDateObj, format, moment,
                                dateConsidered, fromdate, leavetype
                            );

                            leaverecord.setValue({
                                fieldId: 'custrecord_hris_lve_leavebalance',
                                value: finalleavebal.toFixed(2),
                                ignoreFieldChange: true,
                                forceSyncSourcing: true
                            });

                            const roundfinalleavebal = GetRoundOffvalue(finalleavebal);
                            leaverecord.setValue({
                                fieldId: 'custrecord_hris_lve_leavebalance_wholeno',
                                value: roundfinalleavebal,
                                ignoreFieldChange: true,
                                forceSyncSourcing: true
                            });
                        }
                    }
                }

                // ----- Emergency Leave (seq 13) -----
                if (fromdate && todate && Leave_type_seqno == 13) {
                    const fromdateyear = fromdate.getFullYear();
                    let totaldays = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' }) || 0;
                    const empname = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_employeename' }) || '';

                    const totalnodays = gettingemergencyleavedays(empname, leavetype, fromdateyear);
                    totaldays = parseFloat(totaldays) + parseFloat(totalnodays);

                    if (totaldays != 0 && totaldays > 15) {
                        alert('You Should not apply Emergency Leave greater than 15');
                        leaverecord.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                        leaverecord.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                        return false;
                    }
                }

                // ----- Annual Leave max days check (seq 3) -----
                if (fromdate && todate && Leave_type_seqno == 3) {
                    const empname = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_employeename' }) || '';

                    const empcatagorylist = getemployeecatagorysequence(empname);
                    const empcatagorydetails = empcatagorylist.toString().split('#');
                    const empcatagory = empcatagorydetails[0];
                    const empcatagorydays = empcatagorydetails[1];

                    const negativeallowancelist = getnegativeallow(leavetype);
                    const negativeallowancedetails = negativeallowancelist.toString().split('#');
                    const negativeallowcheck = negativeallowancedetails[1];
                    const maxnegativeallow = negativeallowancedetails[2];

                    const fromdateyear = fromdate.getFullYear();
                    let totaldays = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' }) || 0;

                    const totalnodays = gettingannualleavedays(empname, leavetype, fromdateyear);
                    totaldays = parseFloat(totaldays) + parseFloat(totalnodays);

                    const comparedays = (negativeallowcheck == 'T')
                        ? parseFloat(empcatagorydays) + parseFloat(maxnegativeallow)
                        : parseFloat(empcatagorydays);

                    if (totaldays != 0 && (empcatagory == 1 || empcatagory == 2 || empcatagory == 3) && totaldays > comparedays) {
                        alert('You should not apply Annual Leave greater than ' + comparedays);
                        leaverecord.setValue({ fieldId: 'custrecord_hris_lve_todate', value: '', ignoreFieldChange: false, forceSyncSourcing: true });
                        leaverecord.setValue({ fieldId: 'custrecord_hris_lve_totalnodays', value: '', ignoreFieldChange: false, forceSyncSourcing: true });
                        return false;
                    }
                }
            }

            // =====================================================
            // From Date only
            // =====================================================
            if (scriptContext.fieldId === 'custrecord_hris_lve_fromdate') {
                const emp_name = leaverecord.getValue('custrecord_hris_lve_employeename');
                const Leave_type = leaverecord.getValue('custrecord_hris_lve_leavetype') || '';
                const hireDate = leaverecord.getValue('custrecord_hris_lve_hiredate');
                let fromdate = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_fromdate' }) || '';
                // Added for Last Working Date
                    if (fromdate) {

                        // Convert to Date object (safety)
                        var fromDateObj = new Date(fromdate);

                        // Subtract 1 day
                        fromDateObj.setDate(fromDateObj.getDate() - 1);

                        // Set Last Working Date
                        leaverecord.setValue({
                            fieldId: 'custrecord_hris_lve_lastworkingdate',
                            value: fromDateObj
                        });
                    }

                if (Leave_type) {
                    const Leave_type_seqno = get_sequence_no(Leave_type);
                    const servicecheckdetails = get_service_check(Leave_type);
                    const servicecheckdetailsarray = servicecheckdetails.split('#');
                    const servicecheck = servicecheckdetailsarray[0];
                    const servicedays = servicecheckdetailsarray[1];

                    // Service period check for Annual Leave
                    if (Leave_type_seqno == 3 && servicecheck == 'T' && emp_name && hireDate && fromdate != '') {
                        const empcatagorylist = getemployeecatagorysequence(emp_name);
                        const empcatagorydetails = empcatagorylist.toString().split('#');
                        const empcatagory = empcatagorydetails[0];

                        let compareDate = moment(hireDate).add(servicedays, 'days');
                        compareDate = format.parse({ value: compareDate, type: format.Type.DATE });

                        if (compareDate >= fromdate) {
                            alert('You are allowed to take Annual Leave only after completion of service');
                            leaverecord.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                            return false;
                        }

                        // Rejoin date check
                        const rejoindate = gettingleaverejoindate(Leave_type, emp_name);
                        if (rejoindate != '') {
                            compareDate = moment(rejoindate).add(servicedays, 'days');
                            compareDate = format.parse({ value: compareDate, type: format.Type.DATE });

                            if (compareDate >= fromdate) {
                                alert('You are allowed to take Annual Leave only after completion of rejoining date of the previous annual leave.');
                                leaverecord.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                                return false;
                            }
                        }
                    }

                    // Generic service period check
                    if (servicecheck == 'T' && servicedays != 0 && fromdate != '') {
                        let compareDate = moment(hireDate).add(servicedays, 'days');
                        compareDate = format.parse({ value: compareDate, type: format.Type.DATE });

                        if (compareDate >= fromdate) {
                            alert('You are allowed to take this leave after completion of one year');
                            leaverecord.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                            return false;
                        }
                    }

                    // Confirmed employee check
                    if (Leave_type_seqno != 2 && Leave_type_seqno != 5 && Leave_type_seqno != 25) {
                        const employeesql = `select * from employee where id ='${emp_name}' and custentity_emp_employee_job_status =3 and isinactive ='F'`;
                        const employeesqlrecords = query.runSuiteQL({ query: employeesql }).asMappedResults();

                        if (employeesqlrecords.length === 0) {
                            alert('Selected Leave can be applied once your appointment status is CONFIRMED!');
                            leaverecord.setValue({ fieldId: 'custrecord_hris_lve_leavetype', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                            leaverecord.setValue({ fieldId: 'custrecord_hris_lve_leavebalance', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                            leaverecord.setValue({ fieldId: 'custrecord_hris_lve_leavebalance_wholeno', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                            return false;
                        }
                    }

                    // Comp-off leave validation
                    if (Leave_type_seqno == 5) {
                        const ValidtillDate = leaverecord.getValue('custrecord_hris_lve_validtilldate');
                        let fromDATE = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_fromdate' }) || '';

                        if (ValidtillDate) {
                            const formattedValidTill = moment(ValidtillDate).format('DD/MM/YYYY');
                            let compoffDATE = getcompoffdate(formattedValidTill, emp_name);

                            if (compoffDATE != '') {
                                compoffDATE = format.parse({ value: compoffDATE, type: format.Type.DATE });
                                fromDATE = format.parse({ value: fromDATE, type: format.Type.DATE });

                                if (fromDATE < compoffDATE) {
                                    alert('You can not apply leave on before date of raise compoff date');
                                    return false;
                                }
                            }
                        } else {
                            alert('Please raise the compoff first.');
                            leaverecord.setValue({ fieldId: 'custrecord_hris_lve_fromdate', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                            return false;
                        }
                    }
                }
            }

            // =====================================================
            // Employee Name change
            // =====================================================
            if (scriptContext.fieldId === 'custrecord_hris_lve_employeename') {
                const employee = leaverecord.getValue('custrecord_hris_lve_employeename');
                const employeecompensql = `select * from customrecord_hris_employee_compen_change where custrecord_hris_empchange_employee_nam ='${employee}' and isinactive ='F'`;
                const employeecompensqlrecords = query.runSuiteQL({ query: employeecompensql }).asMappedResults();

                if (employeecompensqlrecords.length === 0) {
                    alert('Selected Employee is connected with Payroll. And Pay Process Group is not defined for selected employee. Please contact HR team for further details !');
                    leaverecord.setValue({ fieldId: 'custrecord_hris_lve_employeename', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                    return false;
                }
            }

            // =====================================================
            // Leave Type change
            // =====================================================
            if (scriptContext.fieldId === 'custrecord_hris_lve_leavetype') {
                const Leave_type = leaverecord.getValue('custrecord_hris_lve_leavetype') || '';
                const emp_name = leaverecord.getValue('custrecord_hris_lve_employeename');

                if (Leave_type) {
                    const Leave_type_seqno = get_sequence_no(Leave_type);

                    if (Leave_type_seqno != 2 && Leave_type_seqno != 5 && Leave_type_seqno != 25) {
                        const employeesql = `select * from employee where id ='${emp_name}' and custentity_emp_employee_job_status =3 and isinactive ='F'`;
                        const employeesqlrecords = query.runSuiteQL({ query: employeesql }).asMappedResults();

                        if (employeesqlrecords.length === 0) {
                            alert('Selected Leave can be applied once your appointment status is CONFIRMED!');
                            leaverecord.setValue({ fieldId: 'custrecord_hris_lve_leavetype', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                            leaverecord.setValue({ fieldId: 'custrecord_hris_lve_leavebalance', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                            leaverecord.setValue({ fieldId: 'custrecord_hris_lve_leavebalance_wholeno', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                            return false;
                        }
                    }

                    // Comp-off type → set valid till date
                    if (Leave_type_seqno == 5) {
                        const compoffvalidDATElist = getcompoffvalidtilldate(emp_name);
                        const getcompoffvalidtilldatedetails = compoffvalidDATElist.toString().split('#');
                        let compoffvalidDATE = getcompoffvalidtilldatedetails[0];
                        const compoffvalidType = getcompoffvalidtilldatedetails[1];

                        if (compoffvalidDATE != '') {
                            compoffvalidDATE = format.parse({ value: compoffvalidDATE, type: format.Type.DATE });
                            leaverecord.setValue('custrecord_hris_lve_validtilldate', compoffvalidDATE, true, true);
                            leaverecord.setValue('custrecord_hris_comp_off_type', compoffvalidType, true, true);
                        }
                    }
                }
            }

            // =====================================================
            // Encashment days validation
            // =====================================================
            if (scriptContext.fieldId === 'custrecord_hris_lve_noofencashmentdays') {
                let applied_no_of_encashmentDays = leaverecord.getValue('custrecord_hris_lve_noofencashmentdays');
                let total_avail_encash_days = leaverecord.getValue('custrecord_hris_total_encashable_balance') || 0;
                const max_encashDays = leaverecord.getValue('custrecord_hris_lve_maxencashabledayalow') || 0;

                applied_no_of_encashmentDays = parseFloat(applied_no_of_encashmentDays);
                total_avail_encash_days = parseFloat(total_avail_encash_days);

                if (applied_no_of_encashmentDays > total_avail_encash_days) {
                    alert('Encashment Balance low');
                    leaverecord.setValue('custrecord_hris_lve_noofencashmentdays', '', true, true);
                }

                if (applied_no_of_encashmentDays > parseFloat(max_encashDays)) {
                    alert('You are allowed to Encash maximum ' + max_encashDays + ' days of leave');
                    leaverecord.setValue('custrecord_hris_lve_noofencashmentdays', '', true, true);
                }
            }

        } catch (e) {
            console.log('error in fieldChanged : ' + e);
        }
    };

    const saveRecord = (scriptContext) => {
        try {
            const leaverecord = scriptContext.currentRecord;
            const Leave_Encashment = leaverecord.getValue('custrecord_hris_lve_applylveencashment');

            if (Leave_Encashment === false) {
                let date = leaverecord.getValue('custrecord_hris_lve_fromdate');
                if (date) {
                    date = format.parse({ value: date, type: format.Type.DATE });
                    const month = date.getMonth() + 1;
                    const year = date.getFullYear();
                    leaverecord.setValue('custrecord_hris_lva_year', year, true, true);
                    leaverecord.setValue('custrecord_hris_lve_month', month, true, true);
                }
            }

            // Comp-off validation on save
            const leave_type = leaverecord.getValue('custrecord_hris_lve_leavetype');
            if (leave_type) {
                const EmployeeName = leaverecord.getValue('custrecord_hris_lve_employeename');
                let fromDATE = leaverecord.getValue('custrecord_hris_lve_fromdate');
                const SequenceNo = get_sequence_no(leave_type);

                if (SequenceNo == '5') {
                    let ValidtillDate = leaverecord.getValue('custrecord_hris_lve_validtilldate');
                    ValidtillDate = moment(ValidtillDate).format('DD/MM/YYYY');
                    let compoffDATE = getcompoffdate(ValidtillDate, EmployeeName);

                    if (compoffDATE) {
                        compoffDATE = format.parse({ value: compoffDATE, type: format.Type.DATE });
                        fromDATE = format.parse({ value: fromDATE, type: format.Type.DATE });

                        if (fromDATE < compoffDATE) {
                            alert('You can not apply leave on before date of raise compoff date');
                            return false;
                        }
                    }
                }
            }

            // Leave year / carry-forward validation
            const FromDate = leaverecord.getValue('custrecord_hris_lve_fromdate');
            const ToDate = leaverecord.getValue('custrecord_hris_lve_todate');
            const LeaveTYPE = leaverecord.getValue('custrecord_hris_lve_leavetype');
            const LeaveTYPE_text = leaverecord.getText('custrecord_hris_lve_leavetype');

            if (FromDate && ToDate) {
                const FromDate_STRING = format.parse({ value: FromDate, type: format.Type.DATE });
                const FromDate_YEAR = FromDate_STRING.getFullYear();
                const ToDate_STRING = format.parse({ value: ToDate, type: format.Type.DATE });
                const ToDate_YEAR = ToDate_STRING.getFullYear();

                const CalenderYear_Record = record.load({
                    type: 'customrecord_hris_leave_calender_year',
                    id: 1,
                    isDynamic: true
                });

                const Cal_EndYear = CalenderYear_Record.getValue('custrecord_hris_lvecalyr_endyr');
                const Cal_Endmonth = CalenderYear_Record.getValue('custrecord_hris_lvecalyr_endmth');
                const Cal_StartYear_String = CalenderYear_Record.getText('custrecord_hris_lvecalyr_startyr');
                const Cal_EndYear_String = CalenderYear_Record.getText('custrecord_hris_lvecalyr_endyr');

                const monthNo = getmonthno(Cal_Endmonth);
                const leavetypeSettings = getvalidations(LeaveTYPE).split(',');
                const carryforwardCHECK = leavetypeSettings[0];
                let carryforwardDAYS = leavetypeSettings[1];

                if (ToDate_YEAR > Cal_StartYear_String || ToDate_YEAR > Cal_EndYear_String) {
                    if (carryforwardCHECK === 'T') {
                        carryforwardDAYS = parseInt(carryforwardDAYS) || 0;

                        if (carryforwardDAYS > 0) {
                            const lastDay = new Date(parseInt(Cal_EndYear), parseInt(monthNo) + 1, 0);
                            const LastCarryFwd_DATE = moment(lastDay).add(carryforwardDAYS, 'days').format('DD/MM/YYYY');

                            if (FromDate_STRING > LastCarryFwd_DATE || ToDate_STRING > LastCarryFwd_DATE) {
                                alert(`You can apply ${LeaveTYPE_text} for next year within ${carryforwardDAYS} Days.`);
                                leaverecord.setValue('custrecord_hris_lve_todate', '', false);
                                leaverecord.setValue('custrecord_hris_lve_fromdate', '', false);
                                leaverecord.setValue('custrecord_hris_lve_leavetype', '', false);
                                leaverecord.setValue('custrecord_hris_lve_leavebalance', '', false);
                                leaverecord.setValue('custrecord_hris_lve_totalnodays', '', false);
                                return false;
                            }
                        }
                    } else if (carryforwardCHECK === 'F') {
                        if ((FromDate_YEAR > Cal_StartYear_String && FromDate_YEAR > Cal_EndYear_String) ||
                            (ToDate_YEAR > Cal_StartYear_String && ToDate_YEAR > Cal_EndYear_String)) {
                            alert(`You cannot Apply ${LeaveTYPE_text} for Next Year`);
                            leaverecord.setValue('custrecord_hris_lve_todate', '', false);
                            leaverecord.setValue('custrecord_hris_lve_fromdate', '', false);
                            leaverecord.setValue('custrecord_hris_lve_leavetype', '', false);
                            leaverecord.setValue('custrecord_hris_lve_leavebalance', '', false);
                            leaverecord.setValue('custrecord_hris_lve_totalnodays', '', false);
                            return false;
                        }
                    }
                }
            }

            return true;
        } catch (e) {
            console.log('error in saveRecord : ' + e);
            return true;
        }
    };

    // =====================================================
    // Helper Functions
    // =====================================================

    const get_sequence_no = (Leave_type) => {
        try {
            let sequence_no = '';
            const leavesequencesql = `select * from customrecord_hris_leaveconfig where id ='${Leave_type}' and isinactive ='F'`;
            const leavesequencesqlrecords = query.runSuiteQL({ query: leavesequencesql }).asMappedResults();

            if (leavesequencesqlrecords.length > 0) {
                sequence_no = leavesequencesqlrecords[0].custrecord_hris_lvecnfg_seqno;
            }
            return sequence_no;
        } catch (e) {
            console.log('error in get_sequence_no : ' + e);
        }
    };

    const get_service_check = (Leave_type) => {
        const leavesequencesql = `select * from customrecord_hris_leaveconfig where id ='${Leave_type}' and isinactive ='F'`;
        const leavesequencesqlrecords = query.runSuiteQL({ query: leavesequencesql }).asMappedResults();

        let servicecheck = '';
        let servicedays = '';
        if (leavesequencesqlrecords.length > 0) {
            servicecheck = leavesequencesqlrecords[0].custrecord_hris_lveconfig_servicecomplet;
            servicedays = leavesequencesqlrecords[0].custrecord_hris_lveconfig_sercompdays;
        }
        return servicecheck + '#' + servicedays;
    };

    const proratecheck = (Leave_type) => {
        try {
            let proratacheck = 'F';
            const leavesequencesql = `select * from customrecord_hris_leaveconfig where id ='${Leave_type}' and isinactive ='F'`;
            const leavesequencesqlrecords = query.runSuiteQL({ query: leavesequencesql }).asMappedResults();

            if (leavesequencesqlrecords.length > 0) {
                proratacheck = leavesequencesqlrecords[0].custrecord_hris_lvecfg_pro_rata;
            }
            return proratacheck;
        } catch (e) {
            console.log('error in proratecheck : ' + e);
        }
    };

    const gettingpassportexpirydate = (emp_name) => {
        try {
            let expirydate = '';
            const passportQuery = `select max(a.custrecord_hris_date_exp) as expirydate from customrecord_hris_emp_id_info a  
                join customrecordhris_idcardmaster b on a.custrecord_hris_emp_id_type = b.id
                where a.isinactive ='F' and b.custrecord_hris_idcard_seqno =2 and a.custrecord_hris_emp_link = ${emp_name}`;

            const passportQueryrecords = query.runSuiteQL({ query: passportQuery }).asMappedResults();

            if (passportQueryrecords.length > 0) {
                expirydate = passportQueryrecords[0].expirydate || '';
            }
            return expirydate;
        } catch (e) {
            console.log('error in gettingpassportexpirydate : ' + e);
        }
    };

    const gettingvisaexpirydate = (emp_name) => {
        try {
            let expirydate = '';
            const visaQuery = `select max(a.custrecord_hris_date_exp) as expirydate from customrecord_hris_emp_id_info a  
                join customrecordhris_idcardmaster b on a.custrecord_hris_emp_id_type = b.id 
                where a.isinactive ='F' and b.custrecord_hris_idcard_seqno =1 and a.custrecord_hris_emp_link = ${emp_name}`;

            const visaQueryrecords = query.runSuiteQL({ query: visaQuery }).asMappedResults();

            if (visaQueryrecords.length > 0) {
                expirydate = visaQueryrecords[0].expirydate || '';
            }
            return expirydate;
        } catch (e) {
            console.log('error in gettingvisaexpirydate : ' + e);
        }
    };

    const gettingempcatagorysequence = (empname) => {
        try {
            const empQuery = `select b.id as empcatagoryid ,b.custrecord_hris_empcat_seqno as seqno from employee a join
                customrecord_hris_employeecategory b on a.custentity_hris_empcategory = b.id where a.id =${empname} and b.isinactive='F'`;

            const empQueryrecords = query.runSuiteQL({ query: empQuery }).asMappedResults();

            if (empQueryrecords.length > 0) {
                return empQueryrecords[0].seqno;
            }
            return '';
        } catch (e) {
            console.log('error in gettingempcatagorysequence : ' + e);
        }
    };

    const gettingvisarenewaldate = (emp_name) => {
        try {
            let renewaldate = '';
            const visaQuery = `select max(a.custrecord_hris_date_issue) as renewaldate from customrecord_hris_emp_id_info a  
                join customrecordhris_idcardmaster b on a.custrecord_hris_emp_id_type = b.id 
                where a.isinactive ='F' and b.custrecord_hris_idcard_seqno =1 and a.custrecord_hris_emp_link = ${emp_name}`;

            const visaQueryrecords = query.runSuiteQL({ query: visaQuery }).asMappedResults();

            if (visaQueryrecords.length > 0) {
                renewaldate = visaQueryrecords[0].renewaldate || '';
            }
            return renewaldate;
        } catch (e) {
            console.log('error in gettingvisarenewaldate : ' + e);
        }
    };

    const gettingemployeerejoindate = (empname) => {
        try {
            let rejoindate = '';
            const empQuery = `select b.id as empcatagoryid ,b.custrecord_hris_empcat_seqno as seqno,a.custentity_hris_rejoin_date as rejoindate from employee a join
                customrecord_hris_employeecategory b on a.custentity_hris_empcategory = b.id where a.id =${empname} and b.isinactive='F'`;

            const empQueryrecords = query.runSuiteQL({ query: empQuery }).asMappedResults();

            if (empQueryrecords.length > 0) {
                rejoindate = empQueryrecords[0].rejoindate || '';
            }
            return rejoindate;
        } catch (e) {
            console.log('error in gettingemployeerejoindate : ' + e);
        }
    };

    const check_rotation = (Leave_type) => {
        try {
            const leavesequencesql = `select * from customrecord_hris_leaveconfig where id ='${Leave_type}' and isinactive ='F'`;
            const leavesequencesqlrecords = query.runSuiteQL({ query: leavesequencesql }).asMappedResults();

            if (leavesequencesqlrecords.length > 0) {
                return leavesequencesqlrecords[0].custrecord_hris_lveconfig_rotationlve;
            }
            return '';
        } catch (e) {
            console.log('error in check_rotation : ' + e);
        }
    };

    const GetRoundOffvalue = (finalAnnual) => {
        const final_days = finalAnnual;
        const split_final_days = final_days.toString().split('.');
        const integer_no = split_final_days[0];
        return parseFloat(integer_no);
    };

    const searchLeaveBalance = (empInternalId, query, empHireDateObj, format, moment, dateConsidered, currentdate, leavetype) => {
        try {
            let finalleavebal = 0;

            const leavebalancesql = `select a.*,b.custrecord_hris_lvecfg_accuraldays as accuraldays from customrecord_hris_leavebalance a 
                join customrecord_hris_leaveconfig b on a.custrecord_hris_lvbal_leave_type=b.id
                where a.custrecord_hris_lvbal_employee_name = '${empInternalId}' 
                and a.custrecord_hris_lvbal_leave_type = '${leavetype}'  
                and a.isinactive ='F'
                and b.custrecord_hris_lvecnfg_seqno = 3`;

            const leavebalancesqlrecords = query.runSuiteQL({ query: leavebalancesql }).asMappedResults();

            if (leavebalancesqlrecords.length > 0) {
                const obleavebalance = leavebalancesqlrecords[0].custrecord_hris_lvbal_openingbalance || 0;
                const leavebaltaken = leavebalancesqlrecords[0].custrecord_hris_lvbal_leave_balance_take || 0;
                const accuraldays = leavebalancesqlrecords[0].accuraldays || 1;

                const currentMoment = formatdate(currentdate);
                const dateConsideredMoment = formatdate(dateConsidered);
                let diffDays = getDaysDifference(currentMoment, dateConsideredMoment);
                diffDays = diffDays + 1;

                const leaveBalance = diffDays * accuraldays;
                finalleavebal = parseFloat(obleavebalance) + parseFloat(leaveBalance) - parseFloat(leavebaltaken);
            }
            return finalleavebal;
        } catch (e) {
            console.log('error in searchLeaveBalance : ' + e);
            return 0;
        }
    };

    const gettingemergencyleavedays = (empname, leavetype, fromdateyear) => {
        try {
            const emergencysql = `SELECT NVL(SUM(a.custrecord_hris_lve_totalnodays), 0) AS totdays,
                EXTRACT(YEAR FROM a.custrecord_hris_lve_fromdate) as leave_year 
                FROM customrecord_hris_leaveapplication a 
                JOIN customrecord_hris_leaveconfig b ON a.custrecord_hris_lve_leavetype = b.id  
                WHERE a.custrecord_hris_lve_employeename = ${empname} 
                and a.custrecord_hris_lve_leavetype =${leavetype} 
                and EXTRACT(YEAR FROM a.custrecord_hris_lve_fromdate)=${fromdateyear}
                and a.custrecord_hris_lve_hrmsapprovalstatus =2 
                and custrecord_hris_lve_cancellation='F' 
                GROUP BY EXTRACT(YEAR FROM a.custrecord_hris_lve_fromdate)`;

            const emergencysqlrecord = query.runSuiteQL({ query: emergencysql }).asMappedResults();

            let totalnodays = 0;
            if (emergencysqlrecord.length > 0) {
                totalnodays = emergencysqlrecord[0].totdays || 0;
            }
            return totalnodays;
        } catch (e) {
            console.log('Error in gettingemergencyleavedays', e);
            return 0;
        }
    };

    const formatdate = (currentdate) => {
        const day = currentdate.getDate();
        const month = currentdate.getMonth() + 1;
        const year = currentdate.getFullYear();
        return day + '/' + month + '/' + year;
    };

    const parseDate = (str) => {
        const parts = str.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
    };

    const getDaysDifference = (dateStr1, dateStr2) => {
        const date1 = parseDate(dateStr1);
        const date2 = parseDate(dateStr2);

        if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
            throw new Error('Invalid Date conversion');
        }

        const diffMs = date1.getTime() - date2.getTime();
        return Math.round(diffMs / (1000 * 60 * 60 * 24));
    };

    const getemployeecatagorysequence = (empname) => {
        try {
            const empcatagorysql = `select b.id as empcatagoryid ,b.custrecord_hris_empcat_seqno as seqno,
                b.custrecord_hris_empcat_noofdays as noofdays,
                b.custrecord_hris_empcat_airticket as airticketdays 
                from employee a join customrecord_hris_employeecategory b on a.custentity_hris_empcategory = b.id 
                where a.id =${empname} and b.isinactive='F'`;

            const empcatagorysqlrecords = query.runSuiteQL({ query: empcatagorysql }).asMappedResults();

            if (empcatagorysqlrecords.length > 0) {
                const empcatid = empcatagorysqlrecords[0].seqno;
                const noofdays = empcatagorysqlrecords[0].noofdays || 0;
                const airticketcal = empcatagorysqlrecords[0].airticketdays || 0;
                return empcatid + '#' + noofdays + '#' + airticketcal;
            }
            return '0#0#0';
        } catch (e) {
            console.log('Error in getemployeecatagorysequence', e);
            return '0#0#0';
        }
    };

    const getnegativeallow = (leaveType) => {
        let sequenceNo = '';
        let negAllowChk = '';
        let maxNegAllow = '';

        const resultSet = query.runSuiteQL({
            query: `SELECT custrecord_hris_lvecnfg_seqno,
                           custrecord_hris_lveconfig_allowneglevbal,
                           custrecord_hris_lvecfg_maxnegativebal 
                    FROM customrecord_hris_leaveconfig WHERE id = ?`,
            params: [leaveType]
        });

        const results = resultSet.asMappedResults();

        if (results.length > 0) {
            sequenceNo = results[0].custrecord_hris_lvecnfg_seqno || '';
            negAllowChk = results[0].custrecord_hris_lveconfig_allowneglevbal || '';
            maxNegAllow = results[0].custrecord_hris_lvecfg_maxnegativebal || '';
        }

        return sequenceNo + '#' + negAllowChk + '#' + maxNegAllow;
    };

    const gettingannualleavedays = (empname, leavetype, fromdateyear) => {
        try {
            const annualsql = `SELECT NVL(SUM(a.custrecord_hris_lve_totalnodays), 0) AS totdays,
                EXTRACT(YEAR FROM a.custrecord_hris_lve_fromdate) as leave_year 
                FROM customrecord_hris_leaveapplication a 
                JOIN customrecord_hris_leaveconfig b ON a.custrecord_hris_lve_leavetype = b.id  
                WHERE a.custrecord_hris_lve_employeename = ${empname} 
                and a.custrecord_hris_lve_leavetype =${leavetype} 
                and EXTRACT(YEAR FROM a.custrecord_hris_lve_fromdate)=${fromdateyear}
                and a.custrecord_hris_lve_hrmsapprovalstatus =2 
                and custrecord_hris_lve_cancellation='F' 
                GROUP BY EXTRACT(YEAR FROM a.custrecord_hris_lve_fromdate)`;

            const annualsqlrecord = query.runSuiteQL({ query: annualsql }).asMappedResults();

            let totalnodays = 0;
            if (annualsqlrecord.length > 0) {
                totalnodays = annualsqlrecord[0].totdays || 0;
            }
            return totalnodays;
        } catch (e) {
            console.log('Error in gettingannualleavedays', e);
            return 0;
        }
    };

    const gettingleaverejoindate = (Leave_type, emp_name) => {
        try {
            let rejoindate = '';
            const leaveQuery = `select * from customrecord_hris_leaveapplication  
                where custrecord_hris_lve_leavetype = ${Leave_type}
                and custrecord_hris_lve_workresume ='T' 
                and isinactive ='F'
                and custrecord_hris_lve_employeename =${emp_name}`;

            const leaveQueryrecords = query.runSuiteQL({ query: leaveQuery }).asMappedResults();

            if (leaveQueryrecords.length > 0) {
                rejoindate = leaveQueryrecords[0].custrecord_hris_lve_actualresumedate;
                if (rejoindate) {
                    rejoindate = format.parse({
                        value: rejoindate,
                        type: format.Type.DATE
                    });
                }
            }
            return rejoindate;
        } catch (e) {
            console.log('Error in gettingleaverejoindate', e);
            return '';
        }
    };

    const getEmployeeStatus = (empID) => {
        try {
            const result = [];
            const empStatusSQL = `Select * from employee where id = ${empID} and isinactive ='F'`;
            const records = getResult(empStatusSQL);

            if (records.length > 0) {
                const record = records[0];
                result.push({
                    empStatus: record.custentity_emp_employee_job_status,
                    empJoinDate: record.hiredate
                });
            }
            return result;
        } catch (e) {
            console.log('Error in getEmployeeStatus', e);
            return [];
        }
    };

    const getcompoffdate = (ValidtillDate, EmployeeName) => {
        let Compoff_Date = '';
        const compoffsql = `select * from customrecord_hris_lve_raise_comp_off 
            where custrecord_hris_rcomp_employee_name ='${EmployeeName}' 
            and custrecord_hris_rcomp_valid_till_date ='${ValidtillDate}'
            and custrecord_hris_rcomp_appstatus =2 
            and custrecord_hris_rcomp_checked='F' 
            and isinactive='F'`;

        const compoffsqlrecords = query.runSuiteQL({ query: compoffsql }).asMappedResults();

        if (compoffsqlrecords.length > 0) {
            Compoff_Date = compoffsqlrecords[0].custrecord_hris_rcomp_comp_off_from_date || '';
        }
        return Compoff_Date;
    };

    const getcompoffvalidtilldate = (EmployeeName) => {
        let Compoff_Date = '';
        let Compoff_Type = '';

        const compoffsql = `select * from customrecord_hris_lve_raise_comp_off 
            where custrecord_hris_rcomp_employee_name ='${EmployeeName}' 
            and custrecord_hris_rcomp_appstatus =2 
            and custrecord_hris_rcomp_checked='F' 
            and isinactive='F'`;

        const compoffsqlrecords = query.runSuiteQL({ query: compoffsql }).asMappedResults();

        if (compoffsqlrecords.length > 0) {
            Compoff_Date = compoffsqlrecords[0].custrecord_hris_rcomp_valid_till_date || '';
            Compoff_Type = compoffsqlrecords[0].custrecord_hris_rcomp_compofftype || '';
        }
        return Compoff_Date + '#' + Compoff_Type;
    };

    const getEmployeeOBDetails = (empInternalId, leavetype) => {
        try {
            const result = [];
            const leaveobbalancesql = `select * from customrecord_hris_leavebalance 
                where custrecord_hris_lvbal_employee_name = '${empInternalId}' 
                and custrecord_hris_lvbal_leave_type = '${leavetype}' 
                and isinactive ='F'
                AND custrecord_hris_lvbal_openingbalance IS NOT NULL`;

            const leaveobbalancesqlrecords = query.runSuiteQL({ query: leaveobbalancesql }).asMappedResults();

            if (leaveobbalancesqlrecords.length > 0) {
                result.push({
                    obdate: leaveobbalancesqlrecords[0].custrecord_hris_lvbal_obdate || '',
                    obleavebalance: leaveobbalancesqlrecords[0].custrecord_hris_lvbal_openingbalance || 0
                });
            }
            return result;
        } catch (e) {
            console.log('Error in getEmployeeOBDetails', e);
            return [];
        }
    };

    const getvalidations = (LeaveTYPE) => {
        const leavesequencesql = `select * from customrecord_hris_leaveconfig where id ='${LeaveTYPE}' and isinactive ='F'`;
        const leavesequencesqlrecords = query.runSuiteQL({ query: leavesequencesql }).asMappedResults();

        if (leavesequencesqlrecords.length > 0) {
            const LC_CarryFwdCheck = leavesequencesqlrecords[0].custrecord_hris_lveconfig_levcarryforwrd;
            const LC_CarryFwddays = leavesequencesqlrecords[0].custrecord_hris_lvecfg_nextyrleaveapply;
            return LC_CarryFwdCheck + ',' + LC_CarryFwddays;
        }
        return 'F,0';
    };

    const getmonthno = (Cal_Endmonth) => {
        const months = {
            'January': '0', 'February': '1', 'March': '2', 'April': '3',
            'May': '4', 'June': '5', 'July': '6', 'August': '7',
            'September': '8', 'October': '9', 'November': '10', 'December': '11'
        };
        return months[Cal_Endmonth] || '0';
    };

    const getResult = (pSQL) => {
        const queryResults = query.runSuiteQL({ query: pSQL });
        return queryResults.asMappedResults();
    };

    return {
        pageInit,
        fieldChanged,
        saveRecord
    };
});

const _logValidation = (value) => {
    return value != null && value !== '' && value != undefined && value.toString() != 'NaN' && value != NaN;
};