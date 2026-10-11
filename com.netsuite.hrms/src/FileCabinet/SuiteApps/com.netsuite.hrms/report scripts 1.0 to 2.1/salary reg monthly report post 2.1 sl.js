/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 *
 * Description: Salary Register Report with SuiteQL and DataTables Pagination (Show/Next/Prev)
 */
define(['N/ui/serverWidget', 'N/search', 'N/url', 'N/runtime', 'N/log', 'N/record', 'N/file', 'N/encode', 'N/query'],
    (serverWidget, search, url, runtime, log, record, file, encode, query) => {

        const onRequest = (context) => {
            const { request, response } = context;

            // --- 1. CAPTURE PARAMETERS ---
            const paygroupParameter = request.parameters.paygroup || '';
            const departmentParameter = request.parameters.department || '';
            const moltype = request.parameters.moltype || '';
            const monthParameter = request.parameters.month || '';
            const yearParameter = request.parameters.year || '';
            const processParameter = request.parameters.processtype || '';
            const subsidiaries = request.parameters.subsidiary || '';
            const exportExcel = request.parameters.export || 'F'; 

            // --- 2. LOGIC FOR REPORT HEADER ---
            let Pgrp = "";
            if (paygroupParameter) {
                Pgrp = searchPGName(paygroupParameter);
            } else {
                Pgrp = searchSubsidiaryData(subsidiaries);
            }
            const PGDetail = Pgrp.split('#');
            const PaygrpName = PGDetail[0];
            const CurrencyName = PGDetail[1];
            const CurrSymbol = findCurrencySymbol(CurrencyName) || '';
            const monthName = getMonthText(monthParameter);
            const yearName = getYearText(yearParameter);
            const reportTitle = `Salary Register ${monthName} ${yearName}: ${PaygrpName}`;

            // --- 3. FETCH DATA VIA SUITEQL ---
            const data = getSalaryData({
                paygroup: paygroupParameter,
                month: monthParameter,
                year: yearParameter,
                process: processParameter,
                dept: departmentParameter,
                sub: subsidiaries,
                mol: moltype
            });

            // --- 4. RENDER EXPORT OR UI ---
            if (exportExcel === 'T') {
                const excelFile = buildExcelExport(data, monthName, yearName, PaygrpName, CurrSymbol);
                response.writeFile({ file: excelFile, isInline: false });
            } else {
                const htmlTable = buildProfessionalTable(data, monthName, yearName, PaygrpName, CurrSymbol, reportTitle);
                const form = serverWidget.createForm({ title: reportTitle });

                const exportUrl = url.resolveScript({
                    scriptId: runtime.getCurrentScript().id,
                    deploymentId: runtime.getCurrentScript().deploymentId,
                    params: { ...request.parameters, export: 'T' }
                });

                form.addButton({
                    id: 'custpage_export',
                    label: 'Export to Excel',
                    functionName: `window.open('${exportUrl}')`
                });

                const inlineHtml = form.addField({
                    id: 'custpage_report_html',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' '
                });
                inlineHtml.defaultValue = '<div style="margin-top:20px;">' + htmlTable + '</div>';
                response.writePage(form);
            }
        };

        const getSalaryData = (params) => {
            let sql = `
                SELECT 
                    BUILTIN.DF(main.custrecord_hris_pay_proc_company_name) as subsidiary,
                    main.custrecord_hris_pay_proc_employee_code as code,
                    main.custrecord_hris_pay_proc_employee_legal as name,
                    BUILTIN.DF(main.custrecord_hris_pay_proc_pay_group) as paygroup,
                    main.custrecord_hris_pay_proc_arrear_days as arreardays,
                    main.custrecord_hris_pay_proc_gross_arrearamt as arrearamt,
                    main.custrecord_hris_pay_proc_lop_days_final as lop,
                    main.custrecord_hris_pay_proc_paid_days as paid,
                    comp.custrecord_hris_component_short_name as compname,
                    main.custrecord_hris_pay_proc_value as compval,
                    comp.custrecord_hris__sequence_no_ as seq
                FROM customrecord_hris_pay_process main
                INNER JOIN customrecord_hris_payroll_component comp ON main.custrecord_hris_pay_proc_payroll_compone = comp.id
                INNER JOIN employee emp ON main.custrecord_hris_pay_proc_employee = emp.id
                WHERE main.custrecord_hris_pay_proc_pay_month = ? 
                AND main.custrecord_hris_pay_proc_year = ?
            `;

            let sqlParams = [params.month, params.year];
            if (params.paygroup) { sql += ` AND main.custrecord_hris_pay_proc_pay_group = ?`; sqlParams.push(params.paygroup); }
            if (params.process) { sql += ` AND main.custrecord_hris_pay_proc_process_type = ?`; sqlParams.push(params.process); }
            if (params.dept) { sql += ` AND main.custrecord_hris_pay_proc_department = ?`; sqlParams.push(params.dept); }
            if (params.sub) {
                let subs = params.sub.split(',');
                sql += ` AND main.custrecord_hris_pay_proc_company_name IN (${subs.map(() => '?').join(',')})`;
                subs.forEach(s => sqlParams.push(s));
            }
            if (params.mol) { sql += ` AND emp.custentity_hris_empvisaallocationmoltype = ?`; sqlParams.push(params.mol); }

            sql += ` ORDER BY main.custrecord_hris_pay_proc_employee_code, comp.custrecord_hris__sequence_no_`;

            const results = query.runSuiteQL({ query: sql, params: sqlParams }).asMappedResults();
            
            let hierarchy = {};
            let compSortMap = {};

            results.forEach(res => {
                const sub = res.subsidiary || 'Default';
                const code = res.code;
                const comp = res.compname || 'Misc';
                const val = parseFloat(res.compval) || 0;
                const seq = parseInt(res.seq) || 999;

                if (!hierarchy[sub]) hierarchy[sub] = {};
                if (!hierarchy[sub][code]) {
                    hierarchy[sub][code] = {
                        details: { code: code, name: res.name, paygroup: res.paygroup, arrearDays: res.arreardays || 0, arrearAmt: res.arrearamt || 0, lop: res.lop || 0, paid: res.paid || 0 },
                        comps: {}
                    };
                }
                hierarchy[sub][code].comps[comp] = val;
                if (comp && !compSortMap[comp]) compSortMap[comp] = seq;
            });

            return { hierarchy, componentList: Object.keys(compSortMap).sort((a, b) => compSortMap[a] - compSortMap[b]) };
        };

        const buildProfessionalTable = (data, month, year, subHeader, curr, reportTitle) => {
            const { hierarchy, componentList } = data;
            const totalCols = 7 + componentList.length;

            let style = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
                .rpt-container { width: 100%; font-family: "Roboto", sans-serif; overflow-x: auto; }
                table#salaryTable { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #ccc; }
                #salaryTable th { background-color: #103b6d; color: white; padding: 12px 8px; font-size: 11px; border: 1px solid #0d2f56; text-align:center; }
                #salaryTable td { padding: 10px 8px; border: 1px solid #e8e8e8; font-size: 12px; }
                .row-group td { background-color: #f1f4f8 !important; font-weight: 700; color: #103b6d; text-align: left; }
                .row-subtotal td { background-color: #e6f0ff !important; font-weight: 700; }
                .num { text-align: right; }
                .rpt-title { font-size: 20px; font-weight: 700; color: #103b6d; text-align: center; margin-bottom: 20px; }
                .dataTables_wrapper { font-size: 12px; }
                .dataTables_length, .dataTables_filter { margin-bottom: 10px; }
            </style>
            <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>`;

            let html = `<div class="rpt-container">${style}<div class="rpt-title">${reportTitle}</div>`;
            html += `<table id="salaryTable" class="display cell-border"><thead><tr>`;
            html += `<th>Employee Code</th><th>Employee Name</th><th>Pay Group</th><th>Arrear Days</th><th>Arrear Amt</th><th>Unpaid Days</th><th>Paid Days</th>`;
            componentList.forEach(c => html += `<th>${escapeHtml(c)}<br>(${curr})</th>`);
            html += `</tr></thead><tbody>`;

            for (let subName in hierarchy) {
                html += `<tr class="row-group"><td><strong>${escapeHtml(subName)}</strong></td>`;
                for (let i = 1; i < totalCols; i++) { html += `<td></td>`; }
                html += `</tr>`;

                let subTotals = {};
                let emps = hierarchy[subName];
                for (let code in emps) {
                    let emp = emps[code];
                    html += `<tr><td>${escapeHtml(emp.details.code)}</td><td>${escapeHtml(emp.details.name)}</td><td>${escapeHtml(emp.details.paygroup)}</td>`;
                    html += `<td class="num">${parseFloat(emp.details.arrearDays).toFixed(2)}</td><td class="num">${formatNumber(emp.details.arrearAmt)}</td>`;
                    html += `<td class="num">${parseFloat(emp.details.lop).toFixed(2)}</td><td class="num">${emp.details.paid}</td>`;
                    componentList.forEach(c => {
                        let val = emp.comps[c] || 0;
                        html += `<td class="num">${formatNumber(val)}</td>`;
                        subTotals[c] = (subTotals[c] || 0) + val;
                    });
                    html += `</tr>`;
                }

                html += `<tr class="row-subtotal"><td>TOTAL</td><td></td><td></td><td></td><td></td><td></td><td></td>`;
                componentList.forEach(c => html += `<td class="num">${formatNumber(subTotals[c] || 0)}</td>`);
                html += `</tr>`;
            }
            html += `</tbody></table></div>`;

            // DataTables Initialization with Paging (Show entries, Previous, Next)
            html += `
            <script>
                $(document).ready(function() {
                    $('#salaryTable').DataTable({
                        paging: true,
                        pageLength: 100,
                        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
                        info: true,
                        searching: true,
                        ordering: false,
                        responsive: true
                    });
                });
            </script>`;
            return html;
        };

        const buildExcelExport = (data, monthName, yearName, paygrpName, currSymbol) => {
            const { hierarchy, componentList } = data;
            let xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Styles><Style ss:ID="header"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:Bold="1"/><Interior ss:Color="#D3D3D3" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style><Style ss:ID="num"><NumberFormat ss:Format="#,##0.00"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style></Styles><Worksheet ss:Name="Salary Register"><Table>';
            for (let subName in hierarchy) {
                xml += '<Row><Cell><Data ss:Type="String">' + escapeXml(subName) + '</Data></Cell></Row>';
                xml += '<Row ss:StyleID="header">';
                ['Employee Code', 'Employee Name', 'Pay Group', 'Arrear Days', 'Arrear Amt', 'Unpaid Days', 'Paid Days'].forEach(h => xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>`);
                componentList.forEach(c => xml += `<Cell><Data ss:Type="String">${escapeXml(c)} (${currSymbol})</Data></Cell>`);
                xml += '</Row>';
                let emps = hierarchy[subName];
                for (let code in emps) {
                    let emp = emps[code];
                    xml += `<Row><Cell><Data ss:Type="String">${escapeXml(emp.details.code)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(emp.details.name)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(emp.details.paygroup)}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${emp.details.arrearDays}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${emp.details.arrearAmt}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${emp.details.lop}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${emp.details.paid}</Data></Cell>`;
                    componentList.forEach(c => xml += `<Cell ss:StyleID="num"><Data ss:Type="Number">${emp.comps[c] || 0}</Data></Cell>`);
                    xml += '</Row>';
                }
            }
            xml += '</Table></Worksheet></Workbook>';
            return file.create({ name: `Salary_Register.xls`, fileType: file.Type.EXCEL, contents: encode.convert({ string: xml, inputEncoding: encode.Encoding.UTF_8, outputEncoding: encode.Encoding.BASE_64 }) });
        };

        const formatNumber = (num) => { if (isNaN(num) || num === null) return "0.00"; return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
        const getMonthText = (m) => { return ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][parseInt(m)] || ''; };
        const getYearText = (yId) => { if (!yId) return ''; return search.lookupFields({ type: 'customlist_hris_year_master', id: yId, columns: ['name'] }).name; };
        const searchPGName = (pgId) => { const l = search.lookupFields({ type: 'customrecord_hris_process_groupmaster', id: pgId, columns: ['name', 'custrecord_hris__currency'] }); return l.name + "#" + (l.custrecord_hris__currency[0] ? l.custrecord_hris__currency[0].text : ''); };
        const searchSubsidiaryData = (subId) => { if (!subId) return "All#"; const first = String(subId).split(',')[0]; const l = search.lookupFields({ type: 'subsidiary', id: first, columns: ['name', 'currency'] }); return l.name + "#" + l.currency[0].text; };
        const findCurrencySymbol = (name) => { if (!name) return ""; let s = ""; search.create({ type: 'currency', filters: [['name', 'is', name.trim()]], columns: ['symbol'] }).run().each(r => { s = r.getValue('symbol'); return false; }); return s; };
        const escapeHtml = (s) => { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
        const escapeXml = (s) => { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;'); };

        return { onRequest };
    });