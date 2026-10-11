/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/task', 'N/log', 'N/format', 'N/runtime', 'N/url', 'N/query'],
    function (record, search, task, log, format, runtime, url, query) {

        /**
         * Get input data function
         * This function retrieves the script parameter containing a JSON array of data.
         */
        function getInputData() {

          try {
                var scriptParams = runtime.getCurrentScript();
                log.debug({ title: 'Visa Checking Data', details: scriptParams.getParameter({ name: 'custscript_n21_column_array_selectmr' }) });

              /*   record.submitFields({
                    type: "customrecord_hris_mr_status_bar_rec",
                    id: 7,
                    values: {
                        custrecord_hris_mr_sts: 2
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                }); */
                return JSON.parse(scriptParams.getParameter({ name: 'custscript_n21_column_array_selectmr' }));
            }

            catch (e) {

                log.error({
                    title: 'Error in MRS',
                    details: e.message
                });
                /* record.submitFields({
                    type: "customrecord_hris_mr_status_bar_rec",
                    id: 7,
                    values: {
                        custrecord_hris_mr_sts: 1
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                }); */
            }
        }

        /**
         * Map function
         * This function processes each data item from the input and writes it to the context.
         */
        function map(context) {
            // Parse the incoming context value to JSON data
            var data = JSON.parse(context.value);
            
            // Log the data being processed in the map function for debugging
            log.debug('Map Data', data);
            
            // Use the childId as the unique key to write data to the context
            var key = data.childId; // Use childId as the key
            
            // Write the key-value pair to the context (key: childId, value: the full data)
            context.write({
                key: key,
                value: JSON.stringify(data)
            });
        }

        /**
         * Helper function to load and update the custom record
         * This function loads an existing record, updates the approver field, and saves the record.
         */
        function loadAndUpdateMonthlyAttendanceRecord(data) {
            try {
                // Log the child ID for debugging
                log.debug('Processing Child ID', data.childId);
                // var newidd=parseInt(data.childId);
                // log.debug("newidd",newidd);

                // Load the existing custom record using the childId
                var monthlyAttendanceRecord = record.load({
                    type: 'customrecord_hrms_monthlyattendance', // Specify the custom record type ID
                    id: parseInt(data.childId), // Use childId from the input data
                    isDynamic: true
                });

                // Set the next approver to the custrecord_hrms_month_approver1 field
                // monthlyAttendanceRecord.setValue({
                //     fieldId: 'custrecord_hrms_month_approver1',
                //     value: data.nextapprovalField
                // });
                monthlyAttendanceRecord.setValue({
                    fieldId: 'custrecord_njt_hrms_monthly_status',
                    value: data.nextapprovalField
                });
            //   if(data.nextapprovalField){
               
            //   monthlyAttendanceRecord.setValue({
            //         fieldId: 'custrecord_hrms_month_approver1status',
            //         value: 2
            //     });
            //   }
               

                // Save the updated record and return the record ID
                var recordId = monthlyAttendanceRecord.save();
                
                // Log the updated record ID for tracking purposes
                log.debug('Updated Monthly Attendance Record', 'Record ID: ' + recordId);
                return recordId;
            } catch (e) {
                // Log any error that occurs during record loading and updating
                log.error('Error Loading and Updating Monthly Attendance Record', e.toString());
            }
        }

        /**
         * Reduce function
         * This function processes grouped data from the map stage and updates records.
         */
        function reduce(context) {
            try {
                // Loop through each value (which is the JSON string of data) from the map stage
                context.values.forEach(function (value) {
                    // Parse the data from the map context
                    var data = JSON.parse(value);
                    
                    // Log the data being processed in the reduce function for debugging
                    log.debug('Reduce Data', data);

                    // Call the helper function to load and update the custom record
                    var recordId = loadAndUpdateMonthlyAttendanceRecord(data);

                    // Log success or failure of record update
                    if (recordId) {
                        log.debug('Successfully Updated Record', 'Record ID: ' + recordId);
                    }
                });
             /*  record.submitFields({
                    type: "customrecord_hris_mr_status_bar_rec",
                    id: 7,
                    values: {
                        custrecord_hris_mr_sts: 1
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                }); */
            } catch (e) {
                // Log any errors that occur during the reduce stage
                log.error({
                    title: 'Error in MRS',
                    details: e.message
                });
               /*  record.submitFields({
                    type: "customrecord_hris_mr_status_bar_rec",
                    id: 7,
                    values: {
                        custrecord_hris_mr_sts: 1
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                }); */
            }
        }

        /**
         * Summarize function
         * This function handles logging and summarizing results from the Map/Reduce execution.
         */
        function summarize(summary) {
            // Handle errors from the map stage
            summary.mapSummary.errors.iterator().each(function (key, error, executionNo) {
                log.error('Map Error for Key: ' + key, error);
                return true; // Continue iterating through errors
            });

            // Handle errors from the reduce stage
            summary.reduceSummary.errors.iterator().each(function (key, error, executionNo) {
                log.error('Reduce Error for Key: ' + key, error);
                return true; // Continue iterating through errors
            });
        }

        // Return the Map/Reduce script's functions
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });
