/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */

define(["N/search"], function (search) {

    function getData() {
        try {
            // Create the search object
            var customrecord_hris_claimtypeSearchObj = search.create({
                type: "customrecord_hris_claimtype",
                filters:
                [
                    
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}),
                   search.createColumn({name: "name", label: "Name"}),
                   search.createColumn({name: "isinactive", label: "Inactive"}),
                   search.createColumn({name: "custrecord_hris_claim_paycomponent", label: "Payroll Component"}),
                    search.createColumn({name: "custrecord_hris_claim_paygroup", label: "Pay Group"})

                ]
             });
            // Get the search result count
            var searchResultCount = customrecord_hris_claimtypeSearchObj.runPaged().count;
            log.debug("customrecord_hris_claimtypeSearchObj result count",searchResultCount);

            // Initialize response structure
            var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };

            // Run the search and process each result
            customrecord_hris_claimtypeSearchObj.run().each(function(result){
                var record = {
                    id: result.getValue({ name: "internalid" }) || "",
                    name: result.getValue({ name: "name" }) || "",
                    inactive: result.getValue({ name: "isinactive" }),
                    payrollComponentid: result.getValue({ name: "custrecord_hris_claim_paycomponent" }) || "",
                    payGroupid: result.getValue({ name: "custrecord_hris_claim_paygroup" }) || "",
                    payrollComponentText: result.getText({ name: "custrecord_hris_claim_paycomponent" }) || "",
                    payGroupText: result.getText({ name: "custrecord_hris_claim_paygroup" }) || ""
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
