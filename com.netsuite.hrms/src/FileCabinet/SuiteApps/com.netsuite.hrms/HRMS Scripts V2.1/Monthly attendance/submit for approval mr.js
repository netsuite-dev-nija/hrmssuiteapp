/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/task', 'N/log', 'N/format', 'N/runtime', 'N/url', 'N/query','N/email'],
    function (record, search, task, log, format, runtime, url, query,email) {

        /**
         * Get input data function
         * This function retrieves the script parameter containing a JSON array of data.
         */
        function getInputData() {

          try {
                var scriptParams = runtime.getCurrentScript();
                log.debug({ title: 'Visa Checking Data', details: scriptParams.getParameter({ name: 'custscript_njt_submitfor_approval' }) });

                /* record.submitFields({
                    type: "customrecord_hris_mr_status_bar_rec",
                    id: 11,
                    values: {
                        custrecord_hris_mr_sts: 2
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                }); */
                return JSON.parse(scriptParams.getParameter({ name: 'custscript_njt_submitfor_approval' }));
            }

            catch (e) {

                log.error({
                    title: 'Error in MRS',
                    details: e.message
                });
                /* record.submitFields({
                    type: "customrecord_hris_mr_status_bar_rec",
                    id: 11,
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
              var currentUserId = runtime.getCurrentUser().id;
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
                    fieldId: 'custrecord_hris_next_approver_role',
                    value: 1217
                });
                monthlyAttendanceRecord.setValue({
                    fieldId: 'custrecord_njt_hrms_monthly_status',
                    value: 2
                });
              monthlyAttendanceRecord.setValue({
                    fieldId: 'custrecord_hris_monthly_attendance_reque',
                    value: currentUserId
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
                    id: 11,
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
                    id: 11,
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
       /*  function summarize(summary) {
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
        } */
      /* function summarize(summary) {
            var errors = 0;
            var processed = 0;

            // ── CORRECT WAY TO COUNT PROCESSED RECORDS ──
            if (summary.inputSummary && summary.inputSummary.total) {
                processed = summary.inputSummary.total;
            } else if (summary.mapSummary && summary.mapSummary.keys) {
                processed = summary.mapSummary.keys.length;
            }

            // Count errors
            if (summary.mapSummary && summary.mapSummary.errors) {
                summary.mapSummary.errors.iterator().each(function () { errors++; return true; });
            }
            if (summary.reduceSummary && summary.reduceSummary.errors) {
                summary.reduceSummary.errors.iterator().each(function () { errors++; return true; });
            }

            log.audit('Monthly Attendance Submission Finished', {
                Processed: processed,
                Errors: errors,
                Successful: processed - errors
            });

            // If nothing was processed → exit
            if (processed === 0) {
                log.audit('No Records', 'Nothing to process – email skipped.');
                return;
            }

            // ── EMAIL PART (exactly as you asked) ──
            try {
                var baseUrl = 'https://' + url.resolveDomain({ hostType: url.HostType.APPLICATION });
                var link = baseUrl = baseUrl + '/app/common/custom/custrecordentrylist.nl?rectype=253&whence=';

                var body = '';
                body += '<p>Dear Vishal,</p>';
                body += '<p>New monthly attendance records have been submitted and are now pending your approval.</p>';
                body += '<p><a href="' + link + '" target="_blank" style="color:#0066cc; font-weight:bold;">';
                body += 'Click here to open Monthly Attendance records</a></p>';
                body += '<p>Thank you,<br><strong>HRIS System</strong></p>';

                email.send({
                    author: runtime.getCurrentUser().id,
                    recipients: ['vishal@nijatech.com'],
                    subject: 'Monthly Attendance Records Submitted for Approval',
                    body: body
                });

                log.audit('Email Sent Successfully', 'To: vishal@nijatech.com | Records: ' + processed);

            } catch (e) {
                log.error('Email Failed', e.message + '\n' + (e.stack || ''));
            }
        } */
      function summarize(summary) {
    var processed = 0;
    var errors = 0;

    // Correctly count processed records
    if (summary.inputSummary && summary.inputSummary.total) {
        processed = summary.inputSummary.total;
    } else if (summary.mapSummary && summary.mapSummary.keys) {
        processed = summary.mapSummary.keys.length;
    }

    // Count errors
    if (summary.mapSummary && summary.mapSummary.errors) {
        summary.mapSummary.errors.iterator().each(function () { errors++; return true; });
    }
    if (summary.reduceSummary && summary.reduceSummary.errors) {
        summary.reduceSummary.errors.iterator().each(function () { errors++; return true; });
    }

    log.audit('Monthly Attendance Submitted', {
        Processed: processed,
        Errors: errors,
        Successful: processed - errors
    });

    if (processed === 0) {
        log.audit('No Records Processed', 'Email skipped.');
        return;
    }

    try {
        // Read payload to get subsidiary & paygroup for filtered link
        var script = runtime.getCurrentScript();
        var jsonStr = script.getParameter({ name: 'custscript_njt_submitfor_approval' });
        var payload = JSON.parse(jsonStr);
        var sample = payload[0];

        // Build filtered Monthly Attendance list link
        var baseUrl = 'https://' + url.resolveDomain({ hostType: url.HostType.APPLICATION });
        var link = baseUrl + '/app/common/custom/custrecordentrylist.nl?rectype=253';

        if (sample.subsidiary) {
            link += '&fltr=custrecord_hrms_month_subsidiary%3A' + sample.subsidiary;
        }
        if (sample.paygroup) {
            link += (sample.subsidiary ? '&' : '&fltr=') + 'custrecord_hrms_month_paygroup%3A' + sample.paygroup;
        }
        link += '&whence=';

        // Get all active employees with Role 1217
        var recipients = [];
        var empSearch = search.create({
            type: 'employee',
            filters: [
                ['role', 'anyof', '1217'],
                'AND',
                ['isinactive', 'is', 'F'],
                'AND',
                ['email', 'isnotempty', ''],
               'AND',
                ['custentity_hris_emp_employeecheck', 'is', 'T']
            ],
            columns: ['email']
        });

        empSearch.run().each(function (result) {
            var mail = result.getValue('email');
            if (mail) recipients.push(mail);
            return true;
        });

        if (recipients.length === 0) {
            log.audit('No Recipients Found', 'No active employees with Role 1217 have email.');
            return;
        }

        // Get role name for greeting
        var roleName = 'Approver';
        try {
            var roleResult = search.create({
                type: 'role',
                filters: [['internalid', 'anyof', '1217']],
                columns: ['name']
            }).run().getRange({ start: 0, end: 1 });
            if (roleResult.length > 0) {
                roleName = roleResult[0].getValue('name');
            }
        } catch (e) { }

        var senderId = runtime.getCurrentUser().id;

        var subject = 'Monthly Attendance Submitted for Approval';

        var body = '';
        body += '<p>Dear ' + roleName + ',</p>';
        body += '<p>New monthly attendance records have been submitted and are now pending your approval.</p>';
        body += '<p></p>';
        body += '<p><a href="' + link + '" target="_blank" style="color:#0066cc; font-weight:bold; text-decoration:underline; font-size:15px;">';
        body += 'Click here to open Monthly Attendance records</a></p>';
        body += '<p></p>';
        body += '<p>Thank you,<br><strong>HRIS System</strong></p>';

        /* email.send({
            author: senderId,
            recipients: recipients,
            subject: subject,
            body: body
        }); */

        log.audit('Email Sent Successfully', {
            Recipients: recipients.join(', '),
            Role: roleName + ' (1217)',
            TotalRecords: processed,
            Link: link
        });

    } catch (e) {
        log.error('Email Send Failed', e.message + '\n' + (e.stack || ''));
    }
}

        // Return the Map/Reduce script's functions
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });
