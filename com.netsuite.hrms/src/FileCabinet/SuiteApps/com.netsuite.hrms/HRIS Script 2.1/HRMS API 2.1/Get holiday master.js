/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        //var resultsArray = [];
        try {
            var customrecord_hris_holiday_masterSearchObj = search.create({
                type: "customrecord_hris_holiday_master",
                filters: [],
                columns: [
                    search.createColumn({ name: "internalid", label: "internalId" }),
                    search.createColumn({ name: "name", label: "name" }),
                    search.createColumn({ name: "custrecord_hris_holi_region", label: "region" }),
                    search.createColumn({ name: "custrecord_hris_holiday_location", label: "location" }),
                    search.createColumn({ name: "custrecord_hris_holiday_day", label: "holidayDay" }),
                     //  Add sorting here
                    search.createColumn({ 
                        name: "custrecord_hris_holiday_date", 
                        label: "holidayDate",
                        sort: search.Sort.ASC // ASC for ascending, DESC for descending
                    }),
                    search.createColumn({ name: "custrecord_hris_holiday_date", label: "holidayDate" }),
                    search.createColumn({ name: "custrecord_hris_holidayweeklyoffcriteria", label: "weeklyOffCriteria" }),
                    search.createColumn({ name: "custrecord_hris_holiday_remark", label: "remark" }),
                    search.createColumn({ name: "custrecord_hris_holiday_is_alternate_sat", label: "isAlternativeSaturday" }),
                    search.createColumn({ name: "custrecord_hris_holidayconsiderforleave", label: "considerForLeave" }),
                    search.createColumn({ name: "isinactive", label: "inactive" })
                ]
            });

            var searchResultCount = customrecord_hris_holiday_masterSearchObj.runPaged().count;
            log.debug("customrecord_hris_holiday_masterSearchObj result count", searchResultCount);
            var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };


            customrecord_hris_holiday_masterSearchObj.run().each(function (result) {
                var resultObj = {
                    internalId: result.getValue({ name: "internalid" }),
                    name: result.getValue({ name: "name" }),
                    region: result.getValue({ name: "custrecord_hris_holi_region" }),
                    location: result.getValue({ name: "custrecord_hris_holiday_location" }),
                    holidayDay: result.getText({ name: "custrecord_hris_holiday_day" }),
                    holidayDate: result.getValue({ name: "custrecord_hris_holiday_date" }),
                    weeklyOffCriteria: result.getText({ name: "custrecord_hris_holidayweeklyoffcriteria" }),
                    remark: result.getValue({ name: "custrecord_hris_holiday_remark" }),
                    isAlternativeSaturday: result.getValue({ name: "custrecord_hris_holiday_is_alternate_sat" }),
                    considerForLeave: result.getValue({ name: "custrecord_hris_holidayconsiderforleave" }),
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
