/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope Public
 * 
 * WinStar HR - Attendance Summary & Hours Report
 * Logic: Wage Period 21st (Prev Month) to 20th (Current Month)
 */

define(["N/ui/serverWidget", "N/log", "N/query", "N/runtime", "N/url"],
    function (serverWidget, log, query, runtime, url) {

        var YEAR_MAP = {
            '1': '2019', '2': '2020', '3': '2021', '4': '2022',
            '5': '2023', '6': '2024', '7': '2025', '8': '2026', '9': '2027'
        };

        function onRequest(context) {
            try {
                var params = context.request.parameters;
                var subId = params.custpage_subsidiary || '';
                var monthId = params.custpage_month || ''; // ID from customlist_hris_month_list (1=Jan, 2=Feb...)
                var yearId = params.custpage_year || ''; 
                var isExport = (params.custpage_export === 'T');

                // Calculate Date Range: 21st of Previous Month to 20th of Selected Month
                var dateRange = calculateWagePeriod(monthId, yearId);

                // 1. CSV EXPORT LOGIC
                if (isExport && subId && monthId) {
                    var expData = getSummaryData(subId, dateRange);
                    var csv = buildSummaryCSV(expData, dateRange);
                    context.response.setHeader({ name: 'Content-Type', value: 'text/csv' });
                    context.response.setHeader({ name: 'Content-Disposition', value: 'attachment; filename="Attendance_Summary.csv"' });
                    context.response.write('\uFEFF' + csv);
                    return;
                }

                var form = serverWidget.createForm({ title: 'Attendance Summary Report' });
                form.addSubmitButton({ label: 'Generate Summary' });

                // 2. FILTERS AT TOP
                var fGrp = form.addFieldGroup({ id: 'custpage_filters', label: 'Report Parameters' });
                
                var subFld = form.addField({ id: 'custpage_subsidiary', type: serverWidget.FieldType.SELECT, label: 'Subsidiary', source: 'subsidiary', container: 'custpage_filters' });
                subFld.defaultValue = subId;
                subFld.isMandatory = true;

                var monFld = form.addField({ id: 'custpage_month', type: serverWidget.FieldType.SELECT, label: 'Wage Month', source: 'customlist_hris_month_list', container: 'custpage_filters' });
                monFld.defaultValue = monthId;

                var yrFld = form.addField({ id: 'custpage_year', type: serverWidget.FieldType.SELECT, label: 'Year', source: 'customlist_hris_year_master', container: 'custpage_filters' });
                yrFld.defaultValue = yearId;

                // 3. EXPORT BUTTON
                if (subId && monthId) {
                    var exportUrl = url.resolveScript({
                        scriptId: runtime.getCurrentScript().id,
                        deploymentId: runtime.getCurrentScript().deploymentId,
                        params: { custpage_subsidiary: subId, custpage_month: monthId, custpage_year: yearId, custpage_export: 'T' }
                    });
                    form.addButton({
                        id: 'custpage_csv_btn', label: 'Export CSV',
                        functionName: "window.open('" + exportUrl + "', '_blank');"
                    });
                }

                // 4. RESULT SECTION (BREAKOUT WITH GAP)
                if (subId && monthId) {
                    var summaryData = getSummaryData(subId, dateRange);
                    var htmlField = form.addField({ id: 'custpage_report_html', type: serverWidget.FieldType.INLINEHTML, label: ' ' });
                    htmlField.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTROW });
                    htmlField.defaultValue = buildSummaryHtml(summaryData, dateRange);
                } else {
                    var info = form.addField({ id: 'custpage_info', type: serverWidget.FieldType.INLINEHTML, label: ' ' });
                    info.defaultValue = getStyles() + '<div class="welcome-msg">Select parameters to generate the attendance summary.</div>';
                }

                context.response.writePage(form);

            } catch (e) {
                log.error("onRequest_Error", e);
                context.response.write("System Error: " + e.message);
            }
        }

        /**
         * Logic: April selection results in March 21 to April 20.
         * JS Months are 0-indexed (Jan=0, Apr=3).
         */
        function calculateWagePeriod(monthId, yearId) {
            var actualYear = parseInt(YEAR_MAP[yearId] || new Date().getFullYear());
            var selectedMonth = parseInt(monthId); // e.g., 4 for April

            // End Date is the 20th of the selected month
            var end = new Date(actualYear, selectedMonth - 1, 20);
            
            // Start Date is the 21st of the PREVIOUS month
            // JS Date handles month -1 (December of prev year) automatically
            var start = new Date(actualYear, selectedMonth - 2, 21);
            
            return { start: start, end: end };
        }

        function getSummaryData(subId, dateRange) {
            function toSqlDate(d) {
                var mm = (d.getMonth() + 1 < 10) ? '0' + (d.getMonth() + 1) : (d.getMonth() + 1);
                var dd = (d.getDate() < 10) ? '0' + d.getDate() : d.getDate();
                return d.getFullYear() + '-' + mm + '-' + dd;
            }

            var sql = "WITH AttData AS ( " +
                "SELECT BUILTIN.DF(A.custrecord_njt_emp_atten_employee) AS emp_name, C.custentity_hris_empcode AS emp_code, BUILTIN.DF(C.custentity_hris_empdesignation) AS design, " +
                "BUILTIN.DF(B.custrecord_njt_emp_daily_intatt) AS status, NVL(B.custrecord_njt_emp_daily_totalhours, 0) AS th, NVL(B.custrecord_njt_emp_daily_regularizahrs, 0) AS rh, NVL(B.custrecord_njt_ot_hours, 0) AS oh " +
                "FROM customrecord_njt_emp_daily_attendance AS A " +
                "JOIN customrecord_njt_emp_daily_atten_ch AS B ON B.custrecord_njt_emp_daily_parent = A.id " +
                "JOIN employee AS C ON A.custrecord_njt_emp_atten_employee = C.id " +
                "WHERE C.subsidiary = " + subId + " AND B.custrecord_njt_emp_daily_date BETWEEN TO_DATE('" + toSqlDate(dateRange.start) + "', 'YYYY-MM-DD') AND TO_DATE('" + toSqlDate(dateRange.end) + "', 'YYYY-MM-DD') " +
                ") SELECT emp_name, emp_code, design, SUM(CASE WHEN status LIKE '%Present%' THEN 1 ELSE 0 END) AS p_count, SUM(CASE WHEN status LIKE '%Absent%' THEN 1 ELSE 0 END) AS a_count, " +
                "SUM(th) AS total_hrs, SUM(rh) AS reg_hrs, SUM(oh) AS ot_hrs FROM AttData GROUP BY emp_name, emp_code, design ORDER BY emp_name";

            return query.runSuiteQL({ query: sql }).asMappedResults();
        }

        function buildSummaryHtml(results, dateRange) {
            var H = getStyles();
            var tEmp = results.length, tP = 0, tA = 0, tOt = 0, tHrsSum = 0;
            results.forEach(function (r) { 
                tP += parseInt(r.p_count || 0); 
                tA += parseInt(r.a_count || 0); 
                tOt += parseFloat(r.ot_hrs || 0);
                tHrsSum += parseFloat(r.total_hrs || 0);
            });

            H += '<div class="report-breakout-container">';
            H += '  <div class="kpi-row">';
            H +=      makeKPI('TOTAL EMPLOYEES', tEmp, '#004b8d');
            H +=      makeKPI('TOTAL PRESENT', tP, '#16a34a');
            H +=      makeKPI('TOTAL ABSENT', tA, '#dc2626');
            H +=      makeKPI('TOTAL HOURS', tHrsSum.toFixed(2), '#475569');
            H +=      makeKPI('TOTAL OT HOURS', tOt.toFixed(2), '#800000');
            H += '  </div>';

            H += '  <div class="matrix-card">';
            H += '    <div class="matrix-header">';
            H += '      <div class="period-txt">ATTENDANCE SUMMARY | ' + dateRange.start.toDateString().toUpperCase() + ' - ' + dateRange.end.toDateString().toUpperCase() + '</div>';
            H += '      <input type="text" id="attSearch" placeholder="Search employee..." onkeyup="doTableSearch()">';
            H += '    </div>';

            H += '    <div class="table-container">';
            H += '      <table class="att-table" id="attendanceTable"><thead><tr>';
            H += '        <th style="width:10%">CODE</th><th style="width:25%">NAME</th><th style="width:20%">DESIGNATION</th>';
            H += '        <th class="num-col">PRESENT</th><th class="num-col">ABSENT</th>';
            H += '        <th class="num-col">TOTAL HRS</th><th class="num-col">REG HRS</th><th class="num-col">OT HRS</th>';
            H += '      </tr></thead><tbody>';

            results.forEach(function (row) {
                H += '<tr>';
                H += '  <td class="txt-bold">' + (row.emp_code || '-') + '</td>';
                H += '  <td class="txt-name">' + row.emp_name + '</td>';
                H += '  <td>' + (row.design || '-') + '</td>';
                H += '  <td class="num-col" style="color:#16a34a; font-weight:bold;">' + row.p_count + '</td>';
                H += '  <td class="num-col" style="color:#dc2626; font-weight:bold;">' + row.a_count + '</td>';
                H += '  <td class="num-col">' + parseFloat(row.total_hrs || 0).toFixed(2) + '</td>';
                H += '  <td class="num-col">' + parseFloat(row.reg_hrs || 0).toFixed(2) + '</td>';
                H += '  <td class="num-col" style="background:#fff1f2; font-weight:bold;">' + parseFloat(row.ot_hrs || 0).toFixed(2) + '</td>';
                H += '</tr>';
            });
            H += '</tbody></table></div></div></div>';

            H += '<script>function doTableSearch() { var filter = document.getElementById("attSearch").value.toUpperCase(); var rows = document.getElementById("attendanceTable").getElementsByTagName("tr"); for (var i = 1; i < rows.length; i++) { var text = rows[i].cells[0].textContent + " " + rows[i].cells[1].textContent; rows[i].style.display = (text.toUpperCase().indexOf(filter) > -1) ? "" : "none"; } }</script>';
            return H;
        }

        function getStyles() {
            return '<style>' +
                '.report-breakout-container { width: 96vw; position: relative; left: 50%; transform: translateX(-50%); margin-top: 50px; padding: 10px; box-sizing: border-box; background: #f8fafc; }' +
                '.kpi-row { display: flex; gap: 15px; margin-bottom: 30px; justify-content: center; width: 100%; }' +
                '.kpi-box { background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #cbd5e1; flex: 1; border-left: 6px solid #004b8d; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }' +
                '.kpi-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }' +
                '.kpi-num { font-size: 26px; font-weight: 800; line-height: 1; }' +
                '.matrix-card { background: #fff; border: 1px solid #cbd5e1; width: 100% !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; }' +
                '.matrix-header { padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; background: #fff; border-bottom: 2px solid #004b8d; }' +
                '.period-txt { font-weight: 800; color: #004b8d; font-size: 13px; }' +
                '#attSearch { padding: 8px 15px; border: 1px solid #cbd5e1; border-radius: 4px; width: 350px; }' +
                '.table-container { width: 100%; overflow-x: auto; }' +
                '.att-table { border-collapse: collapse; width: 100% !important; table-layout: auto; }' +
                '.att-table thead th { background-color: #004b8d !important; color: white !important; padding: 15px 12px; font-size: 11px; text-align: left; text-transform: uppercase; border-right: 1px solid #003366; }' +
                '.att-table tbody td { padding: 12px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; border-right: 1px solid #f8fafc; }' +
                '.att-table tbody tr:hover { background-color: #f1f5f9; }' +
                '.num-col { text-align: right !important; }' +
                '.txt-bold { font-weight: bold; color: #475569; }' +
                '.txt-name { font-weight: bold; color: #000; }' +
                '.welcome-msg { padding: 50px; text-align: center; color: #94a3b8; font-size: 16px; width: 100%; }' +
                '</style>';
        }

        function makeKPI(title, val, color) {
            return '<div class="kpi-box" style="border-left-color: ' + color + '"><div class="kpi-title">'+title+'</div><div class="kpi-num" style="color:'+color+'">'+val+'</div></div>';
        }

        function buildSummaryCSV(results, dr) {
            var c = 'Attendance Summary\nPeriod,' + dr.start.toDateString() + ' - ' + dr.end.toDateString() + '\n\n';
            c += 'Code,Name,Designation,Present,Absent,Total Hours,Reg Hours,OT Hours\n';
            results.forEach(function (r) {
                c += (r.emp_code || '') + ',"' + r.emp_name + '","' + (r.design || '') + '",' + r.p_count + ',' + r.a_count + ',' + r.total_hrs + ',' + r.reg_hrs + ',' + r.ot_hrs + '\n';
            });
            return c;
        }

        return { onRequest: onRequest };
    }
);