/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/ui/serverWidget', 'N/log', 'N/format'], (query, serverWidget, log, format) => {

    const onRequest = (scriptContext) => {
        if (scriptContext.request.method === 'GET') {
            try {
                // 1. Get the Compensation ID from the parameter
                const compId = scriptContext.request.parameters.custparam_compid;
                if (!compId) return scriptContext.response.write('Please select an employee first.');

                // 2. Fetch Data using SuiteQL
                const reportData = getSalaryData(compId);
                
                if (reportData.length === 0) {
                    return scriptContext.response.write('No compensation history found for this record.');
                }

                // 3. Create Form
                const form = serverWidget.createForm({ title: ' ' });

                // Add Export Button
                form.addButton({
                    id: 'custpage_export_excel',
                    label: 'Export to Excel',
                    functionName: 'exportToExcel'
                });

                const htmlField = form.addField({
                    id: 'custpage_report_html',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' '
                });

                // 4. Generate the HTML Table
                htmlField.defaultValue = generateHTML(reportData);

                scriptContext.response.writePage(form);

            } catch (e) {
                log.error('Report Error', e);
                scriptContext.response.write('Error: ' + e.message);
            }
        }
    };

    /**
     * Executes SuiteQL to join:
     * Compensation (E) -> Comp Change (C) -> History Earnings (H)
     */
    function getSalaryData(compId) {
        const sql = `
            SELECT
                E.custrecord_hris_employee_name_ as emp_name,
                E.custrecord_hris_employee_legal_name_ as legal_name,
                E.custrecord_hris_employee_code_ as emp_code,
                BUILTIN.DF(E.custrecord_hris_employee_pay_process_gro) as pay_group,
                BUILTIN.DF(E.custrecord_hris_currency_) as currency,
                BUILTIN.DF(E.custrecord_hris__subsidiary_) as subsidiary,
                E.custrecord_hris_date_of_joining as doj,
                BUILTIN.DF(E.custrecord_hris_record_change_type) as change_type,
                BUILTIN.DF(H.custrecord_hris_comhis_payrollcomponent) as component,
                H.custrecord_hris_comhis_prev_monthlyamt as prev_amt,
                H.custrecord_hris_comhis_monthlyamount as curr_amt,
                H.custrecord_hris_comhis_annuallyamount as annual_amt,
                H.custrecord_hris_comhis_payrollseqno as seq_no
            FROM 
                customrecord_hris_employee_compensation E
            INNER JOIN 
                customrecord_hris_employee_compen_change C ON C.id = E.custrecord_hris_employee_comp_details_li
            INNER JOIN 
                customrecord_hris_compen_history_earning H ON H.custrecord_hris_comhis_compenchangeid = C.id
            WHERE 
                E.id = ?
            ORDER BY H.custrecord_hris_comhis_payrollseqno ASC
        `;
        return query.runSuiteQL({ query: sql, params: [compId] }).asMappedResults();
    }

    function generateHTML(results) {
        const main = results[0]; // Header info is the same for all rows
        
        let totalPrev = 0;
        let totalCurr = 0;

        let html = `
        <style>
            .rpt-container { font-family: "Segoe UI", Tahoma, sans-serif; padding: 20px; background-color: #f4f7f9; }
            .header-info { margin-bottom: 20px; background: #fff; padding: 15px; border-left: 5px solid #103b6d; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-info table { width: 100%; font-size: 13px; }
            .header-info label { font-weight: bold; color: #555; }
            .salary-table { width: 100%; border-collapse: collapse; background: #fff; }
            .salary-table th { background-color: #103b6d; color: white; padding: 12px; font-size: 12px; text-align: left; border: 1px solid #0d2e54; }
            .salary-table td { padding: 10px; border: 1px solid #e0e0e0; font-size: 12px; }
            .amt { text-align: right; font-family: "Courier New", monospace; }
            .positive { color: green; font-weight: bold; }
            .negative { color: red; font-weight: bold; }
            .total-row { background-color: #eef2f7; font-weight: bold; }
        </style>

        <div class="rpt-container">
            <div class="header-info">
                <h3>SALARY COMPARISON REPORT</h3>
                <table>
                    <tr>
                        <td><label>Employee:</label> ${main.emp_code} - ${main.emp_name}</td>
                        <td><label>Subsidiary:</label> ${main.subsidiary}</td>
                    </tr>
                    <tr>
                        <td><label>Legal Name:</label> ${main.legal_name}</td>
                        <td><label>Date of Joining:</label> ${main.doj}</td>
                    </tr>
                    <tr>
                        <td><label>Pay Group:</label> ${main.pay_group}</td>
                        <td><label>Currency:</label> ${main.currency}</td>
                    </tr>
                    <tr>
                        <td><label>Change Type:</label> ${main.change_type}</td>
                        <td></td>
                    </tr>
                </table>
            </div>

            <table class="salary-table" id="salaryTable">
                <thead>
                    <tr>
                        <th>SEQ</th>
                        <th>PAYROLL COMPONENT</th>
                        <th class="amt">PREVIOUS MONTHLY</th>
                        <th class="amt">CURRENT MONTHLY</th>
                        <th class="amt">VARIANCE</th>
                        <th class="amt">ANNUAL AMOUNT</th>
                    </tr>
                </thead>
                <tbody>`;

        results.forEach((row, index) => {
            let prev = parseFloat(row.prev_amt) || 0;
            let curr = parseFloat(row.curr_amt) || 0;
            let ann = parseFloat(row.annual_amt) || 0;
            let variance = curr - prev;
            
            totalPrev += prev;
            totalCurr += curr;

            html += `
                <tr>
                    <td>${row.seq_no || (index + 1)}</td>
                    <td>${row.component}</td>
                    <td class="amt">${fmt(prev)}</td>
                    <td class="amt">${fmt(curr)}</td>
                    <td class="amt ${variance >= 0 ? 'positive' : 'negative'}">${fmt(variance)}</td>
                    <td class="amt">${fmt(ann)}</td>
                </tr>`;
        });

        html += `
                <tr class="total-row">
                    <td colspan="2" style="text-align:right">TOTAL GROSS SALARY</td>
                    <td class="amt">${fmt(totalPrev)}</td>
                    <td class="amt">${totalCurr === 0 ? '-' : fmt(totalCurr)}</td>
                    <td class="amt">${fmt(totalCurr - totalPrev)}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
        </div>

        <script>
            function exportToExcel() {
                var table = document.getElementById('salaryTable');
                var blob = new Blob([table.outerHTML], { type: "application/vnd.ms-excel" });
                var url = window.URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = "Salary_Comparison_${main.emp_code}.xls";
                a.click();
            }
        </script>`;

        return html;
    }

    function fmt(v) {
        if (!v || v === 0) return '0.00';
        return parseFloat(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return { onRequest };
});