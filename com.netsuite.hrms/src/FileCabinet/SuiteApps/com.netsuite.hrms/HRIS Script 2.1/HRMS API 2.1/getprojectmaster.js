/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        //var resultsArray = [];
        try {
        
const customrecord_cseg_njt_seg_projSearchObj = search.create({
   type: "customrecord_cseg_njt_seg_proj",
   filters:
   [
   ],
   columns:
   [
      search.createColumn({name: "name", label: "Name"}),
      search.createColumn({name: "isinactive", label: "Inactive"}),
      search.createColumn({name: "internalid", label: "Internal ID"})   
      
   ]
});
const searchResultCount = customrecord_cseg_njt_seg_projSearchObj.runPaged().count;
log.debug("customrecord_cseg_njt_seg_projSearchObj result count",searchResultCount);
 var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };
customrecord_cseg_njt_seg_projSearchObj.run().each(function(result){
  var resultObj = {
                    internalId: result.getValue({ name: "internalid" }),
                    name: result.getValue({ name: "name" }),
                    inactive: result.getValue({ name: "isinactive" })
                };
                response.records.push(resultObj);
                //resultsArray.push(resultObj);
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
