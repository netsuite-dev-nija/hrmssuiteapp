/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/record', 'N/error', 'N/log', 'N/search', 'N/file'], function (record, error, log, search, file) {
    // Define the RESTlet function to handle POST requests
    function getPayslipRecords(context) {
        // Log the incoming request for debugging
        log.debug({
            title: 'Request Received',
            details: 'Context: ' + JSON.stringify(context)
        });

        // Ensure context is an array for consistent processing
        var requests = Array.isArray(context) ? context : [context];
        // Define the custom record type for payslips
        var customRecordType = 'customrecord_hris_emp_payslip_monh';
        // Define the custom list type for HRIS Year Master List
        var yearMasterRecordType = 'customlist_hris_year_master';
        // Define the custom list type for HRIS Month Master List
        var monthMasterRecordType = 'customlist_hris_month_list';
        // Define the base URL for payslip files
        var baseUrl = 'https://11906425.app.netsuite.com';
        // Initialize array to store employee data
        var employeeData = [];

        // Process each request in the input array
        requests.forEach(function (requestBody, index) {
            // Log the current request being processed
            log.debug({
                title: 'Processing Request',
                details: 'Request #' + (index + 1) + ': ' + JSON.stringify(requestBody)
            });

            try {
                // Validate mandatory fields: employeeId and payYear
                if (!requestBody.employeeId || !requestBody.payYear) {
                    // Log validation error if fields are missing
                    log.error({
                        title: 'Validation Error',
                        details: 'Missing required field(s) in request: ' + JSON.stringify(requestBody)
                    });
                    // Throw error for missing fields
                    throw error.create({
                        name: 'MISSING_REQUIRED_FIELD',
                        message: 'Missing required field: employeeId or payYear'
                    });
                }
                // Log successful validation
                log.debug({
                    title: 'Validation Success',
                    details: 'employeeId: ' + requestBody.employeeId + ', payYear: ' + requestBody.payYear
                });

                // Get the internal ID for the payYear from HRIS Year Master List
                var yearId = null;
                try {
                    // Create search to find the year record
                    var yearSearch = search.create({
                        type: yearMasterRecordType,
                        filters: [
                            ['name', 'is', requestBody.payYear]
                        ],
                        columns: [
                            search.createColumn({ name: 'internalid', label: 'Internal ID' })
                        ]
                    });
                    // Run the search and get the first result
                    var yearSearchResult = yearSearch.run().getRange({ start: 0, end: 1 });
                    // Log the year search result
                    log.debug({
                        title: 'Year Master Search',
                        details: 'Year: ' + requestBody.payYear + ', Found: ' + yearSearchResult.length + ' records'
                    });

                    // Check if a year record was found
                    if (yearSearchResult.length > 0) {
                        yearId = yearSearchResult[0].getValue('internalid');
                        // Log the found year ID
                        log.debug({
                            title: 'Year ID Found',
                            details: 'Year: ' + requestBody.payYear + ', Internal ID: ' + yearId
                        });
                    } else {
                        // Log error if year ID not found
                        log.error({
                            title: 'Year ID Not Found',
                            details: 'No record found in HRIS Year Master List for year: ' + requestBody.payYear
                        });
                        // Throw error for missing year ID
                        throw error.create({
                            name: 'YEAR_NOT_FOUND',
                            message: 'No record found in HRIS Year Master List for year: ' + requestBody.payYear
                        });
                    }
                } catch (e) {
                    // Log error during year search
                    log.error({
                        title: 'Error Searching Year Master',
                        details: 'Year: ' + requestBody.payYear + ', Error: ' + e.message
                    });
                    // Throw error to include in response
                    throw error.create({
                        name: 'YEAR_SEARCH_ERROR',
                        message: 'Error finding year ID for year: ' + requestBody.payYear + ': ' + e.message
                    });
                }

                // Initialize employee name as 'Unknown' as fallback
                var employeeName = 'Unknown';
                try {
                    // Attempt to load the employee record
                    log.debug({
                        title: 'Loading Employee Record',
                        details: 'Employee ID: ' + requestBody.employeeId
                    });
                    var employeeRecord = record.load({
                        type: 'employee',
                        id: requestBody.employeeId,
                        isDynamic: false
                    });
                    // Get employee name from entityid field
                    employeeName = employeeRecord.getValue('entityid') || 'Unknown';
                    // Log successful employee record load
                    log.debug({
                        title: 'Employee Record Loaded',
                        details: 'Employee Name: ' + employeeName
                    });
                } catch (e) {
                    // Log error if employee record load fails
                    log.error({
                        title: 'Error Loading Employee',
                        details: 'Employee ID: ' + requestBody.employeeId + ', Error: ' + e.message
                    });
                    // Continue processing even if employee name cannot be retrieved
                }

                // Define search filters using 'anyof' with year internal ID
                var searchFilters = [
                    ['custrecord_hris_emp_payslip_empid', 'anyof', requestBody.employeeId],
                    'AND',
                    ['custrecord_hris_payslip_year', 'anyof', yearId]
                ];
                // Log the search filters for debugging
                log.debug({
                    title: 'Search Filters',
                    details: JSON.stringify(searchFilters)
                });

                // Create search for payslip records
                var payslipSearch = search.create({
                    type: customRecordType,
                    filters: searchFilters,
                    columns: [
                        search.createColumn({ name: 'internalid', label: 'Internal ID' }), // For debugging
                        search.createColumn({ name: 'custrecord_hris_emp_payslip_month', label: 'Pay Month' }),
                        search.createColumn({ name: 'custrecord_hris_payslip_payslip', label: 'Payslip' }) // File ID
                    ]
                });

                // Get the count of search results
                var searchResultCount = payslipSearch.runPaged().count;
                // Log the search result count
                log.debug({
                    title: 'Search Result Count',
                    details: 'Found ' + searchResultCount + ' records for employeeId: ' + requestBody.employeeId + ', yearId: ' + yearId
                });

                // Check if no records were found
                if (searchResultCount === 0) {
                    // Log error for no records
                    log.error({
                        title: 'No Records Found',
                        details: 'No payslip records for employeeId: ' + requestBody.employeeId + ', yearId: ' + yearId
                    });
                    // Throw error for no records
                    throw error.create({
                        name: 'NO_RECORDS_FOUND',
                        message: 'No payslip records found for employeeId: ' + requestBody.employeeId + ' and year: ' + requestBody.payYear
                    });
                }

                // Initialize array to store payslip results
                var payslipResults = [];
                // Process search results using run().each
                payslipSearch.run().each(function (result) {
                    // Get month ID from the record
                    var monthId = result.getValue('custrecord_hris_emp_payslip_month');
                    // Initialize month name as empty
                    var monthName = '';
                    // Get file ID from the payslip field
                    var fileId = result.getValue('custrecord_hris_payslip_payslip');
                    // Initialize payslip URL as empty
                    var payslipUrl = '';

                    // Log details of the current record
                    log.debug({
                        title: 'Processing Payslip Record',
                        details: 'ID: ' + result.getValue('internalid') + ', Month ID: ' + (monthId || 'None') + ', File ID: ' + (fileId || 'None')
                    });

                    // Get the full month name from HRIS Month Master List
                    if (monthId) {
                        try {
                            // Create search to find the month record
                            var monthSearch = search.create({
                                type: monthMasterRecordType,
                                filters: [
                                    ['internalid', 'is', monthId]
                                ],
                                columns: [
                                    search.createColumn({ name: 'name', label: 'Month Name' })
                                ]
                            });
                            // Run the search and get the first result
                            var monthSearchResult = monthSearch.run().getRange({ start: 0, end: 1 });
                            // Log the month search result
                            log.debug({
                                title: 'Month Master Search',
                                details: 'Month ID: ' + monthId + ', Found: ' + monthSearchResult.length + ' records'
                            });

                            // Check if a month record was found
                            if (monthSearchResult.length > 0) {
                                monthName = monthSearchResult[0].getValue('name') || '';
                                // Log the found month name
                                log.debug({
                                    title: 'Month Name Found',
                                    details: 'Month ID: ' + monthId + ', Name: ' + monthName
                                });
                            } else {
                                // Log error if month name not found
                                log.error({
                                    title: 'Month Name Not Found',
                                    details: 'No record found in HRIS Month Master List for month ID: ' + monthId
                                });
                            }
                        } catch (e) {
                            // Log error during month search
                            log.error({
                                title: 'Error Searching Month Master',
                                details: 'Month ID: ' + monthId + ', Error: ' + e.message
                            });
                        }
                    } else {
                        // Log error if no month ID is found
                        log.error({
                            title: 'No Month ID',
                            details: 'No month ID for record ID: ' + result.getValue('internalid')
                        });
                    }

                    // Load file if file ID exists
                    if (fileId) {
                        try {
                            // Load the file from File Cabinet
                            var fileObj = file.load({ id: fileId });
                            // Prepend base URL to the file's URL
                            payslipUrl = baseUrl + fileObj.url;
                            // Log successful file load
                            log.debug({
                                title: 'File Loaded',
                                details: 'File ID: ' + fileId + ', URL: ' + payslipUrl
                            });
                        } catch (e) {
                            // Log error if file load fails
                            log.error({
                                title: 'Error Loading File',
                                details: 'File ID: ' + fileId + ', Error: ' + e.message
                            });
                        }
                    } else {
                        // Log error if no file ID is found
                        log.error({
                            title: 'No File ID',
                            details: 'No file ID for month ID: ' + monthId
                        });
                    }

                    // Add payslip to results if both month name and URL exist
                    if (monthName && payslipUrl) {
                        payslipResults.push({
                            paymonth: monthName, // Use full month name
                            payslip: payslipUrl
                        });
                    }

                    // Continue processing results (true to continue, false to stop)
                    return true;
                });

                // Check if no valid payslips were found
                if (payslipResults.length === 0) {
                    // Log error for no files
                    log.error({
                        title: 'No Files Found',
                        details: 'No valid payslip files for employeeId: ' + requestBody.employeeId + ', yearId: ' + yearId
                    });
                    // Throw error for no files
                    throw error.create({
                        name: 'NO_FILES_FOUND',
                        message: 'No payslip files found for employeeId: ' + requestBody.employeeId + ' and year: ' + requestBody.payYear
                    });
                }

                // Construct the employee data object
                var responseData = {
                    employeeId: requestBody.employeeId,
                    employeeName: employeeName,
                    payslips: payslipResults
                };
                // Log the constructed response data
                log.debug({
                    title: 'Employee Data',
                    details: JSON.stringify(responseData)
                });

                // Add employee data to the results array
                employeeData.push(responseData);
                // Log successful employee data addition
                log.debug({
                    title: 'Employee Data Added',
                    details: 'Success for employeeId: ' + requestBody.employeeId + ', yearId: ' + yearId
                });
            } catch (e) {
                // Log any errors during processing
                log.error({
                    title: 'Error Processing Request',
                    details: 'Error: ' + e.name + ', Message: ' + e.message + ', Request: ' + JSON.stringify(requestBody)
                });
                // Add error response to employee data
                employeeData.push({
                    employeeId: requestBody.employeeId || null,
                    employeeName: null,
                    payslips: [],
                    error: {
                        name: e.name,
                        message: e.message
                    }
                });
            }
        });

        // Construct the final response
        var finalResponse = {
            Status: true,
            StatusCode: 200,
            Message: 'Success',
            Response: 'Records retrieved successfully',
            Data: employeeData
        };

        // Log the final response
        log.debug({
            title: 'Final Response',
            details: JSON.stringify(finalResponse)
        });

        // Return the final response
        return finalResponse;
    }

    // Expose the POST method
    return {
        post: getPayslipRecords
    };
});