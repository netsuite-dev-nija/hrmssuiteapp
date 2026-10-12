/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 *
 * Eleveight HR Employee Overall Summary Portal (In-Time, Out-Time & Total Hours Report)
 * Theme: Navy Blue (#1e3a5f)
 */

define(["N/ui/serverWidget", "N/log", "N/query", "N/runtime", "N/url", "N/file"],
function (serverWidget, log, query, runtime, url, file) {

    function onRequest(context) {
        var p         = context.request.parameters;
        var projId    = p.custpage_project || '';
        var startDate = p.custpage_start   || '';
        var endDate   = p.custpage_end     || '';
        var isExp     = (p.custpage_export === 'T');

        var dr = calculateDateRange(startDate, endDate);

        /* =========================================================
           EXCEL EXPORT LOGIC
        ========================================================= */
        if (isExp && dr) {
            var expData = getProjectSummaryData(projId, dr);
            var htmlTable = buildExcelHtml(expData, dr);
            var excelFile = file.create({
                name: 'Employee_Overall_Summary.xls',
                fileType: file.Type.PLAINTEXT,
                contents: htmlTable
            });
            context.response.writeFile({ file: excelFile });
            return;
        }

        /* =========================================================
           PAGE RENDER LOGIC
        ========================================================= */
        var form = serverWidget.createForm({ title: ' ' });
        
        if (dr) {
            var ad = getProjectSummaryData(projId, dr);
            var f  = form.addField({ id:'custpage_html', type:serverWidget.FieldType.INLINEHTML, label:' ' });
            f.defaultValue = buildProjectSummaryHtml(ad, dr, projId, startDate, endDate);
        } else {
            var fi = form.addField({ id:'custpage_info', type:serverWidget.FieldType.INLINEHTML, label:' ' });
            fi.defaultValue = getStyles() + buildHeader(projId, startDate, endDate) +
                '<div class="welcome-msg">Select a Date Range and optional Project filter to load the Overall Summary.</div>';
        }
        context.response.writePage(form);
    }

    function calculateDateRange(startStr, endStr) {
        if (!startStr || !endStr) return null;
        try {
            var s = startStr.split('-'); 
            var e = endStr.split('-');
            var start = new Date(parseInt(s[0]), parseInt(s[1]) - 1, parseInt(s[2]));
            var end   = new Date(parseInt(e[0]), parseInt(e[1]) - 1, parseInt(e[2]));
            
            var days = [], t = new Date(start);
            while (t <= end) { days.push(new Date(t)); t.setDate(t.getDate() + 1); }
            return { start: start, end: end, days: days };
        } catch(err) { return null; }
    }

    function getProjectSummaryData(projId, dr) {
        function fmt(d) { return (d.getDate()<10?'0'+d.getDate():d.getDate())+'/'+((d.getMonth()+1)<10?'0'+(d.getMonth()+1):(d.getMonth()+1))+'/'+d.getFullYear(); }
        
        var sql = "SELECT BUILTIN.DF(custrecord_hris_daily_time_over_emp) AS emp_name, " +
                  "TO_CHAR(custrecord_hris_dail_timeheet_date, 'DD/MM/YYYY') AS d_date, " +
                  "custrecord_hris_daily_intime_overal AS in_time, " +
                  "custrecord_hris_daily_time_out_overa AS out_time, " +
                  "custrecord_hris_daily_timetolworkinghr AS total_hrs " +
                  "FROM customrecord_hris_daily_timesheet_overal " +
                  "WHERE custrecord_hris_dail_timeheet_date BETWEEN TO_DATE(?, 'DD/MM/YYYY') AND TO_DATE(?, 'DD/MM/YYYY') ";
        
        var params = [fmt(dr.start), fmt(dr.end)];
        if (projId) {
            sql += " AND custrecord_hris_daily_time_projectoveral = ? ";
            params.push(projId);
        }

        var results = query.runSuiteQL({ query: sql, params: params }).asMappedResults();
        var empMap = {}, empList = [];

        results.forEach(function (row) {
            var eName = row.emp_name || 'Unassigned Employee';
            if (!empMap[eName]) {
                empMap[eName] = { days: {}, grandTotal: 0 };
                empList.push(eName);
            }
            var hrs = parseFloat(row.total_hrs) || 0;
            var ds = row.d_date;
            empMap[eName].days[ds] = {
                inTime: row.in_time || '',
                outTime: row.out_time || '',
                totalHrs: hrs
            };
            empMap[eName].grandTotal += hrs;
        });

        return { empMap: empMap, empList: empList.sort() };
    }

    function buildProjectSummaryHtml(data, dr, projId, startDate, endDate) {
        var html = getStyles() + buildHeader(projId, startDate, endDate);
        var iconEmp = '<div class="c-ico c-ico-emp"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
        
        html += '<div class="kpi-bar">' + makeKpiCard('Active Employees Filtered', data.empList.length, iconEmp) + '</div>';
        
        html += '<div class="toolbar">' +
                '<div class="t-left">' +
                    '<span class="pill">EMPLOYEE OVERALL SUMMARY</span>' +
                    '<div class="search-box"><span>🔍</span><input type="text" id="attSearch" placeholder="Search employee name..." onkeyup="filterTable()"></div>' +
                '</div>' +
                '<div class="t-right"><button class="btn-exp" onclick="triggerExcelExport(\''+startDate+'\',\''+endDate+'\',\''+projId+'\')">⇓ Export Summary</button></div>' +
                '</div>';

        var monthGroups = [];
        var monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
        dr.days.forEach(function(day) {
            var mKey = monthNames[day.getMonth()] + ' ' + day.getFullYear();
            if (monthGroups.length === 0 || monthGroups[monthGroups.length-1].name !== mKey) {
                monthGroups.push({ name: mKey, count: 1 });
            } else {
                monthGroups[monthGroups.length-1].count++;
            }
        });

        html += '<div class="tbl-wrap"><div class="tbl-scroll"><table id="attTable"><thead>';
        
        html += '<tr><th class="fx fx-name corner-cell" rowspan="3">EMPLOYEE NAME</th><th class="fx fx-type corner-cell" rowspan="3" style="left:300px !important;">TYPE</th>';
        monthGroups.forEach(function(mg, i) {
            var mCls = (i % 2 === 0) ? 'm-head-even' : 'm-head-odd';
            html += '<th colspan="'+mg.count+'" class="'+mCls+'" style="border-right:2px solid #fff;">'+mg.name+'</th>';
        });
        html += '<th class="sh" rowspan="3" style="border-left:2px solid #334b80;">GRAND<br>TOTAL</th></tr>';

        html += '<tr>';
        dr.days.forEach(function(day){ html += '<th class="dh '+(day.getDay()===5||day.getDay()===6?'we-h':'')+'">'+day.getDate()+'</th>'; });
        html += '</tr>';

        html += '<tr>';
        dr.days.forEach(function(day){ 
            var dow = ['SUN','MON','TUE','WED','THU','FRI','SAT'][day.getDay()];
            html += '<th class="dh '+(day.getDay()===5||day.getDay()===6?'we-h':'')+'"><small>'+dow+'</small></th>'; 
        });
        html += '</tr></thead><tbody id="attBody">';

        data.empList.forEach(function (name, idx) {
            var emp = data.empMap[name], rgc = (idx % 2 === 0) ? 'rg-e' : 'rg-o';
            
            // Row 1: In-Time
            html += '<tr class="'+rgc+'" data-proj="'+name.toUpperCase()+'">';
            html += '<td class="fx fx-name cd-cell '+rgc+'" rowspan="3" style="font-weight:bold; border-right:2px solid #1e3a5f!important; vertical-align:middle;">'+name+'</td>';
            html += '<td class="fx fx-type cd-cell '+rgc+'" style="left:300px !important; font-weight:700; color:#1e3a5f; background:#e0f2fe; text-align:center; font-size:10px;">In-Time</td>';
            dr.days.forEach(function(day){
                var ds = (day.getDate()<10?'0'+day.getDate():day.getDate())+'/'+((day.getMonth()+1)<10?'0'+(day.getMonth()+1):(day.getMonth()+1))+'/'+day.getFullYear();
                var dayObj = emp.days[ds] || { inTime: '', outTime: '', totalHrs: 0 };
                var mEnd = (day.getDate() === new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate()) ? 'border-right:3px solid #cbd5e1;' : '';
                html += '<td class="dc '+(dayObj.inTime ? 'wh-v-txt' : '')+'" style="'+mEnd+' font-size:9px; text-align:center;">'+(dayObj.inTime ? dayObj.inTime : '-')+'</td>';
            });
            html += '<td class="sc wh-v-txt" rowspan="3" style="vertical-align:middle; text-align:center;">'+emp.grandTotal.toFixed(1)+'h</td>';
            html += '</tr>';

            // Row 2: Out-Time
            html += '<tr class="'+rgc+'" data-proj="'+name.toUpperCase()+'">';
            html += '<td class="fx fx-type cd-cell '+rgc+'" style="left:300px !important; font-weight:700; color:#b91c1c; background:#fee2e2; text-align:center; font-size:10px;">Out-Time</td>';
            dr.days.forEach(function(day){
                var ds = (day.getDate()<10?'0'+day.getDate():day.getDate())+'/'+((day.getMonth()+1)<10?'0'+(day.getMonth()+1):(day.getMonth()+1))+'/'+day.getFullYear();
                var dayObj = emp.days[ds] || { inTime: '', outTime: '', totalHrs: 0 };
                var mEnd = (day.getDate() === new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate()) ? 'border-right:3px solid #cbd5e1;' : '';
                html += '<td class="dc '+(dayObj.outTime ? 'wh-v-txt' : '')+'" style="'+mEnd+' font-size:9px; text-align:center; color:#b91c1c;">'+(dayObj.outTime ? dayObj.outTime : '-')+'</td>';
            });
            html += '</tr>';

            // Row 3: Total Hours
            html += '<tr class="'+rgc+'" data-proj="'+name.toUpperCase()+'">';
            html += '<td class="fx fx-type cd-cell '+rgc+'" style="left:300px !important; font-weight:700; color:#1e40af; background:#eff6ff; text-align:center; font-size:10px; border-bottom:2px solid #cbd5e1;">Total Hrs</td>';
            dr.days.forEach(function(day){
                var ds = (day.getDate()<10?'0'+day.getDate():day.getDate())+'/'+((day.getMonth()+1)<10?'0'+(day.getMonth()+1):(day.getMonth()+1))+'/'+day.getFullYear();
                var dayObj = emp.days[ds] || { inTime: '', outTime: '', totalHrs: 0 };
                var mEnd = (day.getDate() === new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate()) ? 'border-right:3px solid #cbd5e1;' : '';
                html += '<td class="dc '+(dayObj.totalHrs > 0 ? 'wh-v-txt' : '')+'" style="'+mEnd+' font-size:9px; text-align:center; font-weight:800; border-bottom:2px solid #cbd5e1;">'+(dayObj.totalHrs > 0 ? dayObj.totalHrs.toFixed(1) + 'h' : '-')+'</td>';
            });
            html += '</tr>';
        });

        html += '</tbody></table></div></div><script>' +
                'function triggerExcelExport(sd, ed, pid){' +
                '  var scriptId = "' + runtime.getCurrentScript().id + '";' +
                '  var deployId = "' + runtime.getCurrentScript().deploymentId + '";' +
                '  var url = "/app/site/hosting/scriptlet.nl?script=" + scriptId + "&deploy=" + deployId + ' +
                '  "&custpage_start=" + sd + "&custpage_end=" + ed + "&custpage_project=" + pid + "&custpage_export=T";' +
                '  window.open(url, "_blank");' +
                '}' +
                'function filterTable(){' +
                '  var f = document.getElementById("attSearch").value.toUpperCase();' +
                '  var trs = document.getElementById("attBody").getElementsByTagName("tr");' +
                '  for(var i=0; i<trs.length; i++){' +
                '    var txt = trs[i].getAttribute("data-proj");' +
                '    if(txt) { trs[i].style.display = (txt.indexOf(f) > -1) ? "" : "none"; }' +
                '  }' +
                '}</script>';
        return html;
    }

    function buildExcelHtml(data, dr) {
        var hSty = 'background-color:#1e3a5f; color:#ffffff; font-weight:bold; border:1px solid #ffffff; text-align:center; padding:10px;';
        var bSty = 'border:1px solid #cbd5e1; text-align:center; padding:5px; font-size:9px;';
        
        var html = '<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>';
        html += '<th style="'+hSty+'" rowspan="2">EMPLOYEE NAME</th><th style="'+hSty+'" rowspan="2">TYPE</th>';
        dr.days.forEach(function (day) { html += '<th style="' + hSty + '">' + day.getDate() + '</th>'; });
        html += '<th style="'+hSty+'" rowspan="2">GRAND TOTAL</th></tr><tr>';
        dr.days.forEach(function (day) { html += '<th style="' + hSty + '">' + ['SUN','MON','TUE','WED','THU','FRI','SAT'][day.getDay()] + '</th>'; });
        html += '</tr></thead><tbody>';

        data.empList.forEach(function (name) {
            var emp = data.empMap[name];
            
            // In-Time Row
            html += '<tr><td style="'+bSty+' text-align:left; font-weight:bold;" rowspan="3">'+name+'</td>';
            html += '<td style="'+bSty+' font-weight:bold; background-color:#e0f2fe;">In-Time</td>';
            dr.days.forEach(function(day) { 
                var ds=(day.getDate()<10?'0'+day.getDate():day.getDate())+'/'+((day.getMonth()+1)<10?'0'+(day.getMonth()+1):(day.getMonth()+1))+'/'+day.getFullYear(); 
                var dayObj = emp.days[ds] || { inTime: '', outTime: '', totalHrs: 0 };
                html += '<td style="'+bSty+'">'+(dayObj.inTime || '-')+'</td>'; 
              }); 
            html += '<td style="'+bSty+' background-color:#eff6ff; font-weight:bold;" rowspan="3">'+emp.grandTotal.toFixed(1)+'h</td></tr>';

            // Out-Time Row
            html += '<tr><td style="'+bSty+' font-weight:bold; background-color:#fee2e2; color:#b91c1c;">Out-Time</td>';
            dr.days.forEach(function(day) { 
                var ds=(day.getDate()<10?'0'+day.getDate():day.getDate())+'/'+((day.getMonth()+1)<10?'0'+(day.getMonth()+1):(day.getMonth()+1))+'/'+day.getFullYear(); 
                var dayObj = emp.days[ds] || { inTime: '', outTime: '', totalHrs: 0 };
                html += '<td style="'+bSty+' color:#b91c1c;">'+(dayObj.outTime || '-')+'</td>'; 
            }); 
            html += '</tr>';

            // Total Hours Row
            html += '<tr><td style="'+bSty+' font-weight:bold; background-color:#eff6ff; color:#1e40af;">Total Hrs</td>';
            dr.days.forEach(function(day) { 
                var ds=(day.getDate()<10?'0'+day.getDate():day.getDate())+'/'+((day.getMonth()+1)<10?'0'+(day.getMonth()+1):(day.getMonth()+1))+'/'+day.getFullYear(); 
                var dayObj = emp.days[ds] || { inTime: '', outTime: '', totalHrs: 0 };
                html += '<td style="'+bSty+' font-weight:bold;">'+(dayObj.totalHrs > 0 ? dayObj.totalHrs.toFixed(1) + 'h' : '-')+'</td>'; 
            }); 
            html += '</tr>';
        });
        return html + '</tbody></table></body></html>';
    }

    function getStyles() {
        return '<style>' +
        '#div__titlebar, .uir-page-title { display:none !important; }' +
        '#custpage_html_val { padding:0 !important; }' +
        '.uir-content-wrapper { padding:0 !important; margin:0 !important; }' +
        'body{margin:0; font-family:"Segoe UI", sans-serif; background:#f4f7f9;}' +
        '.pg-header{background:#1e3a5f; color:#fff; padding:10px 20px; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:2000; border-bottom:3px solid #38bdf8;}' +
        '.pg-header input, .pg-header select{background:#2d4878; color:#fff; border:1px solid #5070b0; padding:5px; border-radius:4px; margin-left:5px; font-size:12px; cursor:pointer;}' +
        '.kpi-bar{display:flex; background:#fff; position:sticky; top:45px; z-index:1900; border-bottom:1px solid #e2e8f0;}' +
        '.kpi-card{flex:1; padding:12px 20px; display:flex; align-items:center; gap:15px; border-right:1px solid #f1f5f9;}' +
        '.c-ico{width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:#ede9fe; color:#5b21b6;}' +
        '.kpi-num{font-size:22px; font-weight:800; color:#1e293b; line-height:1;}' +
        '.toolbar{padding:12px 20px; background:#fff; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; position:sticky; top:112px; z-index:1800; height:55px;}' +
        '.t-left{display:flex; align-items:center; gap:20px;}' +
        '.pill{background:#eff6ff; color:#1e40af; padding:8px 15px; border-radius:6px; font-size:11px; font-weight:700; border:1px solid #bfdbfe; white-space:nowrap;}' +
        '.search-box{position:relative; display:flex; align-items:center; margin-left:5px;}' +
        '.search-box input{padding:7px 10px 7px 35px !important; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; width:220px; outline:none;}' +
        '.search-box span{position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:13px; pointer-events:none; display:block;}' +
        '.btn-exp{background:#fff; color:#1e3a5f; border:1px solid #1e3a5f; padding:8px 15px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600; transition:all 0.2s;}' +
        '.btn-exp:hover{background:#1e3a5f; color:#fff;}' +
        '.tbl-wrap{margin:10px; background:#fff; border:1px solid #e2e8f0; border-radius:5px; overflow:hidden;}' +
        '.tbl-scroll{overflow:auto; max-height:calc(100vh - 250px); scrollbar-width: auto;}' +
        '.tbl-scroll::-webkit-scrollbar { width: 10px; height: 10px; display: block !important; }' +
        '.tbl-scroll::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 5px; }' +
        'table{border-collapse:separate; border-spacing:0; width:auto; table-layout: fixed;}' +
        'thead th{background:#1e3a5f!important; color:#fff!important; font-size:10px; padding:8px 4px; text-align:center; border-right:1px solid #334b80; border-bottom:1px solid #334b80; position:sticky; top:0; z-index:1050; box-sizing:border-box;}' +
        '.m-head-even{background:#2d4878!important; font-weight:800; font-size:11px; letter-spacing:1px;}' +
        '.m-head-odd{background:#385891!important; font-weight:800; font-size:11px; letter-spacing:1px;}' +
        'thead tr:nth-child(2) th{top:31px; background:#253f6e!important; z-index:1049; height:28px;}' +
        'thead tr:nth-child(3) th{top:59px; background:#2c497e!important; z-index:1048; height:24px;}' +
        '.fx{position:sticky !important; left:0; z-index:1000 !important; background-clip: padding-box !important;}' +
        '.fx-name{width:300px; min-width:300px; outline: 1px solid #e2e8f0;}' +
        '.fx-type{width:90px; min-width:90px; outline: 1px solid #e2e8f0;}' +
        '.corner-cell{z-index:1060 !important; background:#1e3a5f !important;}' +
        '.rg-e{background:#ffffff !important;}' +
        '.rg-o{background:#f7f9ff !important;}' +
        '.dc{width:65px; min-width:65px; text-align:center; border-right:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; font-size:9px; background:#fff; padding:4px 1px;}' +
        '.we-h{background:#223663!important;}' +
        '.sh{width:70px; min-width:70px; background:#1e3a5f!important; color:#fff!important; font-size:10px; border-left:1px solid #334b80; position:sticky; right:0; z-index:1050;}' +
        '.sc{width:70px; min-width:70px; text-align:center; font-weight:800; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; vertical-align:middle; font-size:11px; padding:8px 5px; position:sticky; right:0; background:#eff6ff !important; border-left:2px solid #1e3a5f;}' +
        '.wh-v-txt{color:#1e40af; font-weight:700;}' +
        '.welcome-msg{padding:100px; text-align:center; color:#94a3b8; font-size:14px;}' +
        '</style>';
    }

    function buildHeader(projId, start, end) {
        var su = url.resolveScript({ scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId });
        return '<div class="pg-header"><div class="pg-logo" style="font-weight:bold;">■ ELEVEIGHT HRMS <small style="opacity:0.7; font-weight:normal; margin-left:10px;">| Employee Overall Summary</small></div>' +
            '<div><form method="GET" action="'+su+'"><input type="hidden" name="script" value="'+runtime.getCurrentScript().id+'"><input type="hidden" name="deploy" value="'+runtime.getCurrentScript().deploymentId+'">' +
            '<span style="font-size:11px; opacity:0.8;">From:</span><input type="date" name="custpage_start" value="'+(start || '')+'" onchange="this.form.submit()">' +
            '<span style="font-size:11px; opacity:0.8; margin-left:10px;">To:</span><input type="date" name="custpage_end" value="'+(end || '')+'" onchange="this.form.submit()">' +
            '<select name="custpage_project" onchange="this.form.submit()"><option value="">All Projects</option>'+getProjectOpts(projId)+'</select>' +
            '</form></div></div>';
    }

    function getProjectOpts(sel) {
        try {
            var sql = "SELECT DISTINCT custrecord_hris_daily_time_projectoveral as id, BUILTIN.DF(custrecord_hris_daily_time_projectoveral) as name FROM customrecord_hris_daily_timesheet_overal WHERE custrecord_hris_daily_time_projectoveral IS NOT NULL";
            return query.runSuiteQL({ query: sql }).asMappedResults().map(function (r) {
                return '<option value="' + r.id + '"' + (sel == r.id ? ' selected' : '') + '>' + r.name + '</option>';
            }).join('');
        } catch (e) { return ''; }
    }

    function makeKpiCard(lbl, val, ico) {
        return '<div class="kpi-card">' + ico + '<div><div class="kpi-num">' + val + '</div><div style="font-size:11px; color:#64748b; margin-top:4px;">' + lbl + '</div></div></div>';
    }

    return { onRequest: onRequest };
});