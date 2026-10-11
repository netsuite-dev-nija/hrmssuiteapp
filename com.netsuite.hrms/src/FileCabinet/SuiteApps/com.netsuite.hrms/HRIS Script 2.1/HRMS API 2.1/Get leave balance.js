/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(params) {
        try {
            // Define the filters array
            var filters = [];

            // Add a filter for empId if it is passed in the params
            if (params.empId) {
                filters.push(search.createFilter({
                    name: 'custrecord_hris_lvbal_employee_name',
                    operator: search.Operator.IS,
                    values: params.empId
                }));
            }

            var customrecord_hris_leavebalanceSearchObj = search.create({
                type: "customrecord_hris_leavebalance",
                filters: filters,
                columns: [
                    search.createColumn({name: "internalid", label: "Internal ID"}),
                    search.createColumn({name: "custrecord_hris_lvbal_employee_name", label: "Employee Name"}),
                    search.createColumn({name: "custrecord_hris_lvbal_leave_type", label: "Leave Type "}),
                    search.createColumn({name: "custrecord_hris_lvbal_annual_leave_bal", label: "Yearly Leave Balance "}),
                    search.createColumn({name: "custrecord_hris_lvbal_leave_balance_cred", label: "Leave Balance Credited "}),
                    search.createColumn({name: "custrecord_hris_lvbal_leave_balance_take", label: "Leave Balance Taken "}),
                    search.createColumn({name: "custrecord_hris_lvbal_total_applied_days", label: "Total Applied Days "}),
                    search.createColumn({name: "custrecord_hris_lvbal_available_leave_ba", label: "Available Leave Balance "}),
                    search.createColumn({name: "custrecord_hris_lvbal_encashable_days", label: "Encashable Days "}),
                    search.createColumn({name: "custrecord_hris_lvbal_employee_location", label: "Employee Location "}),
                    search.createColumn({name: "custrecord_hris_lvbal_employee_gender", label: "Employee Gender "}),
                    search.createColumn({name: "custrecord_hris_lvbal_leave_balance_carr", label: "Leave Balance Carry Forward "}),
                    search.createColumn({name: "custrecord_hris_lvbal_leave_balance_laps", label: "Leave Balance Laps "}),
                    search.createColumn({name: "custrecord_hris_lvbal_employee_code", label: "Employee Code "}),
                    search.createColumn({name: "custrecord_hris_lvbal_weekly_off_criteri", label: "Weekly Off Criteria "}),
                    search.createColumn({name: "custrecord_hris_lvbal_employee_work_regi", label: "Employee Work Region "}),
                    search.createColumn({name: "custrecord_hris_lvbal_encashable_days_ta", label: "Encashable Days Taken "}),
                    search.createColumn({name: "custrecord_hris_lvbal_additional_encasha", label: "Additional Encashable Days"}),
                    search.createColumn({name: "custrecord_hris_lvbal_nationality", label: "Nationality (Omani/ Non-Omani) "}),
                    search.createColumn({name: "custrecord_hris_lvbal_available_lve_bal", label: "Available Leave Balance old"}),
                    search.createColumn({name: "custrecord_hris_lve_bal_old_int_id", label: "Old Internal Id"}),
                    search.createColumn({name: "custrecord_hris_lvbal_obdate", label: "OB Date"}),
                    search.createColumn({name: "custrecord_hris_lvbal_openingbalance", label: "Opening Balance"}),
                    search.createColumn({name: "custrecord_hris_lvbal_department", label: "HR Department"})
                ]
             });
             
             var searchResultCount = customrecord_hris_leavebalanceSearchObj.runPaged().count;
             log.debug("customrecord_hris_leavebalanceSearchObj result count", searchResultCount);

             var response = {
                Status: "Success",
                ResponseCode: "200",
                totalRecords: searchResultCount,
                records: []
            }; 

             customrecord_hris_leavebalanceSearchObj.run().each(function(result) {
                var resultObj = {
                    internalId: result.getValue({ name: "internalid" }),
                    empId: result.getValue({ name: "custrecord_hris_lvbal_employee_name" }),
                    employeeName: result.getText({ name: "custrecord_hris_lvbal_employee_name" }),
                    leaveTypeId: result.getValue({ name: "custrecord_hris_lvbal_leave_type" }),
                    leaveType: result.getText({ name: "custrecord_hris_lvbal_leave_type" }),
                    yearlyLeaveBalance: result.getValue({ name: "custrecord_hris_lvbal_annual_leave_bal" }),
                    leaveBalanceCredited: result.getValue({ name: "custrecord_hris_lvbal_leave_balance_cred" }),
                    leaveBalanceTaken: result.getValue({ name: "custrecord_hris_lvbal_leave_balance_take" }),
                    totalAppliedDays: result.getValue({ name: "custrecord_hris_lvbal_total_applied_days" }),
                    availableLeaveBalance: result.getValue({ name: "custrecord_hris_lvbal_available_leave_ba" }),
                    encashableDays: result.getValue({ name: "custrecord_hris_lvbal_encashable_days" }),
                    employeeLocation: result.getText({ name: "custrecord_hris_lvbal_employee_location" }),
                    employeeGender: result.getText({ name: "custrecord_hris_lvbal_employee_gender" }),
                    leaveBalanceCarryForward: result.getValue({ name: "custrecord_hris_lvbal_leave_balance_carr" }),
                    leaveBalanceLaps: result.getValue({ name: "custrecord_hris_lvbal_leave_balance_laps" }),
                    employeeCode: result.getValue({ name: "custrecord_hris_lvbal_employee_code" }),
                    weeklyOffCriteria: result.getText({ name: "custrecord_hris_lvbal_weekly_off_criteri" }),
                    employeeWorkRegion: result.getText({ name: "custrecord_hris_lvbal_employee_work_regi" }),
                    encashableDaysTaken: result.getValue({ name: "custrecord_hris_lvbal_encashable_days_ta" }),
                    additionalEncashableDays: result.getValue({ name: "custrecord_hris_lvbal_additional_encasha" }),
                    nationality: result.getText({ name: "custrecord_hris_lvbal_nationality" }),
                    availableLeaveBalanceOld: result.getValue({ name: "custrecord_hris_lvbal_available_lve_bal" }),
                    oldInternalId: result.getValue({ name: "custrecord_hris_lve_bal_old_int_id" }),
                    obDate: result.getValue({ name: "custrecord_hris_lvbal_obdate" }),
                    openingBalance: result.getValue({ name: "custrecord_hris_lvbal_openingbalance" }),
                    hrDepartment: result.getText({ name: "custrecord_hris_lvbal_department" })
                };
                response.records.push(resultObj);
                return true;
             });
             
            return JSON.stringify(response);
        } catch (e) {
            log.error({ title: 'Error executing search', details: e });
            throw e;
        }
    }

    return {
        get: doGet
    };
});
