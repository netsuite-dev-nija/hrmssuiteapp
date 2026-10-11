/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        //var resultsArray = [];
        try {
        



const customrecord_cseg_njt_seg_prosSearchObj = search.create({
   type: "customrecord_cseg_njt_seg_pros",
   filters:
   [
   ],
   columns:
   [
      search.createColumn({name: "name", label: "Name"}),
      search.createColumn({name: "parent", label: "Parent"}),
      search.createColumn({
         name: "name",
         join: "parent",
         label: "Project Name"
      }),
      search.createColumn({name: "isinactive", label: "Inactive"}),
      search.createColumn({name: "internalid", label: "Internal ID"})
   ]
});
const searchResultCount = customrecord_cseg_njt_seg_prosSearchObj.runPaged().count;
log.debug("customrecord_cseg_njt_seg_prosSearchObj result count",searchResultCount);
 var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };
customrecord_cseg_njt_seg_prosSearchObj.run().each(function(result){
   // .run().each has a limit of 4,000 results
    var resultObj = {
                    internalId: result.getValue({ name: "internalid" }),
                    name: result.getValue({ name: "name" }),
                    project:result.getValue({ name: "parent" }),
                    inactive: result.getValue({ name: "isinactive" }),
                  projectName: result.getValue({
    name: "name",
    join: "parent"
})
                };
                response.records.push(resultObj);
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
