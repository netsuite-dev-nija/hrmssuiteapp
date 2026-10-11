/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([
    'N/search',
    'N/query',
    'N/format',
    'N/email',
    'N/record',
    'N/currentRecord',
    'N/url',
    'N/runtime',
    'N/ui/dialog'
], (search, query, format, email, record, currentRecord, url, runtime, dialog) => {

    const pageInit = (context) => {
        debugger;
    };

    const fieldChanged = (context) => {
        debugger;
        const currentRec = context.currentRecord;

        // ===== Employee Name change =====
        if (context.fieldId === 'custrecord_hris_employee_name_') {
            const EmployeID = currentRec.getValue({ fieldId: 'custrecord_hris_employee_name_' }) || '';

            if (EmployeID !== '') {
                // Check for pending compensation change
                let EmpcompChangehistoryID = null;
                const EmpCompensationhistorySQL =
                    `SELECT * FROM customrecord_hris_employee_compensation 
                     WHERE custrecord_hris_emphis_approvalstatus = 1 
                     AND isinactive = 'F' 
                     AND custrecord_hris_employee_name_ = ${EmployeID}`;

                const resultSet = query.runSuiteQL({ query: EmpCompensationhistorySQL });
                const tsResult = resultSet.asMappedResults();

                if (tsResult.length > 0 && tsResult[0].id) {
                    EmpcompChangehistoryID = tsResult[0].id;
                    log.debug('EmpcompChangehistoryID', EmpcompChangehistoryID);
                }

                if (EmpcompChangehistoryID) {
                    alert('A salary compensation update or revision is already pending approval.');
                    currentRec.setValue({
                        fieldId: 'custrecord_hris_employee_name_',
                        value: '',
                        ignoreFieldChange: false
                    });
                    return false;
                }

                // Get existing compensation change record
                let EmpcompChangeID = null;
                let emppaygroup = null;

                const EmpCompensationSQL =
                    `SELECT * FROM customrecord_hris_employee_compen_change 
                     WHERE isinactive = 'F' 
                     AND custrecord_hris_empchange_employee_nam = ${EmployeID}`;

                const resultSet2 = query.runSuiteQL({ query: EmpCompensationSQL });
                const tsResult2 = resultSet2.asMappedResults();

                if (tsResult2.length > 0 && tsResult2[0].id) {
                    EmpcompChangeID = tsResult2[0].id;
                    emppaygroup = tsResult2[0].custrecord_hris_empchange_emp_pay_pro_gp;
                    log.debug('EmpcompChangeID', EmpcompChangeID);
                }

                if (EmpcompChangeID && emppaygroup) {
                    currentRec.setValue({
                        fieldId: 'custrecord_hris_employee_pay_process_gro',
                        value: emppaygroup,
                        ignoreFieldChange: false
                    });
                } else {
                    currentRec.setValue({
                        fieldId: 'custrecord_hris_employee_pay_process_gro',
                        value: '',
                        ignoreFieldChange: false
                    });
                }
            }
        }

        // ===== Pay Process Group change =====
        if (context.fieldId === 'custrecord_hris_employee_pay_process_gro') {
            const paygroup = currentRec.getValue({ fieldId: 'custrecord_hris_employee_pay_process_gro' });
            const EmployeID = currentRec.getValue({ fieldId: 'custrecord_hris_employee_name_' });
            const subsidiary = currentRec.getValue({ fieldId: 'custrecord_hris__subsidiary_' });
            const department = currentRec.getValue({ fieldId: 'custrecord_hris__department_o' });

            let EmpcompChangeID = null;

            if (EmployeID) {
                const EmpCompensationSQL =
                    `SELECT id FROM customrecord_hris_employee_compen_change 
                     WHERE custrecord_hris_empchange_employee_nam = ${EmployeID}`;

                const resultSet = query.runSuiteQL({ query: EmpCompensationSQL });
                const tsResult = resultSet.asMappedResults();

                if (tsResult.length > 0 && tsResult[0].id) {
                    EmpcompChangeID = tsResult[0].id;
                    log.debug('EmpcompChangeID', EmpcompChangeID);
                }

                // Clear existing sublist lines
                const lineCount = currentRec.getLineCount({
                    sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid'
                });
                if (lineCount > 0) {
                    for (let i = lineCount - 1; i >= 0; i--) {
                        currentRec.removeLine({
                            sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                            line: i,
                            ignoreRecalc: true
                        });
                    }
                }
            }

            if (EmpcompChangeID && paygroup) {
                const payrollcompsql =
                    `SELECT 
                        pc.id AS component_id,
                        pc.name,
                        pc.custrecord_hris__sequence_no_ AS sequenceno,
                        pc.custrecord_hris_component_short_name AS shortname,
                        empcomp.custrecord_hris_cde_monthly AS monthlyamount,
                        empcomp.custrecord_hris_cde_annually AS annuallyamount
                     FROM (
                        SELECT MIN(id) AS id
                        FROM customrecord_hris_payroll_component
                        WHERE custrecord_hris__ctc = 'T'
                          AND custrecord_hris_pay_process_group = ${paygroup}
                          AND custrecord_hris_payroll_calculation_type IN (1, 2)
                          AND custrecord_hris_pay_frequency = 1
                          AND isinactive = 'F'
                        GROUP BY custrecord_hris__sequence_no_
                     ) AS filtered
                     INNER JOIN customrecord_hris_payroll_component pc ON pc.id = filtered.id
                     LEFT JOIN customrecord_hris_compensation_details_e empcomp
                        ON pc.id = empcomp.custrecord_hris_cde_payroll_component
                        AND empcomp.custrecord_hris_employee_data_change = ${EmpcompChangeID}
                     ORDER BY pc.custrecord_hris__sequence_no_`;

                log.emergency('payrollcompsql', payrollcompsql);
                const resultSet = getResult(payrollcompsql);
                const componentsArray = [];

                for (let i = 0; i < resultSet.length; i++) {
                    const row = resultSet[i];
                    componentsArray.push({
                        Id: row.component_id,
                        name: row.component_id,
                        sequenceNo: row.sequenceno,
                        shortName: row.shortname,
                        paygroup: paygroup,
                        monthly: row.monthlyamount || 0,
                        annually: row.annuallyamount || 0,
                        empid: EmployeID,
                        subsidiary: subsidiary,
                        department: department
                    });
                }

                for (let comp = 0; comp < componentsArray.length; comp++) {
                    currentRec.selectNewLine({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid'
                    });

                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_processgroup',
                        value: componentsArray[comp].paygroup,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_payrollcomponent',
                        value: componentsArray[comp].name,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_prev_monthlyamt',
                        value: componentsArray[comp].monthly,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_monthlyamount',
                        value: componentsArray[comp].monthly,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_annuallyamount',
                        value: componentsArray[comp].annually,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_payrollseqno',
                        value: componentsArray[comp].sequenceNo,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_empname',
                        value: componentsArray[comp].empid,
                        ignoreFieldChange: false,
                        forceSyncSourcing: true
                    });

                    currentRec.commitLine({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid'
                    });
                }
            } else if (paygroup) {
                const payrollcompsql =
                    `SELECT name, id,
                            custrecord_hris__sequence_no_,
                            custrecord_hris_component_short_name
                     FROM customrecord_hris_payroll_component
                     WHERE id IN (
                        SELECT MIN(id)
                        FROM customrecord_hris_payroll_component
                        WHERE custrecord_hris__ctc = 'T'
                          AND custrecord_hris_pay_process_group = ${paygroup}
                          AND custrecord_hris_payroll_calculation_type IN (1, 2)
                          AND custrecord_hris_pay_frequency = 1
                        GROUP BY custrecord_hris__sequence_no_
                     )
                     ORDER BY custrecord_hris__sequence_no_`;

                const resultSet = getResult(payrollcompsql);
                const componentsArray = [];

                for (let i = 0; i < resultSet.length; i++) {
                    const row = resultSet[i];
                    componentsArray.push({
                        Id: row.id,
                        name: row.name,
                        sequenceNo: row.custrecord_hris__sequence_no_,
                        shortName: row.custrecord_hris_component_short_name,
                        paygroup: paygroup,
                        empid: EmployeID,
                        subsidiary: subsidiary,
                        department: department
                    });
                }

                for (let comp = 0; comp < componentsArray.length; comp++) {
                    currentRec.selectNewLine({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid'
                    });

                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_processgroup',
                        value: componentsArray[comp].paygroup,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_payrollcomponent',
                        value: componentsArray[comp].Id,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_prev_monthlyamt',
                        value: 0,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_monthlyamount',
                        value: 0,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_annuallyamount',
                        value: 0,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_payrollseqno',
                        value: componentsArray[comp].sequenceNo,
                        ignoreFieldChange: true
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                        fieldId: 'custrecord_hris_comhis_empname',
                        value: componentsArray[comp].empid,
                        ignoreFieldChange: false,
                        forceSyncSourcing: true
                    });

                    currentRec.commitLine({
                        sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid'
                    });
                }
            }
        }
    };

    const validateLine = (context) => {
        const currentRec = context.currentRecord;

        if (context.sublistId === 'recmachcustrecord_hris_comhis_compenhistoryid') {
            const monthlyAmount = currentRec.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                fieldId: 'custrecord_hris_comhis_monthlyamount'
            });

            if (monthlyAmount) {
                const annualAmount = parseFloat(monthlyAmount) * 12;
                currentRec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_hris_comhis_compenhistoryid',
                    fieldId: 'custrecord_hris_comhis_annuallyamount',
                    value: annualAmount,
                    ignoreFieldChange: true
                });
            }
        }
        return true;
    };

    const saveRecord = (context) => {
        debugger;
        const currentRec = context.currentRecord;
        const sublistId = 'recmachcustrecord_hris_comhis_compenhistoryid';
        const lineCount = currentRec.getLineCount({ sublistId });

        let totalMonthly = 0;
        let totalAnnual = 0;

        for (let i = 0; i < lineCount; i++) {
            const monthlyAmount = parseFloat(currentRec.getSublistValue({
                sublistId,
                fieldId: 'custrecord_hris_comhis_monthlyamount',
                line: i
            })) || 0;

            const annualAmount = parseFloat(currentRec.getSublistValue({
                sublistId,
                fieldId: 'custrecord_hris_comhis_annuallyamount',
                line: i
            })) || 0;

            totalMonthly += monthlyAmount;
            totalAnnual += annualAmount;
        }

        const CTC = parseFloat(totalAnnual);

        currentRec.setValue({ fieldId: 'custrecord_hris_monthly_gross_salary', value: totalMonthly });
        currentRec.setValue({ fieldId: 'custrecord_hris_annual_gross_salary', value: totalAnnual });
        currentRec.setValue({ fieldId: 'custrecord_hris_ctc', value: CTC });

        return true;
    };

    const getResult = (pSQL) => {
        const queryResults = query.runSuiteQL({ query: pSQL });
        return queryResults.asMappedResults();
    };

    return {
        pageInit,
        fieldChanged,
        validateLine,
        saveRecord
    };
});