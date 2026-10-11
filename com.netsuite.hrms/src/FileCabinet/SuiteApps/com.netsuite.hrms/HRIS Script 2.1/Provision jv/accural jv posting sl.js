/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/task', 'N/log', 'N/runtime', 'N/search'],
    function(serverWidget, task, log, runtime, search) {

        function onRequest(context) {
            var request = context.request;
            var response = context.response;

            if (request.method === 'GET') {
                try {
                    // Create the Form
                    var form = serverWidget.createForm({
                        title: 'Accrual JV Processing'
                    });

                    // Link the Client Script for dynamic dropdown filtering
                    form.clientScriptModulePath = './accural jv manual cs.js';

                    // --- 1. Role Based Subsidiary Logic ---
                    var currentUser = runtime.getCurrentUser();
                    var userRoleId = currentUser.role;

                    // Search for subsidiaries accessible by the current role
                    var roleSearchObj = search.create({
                        type: "role",
                        filters: [
                            ["internalid", "anyof", userRoleId]
                        ],
                        columns: [search.createColumn({
                            name: "subsidiaries",
                            label: "Accessible Subsidiaries"
                        })]
                    });

                    var searchResult = roleSearchObj.run().getRange({
                        start: 0,
                        end: 1000
                    });
                    var accessibleSubsidiaries = [];

                    for (var i = 0; i < searchResult.length; i++) {
                        var subsidiaryId = searchResult[i].getValue({
                            name: "subsidiaries"
                        });
                        var subsidiaryText = searchResult[i].getText({
                            name: "subsidiaries"
                        });

                        if (subsidiaryId) {
                            var exists = accessibleSubsidiaries.some(function(el) {
                                return el.id === subsidiaryId;
                            });
                            if (!exists) {
                                accessibleSubsidiaries.push({
                                    id: subsidiaryId,
                                    name: subsidiaryText
                                });
                            }
                        }
                    }

                    // Fallback for Admin/Full Access if no specific subs defined on role
                    if (accessibleSubsidiaries.length === 0 && (userRoleId == 3 || userRoleId == 18)) {
                        var allSubSearch = search.create({
                            type: "subsidiary",
                            filters: [
                                ["isinactive", "is", "F"]
                            ],
                            columns: ["internalid", "name"]
                        });
                        allSubSearch.run().each(function(result) {
                            accessibleSubsidiaries.push({
                                id: result.id,
                                name: result.getValue('name')
                            });
                            return true;
                        });
                    }

                    // --- 2. Fetch Pay Groups for Accessible Subsidiaries ---
                    var subIds = accessibleSubsidiaries.map(function(s) {
                        return s.id;
                    });
                    var payGroupList = [];

                    if (subIds.length > 0) {
                        var payGroupSearch = search.create({
                            type: 'customrecord_hris_process_groupmaster',
                            filters: [
                                ['isinactive', 'is', 'F'],
                                'AND',
                                ['custrecord_hris__subsidiary', 'anyof', subIds]
                            ],
                            columns: ['internalid', 'name', 'custrecord_hris__subsidiary']
                        });

                        payGroupSearch.run().each(function(result) {
                            payGroupList.push({
                                id: result.id,
                                name: result.getValue('name'),
                                subsidiary: result.getValue('custrecord_hris__subsidiary')
                            });
                            return true;
                        });
                    }

                    // Add Hidden Field to store Pay Group Data JSON
                    var hiddenPayGroupFld = form.addField({
                        id: 'custpage_paygroup_json',
                        type: serverWidget.FieldType.LONGTEXT,
                        label: 'JSON Data'
                    });
                    hiddenPayGroupFld.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    hiddenPayGroupFld.defaultValue = JSON.stringify(payGroupList);


                    // --- 3. Add Fields to Form ---

                    // Subsidiary Field
                    var subsidiaryFld = form.addField({
                        id: 'custpage_subsidiary',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Subsidiary'
                    });
                    subsidiaryFld.isMandatory = true;
                    subsidiaryFld.addSelectOption({
                        value: '',
                        text: '--Select Subsidiary--'
                    });

                    for (var k = 0; k < accessibleSubsidiaries.length; k++) {
                        subsidiaryFld.addSelectOption({
                            value: accessibleSubsidiaries[k].id,
                            text: accessibleSubsidiaries[k].name
                        });
                    }

                    // Pay Group Field (Populated dynamically by Client Script)
                    var paygrpName = form.addField({
                        id: 'custpage_paygroup',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Pay Group'
                    });
                    paygrpName.isMandatory = true;
                    paygrpName.addSelectOption({
                        value: '',
                        text: ''
                    });

                    // If User has only 1 subsidiary, pre-select it and populate paygroups
                    if (accessibleSubsidiaries.length === 1) {
                        subsidiaryFld.defaultValue = accessibleSubsidiaries[0].id;
                        for (var p = 0; p < payGroupList.length; p++) {
                            if (payGroupList[p].subsidiary == accessibleSubsidiaries[0].id) {
                                paygrpName.addSelectOption({
                                    value: payGroupList[p].id,
                                    text: payGroupList[p].name
                                });
                            }
                        }
                    }

                    // Pay Month Field (Updated to fetch from Custom List)
                    var monthFld = form.addField({
                        id: 'custpage_paymonth',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Pay Month'
                    });
                    monthFld.isMandatory = true;
                    monthFld.addSelectOption({
                        value: '',
                        text: ''
                    });

                    // Search customlist_hris_month_list
                    var monthSearch = search.create({
                        type: 'customlist_hris_month_list',
                        filters: [
                            ['isinactive', 'is', 'F']
                        ],
                        columns: [
                            search.createColumn({
                                name: 'internalid',
                                sort: search.Sort.ASC
                            }),
                            search.createColumn({
                                name: 'name'
                            })
                        ]
                    });

                    monthSearch.run().each(function(result) {
                        monthFld.addSelectOption({
                            value: result.id,
                            text: result.getValue('name')
                        });
                        return true;
                    });


                    // Pay Year Field
                    var yearFld = form.addField({
                        id: 'custpage_year',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Year',
                        source: 'customlist_hris_year_master'
                    });
                    yearFld.isMandatory = true;

                    form.addSubmitButton({
                        label: 'Process Accruals'
                    });

                    context.response.writePage(form);

                } catch (e) {
                    log.error('Suitelet GET Error', e.message);
                    response.write('<b>Error loading form: ' + e.message + '</b>');
                }

            } else if (request.method === 'POST') {
                try {
                    // 1. Retrieve parameters from the Form Post
                    var subParam = request.parameters['custpage_subsidiary'];
                    var paygroupParam = request.parameters['custpage_paygroup'];
                    var monthParam = request.parameters['custpage_paymonth'];
                    var yearParam = request.parameters['custpage_year'];

                    log.debug('Suitelet Post', 'Inputs: Sub=' + subParam + ', PG=' + paygroupParam + ', M=' + monthParam + ', Y=' + yearParam);

                    // 2. Bundle parameters into ONE JSON Object
                    var mrPayload = {
                        subsidiary: subParam,
                        paygroup: paygroupParam,
                        month: monthParam,
                        year: yearParam
                    };

                    // 3. Trigger Map/Reduce with ONE parameter
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_hris_accural_jv_post_man_mr', // Update with your MR Script ID
                        deploymentId: 'customdeploy_hris_accural_jv_post_man_mr', // Update with your MR Deployment ID
                        params: {
                            'custscript_hris_manual_post_acc': JSON.stringify(mrPayload) // Passing as single JSON string
                        }
                    });

                    var taskId = mrTask.submit();
                    log.audit('Task Submitted', 'Map/Reduce Task ID: ' + taskId + ' | Payload: ' + JSON.stringify(mrPayload));

                    // 4. Show Success Message
                    var form = serverWidget.createForm({
                        title: 'Accrual JV Processing Initiated'
                    });
                    var inlineField = form.addField({
                        id: 'custpage_message',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Status'
                    });

                    var html = '<div style="font-size:14px; padding:20px; border:1px solid #ccc; background-color: #e6fffa; color: #006600;">';
                    html += '<b>Success!</b><br/><br/>';
                    html += 'The Accrual Journal Entry process has been initiated.<br/>';
                    html += '<b>Task ID:</b> ' + taskId + '<br/>';
                    html += 'Please check the script execution logs for the result.';
                    html += '</div>';

                    inlineField.defaultValue = html;
                    context.response.writePage(form);

                } catch (e) {
                    log.error('Suitelet POST Error', e.message);
                    response.write('<b>Error submitting process: ' + e.message + '</b>');
                }
            }
        }

        return {
            onRequest: onRequest
        };
    });