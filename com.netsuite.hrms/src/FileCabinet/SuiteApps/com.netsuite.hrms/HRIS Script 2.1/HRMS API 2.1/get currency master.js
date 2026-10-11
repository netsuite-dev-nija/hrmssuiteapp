/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/search'], function(search) {
    /**
     * Function to handle GET requests to retrieve currency records
     * @param {Object} context - The request parameters sent to the RESTlet (not used here)
     * @returns {String} - JSON string containing currency records or error message
     */
    function getData(context) {
        try {
            // Create the search object for the currency table
            var currencySearchObj = search.create({
                type: 'currency',
                filters: [],
                columns: [
                    search.createColumn({ name: 'internalid', label: 'Internal ID' }),
                    search.createColumn({ name: 'name', label: 'Name' }),
                    search.createColumn({ name: 'symbol', label: 'Symbol' }),
                    //search.createColumn({ name: 'exchangerate', label: 'Exchange Rate' })
                ]
            });

            // Get the search result count
            var searchResultCount = currencySearchObj.runPaged().count;
            log.debug('currencySearchObj result count', searchResultCount);

            // Initialize response structure
            var response = {
                Status: 'Success',
                ResponseCode: '200',
                totalRecords: searchResultCount,
                records: []
            };

            // Run the search and process each result
            currencySearchObj.run().each(function(result) {
                var record = {
                    id: result.getValue({ name: 'internalid' }) || '',
                    name: result.getValue({ name: 'name' }) || '',
                    symbol: result.getValue({ name: 'symbol' }) || '',
                    //exchangeRate: result.getValue({ name: 'exchangerate' }) || ''
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