/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/query', 'N/log'], function(query, log) {

    /**
     * Reusable Dynamic Validation Engine to check for duplicate/pending records
     * @param {Object} params
     * @param {string} params.recordType - The internal script ID of the custom record table
     * @param {string} params.empField - The internal script ID of the employee field mapping
     * @param {number|string} params.employeeId - The internal ID of the employee to check
     * @param {string} params.statusField - The internal script ID of the approval status tracking field
     * @param {number} params.pendingStatusValue - The ID integer value of the "Pending Approval" state (e.g., 1)
     * @param {number|string} [params.currentRecordId] - OPTIONAL: The internal ID of the current active record to exclude (Edit mode)
     * @returns {boolean} True if a record matching the criteria exists, false otherwise.
     */
    function checkPendingRecord(params) {
        try {
            if (!params.employeeId) return false;

            // Dynamically construct safe SuiteQL string
            var dynamicSQL = "SELECT id FROM " + params.recordType + " " +
                             "WHERE isinactive = 'F' " +
                             "AND " + params.empField + " = " + params.employeeId + " " +
                             "AND " + params.statusField + " = " + params.pendingStatusValue;

            // If an ID exists (meaning we are editing an existing record), exclude it from checking against itself
            if (params.currentRecordId) {
                dynamicSQL += " AND id <> " + params.currentRecordId;
            }

            var resultSet = query.runSuiteQL({ query: dynamicSQL });
            var results = resultSet.asMappedResults();

            if (results.length > 0) {
                log.debug('Pending Conflict Caught', 'Found pending ID: ' + results[0].id + ' inside table ' + params.recordType);
                return true;
            }
        } catch (err) {
            log.error('Error within dynamic validation checker library logic', err);
        }
        return false;
    }

    /**
     * Reusable Joined Validation Engine to check parent/child relationship tables
     * Handles: SELECT a.id FROM parent a JOIN child b ON a.id = b.link_field WHERE ...
     * @param {Object} params
     * @param {string} params.parentRecordType - Parent table (e.g., 'customrecord_change_in_status')
     * @param {string} params.childRecordType - Child details sublist table (e.g., 'customrecord_change_in_status_details')
     * @param {string} params.joinLinkField - Field on child linking back to parent (e.g., 'custrecord_hris_cisd_link')
     * @param {string} params.childEmpField - Employee field sitting on child table (e.g., 'custrecord_hris_cisd_employee_name')
     * @param {number|string} params.employeeId - The internal ID of the employee to check (e.g., 12736)
     * @param {string} params.parentStatusField - Approval status field on parent table (e.g., 'custrecord_hris_cis_approval_status')
     * @param {number} params.pendingStatusValue - The value representing pending status (e.g., 1)
     * @param {number|string} [params.currentParentId] - OPTIONAL: The internal ID of the active parent record to exclude (Edit mode)
     * @returns {boolean} True if a pending record is found, false otherwise.
     */
    function checkPendingStatusDetails(params) {
        try {
            if (!params.employeeId) return false;

            // Dynamically construct safe inner-join statement structure
            var joinedSQL = "SELECT a.id FROM " + params.parentRecordType + " a " +
                            "JOIN " + params.childRecordType + " b ON a.id = b." + params.joinLinkField + " " +
                            "WHERE a.isinactive = 'F' " +
                            "AND b." + params.childEmpField + " = " + params.employeeId + " " +
                            "AND a." + params.parentStatusField + " = " + params.pendingStatusValue;

            // If a parent ID exists (Edit mode), exclude the active parent transaction record from blocking itself
            if (params.currentParentId) {
                joinedSQL += " AND a.id <> " + params.currentParentId;
            }

            var resultSet = query.runSuiteQL({ query: joinedSQL });
            var results = resultSet.asMappedResults();

            if (results.length > 0) {
                log.debug('Pending Joined Conflict Caught', 'Found pending ID: ' + results[0].id + ' inside linked table ' + params.parentRecordType);
                return true;
            }
        } catch (err) {
            log.error('Error within checkPendingStatusDetails library logic', err);
        }
        return false;
    }

    function checkEmployeeExists(params) {
        try {
            if (!params.employeeId) return false;

            var sql = "SELECT id FROM " + params.recordType + " " +
                      "WHERE isinactive = 'F' " +
                      "AND " + params.empField + " = " + params.employeeId;

            if (params.currentRecordId) {
                sql += " AND id <> " + params.currentRecordId;
            }

            var resultSet = query.runSuiteQL({ query: sql });
            var results = resultSet.asMappedResults();

            return results.length > 0;
        } catch (err) {
            log.error('Error in checkEmployeeExists', err);
            return false;
        }
    }

    // Export BOTH functions so they can be referenced by your Client Script
    return {
        checkPendingRecord: checkPendingRecord,
        checkPendingStatusDetails: checkPendingStatusDetails,
        checkEmployeeExists: checkEmployeeExists
    };
});