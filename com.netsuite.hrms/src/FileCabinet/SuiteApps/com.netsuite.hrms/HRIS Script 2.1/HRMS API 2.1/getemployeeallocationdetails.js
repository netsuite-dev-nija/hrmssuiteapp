/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @description API to fetch Duty Roster details for employees with multiple projects/shifts.
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        try {
            // 1. Capture parameters from URL (e.g., ?empid=1006 or ?date=16/06/2026)
            const employeeId = params.empid;
            const rosterDate = params.date;
            
            let filters = [
                ['isinactive', 'is', 'F']
            ];

            // 2. Add dynamic filters
            if (employeeId) {
                filters.push('AND', ['custrecord_hris_duty_roster_employee', 'anyof', employeeId]);
            }
            if (rosterDate) {
                filters.push('AND', ['custrecord_hris_duty_roster_date', 'on', rosterDate]);
            }

            // 3. Create Search on the Duty Roster Record
            // Note: Replace 'customrecord_hris_duty_roster_details' with your actual Record Type ID if different
            const dutyRosterSearch = search.create({
                type: "customrecord_hris_duty_roster", 
                filters: filters,
                columns: [
                    search.createColumn({name: "internalid"}),
                    search.createColumn({name: "custrecord_hris_duty_roster_date"}),
                    search.createColumn({name: "custrecord_hris_duty_roster_employee"}),
                    search.createColumn({name: "custrecord_hris_duty_employe_code"}),
                    search.createColumn({name: "custrecord_hris_duty_project_code"}),
                    search.createColumn({name: "custrecord_hris_duty_site_code"}),
                    search.createColumn({name: "custrecord_hris_duty_shift_code"}),
                    search.createColumn({name: "custrecord_hris_duty_starttime"}),
                    search.createColumn({name: "custrecord_hris_duty_endtime"}),
                    search.createColumn({name: "custrecord_hris_duty_roster_plan_hour"}),
                   search.createColumn({name: "custrecord_hris_duty_roster_project_stag"})
                  
                ]
            });

            let response = {
                Status: "Success",
                ResponseCode: "200",
                records: []
            };

            // 4. Execute Search
            dutyRosterSearch.run().each(function(result) {
                response.records.push({
                    internalId: result.getValue({ name: "internalid" }),
                    date: result.getValue({ name: "custrecord_hris_duty_roster_date" }),
                    employeeName: result.getText({ name: "custrecord_hris_duty_roster_employee" }),
                    employeeId: result.getValue({ name: "custrecord_hris_duty_roster_employee" }),
                    employeeCode: result.getValue({ name: "custrecord_hris_duty_employe_code" }),
                    project: result.getText({ name: "custrecord_hris_duty_project_code" }),
                    projectId: result.getValue({ name: "custrecord_hris_duty_project_code" }),
                    site: result.getText({ name: "custrecord_hris_duty_site_code" }),
                    siteId: result.getValue({ name: "custrecord_hris_duty_site_code" }),
                   stage: result.getText({ name: "custrecord_hris_duty_roster_project_stag" }),
                    stageId: result.getValue({ name: "custrecord_hris_duty_roster_project_stag" }),
                    shiftId: result.getValue({ name: "custrecord_hris_duty_shift_code" }),
                    shift: result.getText({ name: "custrecord_hris_duty_shift_code" }),
                    startTime: result.getValue({ name: "custrecord_hris_duty_starttime" }),
                    endTime: result.getValue({ name: "custrecord_hris_duty_endtime" }),
                    plannedHours: result.getValue({ name: "custrecord_hris_duty_roster_plan_hour" })
                });
                return true; // Continue to next record
            });

            return JSON.stringify(response);

        } catch (e) {
            log.error({ title: 'Error executing Duty Roster search', details: e });
            return JSON.stringify({ 
                Status: "Error", 
                Message: e.message 
            });
        }
    }

    return {
        get: doGet
    };
});