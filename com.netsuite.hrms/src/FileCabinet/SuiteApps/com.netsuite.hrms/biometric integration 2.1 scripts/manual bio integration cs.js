define(['N/http', 'N/log', 'N/record', 'N/encode'],
function(httpModule, log, recordModule, encodeModule) {
    /**
     * Performs HTTP POST request to fetch transaction data.
     * @param {Object} reqObj - Request object containing start_time, end_time, and emp_code
     * @param {String} reqType - Request type ('Transaction')
     * @param {Number} pgno - Page number
     */
    function httpPost(reqObj, reqType, pgno) {
        var postData = {"username": "admin", "password": "PureHarvest777"};
        postData = JSON.stringify(postData);
        var header = [];
        header['Content-Type'] = 'application/json';
        header['content-length'] = '295370';
        header['accept'] = 'application/json';
        header['Authorization'] = 'Basic ' + encodeModule.convert({
            string: JSON.parse(postData).username + ':' + JSON.parse(postData).password,
            inputEncoding: encodeModule.Encoding.UTF_8,
            outputEncoding: encodeModule.Encoding.BASE_64
        });

        var strurl = '';
        if (reqType === 'Transaction') {
            var par = 'start_time=' + encodeURIComponent(reqObj.start_time);
            par += '&end_time=' + encodeURIComponent(reqObj.end_time);
            par += '&page=' + pgno;
            if (reqObj.emp_code) {
                par += '&emp_code=' + encodeURIComponent(reqObj.emp_code);
            }
            strurl = 'http://zeetech.dyndns.org:8081/iclock/api/transactions/?' + par;
        }

        log.debug({
            title: 'strurl',
            details: strurl
        });

        var requestObject = {};
        try {
            var response = httpModule.get({
                url: strurl,
                body: reqObj,
                headers: header
            });
            var responseobject = JSON.parse(response.body);
            return responseobject;
        } catch (er03) {
            log.error('ERROR in httpPost', JSON.stringify(er03));
            throw er03;
        }
    }

    return {
        httpPost: httpPost
    };
});