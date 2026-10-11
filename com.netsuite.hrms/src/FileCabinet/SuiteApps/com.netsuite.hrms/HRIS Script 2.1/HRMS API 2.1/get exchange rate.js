/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */

define(['N/query', 'N/log'], function (query, log) {

    function getData() {
        try {
            var sql = "SELECT " +
               
                "name, " +
              
                "id, " +
                "expenseacct, " +
                "description, " +
                "subsidiary " +
                "FROM expensecategory";

            var results = query.runSuiteQL({ query: sql }).asMappedResults();
            var recordList = [];

            results.forEach(function (item) {
                var record = {
                    id: item.id,
                    name: item.name,
                    details: {}
                };

                for (var key in item) {
                    if (key !== "id" && key !== "name") {
                        record.details[key] = item[key];
                    }
                }

                recordList.push(record);
            });

            var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: recordList.length,
                records: recordList
            };

            log.debug("ExpenseCategory Response", response);
            return JSON.stringify(response);

        } catch (e) {
            log.error({
                title: "Error in getData",
                details: e.toString()
            });

            return JSON.stringify({
                Status: "Error",
                ResponseCode: "500",
                Message: "An error occurred while fetching expense categories.",
                Details: e.toString()
            });
        }
    }

    return {
        get: getData
    };
});
