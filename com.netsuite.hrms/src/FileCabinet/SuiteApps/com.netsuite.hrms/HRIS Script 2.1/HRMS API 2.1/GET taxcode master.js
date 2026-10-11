/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(context) {
        try {
            var salestaxitemSearchObj = search.create({
                type: "salestaxitem",
                filters: [
                    ["isinactive", "is", "F"] // Only active tax codes
                ],
                columns: [
                    search.createColumn({ name: "name", label: "Name" }),
                    search.createColumn({ name: "rate", label: "Rate" }),
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
            });

            var taxCodeList = [];

            salestaxitemSearchObj.run().each(function (result) {
                taxCodeList.push({
                    id: result.getValue({ name: 'internalid' }),
                    name: result.getValue({ name: 'name' }),
                    rate: result.getValue({ name: 'rate' }),
                    subsidiaryId: result.getValue({ name: 'subsidiary' }) || null,
                    subsidiaryName: result.getValue({ name: 'name', join: 'subsidiary' }) || null
                });
                return true;
            });

            return JSON.stringify({
                Status: "Success",
                ResponseCode: "200",
                taxCodes: taxCodeList
            });

        } catch (e) {
            log.error("Tax Code Search Error", e.message);
            return JSON.stringify({
                Status: "Failed",
                ResponseCode: "500",
                Message: e.message
            });
        }
    }

    return {
        get: doGet
    };
});
