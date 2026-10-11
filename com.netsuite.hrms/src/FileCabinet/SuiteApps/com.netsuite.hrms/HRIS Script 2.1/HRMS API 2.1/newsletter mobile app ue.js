/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/query', 'N/log', 'N/https', 'N/record', 'N/file', 'N/runtime'], function (
    query, log, https, record, file, runtime
) {

    /**
     * afterSubmit - Entry point for the user event script.
     * Triggers on record creation or update, fetches data via SuiteQL, 
     * builds the required JSON payload, and POSTs it to the mobile API endpoint.
     *
     * @param {Object} context
     */
    function afterSubmit(context) {
        // Only run on create or edit actions
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
            return;
        }

        var newRecord = context.newRecord;
        var newsletterId = newRecord.id;

        log.debug({ title: 'hris_newsletter_ue | afterSubmit', details: 'Newsletter ID: ' + newsletterId });

        if (!newsletterId) {
            log.error({ title: 'hris_newsletter_ue | Missing ID', details: 'New record ID is empty.' });
            return;
        }

        var apiUrl = 'https://mobapp.nijatech.com:5612/api/mobileapp/addnewsletter';

        // ── SuiteQL ──────────────────────────────────────────────────────────────
        // Fetch core fields from the Newsletter custom record.
        var newsletterQuery =
            'SELECT ' +
            '  N.id                                                AS internalid, ' +
            '  N.custrecord_hris_newsletter_title                  AS title, ' +
            '  N.custrecord_hris_newsletter_category               AS category, ' +
            '  N.custrecord_hris_newsletter_remarks                AS remarks, ' +
            '  N.custrecord_hris_newsletter_publish_date           AS publish_date, ' +
            '  N.custrecord_hris_newslette_effective_from          AS effective_from, ' +
            '  N.custrecord_hris_newsletter_effective_to           AS effective_to, ' +
            '  N.custrecord_hris_newsletter_subsidiary             AS subsidiary_ids, ' +
            '  BUILTIN.DF(N.custrecord_hris_newsletter_subsidiary) AS subsidiary_names, ' +
            '  N.custrecord_hris_newsletter_location               AS location_ids, ' +
            '  BUILTIN.DF(N.custrecord_hris_newsletter_location)   AS location_names, ' +
            '  N.custrecord_hris_newsletter_department             AS department_ids, ' +
            '  BUILTIN.DF(N.custrecord_hris_newsletter_department) AS department_names, ' +
            '  N.isinactive                                        AS is_inactive ' +
            'FROM customrecord_newsletter N ' +
            'WHERE N.id = ' + newsletterId;

        log.debug({ title: 'hris_newsletter_ue | SuiteQL', details: newsletterQuery });

        var resultSet = query.runSuiteQL({ query: newsletterQuery });
        var rows      = resultSet.asMappedResults();

        if (!rows || !rows.length) {
            log.error({ title: 'hris_newsletter_ue | No Data', details: 'Query returned no results for ID ' + newsletterId });
            return;
        }

        var row = rows[0];
        log.debug({ title: 'hris_newsletter_ue | Query Row', details: JSON.stringify(row) });

        // ── Format Date Helper ───────────────────────────────────────────────
        function formatDate(dateStr) {
    if (!dateStr) {
        return '';
    }

    return String(dateStr);
}

        // ── Build multi-select arrays ─────────────────────────────────────────
        var subsidiaryArr  = buildPairArray(row.subsidiary_ids,  row.subsidiary_names,  'subsidiaryId', 'subsidiaryName');
        var locationArr    = buildPairArray(row.location_ids,    row.location_names,    'locationCode', 'locationName');
        var departmentArr  = buildPairArray(row.department_ids,  row.department_names,  'departmentId', 'departmentName');

        // ── Build the API payload ─────────────────────────────────────────────
        var payload = {
            internalId:     parseInt(row.internalid, 10) || null,
            title:          row.title          || '',
            category:       row.category       || '',
            remarks:        row.remarks        || '',
            publishDate:    formatDate(row.publish_date),
            effectiveFrom:  formatDate(row.effective_from),
            effectiveTo:    formatDate(row.effective_to),
            subsidiary:     subsidiaryArr,
            locations:      locationArr,
            departments:    departmentArr,
            attachmentUrl:  '',
            isActive:       (row.is_inactive === 'F' || row.is_inactive === false)
        };

        var jsonData = JSON.stringify(payload);
        log.debug({ title: 'hris_newsletter_ue | Payload', details: jsonData });

        // ── Send to API ───────────────────────────────────────────────────────
        sendToMobileAPI(apiUrl, jsonData, row.internalid);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * buildPairArray
     * Converts parallel comma-separated id/name strings returned by SuiteQL into
     * an array of key-value objects expected by the mobile API.
     *
     * @param {string} idsStr   - Comma-separated internal IDs
     * @param {string} namesStr - Comma-separated display names
     * @param {string} idKey    - Key name for the ID in the output object
     * @param {string} nameKey  - Key name for the name in the output object
     * @returns {Array}
     */
    function buildPairArray(idsStr, namesStr, idKey, nameKey) {
        if (!idsStr) { return []; }

        var ids   = idsStr.split(',');
        var names = namesStr ? namesStr.split(',') : [];
        var arr   = [];

        for (var i = 0; i < ids.length; i++) {
            var obj        = {};
            obj[idKey]     = (ids[i]   || '').trim();
            obj[nameKey]   = (names[i] || '').trim();
            arr.push(obj);
        }
        return arr;
    }

    /**
     * getToken
     * Authenticates with the mobile API and returns a JWT bearer token.
     *
     * @returns {string|null}
     */
    function getToken() {
        try {
            var authData = {
                email:    'elevate@gmail.com',
                password: 'elevate@123'
            };

            var authResponse = https.post({
                url:     'https://mobapp.nijatech.com:5612/api/netsuite/gettoken',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(authData)
            });

            log.debug({ title: 'hris_newsletter_ue | getToken Response Code', details: authResponse.code });

            if (authResponse.code === 200) {
                var authBody = JSON.parse(authResponse.body);
                return authBody.jwtoken || null;
            }

            log.error({ title: 'hris_newsletter_ue | getToken Failed', details: 'HTTP ' + authResponse.code });
            return null;
        } catch (e) {
            log.error({ title: 'hris_newsletter_ue | getToken Error', details: e.message });
            return null;
        }
    }

    /**
     * sendToMobileAPI
     * Obtains a token, POSTs the newsletter payload to the mobile API endpoint,
     * and handles response logging.
     *
     * @param {string} apiUrl     - Target API URL
     * @param {string} jsonData   - Stringified JSON payload
     * @param {string|number} internalId - Newsletter record internal ID
     */
    function sendToMobileAPI(apiUrl, jsonData, internalId) {
        var response     = null;
        var responseBody = {};

        try {
            var token = getToken();
            log.debug({ title: 'hris_newsletter_ue | Token Retrieved', details: token ? 'Yes' : 'No' });

            if (!token) {
                log.error({ title: 'hris_newsletter_ue | sendToMobileAPI', details: 'Cannot proceed without a valid token.' });
                return;
            }

            response = https.post({
                url:     apiUrl,
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: jsonData
            });

            log.debug({ title: 'hris_newsletter_ue | API Response Code', details: response.code });
            log.debug({ title: 'hris_newsletter_ue | API Response Body', details: response.body });

            try {
                responseBody = response.body ? JSON.parse(response.body) : {};
            } catch (parseErr) {
                log.error({ title: 'hris_newsletter_ue | Response Parse Error', details: parseErr.message });
            }

        } catch (apiErr) {
            log.error({ title: 'hris_newsletter_ue | API Call Failed', details: apiErr.message });
        }
    }

    return { afterSubmit: afterSubmit };
});