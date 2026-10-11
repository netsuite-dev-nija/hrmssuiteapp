/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */

define(["N/search"], function (search) {

    function getData() {
        try {
            // Create the search object
            var customrecord_hris_emp_skill_name_listSearchObj = search.create({
                type: "customrecord_hris_emp_skill_name_list",
                filters:
                [
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}),
                   search.createColumn({name: "name", label: "skillCode"}),
                   search.createColumn({name: "custrecord_hris_emp_skillname", label: "skillName"}),
                   search.createColumn({name: "isinactive", label: "Inactive"})
                ]
             });
            // Get the search result count
            var searchResultCount = customrecord_hris_emp_skill_name_listSearchObj.runPaged().count;
            log.debug("customrecord_hris_emp_skill_name_list result count",searchResultCount);

            // Initialize response structure
            var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };

            // Run the search and process each result
            customrecord_hris_emp_skill_name_listSearchObj.run().each(function(result){
                var record = {
                    id: result.getValue({ name: "internalid" }) || "",
                    skillCode: result.getValue({ name: "name" }) || "",
                    skillName: result.getValue({ name: "custrecord_hris_emp_skillname" }) || "",
                    inactive: result.getValue({ name: "isinactive" })
                };
                response.records.push(record);
                return true;
            });

            log.debug("Final Response", response);

            // Return the response as JSON string
            return JSON.stringify(response);
        } catch (ex) {
            log.error({
                title: "Error in getData",
                details: ex.toString(),
            });

            return JSON.stringify({
                Status: "Error",
                ResponseCode: "500",
                Message: "An error occurred while processing the request.",
                Details: ex.toString()
            });
        }
    }

    return {
        get: getData
    };
});
