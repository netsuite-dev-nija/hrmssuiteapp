/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 *
 * Script  : hris_createbiometricstaging_mrs.js
 * Purpose : TEST DATA GENERATOR — Creates customrecord_hris_biometric_staging
 *           records for every day in the hardcoded TARGET_MONTH below.
 *           Each record stores:
 *             - custrecord_hris_biostage_date           → the day's date
 *             - custrecord_hris_biostage_requestapi     → "POST"
 *             - custrecord_hris_biostage_response       → single punch JSON object
 *             - custrecord_hris_biostage_responsestatus → 1 (ready for processing)
 *             - custrecord_hris_biostage_processingsts  → 1 (pending)
 *
 * One staging record is created per punch event (not per day).
 * For 4 sample punches per day × 30 days = 120 staging records for a month.
 *
 * ► To change the test month: update TARGET_MONTH in getInputData() below.
 */
define(["N/log", "N/record", "N/format"], function (
  log,
  record,
  format
) {
  // ---------------------------------------------------------------------------
  // Helper: pad a number to two digits
  // ---------------------------------------------------------------------------
  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  // ---------------------------------------------------------------------------
  // Helper: return the number of days in a given year/month (1-based)
  // ---------------------------------------------------------------------------
  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate(); // month is 1-based here
  }

  // ---------------------------------------------------------------------------
  // Helper: build a date string "YYYY-MM-DD" from year, month(1-based), day
  // ---------------------------------------------------------------------------
  function buildDateStr(year, month, day) {
    return year + "-" + pad2(month) + "-" + pad2(day);
  }

  // ---------------------------------------------------------------------------
  // Helper: build the sample JSON array of punch records for a given date.
  // In a real integration this would come from a BioTime API call; here we
  // generate representative sample data so each staging record is self-contained.
  // ---------------------------------------------------------------------------
  function buildSamplePunchData(dateStr) {
    return [
      {
        Id: "TXN-" + dateStr.replace(/-/g, "") + "-001",
        BadgeNumber: "EMP001",
        EmployeeName: "Florence Nijatech",
        VerifyTime: dateStr + "T08:05:32",
        GpslocationName: "Main Gate",
        DeviceSerialNumber: "BIO-SN-12345",
        DeviceAliasName: "IN",
      },
      {
        Id: "TXN-" + dateStr.replace(/-/g, "") + "-002",
        BadgeNumber: "EMP001",
        EmployeeName: "Florence Nijatech",
        VerifyTime: dateStr + "T17:30:15",
        GpslocationName: "Main Gate",
        DeviceSerialNumber: "BIO-SN-12345",
        DeviceAliasName: "OUT",
      },
      {
        Id: "TXN-" + dateStr.replace(/-/g, "") + "-003",
        BadgeNumber: "EMP002",
        EmployeeName: "James Alderton",
        VerifyTime: dateStr + "T08:12:00",
        GpslocationName: "Side Entrance",
        DeviceSerialNumber: "BIO-SN-67890",
        DeviceAliasName: "IN",
      },
      {
        Id: "TXN-" + dateStr.replace(/-/g, "") + "-004",
        BadgeNumber: "EMP002",
        EmployeeName: "James Alderton",
        VerifyTime: dateStr + "T17:45:00",
        GpslocationName: "Side Entrance",
        DeviceSerialNumber: "BIO-SN-67890",
        DeviceAliasName: "OUT",
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // getInputData – generate one entry per day of the hardcoded target month
  // ► CHANGE TARGET_MONTH HERE before each test run (format: "YYYY-MM")
  // ---------------------------------------------------------------------------
  function getInputData(inputContext) {
    try {
      var TARGET_MONTH = "2024-09"; // ← edit this to the month you want to test

      var parts = TARGET_MONTH.split("-");
      var year  = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10); // 1-based

      var totalDays = daysInMonth(year, month);
      log.audit(
        "getInputData",
        "Test data target month: " + TARGET_MONTH + " (" + totalDays + " days)"
      );

      var inputItems = [];
      for (var day = 1; day <= totalDays; day++) {
        var dateStr = buildDateStr(year, month, day);
        inputItems.push({
          dateStr: dateStr,
          year: year,
          month: month,
          day: day,
        });
      }

      return inputItems;
    } catch (e) {
      log.error("ERROR in getInputData", JSON.stringify(e));
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // map – pass each day directly to reduce (key = dateStr)
  // ---------------------------------------------------------------------------
  function map(mapContext) {
    try {
      var item = JSON.parse(mapContext.value);
      log.debug("map – processing date", item.dateStr);

      mapContext.write({
        key: item.dateStr,
        value: item,
      });
    } catch (e) {
      log.error("ERROR in map stage", JSON.stringify(e));
    }
  }

  // ---------------------------------------------------------------------------
  // reduce – create ONE customrecord_hris_biometric_staging record per punch.
  //          Each record stores a single JSON object (not an array) in
  //          custrecord_hris_biostage_response.
  // ---------------------------------------------------------------------------
  function reduce(reduceContext) {
    var dateStr = reduceContext.key;
    try {
      var item = JSON.parse(reduceContext.values[0]);

      // Parse the date for the NetSuite date field (shared across all punches)
      var nsDate = format.parse({
        value: item.day + "/" + pad2(item.month) + "/" + item.year, // DD/MM/YYYY
        type: format.Type.DATE,
      });

      // Get the list of sample punches for this date
      var punches = buildSamplePunchData(dateStr);

      // Create ONE staging record per punch (single JSON object per record)
      for (var i = 0; i < punches.length; i++) {
        var singlePunch = punches[i];

        var stagingRecord = record.create({
          type: "customrecord_hris_biometric_staging",
          isDynamic: true,
        });

        // Date field
        stagingRecord.setValue({
          fieldId: "custrecord_hris_biostage_date",
          value: nsDate,
        });

        // Request API method
        stagingRecord.setValue({
          fieldId: "custrecord_hris_biostage_requestapi",
          value: "POST",
        });

        // Single punch JSON object (NOT an array)
        stagingRecord.setValue({
          fieldId: "custrecord_hris_biostage_response",
          value: JSON.stringify(singlePunch),
        });

        // Response status → 1 = Success / Ready
        stagingRecord.setValue({
          fieldId: "custrecord_hris_biostage_responsestatus",
          value: 1,
        });

        // Processing status → 1 = Pending
        stagingRecord.setValue({
          fieldId: "custrecord_hris_biostage_processingsts",
          value: 1,
        });

        var newId = stagingRecord.save({
          enableSourcing: false,
          ignoreMandatoryFields: true,
        });

        log.audit(
          "reduce – staging record created",
          "Date: " + dateStr +
            " | Punch ID: " + singlePunch.Id +
            " | Badge: " + singlePunch.BadgeNumber +
            " | Staging ID: " + newId
        );
      }

    } catch (e) {
      log.error(
        "ERROR in reduce stage for date " + dateStr,
        JSON.stringify(e)
      );
    }
  }

  // ---------------------------------------------------------------------------
  // summarize – log map/reduce errors
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
      }

      if (
        summaryContext.reduceErrors &&
        typeof summaryContext.reduceErrors.iterator === "function"
      ) {
        summaryContext.reduceErrors.iterator().each(function (key, error) {
          log.error("Reduce Error for key: " + key, JSON.stringify(error));
          return true;
        });
      }

      log.audit(
        "summarize",
        "Biometric staging creation complete. Input stage duration (seconds): " +
          summaryContext.inputSummary.seconds
      );
    } catch (e) {
      log.error("ERROR in summarize stage", JSON.stringify(e));
    }
  }

  return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize,
  };
});
