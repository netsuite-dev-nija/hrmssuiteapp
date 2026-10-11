/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 *
 * Combined After Submit for Employee Compensation Change:
 * 1. Calculate Gross totals (Monthly / Annual / Bi-monthly / Daily / Hourly) + CTC
 * 2. Calculate Deduction totals + Approx Net
 * 3. Apply Exchange Rate → Monthly / Annual Gross in AED
 * 4. Update Employee Pay Group
 * 5. Clean up empty child records
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

    const afterSubmit = (context) => {
        if (context.type === context.UserEventType.DELETE) {
            return;
        }

        try {
            const recType = context.newRecord.type;
            const recId = context.newRecord.id;

            log.debug('AfterSubmit started', { recType, recId });

            const edcRec = record.load({
                type: recType,
                id: recId,
                isDynamic: false
            });

            // =====================================================
            // PART 1 – Calculate Gross totals from Earnings sublist
            // =====================================================
            let totalMonthlyEarn = 0;
            let totalAnnuallyEarn = 0;
            let totalBiMonthlyEarn = 0;
            let totalDailyEarn = 0;
            let totalHourlyEarn = 0;

            const earnLineCount = edcRec.getLineCount({
                sublistId: 'recmachcustrecord_hris_employee_data_change'
            });

            for (let i = 0; i < earnLineCount; i++) {
                totalMonthlyEarn += valueCheck(edcRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_monthly',
                    line: i
                }));
                totalAnnuallyEarn += valueCheck(edcRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_annually',
                    line: i
                }));
                totalBiMonthlyEarn += valueCheck(edcRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_bi_monthly',
                    line: i
                }));
                totalDailyEarn += valueCheck(edcRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_cde_daily',
                    line: i
                }));
                totalHourlyEarn += valueCheck(edcRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change',
                    fieldId: 'custrecord_hris_hourly',
                    line: i
                }));
            }

            // =====================================================
            // PART 2 – Calculate Deduction totals
            // =====================================================
            let totalMonthlyDed = 0;
            let totalAnnuallyDed = 0;

            const dedLineCount = edcRec.getLineCount({
                sublistId: 'recmachcustrecord_hris_employee_datachangeint'
            });

            for (let i = 0; i < dedLineCount; i++) {
                totalMonthlyDed += valueCheck(edcRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_datachangeint',
                    fieldId: 'custrecord_hris_cdb_monthly',
                    line: i
                }));
                totalAnnuallyDed += valueCheck(edcRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_datachangeint',
                    fieldId: 'custrecord_hris_cdb_annually',
                    line: i
                }));
            }

            // =====================================================
            // PART 3 – Calculate Others totals
            // =====================================================
            let totalMonthlyOthers = 0;
            let totalAnnuallyOthers = 0;

            const otherLineCount = edcRec.getLineCount({
                sublistId: 'recmachcustrecord_hris_employee_data_change_int'
            });

            for (let i = 0; i < otherLineCount; i++) {
                totalMonthlyOthers += valueCheck(edcRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change_int',
                    fieldId: 'custrecord_hris_monthly',
                    line: i
                }));
                totalAnnuallyOthers += valueCheck(edcRec.getSublistValue({
                    sublistId: 'recmachcustrecord_hris_employee_data_change_int',
                    fieldId: 'custrecord_hris_annually',
                    line: i
                }));
            }

            // =====================================================
            // Set Gross fields + CTC
            // =====================================================
            const ctc = totalAnnuallyEarn + totalAnnuallyDed + totalAnnuallyOthers;

            edcRec.setValue({ fieldId: 'custrecord_hris_empchange_month_cross_sy', value: totalMonthlyEarn });
            edcRec.setValue({ fieldId: 'custrecord_hris_empchange_annualgrosssly', value: totalAnnuallyEarn });
            edcRec.setValue({ fieldId: 'custrecord_hris_empchange_bimon_gros_sal', value: totalBiMonthlyEarn });
            edcRec.setValue({ fieldId: 'custrecord_hris_empchange_daily_grosssly', value: totalDailyEarn });
            edcRec.setValue({ fieldId: 'custrecord_hris_empchange_hourly_grs_sal', value: totalHourlyEarn });

            edcRec.setValue({
                fieldId: 'custrecord_hris_empchange_ctc',
                value: (isNaN(ctc) ? '' : ctc)
            });

            // ESIC warning (original logic only logged)
            const esicCheck = edcRec.getValue({ fieldId: 'custrecord_hris_empchange_esic_applicabe' });
            if (totalMonthlyEarn > 15000 && (esicCheck === true || esicCheck === 'T')) {
                log.debug('ESIC Warning', 'Gross Salary cannot Exceed 15000 since ESIC is Applicable');
            }

            // =====================================================
            // Set Deduction totals + Approx Net
            // =====================================================
            edcRec.setValue({ fieldId: 'custrecord_hris_empchange_mon_ded_amt', value: totalMonthlyDed });
            edcRec.setValue({ fieldId: 'custrecord_hris_empchange_anual_ded_amt', value: totalAnnuallyDed });

            const approxMonthlyNet = totalMonthlyEarn - totalMonthlyDed;
            const approxAnnualNet = totalAnnuallyEarn - totalAnnuallyDed;

            edcRec.setValue({ fieldId: 'custrecord_hris_empchange_aprox_monthly', value: approxMonthlyNet });
            edcRec.setValue({ fieldId: 'custrecord_hris_empchange_apprx_annetsly', value: approxAnnualNet });

            // =====================================================
            // PART 4 – Exchange Rate calculation (AED)
            // =====================================================
            const payGroupId = edcRec.getValue({ fieldId: 'custrecord_hris_empchange_emp_pay_pro_gp' });
            let exchangeRate = 0;

            if (payGroupId) {
                const rate = search.lookupFields({
                    type: 'customrecord_hris_process_groupmaster',
                    id: payGroupId,
                    columns: ['custrecord_hris_allowance_currency_excha']
                }).custrecord_hris_allowance_currency_excha;

                exchangeRate = valueCheck(rate);
            }

            const monthlyInAED = parseFloat((totalMonthlyEarn * exchangeRate).toFixed(2));
            const annualInAED = parseFloat((monthlyInAED * 12).toFixed(2));

            edcRec.setValue({ fieldId: 'custrecord_hris_empchange_mon_gross', value: monthlyInAED });
            edcRec.setValue({ fieldId: 'custrecord_hris_empchange_an_gross_salar', value: annualInAED });

            // =====================================================
            // Save parent record
            // =====================================================
            const savedId = edcRec.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });
            log.debug('EDC Record Updated', savedId);

            // =====================================================
            // Update Employee Pay Group
            // =====================================================
            const empId = edcRec.getValue({ fieldId: 'custrecord_hris_empchange_employee_nam' });
            if (empId && payGroupId) {
                record.submitFields({
                    type: record.Type.EMPLOYEE,
                    id: empId,
                    values: {
                        custentity_hris_emppayrollgroup: payGroupId
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
            }

            // =====================================================
            // Clean up empty child records
            // =====================================================
            cleanupEmptyChildren(recId);

        } catch (e) {
            log.error('Combined AfterSubmit ERROR', e.message || e.toString());
        }
    };

    // -----------------------------------------------------
    // Helper: clean empty component lines
    // -----------------------------------------------------
    const cleanupEmptyChildren = (parentId) => {
        // Other components with no payroll component
        deleteEmptyRecords({
            recordType: 'customrecord_hris_compensation_detail_ot',
            parentField: 'custrecord_hris_employee_data_change_int',
            componentField: 'custrecord_hris_payroll_component',
            parentId
        });

        // Earnings with no payroll component
        deleteEmptyRecords({
            recordType: 'customrecord_hris_compensation_details_e',
            parentField: 'custrecord_hris_employee_data_change',
            componentField: 'custrecord_hris_cde_payroll_component',
            parentId
        });

        // Benefits with no payroll component
        deleteEmptyRecords({
            recordType: 'customrecord_hris_compensation_details_b',
            parentField: 'custrecord_hris_employee_datachangeint',
            componentField: 'custrecord_hris_cdb_payroll_component',
            parentId
        });
    };

    const deleteEmptyRecords = ({ recordType, parentField, componentField, parentId }) => {
        const results = search.create({
            type: recordType,
            filters: [
                [parentField, 'is', parentId],
                'AND',
                [componentField, 'anyof', '@NONE@']
            ],
            columns: ['internalid']
        }).run().getRange({ start: 0, end: 1000 });

        if (!results) return;

        results.forEach((r) => {
            try {
                record.delete({ type: recordType, id: r.id });
            } catch (e) {
                log.error('Delete empty child failed', e.message);
            }
        });
    };

    // -----------------------------------------------------
    // Helper: safe number
    // -----------------------------------------------------
    const valueCheck = (value) => {
        if (value === Infinity || value === -Infinity || isNaN(value) ||
            value === '' || value === undefined || value === null ||
            value.toString() === 'NaN') {
            return 0;
        }
        return parseFloat(value);
    };

    return { afterSubmit };
});