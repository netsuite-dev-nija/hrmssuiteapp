/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
var QUERY;
define(['N/record', 'N/ui/serverWidget', 'N/search','N/query'], function (record, serverWidget, search,query) {
  QUERY = query;
  function beforeLoad(scriptContext) {
    var form = scriptContext.form;
    var newRecordObj = scriptContext.newRecord;
    var form = scriptContext.form;
    var type = scriptContext.type;
    log.debug("Type", type);
    // var currentRecordObj = scriptContext.newRecord;


    var approvalStatus = newRecordObj.getValue('custrecord_hrms_lveset_approvalstatus');

    log.debug("approvalStatus", approvalStatus);
    var leaveAppNo = newRecordObj.getValue('custrecord_hrms_lveset_leaverefno') || '';
    log.debug("leaveAppNo", leaveAppNo);
    var jeno = newRecordObj.getValue('custrecord_hrms_lveset_jevoucherno') || '';
    log.debug('jeno', jeno);
    var directpayment = newRecordObj.getValue('custrecord_hrms_lveset_directpayment');
    log.debug('directpayment',directpayment);

    if (scriptContext.type == 'create' || scriptContext.type == 'edit') {
      var leaveAppField = form.addField({
        id: 'custpage_leave_app_no',
        type: serverWidget.FieldType.SELECT,
        label: 'Leave Application'
        // source: "customrecord_leave_app_"
      });
      /* form.insertField({
        field: leaveAppField,
        nextfield: 'custrecord_hrms_lveset_lastworkingdate'
      }); */
      form.insertField({
        field: leaveAppField,
        nextfield: 'custrecord_hrms_lveset_leaverefno'
      });
      if (scriptContext.type == 'create') {
        leaveAppField.isMandatory = true;
      }
      if (scriptContext.type == 'edit') {

        leaveAppField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.ENTRY
        });

      }
    }
    if ((scriptContext.type == 'create' || scriptContext.type == 'edit') && approvalStatus == 1) {
      //if (scriptContext.type == 'view'){
      form.addButton({
        id: 'custpage_invoice',
        label: 'Load Details',
        functionName: 'leavesalary()'
      });
    }
    else if (scriptContext.type == 'view' && approvalStatus == 2 && jeno == '' ) {
      //if (scriptContext.type == 'view'){

      //   if (scriptContext.type != 'delete' ) {


      //  }

      form.addButton({
        id: 'custpage_jvcreation',
        label: 'Post JV',
        functionName: 'jvcreation()'
      });
    }

    form.clientScriptModulePath = './hrms_leavesettlement_validation_cs.js';





  }

  function beforeSubmit(scriptContext) {
    var newRecordObj = scriptContext.newRecord;
    if (scriptContext.type === scriptContext.UserEventType.CREATE) {
      var currentRecord = scriptContext.newRecord;

      var s_auto_prfix = "";
      var recordType = currentRecord.type.toLowerCase();

      if (recordType === "customrecord_hrms_leavesettlement") {
        s_auto_prfix = "LS";
      }

      var i_rec_type_id = currentRecord.getValue({
        fieldId: "rectype",
      });

      var customrecord_hris_unique_reference_numbeSearchObj = search.create({
        type: "customrecord_hris_unique_reference_numbe",
        filters: [
          ["custrecord_hris_record_type", "anyof", i_rec_type_id],
          "AND",
          ["isinactive", "is", "F"],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_hris_unique_number",
            label: "Unique Number",
          }),
          search.createColumn({ name: "internalid", label: "Internal ID" }),
        ],
      });

      var searchResultCount =
        customrecord_hris_unique_reference_numbeSearchObj.runPaged().count;

      if (searchResultCount > 0) {
        customrecord_hris_unique_reference_numbeSearchObj
          .run()
          .each(function (result) {
            var i_id_unique_ref = result.getValue({ name: "internalid" });
            var i_unique_num = result.getValue({
              name: "custrecord_hris_unique_number",
            });

            i_unique_num = parseInt(i_unique_num) + 1;

            var zeros = "";
            if (i_unique_num.toString().length == 1) {
              zeros = "00";
            }
            if (i_unique_num.toString().length == 2) {
              zeros = "0";
            }
            // if (i_unique_num.toString().length == 3) { zeros = '0'; }
            // if (i_unique_num.toString().length == 4) { zeros = '0'; }

            // log.debug('Internal No :', prefix1 + '-' + prefix2 + '-' + shortYear + '-' + zeros + docno);
            var refnumber = zeros + i_unique_num;
            log.debug("refnumber", refnumber);
            var d_current_date = new Date();
            var i_fullYear = d_current_date.getFullYear();

            // var s_name = "";
            var s_auto_number =
              s_auto_prfix + "-" + "NO" + "-" + refnumber + "-" + i_fullYear;

            currentRecord.setValue({
              fieldId: "name",
              value: s_auto_number,
            });
            record.submitFields({
              type: "customrecord_hris_unique_reference_numbe",
              id: i_id_unique_ref,
              values: {
                custrecord_hris_unique_number: i_unique_num,
              },
            });

            // currentRecord.setValue({
            //   fieldId: "name",
            //   value: s_unique_ref_num,
            // });

            return true;
          });
      }
    }
    if (scriptContext.type == 'edit') {
      var approvalStatus = newRecordObj.getValue('custrecord_hrms_lveset_approvalstatus');

      log.debug("approvalStatus", approvalStatus);
      var leaveAppNo = newRecordObj.getValue('custrecord_hrms_lveset_leaverefno') || '';
      log.debug("leaveAppNo", leaveAppNo);
      var jeno = newRecordObj.getValue('custrecord_hrms_lveset_jevoucherno') || '';
      log.debug('jeno', jeno);
      var empid = newRecordObj.getValue('custrecord_hrms_lveset_empname');
      log.debug('Emp id',empid);
      var directpayment = newRecordObj.getValue('custrecord_hrms_lveset_directpayment');
      log.debug('directpayment',directpayment);
      var paidpayroll = newRecordObj.getValue('custrecord_hrms_lveset_paidthropayroll');
      log.debug('paidpayroll',paidpayroll);
      if (approvalStatus == 2 && leaveAppNo ) {
        var leaveAppID = record.submitFields({
          type: 'customrecord_hris_leaveapplication',
          id: leaveAppNo,
          values: {
            'custrecord_hris_lve_settlement_refno': scriptContext.newRecord.id
          }
        });
        log.debug("Info", "Leave Application also Updated. Internal ID : " + leaveAppID);
        var sublistcount = newRecordObj.getLineCount({
          sublistId: 'recmachcustrecord_hrms_loandet_settlelink'
        });
        log.debug("sublistcount", sublistcount);


        var totalloanamount = 0;

        for (var i = 0; i < sublistcount; i++) {

         /*  newRecordObj.selectLine({
            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
            line: i
          }); */
          var loanid = newRecordObj.getSublistValue({
            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
            fieldId: 'custrecord_hrms_loandet_loanno',
            line: i,

          });
          var paidamount = newRecordObj.getSublistValue({
            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
            fieldId: 'custrecord_hrms_loandet_paidamount',
            line: i,

          }) || 0;
          var outstandingamt = newRecordObj.getSublistValue({
            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
            fieldId: 'custrecord_hrms_loandet_outstandingamt',
            line: i,

          }) || 0;
          var amounttobepaid = newRecordObj.getSublistValue({
            sublistId: 'recmachcustrecord_hrms_loandet_settlelink',
            fieldId: 'custrecord_hrms_loandet_amount',
            line: i,

          }) || 0;
          if(loanid){
          var updatedloanid = record.submitFields({
            type: 'customrecord_hris_empchange_loan_applicn',
            id: loanid,
            values: {
              'custrecord_hris_loan_paid_amount': parseFloat(paidamount) + parseFloat(amounttobepaid),
              'custrecord_hris_loan_outstanding_amount': parseFloat(outstandingamt) - parseFloat(amounttobepaid),
            },
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true
            }
          });
          log.debug('Updated Loanid', updatedloanid);
        }
         /*  newRecordObj.commitLine({
            sublistId: 'recmachcustrecord_hrms_loandet_settlelink'
          }); */
        }
        if(paidpayroll==false){
          var EmployeeID = record.submitFields({
            type: 'employee',
            id: empid,
            values: {
              'custentity_hris_empemploymentstatus': 5
            }
          });
       /*   var EmployeeRecord = record.load({
             type: 'employee', 
            id: empid,
            isDynamic: true,
        });
        EmployeeRecord.setValue({
          fieldId: 'custentity_hris_empemploymentstatus',
          value: 5,
          ignoreFieldChange: true
        });
        var EmployeeID = EmployeeRecord.save({
          enableSourcing: true,
          ignoreMandatoryFields: true
      }); */
          log.debug("Info", "Employee Status also Updated. Internal ID : " + EmployeeID);
  
         var empcompensql ="select * from customrecord_hris_employee_compen_change \
              where custrecord_hris_empchange_employee_nam ="+empid+" and isinactive ='F'"  

              log.debug('empcompensql', empcompensql);
           
              var empcompensqlrecords = getResult(empcompensql);
             
              if (empcompensqlrecords.length > 0) {
                var compenid = empcompensqlrecords[0].id;
                var EmployeecompenID = record.submitFields({
                  type: 'customrecord_hris_employee_compen_change',
                  id: compenid,
                  values: {
                    'custrecord_hris_empchange_emp_active_sts': 5
                  }
                });

              }  
              log.debug("Info", "EmployeeCompensationStatus also Updated. Internal ID : " + EmployeecompenID);
        }
else if(paidpayroll==true){
  var EmployeeID = record.submitFields({
    type: 'employee',
    id: empid,
    values: {
      'custentity_hris_empemploymentstatus': 1
    }
  });

  log.debug("Info", "Employee Status also Updated. Internal ID : " + EmployeeID);

 var empcompensql ="select * from customrecord_hris_employee_compen_change \
      where custrecord_hris_empchange_employee_nam ="+empid+" and isinactive ='F'"  

      log.debug('empcompensql', empcompensql);
   
      var empcompensqlrecords = getResult(empcompensql);
     
      if (empcompensqlrecords.length > 0) {
        var compenid = empcompensqlrecords[0].id;
        var EmployeecompenID = record.submitFields({
          type: 'customrecord_hris_employee_compen_change',
          id: compenid,
          values: {
            'custrecord_hris_empchange_emp_active_sts': 1
          }
        });

      }  
      log.debug("Info", "EmployeeCompensationStatus also Updated. Internal ID : " + EmployeecompenID);
}
      }



    }
  }
  function getResult(pSQL) {
    // log.debug("QUERY", pSQL);
    var queryResults = QUERY.runSuiteQL({
        query: pSQL
    });
    var records = queryResults.asMappedResults();
    return records;
}
  return {
    beforeLoad: beforeLoad,
    beforeSubmit: beforeSubmit
  };
});



