/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], function (query, log) {

  function doGet(context) {
    try {
      var sql = "SELECT id, name FROM classification WHERE isinactive='F'";

      var resultSet = query.runSuiteQL({ query: sql });
      var results = resultSet.asMappedResults ? resultSet.asMappedResults() : [];

      var data = results.map(function (row) {
        return {
          id: row.id,
          name: row.name
        };
      });

      return JSON.stringify({
        Status: "Success",
        ResponseCode: "200",
        data: data
      });

    } catch (e) {
      log.error("SuiteQL Query Failed", e.message);
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
