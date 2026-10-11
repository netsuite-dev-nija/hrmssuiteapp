/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/task', 'N/ui/serverWidget', 'N/runtime'],
    function(task, serverWidget, runtime) {
        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {
            var parameters = context.request.parameters;
            var form = serverWidget.createForm({
                title: 'Monthly Accural Updation Status'
            });
            var inlineField = form.addField({
                id: 'custpage_intline_text',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Text'
            });

            var taskId = parameters.custscript_chqall_tskid_version;
            log.debug("taskId", taskId);
             var mrstask = form.addField({
                id: 'custpage_mrstask',
                type: serverWidget.FieldType.LONGTEXT,
                label: 'MR Taskid'
            });

            mrstask.defaultValue=taskId;
            mrstask.updateDisplayType({
                         displayType: serverWidget.FieldDisplayType.HIDDEN
                     });
             var mrstatus = form.addField({
                id: 'custpage_mrstatus',
                type: serverWidget.FieldType.LONGTEXT,
                label: 'MR Taskstatus'
            });
            mrstatus.updateDisplayType({
                         displayType: serverWidget.FieldDisplayType.HIDDEN
                     });
             form.clientScriptModulePath = './hris_monthlyaccural_status_cs_2.1.js';
            
                    form.addButton({
                        id: 'custpage_submitbutton',
                        label: 'Refresh',
                        functionName: 'saveRecord()'
                    });

            var objTaskStatus = task.checkStatus({
                taskId: taskId
            });
            var tskstatus = objTaskStatus.status;
            var progressPercentage = 0;
            if (tskstatus === task.TaskStatus.QUEUED) {
                progressPercentage = 0;
                tskstatus = "Queued";
            } else if (tskstatus === task.TaskStatus.PENDING) {
                progressPercentage = 50;
                tskstatus = "Processing";
            } else if (tskstatus === task.TaskStatus.PROCESSING) {
                progressPercentage = 75;
                tskstatus = "In Progress";
            } else if (tskstatus === task.TaskStatus.COMPLETE) {
                progressPercentage = 100;
                tskstatus = "Completed";
            }
            mrstatus.defaultValue=tskstatus;
            var accountId = runtime.accountId;

            // HTML template for status page with progress bar
            var template = '<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
            template += '<html>';
            template += '<head>';
            template += '<meta http-equiv="Refresh" content="60">';
            template += '<style>';
            template += '.progress { width: 100%; background-color: #f3f3f3; border-radius: 5px; overflow: hidden; }';
            template += '.progress-bar { height: 20px; background-color: #4caf50; width: ' + progressPercentage + '%; transition: width 0.5s; }';
            template += 'button { margin: 10px; padding: 8px 16px; cursor: pointer; }';
            template += '</style>';
            template += '</head>';
            template += '<body>';
            template += '<strong>Monthly Accural Updation Status: <span style="color:blue">' + tskstatus + '</span></strong><br/><br/>';
            template += '<div class="progress"><div class="progress-bar" style="width: ' + progressPercentage + '%"></div></div><br/>';
           // template += '<button type="button" onclick="window.location.reload()">Refresh</button> ';
           /*  if (objTaskStatus.status === task.TaskStatus.COMPLETE) {
                template += '<button type="button" onclick="goBack(); return false;">Back</button>';
            }
            template += '<script>';
            template += 'function goBack() {';
            if (accountId === "11929899") {
                template += ' window.location.href="https://11929899.app.netsuite.com/app/site/hosting/scriptlet.nl?script=574&deploy=1";';
            } else {
                template += ' window.location.href="https://11929899.app.netsuite.com/app/site/hosting/scriptlet.nl?script=574&deploy=1";';
            }
            template += '}';
            template += '</script>'; */
            template += '</body>';
            template += '</html>';

            inlineField.defaultValue = template;
            context.response.writePage(form);
        }

        return {
            onRequest: onRequest
        };
    });