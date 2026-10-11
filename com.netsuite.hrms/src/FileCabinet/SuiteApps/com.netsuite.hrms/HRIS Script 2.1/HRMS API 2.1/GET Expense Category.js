/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], function (query, log) {

    /**
     * Handles GET requests to fetch active expense category records.
     * @param {Object} params - Query parameters (unused in this script).
     * @returns {string} JSON string of expense categories with id, name, and expenseacct.
     */
    function doGet(params) {
        try {
            // Initialize array to store results
            var results = [];

            // SuiteQL query to fetch id, name, and expenseacct from active expensecategory records
            var suiteql = "SELECT id, name, expenseacct FROM expensecategory WHERE isinactive = 'F'";

            // Execute the query and get mapped results
            var queryResults = query.runSuiteQL({ query: suiteql }).asMappedResults();

            // Log the number of results retrieved
            log.debug('Query Results', 'Found ' + queryResults.length + ' active expense categories');

            // Check if results are empty
            if (queryResults.length === 0) {
                log.audit('No Results', 'No active expense categories found');
                return JSON.stringify([]);
            }

            // Map query results to response format
            queryResults.forEach(function (row) {
                results.push({
                    id: row.id,
                    name: row.name,
                    expenseacct: row.expenseacct || null
                });
            });

            // Return JSON string of results
            return JSON.stringify(results);

        } catch (e) {
            // Log error details
            log.error({
                title: 'RESTlet GET Error',
                details: {
                    message: e.message,
                    name: e.name,
                    stack: e.stack
                }
            });

            // Return error response
            return JSON.stringify([{ id: null, error: e.message }]);
        }
    }

    // Expose the doGet function for GET requests
    return {
        get: doGet
    };
});