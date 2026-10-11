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
     try {
    var values = reduceContext.values.map(JSON.parse);
    values.forEach(function (data) {
        
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
    });
   
 } catch (err) {
        log.error(
          "ERROR in reduce stage for tran " + data.tranId,
          JSON.stringify(err)
        );
         var updatedbiostageid=record.submitFields({
    type: 'customrecord_hris_biometric_staging',
    id: biostageid,
    values: {
        'custrecord_hris_biostage_processingsts': 3,
        'custrecord_hris_biostage_processingerror':JSON.stringify(err)
    },
    options: {
        enableSourcing: false,
        ignoreMandatoryFields : true
    }
});
log.audit('updatedbiostageid',updatedbiostageid)
      }

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
      // Retrieve script parameters
         var scriptParams = runtime.getCurrentScript().getParameter({ name: 'custscript_hris_stagingemp' });
    log.debug({ title: 'Script Parameters', details: scriptParams });
var params;
params = JSON.parse(scriptParams);
var param = params[0]; // Assuming single object as per provided format
  //  var biodate = param.biodate
    var fromdate = param.fromdate;
    var todate = param.todate;
    var subsidiary = param.subsidiary
      /*   var scriptObj = runtime.getCurrentScript();
            var fromDate = scriptObj.getParameter({ name: 'custscript_from_date' });
            var toDate = scriptObj.getParameter({ name: 'custscript_to_date' });
        */   

            if (!fromdate || !todate) {
                throw new Error('From Date and To Date are required parameters.');
            }
      var stagesql =
        "select * from customrecord_hris_biometric_staging where custrecord_hris_biostage_responsestatus =1 and \
        custrecord_hris_biostage_processingsts =1 and isinactive='F'AND TO_CHAR(custrecord_hris_biostage_date,'DD/MM/YYYY') \
BETWEEN '"+fromdate+"' AND '"+todate+"'";
      log.debug("stagesql", stagesql);
      var queryResult = query.runSuiteQL({ query: stagesql });
      var stagerecords = queryResult.asMappedResults();

      var transactionData = [];
      if (stagerecords.length > 0) {
        for (var i = 0; i < stagerecords.length; i++) {
          var stagerec = stagerecords[i];
          var responsedataarray = stagerec.custrecord_hris_biostage_response;
          var biostageid = stagerec.id;
          log.emergency("responsedataarray", responsedataarray);
          log.emergency('biostageid',biostageid);
          if (responsedataarray) {
            var dataArray = JSON.parse(responsedataarray);

            for (var j = 0; j< dataArray.length; j++) {
              var row = dataArray[j];

              
            //  log.audit("row.id", row.id);
              /* var transactionData = {
                id: row.id,
                emp_code: row.emp_code,

                first_name: row.first_name || "",
                last_name: row.last_name || "",
                employee_name: (
                  (row.first_name || "") +
                  " " +
                  (row.last_name || "")
                ).trim(),

                emp: row.emp, // Employee internal ID from biometric JSON
                empId: row.empId || "",
                entityId: row.entityId || "",

                punch_time: row.punch_time,

                terminal_alias: row.terminal_alias,
                terminal_sn: row.terminal_sn,
              }; */
              transactionData.push({
                id: row.id,
                emp_code: row.emp_code,

                first_name: row.first_name || "",
                last_name: row.last_name || "",
                employee_name: (
                  (row.first_name || "") +
                  " " +
                  (row.last_name || "")
                ).trim(),

                emp: row.emp, // Employee internal ID from biometric JSON
                empId: row.empId || "",
                entityId: row.entityId || "",

                punch_time: row.punch_time,

                terminal_alias: row.terminal_alias,
                terminal_sn: row.terminal_sn,
                biostageid:biostageid

});

            }

          }
        }
      }
log.audit("Fetched transaction data",  transactionData);
      log.debug("Fetched transaction data", "Count: " + transactionData.length);
      return transactionData;
    } catch (e) {
      log.error("ERROR in fetchTransactionData", JSON.stringify(e));
      return [];
    }
  }

  /**
   * Retrieves employee data based on emp_code.
   */
  function getEmployeeData(empCode) {
    var sql =
      "SELECT id, BUILTIN.DF(entityid) FROM employee WHERE custentity_njt_bio_emp_id = '" +
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
    log.debug("isBioTranExistssql", sql);
    var queryResult = query.runSuiteQL({ query: sql });
    var records = queryResult.asMappedResults();
    return records.length > 0;
  }

  /**
   * Formats date for NetSuite (DD/MM/YYYY).
   */
  function formatNSDate(dt) {
    var dt1 = dt.split(" ")[0];
    var dd = dt1.split("-")[2];
    var mm = dt1.split("-")[1];
    var yy = dt1.split("-")[0];
    log.debug("formatNSDate", { dt: dt1, dd: dd, mm: mm, yy: yy });
    return dd + "/" + mm + "/" + yy;
  }

  /**
   * Formats time for NetSuite (HH:MM:SS).
   */
  function formatNSTime(dt) {
    var dt1 = dt.split(" ")[1];
    log.debug("formatNSTime", { dt: dt1 });
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
