/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], function (query, log) {

  function doGet(context) {
    try {
      var sql = 
        "SELECT " +
        "id AS empid, " +
        "custentity_hris_emplegalname AS empname, " +
        "BUILTIN.DF(custentity_hris_empweeklyoffs) AS weeklyoff " +
        "FROM employee " +
        "WHERE isinactive = 'F' ";

      var results = query.runSuiteQL({ query: sql }).asMappedResults();

      var empMap = {};

      results.forEach(function (row) {
        var key = row.empid;

        if (!empMap[key]) {
          empMap[key] = {
            empid: row.empid,
            empname: row.empname,
            weeklyoff: ""
          };
        }

        if (row.weeklyoff) {
          if (empMap[key].weeklyoff !== "") {
            empMap[key].weeklyoff += ", ";
          }
          empMap[key].weeklyoff += row.weeklyoff;
        }
      });

      var employeeList = Object.values(empMap);

      return JSON.stringify({
        Status: "Success",
        ResponseCode: "200",
        employees: employeeList
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
