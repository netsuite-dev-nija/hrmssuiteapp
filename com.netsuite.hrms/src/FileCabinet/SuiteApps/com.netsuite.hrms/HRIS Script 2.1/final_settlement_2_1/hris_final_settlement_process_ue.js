/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 * @Description Converted to SuiteScript 2.1 (functionality unchanged)
 */
define(['N/record', 'N/log', 'N/search', 'N/query', 'N/format'], 
    function (record, log, search, query, format) {

        function beforeLoad(scriptContext) {
            var form = scriptContext.form;
            var newRecord = scriptContext.newRecord;
            var approvalStatus = newRecord.getValue('custrecord_hris_fin_approva');
            var jeno = newRecord.getValue('custrecord_hris_fin_jo_no') || '';

            if ((scriptContext.type === 'create' || scriptContext.type === 'edit') && approvalStatus == 1) {
                form.addButton({
                    id: 'custpage_invoice',
                    label: 'Load Details',
                    functionName: 'leavesalary()'
                });
            }

            if (scriptContext.type === 'view') {
                form.addButton({
                    id: 'custpage_jvpreview',
                    label: 'JV Preview',
                    functionName: 'createJVPreview()'
                });
            }

            if (scriptContext.type === 'view' && approvalStatus == 2 && !jeno) {
                form.addButton({
                    id: 'custpage_jvcreation',
                    label: 'Post JV',
                    functionName: 'createjvcreation()'
                });
            }

            form.clientScriptModulePath = './Leave Final settlement validation cs.js';
        }

        function afterSubmit(scriptContext) {
            if (scriptContext.type !== scriptContext.UserEventType.CREATE && 
                scriptContext.type !== scriptContext.UserEventType.EDIT) {
                return;
            }

            var newRecord = scriptContext.newRecord;
            var oldRecord = scriptContext.oldRecord;

            var approvalStatusNew = newRecord.getValue('custrecord_hris_fin_approva');
            var confirmsettlement = newRecord.getValue('custrecord_hris_fin_confirm_settlement');
            var approvalStatusOld = oldRecord ? oldRecord.getValue('custrecord_hris_fin_approva') : null;

            // ====================== AUTO NUMBERING (on Create) ======================
            if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                var s_auto_prfix = "FS";
                var i_rec_type_id = newRecord.getValue({ fieldId: "rectype" });

                var customrecord_hris_unique_reference_numbeSearchObj = search.create({
                    type: "customrecord_hris_unique_reference_numbe",
                    filters: [
                        ["custrecord_hris_record_type", "anyof", i_rec_type_id],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                    columns: [
                        search.createColumn({ name: "custrecord_hris_unique_number", label: "Unique Number" }),
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
                });

                var searchResultCount = customrecord_hris_unique_reference_numbeSearchObj.runPaged().count;

                if (searchResultCount > 0) {
                    customrecord_hris_unique_reference_numbeSearchObj.run().each(function (result) {
                        var i_id_unique_ref = result.getValue({ name: "internalid" });
                        var i_unique_num = parseInt(result.getValue({ name: "custrecord_hris_unique_number" })) + 1;

                        var zeros = i_unique_num.toString().length === 1 ? "00" : 
                                    i_unique_num.toString().length === 2 ? "0" : "";

                        var d_current_date = new Date();
                        var i_fullYear = d_current_date.getFullYear();

                        var s_auto_number = s_auto_prfix + "-NO-" + zeros + i_unique_num + "-" + i_fullYear;

                        record.submitFields({
                            type: newRecord.type,
                            id: newRecord.id,
                            values: { name: s_auto_number }
                        });

                        record.submitFields({
                            type: "customrecord_hris_unique_reference_numbe",
                            id: i_id_unique_ref,
                            values: { custrecord_hris_unique_number: i_unique_num }
                        });

                        return true;
                    });
                }
            }

            // ====================== APPROVAL CHANGE DETECTION ======================
            var isApprovedNow = (approvalStatusNew == 2);
            var wasApprovedBefore = false;

            if (scriptContext.type === scriptContext.UserEventType.EDIT && oldRecord) {
                wasApprovedBefore = (approvalStatusOld == 2);
            }

            if (isApprovedNow && (!wasApprovedBefore || scriptContext.type === scriptContext.UserEventType.CREATE)) {
                log.debug('Approval Triggered', 'Status changed to Approved for record ID: ' + newRecord.id);

                var finalsettleid = newRecord.id;
                var empid = newRecord.getValue('custrecordhris_fin_emplo_name');
                var workingyear = newRecord.getValue('custrecord_hris_fin_no_of_years_of_serv') || '';
                var empcategory = newRecord.getValue('custrecord_hirs_fin_employee_cat');
                var leavesalaryamt = newRecord.getValue('custrecord_hris_fin_leave_salary_amt') || 0;
                var gratuityamount = newRecord.getValue('custrecord_hris_fin_gratuity_amount') || 0;
                var paydate = newRecord.getValue('custrecord_hris_fin_pay_date');
                var paygroup = newRecord.getValue('custrecord_hris_fin_payprocessgrp');
                var paymonth = newRecord.getValue('custrecord_hris_fin_paymonth');
                var payyear = newRecord.getValue('custrecord_hris_fin_year');
                var grosspay = newRecord.getValue('custrecord_hris_fin_grosspay');
                var basicpay = newRecord.getValue('custrecord_hris_fin_basicpay');

                // Monthly Leave Salary Accrual
                if (leavesalaryamt != 0) {
                    createMonthlyAccrual(finalsettleid, empid, paygroup, paymonth, payyear, grosspay, paydate, empcategory, 1, 3);
                }

                // Gratuity Accrual
                if (gratuityamount != 0) {
                    createMonthlyAccrual(finalsettleid, empid, paygroup, paymonth, payyear, basicpay, paydate, empcategory, 3, 7, workingyear);
                }

                // Mark Employee Inactive
                if (empid && confirmsettlement==true ) {
                    try {
                        record.submitFields({
                            type: record.Type.EMPLOYEE,
                            id: empid,
                            values: { isinactive: true },
                            options: { enableSourcing: true, ignoreMandatoryFields: true }
                        });
                        log.debug('Employee Inactive', 'Employee ID ' + empid + ' marked inactive.');
                    } catch (e) {
                        log.error('Error Marking Employee Inactive', e.message);
                    }
                }
            }
        }

        function createMonthlyAccrual(finalsettleid, empid, paygroup, paymonth, payyear, amount, paydate, empcategory, seqno, transeqno, workingyear) {
            var accuraltypeid = getaccuraltypesequence(seqno);
            var accuraltranid = getaccuraltransactiontypesequence(transeqno);

            var monthlyaccuralrecord = record.create({
                type: 'customrecord_hris_monthly_accural_trans'
            });

            var uniquenum = getNextUniqueReference();

            monthlyaccuralrecord.setValue({ fieldId: 'name', value: uniquenum });
            monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_date', value: paydate });
            monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_month', value: paymonth });
            monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_year', value: payyear });
            monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_paygroup', value: paygroup });
            monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_empid', value: empid });
            monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_grosssalary', value: amount });
            monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_finalsettlement', value: finalsettleid });
            monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_emp_catagory', value: empcategory });
            monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_type', value: accuraltypeid });
            monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_trans_type', value: accuraltranid });

            if (workingyear) {
                monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_noofyearsworked', value: workingyear });
            }

            monthlyaccuralrecord.setValue({ fieldId: 'custrecord_hris_accural_utilised_amount', value: amount });

            var monthlyaccuralid = monthlyaccuralrecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            log.debug('Monthly Accrual Created', 'ID: ' + monthlyaccuralid);
        }

        // ====================== Helper Functions ======================

        function getNextUniqueReferenceold() {
            var results = search.create({
                type: "customrecord_hris_unique_reference_numbe",
                filters: [["custrecord_hris_record_type", "anyof", 2308], "AND", ["isinactive", "is", "F"]],
                columns: ["custrecord_hris_unique_number"]
            }).run().getRange({ start: 0, end: 1 });

            var currentNum = results.length > 0 ? parseInt(results[0].getValue("custrecord_hris_unique_number")) + 1 : 1;
            return "ACC-" + currentNum + "-" + new Date().getFullYear();
        }

        function getNextUniqueReference() {
    var results = search.create({
      type: "customrecord_hris_unique_reference_numbe",
      filters: [
        ["custrecord_hris_record_type", "anyof", 2308],
        "AND",
        ["isinactive", "is", "F"]
      ],
      columns: ["custrecord_hris_unique_number"]
    }).run().getRange({ start: 0, end: 1 });

    var currentNum = results.length > 0 ? parseInt(results[0].getValue("custrecord_hris_unique_number")) + 1 : 1;
    var year = new Date().getFullYear();
    var autoNumber = "ACC-" + currentNum + "-" + year;

    if (results.length > 0) {
      record.submitFields({
        type: "customrecord_hris_unique_reference_numbe",
        id: results[0].id,
        values: { custrecord_hris_unique_number: currentNum }
      });
    }

    return autoNumber;
  }

        function getgrosssalary(empid) {
            var empquery = "select * from customrecord_hris_employee_compen_change where custrecord_hris_empchange_employee_nam = " + empid + " and isinactive='F'";
            var monthlysalary = 0;
            var queryResults = query.runSuiteQL({ query: empquery });
            var empqueryrecords = queryResults.asMappedResults();
            if (empqueryrecords.length > 0) {
                monthlysalary = empqueryrecords[0].custrecord_hris_empchange_month_cross_sy;
            }
            return monthlysalary;
        }

        function getaccuraltypesequence(accuralseqno) {
            var accuraltypesql = "select * from customrecord_hris_accuraltype_master where custrecord_hris_accural_seqno =" + accuralseqno;
            var queryResults = query.runSuiteQL({ query: accuraltypesql });
            var accuraltypesqlrecords = queryResults.asMappedResults();
            return accuraltypesqlrecords.length > 0 ? accuraltypesqlrecords[0].id : null;
        }

        function getaccuraltransactiontypesequence(accuraltranseqno) {
            var accuraltypesql = "select * from customrecord_hrms_accural_transactiontyp where custrecord_hris_accural_trans_seqno =" + accuraltranseqno;
            var queryResults = query.runSuiteQL({ query: accuraltypesql });
            var accuraltypesqlrecords = queryResults.asMappedResults();
            return accuraltypesqlrecords.length > 0 ? accuraltypesqlrecords[0].id : null;
        }

        function gettinggratuitycompoamount(empid) {
            var basicgratuityamount = 0;
            var gratuitysql = "select sum(b.custrecord_hris_cde_monthly) as amount from customrecord_hris_employee_compen_change a " +
                              "join customrecord_hris_compensation_details_e b on a.id = b.custrecord_hris_employee_data_change " +
                              "join customrecord_hris_payroll_component c on b.custrecord_hris_cde_payroll_component = c.id " +
                              "where a.custrecord_hris_empchange_employee_nam =" + empid + " and c.custrecord_hris_gratuity ='T' and a.isinactive='F'";

            var queryResult = query.runSuiteQL({ query: gratuitysql });
            var gratuitysqlrecords = queryResult.asMappedResults();

            if (gratuitysqlrecords.length > 0) {
                basicgratuityamount = gratuitysqlrecords[0].amount || 0;
            }
            return basicgratuityamount;
        }

        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit
        };
    });