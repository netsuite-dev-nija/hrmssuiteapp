/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/redirect', 'N/task', 'N/log', 'N/runtime', 'N/search', 'N/query'],
function(serverWidget, redirect, task, log, runtime, search, query) {
    function onRequest(context) {
        var request = context.request;
        var response = context.response;

        // ==============================================================
        // 1. GET – Build the form
        // ==============================================================
        if (request.method === 'GET') {
            var form = serverWidget.createForm({ title: 'Monthly Accrual Transaction' });

            // ---------- Subsidiary (dynamic, based on role) ----------
            var currentUser = runtime.getCurrentUser();
            var userRoleId = currentUser.role;
       /*      if(userRoleId==3){
  var roleSearch = search.create({
                type: 'role',
               
                columns: [search.createColumn({name:'subsidiaries'})]
            });
            }
            else{
                  var roleSearch = search.create({
                type: 'role',
                filters: [['internalid','anyof',userRoleId]],
                columns: [search.createColumn({name:'subsidiaries'})]
            });
            }
          
            var accessibleSubs = [];
            roleSearch.run().each(function(res){
                var id = res.getValue('subsidiaries');
                var text = res.getText('subsidiaries');
                if (id && !accessibleSubs.some(function(s){return s.id === id;})) {
                    accessibleSubs.push({id:id, name:text});
                }
                return true;
            }); */

            var subsidiaryFld = form.addField({
                id: 'custpage_subsidiary',
                type: serverWidget.FieldType.SELECT,
                label: 'Subsidiary',
               source: 'subsidiary'
            });
            subsidiaryFld.isMandatory = true;
          /*   subsidiaryFld.addSelectOption({value:'', text:'--Select Subsidiary--'});
            accessibleSubs.forEach(function(sub){
                subsidiaryFld.addSelectOption({value:sub.id, text:sub.name});
            }); */

            // ---------- Pay Group ----------
            var paygrpFld = form.addField({
                id: 'custpage_paygroup',
                type: serverWidget.FieldType.SELECT,
                label: 'Pay Group',
                source:'customrecord_hris_process_groupmaster'
            });
            paygrpFld.isMandatory = true;

           /*  paygrpFld.addSelectOption({value:'', text:'--Select Pay Group--'});
            if (accessibleSubs.length) {
                var placeholders = accessibleSubs.map(function(){return '?';}).join(',');
                var sql = 'SELECT id, name FROM customrecord_hris_process_groupmaster '
                        + 'WHERE custrecord_hris__subsidiary IN ('+placeholders+') AND isinactive = \'F\'';
                var subIds = accessibleSubs.map(function(s){return s.id;});
                var paygrpResult = query.runSuiteQL({query:sql, params:subIds}).asMappedResults();
                paygrpResult.forEach(function(row){
                    paygrpFld.addSelectOption({value:row.id, text:row.name});
                });
            } */

            // ---------- Accrual Type (Multi-Select with source - Simple) ----------
            var accrualTypeFld = form.addField({
                id: 'custpage_accrualtype',
                type: serverWidget.FieldType.MULTISELECT,
                label: 'Accrual Type (Leave blank to process ALL)',
                source: 'customrecord_hris_accuraltype_master'
            });

            // ---------- Other fields ----------
          /*   form.addField({id:'custpage_paydate', type:serverWidget.FieldType.DATE, label:'Pay Date'}).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            form.addField({id:'custpage_paymonth',type:serverWidget.FieldType.SELECT, label:'Month', source:'customlist_hris_month_list'}).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            form.addField({id:'custpage_payyear', type:serverWidget.FieldType.SELECT, label:'Year', source:'customlist_hris_year_master'}).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
 */

            /*   form.addField({id:'custpage_paydate', type:serverWidget.FieldType.DATE, label:'Pay Date'}).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.NORMAL
            });
            form.addField({id:'custpage_paymonth',type:serverWidget.FieldType.SELECT, label:'Month', source:'customlist_hris_month_list'}).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.NORMAL
            });
            form.addField({id:'custpage_payyear', type:serverWidget.FieldType.SELECT, label:'Year', source:'customlist_hris_year_master'}).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.NORMAL
            }); */

          var payDateField = form.addField({
    id: 'custpage_paydate',
    type: serverWidget.FieldType.DATE,
    label: 'Pay Date'
});
payDateField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.NORMAL });
payDateField.isMandatory = true;

var payMonthField = form.addField({
    id: 'custpage_paymonth',
    type: serverWidget.FieldType.SELECT,
    label: 'Month',
    source: 'customlist_hris_month_list'
});
payMonthField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.NORMAL });
payMonthField.isMandatory = true;

var payYearField = form.addField({
    id: 'custpage_payyear',
    type: serverWidget.FieldType.SELECT,
    label: 'Year',
    source: 'customlist_hris_year_master'
});
payYearField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.NORMAL });
payYearField.isMandatory = true;
          
            form.addField({id:'custpage_employee',type:serverWidget.FieldType.MULTISELECT, label:'Employee', source:'employee'});

          

            form.addSubmitButton({label:'Start Process'});
            form.clientScriptModulePath = './accural transation cs 2.1.js';
            response.writePage(form);
        }

        // ==============================================================
        // 2. POST – Submit Map/Reduce with parameters including selected Accrual Types
        // ==============================================================
        else if (request.method === 'POST') {
            var subsidiary = request.parameters.custpage_subsidiary || '';
            var paygroup = request.parameters.custpage_paygroup || '';
            var payDate = request.parameters.custpage_paydate || '';
            var payMonth = request.parameters.custpage_paymonth || '';
            var payYear = request.parameters.custpage_payyear || '';
            var employee = request.parameters.custpage_employee || '';
            var accrualTypesCsv = request.parameters.custpage_accrualtype || ''; // e.g. "1\u00053\u00057"

            // Convert multiselect value (delimiter \u0005) to array of internal IDs
            var selectedAccrualTypeIds = [];
            if (accrualTypesCsv) {
                selectedAccrualTypeIds = accrualTypesCsv.split('\u0005').filter(Boolean);
            }

            var processParams = {
                subsidiary: subsidiary,
                paygroup: paygroup,
                payDate: payDate,
                payMonth: payMonth,
                payYear: payYear,
                employee: employee,
                accrualTypeIds: selectedAccrualTypeIds  // [] means ALL, otherwise only selected
            };

            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: 'customscript_hris_month_accur_mrversion',
                deploymentId: 'customdeploy_hris_month_accur_mrversion',
                params: {
                    custscript_hris_paydate_version: JSON.stringify(processParams)
                }
            });

            var taskId = mrTask.submit();
            log.debug('Map/Reduce Task Submitted', taskId);

                 redirect.toSuitelet({
                    scriptId: "customscript_hris_accrual_status_version",
                    deploymentId: "customdeploy_hris_accrual_status_version",
                     parameters: {
                        custscript_chqall_tskid_version:taskId,
                       
                    }  
                });

           /*  redirect.toSuitelet({
                scriptId: 'customscript_hris_monthly_accural_sl',
                deploymentId: 'customdeploy_hris_monthly_accural_sl'
            }); */
        }
    }
    return { onRequest: onRequest };
});