/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/runtime', 'N/search', 'N/log'], 
function(runtime, search, log) {
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
     return {
        pageInit: pageInit
    };
});
