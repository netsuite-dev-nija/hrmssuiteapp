/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], function (query, log) {

  function doGet(context) {
    try {
      

      // Query : Process Group Master
      var departmentsql = "SELECT id, name FROM department WHERE isinactive='F'";
      var departmentGroupResults = query.runSuiteQL({ query: departmentsql }).asMappedResults();

      var departmentlist = departmentGroupResults.map(function (row) {
        return {
          id: row.id,
          name: row.name
        };
      });

      // Final Response
     // Return both sets of data
      return JSON.stringify({
        Status: "Success",
        ResponseCode: "200",
       
        processGroups: departmentlist
      });

    } catch (e) {
      log.error("SuiteQL Error", e.message);
       // Return both sets of data
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
