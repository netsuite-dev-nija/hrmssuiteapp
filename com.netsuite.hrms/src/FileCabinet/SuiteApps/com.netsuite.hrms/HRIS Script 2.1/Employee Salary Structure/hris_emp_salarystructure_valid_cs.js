/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 *
 * Combined Client Script for Employee Compensation / Data Change
 * - Sets Pay Process Group, Gender, Marital Status from Employee
 * - Calculates Annual from Monthly
 * - Validates Effective From Date vs Joining Date
 * - Auto-populates Process Group on sublist lines
 * - Gross total calculation (Monthly / Annual / Bi-Monthly / Daily / Hourly + CTC)
 * - Formula-based calculation for Payroll Components
 * - Bi-monthly / Daily / Hourly derivation from Monthly
 * - Field enable/disable based on Payroll Component settings
 */
define([
    'N/record',
    'N/search',
    'N/query',
    'N/format',
    'N/log',
    'N/ui/dialog'
], (record, search, query, format, log, dialog) => {

    // =====================================================
    // pageInit
    // =====================================================
    const pageInit = (context) => {
        if (context.mode !== 'create') {
            return;
        }

        const currentRec = context.currentRecord;
        const empId = currentRec.getValue({ fieldId: 'custrecord_hris_empchange_employee_nam' });

        if (!empId) {
            return;
        }

        try {
            setEmployeeDetails(currentRec, empId);
        } catch (e) {
            log.error('pageInit error', e.message || e.toString());
        }
    };

    // =====================================================
    // fieldChanged
    // =====================================================
    const fieldChanged = (context) => {
        const currentRec = context.currentRecord;
        const fieldId = context.fieldId;
        const sublistId = context.sublistId;

        try {
            // -------------------------------------------------
            // 1. Employee selected → Pay Group + Gender + Marital Status
            // -------------------------------------------------
            if (fieldId === 'custrecord_hris_empchange_employee_nam') {
                const empId = currentRec.getValue({ fieldId: 'custrecord_hris_empchange_employee_nam' });
                if (empId) {
                    setPayProcessGroupFromEmployee(currentRec, empId);
                    setEmployeeDetails(currentRec, empId);
                }
            }

            // -------------------------------------------------
            // 2. Pay Process Group changed → push to sublists
            // -------------------------------------------------
            if (fieldId === 'custrecord_hris_empchange_emp_pay_pro_gp') {
                const payProcess = currentRec.getValue({
                    fieldId: 'custrecord_hris_empchange_emp_pay_pro_gp'
                });

                try {
                    currentRec.selectNewLine({
                        sublistId: 'recmachcustrecord_hris_employee_comp_details_li'
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_employee_comp_details_li',
                        fieldId: 'custrecord_hris_cde_process_group',
                        value: payProcess,
                        ignoreFieldChange: true,
                        forceSyncSourcing: true
                    });
                    currentRec.commitLine({
                        sublistId: 'recmachcustrecord_hris_employee_comp_details_li'
                    });
                } catch (e) { /* sublist may not exist */ }

                setSublistProcessGroup(currentRec, 'recmachcustrecord_hris_employee_data_change', 'custrecord_hris_cde_process_group', payProcess);
                setSublistProcessGroup(currentRec, 'recmachcustrecord_hris_employee_datachangeint', 'custrecord_hris_cdb_pay_group', payProcess);
                setSublistProcessGroup(currentRec, 'recmachcustrecord_hris_employee_data_change_int', 'custrecord_hris_cdo_pay_group', payProcess);
            }

            // -------------------------------------------------
            // 3. Monthly → Annual (Body field – deduction)
            // -------------------------------------------------
            if (fieldId === 'custrecord_hris_cdd_monthly' && !sublistId) {
                calculateAnnualFromMonthly(currentRec, false);
            }

            // -------------------------------------------------
            // 4. Monthly → Annual (Deduction sublist)
            // -------------------------------------------------
            if (sublistId === 'recmachcustrecord_hris_employee_data_changeint' &&
                fieldId === 'custrecord_hris_cdd_monthly') {
                calculateAnnualFromMonthly(currentRec, true);
            }

            // -------------------------------------------------
            // 5. Effective From Date validation (Type = 4)
            // -------------------------------------------------
            if (fieldId === 'custrecord_hris_empchange_eff_from_date') {
                validateEffectiveDate(currentRec);
            }

            // -------------------------------------------------
            // 6. Earnings – Monthly changed → Bi-Monthly / Daily / Hourly + Annual
            // -------------------------------------------------
            if (sublistId === 'recmachcustrecord_hris_employee_data_change' &&
                fieldId === 'custrecord_hris_cde_monthly') {
                handleEarningsMonthlyChange(currentRec);
            }

            // -------------------------------------------------
            // 7. Earnings – Payroll Component selected
            // -------------------------------------------------
            if (sublistId === 'recmachcustrecord_hris_employee_data_change' &&
                fieldId === 'custrecord_hris_cde_payroll_component') {
                handleEarningsComponentChange(currentRec);
            }

            // -------------------------------------------------
            // 8. Deduction – Payroll Component selected
            // -------------------------------------------------
            if (sublistId === 'recmachcustrecord_hris_employee_datachangeint' &&
                fieldId === 'custrecord_hris_cdb_payroll_component') {
                handleDeductionComponentChange(currentRec);
            }

            // -------------------------------------------------
            // 9. Deduction – Monthly changed
            // -------------------------------------------------
            if (sublistId === 'recmachcustrecord_hris_employee_datachangeint' &&
                fieldId === 'custrecord_hris_cdb_monthly') {
                handleDeductionMonthlyChange(currentRec);
            }

            // -------------------------------------------------
            // 10. Other – Payroll Component selected
            // -------------------------------------------------
            if (sublistId === 'recmachcustrecord_hris_employee_data_change_int' &&
                fieldId === 'custrecord_hris_payroll_component') {
                handleOtherComponentChange(currentRec);
            }

        } catch (e) {
            log.error('fieldChanged error', e.message || e.toString());
        }
    };

    // =====================================================
    // lineInit
    // =====================================================
    const lineInit = (context) => {
        const currentRec = context.currentRecord;
        const sublistId = context.sublistId;
        const payProcess = currentRec.getValue({
            fieldId: 'custrecord_hris_empchange_emp_pay_pro_gp'
        });
         const empid = currentRec.getValue({
            fieldId: 'custrecord_hris_empchange_employee_nam'
        });
        if (!payProcess) {
            return;
        }

        if (sublistId === 'recmachcustrecord_hris_employee_comp_details_li') {
            currentRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_hris_cde_process_group',
                value: payProcess,
                ignoreFieldChange: true,
                forceSyncSourcing: true
            });
        }

        if (sublistId === 'recmachcustrecord_hris_employee_data_change') {
            currentRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_hris_cde_payroll_component',
                value: '',
                ignoreFieldChange: true,
                forceSyncSourcing: true
            });
            currentRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_hris_cde_process_group',
                value: '',
                ignoreFieldChange: true,
                forceSyncSourcing: false
            });
            currentRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_hris_cde_process_group',
                value: payProcess,
                ignoreFieldChange: true,
                forceSyncSourcing: false
            });
             currentRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_hris_cde_employee_name',
                value: empid,
                ignoreFieldChange: false,
                forceSyncSourcing: true
            });
        }

        if (sublistId === 'recmachcustrecord_hris_employee_data_change_int') {
            currentRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_hris_cdo_pay_group',
                value: payProcess,
                ignoreFieldChange: true,
                forceSyncSourcing: true
            });
        }
    };

    // =====================================================
    // saveRecord – Gross total calculation
    // =====================================================
    const saveRecord = (context) => {
        try {
            const currentRec = context.currentRecord;

            let totalMonthlyEarn = 0;
            let totalAnnuallyEarn = 0;
            let totalBiMonthlyEarn = 0;
            let totalDailyEarn = 0;
            let totalHourlyEarn = 0;
            let totalMonthlyDed = 0;
            let totalAnnuallyDed = 0;
            let totalMonthlyOthers = 0;
            let totalAnnuallyOthers = 0;

            const RestAmt = 15000;
            const ESICCheck = currentRec.getValue({ fieldId: 'custrecord_hris_empchange_esic_applicabe' });

            // ----- Earnings -----
            const earnCount = currentRec.getLineCount({
                sublistId: 'recmachcustrecord_hris_employee_data_change'
            });

            for (let i = 0; i < earnCount; i++) {
                totalMonthlyEarn += valueCheck(currentRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_monthly',
                    line: i
                }));
                totalAnnuallyEarn += valueCheck(currentRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_annually',
                    line: i
                }));
                totalBiMonthlyEarn += valueCheck(currentRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_bi_monthly',
                    line: i
                }));
                totalDailyEarn += valueCheck(currentRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_daily',
                    line: i
                }));
                totalHourlyEarn += valueCheck(currentRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_hourly',
                    line: i
                }));
            }

            // ----- Deductions -----
            const dedCount = currentRec.getLineCount({
                sublistId: 'recmachcustrecord_hris_employee_datachangeint'
            });

            for (let i = 0; i < dedCount; i++) {
                totalMonthlyDed += valueCheck(currentRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_datachangeint',
                    fieldId: 'custrecord_hris_cdb_monthly',
                    line: i
                }));
                totalAnnuallyDed += valueCheck(currentRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_datachangeint',
                    fieldId: 'custrecord_hris_cdb_annually',
                    line: i
                }));
            }

            // ----- Others -----
            const otherCount = currentRec.getLineCount({
                sublistId: 'recmachcustrecord_hris_employee_data_change_int'
            });

            for (let i = 0; i < otherCount; i++) {
                totalMonthlyOthers += valueCheck(currentRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change_int',
                    fieldId: 'custrecord_hris_monthly',
                    line: i
                }));
                totalAnnuallyOthers += valueCheck(currentRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change_int',
                    fieldId: 'custrecord_hris_annually',
                    line: i
                }));
            }

            // Set header totals
            currentRec.setValue({ fieldId: 'custrecord_hris_empchange_month_cross_sy', value: totalMonthlyEarn });
            currentRec.setValue({ fieldId: 'custrecord_hris_empchange_annualgrosssly', value: totalAnnuallyEarn });
            currentRec.setValue({ fieldId: 'custrecord_hris_empchange_bimon_gros_sal', value: totalBiMonthlyEarn });
            currentRec.setValue({ fieldId: 'custrecord_hris_empchange_daily_grosssly', value: totalDailyEarn });
            currentRec.setValue({ fieldId: 'custrecord_hris_empchange_hourly_grs_sal', value: totalHourlyEarn });

            // ESIC warning
            if (totalMonthlyEarn > RestAmt && (ESICCheck === true || ESICCheck === 'T')) {
                dialog.alert({
                    title: 'ESIC Warning',
                    message: 'Gross Salary cannot Exceed 15000 since ESIC is Applicable to Employee'
                });
            }

            // CTC
            const CTC = totalAnnuallyEarn + totalAnnuallyDed + totalAnnuallyOthers;
            currentRec.setValue({
                fieldId: 'custrecord_hris_empchange_ctc',
                value: (isNaN(CTC) ? '' : CTC)
            });

        } catch (e) {
            log.error('saveRecord error', e.message || e.toString());
        }

        return true;
    };

    const validateField = () => true;
    const validateLine = () => true;
    const postSourcing = () => {};

    // =====================================================
    // Helper – Earnings Monthly change
    // =====================================================
    const handleEarningsMonthlyChange = (currentRec) => {
        const monthPay = currentRec.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_hris_employee_data_change',
            fieldId: 'custrecord_hris_cde_monthly'
        });

        const weeklyOffPresent = currentRec.getText({
            fieldId: 'custrecord_hris_empchange_working_days_w'
        });

        // Bi-Monthly
        if (weeklyOffPresent) {
            currentRec.setCurrentSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_data_change',
                fieldId: 'custrecord_hris_bi_monthly',
                value: parseFloat(monthPay) / 2
            });
        } else {
            currentRec.setCurrentSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_data_change',
                fieldId: 'custrecord_hris_bi_monthly',
                value: ''
            });
        }

        // Daily
        let daily = '';
        if (weeklyOffPresent == 5 || weeklyOffPresent === '5') {
            const fixNumber = searchPFValue(11);
            daily = ((parseFloat(monthPay) / parseFloat(fixNumber)) * 12).toFixed(2);
        } else if (weeklyOffPresent == 6 || weeklyOffPresent === '6') {
            const fixNumber = searchPFValue(12);
            daily = ((parseFloat(monthPay) / parseFloat(fixNumber)) * 12).toFixed(2);
        }

        currentRec.setCurrentSublistValue({
            sublistId: 'recmachcustrecord_hris_employee_data_change',
            fieldId: 'custrecord_hris_cde_daily',
            value: daily
        });

        // Hourly
        const hourly = (daily && daily != 0) ? (parseFloat(daily) / 8).toFixed(2) : '';
        currentRec.setCurrentSublistValue({
            sublistId: 'recmachcustrecord_hris_employee_data_change',
            fieldId: 'custrecord_hris_hourly',
            value: hourly
        });

        // Annual + disable logic based on component
        const payComp = currentRec.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_hris_employee_data_change',
            fieldId: 'custrecord_hris_cde_payroll_component'
        });

        if (payComp) {
            const compData = getPayrollComponentData(payComp);
            if (compData.ctc === true || compData.ctc === 'T') {
                if ((compData.benefits === false || compData.benefits === 'F') &&
                    compData.payFreq == 1 &&
                    (compData.calcType == 1 || compData.calcType == 2)) {

                    const annual = parseFloat(monthPay || 0) * 12;
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_employee_data_change',
                        fieldId: 'custrecord_hris_cde_annually',
                        value: annual
                    });
                }
            }
        }
    };

    // =====================================================
    // Helper – Earnings Component change
    // =====================================================
    const handleEarningsComponentChange = (currentRec) => {
        const payComp = currentRec.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_hris_employee_data_change',
            fieldId: 'custrecord_hris_cde_payroll_component'
        });
        if (!payComp) return;

        const compData = getPayrollComponentData(payComp);
        const payGroup = currentRec.getValue({ fieldId: 'custrecord_hris_empchange_emp_pay_pro_gp' });

        // Fixed amount / standard calculation
        if ((compData.ctc === true || compData.ctc === 'T') &&
            (compData.benefits === false || compData.benefits === 'F') &&
            compData.payFreq == 1 &&
            compData.calcType == 1) {

            if (compData.fixedAmt) {
                currentRec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_monthly',
                    value: compData.fixedAmt
                });
                currentRec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_annually',
                    value: parseFloat(compData.fixedAmt) * 12
                });
            } else {
                const month = currentRec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_monthly'
                });
                currentRec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_annually',
                    value: parseFloat(month || 0) * 12
                });
            }
        }

        // Formula calculation (calcType = 3)
        if (compData.calcType == 3 && compData.payFreq == 1) {
            applyFormula(currentRec, payComp, payGroup, 'recmachcustrecord_hris_employee_data_change',
                'custrecord_hris_cde_monthly', 'custrecord_hris_cde_annually');
        }
    };

    // =====================================================
    // Helper – Deduction Component / Monthly
    // =====================================================
    const handleDeductionComponentChange = (currentRec) => {
        const payComp = currentRec.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_hris_employee_datachangeint',
            fieldId: 'custrecord_hris_cdb_payroll_component'
        });
        if (!payComp) return;

        const compData = getPayrollComponentData(payComp);
        const payGroup = currentRec.getValue({ fieldId: 'custrecord_hris_empchange_emp_pay_pro_gp' });

        if ((compData.ctc === true || compData.ctc === 'T') &&
            (compData.benefits === true || compData.benefits === 'T') &&
            compData.payFreq == 1 &&
            compData.calcType == 1) {

            const month = currentRec.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_datachangeint',
                fieldId: 'custrecord_hris_cdb_monthly'
            });
            currentRec.setCurrentSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_datachangeint',
                fieldId: 'custrecord_hris_cdb_annually',
                value: parseFloat(month || 0) * 12
            });
        }

        // Formula
        if (compData.calcType == 3) {
            applyFormula(currentRec, payComp, payGroup, 'recmachcustrecord_hris_employee_datachangeint',
                'custrecord_hris_cdb_monthly', 'custrecord_hris_cdb_annually');
        }
    };

    const handleDeductionMonthlyChange = (currentRec) => {
        const payComp = currentRec.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_hris_employee_datachangeint',
            fieldId: 'custrecord_hris_cdb_payroll_component'
        });
        if (!payComp) return;

        const compData = getPayrollComponentData(payComp);

        if ((compData.ctc === true || compData.ctc === 'T') &&
            (compData.benefits === true || compData.benefits === 'T') &&
            compData.payFreq == 1 &&
            compData.calcType == 1) {

            const month = currentRec.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_datachangeint',
                fieldId: 'custrecord_hris_cdb_monthly'
            });
            currentRec.setCurrentSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_datachangeint',
                fieldId: 'custrecord_hris_cdb_annually',
                value: parseFloat(month || 0) * 12
            });
        }
    };

    // =====================================================
    // Helper – Other Component
    // =====================================================
    const handleOtherComponentChange = (currentRec) => {
        const payComp = currentRec.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_hris_employee_data_change_int',
            fieldId: 'custrecord_hris_payroll_component'
        });
        if (!payComp) return;

        const compData = getPayrollComponentData(payComp);
        const payGroup = currentRec.getValue({ fieldId: 'custrecord_hris_empchange_emp_pay_pro_gp' });

        if (compData.calcType == 3 && compData.payFreq == 2) {
            applyFormula(currentRec, payComp, payGroup, 'recmachcustrecord_hris_employee_data_change_int',
                'custrecord_hris_monthly', 'custrecord_hris_annually');
        }
    };

    // =====================================================
    // Formula Engine
    // =====================================================
    const applyFormula = (currentRec, payComp, payGroup, sublistId, monthlyField, annualField) => {
        const formula = getFormula(payComp, payGroup, 3);
        if (!formula) return;

        const tokens = formula.split(' ');
        let resultFormula = formula;

        tokens.forEach((token) => {
            if (isNaN(token) &&
                token !== '*' && token !== '/' && token !== '=' &&
                token !== '-' && token !== '+' && token !== '(' &&
                token !== ')' && token !== '%') {

                const matched = getComponentValueByName(currentRec, token);
                if (matched) {
                    resultFormula = resultFormula.replace(token, matched.value);
                }
            }
        });

        // Evaluate the formula (simple eval – keep same behaviour as original)
        let monthlyResult = '';
        try {
            // Remove any remaining non-numeric operators carefully
            monthlyResult = Function('"use strict"; return (' + resultFormula + ')')();
        } catch (e) {
            log.error('Formula evaluation failed', { formula: resultFormula, error: e.message });
            return;
        }

        currentRec.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: monthlyField,
            value: monthlyResult
        });

        currentRec.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: annualField,
            value: parseFloat(monthlyResult || 0) * 12
        });
    };

    // =====================================================
    // Data helpers
    // =====================================================
    const getPayrollComponentData = (compId) => {
        const result = search.lookupFields({
            type: 'customrecord_hris_payroll_component',
            id: compId,
            columns: [
                'custrecord_hris__ctc',
                'custrecord_hris_benefits',
                'custrecord_hris_pay_frequency',
                'custrecord_hris_payroll_calculation_type',
                'custrecord_hris_fixed_amount'
            ]
        });

        return {
            ctc: getLookupValue(result.custrecord_hris__ctc),
            benefits: getLookupValue(result.custrecord_hris_benefits),
            payFreq: getLookupValue(result.custrecord_hris_pay_frequency),
            calcType: getLookupValue(result.custrecord_hris_payroll_calculation_type),
            fixedAmt: getLookupValue(result.custrecord_hris_fixed_amount)
        };
    };

    const getFormula = (payComp, payGroup, calcType) => {
        const results = search.create({
            type: 'customrecord_hris_payroll_component',
            filters: [
                ['internalid', 'is', payComp],
                'AND',
                ['custrecord_hris_pay_process_group', 'is', payGroup],
                'AND',
                ['custrecord_hris_payroll_calculation_type', 'is', calcType]
            ],
            columns: ['custrecord_hris_pay_formula']
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'custrecord_hris_pay_formula' });
        }
        return null;
    };

    const getComponentValueByName = (currentRec, componentName) => {
        // Search in Earnings
        const earnCount = currentRec.getLineCount({ sublistId: 'recmachcustrecord_hris_employee_data_change' });
        for (let i = 0; i < earnCount; i++) {
            const name = currentRec.getSublistText({
                sublistId: 'recmachcustrecord_hris_employee_data_change',
                fieldId: 'custrecord_hris_cde_payroll_component',
                line: i
            });
            if (name === componentName) {
                return {
                    name: name,
                    value: currentRec.getSublistValue({
                        sublistId: 'recmachcustrecord_hris_employee_data_change',
                        fieldId: 'custrecord_hris_cde_monthly',
                        line: i
                    })
                };
            }
        }

        // Search in Deductions
        const dedCount = currentRec.getLineCount({ sublistId: 'recmachcustrecord_hris_employee_datachangeint' });
        for (let i = 0; i < dedCount; i++) {
            const name = currentRec.getSublistText({
                sublistId: 'recmachcustrecord_hris_employee_datachangeint',
                fieldId: 'custrecord_hris_cdb_payroll_component',
                line: i
            });
            if (name === componentName) {
                return {
                    name: name,
                    value: currentRec.getSublistValue({
                        sublistId: 'recmachcustrecord_hris_employee_datachangeint',
                        fieldId: 'custrecord_hris_cdb_monthly',
                        line: i
                    })
                };
            }
        }

        // Search in Others
        const otherCount = currentRec.getLineCount({ sublistId: 'recmachcustrecord_hris_employee_data_change_int' });
        for (let i = 0; i < otherCount; i++) {
            const name = currentRec.getSublistText({
                sublistId: 'recmachcustrecord_hris_employee_data_change_int',
                fieldId: 'custrecord_hris_payroll_component',
                line: i
            });
            if (name === componentName) {
                return {
                    name: name,
                    value: currentRec.getSublistValue({
                        sublistId: 'recmachcustrecord_hris_employee_data_change_int',
                        fieldId: 'custrecord_hris_monthly',
                        line: i
                    })
                };
            }
        }

        return null;
    };

    const searchPFValue = (seqNo) => {
        const results = search.create({
            type: 'customrecord_hris_global_parameter',
            filters: [
                ['custrecord_hris_gp_sequence_no', 'equalto', seqNo],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['custrecord_hris_gp_value']
        }).run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            return results[0].getValue({ name: 'custrecord_hris_gp_value' });
        }
        return 1;
    };

    // =====================================================
    // Existing helpers from previous combined script
    // =====================================================
    const setEmployeeDetails = (currentRec, empId) => {
        const empRec = record.load({
            type: record.Type.EMPLOYEE,
            id: empId,
            isDynamic: false
        });

        currentRec.setValue({
            fieldId: 'custrecord_hris_empchange_gender',
            value: empRec.getValue({ fieldId: 'custentity_hris_empgender' }),
            ignoreFieldChange: true,
            forceSyncSourcing: true
        });
        currentRec.setValue({
            fieldId: 'custrecord_hris_empchange_marital_status',
            value: empRec.getValue({ fieldId: 'custentity_hris_empmaritalstatus' }),
            ignoreFieldChange: true,
            forceSyncSourcing: true
        });
        currentRec.setCurrentSublistValue({
    sublistId: 'recmachcustrecord_hris_employee_data_change',
    fieldId: 'custrecord_hris_cde_employee_name',
    value: empId,
    ignoreFieldChange: false,
    forceSyncSourcing: true
});

    };

    const setPayProcessGroupFromEmployee = (currentRec, empId) => {
        const sql = `SELECT custentity_hris_empcategory FROM employee WHERE id = ${empId}`;
        const results = query.runSuiteQL({ query: sql }).asMappedResults();

        if (results.length > 0) {
            currentRec.setValue({
                fieldId: 'custrecord_hris_empchange_emp_pay_pro_gp',
                value: results[0].custentity_hris_empcategory,
                ignoreFieldChange: false,
                forceSyncSourcing: false
            });
        }
    };

    const calculateAnnualFromMonthly = (currentRec, isSublist) => {
        if (isSublist) {
            const monthly = currentRec.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_data_changeint',
                fieldId: 'custrecord_hris_cdd_monthly'
            });
            const annual = (monthly !== null && monthly !== '' && monthly !== undefined)
                ? parseFloat(monthly) * 12 : '';
            currentRec.setCurrentSublistValue({
                sublistId: 'recmachcustrecord_hris_employee_data_changeint',
                fieldId: 'custrecord_hris_cdd_annually',
                value: annual
            });
        } else {
            const monthly = currentRec.getValue({ fieldId: 'custrecord_hris_cdd_monthly' });
            const annual = (monthly !== null && monthly !== '' && monthly !== undefined)
                ? parseFloat(monthly) * 12 : '';
            currentRec.setValue({
                fieldId: 'custrecord_hris_cdd_annually',
                value: annual
            });
        }
    };

    const validateEffectiveDate = (currentRec) => {
        const empChangeType = currentRec.getValue({ fieldId: 'custrecord_hris_empchange_type' });
        if (empChangeType != 4) return;

        const empId = currentRec.getValue({ fieldId: 'custrecord_hris_empchange_employee_nam' });
        const fromDateStr = currentRec.getValue({ fieldId: 'custrecord_hris_empchange_eff_from_date' });
        if (!empId || !fromDateStr) return;

        try {
            const empRec = record.load({
                type: record.Type.EMPLOYEE,
                id: empId,
                isDynamic: false
            });
            const joiningDateStr = empRec.getValue({ fieldId: 'hiredate' });
            if (!joiningDateStr) return;

            const joiningDate = format.parse({ value: joiningDateStr, type: format.Type.DATE });
            const fromDate = format.parse({ value: fromDateStr, type: format.Type.DATE });

            if (fromDate < joiningDate) {
                dialog.alert({
                    title: 'Validation Error',
                    message: 'Effective Date should be greater than joining Date'
                });
                currentRec.setValue({
                    fieldId: 'custrecord_hris_empchange_eff_from_date',
                    value: ''
                });
            }
        } catch (e) {
            log.error('validateEffectiveDate error', e.message || e.toString());
        }
    };

    const setSublistProcessGroup = (currentRec, sublistId, fieldId, value) => {
        try {
            currentRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: fieldId,
                value: value,
                ignoreFieldChange: true,
                forceSyncSourcing: true
            });
        } catch (e) { /* ignore */ }
    };

    const valueCheck = (value) => {
        if (value === Infinity || value === -Infinity || isNaN(value) ||
            value === '' || value === undefined || value === null ||
            value.toString() === 'NaN') {
            return 0;
        }
        return parseFloat(value);
    };

    const getLookupValue = (field) => {
        if (Array.isArray(field) && field.length > 0) {
            return field[0].value !== undefined ? field[0].value : field[0];
        }
        return field;
    };

    // =====================================================
    // Return
    // =====================================================
    return {
        pageInit,
        fieldChanged,
        lineInit,
        saveRecord,
        validateField,
        validateLine,
        postSourcing
    };
});