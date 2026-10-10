/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/ui/serverWidget','N/search'], function(record, serverWidget,search) {
    function beforeLoad(scriptContext) {
        var form = scriptContext.form;
        var recordObj = scriptContext.newRecord;
        var form = scriptContext.form;
        var type = scriptContext.type;
        log.debug("Type",type);
      var approvalStatus = recordObj.getValue('custrecord_hris_fin_approva');

                log.debug("approvalStatus", approvalStatus);
       var jeno = recordObj.getValue('custrecord_hris_fin_jo_no')||'';
              log.debug('jeno',jeno);
       // var currentRecordObj = scriptContext.newRecord;
        if ((scriptContext.type == 'create' || scriptContext.type == 'edit') && approvalStatus ==1) {
          //if (scriptContext.type == 'view'){
            form.addButton({
                id: 'custpage_invoice',
                label: 'Load Details',
                functionName: 'leavesalary()'
            });
        }
        else if ( scriptContext.type == 'view' && approvalStatus ==2 && jeno=='') {
          //if (scriptContext.type == 'view'){

       //   if (scriptContext.type != 'delete' ) {
          
         
      //  }

            form.addButton({
                id: 'custpage_jvcreation',
                label: 'Post JV',
                functionName: 'jvcreation()'
            });
        }
        form.clientScriptModulePath = './Leave Final settlement validation cs.js';
      
        /* if (scriptContext.type == 'create' || scriptContext.type == 'edit') {
            var leaveAppField = form.addField({
                id: 'custpage_leave_app_no',
                type: serverWidget.FieldType.SELECT,
                label: 'Leave Application'
                // source: "customrecord_leave_app_"
            });
            form.insertField({
                field : leaveAppField,
                nextfield : 'custrecord_hris_lveset_leaverefno'
            });
            if (scriptContext.type == 'create') {
                leaveAppField.isMandatory = true;
            }
            // Date: 20/07/2021 Note - Adding the above field before LEAVE APPLICATION NUMBER
            form.insertField({
                field: leaveAppField,
                nextfield: 'custrecord_njt_hr_ls_leave_appl_number'
            });
            // Date: 04/09/2021 Note - Leave Settlement - Enable / Disable fields in Edit Mode
            if (scriptContext.type == 'edit') {
             
                    leaveAppField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.ENTRY
                    });
               
            }
        } */
  
  
    }
  
    function beforeSubmit(scriptContext) {
      if (scriptContext.type === scriptContext.UserEventType.CREATE) {
        var currentRecord = scriptContext.newRecord;
   
        var s_auto_prfix = "";
        var recordType = currentRecord.type.toLowerCase();
   
        if (recordType === "customrecord_hris_finasettlement_process") {
          s_auto_prfix = "FS";
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
    }
    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit
  };
  });
  
  
  
    