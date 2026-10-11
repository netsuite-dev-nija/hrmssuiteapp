/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/format', 'N/log'], (record, search, format, log) => {

    const post = (requestBody) => {
        log.audit("RESTlet Start", "Received Payload: " + JSON.stringify(requestBody));

        // 1. Validate if input is a valid array
        if (!Array.isArray(requestBody)) {
            log.error("Validation Error", "Request body is not an array");
            return { status: false, message: "Request body must be an array of objects." };
        }

        return requestBody.map((item, index) => {
            try {
                log.debug(`Index ${index}`, `--- Starting Process for Employee: ${item.employee} ---`);

                // 2. Mandatory field check (Employee and Date)
                if (!item.employee || !item.date) {
                    log.error(`Index ${index} Error`, "Missing mandatory fields: employee or date");
                    throw new Error("Missing mandatory fields: employee or date");
                }

                // 3. PARSE ATTENDANCE DATE (Mandatory)
                log.debug("Step 3", "Parsing Attendance Date: " + item.date);
                const attendanceDate = format.parse({ value: item.date, type: format.Type.DATE });
                log.debug("Step 3 Result", "Attendance Date Object created successfully");

                // 4. CONDITIONAL PARSING FOR IN/OUT TIMES
                let startDateTime = null;
                let endDateTime = null;
                let workedHours = 0;

                // Logic for In-Time
                if (item.inTime && item.inTime.trim() !== "") {
                    log.debug("Step 4a", "inTime provided: " + item.inTime);
                    startDateTime = parseToNetSuiteDateTime(item.inTime);
                } else {
                    log.debug("Step 4a", "inTime is empty or missing.");
                }

                // Logic for Out-Time
                if (item.outTime && item.outTime.trim() !== "") {
                    log.debug("Step 4b", "outTime provided: " + item.outTime);
                    endDateTime = parseToNetSuiteDateTime(item.outTime);
                } else {
                    log.debug("Step 4b", "outTime is empty or missing.");
                }

                // 5. CALCULATE WORKED HOURS (Only if both times exist)
                if (startDateTime && endDateTime) {
                    workedHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
                    if (workedHours < 0) workedHours += 24; 
                    log.debug("Step 5", "Worked Hours calculated: " + workedHours.toFixed(2));
                } else {
                    log.debug("Step 5", "Incomplete time data. Calculation skipped.");
                }

                // 6. GET ALLOCATION DATA (Project/Site)
                log.debug("Step 6", "Fetching Allocation for employee: " + item.employee);
                //Allocation is 
              /*   const allocation = getAllocationData(item.employee, attendanceDate);
                if (!allocation) {
                    throw new Error("No active Project Allocation found for this date.");
                }
 */
                // 7. GET EMPLOYEE WEEKLY OFF
                log.debug("Step 7", "Looking up Weekly Off preference...");
                const empFields = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: item.employee,
                    columns: ['custentity_hris_empweeklyoffs']
                });
                const weeklyOff = (empFields.custentity_hris_empweeklyoffs && empFields.custentity_hris_empweeklyoffs.length > 0) 
                                ? empFields.custentity_hris_empweeklyoffs[0].text : "";

                // 8. CHECK HOLIDAY MASTER
                log.debug("Step 8", "Checking Holiday records...");
                const holidayInfo = checkHoliday(attendanceDate);

                // 9. DETERMINE STATUS AND OT FIELD
                let status = 18; // Regular
                let otField = 'custrecord_hris_daily_attendance_man_rot'; 
                const dayName = getDayName(attendanceDate);

                if (holidayInfo.isHoliday) {
                    status = 19; 
                    otField = 'custrecord_hris_daily_atten_man_hot';
                } else if (dayName.toLowerCase() === weeklyOff.toLowerCase()) {
                    status = 21; 
                    otField = 'custrecord_hris_daily_attendance_man_wot';
                }

                let otHours = workedHours > 10 ? workedHours - 10 : 0;
                log.debug("Step 9", `Calculated Status: ${status} | Day: ${dayName}`);

                // 10. UPSERT LOGIC (Search existing or create new)
                log.debug("Step 10", "Checking for duplicate records on this date...");
                const existingId = findExistingAttendance(item.employee, attendanceDate);
                
                let attRec;
                if (existingId) {
                    log.audit("Step 10", "Updating Existing Record ID: " + existingId);
                    attRec = record.load({
                        type: 'customrecord_hris_man_dailyattendance',
                        id: existingId,
                        isDynamic: true
                    });
                } else {
                    log.audit("Step 10", "Creating New Attendance Entry...");
                    attRec = record.create({
                        type: 'customrecord_hris_man_dailyattendance',
                        isDynamic: true
                    });
                    attRec.setValue('custrecord_hris_man_daily_employee', item.employee);
                    attRec.setValue('custrecord_hris_man_daily_attendate', attendanceDate);
                }

                // 11. SET VALUES ON RECORD
                log.debug("Step 11", "Writing values to fields...");
                
                // If value exists set it, otherwise set null/empty
                attRec.setValue('custrecord_hris_man_daily_starttime', startDateTime || "");
                attRec.setValue('custrecord_hris_man_daily_endtime', endDateTime || "");

           /*      attRec.setValue('custrecord_hris_man_daily_project', allocation.project);
                attRec.setValue('custrecord_hris_man_daily_projectsite', allocation.site);
           */     
                attRec.setValue('custrecord_hris_man_daily_source', item.source || "2");
                attRec.setValue('custrecord_hris_daily_hrs_worked', workedHours.toFixed(2));
                attRec.setValue('custrecord_hris_emp_atten_status', status);
               
                
               /*  if (allocation.emirate) {
                    attRec.setValue('custrecord_hris_daily_manual_emirate', allocation.emirate);
                } */

                // Reset all OT fields
              /*   attRec.setValue('custrecord_hris_daily_attendance_man_rot', 0);
                attRec.setValue('custrecord_hris_daily_atten_man_hot', 0);
                attRec.setValue('custrecord_hris_daily_attendance_man_wot', 0);
 
                if (otHours > 0) {
                    attRec.setValue(otField, otHours.toFixed(2));
                    log.debug("Step 11a", "OT Applied to " + otField);
                }*/

                // Log JSON for reference
                try {
                    attRec.setValue('custrecord_hris_letreq_resp_code', 200);
                    attRec.setValue('custrecord_hris_letreq_pros_sts', 2);
                    attRec.setValue('custrecord_hris_letreq_resp_status', 'Success');
                    attRec.setValue('custrecord_hris_letreq_json_data', JSON.stringify(item));
                } catch (e) {
                    log.error("Internal log field skip", e.message);
                }

                // 12. SAVE
                const savedId = attRec.save();
                log.audit("SUCCESS", "Record Internal ID: " + savedId);

                // Return status, message, and the internalId
                return { 
                    status: true, 
                    message: "Success",
                    internalId: savedId
                };

            } catch (e) {
                log.error(`Process Error Index ${index}`, e.name + ": " + e.message);
                return { status: false, message: e.name + ": " + e.message };
            }
        });
    };

    /**
     * Parses String into NetSuite DateTime Object
     */
    function parseToNetSuiteDateTime(dateTimeStr) {
        try {
            // Standardizing for format.parse
            try {
                return format.parse({ value: dateTimeStr, type: format.Type.DATETIME });
            } catch (e) {
                let fallback = dateTimeStr.replace("AM", "am").replace("PM", "pm");
                return format.parse({ value: fallback, type: format.Type.DATETIME });
            }
        } catch (err) {
            log.error("DateTime Parse Error", err.message);
            throw new Error(`Invalid DateTime format for: ${dateTimeStr}`);
        }
    }

    /**
     * Search for duplicate by Employee and Date
     */
    function findExistingAttendance(empId, dateObj) {
        const dateFormatted = format.format({ value: dateObj, type: format.Type.DATE });
        const attSearch = search.create({
            type: 'customrecord_hris_man_dailyattendance',
            filters: [
                ['custrecord_hris_man_daily_employee', 'anyof', empId],
                'AND', ['custrecord_hris_man_daily_attendate', 'on', dateFormatted]
            ]
        });
        const res = attSearch.run().getRange({ start: 0, end: 1 });
        return res.length > 0 ? res[0].id : null;
    }

    /**
     * Fetch Project Allocation Data
     */
    function getAllocationData(empId, dateObj) {
        const dateFormatted = format.format({ value: dateObj, type: format.Type.DATE });
        const allocSearch = search.create({
            type: 'customrecord_hris_empallocationtransfer',
            filters: [
                ['custrecord_hris_alloc_empid', 'anyof', empId],
                'AND', ['custrecord_hris_alloc_startdate', 'onorbefore', dateFormatted],
                'AND', ['custrecord_hris_alloc_actualenddate', 'onorafter', dateFormatted]
            ],
            columns: ['custrecord_hris_alloc_projectsegment', 'custrecord_njt_emp_allocation_project_se', 'custrecord_hris_employee_details_emirate']
        });
        const res = allocSearch.run().getRange({ start: 0, end: 1 });
        return res.length > 0 ? {
            project: res[0].getValue('custrecord_hris_alloc_projectsegment'),
            site: res[0].getValue('custrecord_njt_emp_allocation_project_se'),
            emirate: res[0].getValue('custrecord_hris_employee_details_emirate')
        } : null;
    }

    /**
     * Check Holiday Master
     */
    function checkHoliday(dateObj) {
        const dateFormatted = format.format({ value: dateObj, type: format.Type.DATE });
        const holidaySearch = search.create({
            type: 'customrecord_hris_holiday_master',
            filters: [['custrecord_hris_holiday_date', 'on', dateFormatted]]
        });
        return { isHoliday: holidaySearch.run().getRange({ start: 0, end: 1 }).length > 0 };
    }

    /**
     * Helper for Day Name
     */
    function getDayName(dt) {
        return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dt.getDay()];
    }

    return { post };
});