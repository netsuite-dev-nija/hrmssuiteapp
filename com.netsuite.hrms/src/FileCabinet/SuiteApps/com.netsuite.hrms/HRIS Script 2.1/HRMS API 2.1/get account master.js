/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/search'], function(search) {
    /**
     * Function to handle GET requests to retrieve account records
     * @param {Object} context - The request parameters sent to the RESTlet (not used here)
     * @returns {String} - JSON string containing account records or error message
     */
    function getData(context) {
        try {
            // Create the search object for the account table
            var accountSearchObj = search.create({
                type: 'account',
                filters: [],
                columns: [
                    search.createColumn({ name: 'internalid', label: 'Internal ID' }),
                    search.createColumn({ name: 'name', label: 'Account Name' }),
                   // search.createColumn({ name: 'displayname', label: 'Display Name' })
                ]
            });

            // Get the search result count
            var searchResultCount = accountSearchObj.runPaged().count;
            log.debug('accountSearchObj result count', searchResultCount);

            // Initialize response structure
            var response = {
                Status: 'Success',
                ResponseCode: '200',
                totalRecords: searchResultCount,
                records: []
            };

            // Run the search and process each result
            accountSearchObj.run().each(function(result) {
                var record = {
                    id: result.getValue({ name: 'internalid' }) || '',
                    acctName: result.getValue({ name: 'name' }) || '',
                   // displayName: result.getValue({ name: 'displayname' }) || ''
                };
                response.records.push(record);
                return true;
            });

            // Log the final response for debugging
            log.debug('Final Response', response);

            // Return the response as a JSON string
            return JSON.stringify(response);
        } catch (ex) {
            // Log error details
            log.error({
                title: 'Error in getData',
                details: ex.toString()
            });

            // Return error response as a JSON string
            return JSON.stringify({
                Status: 'Error',
                ResponseCode: '500',
                Message: 'An error occurred while processing the request.',
                Details: ex.toString()
            });
        }
    }

    // Map HTTP method to function
    return {
        get: getData
    };
});