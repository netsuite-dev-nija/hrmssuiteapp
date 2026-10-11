/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */

define(["N/search"], function (search) {

    function getData() {
        try {
            // Create the search object
            var customrecord_hris_compoff_typeSearchObj = search.create({
                type: "customrecord_hris_compoff_type",
                filters:
                [
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}),
                   search.createColumn({name: "name", label: "Name"}),
                   search.createColumn({name: "isinactive", label: "Inactive"})
                ]
             });

            // Get the search result count
            var searchResultCount = customrecord_hris_compoff_typeSearchObj.runPaged().count;
            log.debug("customrecord_hris_compoff_typeSearchObj result count",searchResultCount);

            // Initialize response structure
            var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };

            // Run the search and process each result
            customrecord_hris_compoff_typeSearchObj.run().each(function(result){
                var record = {
                    id: result.getValue({ name: "internalid" }) || "",
                    name: result.getValue({ name: "name" }) || "",
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