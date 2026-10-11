/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/query'], function (query) {

    function getCountries() {
        try {
            var sql = "SELECT id, name FROM country";
            var resultSet = query.runSuiteQL({ query: sql });
            var results = resultSet.asMappedResults();

            var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: results.length,
                records: results // Each record has { id, name }
            };

            return JSON.stringify(response);
        } catch (e) {
            return JSON.stringify({
                Status: "Error",
                ResponseCode: "500",
                Message: "Error executing SuiteQL query.",
                Details: e.message
            });
        }
    }

    return {
        get: getCountries
    };
});
