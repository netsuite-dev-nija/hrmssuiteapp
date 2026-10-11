/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/ui/serverWidget', 'N/search', 'N/query', 'N/format'], function (record, serverWidget, search, query, format) {
  function beforeLoad(scriptContext) {
    var form = scriptContext.form;
    var recordObj = scriptContext.newRecord;
    var form = scriptContext.form;
    var type = scriptContext.type;
    log.debug("Type", type);
    var approvalStatus = recordObj.getValue('custrecord_hris_expense_approval_status');

    log.debug("approvalStatus", approvalStatus);
     var jeno = recordObj.getValue('custrecord_hris_expense_journal_report') || '';
    log.debug('jeno', jeno);
    // var currentRecordObj = scriptContext.newRecord;
    if (scriptContext.type == 'view' && approvalStatus == 2 && jeno=='') {
      //if (scriptContext.type == 'view'){

      //   if (scriptContext.type != 'delete' ) {


      //  }

      form.addButton({
        id: 'custpage_jvcreation',
        label: 'Post JV',
        functionName: 'jvcreation()'
      });
    }
    form.clientScriptModulePath = './expense report development cl.js';




  }


  return {
    beforeLoad: beforeLoad,
  };
});



