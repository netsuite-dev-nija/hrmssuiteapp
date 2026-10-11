/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/format', 'N/log','N/query'], (record, format, log,query) => {

    /**
     * POST - Create Attendance Regularization Records
     */
    const post = (requestBody) => {
        // Log the start of the process and the received data
        log.audit("RESTlet Start", "Received Payload: " + JSON.stringify(requestBody));

        // 1. Basic validation: Ensure the payload is an array
        if (!Array.isArray(requestBody)) {
            log.error("Validation Error", "Request body is not an array");
            return { status: false, message: "Input must be an array of records." };
        }

        // Constants for metadata fields
        //const apiUrl = 'https://9691235.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=446&deploy=1';
        const apiUrl ='https://11951030.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=605&deploy=1';

        const apiMethod = 'POST';

        // Process each regularization object
        return requestBody.map((item, index) => {
            try {
                log.debug(`Index ${index}`, `--- Processing Employee: ${item.employee} ---`);

                // 2. Initialize the Regularization record in Dynamic mode
                log.debug("Step 2", "Initializing record creation: customrecord_hr_attend_regularization");
                const regRec = record.create({
                    type: 'customrecord_hr_attend_regularization',
                    isDynamic: true
                });

                // 3. Map IDs (Daily Attendance and Employee)
                log.debug("Step 3", `Mapping ID Link: ${item.id} and Employee: ${item.employee}`);
              //  regRec.setValue('custrecord_hr_attend_reg_daily_id', item.id);
                regRec.setValue('custrecord_hr_attend_reg_employee', item.employee);

                // 4. Parse and Map Date Fields (DD/MM/YYYY)
                if (item.date) {
                       var sqlQuery =
          "SELECT " +
          "custrecord_njt_emp_daily_date as date, " +
          "custrecord_njt_daily_atten_emp as employee, " +
          "custrecord_njt_emp_daily_in_time as intime, " +
          "custrecord_njt_emp_daily_out_time as outtime,custrecord_hris_shiftmaser as shift,custrecord_hris_emp_daily_nightshift as nightshift," +
          "id as internalid ,custrecord_njt_emp_daily_enddate as enddate " +
          "FROM " +
          "customrecord_njt_emp_daily_atten_ch " +
          "WHERE " +
          "custrecord_njt_emp_daily_date = '" +
         item.date +
          "' AND " +
          "custrecord_njt_daily_atten_emp = '" +
          item.employee +
          "'";
        log.debug("sqlQuery", sqlQuery);
        var results = query.runSuiteQL({
          query: sqlQuery,
        });

        var resultSet = results.asMappedResults();

        if (resultSet.length > 0) {
          var result = resultSet[0];
          var enddate = result.enddate || "";
          var nightshift = result.nightshift || "F";
           
          if (enddate != "") {
            var formatenddate = format.parse({
              value: enddate,
              type: format.Type.DATE,
            });
           regRec.setValue("custrecord_hr_attend_enddate", formatenddate);
          }

          regRec.setValue(
            "custrecord_hr_attend_reg_daily_id",
            result.internalid
          );
          /* if(result.intime){
            const timein = parseNSTime(result.intime);
            regRec.setValue("custrecord_hr_attend_reg_in_",timein);
          }
           if(result.outtime){
          const outtime = parseNSTime(result.outtime);
          regRec.setValue(
            "custrecord_hr_attend_reg_out_time",
            outtime
          );
           } */
         
            regRec.setValue("custrecord_hr_attend_reg_in_",result.intime);
         
         
          regRec.setValue(
            "custrecord_hr_attend_reg_out_time",
            result.outtime
          );
          
 
          
          
          regRec.setValue("custrecord_hr_attend_reg_shift", result.shift);
          //project set attendance reg
          regRec.setValue("custrecord_hris_attendance_reg_project",result.project);
          regRec.setValue("custrecord_hris_attendance_reg_pro_stage",result.stage);
          if (nightshift == "T") {
            var nightcheck = true;
          } else {
            var nightcheck = false;
          }
          regRec.setValue(
            "custrecord_hr_attend_reg_nightshift",
            nightcheck
          );
        }
      
                    const parsedDate = parseNSDate(item.date);
                    log.debug("Step 4a", "Setting Attendance Date: " + parsedDate);
                    regRec.setValue('custrecord_hr_attend_regular_date', parsedDate);
                  
                }

                if (item.regDate) {
                    const parsedRegDate = parseNSDate(item.regDate);
                    log.debug("Step 4b", "Setting Regularization Start/End Date: " + parsedRegDate);
                    regRec.setValue('custrecord_hr_attend_regularstartdate', parsedRegDate);
                    regRec.setValue('custrecord_hr_attend_regularenddate', parsedRegDate);
                }

                // 5. PARSE AND MAP TIME FIELDS
                // Original In Time
                if (item.intime && item.intime.trim() !== "") {
                    const inTimeObj = parseNSTime(item.intime);
                    log.debug("Step 5a", "Setting Original In-Time: " + item.intime);
                    //regRec.setValue('custrecord_hr_attend_regular_reg_in', inTimeObj);
                    regRec.setValue('custrecord_hr_attend_reg_in_', item.intime);
                } else {
                    log.debug("Step 5a", "intime is empty, skipping field assignment.");
                }

                // Original Out Time
                if (item.outtime && item.outtime.trim() !== "") {
                    const outTimeObj = parseNSTime(item.outtime);
                    log.debug("Step 5b", "Setting Original Out-Time: " + item.outtime);
                    //regRec.setValue('custrecord_hr_attend_regular_reg_out', outTimeObj);
                     regRec.setValue('custrecord_hr_attend_reg_out_time', item.outtime);
                } else {
                    log.debug("Step 5b", "outtime is empty, skipping field assignment.");
                }

                // Regularized In Time
                if (item.regin && item.regin.trim() !== "") {
                    const regInObj = parseNSTime(item.regin);
                    log.debug("Step 5c", "Setting Reg-In Time: " + item.regin);
                    //regRec.setValue('custrecord_hr_attend_regular_reg_in', regInObj);
                     regRec.setValue('custrecord_hr_attend_regular_reg_in', item.regin);

                }

                // Regularized Out Time
                if (item.regout && item.regout.trim() !== "") {
                    const regOutObj = parseNSTime(item.regout);
                    log.debug("Step 5d", "Setting Reg-Out Time: " + item.regout);
                    //regRec.setValue('custrecord_hr_attend_regular_reg_out', regOutObj);
                    regRec.setValue('custrecord_hr_attend_regular_reg_out', item.regout);
                }
                 if (item.regin != "" && item.regout != "") {
         /*  var totalWorkingHours = calculateHoursDiffdecimal(
            formatregularworkstartdate,
            regularIn,
            formatregularworkenddate,
            regularOut
          ); */
          var totalWorkingHours = calculateHoursDiffdecimal(
            item.regDate,
            item.regin,
            item.regDate,
            item.regout
          );
          log.debug("totalWorkingHours", totalWorkingHours);
          regRec.setValue(
            "custrecord_hr_attend_reg_hours",
            totalWorkingHours.toFixed(2)
          );
        }

                // --- START METADATA FIELD UPDATES ---
                regRec.setValue('custrecord_hr_attend_regular_respons_cod', 200);
                regRec.setValue('custrecord_hr_attend_regular_pros_status', 2);
                regRec.setValue('custrecord_hr_attend_regular_respons_sts', 'Success');
                regRec.setValue('custrecord_hr_attend_regular_msg', 'Record created successfully');
                regRec.setValue('custrecord_hr_attend_regular_api_url', apiUrl);
                regRec.setValue('custrecord_hr_attend_regular_api_mthod', apiMethod);
                regRec.setValue('custrecord_hr_attend_regular_json_data', JSON.stringify(item));
                // --- END METADATA FIELD UPDATES ---

                // 6. Save the record
                log.debug("Step 6", "Saving the regularization record...");
                const recordId = regRec.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });

                log.audit("Step 7 SUCCESS", "Record Created with Internal ID: " + recordId);

                // 7. Success Response (Keeping your original structure)
                return {
                    status: true,
                    message: "Success",
                    internalId: recordId
                };

            } catch (e) {
                log.error(`Process Error Index ${index}`, e.name + ": " + e.message);
                return {
                    status: false,
                    message: e.name + ": " + e.message
                };
            }
        });
    };

    /**
     * Helper: Convert Date String (DD/MM/YYYY) to NetSuite Date Object
     */
    function parseNSDate(dateString) {
        return format.parse({
            value: dateString,
            type: format.Type.DATE
        });
    }

    /**
     * Helper: Convert Time String (e.g., "9:00 am") to NetSuite Time Object
     * Using TIMEOFDAY ensures only the time is extracted and stored.
     */
    function parseNSTime(timeString) {
        try {
            log.debug("parseNSTime Utility", "Parsing value: " + timeString);
            return format.parse({
                value: timeString.toLowerCase(), // Ensure lowercase am/pm
                type: format.Type.TIMEOFDAY
            });
        } catch (err) {
            log.error("Time Parse Error", "Failed to parse: " + timeString);
            throw err;
        }
    }

    return { post };
});
function calculateHoursDiffdecimal(startDate, startTime, endDate, endTime) {
  function parseDateTime(dateStr, timeStr) {
    // dateStr = "15/06/2025"
    var parts = dateStr.split("/");
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1; // JS month 0-11
    var year = parseInt(parts[2], 10);

    // timeStr = "10:47 AM"
    var timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeParts) throw new Error("Invalid time format: " + timeStr);

    var hour = parseInt(timeParts[1], 10);
    var minute = parseInt(timeParts[2], 10);
    var ampm = timeParts[3].toUpperCase();

    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;

    return new Date(year, month, day, hour, minute, 0, 0);
  }

  var start = parseDateTime(startDate, startTime);
  var end = parseDateTime(endDate, endTime);

  var diffHours = (end - start) / (1000 * 60 * 60);
  return diffHours;
}