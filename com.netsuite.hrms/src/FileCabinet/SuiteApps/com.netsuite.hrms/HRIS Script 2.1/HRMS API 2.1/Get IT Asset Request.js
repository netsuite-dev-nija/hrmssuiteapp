/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        //var assetRequest = [];
        try {
            var customrecord_hris_asset_req_formSearchObj = search.create({
                type: "customrecord_hris_asset_req_form",
                filters:
                [
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}),
                   search.createColumn({name: "name", label: "Name"}),
                   search.createColumn({name: "custrecord_hris_asset_emp_name", label: "Employee Name"}),
                   search.createColumn({name: "custrecord_hris_asset_type", label: "Asset Type"}),
                   search.createColumn({name: "custrecord_hris_asset_name", label: "Asset Name"}),
                   search.createColumn({name: "custrecord_hris_asset_issuedone", label: "Issue Done "}),
                   search.createColumn({name: "custrecord_hris_asset_remarks", label: "Remarks"}),
                   search.createColumn({name: "custrecord_hris_assetissueid", label: "Asset Issue Id"}),
                   search.createColumn({name: "isinactive", label: "Inactive"})
                ]
             });
             var searchResultCount = customrecord_hris_asset_req_formSearchObj.runPaged().count;
             log.debug("customrecord_hris_asset_req_formSearchObj result count",searchResultCount);

             var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };

             customrecord_hris_asset_req_formSearchObj.run().each(function(result){
                var resultObj = {
                    internalId: result.getValue({ name: "internalid" }),
                    name: result.getValue({ name: "name" }),
                    employeeName: result.getText({ name: "custrecord_hris_asset_emp_name" }),
                    assetType: result.getText({ name: "custrecord_hris_asset_type" }),
                    assetName: result.getText({ name: "custrecord_hris_asset_name" }),
                    issueDone: result.getValue({ name: "custrecord_hris_asset_issuedone" }),
                    remarks: result.getValue({ name: "custrecord_hris_asset_remarks" }),
                    assetIssueId: result.getValue({ name: "custrecord_hris_assetissueid" }),
                    inactive: result.getValue({ name: "isinactive" }),
                    
                };
                response.records.push(resultObj);
                //assetRequest.push(resultObj);
                return true;
             });
             
            return JSON.stringify(response);
        } catch (e) {
            log.error({ title: 'Error executing search', details: e });
            throw e;
        }
    }

    return {
        get: doGet
    };
});
