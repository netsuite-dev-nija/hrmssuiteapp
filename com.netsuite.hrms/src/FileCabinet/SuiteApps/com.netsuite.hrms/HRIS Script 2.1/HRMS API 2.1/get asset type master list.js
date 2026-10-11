/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */

define(["N/search"], function (search) {

    function getData() {
        try {
            
            var customrecord_hris_asset_category_recSearchObj = search.create({
                type: "customrecord_hris_asset_category_rec",
                filters:
                [
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}),
                   search.createColumn({name: "name", label: "Name"}),
                   search.createColumn({name: "custrecord_hris_asset_typ", label: "Asset Type"}),
                   search.createColumn({name: "isinactive", label: "Inactive"})
                ]
             });

            // Get the search result count
            var searchResultCount = customrecord_hris_asset_category_recSearchObj.runPaged().count;
            log.debug("customrecord_hris_asset_category_recSearchObj result count",searchResultCount);

            // Initialize response structure
            var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };

            // Run the search and process each result
            customrecord_hris_asset_category_recSearchObj.run().each(function(result){
                var record = {
                    id: result.getValue({ name: "internalid" }) || "",
                    name: result.getValue({ name: "name" }) || "",
                    assetType: result.getText({ name: "custrecord_hris_asset_typ" }) || "",
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
