/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define([
  "N/log",
  "N/record",
  "N/query",
  "N/format",
  "./moment.js",
  "N/runtime",
], function (log, record, query, format, moment, runtime) {
  /**
   * Gets input data for the Map/Reduce script.
   * @param {Object} inputContext
   * @Since 2015.2
   */
  function getInputData(inputContext) {
    var transactionData = fetchTransactionData();
    return transactionData;
  }

  /**
   * Map stage: Processes each transaction data record.
   * @param {Object} mapContext
   * @Since 2015.2
   */
  function map(mapContext) {
    var mTran = JSON.parse(mapContext.value);
    log.audit("mTran", mTran);
    try {
      var empData = getEmployeeData(mTran.emp_code);
      log.debug("empData", empData);

      // Only proceed if a matching active employee was found via custentity_njt_bio_emp_id
      if (!empData.empId) {
        log.audit(
          "Skipped - No matching employee",
          "emp_code: " + mTran.emp_code + " has no active employee with custentity_njt_bio_emp_id set"
        );
        return;
      }

      var isBTranExists = isBioTranExists(mTran.id);
      if (!isBTranExists) {
        var result = {
          tranId: mTran.id,
          empCode: mTran.emp_code,
          empName:
            mTran.employee_name ||
            mTran.first_name + (mTran.last_name ? " " + mTran.last_name : ""),
          punchTime: mTran.punch_time,
          empId: empData.empId || "",
          entityId: empData.entityId || "",
          bioEmpId: mTran.emp, // Map the emp field from JSON for custrecord_njt_bio_emp_id
          terminalAlias: mTran.terminal_alias,
          terminalSn: mTran.terminal_sn,
          punchType: mTran.punch_type,
          bioDate: formatNSDate(mTran.punch_time),
          bioTime: formatNSTime(mTran.punch_time),
          biostageid:mTran.biostageid,
        };
        log.audit("result", result);
        mapContext.write({
          key: mTran.id,
          value: result,
        });
      }
    } catch (err) {
      log.error("ERROR in map stage for tran " + mTran.id, JSON.stringify(err));
    }
  }

  /**
   * Reduce stage: Creates custom records from mapped data.
   * @param {Object} reduceContext
   * @Since 2015.2
   */
  function reduce(reduceContext) {
     var values = reduceContext.values.map(JSON.parse);
     values.forEach(function (data) {
     try {
        var biostageid= data.biostageid;
         if (!biostageid) {
        throw 'biostageid missing';
      }
        log.emergency('reducebiostageid',biostageid)
     
        var objRecord = record.create({
          type: "customrecord_njt_daily_attendance_bio",
          isDynamic: true,
        });
        objRecord.setValue({
          fieldId: "custrecord_njt_trans_bio_id",
          value: data.tranId,
        });
        objRecord.setValue({
          fieldId: "custrecord_njt_bio_emp_code",
          value: data.empCode,
        });
       objRecord.setValue({
          fieldId: "custrecord_njt_bio_source",
          value: 1,
        });
        objRecord.setValue({
          fieldId: "custrecord_njt_bio_emp_name",
          value: data.empName,
        });
        objRecord.setValue({
          fieldId: "custrecord_njt_bio_punch_time",
          value: data.punchTime,
        });
        objRecord.setValue({
          fieldId: "custrecord_njt_bio_emp_id",
          value: data.bioEmpId,
        });
        objRecord.setValue({
          fieldId: "custrecord_njt_employee_name",
          value: data.empId,
        });
        objRecord.setValue({
          fieldId: "custrecord_njt_bio_location",
          value: data.terminalAlias,
        });
         objRecord.setValue({
          fieldId: "custrecord_njt_bio_sno",
          value: data.terminalSn,
        });
        objRecord.setValue({
          fieldId: "custrecord_njt_bio_punch_type",
          value: data.punchType,
        });
        objRecord.setValue({
          fieldId: "custrecord_njt_bio_date",
          value: format.parse({
            value: formatNSDate(data.punchTime),
            type: format.Type.DATE,
          }),
        });
        log.debug({
          title: "custrecord_njt_bio_time",
          details: formatNSTime(data.punchTime),
        });
        objRecord.setValue({
          fieldId: "custrecord_njt_bio_time",
          value: format.parse({
            value: formatNSTime(data.punchTime),
            type: format.Type.TIMEOFDAY,
          }),
        });
        var recordId = objRecord.save();
        log.debug("Record created", "ID: " + recordId);

      var updatedbiostageid=record.submitFields({
    type: 'customrecord_hris_biometric_staging',
    id: biostageid,
    values: {
        'custrecord_hris_biostage_processingsts': 2
    },
    options: {
        enableSourcing: false,
        ignoreMandatoryFields : true
    }
});
log.audit('updatedbiostageid',updatedbiostageid)
   
 } catch (err) {
        log.error(
          "ERROR in reduce stage for tran " + data.tranId,
          JSON.stringify(err)
        );
         var updatedbiostageid=record.submitFields({
    type: 'customrecord_hris_biometric_staging',
    id: data.biostageid,
    values: {
        'custrecord_hris_biostage_processingsts': 3,
        'custrecord_hris_biostage_processingerror':JSON.stringify(err)
    },
    options: {
        enableSourcing: false,
        ignoreMandatoryFields : true
    }
});
log.audit('updatedbiostageid Error',updatedbiostageid)
      }
    });

  }

  /**
   * Summarize stage: Logs any errors from map and reduce stages.
   * @param {Object} summaryContext
   * @Since 2015.2
   */
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
        log.debug(
          "No map errors",
          "No map errors found or mapErrors is not iterable"
        );
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
        log.debug(
          "No reduce errors",
          "No reduce errors found or reduceErrors is not iterable"
        );
      }
      log.debug("Summarize stage completed", "Processed all transactions");
    } catch (e) {
      log.error("ERROR in summarize stage", JSON.stringify(e));
    }
  }

  /**
   * Fetches transaction data from external source using dynamic dates and empCode.
   */
  function fetchTransactionData() {
    try {
      var stagesql =
        "select id, custrecord_hris_biostage_response from customrecord_hris_biometric_staging where custrecord_hris_biostage_responsestatus =1 and custrecord_hris_biostage_processingsts =1 and isinactive='F'";
      log.debug("stagesql", stagesql);
      var queryResult = query.runSuiteQL({ query: stagesql });
      var stagerecords = queryResult.asMappedResults();

      var transactionData = [];
      if (stagerecords.length > 0) {
        for (var i = 0; i < stagerecords.length; i++) {
          var stagerec = stagerecords[i];
          var responsedataarray = stagerec.custrecord_hris_biostage_response;
          var biostageid = stagerec.id;
          
          if (responsedataarray) {
            var dataArray = JSON.parse(responsedataarray);
            
            // FIX: If dataArray is a single object, wrap it in an array so the loop works
            if (!Array.isArray(dataArray)) {
                dataArray = [dataArray];
            }

            for (var j = 0; j < dataArray.length; j++) {
              var row = dataArray[j];

              // Mapping keys based on the response structure
              var punchTypeVal = (row.DeviceAliasName || "").trim().toUpperCase() === "IN" ? 1 : 2;
              transactionData.push({
                id: row.Id, 
                emp_code: row.BadgeNumber,
                first_name: row.EmployeeName || "",
                last_name: "",
                employee_name: row.EmployeeName || "",
                emp: row.BadgeNumber, 
                empId: "",
                entityId: "",
                punch_time: row.VerifyTime, 
                terminal_alias: row.GpslocationName || "", 
                terminal_sn: row.DeviceSerialNumber,    
                punch_type: punchTypeVal,
                biostageid: biostageid
              });
            }
          }
        }
      }
      log.audit("Fetched transaction data",  transactionData);
      log.debug("Fetched transaction data count", transactionData.length);
      return transactionData;
    } catch (e) {
      log.error("ERROR in fetchTransactionData", JSON.stringify(e));
      return [];
    }
  }

  /**
   * Retrieves employee data based on emp_code.
   * Only matches active employees that have custentity_njt_bio_emp_id populated with the given empCode.
   */
  function getEmployeeData(empCode) {
    var sql =
      "SELECT id, BUILTIN.DF(entityid) as entityid FROM employee WHERE isinactive = 'F' AND custentity_njt_bio_emp_id = '" +
      empCode +
      "'";
    var queryResult = query.runSuiteQL({ query: sql });
    var records = queryResult.asMappedResults();
    var empData = { empId: "", entityId: "" };
    if (records.length > 0) {
      empData.empId = records[0].id;
      empData.entityId = records[0].entityid;
    }
    return empData;
  }

  /**
   * Checks if a bio transaction already exists.
   */
  function isBioTranExists(biotranid) {
    var sql =
      "SELECT id FROM customrecord_njt_daily_attendance_bio WHERE isinactive='F' and custrecord_njt_trans_bio_id = '" +
      biotranid +
      "'";
    var queryResult = query.runSuiteQL({ query: sql });
    var records = queryResult.asMappedResults();
    return records.length > 0;
  }

  /**
   * Formats date for NetSuite (DD/MM/YYYY).
   */
  function formatNSDate(dt) {
    if(!dt) return "";
    var dtStr = dt.replace("T", " ");
    var dt1 = dtStr.split(" ")[0];
    var dd = dt1.split("-")[2];
    var mm = dt1.split("-")[1];
    var yy = dt1.split("-")[0];
    return dd + "/" + mm + "/" + yy;
  }

  /**
   * Formats time for NetSuite (HH:MM:SS).
   */
  function formatNSTime(dt) {
    if(!dt) return "";
    var dtStr = dt.replace("T", " ");
    var dt1 = dtStr.split(" ")[1];
    return dt1;
  }

  /**
   * Formats date and time for BioTime API (YYYY-MM-DD HH:MM:SS).
   */
  function formatBioDateTime(date, type) {
    var parsedDate = format.parse({ value: date, type: format.Type.DATE });
    var formattedDate = format.format({
      value: parsedDate,
      type: format.Type.DATETIME,
      timezone: format.Timezone.ASIA_MUSCAT,
    });
    var dtParts = formattedDate.split(" ");
    var datePart = dtParts[0].split("/");
    var dd = datePart[0];
    var mm = datePart[1];
    var yyyy = datePart[2];
    var timePart = type === "start" ? "00:01:01" : "23:59:01";
    return yyyy + "-" + mm + "-" + dd + " " + timePart;
  }

  return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize,
  };
});