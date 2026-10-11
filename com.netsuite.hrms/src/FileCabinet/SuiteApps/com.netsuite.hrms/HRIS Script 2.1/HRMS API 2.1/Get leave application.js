/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        //var lveApplication_srch = [];
        try {
            var customrecord_hris_leaveapplicationSearchObj = search.create({
                type: "customrecord_hris_leaveapplication",
                filters:
                [
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "internalId"}),
                   search.createColumn({name: "name", label: "name"}),
                   search.createColumn({name: "custrecord_hris_lve_empcode", label: "employeeCode"}),
                   search.createColumn({name: "custrecord_hris_lve_leavetype", label: "leaveType"}),
                   search.createColumn({name: "custrecord_hris_lve_fromdate", label: "fromDate"}),
                   search.createColumn({name: "custrecord_hris_lve_todate", label: "toDate"}),
                   search.createColumn({name: "custrecord_hris_lve_leavereason", label: "leaveReason"}),
                   search.createColumn({name: "custrecord_hris_lve_leavebalance", label: "leaveBalance"}),
                   search.createColumn({name: "custrecord_hris_lve_totalnodays", label: "totalNoOfDays"}),
                   search.createColumn({name: "custrecord_hris_lve_project_supervisor", label: "projectSupervisor"}),
                   search.createColumn({name: "custrecord_hris_lve_linemanager", label: "lineManager"}),
                   search.createColumn({name: "custrecord_hris_lveapp_hod", label: "hod"}),
                   search.createColumn({name: "custrecord_hris_lve_leaveapplicationsts", label: "leaveApplicationSatus"}),
                   search.createColumn({name: "isinactive", label: "inactive"})
                ]
             });
             var searchResultCount = customrecord_hris_leaveapplicationSearchObj.runPaged().count;
             log.debug("customrecord_hris_leaveapplicationSearchObj result count",searchResultCount);
             var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            };

             customrecord_hris_leaveapplicationSearchObj.run().each(function(result){
                var resultObj = {
                    internalId: result.getValue({ name: "internalid" }),
                    name: result.getValue({ name: "name" }),
                    employeeCode: result.getValue({ name: "custrecord_hris_lve_empcode" }),
                    leaveType: result.getValue({ name: "custrecord_hris_lve_leavetype" }),
                    fromDate: result.getValue({ name: "custrecord_hris_lve_fromdate" }),
                    toDate: result.getValue({ name: "custrecord_hris_lve_todate" }),
                    leaveReason: result.getValue({ name: "custrecord_hris_lve_leavereason" }),
                    leaveBalance: result.getValue({ name: "custrecord_hris_lve_leavebalance" }),
                    totalNoOfDays: result.getValue({ name: "custrecord_hris_lve_totalnodays" }),
                    projectSupervisor: result.getValue({ name: "custrecord_hris_lve_project_supervisor" }),
                    lineManager: result.getValue({ name: "custrecord_hris_lve_linemanager" }),
                    hod: result.getValue({ name: "custrecord_hris_lveapp_hod" }),
                    leaveApplicationSatus: result.getValue({ name: "custrecord_hris_lve_leaveapplicationsts" }),
                    inactive: result.getValue({ name: "isinactive" }),
                    
                };
                response.records.push(resultObj);
                //lveApplication_srch.push(resultObj);
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
