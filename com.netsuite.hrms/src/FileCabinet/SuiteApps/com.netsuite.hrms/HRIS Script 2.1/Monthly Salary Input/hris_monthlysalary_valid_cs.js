/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([
    'N/search',
    'N/record',
    'N/format',
    'N/log',
    'N/ui/dialog'
], (search, record, format, log, dialog) => {

    const pageInit = (context) => {
        if (context.mode !== 'create') {
            return;
        }

        try {
            const currentRec = context.currentRecord;
            const empName = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_empname' });

            if (!empName) {
                return;
            }

            const payGroup = searchPayGroup(empName);
            const wageDate = searchWagePeriod(payGroup);

            if (payGroup) {
                currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_paygroup', value: payGroup });
            }

            if (wageDate) {
                const parts = wageDate.toString().split('#');
                const endDate = parts[0];

                currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_paydt', value: endDate });

                const mth = format.parse({ value: endDate, type: format.Type.DATE });
                const getMonth = mth.getMonth() + 1;
                const year = mth.getFullYear();
                const yearId = searchYear(year);

                currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_month', value: getMonth });
                currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_year', value: yearId });
            }
        } catch (e) {
            dialog.alert({ title: 'Error', message: e.message || e.toString() });
        }
    };

    const fieldChanged = (context) => {
        debugger;
        try {
            const currentRec = context.currentRecord;
            const fieldId = context.fieldId;

            // ---------- Employee selected ----------
            if (fieldId === 'custrecord_hris_mthsal_empname') {
                const empName = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_empname' });

                if (empName) {
                    const payGroup = searchPayGroup(empName);
                    const wageDate = searchWagePeriod(payGroup);

                    if (payGroup) {
                        currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_paygroup', value: payGroup,ignoreFieldChange: true });
                    }

                    if (wageDate) {
                        const parts = wageDate.toString().split('#');
                        const endDate = parts[0];
                       const parsedEndDate = format.parse({ value: endDate, type: format.Type.DATE });

                        currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_paydt', value: parsedEndDate, ignoreFieldChange: true });

                        const mth = format.parse({ value: endDate, type: format.Type.DATE });
                        const getMonth = mth.getMonth() + 1;
                        const year = mth.getFullYear();
                        const yearId = searchYear(year);

                        currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_month', value: getMonth, ignoreFieldChange: true });
                        currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_year', value: yearId, ignoreFieldChange: true });
                    }
                } else {
                    currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_paygroup', value: '' });
                    currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_paydt', value: '' });
                    currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_month', value: '' });
                    currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_year', value: '' });
                }
            }

            // ---------- No of Encashable Days ----------
            if (fieldId === 'custrecord_hris_mthsal_no_of_encashable') {
                calculateEncashmentAmount(currentRec);
            }

            // ---------- Total Hours / Days ----------
            if (fieldId === 'custrecord_hris_mthsal_total_hours_days') {
                calculateOvertimeFromHours(currentRec);
            }

            // ---------- OT Allowance Rate ----------
            if (fieldId === 'custrecord_hris_mthsal_ot_allowances_r') {
                calculateOvertimeFromRate(currentRec);
            }

            // ---------- Pay Component ----------
            if (fieldId === 'custrecord_hris_mthsal_paycomponent') {
                handlePayComponentChange(currentRec);
            }

            // ---------- Overtime Type ----------
            if (fieldId === 'custrecord_hris_mthsal_overtime_type') {
                handleOvertimeTypeChange(currentRec);
            }

            // ---------- Hours or Rate changed (common calculation) ----------
            if (fieldId === 'custrecord_hris_mthsal_total_hours_days' ||
                fieldId === 'custrecord_hris_mthsal_ot_allowances_r') {
                calculateAllowanceAmount(currentRec);
            }

        } catch (e) {
            log.error('fieldChanged error', e.message || e.toString());
        }
    };

    const validateField = () => true;
    const validateLine = () => true;

    // =====================================================
    // Encashment calculation
    // =====================================================
    const calculateEncashmentAmount = (currentRec) => {
        const nationality = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_omaninonomani' });
        const leaveType = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_paycomponent' });
        const processGrp = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_paygroup' });
        const denominValue = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_leave_encashment' });
        const compType = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_componenttype' });
        const empName = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_empname' });
        const encashDays = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_no_of_encashable' });

        if (!encashDays) {
            currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_salaryamount', value: '' });
            return;
        }

        const seqNo = (compType == '1') ? 40 : 65;

        const compSearch = search.create({
            type: 'customrecord_hris_payroll_component',
            filters: [
                ['custrecord_hris_pay_process_group', 'anyof', processGrp],
                'AND',
                ['custrecord_hris__sequence_no_', 'equalto', seqNo]
            ],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });

        if (!compSearch || compSearch.length === 0) {
            return;
        }

        const compIntId = compSearch[0].getValue({ name: 'internalid' });

        if (leaveType != compIntId) {
            return;
        }

        const filters = [
            ['isinactive', 'is', 'F'],
            'AND',
            ['custrecord_hris_pay_process_group', 'anyof', processGrp],
            'AND',
            ['custrecord_hris_consider_for_encashment', 'is', 'T']
        ];

        // Note: original had an empty field filter for nationality – kept as comment
        // if (nationality == '1' || nationality == '4') { ... }

        const payCompSearch = search.create({
            type: 'customrecord_hris_payroll_component',
            filters,
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1000 });

        let salAmt = 0;

        if (payCompSearch) {
            payCompSearch.forEach((comp) => {
                const compId = comp.getValue({ name: 'internalid' });

                const edcSearch = search.create({
                    type: 'customrecord_hris_employee_compen_change',
                    filters: [
                        ['custrecord_hris_empchange_employee_nam', 'anyof', empName],
                        'AND',
                        ['custrecord_hris_employee_data_change.custrecord_hris_cde_payroll_component', 'anyof', compId]
                    ],
                    columns: [
                        'custrecord_hris_empchange_employee_nam',
                        search.createColumn({
                            name: 'custrecord_hris_cde_monthly',
                            join: 'custrecord_hris_employee_data_change'
                        })
                    ]
                }).run().getRange({ start: 0, end: 1000 });

                if (edcSearch) {
                    edcSearch.forEach((edc) => {
                        const monthly = edc.getValue({
                            name: 'custrecord_hris_cde_monthly',
                            join: 'custrecord_hris_employee_data_change'
                        });
                        salAmt += parseFloat(monthly || 0);
                    });
                }
            });
        }

        let salaryAmt = (parseFloat(salAmt) * parseFloat(encashDays)) / parseFloat(denominValue || 1);
        currentRec.setValue({
            fieldId: 'custrecord_hris_mthsal_salaryamount',
            value: salaryAmt.toFixed(3)
        });
    };

    // =====================================================
    // Overtime calculations
    // =====================================================
    const calculateOvertimeFromHours = (currentRec) => {
        const otHour = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_total_hours_days' });
        const overTimeType = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_overtime_type' });
        const overTimeRate = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_ot_allowances_r' });
        const excRate = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_currency_exchange' }) || 1;
        const emp = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_empname' });

        if (!otHour) {
            currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_salaryamount', value: '' });
            return;
        }

        const searchEmpEarn = search.create({
            type: 'customrecord_hris_employee_compen_change',
            filters: [
                ['custrecord_hris_empchange_employee_nam', 'anyof', emp],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['internalid', 'custrecord_hris_empchange_month_cross_sy']
        }).run().getRange({ start: 0, end: 1 });

        if (!searchEmpEarn || searchEmpEarn.length === 0) {
            return;
        }

        if (overTimeType == 3 || overTimeType == 4 || overTimeType == 5) {
            const salaryAmt = (parseFloat(overTimeRate || 0) * parseFloat(otHour)) / parseFloat(excRate);
            currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_salaryamount', value: salaryAmt });
        }
    };

    const calculateOvertimeFromRate = (currentRec) => {
        const otHour = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_total_hours_days' });
        const overTimeType = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_overtime_type' });
        const overTimeVal = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_ot_allowances_r' });
        const emp = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_empname' });

        if (!otHour) {
            currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_salaryamount', value: '' });
            return;
        }

        const searchEmpEarn = search.create({
            type: 'customrecord_hris_employee_compen_change',
            filters: [
                ['custrecord_hris_empchange_employee_nam', 'anyof', emp],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['internalid', 'custrecord_hris_empchange_month_cross_sy']
        }).run().getRange({ start: 0, end: 1 });

        if (!searchEmpEarn || searchEmpEarn.length === 0) {
            return;
        }

        let monthlySal = 0;

        if (overTimeType == '2') {
            const searchEC = search.create({
                type: 'customrecord_hris_compensation_details_e',
                filters: [
                    ['custrecord_hris_employee_data_change', 'anyof', searchEmpEarn[0].id],
                    'AND',
                    ['custrecord_hris_cde_payroll_component', 'anyof', '2']
                ],
                columns: ['custrecord_hris_cde_monthly']
            }).run().getRange({ start: 0, end: 1 });

            if (searchEC && searchEC.length > 0) {
                monthlySal = searchEC[0].getValue({ name: 'custrecord_hris_cde_monthly' });
            }
        } else if (overTimeType == '1' || overTimeType == '3') {
            monthlySal = searchEmpEarn[0].getValue({ name: 'custrecord_hris_empchange_month_cross_sy' });
        }

        if (monthlySal) {
            let otAmount = (parseFloat(monthlySal) / 30 / 9) * parseFloat(otHour) * parseFloat(overTimeVal || 0);
            const otAmount2 = otAmount;
            otAmount = Math.floor(otAmount) + 1;
            const diff = otAmount - otAmount2;
            if (diff > 0.5) {
                otAmount = otAmount - 1;
            }
            currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_salaryamount', value: otAmount });
        }
    };

    const calculateAllowanceAmount = (currentRec) => {
        const otHours = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_total_hours_days' }) || '0';
        const allowanceRate = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_ot_allowances_r' }) || '0';
        const exchRate = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_currency_exchange' }) || 1;
        const payElement = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_paycomponent' });
        const payGrpName = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_paygroup' });
        const nationality = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_omaninonomani' });
        const overtimeType = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_overtime_type' });
        const emp = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_empname' });

        if (payElement && payGrpName && (nationality == '1' || nationality == '2' || nationality == '4')) {
            const seqNo = getPayComponentSequenceNumber(payElement, payGrpName);
            if (seqNo == '38') {
                const totalSalary = searchEmpTotalSalary(emp, otHours, allowanceRate);
                currentRec.setValue({
                    fieldId: 'custrecord_hris_mthsal_salaryamount',
                    value: parseFloat(totalSalary).toFixed(2)
                });
            }
        }

        if (payElement && payGrpName && overtimeType != '3' && overtimeType != '4' && overtimeType != '5') {
            const seqNo = getPayComponentSequenceNumber(payElement, payGrpName);
            const allowedSeq = ['17', '18', '20', '21', '22', '23', '25', '26', '28', '30', '31', '32', '33', '38', '42', '43'];

            if (allowedSeq.indexOf(String(seqNo)) !== -1) {
                if (!allowanceRate && otHours) {
                    dialog.alert({ title: 'Validation', message: 'Please enter the allowance' });
                    currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_total_hours_days', value: '' });
                    return;
                }

                if (allowanceRate && otHours) {
                    const salAmount = (parseFloat(otHours) * parseFloat(allowanceRate)) / parseFloat(exchRate);
                    currentRec.setValue({
                        fieldId: 'custrecord_hris_mthsal_salaryamount',
                        value: salAmount.toFixed(3)
                    });
                }
            }
        }
    };

    // =====================================================
    // Pay Component & Overtime Type handlers
    // =====================================================
    const handlePayComponentChange = (currentRec) => {
        const payGroup = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_paygroup' });
        const compType = searchEncashmentId(payGroup);
        const compType1 = searchLeaveRecovId(payGroup);
        const emp = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_empname' });

        if (compType || compType1) {
            const leaveSearch = search.create({
                type: 'customrecord_hris_leavebalance',
                filters: [
                    ['custrecord_hris_lvbal_employee_name', 'anyof', emp],
                    'AND',
                    ['isinactive', 'is', 'F'],
                    'AND',
                    [
                        ['custrecord_hris_lvbal_leave_type.custrecord_hris_lvecnfg_seqno', 'equalto', '3'],
                        'OR',
                        ['custrecord_hris_lvbal_leave_type.custrecord_hris_lveconfig_encashallowed', 'is', 'T']
                    ]
                ],
                columns: [
                    'custrecord_hris_lvbal_available_leave_ba',
                    search.createColumn({
                        name: 'custrecord_hris_lveconfig_lveencashcal',
                        join: 'custrecord_hris_lvbal_leave_type'
                    })
                ]
            }).run().getRange({ start: 0, end: 1 });

            if (leaveSearch && leaveSearch.length > 0) {
                const leaveBal = leaveSearch[0].getValue({ name: 'custrecord_hris_lvbal_available_leave_ba' });
                let denominVal = leaveSearch[0].getValue({
                    name: 'custrecord_hris_lveconfig_lveencashcal',
                    join: 'custrecord_hris_lvbal_leave_type'
                }) || '0';

                currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_annual_leave_bala', value: leaveBal });
                currentRec.setValue({ fieldId: 'custrecord_hris_mthsal_leave_encashment', value: denominVal });
            }
        }

        // Allowance rate lookup by sequence (original had many commented setValue calls)
        // Kept structure for future use if needed
    };

    const handleOvertimeTypeChange = (currentRec) => {
        // Original mostly had setValue commented out – logic preserved for reference
        const typeOfOvertime = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_overtime_type' });
        const designationMaster = currentRec.getValue({ fieldId: 'custrecord_hris_mthsal_desigcurrent' });

        if (!typeOfOvertime || !designationMaster) {
            return;
        }

        // Lookup rates if needed in future
        // const fieldMap = { 1: 'custrecord_hris_ot_rate_weekdays', 2: 'custrecord_hris_ot_rate' };
    };

    // =====================================================
    // Search helpers
    // =====================================================
    const searchPayGroup = (employeeName) => {
        const results = search.create({
            type: 'customrecord_hris_employee_compen_change',
            filters: [
                ['custrecord_hris_empchange_employee_nam', 'is', employeeName],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),
                'custrecord_hris_empchange_emp_pay_pro_gp'
            ]
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'custrecord_hris_empchange_emp_pay_pro_gp' });
        }
        return null;
    };

    const searchWagePeriod = (payGroup) => {
        if (!payGroup) return null;

        const results = search.create({
            type: 'customrecord_hris_wage_period_details',
            filters: [
                ['custrecord_hris_pay_group', 'is', payGroup],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),
                'custrecord_hris_end_date',
                'custrecord_hris_start_date'
            ]
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            const endDate = results[0].getValue({ name: 'custrecord_hris_end_date' });
            const startDate = results[0].getValue({ name: 'custrecord_hris_start_date' });
            return endDate + '#' + startDate;
        }
        return null;
    };

    const searchYear = (year) => {
        const results = search.create({
            type: 'customlist_hris_year_master',
            filters: [['name', 'is', String(year)]],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'internalid' });
        }
        return null;
    };

    const getPayComponentSequenceNumber = (payComponent, payGrpName) => {
        const results = search.create({
            type: 'customrecord_hris_payroll_component',
            filters: [
                ['custrecord_hris_pay_process_group', 'anyof', payGrpName],
                'AND',
                ['internalid', 'is', payComponent],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['custrecord_hris__sequence_no_']
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'custrecord_hris__sequence_no_' });
        }
        return '';
    };

    const searchEncashmentId = (payGroup) => {
        const results = search.create({
            type: 'customrecord_hris_payroll_component',
            filters: [
                ['custrecord_hris_pay_process_group', 'is', payGroup],
                'AND',
                ['custrecord_hris__sequence_no_', 'equalto', 40],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });

        return (results && results.length > 0) ? results[0].getValue({ name: 'internalid' }) : null;
    };

    const searchLeaveRecovId = (payGroup) => {
        const results = search.create({
            type: 'customrecord_hris_payroll_component',
            filters: [
                ['custrecord_hris_pay_process_group', 'is', payGroup],
                'AND',
                ['custrecord_hris__sequence_no_', 'equalto', 65],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });

        return (results && results.length > 0) ? results[0].getValue({ name: 'internalid' }) : null;
    };

    const searchEmpTotalSalary = (emp, otHours, allowanceRate) => {
        const searchEmpEarning = search.create({
            type: 'customrecord_hris_employee_compen_change',
            filters: [
                ['custrecord_hris_empchange_employee_nam', 'anyof', emp],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['internalid', 'custrecord_hris_empchange_month_cross_sy']
        }).run().getRange({ start: 0, end: 1 });

        if (!searchEmpEarning || searchEmpEarning.length === 0) {
            return 0;
        }

        const searchEC = search.create({
            type: 'customrecord_hris_compensation_details_e',
            filters: [
                ['custrecord_hris_employee_data_change', 'anyof', searchEmpEarning[0].id],
                'AND',
                ['custrecord_hris_cde_payroll_component.custrecord_hris_overtime_calculation', 'is', 'T']
            ],
            columns: ['custrecord_hris_cde_monthly']
        }).run().getRange({ start: 0, end: 1000 });

        let totalSal = 0;
        if (searchEC) {
            searchEC.forEach((r) => {
                totalSal += parseFloat(r.getValue({ name: 'custrecord_hris_cde_monthly' }) || 0);
            });
        }

        return (parseFloat(totalSal) / 30 / 8) * parseFloat(allowanceRate || 0) * parseFloat(otHours || 0);
    };

    return {
        pageInit,
        fieldChanged,
        validateField,
        validateLine
    };
});