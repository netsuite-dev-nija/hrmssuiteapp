/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 *
 * Script  : hris_postingstagetobiometricintegration_mrs.js
 * Purpose : Reads pending customrecord_hris_biometric_staging records and
 *           creates individual customrecord_njt_daily_attendance_bio records
 *           for every punch item (supporting multiple punch-ins and punch-outs per day).
 *
 * Logic:
 *   getInputData → reads each staging record and expands its JSON punch array
 *                  into individual punch items.
 *   map          → writes each individual punch item with a unique key so every
 *                  punch creates its own attendance record.
 *   reduce       → for each punch item:
 *                  - creates customrecord_njt_daily_attendance_bio
 *                  - marks the staging record as processed (status 2)
 *                  - on error marks staging record as failed (status 3)
 */
define(["N/log", "N/record", "N/query", "N/format"], function (
  log,
  record,
  query,
  format
) {
  // Day names indexed by Date.getDay() (0 = Sunday)
  var DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // ---------------------------------------------------------------------------
  // getInputData – expand staging records into individual punch items
  // ---------------------------------------------------------------------------
  function getInputData(inputContext) {
    return fetchTransactionData();
  }

  // ---------------------------------------------------------------------------
  // map – write each punch with a unique key so every punch is processed separately
  // ---------------------------------------------------------------------------
  function map(mapContext) {
    var item = JSON.parse(mapContext.value);
    log.audit("map – punch item", item);
    try {
      if (!item.emp_code || !item.verify_time) {
        log.audit("map – skipped (missing emp_code or verify_time)", item);
        return;
      }
      // Use a unique key per punch item to ensure multiple punches per day are not grouped or overwritten
      mapContext.write({
        key: item.emp_code + "|" + item.verify_time + "|" + item.biostageid + "|" + Math.random(),
        value: item,
      });
    } catch (err) {
      log.error("ERROR in map stage", JSON.stringify(err));
    }
  }

  // ---------------------------------------------------------------------------
  // reduce – create an attendance record for each individual punch item
  // ---------------------------------------------------------------------------
  function reduce(reduceContext) {
    var key = reduceContext.key;
    var punches = reduceContext.values.map(JSON.parse);
    var punch = punches[0];

    if (!punch) return;

    var empCode = punch.emp_code;
    var dateStr = punch.date_str; // "YYYY-MM-DD"
    var verifyTime = punch.verify_time;

    try {
      // ------------------------------------------------------------------
      // 1. Resolve employee in NetSuite
      // ------------------------------------------------------------------
      var empData = getEmployeeData(empCode);
      if (!empData.empId) {
        log.audit(
          "reduce – skipped (no matching employee)",
          "emp_code: " + empCode + " has no active employee with custentity_njt_bio_emp_id set"
        );
        return;
      }

      // ------------------------------------------------------------------
      // 2. Parse date and time for NetSuite field types
      // ------------------------------------------------------------------
      var nsDate = format.parse({
        value: formatNSDate(verifyTime), // DD/MM/YYYY
        type: format.Type.DATE,
      });

      // Time string in "H:MM am/pm" format
      var timeAmPm = toAmPm(formatNSTime(verifyTime)); // e.g. "5:45 pm"

      // ------------------------------------------------------------------
      // 3. Create customrecord_njt_daily_attendance_bio for this punch
      // ------------------------------------------------------------------
      var tsRecord = record.create({
        type: "customrecord_njt_daily_attendance_bio",
        isDynamic: true,
      });

      // Date of attendance (biodate)
      tsRecord.setValue({
        fieldId: "custrecord_njt_bio_date",
        value: nsDate,
      });

      // Employee ID (employeeid)
      tsRecord.setValue({
        fieldId: "custrecord_njt_bio_emp_id",
        value: empData.empId,
      });

      // Employee (employee record reference)
      tsRecord.setValue({
        fieldId: "custrecord_njt_employee_name",
        value: empData.empId,
      });

      // Employee code bio (Badge number)
      tsRecord.setValue({
        fieldId: "custrecord_njt_bio_emp_code",
        value: empCode,
      });

      // Employee name bio
      tsRecord.setValue({
        fieldId: "custrecord_njt_bio_emp_name",
        value: punch.employee_name || "",
      });

      // Bio time – TIMEOFDAY field type requires format.parse
      var parsedTime = format.parse({
        value: timeAmPm,
        type: format.Type.TIMEOFDAY,
      });
      tsRecord.setValue({
        fieldId: "custrecord_njt_bio_time",
        value: parsedTime,
      });

      // Punch time – formatted as "YYYY-MM-DD HH:MM:SS" (e.g. "2024-09-26 17:45:00")
      var punchTimeFormatted = verifyTime ? verifyTime.replace("T", " ") : "";
      tsRecord.setValue({
        fieldId: "custrecord_njt_bio_punch_time",
        value: punchTimeFormatted,
      });

      // Punch type (1 for IN, 2 for OUT based on PunchType, State, or DeviceAliasName)
      var punchTypeVal = 1;
      if (punch.punch_type) {
        var ptStr = String(punch.punch_type).trim().toUpperCase();
        if (ptStr === "OUT" || ptStr === "2" || ptStr === "EXIT") {
          punchTypeVal = 2;
        } else {
          punchTypeVal = parseInt(punch.punch_type, 10) === 2 ? 2 : 1;
        }
      }
      tsRecord.setValue({
        fieldId: "custrecord_njt_bio_punch_type",
        value: punchTypeVal,
      });

      // Total working hours (0 for individual punch rows)
      tsRecord.setValue({
        fieldId: "custrecord_njt_bio_totalwh",
        value: 0,
      });

      // Source
      tsRecord.setValue({
        fieldId: "custrecord_njt_bio_source",
        value: 1,
      });

      // Staging record ID linking back
      tsRecord.setValue({
        fieldId: "custrecord_hris_stage_bio_id",
        value: punch.biostageid || "",
      });
      tsRecord.setValue({
        fieldId: "custrecord_njt_trans_bio_id",
        value: punch.biostageid || "",
      });

      // Location / Biolocation
      if (punch.location) {
        tsRecord.setValue({
          fieldId: "custrecord_njt_bio_location",
          value: punch.location,
        });
      }

      // Bio SNo (Device Serial Number / Serial No)
      if (punch.sno) {
        tsRecord.setValue({
          fieldId: "custrecord_njt_bio_sno",
          value: punch.sno,
        });
      }

      var newId = tsRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: true,
      });

      log.audit(
        "reduce – attendance record created",
        "ID: " + newId +
          " | Emp: " + empCode +
          " | Date: " + dateStr +
          " | Time: " + timeAmPm +
          " | Punch Time: " + punchTimeFormatted +
          " | Type: " + punchTypeVal
      );

      // ------------------------------------------------------------------
      // 4. Mark referenced staging record as Processed (status = 2)
      // ------------------------------------------------------------------
      if (punch.biostageid) {
        var updId = record.submitFields({
          type: "customrecord_hris_biometric_staging",
          id: punch.biostageid,
          values: { custrecord_hris_biostage_processingsts: 2 },
          options: { enableSourcing: false, ignoreMandatoryFields: true },
        });
        log.audit("reduce – staging marked processed", "biostageid: " + punch.biostageid + " → " + updId);
      }

    } catch (err) {
      log.error(
        "ERROR in reduce stage for key " + key,
        JSON.stringify(err)
      );

      // Mark staging record as Failed (status = 3)
      if (punch.biostageid) {
        record.submitFields({
          type: "customrecord_hris_biometric_staging",
          id: punch.biostageid,
          values: {
            custrecord_hris_biostage_processingsts: 3,
            custrecord_hris_biostage_processingerror: JSON.stringify(err),
          },
          options: { enableSourcing: false, ignoreMandatoryFields: true },
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // summarize – log any map / reduce errors
  // ---------------------------------------------------------------------------
  function summarize(summaryContext) {
    try {
      if (
        summaryContext.mapErrors &&
        typeof summaryContext.mapErrors.iterator === "function"
      ) {
        summaryContext.mapErrors.iterator().each(function (key, error) {
          log.error("Map Error for key: " + key, JSON.stringify(error));
          return true;
        });
      } else {
        log.debug("No map errors", "No map errors found or mapErrors is not iterable");
      }

      if (
        summaryContext.reduceErrors &&
        typeof summaryContext.reduceErrors.iterator === "function"
      ) {
        summaryContext.reduceErrors.iterator().each(function (key, error) {
          log.error("Reduce Error for key: " + key, JSON.stringify(error));
          return true;
        });
      } else {
        log.debug("No reduce errors", "No reduce errors found or reduceErrors is not iterable");
      }

      log.audit("summarize", "Daily attendance creation completed.");
    } catch (e) {
      log.error("ERROR in summarize stage", JSON.stringify(e));
    }
  }

  // ---------------------------------------------------------------------------
  // fetchTransactionData
  // Reads pending staging records and expands each JSON punch array into
  // individual punch objects ready for the map stage.
  // ---------------------------------------------------------------------------
  function fetchTransactionData() {
    try {
      var stagesql =
        "SELECT id, custrecord_hris_biostage_response " +
        "FROM customrecord_hris_biometric_staging " +
        "WHERE custrecord_hris_biostage_responsestatus = 1 " +
        "  AND custrecord_hris_biostage_processingsts = 1 " +
        "  AND isinactive = 'F'";

      log.debug("fetchTransactionData – SQL", stagesql);

      var queryResult = query.runSuiteQL({ query: stagesql });
      var stagerecords = queryResult.asMappedResults();

      var transactionData = [];

      for (var i = 0; i < stagerecords.length; i++) {
        var stagerec = stagerecords[i];
        var biostageid = stagerec.id;
        var responsedataarray = stagerec.custrecord_hris_biostage_response;

        if (!responsedataarray) continue;

        var dataArray = JSON.parse(responsedataarray);

        // Support both single object and array responses
        if (!Array.isArray(dataArray)) {
          dataArray = [dataArray];
        }

        for (var j = 0; j < dataArray.length; j++) {
          var row = dataArray[j];
          var verifyTime = row.VerifyTime || "";
          // Extract "YYYY-MM-DD" from "YYYY-MM-DDTHH:MM:SS"
          var dateStr = verifyTime ? verifyTime.split("T")[0] : "";

          transactionData.push({
            biostageid:    biostageid,
            emp_code:      row.BadgeNumber        || "",
            employee_name: row.EmployeeName       || "",
            verify_time:   verifyTime,
            date_str:      dateStr,
            location:      row.Location         || row.LocationName || "",
            sno:           row.DeviceSerialNumber || row.SNo || row.SerialNumber || "",
            punch_type:    row.DeviceAliasName  || row.PunchType    || row.State        || ""
          });
        }
      }

      log.audit(
        "fetchTransactionData – complete",
        "Staging records: " + stagerecords.length +
          " | Total punch items: " + transactionData.length
      );

      return transactionData;
    } catch (e) {
      log.error("ERROR in fetchTransactionData", JSON.stringify(e));
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // getEmployeeData – looks up active employee by biometric badge number
  // ---------------------------------------------------------------------------
  function getEmployeeData(empCode) {
    var sql =
      "SELECT id, BUILTIN.DF(entityid) AS entityid " +
      "FROM employee " +
      "WHERE isinactive = 'F' " +
      "  AND custentity_njt_bio_emp_id = '" + empCode + "'";

    var queryResult = query.runSuiteQL({ query: sql });
    var records = queryResult.asMappedResults();
    var empData = { empId: "", entityId: "" };

    if (records.length > 0) {
      empData.empId    = records[0].id;
      empData.entityId = records[0].entityid;
    }
    return empData;
  }

  // ---------------------------------------------------------------------------
  // formatNSDate – converts "YYYY-MM-DDTHH:MM:SS" → "DD/MM/YYYY"
  // ---------------------------------------------------------------------------
  function formatNSDate(dt) {
    if (!dt) return "";
    var dt1 = dt.replace("T", " ").split(" ")[0];
    var parts = dt1.split("-");
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  // ---------------------------------------------------------------------------
  // formatNSTime – extracts "HH:MM:SS" from "YYYY-MM-DDTHH:MM:SS"
  // ---------------------------------------------------------------------------
  function formatNSTime(dt) {
    if (!dt) return "";
    return dt.replace("T", " ").split(" ")[1];
  }

  // ---------------------------------------------------------------------------
  // toAmPm – converts "HH:MM:SS" (24-hour) → "H:MM am/pm" (12-hour)
  // NetSuite format.parse(TIMEOFDAY) expects 12-hour am/pm format.
  // ---------------------------------------------------------------------------
  function toAmPm(timeStr) {
    if (!timeStr) return "";
    var parts = timeStr.split(":");
    var hours   = parseInt(parts[0], 10);
    var minutes = parts[1] || "00";
    var ampm    = hours >= 12 ? "pm" : "am";
    var h12     = hours % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ":" + minutes + " " + ampm;
  }

  return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize,
  };
});