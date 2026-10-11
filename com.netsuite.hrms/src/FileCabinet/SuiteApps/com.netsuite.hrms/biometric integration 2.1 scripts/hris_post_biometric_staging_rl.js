/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/format', 'N/runtime'], 
function (log, record, format, runtime) {

    function post(requestBody, requestParams) {

        var restletUrl = '';
        var dataArray = [];
        var rawFilterDate = null;
        var starttime = null;
        var endtime = null;

        try {

            log.debug('Request Params', requestParams);
            log.debug('Request Body', requestBody);

            // =====================================================
            // 1️⃣ HANDLE INPUT (Single JSON OR Array JSON)
            // =====================================================

            // Case 1: If URL params passed
            if (requestParams && requestParams.punch_time) {

                rawFilterDate = requestParams.punch_time;
                starttime = requestParams.start_time;
                endtime = requestParams.end_time;
            }

            // Case 2: Single JSON object (your current case)
            else if (requestBody && requestBody.punch_time) {

                rawFilterDate = requestBody.punch_time;
                starttime = requestBody.start_time;
                endtime = requestBody.end_time;

                dataArray = [requestBody]; // wrap into array
            }

            // Case 3: JSON with data array
            else if (requestBody && requestBody.data && requestBody.data.length > 0) {

                rawFilterDate = requestBody.data[0].punch_time;
                starttime = requestBody.data[0].start_time;
                endtime = requestBody.data[0].end_time;

                dataArray = requestBody.data;
            }

            // =====================================================
            // 2️⃣ VALIDATION
            // =====================================================

            if (!rawFilterDate) {
                return { status: 'ERROR', message: 'punch_time is missing.' };
            }

            if (!starttime || !endtime) {
                return { status: 'ERROR', message: 'start_time or end_time is missing.' };
            }

            // =====================================================
            // 3️⃣ DATE PARSING (NO NEED FOR DD/MM/YYYY CONVERSION)
            // =====================================================

            var filterDateOnly = rawFilterDate.split(' ')[0]; // YYYY-MM-DD

          /*   var bioDate = format.parse({
                value: filterDateOnly,
                type: format.Type.DATE
            });

            log.audit('Parsed Date', bioDate); */

            // =====================================================
            // 4️⃣ BUILD RESTLET URL STRING
            // =====================================================



            var accountId = runtime.accountId;

          /*   restletUrl =
                'https://' + accountId +
                '.restlets.api.netsuite.com/app/site/hosting/restlet.nl' +
                '?script=4679&deploy=1' +
                '&start_time=' + encodeURIComponent(starttime) +
                '&end_time=' + encodeURIComponent(endtime);
 */
                var restletUrl =
    'https://' + accountId +
    '.restlets.api.netsuite.com/app/site/hosting/restlet.nl' +
    '?script=4679' +
    '&deploy=1' +
    '&start_time=' + starttime +
    '&end_time=' + endtime;

            log.audit('Generated RESTlet URL', restletUrl);

            // =====================================================
            // 5️⃣ CREATE STAGING RECORD
            // =====================================================
            filterDateOnly=formatToDDMMYYYY(filterDateOnly);
            log.debug('Processing Records for Date dd/mm/yyyy', filterDateOnly);
          var bioDate= format.parse({
                    value: filterDateOnly,
                    type: format.Type.DATE
                });
/* var bioDate = format.parse({
        value:filterDateOnly,
        type: format.Type.DATE
    }); */
    log.audit("bioDate",bioDate);

            var rec = record.create({
                type: 'customrecord_hris_biometric_staging'
            });

            rec.setValue('custrecord_hris_biostage_date', bioDate);
            rec.setValue('custrecord_hris_biostage_requestapi', restletUrl);
            rec.setValue('custrecord_hris_biostage_response', JSON.stringify(dataArray));
            rec.setText('custrecord_hris_biostage_responsestatus', 'Success');

            var recordId = rec.save();

            return {
                status: 'SUCCESS',
                date_filtered: filterDateOnly,
                total_received: dataArray.length,
                staging_record_id: recordId
            };

        } catch (e) {

            log.error('Fatal Script Error', e);

            try {
                var errorRec = record.create({
                    type: 'customrecord_hris_biometric_staging'
                });

                errorRec.setValue('custrecord_hris_biostage_requestapi', restletUrl || '');
                errorRec.setValue('custrecord_hris_biostage_response', JSON.stringify(requestBody || {}));
                errorRec.setText('custrecord_hris_biostage_responsestatus', 'Error');
                errorRec.setValue('custrecord_hris_biostage_responseerror', e.message);

                errorRec.save();

            } catch (innerError) {
                log.error('Error Saving Error Record', innerError);
            }

            return {
                status: 'ERROR',
                message: e.message
            };
        }
    }

    return {
        post: post
    };

});
function formatToDDMMYYYY(dateStr) {
    var parts = dateStr.split('-'); // ["2025","10","31"]
    return parts[2] + '/' + parts[1] + '/' + parts[0];
}