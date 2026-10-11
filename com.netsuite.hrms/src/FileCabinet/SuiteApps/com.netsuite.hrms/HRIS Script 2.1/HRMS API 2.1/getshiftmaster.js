/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        //var resultsArray = [];
        try {
        


const customrecord_hris_shift_masterSearchObj = search.create({
   type: "customrecord_hris_shift_master",
   filters:
   [
   ],
   columns:
   [
      search.createColumn({name: "name", label: "Name"}),
      search.createColumn({name: "isinactive", label: "Inactive"}),
      search.createColumn({name: "internalid", label: "Internal ID"}),
      search.createColumn({name: "custrecord_hris_shift_code", label: "Shift Code"}),
      search.createColumn({name: "custrecord_hris_shift_timing_type", label: "Timing Type"}),
      search.createColumn({name: "custrecord_hris_shift_statrt_time", label: "Start Time"}),
      search.createColumn({name: "custrecord_hris_shift_mst_endtime", label: "End Time"}),
      search.createColumn({name: "custrecord_hris_shift_nightnext_day", label: "Night Shift Conside Next Day"}),
      search.createColumn({name: "custrecord_hris_shift_normalshift", label: "Normal Shift"}),
      search.createColumn({name: "custrecord_hris_working_shift_hours", label: "Working Hours"}),
      search.createColumn({name: "custrecord_hris_shift_lunch_time", label: "Lunch Time"}),
      search.createColumn({name: "custrecord_hris_shiftstarttimebuffer", label: "Start Time Buffer"}),
      search.createColumn({name: "custrecord_hris_shiftendtimebuffer", label: "End Time Buffer"}),
      search.createColumn({name: "custrecord_hris_shift_nightprev_day", label: "Night Shift Consider Previous Day"})
   ]
});
const searchResultCount = customrecord_hris_shift_masterSearchObj.runPaged().count;
log.debug("customrecord_hris_shift_masterSearchObj result count",searchResultCount);

 var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };
customrecord_hris_shift_masterSearchObj.run().each(function(result){
  var resultObj = {
                    internalId: result.getValue({ name: "internalid" }),
                    name: result.getValue({ name: "name" }),
                    inactive: result.getValue({ name: "isinactive" }),
                    shiftcode:result.getValue({ name: "custrecord_hris_shift_code" }),
                    starttime : result.getValue({name: "custrecord_hris_shift_statrt_time"}),
                    endtime :  result.getValue({name: "custrecord_hris_shift_mst_endtime"}),
                    normalshift: result.getValue({name: "custrecord_hris_shift_normalshift"}),
                    workinghrs: result.getValue({name: "custrecord_hris_working_shift_hours"}),
                    lunchhrs:result.getValue({name: "custrecord_hris_shift_lunch_time"}),
                    nightshiftnextday:result.getValue({name: "custrecord_hris_shift_nightnext_day"}),
                    nightpreviousday: result.getValue({name: "custrecord_hris_shift_nightprev_day"}),
                    starttimebuffer: result.getValue({name: "custrecord_hris_shiftstarttimebuffer"}),
                    endtimebuffer:result.getValue({name: "custrecord_hris_shiftendtimebuffer"}),
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
