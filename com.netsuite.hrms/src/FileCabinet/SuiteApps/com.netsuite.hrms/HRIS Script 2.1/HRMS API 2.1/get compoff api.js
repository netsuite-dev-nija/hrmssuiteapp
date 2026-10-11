/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search'], function (search) {

    /**
     * doGet - Handles the Restlet GET request
     */
    function doGet(params) {
        try {
            // 1. Extract input parameters and handle potential nulls
            var empId     = params.empId || null;
            var leaveType = params.leaveType || null;
            var page      = parseInt(params.page, 10) || 1;
            var pageSize  = parseInt(params.pageSize, 10) || 50;

            // 2. Set pagination limits
            if (pageSize > 1000) pageSize = 1000;
            if (page < 1) page = 1;

            // 3. Define Standard Filters (applied to each record)
            var filters = [];

            // Only show records where the 'Checked' checkbox is False
            filters.push(search.createFilter({
                name: 'custrecord_hris_rcomp_checked',
                operator: search.Operator.IS,
                values: 'F'
            }));

            // Exclude records where Comp-Off Type is empty (removes "- None -")
            filters.push(search.createFilter({
                name: 'custrecord_hris_rcomp_compofftype',
                operator: search.Operator.NONEOF,
                values: ['@NONE@']
            }));

            // Add Employee filter if provided in the URL
            if (empId) {
                filters.push(search.createFilter({
                    name: 'custrecord_hris_rcomp_employee_name',
                    operator: search.Operator.ANYOF,
                    values: empId
                }));
            }

            // Add Leave Type filter if provided in the URL
            if (leaveType) {
                filters.push(search.createFilter({
                    name: 'custrecord_hris_rcomp_leave_type',
                    operator: search.Operator.ANYOF,
                    values: leaveType
                }));
            }

            // 4. Define Summary Filter (Applied after grouping)
            // Ensures we only return types where the total SUM is greater than 0
            filters.push(search.createFilter({
                name: 'custrecord_hris_rcomp_total_comp_offdays',
                operator: search.Operator.GREATERTHAN,
                values: 0,
                summary: search.Summary.SUM
            }));

            // 5. Create Search with Summarized Columns
            var compOffSearch = search.create({
                type: 'customrecord_hris_lve_raise_comp_off',
                filters: filters,
                columns: [
                    // Grouping fields to keep them unique per row
                    search.createColumn({ name: 'custrecord_hris_rcomp_employee_name', summary: search.Summary.GROUP }),
                    search.createColumn({ name: 'custrecord_hris_rcomp_leave_type', summary: search.Summary.GROUP }),
                    search.createColumn({ name: 'custrecord_hris_rcomp_compofftype', summary: search.Summary.GROUP }),
                    
                    // Sum the Total Comp-Off Days
                    search.createColumn({ name: 'custrecord_hris_rcomp_total_comp_offdays', summary: search.Summary.SUM }),
                    
                    // Get the latest Valid Date for this specific group
                    search.createColumn({ name: 'custrecord_hris_rcomp_valid_till_date', summary: search.Summary.MAX })
                ]
            });

            // 6. Handle Pagination
            var pagedData = compOffSearch.runPaged({ pageSize: pageSize });
            var totalRecords = pagedData.count;
            var totalPages   = Math.ceil(totalRecords / pageSize);

            // Return error if page request is invalid
            if (page > totalPages && totalPages !== 0) {
                return JSON.stringify({
                    status: "ERROR",
                    message: "Page number exceeds total pages",
                    totalPages: totalPages
                });
            }

            // 7. Loop through results and map to your Original Response Keys
            var results = [];
            if (totalRecords > 0) {
                var pageData = pagedData.fetch({ index: page - 1 });
                
                pageData.data.forEach(function (res) {
                    // Extract values using Summary labels
                    var eId   = res.getValue({ name: 'custrecord_hris_rcomp_employee_name', summary: search.Summary.GROUP });
                    var eName = res.getText({ name: 'custrecord_hris_rcomp_employee_name', summary: search.Summary.GROUP });
                    var lId   = res.getValue({ name: 'custrecord_hris_rcomp_leave_type', summary: search.Summary.GROUP });
                    var lText = res.getText({ name: 'custrecord_hris_rcomp_leave_type', summary: search.Summary.GROUP });
                    var tId   = res.getValue({ name: 'custrecord_hris_rcomp_compofftype', summary: search.Summary.GROUP });
                    var tText = res.getText({ name: 'custrecord_hris_rcomp_compofftype', summary: search.Summary.GROUP });
                    
                    // Extract Summed values and Dates
                    var sumDays = res.getValue({ name: 'custrecord_hris_rcomp_total_comp_offdays', summary: search.Summary.SUM });
                    var maxDate = res.getValue({ name: 'custrecord_hris_rcomp_valid_till_date', summary: search.Summary.MAX });

                    // Build the final JSON object maintaining your original keys
                    results.push({
                        id: tId, // Using the type ID as the primary ID for the sum row
                        emp_id: eId,
                        emp_name: eName,
                        leave_type: {
                            id: lId,
                            text: lText
                        },
                        data: {
                            total_comp_off_days: sumDays,
                            comp_off_type: tText,
                            comp_off_typeid: tId,
                            comp_off_date: maxDate // Updated with the valid till date
                        }
                    });
                });
            }

            // 8. Return Success Response
            return JSON.stringify({
                status: "SUCCESS",
                page: page,
                pageSize: pageSize,
                totalRecords: totalRecords,
                totalPages: totalPages,
                results: results
            });

        } catch (e) {
            // Error Handling
            return JSON.stringify({
                status: "ERROR",
                message: e.message
            });
        }
    }

    return {
        get: doGet
    };
});