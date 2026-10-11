/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        //var letterType = [];
        try {
            var customrecord_hris_leaveconfigSearchObj = search.create({
                type: "customrecord_hris_leaveconfig",
                filters:
                [
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}),
                   search.createColumn({name: "name", label: "Name"}),
                   search.createColumn({name: "custrecord_hris_lveconf_wklyoffcriteria", label: "Weekly Off Criteria"}),
                   search.createColumn({name: "custrecord_hris_lveconfig_isairtckapble", label: "Is Air Ticket Applicable"}),
                   search.createColumn({name: "custrecord_hris_lvecfg_credit_on_joining", label: "Credit on Joining"}),
                   search.createColumn({name: "isinactive", label: "Inactive"})
                ]
             });
             var searchResultCount = customrecord_hris_leaveconfigSearchObj.runPaged().count;
             log.debug("customrecord_hris_leaveconfigSearchObj result count",searchResultCount);

             var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };

             customrecord_hris_leaveconfigSearchObj.run().each(function(result){
                var resultObj = {
                    internalId: result.getValue({ name: "internalid" }),
                    name: result.getValue({ name: "name" }),
                    weeklyOffCriteria: result.getText({ name: "custrecord_hris_lveconf_wklyoffcriteria" }),
                    isAirTicketApplicable: result.getValue({ name: "custrecord_hris_lveconfig_isairtckapble" }),
                    creditOnJoining: result.getValue({ name: "custrecord_hris_holiday_day" }),
                    
                };
                response.records.push(resultObj);
                //letterType.push(resultObj);
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
