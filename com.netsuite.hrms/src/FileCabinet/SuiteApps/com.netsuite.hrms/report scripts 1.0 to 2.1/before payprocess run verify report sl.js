/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @Description Professional Payroll Summary Preview & Execution Suitelet matching Attendance Portal UI/UX Theme.
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/format', 'N/redirect', 'N/runtime', 'N/log'],
    (serverWidget, search, record, format, redirect, runtime, log) => {

        const CUSTOM_RECORDS = {
            PRE_PAY_PROCESS: 'customrecord_hris_pre_pay_process_record',
            PAY_PROCESS: 'customrecord_hris_pay_process',
            EMP_COMP_CHANGE: 'customrecord_hris_employee_compen_change',
            PAYROLL_COMPONENT: 'customrecord_hris_payroll_component',
            UNPAID_LEAVE: 'customrecord_hris_unpaid_leave_entry',
            UNPAID_ARREAR: 'customrecord_hris_unpaid_arrear_entry',
            MONTHLY_SAL: 'customrecord_hris_monthlysalinput',
            SALARY_ADJ: 'customrecord_hris_salary_adjustment_entr',
            WAGE_PERIOD: 'customrecord_hris_wage_period_details',
            LOAN_APP: 'customrecord_hris_empchange_loan_applicn',
            LOAN_CHILD: 'customrecord_hris_loan_applicat_child',
            LOAN_MASTER: 'customrecord_hris_loan_master',
            GLOBAL_PARAM: 'customrecord_hris_global_parameter',
            COMPONENT_TYPE: 'customrecord_hris_component_type',
            PT_SLAB: 'customrecord_hris_pt_slap_master',
            MONTHLY_ATTENDANCE: 'customrecord_hrms_monthlyattendance',
            YEAR_MASTER: 'customlist_hris_year_master'
        };

        const onRequest = (context) => {
            const request = context.request;
            const response = context.response;

            if (request.method === 'GET') {
                onGet(context);
            } else {
                onPost(context);
            }
        };

        const onGet = (context) => {
            const request = context.request;
            const response = context.response;

            const payGroupParam = request.parameters.custpage_paygroup || '';
            const wageMonthParam = request.parameters.custpage_wagemonth || '';
            const yearParam = request.parameters.custpage_year || '';
            const actionParam = request.parameters.custpage_action || '';

            const form = serverWidget.createForm({
                title: ' '
            });
            form.clientScriptModulePath = '';

            // Filter Field Group
            const filterGroup = form.addFieldGroup({
                id: 'custpage_filter_group',
                label: 'Payroll Summary & Preview Filters'
            });

            const payGroupField = form.addField({
                id: 'custpage_paygroup',
                type: serverWidget.FieldType.SELECT,
                label: 'Pay Group',
                source: 'customrecord_hris_pay_group',
                container: 'custpage_filter_group'
            });
            if (payGroupParam) payGroupField.defaultValue = payGroupParam;

            const wageMonthField = form.addField({
                id: 'custpage_wagemonth',
                type: serverWidget.FieldType.SELECT,
                label: 'Wage Month',
                source: 'customlist_hris_month_list',
                container: 'custpage_filter_group'
            });
            if (wageMonthParam) wageMonthField.defaultValue = wageMonthParam;

            const yearField = form.addField({
                id: 'custpage_year',
                type: serverWidget.FieldType.SELECT,
                label: 'Year',
                source: CUSTOM_RECORDS.YEAR_MASTER,
                container: 'custpage_filter_group'
            });
            if (yearParam) yearField.defaultValue = yearParam;

            form.addSubmitButton({ label: 'Load Preview' });

            if (payGroupParam && wageMonthParam && yearParam) {
                form.addButton({
                    id: 'custpage_btn_run_payroll',
                    label: 'Run Pay Process',
                    functionName: 'runPayProcessAction()'
                });
            }

            // Hidden action field for POST handling
            const actionField = form.addField({
                id: 'custpage_action',
                type: serverWidget.FieldType.TEXT,
                label: 'Action'
            });
            actionField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            // Data Calculation & HTML rendering
            let htmlContent = '';
            if (payGroupParam && wageMonthParam && yearParam) {
                const previewData = calculatePreviewData(payGroupParam, wageMonthParam, yearParam);
                htmlContent = generateDashboardHtml(previewData);
            } else {
                htmlContent = `
                    <div style="padding: 40px; text-align: center; font-family: 'Open Sans', Helvetica, sans-serif; color: #666;">
                        <h3 style="color: #333; margin-bottom: 10px;">Please Select Pay Group, Wage Month, and Year to View Payroll Summary Preview</h3>
                        <p style="font-size: 14px;">Data is calculated dynamically on-the-fly from employee compensation, attendance, and leave records before committing to the Pay Process.</p>
                    </div>
                `;
            }

            const htmlField = form.addField({
                id: 'custpage_html_container',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Payroll Summary Dashboard'
            });
            htmlField.defaultValue = htmlContent;

            response.writePage(form);
        };

        const onPost = (context) => {
            const request = context.request;
            const response = context.response;

            const payGroup = request.parameters.custpage_paygroup;
            const wageMonth = request.parameters.custpage_wagemonth;
            const year = request.parameters.custpage_year;
            const action = request.parameters.custpage_action;

            if (action === 'run_process' && payGroup && wageMonth && year) {
                try {
                    const result = executeFinalPayProcess(payGroup, wageMonth, year);
                    redirect.toSuitelet({
                        scriptId: runtime.getCurrentScript().scriptId,
                        deploymentId: runtime.getCurrentScript().deploymentId,
                        parameters: {
                            custpage_paygroup: payGroup,
                            custpage_wagemonth: wageMonth,
                            custpage_year: year,
                            custpage_msg: 'Pay Process executed successfully for ' + result.processedCount + ' employees.'
                        }
                    });
                    return;
                } catch (e) {
                    log.error('Pay Process Execution Error', e.message);
                    redirect.toSuitelet({
                        scriptId: runtime.getCurrentScript().scriptId,
                        deploymentId: runtime.getCurrentScript().deploymentId,
                        parameters: {
                            custpage_paygroup: payGroup,
                            custpage_wagemonth: wageMonth,
                            custpage_year: year,
                            custpage_error: e.message
                        }
                    });
                    return;
                }
            }

            redirect.toSuitelet({
                scriptId: runtime.getCurrentScript().scriptId,
                deploymentId: runtime.getCurrentScript().deploymentId,
                parameters: {
                    custpage_paygroup: payGroup,
                    custpage_wagemonth: wageMonth,
                    custpage_year: year
                }
            });
        };

        const calculatePreviewData = (payGroup, wageMonth, year) => {
            let employees = [];
            let totalEmp = 0;
            let totalGrossEarn = 0;
            let totalGrossDed = 0;
            let totalNetPay = 0;

            try {
                const wagePeriodId = getWagePeriodNo(wageMonth);
                const monthDays = getMonthDays(wageMonth);

                const empSearch = search.create({
                    type: 'employee',
                    filters: [
                        ['custentity_hris_emp_paygroup', 'anyof', payGroup],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'internalid',
                        'entityid',
                        'entitytitle',
                        'custentity_hris_empcode',
                        'custentity_hris_empdepartment_new',
                        'custentity_hris_empptlocation',
                        'custentity_hris_emp_isptapplicable'
                    ]
                });

                empSearch.run().each(result => {
                    const empId = result.id;
                    const empName = result.getValue('entitytitle') || result.getValue('entityid');
                    const empCode = result.getValue('custentity_hris_empcode') || '';
                    const dept = result.getText('custentity_hris_empdepartment_new') || '';

                    // Calculate Earnings & Deductions on the fly
                    const earnings = getEmpEarningsOnFly(empId, payGroup, wagePeriodId, monthDays, year);
                    const deductions = getEmpDeductionsOnFly(empId, payGroup, wagePeriodId, year);
                    const netPay = earnings.gross - deductions.gross;

                    totalEmp++;
                    totalGrossEarn += earnings.gross;
                    totalGrossDed += deductions.gross;
                    totalNetPay += netPay;

                    employees.push({
                        empId,
                        empCode,
                        empName,
                        dept,
                        paidDays: earnings.paidDays,
                        lopDays: earnings.lopDays,
                        grossEarn: earnings.gross,
                        grossDed: deductions.gross,
                        netPay: Math.round(netPay)
                    });

                    return true;
                });
            } catch (e) {
                log.error('calculatePreviewData Error', e.message);
            }

            return {
                totalEmp,
                totalGrossEarn,
                totalGrossDed,
                totalNetPay,
                employees
            };
        };

        const getEmpEarningsOnFly = (empId, payGroup, wagePeriodId, monthDays, year) => {
            let gross = 0;
            let paidDays = monthDays;
            let lopDays = 0;

            try {
                // Get LOP days
                const lopSearch = search.create({
                    type: CUSTOM_RECORDS.UNPAID_LEAVE,
                    filters: [
                        ['custrecord_hris_ule_employee_name', 'anyof', empId],
                        'AND',
                        ['custrecord_hris_ule_month', 'is', wagePeriodId],
                        'AND',
                        ['custrecord_hris_ule_year', 'is', year],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['custrecord_hris_ule_noof_days']
                });
                lopSearch.run().each(r => {
                    lopDays += parseFloat(r.getValue('custrecord_hris_ule_noof_days') || 0);
                    return true;
                });

                paidDays = Math.max(0, monthDays - lopDays);

                // Compensation change components
                const compSearch = search.create({
                    type: CUSTOM_RECORDS.EMP_COMP_CHANGE,
                    filters: [
                        ['custrecord_hris_empchange_emp_pay_pro_gp', 'anyof', payGroup],
                        'AND',
                        ['custrecord_hris_empchange_employee_nam', 'anyof', empId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        search.createColumn({ name: 'custrecord_hris_cde_payroll_component', join: 'custrecord_hris_employee_data_change' }),
                        search.createColumn({ name: 'custrecord_hris_cde_monthly', join: 'custrecord_hris_employee_data_change' })
                    ]
                });

                compSearch.run().each(result => {
                    const monthly = parseFloat(result.getValue({ name: 'custrecord_hris_cde_monthly', join: 'custrecord_hris_employee_data_change' }) || 0);
                    if (monthly > 0) {
                        const ratePerDay = monthly / monthDays;
                        const finalCompAmt = monthly - (ratePerDay * lopDays);
                        gross += Math.max(0, finalCompAmt);
                    }
                    return true;
                });
            } catch (e) {
                log.error('getEmpEarningsOnFly Error for emp ' + empId, e.message);
            }

            return { gross, paidDays, lopDays };
        };

        const getEmpDeductionsOnFly = (empId, payGroup, wagePeriodId, year) => {
            let gross = 0;
            try {
                const dedSearch = search.create({
                    type: CUSTOM_RECORDS.EMP_COMP_CHANGE,
                    filters: [
                        ['custrecord_hris_empchange_emp_pay_pro_gp', 'anyof', payGroup],
                        'AND',
                        ['custrecord_hris_empchange_employee_nam', 'anyof', empId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        search.createColumn({ name: 'custrecord_hris_cdb_payroll_component', join: 'custrecord_hris_employee_datachangeint' }),
                        search.createColumn({ name: 'custrecord_hris_cdb_monthly', join: 'custrecord_hris_employee_datachangeint' })
                    ]
                });

                dedSearch.run().each(result => {
                    const monthly = parseFloat(result.getValue({ name: 'custrecord_hris_cdb_monthly', join: 'custrecord_hris_employee_datachangeint' }) || 0);
                    if (monthly > 0) {
                        gross += monthly;
                    }
                    return true;
                });
            } catch (e) {
                log.error('getEmpDeductionsOnFly Error for emp ' + empId, e.message);
            }
            return { gross };
        };

        const executeFinalPayProcess = (payGroup, wageMonth, year) => {
            let processedCount = 0;
            const wagePeriodId = getWagePeriodNo(wageMonth);
            const monthDays = getMonthDays(wageMonth);

            const empSearch = search.create({
                type: 'employee',
                filters: [
                    ['custentity_hris_emp_paygroup', 'anyof', payGroup],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid', 'custentity_hris_empcode', 'subsidiary', 'custentity_hris_empdepartment_new', 'entitytitle']
            });

            empSearch.run().each(result => {
                const empId = result.id;
                const empCode = result.getValue('custentity_hris_empcode') || '';
                const dept = result.getValue('custentity_hris_empdepartment_new') || '';
                const company = result.getValue('subsidiary') || '';
                const entitytitle = result.getValue('entitytitle') || '';

                // Clean existing pay process for this period
                deleteExistingPayProcess(empId, payGroup, wagePeriodId, year);

                // Create Pay Process records
                const earnings = getEmpEarningsOnFly(empId, payGroup, wagePeriodId, monthDays, year);
                const deductions = getEmpDeductionsOnFly(empId, payGroup, wagePeriodId, year);
                const netPay = earnings.gross - deductions.gross;

                const payRec = record.create({ type: CUSTOM_RECORDS.PAY_PROCESS });
                payRec.setValue('custrecord_hris_pay_proc_employee', empId);
                payRec.setValue('custrecord_hris_pay_proc_employee_code', empCode);
                payRec.setValue('custrecord_hris_pay_proc_pay_group', payGroup);
                payRec.setValue('custrecord_hris_pay_proc_employee_name', entitytitle);
                payRec.setValue('custrecord_hris_pay_proc_department', dept);
                payRec.setValue('custrecord_hris_pay_proc_pay_month', wagePeriodId);
                payRec.setValue('custrecord_hris_pay_proc_year', year);
                payRec.setValue('custrecord_hris_pay_proc_gross_earning', earnings.gross);
                payRec.setValue('custrecord_hris_pay_proc_gross_deduction', deductions.gross);
                payRec.setValue('custrecord_hris_pay_proc_net_pay', Math.round(netPay));
                payRec.setValue('custrecord_hris_pay_proc_paid_days', earnings.paidDays);
                payRec.setValue('custrecord_hris_pay_proc_lop_days_final', earnings.lopDays);
                if (company) payRec.setValue('custrecord_hris_pay_proc_company_name', company);
                payRec.save();

                processedCount++;
                return true;
            });

            return { processedCount };
        };

        const deleteExistingPayProcess = (empId, payGroup, wagePeriodId, year) => {
            try {
                const delSearch = search.create({
                    type: CUSTOM_RECORDS.PAY_PROCESS,
                    filters: [
                        ['custrecord_hris_pay_proc_employee', 'anyof', empId],
                        'AND',
                        ['custrecord_hris_pay_proc_pay_group', 'anyof', payGroup],
                        'AND',
                        ['custrecord_hris_pay_proc_pay_month', 'anyof', wagePeriodId],
                        'AND',
                        ['custrecord_hris_pay_proc_year', 'anyof', year],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                });
                delSearch.run().each(r => {
                    record.delete({ type: CUSTOM_RECORDS.PAY_PROCESS, id: r.id });
                    return true;
                });
            } catch (e) {
                log.error('deleteExistingPayProcess Error', e.message);
            }
        };

        const getWagePeriodNo = (wageName) => {
            const monthMap = {
                'January': '1', 'February': '2', 'March': '3', 'April': '4',
                'May': '5', 'June': '6', 'July': '7', 'August': '8',
                'September': '9', 'October': '10', 'November': '11', 'December': '12'
            };
            return monthMap[wageName] || wageName;
        };

        const getMonthDays = (monthNum) => {
            const m = getWagePeriodNo(monthNum);
            if (['1', '3', '5', '7', '8', '10', '12'].includes(m)) return 31;
            if (['4', '6', '9', '11'].includes(m)) return 30;
            if (m === '2') return 28;
            return 30;
        };

        const generateDashboardHtml = (data) => {
            let rowsHtml = '';
            data.employees.forEach((emp, index) => {
                rowsHtml += `
                    <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #edf2f7; text-align: center; color: #4a5568;">${index + 1}</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #edf2f7; font-weight: 600; color: #2d3748;">${emp.empCode}</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${emp.empName}</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #edf2f7; color: #4a5568;">${emp.dept}</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #edf2f7; text-align: center; color: #3182ce; font-weight: 600;">${emp.paidDays}</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #edf2f7; text-align: center; color: #e53e3e; font-weight: 600;">${emp.lopDays}</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #edf2f7; text-align: right; color: #38a169; font-weight: 600;">${emp.grossEarn.toFixed(2)}</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #edf2f7; text-align: right; color: #dd6b20; font-weight: 600;">${emp.grossDed.toFixed(2)}</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #edf2f7; text-align: right; color: #2b6cb0; font-weight: 700;">${emp.netPay.toFixed(2)}</td>
                    </tr>
                `;
            });

            return `
                <style>
                    .payroll-wrapper { font-family: 'Open Sans', Helvetica, Arial, sans-serif; background-color: #f7fafc; padding: 20px; border-radius: 8px; }
                    .kpi-container { display: flex; gap: 20px; margin-bottom: 25px; flex-wrap: wrap; }
                    .kpi-card { background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 20px; flex: 1; min-width: 200px; border-top: 4px solid #3182ce; }
                    .kpi-card.green { border-top-color: #38a169; }
                    .kpi-card.orange { border-top-color: #dd6b20; }
                    .kpi-card.purple { border-top-color: #805ad5; }
                    .kpi-title { font-size: 13px; text-transform: uppercase; color: #718096; font-weight: 700; margin-bottom: 8px; }
                    .kpi-value { font-size: 24px; font-weight: 700; color: #2d3748; }
                    .table-container { background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; }
                    .payroll-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
                    .payroll-table th { background: #1a202c; color: #ffffff; padding: 14px 15px; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
                    .payroll-table tr:hover { background-color: #f8fafc; }
                </style>
                <script>
                    function runPayProcessAction() {
                        if (confirm('Are you sure you want to run the Pay Process for all employees based on this preview?')) {
                            document.getElementById('custpage_action').value = 'run_process';
                            document.forms[0].submit();
                        }
                    }
                </script>
                <div class="payroll-wrapper">
                    <div class="kpi-container">
                        <div class="kpi-card">
                            <div class="kpi-title">Total Employees</div>
                            <div class="kpi-value">${data.totalEmp}</div>
                        </div>
                        <div class="kpi-card green">
                            <div class="kpi-title">Total Gross Earnings</div>
                            <div class="kpi-value">${data.totalGrossEarn.toFixed(2)}</div>
                        </div>
                        <div class="kpi-card orange">
                            <div class="kpi-title">Total Deductions</div>
                            <div class="kpi-value">${data.totalGrossDed.toFixed(2)}</div>
                        </div>
                        <div class="kpi-card purple">
                            <div class="kpi-title">Total Net Pay</div>
                            <div class="kpi-value">${data.totalNetPay.toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="table-container">
                        <table class="payroll-table">
                            <thead>
                                <tr>
                                    <th style="text-align: center;">#</th>
                                    <th>Emp Code</th>
                                    <th>Employee Name</th>
                                    <th>Department</th>
                                    <th style="text-align: center;">Paid Days</th>
                                    <th style="text-align: center;">LOP Days</th>
                                    <th style="text-align: right;">Gross Earnings</th>
                                    <th style="text-align: right;">Gross Deductions</th>
                                    <th style="text-align: right;">Net Pay</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        };

        return {
            onRequest
        };
    });