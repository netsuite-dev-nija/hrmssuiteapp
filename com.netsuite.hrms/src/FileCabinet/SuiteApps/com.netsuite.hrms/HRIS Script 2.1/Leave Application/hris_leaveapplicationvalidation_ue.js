/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/ui/serverWidget', 'N/search', 'N/query', './moment.js', 'N/runtime', 'N/format'],
    (record, serverWidget, search, query, moment, runtime, format) => {

        const beforeLoad = (scriptContext) => {
            const form = scriptContext.form;
            form.clientScriptModulePath = './hris_leave_cancel_cs.js';

            const currentrecord = scriptContext.newRecord;
            const Leaverecordid = currentrecord.id;
            log.debug('Leaverecordid', Leaverecordid);

            const currentUser = runtime.getCurrentUser();
            const userRole = currentUser.role;
            log.debug('Current User Role', userRole);

            const user = runtime.getCurrentUser().id;
            const approvalstatus = currentrecord.getValue({ fieldId: 'custrecord_hris_lve_hrmsapprovalstatus' });
            log.debug('Approval Status', approvalstatus);

            const cancelstatus = currentrecord.getValue({ fieldId: 'custrecord_hris_lve_cancel_leavestatus' }) || 1;
            log.debug('Cancel Status', cancelstatus);

            const cancelcheck = currentrecord.getValue({ fieldId: 'custrecord_hris_lve_cancellation' });
            const EmpName = currentrecord.getValue('custrecord_hris_lve_employeename');
            const Requestor = currentrecord.getValue('custrecordhris_lve_requestor');
            log.debug('Cancel Check', cancelcheck);

            const settlecheck = currentrecord.getValue({ fieldId: 'custrecord_hris_lve_leavesettlement' });
            log.debug('Settle check', settlecheck);

            const settlementrefid = currentrecord.getValue({ fieldId: 'custrecord_hris_lve_settlerefno' }) || '';
            const settlementid = currentrecord.getValue({ fieldId: 'custrecord_hris_lve_settlement_refno' }) || '';

            const workresumecheck = currentrecord.getValue({ fieldId: 'custrecord_hris_lve_workresume' });
            log.debug('workresumecheck', workresumecheck);

            if (Leaverecordid) {
                // Cancel Button
                if (scriptContext.type === 'view' &&
                    approvalstatus == 2 &&
                    cancelcheck == false &&
                    settlecheck == false &&
                    workresumecheck == false) {

                    form.addButton({
                        id: 'custpage_cancel',
                        label: 'Leavecancel',
                        functionName: 'Cancelclick()'
                    });
                }

                // Leave Settlement Button
                if (scriptContext.type === 'view' &&
                    approvalstatus == 2 &&
                    cancelcheck == false &&
                    settlecheck == true &&
                    settlementid == '' &&
                    (userRole == 1008 || userRole == 1012 || userRole == 3)) {

                    form.addButton({
                        id: 'custpage_settle',
                        label: 'Leave Settlement',
                        functionName: 'Settlementclick()'
                    });
                }

                // Pullback Leave Button
                if (scriptContext.type === 'view' &&
                    approvalstatus == 1 &&
                    cancelcheck == false &&
                    (user == EmpName || user == Requestor)) {

                    form.clientScriptModulePath = './hris_pullbackcall_cs.js';
                    form.addButton({
                        id: 'custpage_DeleteButton',
                        label: 'Pullback Leave',
                        functionName: `PullbackLeave("${Leaverecordid}")`
                    });
                }
            }

            // LMS Work Flow – Status in Color
            const status = currentrecord.getValue({ fieldId: 'custrecord_hris_lve_staus' });
            const statusInColor = `<BR><font size=2>STATUS</font><BR><font color="red" size=2>${status ? status : 'Draft'}</font>`;
            currentrecord.setValue({ fieldId: 'custrecord_hris_lve_status_incolor', value: statusInColor });

            const statusInColorfield = form.getField({ id: 'custrecord_hris_lve_status_incolor' });
            statusInColorfield.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });

            const namefield = form.getField({ id: 'custrecord_hris_lve_staus' });
            namefield.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            // Edit / Delete restriction
            const newType = runtime.executionContext;
            const LeaveApp_status = currentrecord.getValue('custrecord_hris_lve_hrmsapprovalstatus');
            const leaveEncash_Status = currentrecord.getValue('custrecord_hris_lve_encashstatus');
            const role = runtime.getCurrentUser().role;

            if (scriptContext.type === 'view' && newType === runtime.ContextType.USER_INTERFACE) {
                const editButton = form.getButton('edit');
                if ((LeaveApp_status === '3' || leaveEncash_Status === '3') && role !== '3') {
                    editButton.isDisabled = true;
                }
            }

            if (scriptContext.type === 'edit' && newType === runtime.ContextType.USER_INTERFACE) {
                if ((LeaveApp_status === '3' || leaveEncash_Status === '3') && role !== '3') {
                    throw new Error('You cannot edit this record');
                }
            }
        };

        const afterSubmit = (scriptContext) => {
            try {
                const newRecord = scriptContext.newRecord;
                const _record_id = newRecord.id;

                // Overlap Check on CREATE
                if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                    const empName = newRecord.getValue({ fieldId: 'custrecord_hris_lve_employeename' });
                    const errorMessage = 'This record is already present for the applied date';
                    const fromDate = newRecord.getValue({ fieldId: 'custrecord_hris_lve_fromdate' });
                    const toDate = newRecord.getValue({ fieldId: 'custrecord_hris_lve_todate' });

                    const filters = [
                        ['custrecord_hris_lve_employeename', 'anyof', empName],
                        'AND',
                        [
                            ['custrecord_hris_lve_fromdate', 'onorafter', fromDate],
                            'AND',
                            ['custrecord_hris_lve_todate', 'onorbefore', toDate]
                        ],
                        'OR',
                        [['custrecord_hris_lve_fromdate', 'within', fromDate, toDate]],
                        'OR',
                        [['custrecord_hris_lve_todate', 'within', fromDate, toDate]]
                    ];

                    const columns = [
                        search.createColumn({ name: 'internalid' }),
                        search.createColumn({ name: 'custrecord_hris_lve_cancellation' }),
                        search.createColumn({ name: 'custrecord_hris_lve_hrmsapprovalstatus' }),
                        search.createColumn({ name: 'custrecord_hris_lve_cancel_leavestatus' })
                    ];

                    const leaveSearch = search.create({
                        type: 'customrecord_hris_leaveapplication',
                        filters: filters,
                        columns: columns
                    }).run().getRange({ start: 0, end: 1000 });

                    if (leaveSearch.length > 0) {
                        leaveSearch.forEach((result) => {
                            const cancelStatus = result.getValue({ name: 'custrecord_hris_lve_cancel_leavestatus' });
                            const approveStatus = result.getValue({ name: 'custrecord_hris_lve_hrmsapprovalstatus' });
                            const cancelChkBox = result.getValue({ name: 'custrecord_hris_lve_cancellation' });

                            log.debug('Leave Check', 'Leave Id: ' + result.getValue({ name: 'internalid' }));

                            if (cancelStatus === '3' ||
                                (approveStatus === '1' && cancelChkBox === 'F') ||
                                (cancelStatus === '3' && cancelChkBox === 'T')) {
                                throw new Error(errorMessage);
                            }

                            if (!((approveStatus === '2' && cancelChkBox === 'T' && cancelStatus === '2') ||
                                  approveStatus === '3')) {
                                throw new Error(errorMessage);
                            }
                        });
                    }
                }

                // Work Resume Functionality
                if (scriptContext.type === scriptContext.UserEventType.EDIT) {
                    const loadedRec = record.load({
                        type: 'customrecord_hris_leaveapplication',
                        id: _record_id,
                        isDynamic: true
                    });

                    const todayDate = new Date();
                    const workResume = loadedRec.getValue('custrecord_hris_lve_workresume');
                    const leaveType = loadedRec.getValue('custrecord_hris_lve_leavetype');
                    const status = loadedRec.getValue('custrecord_hris_lve_hrmsapprovalstatus');
                    const workResumptionDone = loadedRec.getValue('custrecord_hris_lve_workresumptiondone');
                    const empployee_name = loadedRec.getValue('custrecord_hris_lve_employeename');
                    const sequenceNo = getLeaveConfigSequence(leaveType);

                    log.debug('workResumptionDone Sequence No', sequenceNo);

                    if (status == 2 && workResumptionDone === false && sequenceNo !== '11' && sequenceNo !== '22') {
                        log.debug('Processing Work Resumption');

                        if (workResume) {
                            let expected_resume_back_date = loadedRec.getValue('custrecord_hris_lve_expectedresumebackdt');
                            let actual_work_resume_date = loadedRec.getValue('custrecord_hris_lve_actualresumedate');
                            let total_delay_days = loadedRec.getValue('custrecord_hris_lve_actualtotdelaydays');
                            let total_updated_delay_days = loadedRec.getValue('custrecord_hris_lve_totalupdateddelayday') || 0;

                            actual_work_resume_date = format.parse({ value: actual_work_resume_date, type: format.Type.DATE });
                            expected_resume_back_date = format.parse({ value: expected_resume_back_date, type: format.Type.DATE });

                            if (!total_delay_days || total_delay_days === '' || total_delay_days === null ||
                                total_delay_days === 'null' || isNaN(total_delay_days)) {
                                total_delay_days = 0;
                            }

                            total_delay_days = parseInt(total_delay_days, 10);
                            total_updated_delay_days = parseInt(total_updated_delay_days, 10);

                            const searchPayGrp = searchPaygroup(empployee_name);

                            const wageDate = searchWagePeriod(searchPayGrp);
                            const wDate = wageDate.split('#');
                            let end_date = format.parse({ value: wDate[0], type: format.Type.DATE });
                            let start_date = format.parse({ value: wDate[1], type: format.Type.DATE });
                            const leave_month = wDate[2];
                            const leave_year_id = wDate[3];

                            const mth = actual_work_resume_date.getMonth() + 1;
                            const arrear_month = mth;

                            if (workResume === true) {
                                if ((actual_work_resume_date < todayDate || total_delay_days < total_updated_delay_days) &&
                                    sequenceNo !== '2') {

                                    // Negative delay days → credit leave balance
                                    if (empployee_name && leaveType && total_delay_days < 0) {
                                        total_delay_days = Math.abs(total_delay_days);

                                        const leaveBalanceResult = search.create({
                                            type: 'customrecord_hris_leavebalance',
                                            filters: [
                                                ['isinactive', 'is', 'F'],
                                                'AND',
                                                ['custrecord_hris_lvbal_employee_name', 'anyof', empployee_name],
                                                'AND',
                                                ['custrecord_hris_lvbal_leave_type', 'anyof', leaveType]
                                            ],
                                            columns: [
                                                'internalid',
                                                'custrecord_hris_lvbal_available_leave_ba',
                                                'custrecord_hris_lvbal_leave_balance_take'
                                            ]
                                        }).run().getRange({ start: 0, end: 1 });

                                        if (leaveBalanceResult.length > 0) {
                                            const internal_id = leaveBalanceResult[0].getValue('internalid');
                                            let avl_leave_bal = parseFloat(leaveBalanceResult[0].getValue('custrecord_hris_lvbal_available_leave_ba')) || 0;
                                            let leave_bal_taken = parseFloat(leaveBalanceResult[0].getValue('custrecord_hris_lvbal_leave_balance_take')) || 0;

                                            avl_leave_bal += total_delay_days;
                                            leave_bal_taken -= total_delay_days;

                                            const values = {
                                                'custrecord_hris_lvbal_leave_balance_take': leave_bal_taken
                                            };
                                            if (sequenceNo !== '2') {
                                                values['custrecord_hris_lvbal_available_leave_ba'] = avl_leave_bal;
                                            }

                                            record.submitFields({
                                                type: 'customrecord_hris_leavebalance',
                                                id: internal_id,
                                                values: values
                                            });
                                        }
                                    }
                                    // Positive delay days → debit annual leave (seq 2)
                                    else if (total_delay_days > 0) {
                                        const leaveBalanceResult = search.create({
                                            type: 'customrecord_hris_leavebalance',
                                            filters: [
                                                ['isinactive', 'is', 'F'],
                                                'AND',
                                                ['custrecord_hris_lvbal_employee_name', 'anyof', empployee_name],
                                                'AND',
                                                ['custrecord_hris_lvbal_leave_type.custrecord_hris_lvecnfg_seqno', 'equalto', '2']
                                            ],
                                            columns: [
                                                'internalid',
                                                'custrecord_hris_lvbal_available_leave_ba',
                                                'custrecord_hris_lvbal_leave_balance_take'
                                            ]
                                        }).run().getRange({ start: 0, end: 1 });

                                        if (leaveBalanceResult.length > 0) {
                                            const balanceRecordId = leaveBalanceResult[0].getValue('internalid');
                                            const balanceRecord = record.load({
                                                type: 'customrecord_hris_leavebalance',
                                                id: balanceRecordId,
                                                isDynamic: true
                                            });

                                            let leave_bal_taken = parseFloat(balanceRecord.getValue('custrecord_hris_lvbal_leave_balance_take')) || 0;
                                            leave_bal_taken += total_delay_days;

                                            balanceRecord.setValue({
                                                fieldId: 'custrecord_hris_lvbal_leave_balance_take',
                                                value: leave_bal_taken
                                            });

                                            balanceRecord.save({
                                                enableSourcing: true,
                                                ignoreMandatoryFields: true
                                            });
                                        }
                                    }

                                    // Create Arrear Entry
                                    if (empployee_name && leaveType) {
                                        if (todayDate > expected_resume_back_date) {
                                            const calculate_date = (actual_work_resume_date < expected_resume_back_date)
                                                ? expected_resume_back_date
                                                : actual_work_resume_date;

                                            const daysDiff = Math.round(
                                                (todayDate.getTime() - calculate_date.getTime()) / (24 * 60 * 60 * 1000)
                                            );

                                            if (daysDiff > 0) {
                                                const arrears_record = search.create({
                                                    type: 'customrecord_hris_unpaid_arrear_entry',
                                                    filters: [
                                                        ['isinactive', 'is', 'F'],
                                                        'AND',
                                                        ['custrecord_hris_uae_employee_name', 'anyof', empployee_name],
                                                        'AND',
                                                        ['custrecord_hris_uae_pay_group', 'anyof', searchPayGrp],
                                                        'AND',
                                                        ['custrecord_hris_uae_month', 'is', leave_month],
                                                        'AND',
                                                        ['custrecord_hris_uae_year', 'is', leave_year_id],
                                                        'AND',
                                                        ['custrecord_hris_uae_leave_reference_no', 'is', _record_id]
                                                    ],
                                                    columns: [search.createColumn({ name: 'internalid' })]
                                                }).run().getRange({ start: 0, end: 1 });

                                                if (!arrears_record || arrears_record.length === 0) {
                                                    const create_arrears = record.create({
                                                        type: 'customrecord_hris_unpaid_arrear_entry',
                                                        isDynamic: true
                                                    });

                                                    create_arrears.setValue({ fieldId: 'custrecord_hris_uae_employee_name', value: empployee_name });
                                                    create_arrears.setValue({ fieldId: 'custrecord_hris_uae_pay_group', value: searchPayGrp });
                                                    create_arrears.setValue({ fieldId: 'custrecord_hris_uae_pay_date', value: end_date });
                                                    create_arrears.setValue({ fieldId: 'custrecord_hris_uae_month', value: leave_month });
                                                    create_arrears.setValue({ fieldId: 'custrecord_hris_uae_year', value: leave_year_id });
                                                    create_arrears.setValue({ fieldId: 'custrecord_hris_uae_arrear_days', value: daysDiff });
                                                    create_arrears.setValue({ fieldId: 'custrecord_hris_uae_arrear_month', value: arrear_month });
                                                    create_arrears.setValue({ fieldId: 'custrecord_hris_uae_leave_reference_no', value: _record_id });
                                                    create_arrears.setValue({ fieldId: 'custrecord_hris_uae_remark', value: 'Unpaid Arrear entry against work resumption' });

                                                    const create_arrears_id = create_arrears.save({
                                                        enableSourcing: true,
                                                        ignoreMandatoryFields: true
                                                    });
                                                    log.debug('create_arrears submit', create_arrears_id);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Air Ticket / Monthly Salary Input (from original)
                // (Keep your original air-ticket creation block here if it exists after the truncation)

            } catch (error) {
                log.error({
                    title: 'Error in After Submit',
                    details: error.message
                });
            }
        };

        const beforeSubmit = (scriptContext) => {
            // Generate Reference Number
            if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                const newRecord = scriptContext.newRecord;
                let s_auto_prfix = '';

                const recordType = newRecord.type;
                if (recordType === 'customrecord_hris_leaveapplication') {
                    s_auto_prfix = 'LA';
                }

                const i_rec_type_id = newRecord.getValue({ fieldId: 'rectype' });

                const searchResults = search.create({
                    type: 'customrecord_hris_unique_reference_numbe',
                    filters: [
                        ['custrecord_hris_record_type', 'anyof', i_rec_type_id],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_record_type', 'custrecord_hris_unique_number']
                }).run().getRange({ start: 0, end: 1 });

                if (searchResults.length > 0) {
                    const uniqueRefRecord = searchResults[0];
                    const i_id_unique_ref = uniqueRefRecord.id;
                    const i_unique_num = parseInt(uniqueRefRecord.getValue('custrecord_hris_unique_number')) + 1;

                    const i_fullYear = new Date().getFullYear();
                    const i_employee = newRecord.getValue({ fieldId: 'custrecord_hris_lve_employeename' });

                    let s_name = search.lookupFields({
                        type: 'employee',
                        id: i_employee,
                        columns: ['firstname']
                    }).firstname;

                    if (s_name) {
                        const nameParts = s_name.split(' ');
                        if (!isNaN(nameParts[0])) nameParts.shift();
                        s_name = nameParts.join(' ').toUpperCase();
                    }

                    const s_auto_number = `${s_auto_prfix}-${i_unique_num}-${i_fullYear}`;
                    newRecord.setValue({ fieldId: 'name', value: s_auto_number });

                    record.submitFields({
                        type: 'customrecord_hris_unique_reference_numbe',
                        id: i_id_unique_ref,
                        values: { 'custrecord_hris_unique_number': i_unique_num }
                    });
                }
            }

            // Pullback on DELETE
            if (scriptContext.type === scriptContext.UserEventType.DELETE) {
                const newRecord = scriptContext.newRecord;
                const custformscript = newRecord.getValue('custrecord_hris_lve_script_version');

                if (custformscript == 1) {
                    const pullBackRecord = record.create({
                        type: 'customrecord_hris_pullback_lveapplicatio',
                        isDynamic: true
                    });

                    pullBackRecord.setValue('custrecord_hris_plb_employee_name', newRecord.getValue('custrecord_hris_lve_employeename'));
                    pullBackRecord.setValue('custrecord_hris_plb_employee_code', newRecord.getValue('custrecord_hris_lve_empcode'));
                    pullBackRecord.setValue('custrecord_hris_plb_supervisor', newRecord.getValue('custrecord_hris_lve_supervisor'));
                    pullBackRecord.setValue('custrecord_hris_plb_hod', newRecord.getValue('custrecord_hris_lve_project_supervisor'));
                    pullBackRecord.setValue('custrecord_hris_plb_leave_type', newRecord.getValue('custrecord_hris_lve_leavetype'));
                    pullBackRecord.setValue('custrecord_hris_plb_leave_balance', newRecord.getValue('custrecord_hris_lve_leavebalance'));
                    pullBackRecord.setValue('custrecord_hris_plb_from_date', newRecord.getValue('custrecord_hris_lve_fromdate'));
                    pullBackRecord.setValue('custrecord_hris_plb_from_halfday', newRecord.getValue('custrecord_hris_lve_fromhalfday'));
                    pullBackRecord.setValue('custrecord_hris_plb_todate', newRecord.getValue('custrecord_hris_lve_todate'));
                    pullBackRecord.setValue('custrecord_hris_plb_to_halfday', newRecord.getValue('custrecord_hris_lve_tohalfday'));
                    pullBackRecord.setValue('custrecord_hris_plb_total_days', newRecord.getValue('custrecord_hris_lve_totalnodays'));
                    pullBackRecord.setValue('custrecord_hris_plb_vaid_tilldate', newRecord.getValue('custrecord_hris_lve_validtilldate'));
                    pullBackRecord.setValue('custrecord_hris_plb_leave_reason', newRecord.getValue('custrecord_hris_lve_leavereason'));
                    pullBackRecord.setValue('custrecord_hris_plb_support_document', newRecord.getValue('custrecord_hris_lve_supportdocument'));
                    pullBackRecord.setValue('custrecord_hris_plb_leave_applica_status', newRecord.getValue('custrecord_hris_lve_staus'));

                    const pullBackRecord_ID = pullBackRecord.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });
                    log.debug('Pullback Record Created', pullBackRecord_ID);
                }
            }

            // Delete Validation
            const newRecord = scriptContext.newRecord;
            const LeaveApp_status = newRecord.getValue('custrecord_hris_lve_hrmsapprovalstatus');
            const leaveEncash_Status = newRecord.getValue('custrecord_hris_lve_encashstatus');

            if ((LeaveApp_status === '2' || LeaveApp_status === '3') &&
                scriptContext.type === scriptContext.UserEventType.DELETE) {
                throw new Error('You cannot delete an Approved or Rejected Leave');
            }

            if ((leaveEncash_Status === '2' || leaveEncash_Status === '3') &&
                scriptContext.type === scriptContext.UserEventType.DELETE) {
                throw new Error('You cannot delete an Approved or Rejected Leave Encashment record');
            }
        };

        // =====================================================
        // Helper Functions
        // =====================================================

        const getResult = (pSQL) => {
            return query.runSuiteQL({ query: pSQL }).asMappedResults();
        };

        const searchWagePeriod = (pay_group) => {
            const wageperiodsql = `select * from customrecord_hris_wage_period_details 
                                   where custrecord_hris_pay_group = ${pay_group} and isinactive='F'`;
            const records = getResult(wageperiodsql);

            if (records.length > 0) {
                const rec = records[0];
                return `${rec.custrecord_hris_end_date}#${rec.custrecord_hris_start_date}#${rec.custrecord_hris_month}#${rec.custrecord_hris_year}`;
            }
            return '###';
        };

        const getLeaveConfigSequence = (Leave_type) => {
            try {
                const sql = `select * from customrecord_hris_leaveconfig where id ='${Leave_type}' and isinactive ='F'`;
                const results = query.runSuiteQL({ query: sql }).asMappedResults();
                if (results.length > 0) {
                    return results[0].custrecord_hris_lvecnfg_seqno;
                }
                return '';
            } catch (e) {
                log.debug('error in getLeaveConfigSequence', e);
                return '';
            }
        };

        const searchPaygroup = (employee_name) => {
            const sql = `Select * from customrecord_hris_employee_compen_change 
                         where custrecord_hris_empchange_employee_nam = ${employee_name} and isinactive ='F'`;
            const records = getResult(sql);
            if (records.length > 0) {
                return records[0].custrecord_hris_empchange_emp_pay_pro_gp;
            }
            return null;
        };

        const searchPayComp = (i_paygroup_earn) => {
            const sql = `Select * from customrecord_hris_payroll_component 
                         where custrecord_hris_pay_process_group = ${i_paygroup_earn} 
                         and custrecord_hris__sequence_no_=36 and isinactive ='F'`;
            const records = getResult(sql);
            if (records.length > 0) {
                return records[0].id;
            }
            return null;
        };

        const searchYear = (year) => {
            year = year.toString();
            const results = search.create({
                type: 'customlist_hris_year_master',
                filters: [
                    ['name', 'contains', year],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [search.createColumn({ name: 'internalid' })]
            }).run().getRange({ start: 0, end: 1 });

            return results.length > 0 ? results[0].getValue('internalid') : '';
        };

        const checkDateFormat = () => {
            return runtime.getCurrentContext().getPreference({ name: 'dateformat' });
        };

        const formatedDate = (end_date) => {
            const date_format = checkDateFormat();
            const endDate = format.parse({ value: end_date, type: format.Type.DATE });
            const year = endDate.getFullYear();
            const month = endDate.getMonth() + 1;
            const day = endDate.getDate();

            const pad = (n) => (n < 10 ? '0' + n : n);

            if (date_format === 'YYYY-MM-DD') return `${year}-${pad(month)}-${pad(day)}`;
            if (date_format === 'DD/MM/YYYY') return `${pad(day)}/${pad(month)}/${year}`;
            if (date_format === 'MM/DD/YYYY') return `${pad(month)}/${pad(day)}/${year}`;
            return `${pad(day)}/${pad(month)}/${year}`;
        };

        const remFormatedDate = (year, month, day) => {
            const date_format = checkDateFormat();
            if (date_format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
            if (date_format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
            if (date_format === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
            return `${day}/${month}/${year}`;
        };

        const gethrisMonth = (monthParameter) => String(monthParameter);

        const _Is_Valid = (value) => value != null && value !== '' && value !== 'undefined';

        return {
            beforeLoad,
            beforeSubmit,
            afterSubmit
        };
    });