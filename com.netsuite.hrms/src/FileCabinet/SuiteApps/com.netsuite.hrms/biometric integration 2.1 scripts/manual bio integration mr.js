/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['./manual bio integration cs.js', 'N/log', 'N/record', 'N/query', 'N/format', './moment.js', 'N/runtime'],
function(httpClient, log, record, query, format, moment, runtime) {
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
        try {
            var empData = getEmployeeData(mTran.emp_code);
            log.debug("empData", empData);
            var isBTranExists = isBioTranExists(mTran.id);
            if (!isBTranExists) {
                var result = {
                    tranId: mTran.id,
                    empCode: mTran.emp_code,
                    empName: mTran.employee_name || (mTran.first_name + (mTran.last_name ? ' ' + mTran.last_name : '')),
                    punchTime: mTran.punch_time,
                    empId: empData.empId || '',
                    entityId: empData.entityId || '',
                    bioEmpId: mTran.emp, // Map the emp field from JSON for custrecord_njt_bio_emp_id
                    terminalAlias: mTran.terminal_alias,
                    terminalSn: mTran.terminal_sn,
                    bioDate: formatNSDate(mTran.punch_time),
                    bioTime: formatNSTime(mTran.punch_time)
                };
                mapContext.write({
                    key: mTran.id,
                    value: result
                });
            }
        } catch (err) {
            log.error('ERROR in map stage for tran ' + mTran.id, JSON.stringify(err));
        }
    }

    /**
     * Reduce stage: Creates custom records from mapped data.
     * @param {Object} reduceContext
     * @Since 2015.2
     */
    function reduce(reduceContext) {
        var values = reduceContext.values.map(JSON.parse);
        values.forEach(function(data) {
            try {
                var objRecord = record.create({
                    type: 'customrecord_njt_daily_attendance_bio',
                    isDynamic: true
                });
                objRecord.setValue({ fieldId: 'custrecord_njt_trans_bio_id', value: data.tranId });
                objRecord.setValue({ fieldId: 'custrecord_njt_bio_emp_code', value: data.empCode });
                objRecord.setValue({ fieldId: 'custrecord_njt_bio_emp_name', value: data.empName });
                objRecord.setValue({ fieldId: 'custrecord_njt_bio_punch_time', value: data.punchTime });
                objRecord.setValue({ fieldId: 'custrecord_njt_bio_emp_id', value: data.bioEmpId });
                objRecord.setValue({ fieldId: 'custrecord_njt_employee_name', value: data.empId });
                objRecord.setValue({ fieldId: 'custrecord_njt_bio_location', value: data.terminalAlias });
                objRecord.setValue({ fieldId: 'custrecord_njt_bio_sno', value: data.terminalSn });
                objRecord.setValue({
                    fieldId: 'custrecord_njt_bio_date',
                    value: format.parse({ value: formatNSDate(data.punchTime), type: format.Type.DATE })
                });
                log.debug({
                    title: 'custrecord_njt_bio_time',
                    details: formatNSTime(data.punchTime)
                });
                objRecord.setValue({
                    fieldId: 'custrecord_njt_bio_time',
                    value: format.parse({ value: formatNSTime(data.punchTime), type: format.Type.TIMEOFDAY })
                });
                var recordId = objRecord.save();
                log.debug('Record created', 'ID: ' + recordId);
            } catch (err) {
                log.error('ERROR in reduce stage for tran ' + data.tranId, JSON.stringify(err));
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
            if (summaryContext.mapErrors && typeof summaryContext.mapErrors.iterator === 'function') {
                summaryContext.mapErrors.iterator().each(function(key, error) {
                    log.error('Map Error for key: ' + key, JSON.stringify(error));
                    return true;
                });
            } else {
                log.debug('No map errors', 'No map errors found or mapErrors is not iterable');
            }
            if (summaryContext.reduceErrors && typeof summaryContext.reduceErrors.iterator === 'function') {
                summaryContext.reduceErrors.iterator().each(function(key, error) {
                    log.error('Reduce Error for key: ' + key, JSON.stringify(error));
                    return true;
                });
            } else {
                log.debug('No reduce errors', 'No reduce errors found or reduceErrors is not iterable');
            }
            log.debug('Summarize stage completed', 'Processed all transactions');
        } catch (e) {
            log.error('ERROR in summarize stage', JSON.stringify(e));
        }
    }

    /**
     * Fetches transaction data from external source using dynamic dates and empCode.
     */
    function fetchTransactionData() {
        try {
            // Retrieve script parameters
            var scriptObj = runtime.getCurrentScript();
            var fromDate = scriptObj.getParameter({ name: 'custscript_from_date_' });
            var toDate = scriptObj.getParameter({ name: 'custscript_to_date_' });
            var empCode = scriptObj.getParameter({ name: 'custscript_emp_code_' });

            if (!fromDate || !toDate) {
                throw new Error('From Date and To Date are required parameters.');
            }
            if (!empCode) {
                log.debug('empCode', 'No employee code provided, proceeding without emp_code filter');
                empCode = ''; // Allow empty empCode if not provided
            }

            // Format dates to YYYY-MM-DD HH:MM:SS
            var startDateAndTime = formatBioDateTime(fromDate, 'start');
            var endDateAndTime = formatBioDateTime(toDate, 'end');

            var requestObject = {
                "start_time": startDateAndTime,
                "end_time": endDateAndTime,
                "emp_code": empCode
            };
            var transactionData = [];
            var pgno = 1;

            var responseobject = httpClient.httpPost(requestObject, 'Transaction', pgno);
            var responsecount = responseobject.count;
            var pagecount = Math.ceil(responsecount / 10);
            for (var cnt = 1; cnt <= pagecount; cnt++) {
                var response = httpClient.httpPost(requestObject, 'Transaction', cnt);
                transactionData = transactionData.concat(response.data);
            }
            log.debug('Fetched transaction data', 'Count: ' + transactionData.length);
            return transactionData;
        } catch (e) {
            log.error('ERROR in fetchTransactionData', JSON.stringify(e));
            return [];
        }
    }

    /**
     * Retrieves employee data based on emp_code.
     */
    function getEmployeeData(empCode) {
        var sql = "SELECT id, BUILTIN.DF(entityid) FROM employee WHERE custentity_njt_bio_emp_id = '" + empCode + "'";
        var queryResult = query.runSuiteQL({ query: sql });
        var records = queryResult.asMappedResults();
        var empData = { empId: '', entityId: '' };
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
        var sql = "SELECT id FROM customrecord_njt_daily_attendance_bio WHERE custrecord_njt_trans_bio_id = '" + biotranid + "'";
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
        log.debug("formatNSDate", { "dt": dt1, "dd": dd, "mm": mm, "yy": yy });
        return dd + '/' + mm + '/' + yy;
    }

    /**
     * Formats time for NetSuite (HH:MM:SS).
     */
    function formatNSTime(dt) {
        var dt1 = dt.split(" ")[1];
        log.debug("formatNSTime", { "dt": dt1 });
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
            timezone: format.Timezone.ASIA_MUSCAT
        });
        var dtParts = formattedDate.split(" ");
        var datePart = dtParts[0].split("/");
        var dd = datePart[0];
        var mm = datePart[1];
        var yyyy = datePart[2];
        var timePart = type === 'start' ? '00:01:01' : '23:59:01';
        return yyyy + '-' + mm + '-' + dd + ' ' + timePart;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});