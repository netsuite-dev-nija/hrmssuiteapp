/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * 
 * Description: Premium Bulk Mobile Management with Real-Time Status Bar.
 */
define(['N/ui/serverWidget', 'N/search', 'N/https', 'N/record', 'N/log', 'N/runtime', 'N/task', 'N/url'], 
    (serverWidget, search, https, record, log, runtime, task, url) => {

    const onRequest = (context) => {
        // If the request has a 'checkTaskId', return the raw status as JSON (for AJAX)
        if (context.request.parameters.checkTaskId) {
            const taskStatus = task.checkStatus({ taskId: context.request.parameters.checkTaskId });
            context.response.write(JSON.stringify({
                status: taskStatus.status, // PENDING, PROCESSING, COMPLETE
                percent: taskStatus.getPercentageCompleted()
            }));
            return;
        }

        if (context.request.method === 'GET') {
            handleDataTable(context);
        } else {
            handleProcessing(context);
        }
    };

    const handleDataTable = (context) => {
        const subId = context.request.parameters.subid || "";
        const status = context.request.parameters.status || "F"; 
        
        let subsidiaryName = "Not Selected";
        if (subId) {
            const subLookup = search.lookupFields({ type: 'subsidiary', id: subId, columns: ['name'] });
            subsidiaryName = subLookup.name;
        }

        const form = serverWidget.createForm({ title: ' ' });
        form.addField({ id: 'custpage_selected_json', type: serverWidget.FieldType.LONGTEXT, label: 'JSON' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
        form.addField({ id: 'custpage_op_status', type: serverWidget.FieldType.TEXT, label: 'Status' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN }).defaultValue = status;
        form.addField({ id: 'custpage_send_email_flag', type: serverWidget.FieldType.TEXT, label: 'MailFlag' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

        let styleHtml = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { background-color: #f8fafc !important; font-family: 'Inter', sans-serif !important; margin: 0; padding: 0; }
            .app-container { padding: 25px; }
            .app-title { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
            .app-title::before { content: ""; width: 4px; height: 20px; background: #103b6d; border-radius: 2px; }
            .control-panel { background: #ffffff; padding: 20px 30px; border-radius: 12px; display: flex; align-items: center; gap: 50px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; margin-bottom: 25px; }
            .info-group { display: flex; flex-direction: column; gap: 4px; }
            .info-group .label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; }
            .info-group .value { font-size: 14px; font-weight: 600; color: #103b6d; }
            .notif-box { display: flex; align-items: center; gap: 10px; padding: 6px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; height: 36px; box-sizing: border-box; }
            .notif-box input { width: 15px; height: 15px; cursor: pointer; accent-color: #103b6d; margin: 0; }
            .notif-box span { font-size: 12px; font-weight: 500; color: #475569; }
            .btn-action { margin-left: auto; background-color: #103b6d !important; color: #ffffff !important; padding: 12px 30px; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; height: 40px; box-shadow: 0 4px 6px rgba(16, 59, 109, 0.2); }
            .table-panel { background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
            .dataTables_wrapper .dataTables_filter { float: none !important; text-align: right !important; padding: 15px 25px !important; background: #ffffff !important; border-bottom: 1px solid #f1f5f9; margin: 0 !important; }
            #mobileTable thead th { background-color: #103b6d !important; color: #ffffff !important; padding: 16px 15px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border: none !important; }
            #mobileTable tbody td { padding: 14px 15px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
        </style>
        <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
        `;

        const statusText = status === 'T' ? 'Access: Enabled' : 'Access: Disabled';

        let contentHtml = `
        <div class="app-container">
            <div class="app-title">Mobile Access Management</div>
            <div class="control-panel">
                <div class="info-group"><div class="label">Subsidiary</div><div class="value">${subsidiaryName}</div></div>
                <div class="info-group"><div class="label">Viewing Employees</div><div class="value">${statusText}</div></div>
                <div class="info-group"><div class="label">Notifications</div><div class="notif-box" onclick="document.getElementById('mail_check').click()"><input type="checkbox" id="mail_check" checked onclick="event.stopPropagation()"><span>Notify Employee</span></div></div>
                <button type="button" class="btn-action" onclick="submitForm()">${status === 'F' ? 'ENABLE SELECTED' : 'DISABLE SELECTED'}</button>
            </div>
            <div class="table-panel">
                <table id="mobileTable" class="display">
                    <thead><tr><th style="width: 35px; text-align:center;"><input type="checkbox" id="check_all"></th><th style="width: 100px;">Employee ID</th><th>Full Name</th><th>Username / Email</th><th>Credential Email</th></tr></thead>
                    <tbody>`;

        if (subId) {
            const empSearch = search.create({
                type: search.Type.EMPLOYEE,
                filters: [['subsidiary', 'anyof', subId], 'AND', ['isinactive', 'is', 'F'], 'AND', ['custentity_hris_emp_accesstomobile', 'is', status]],
                columns: [search.createColumn({ name: 'firstname', sort: search.Sort.ASC }), 'lastname', 'email']
            });
            empSearch.run().each(res => {
                const mail = res.getValue('email') || "";
                contentHtml += `<tr><td style="text-align:center;"><input type="checkbox" class="row-check" data-id="${res.id}" data-email="${mail}" data-name="${res.getValue('firstname')}"></td><td><b>${res.id}</b></td><td>${res.getValue('firstname')} ${res.getValue('lastname')}</td><td>${mail}</td><td>${mail}</td></tr>`;
                return true;
            });
        }
        contentHtml += `</tbody></table></div></div>`;

        let scriptHtml = `<script>
            $(document).ready(function() {
                var table = $('#mobileTable').DataTable({ paging: false, searching: true, scrollY: "55vh", scrollCollapse: true, dom: 'f<"clear">rt<"bottom"i>', language: { search: "Quick Filter Table:" } });
                $('#check_all').on('click', function() { var rows = table.rows({ 'search': 'applied' }).nodes(); $('input[type="checkbox"]', rows).prop('checked', this.checked); });
            });
            function submitForm() {
                var selected = [];
                $('.row-check:checked').each(function() { selected.push({ id: $(this).data('id'), user: $(this).data('email'), email: $(this).data('email'), name: $(this).data('name') }); });
                if (selected.length === 0) { alert('Please select at least one employee.'); return; }
                var sendMail = $('#mail_check').is(':checked') ? 'T' : 'F';
                document.getElementsByName('custpage_selected_json')[0].value = JSON.stringify(selected);
                document.getElementsByName('custpage_send_email_flag')[0].value = sendMail;
                if(confirm("Apply updates in background?")) { document.getElementById('main_form').submit(); }
            }
        </script>`;

        form.addField({ id: 'custpage_ui', type: serverWidget.FieldType.INLINEHTML, label: ' ' }).defaultValue = styleHtml + contentHtml + scriptHtml;
        context.response.writePage(form);
    };

    const handleProcessing = (context) => {
        const req = context.request;
        const rawJson = req.parameters.custpage_selected_json;
        const currentViewStatus = req.parameters.custpage_op_status; 
        const sendEmailFlag = req.parameters.custpage_send_email_flag;

        let token = "";
        try {
            const authResponse = https.post({
                url: "https://mobapp.nijatech.com:5612/api/netsuite/gettoken",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ "email": "elevate@gmail.com", "password": "elevate@123" })
            });
            token = JSON.parse(authResponse.body).token || JSON.parse(authResponse.body).jwtoken;
        } catch (e) { log.error('Auth Error', e.message); }

        const packedPayload = { data: JSON.parse(rawJson), targetAccess: currentViewStatus === 'F' ? 'T' : 'F', sendMail: sendEmailFlag, author: runtime.getCurrentUser().id, token: token };

        const mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: 'customscript_hris_all_employee_access_to', 
            //deploymentId: 'customdeploy_njt_bulk_mobile_process_mr',
            params: { 'custscript_mr_mobile_payload': JSON.stringify(packedPayload) }
        });
        const taskId = mrTask.submit();

        // RENDER THE STATUS BAR PAGE
        const suiteletUrl = url.resolveScript({ scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId });

        let progressHtml = `
        <div style="font-family: 'Inter', sans-serif; text-align: center; padding: 100px; background: #f8fafc; height: 100vh;">
            <div style="max-width: 550px; margin: auto; background: #fff; padding: 50px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border-top: 6px solid #103b6d;">
                <h2 style="color: #103b6d; margin-bottom: 10px;">Processing Updates</h2>
                <p style="color: #64748b; margin-bottom: 30px;">Updating <b>${packedPayload.data.length}</b> records. Please do not close this window.</p>
                
                <div style="width: 100%; background: #e2e8f0; border-radius: 10px; height: 20px; overflow: hidden; margin-bottom: 10px;">
                    <div id="progress-bar" style="width: 0%; height: 100%; background: #103b6d; transition: width 0.5s;"></div>
                </div>
                <div style="display:flex; justify-content: space-between; font-size: 12px; color: #94a3b8;">
                    <span id="status-text">Task Queued...</span>
                    <span id="percent-text">0%</span>
                </div>
            </div>
        </div>
        <script>
            function checkStatus() {
                fetch('${suiteletUrl}&checkTaskId=${taskId}')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('percent-text').innerText = data.percent + '%';
                    document.getElementById('progress-bar').style.width = data.percent + '%';
                    document.getElementById('status-text').innerText = 'Status: ' + data.status;

                    if (data.status === 'COMPLETE') {
                        document.getElementById('status-text').innerText = 'Completed! Redirecting...';
                        setTimeout(() => { window.history.go(-1); }, 2000);
                    } else if (data.status === 'FAILED') {
                        alert('Task Failed. Please check script logs.');
                    } else {
                        setTimeout(checkStatus, 3000); // Check every 3 seconds
                    }
                });
            }
            checkStatus();
        </script>`;

        context.response.write(progressHtml);
    };

    return { onRequest };
});