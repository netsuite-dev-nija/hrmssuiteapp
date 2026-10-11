/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], function (query, log) {

  function doGet(context) {
    try {
      
      // Query :Payroll Component (customrecord_hris_payroll_component)
      var payrollSql = "SELECT id, name,custrecord_hris_pay_process_group FROM customrecord_hris_payroll_component WHERE custrecord_hris_expense_component='T' AND isinactive ='F'";
      var payrollResults = query.runSuiteQL({ query: payrollSql }).asMappedResults();

      var payrollList = payrollResults.map(function (row) {
        return {
          id: row.id,
          name: row.name,
          paygrpinpayrollcomp:row.custrecord_hris_pay_process_group

        };
      });

      // Return both sets of data
      return JSON.stringify({
        Status: "Success",
        ResponseCode: "200",
        payrollComponents: payrollList
      });

    } catch (e) {
      log.error("SuiteQL Error", e.message);
      return JSON.stringify({
        Status: "Failed",
        ResponseCode: "500",
        Message: e.message
      });
    }
  }

  return {
    get: doGet
  };
});
