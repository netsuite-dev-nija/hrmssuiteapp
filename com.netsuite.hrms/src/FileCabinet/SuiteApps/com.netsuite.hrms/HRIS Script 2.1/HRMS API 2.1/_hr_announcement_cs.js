/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/query'], function (currentRecord, query) {
    function pageInit(context) {
        var currentRec = context.currentRecord;

    }
    function fieldChanged(context) {

       /*  if (context.fieldId === 'custrecord_hris_comp_annou_subsidiary') {
                  debugger;
            var currentRec = context.currentRecord;
            var subsidiaryValue = currentRec.getValue({
                fieldId: 'custrecord_hris_comp_annou_subsidiary'
            });

            var audienceFieldId = 'custpage_employee_multiselect';


            //  If subsidiary has value, load employees
            if (subsidiaryValue) {
                try {
                    var sql = "SELECT id, entityid FROM employee WHERE subsidiary = " + subsidiaryValue;
                    var resultSet = query.runSuiteQL({ query: sql }).asMappedResults();


                    var fieldObj = currentRec.getField({
                        fieldId: audienceFieldId
                    });

                    if (resultSet && resultSet.length > 0) {
                        resultSet.forEach(function (row) {
                            fieldObj.insertSelectOption({
                                value: row.id,         // internal ID
                                text: row.entityid     // employee name/code
                            });
                        });

                    }



                } catch (err) {
                    log.debug('Error running query or populating options: ' + err.message);
                }
            }
        } */
      if (context.fieldId === 'custrecord_hris_comp_annou_subsidiary') {
            var currentRec = context.currentRecord;
            var subsidiaryValues = currentRec.getValue({ fieldId: 'custrecord_hris_comp_annou_subsidiary' });
            var audienceFieldId = 'custpage_employee_multiselect';

            // Clear previous options
            var fieldObj = currentRec.getField({ fieldId: audienceFieldId });
            fieldObj.removeSelectOption({ value: null }); // Remove all options

            // If subsidiary has value(s), load employees
            if (subsidiaryValues && subsidiaryValues.length > 0) {
                try {
                    // Build IN clause safely (SuiteQL supports IN with multiple values)
                    var placeholders = subsidiaryValues.map(function() { return '?'; }).join(',');
                    var sql = 'SELECT id, entityid FROM employee WHERE subsidiary IN (' + placeholders + ') ORDER BY entityid';

                    var resultSet = query.runSuiteQL({
                        query: sql,
                        params: subsidiaryValues
                    }).asMappedResults();

                    if (resultSet && resultSet.length > 0) {
                        resultSet.forEach(function (row) {
                            fieldObj.insertSelectOption({
                                value: row.id,   // internal ID
                                text: row.entityid  // employee name/code
                            });
                        });
                    } else {
                        // Optional: Add a "No employees found" option
                        fieldObj.insertSelectOption({
                            value: '-1',
                            text: 'No employees found'
                        });
                    }
                } catch (err) {
                    log.debug('Error running query or populating options', err.message);
                }
            } else {
                // Optional: Add a placeholder when no subsidiary selected
                fieldObj.insertSelectOption({
                    value: '',
                    text: 'Select a subsidiary first'
                });
            }
        }
        if(context.fieldId == "custpage_employee_multiselect"){
              var currentRec = context.currentRecord;
              var selectedValues = currentRec.getValue({
            fieldId: 'custpage_employee_multiselect'
        });

        var employeeArray = [];

        // Multi-select field returns an array of internal IDs
        if (selectedValues && selectedValues.length > 0) {
            for (var i = 0; i < selectedValues.length; i++) {
                employeeArray.push(selectedValues[i]);
            }
            currentRec.setValue({
            fieldId: 'custrecord_hris_comp_annou_audience',
            value: employeeArray
        });
        }
        }
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    };
});
