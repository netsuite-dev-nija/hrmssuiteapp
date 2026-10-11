/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/https', 'N/url', 'N/query', 'N/log','N/currentRecord','N/runtime','N/record','N/search'], function (https, url, query, log,currentRecord,runtime,record,search) {
  function pageInit(context) {
        debugger;
        try {
            // Get the current record from the context
            var currentRec = context.currentRecord;

            // Get the logged-in user's runtime information
            var currentUser = runtime.getCurrentUser();

            // Fetch the user's current role ID
            var userRoleId = currentUser.role;

            log.debug('User Role ID', userRoleId);

            // Proceed only if a valid role ID exists
            if (userRoleId) {

                // Create a search to find subsidiaries accessible to the current user's role
                var roleSearchObj = search.create({
                    type: "role",
                    filters: [
                        ["internalid", "anyof", userRoleId]
                    ],
                    columns: [
                        search.createColumn({ name: "subsidiaries", label: "Accessible Subsidiaries" })
                    ]
                });

                // Run the search
                var searchResult = roleSearchObj.run().getRange({ start: 0, end: 1000 });

                // Create an array to store accessible subsidiaries
                var accessibleSubsidiaries = [];

                // Loop through the search results
                for (var i = 0; i < searchResult.length; i++) {
                    var subsidiaryId = searchResult[i].getValue({ name: "subsidiaries" });
                    var subsidiaryText = searchResult[i].getText({ name: "subsidiaries" });

                    if (subsidiaryId && accessibleSubsidiaries.indexOf(subsidiaryId) === -1) {
                        accessibleSubsidiaries.push({
                            id: subsidiaryId,
                            name: subsidiaryText
                        });
                    }
                }

                log.debug('Accessible Subsidiaries', accessibleSubsidiaries);

                // Identify the subsidiary field on the form
                var subsidiaryField = currentRec.getField({ fieldId: 'custpage_subsi' });

                // Check if the field exists
                if (subsidiaryField) {

                    // First, remove all existing options
                    subsidiaryField.removeSelectOption({ value: null }); // removes “–Select–” if present
                    var allOptions = subsidiaryField.getSelectOptions();
                    for (var j = 0; j < allOptions.length; j++) {
                        subsidiaryField.removeSelectOption({ value: allOptions[j].value });
                    }

                    // Add a default “–Select–” option again
                    subsidiaryField.insertSelectOption({
                        value: '',
                        text: '--Select Subsidiary--'
                    });

                    // Now, add only accessible subsidiaries
                    for (var k = 0; k < accessibleSubsidiaries.length; k++) {
                        subsidiaryField.insertSelectOption({
                            value: accessibleSubsidiaries[k].id,
                            text: accessibleSubsidiaries[k].name
                        });
                    }

                    log.debug('Subsidiary field updated successfully');
                } else {
                    log.error('Field Missing', 'Subsidiary field not found on current record');
                }
            }
        } catch (e) {
            log.error('Error in pageInit', e.message);
        }
    }
    function fieldChanged(context) {
        var fieldId = context.fieldId;

        if (fieldId === 'custpage_month' || fieldId === 'custpage_year' || fieldId === 'custpage_subsi') {
            var currentRecord = context.currentRecord;
            var month = currentRecord.getValue('custpage_month');
            var year = currentRecord.getValue('custpage_year');
            var subsidiary = currentRecord.getValue('custpage_subsi');
            var Empcode = currentRecord.getField('custpage_empcode');

            if (month && year && subsidiary) {
                // Construct SuiteQL query
            //     var monthlysql = "SELECT a.*, e.entityid AS emp_name, e.custentity_hris_empcode AS emp_code, e.subsidiary " +
            //     "FROM customrecord_hrms_monthlyattendance a " +
            //     "JOIN customlist_hris_month_list b ON a.custrecord_hrms_month_monthid = b.id " +
            //     "JOIN customlist_hris_year_master c ON a.custrecord_hrms_month_yearid = c.id " +
            //     "JOIN employee e ON e.id = a.custrecord_hrms_month_empid " +
            //     "WHERE b.id = " + month + " AND b.isinactive = 'F' " +
            //     "AND c.id = " + year + " AND a.custrecord_njt_hrms_monthly_status = 1 " +
            //    //  "AND a.custrecord_hrms_month_processcompleted = 'F' " +
            //     "AND e.subsidiary = '"+subsidiary+"' " +
            //     "AND c.isinactive = 'F' ";
            //     log.debug("Generated SQL Query", monthlysql);
                // logModule.debug("Generated SQL Query", monthlysql);
                var monthlysql = 
    "SELECT a.*, e.entityid AS emp_name, e.custentity_hris_empcode AS emp_code, e.subsidiary, e.id AS idemp " +
    "FROM customrecord_hrms_monthlyattendance a " +
    "JOIN customlist_hris_month_list b ON a.custrecord_hrms_month_monthid = b.id " +
    "JOIN customlist_hris_year_master c ON a.custrecord_hrms_month_yearid = c.id " +
    "JOIN employee e ON e.id = a.custrecord_hrms_month_empid " +
    "WHERE b.id = " + month + " AND b.isinactive = 'F' " +
    "AND c.id = " + year + " AND a.custrecord_njt_hrms_monthly_status = 1 " +
    "AND e.subsidiary = " + subsidiary + " " +
    "AND c.isinactive = 'F';";

            
            
            
            
                    //    logModule.debug("Monthly SQL Query", monthlysql);
               
                       // Run the SuiteQL query
                       var queryResult = query.runSuiteQL({ query: monthlysql });
                       var tsResult = queryResult.asMappedResults();
                    //    logModule.debug("tsResult",tsResult);
                    //    logModule.debug("tsResult length",tsResult.length);
               
                       // Loop through the results and set sublist values
                       for (var loop = 0; loop < tsResult.length; loop++) {
                           var rec = tsResult[loop];
               
                           var empid = rec.idemp||"";
                           var empname = rec.emp_name;
                           var empCode=rec.emp_code||"";
                           var project=rec.custrecord_hrms_month_project;
                           var projectSeg=rec.custrecord_hrms_month_projectsite;
                           var internalAttendanceType = rec.custrecord_hrms_month_presentdays || 0; // Default to 0 if PresentCount is null
                           var absentCount = rec.custrecord_hrms_month_absentdays || 0;
                           var weeklyOTHours = rec.custrecord_hrms_month_weeklyothrs || 0;
                           var holiOt=rec.custrecord_hrms_month_holidayothrs || 0;
                           var rotOt=rec.custrecord_hrms_month_rothrs || 0;
                            var parId=rec.id 

              Empcode.insertSelectOption({
                value: empid,
                text: empCode,
                isSelected: false
            });

        }
        }
        }
    }

    return {
        fieldChanged: fieldChanged,
      pageInit:pageInit
    };
});
