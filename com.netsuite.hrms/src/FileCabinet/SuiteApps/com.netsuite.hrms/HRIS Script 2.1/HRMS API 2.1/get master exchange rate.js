/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/search', 'N/format'], function(search, format) {
    /**
     * Function to handle GET requests to retrieve currency rate records for the previous day
     * @param {Object} context - The request parameters sent to the RESTlet (not used here)
     * @returns {String} - JSON string containing currency rate records or error message
     */
    function getData(context) {
        try {
            // Get the current date and subtract one day
            var currentDate = new Date();
            currentDate.setDate(currentDate.getDate()-1);
            var formattedDate = format.format({
                value: currentDate,
                type: format.Type.DATE
            });

            // Create the search object for the currencyrate table
            var currencyRateSearchObj = search.create({
                type: 'currencyrate',
                filters: [
                    ['effectivedate', 'on', formattedDate]
                ],
                columns: [
                    search.createColumn({ name: 'internalid', label: 'Internal ID' }),
                    search.createColumn({ name: 'basecurrency', label: 'Base Currency' }),
                    search.createColumn({ name: 'transactioncurrency', label: 'Transaction Currency' }),
                    search.createColumn({ name: 'exchangerate', label: 'Exchange Rate' }),
                    search.createColumn({ name: 'effectivedate', label: 'Effective Date' })
                ]
            });

            // Get the search result count
            var searchResultCount = currencyRateSearchObj.runPaged().count;
            log.debug('currencyRateSearchObj result count', searchResultCount);

            // Initialize response structure
            var response = {
                Status: 'Success',
                ResponseCode: '200',
                totalRecords: searchResultCount,
                records: []
            };

            // Run the search and process each result
            currencyRateSearchObj.run().each(function(result) {
                var record = {
                    id: result.getValue({ name: 'internalid' }) || '',
                    baseCurrency: result.getValue({ name: 'basecurrency' }) || '',
                    baseCurrencyText: result.getText({ name: 'basecurrency' }) || '',
                    transactionCurrency: result.getValue({ name: 'transactioncurrency' }) || '',
                    transactionCurrencyText: result.getText({ name: 'transactioncurrency' }) || '',
                    exchangeRate: result.getValue({ name: 'exchangerate' }) || '',
                    effectiveDate: result.getValue({ name: 'effectivedate' }) || ''
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