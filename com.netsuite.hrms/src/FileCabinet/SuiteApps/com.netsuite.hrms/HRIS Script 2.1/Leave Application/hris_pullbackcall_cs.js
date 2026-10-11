/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/url', 'N/log'],
    (currentRecord, url, log) => {

        /**
         * pageInit
         */
        const pageInit = (context) => {
          debugger;
            try {
                const rec = currentRecord.get();

                const openwindow = rec.getValue({
                    fieldId: 'custpage_triggerredirect'
                });

                log.debug('pageInit', 'openwindow = ' + openwindow);

                if (openwindow === 'open') {
                    // Redirect to Leave Application list
                    // Update the URL below with your actual account + record type ID
                   /*  window.open(
                        'https://5294658.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=262',
                        '_self'
                    ); */
                    window.open(
                        'https://2772245.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=894',
                        '_self'
                    );
                }
            } catch (e) {
                log.error('pageInit Error', e);
            }
        };

        /**
         * PullbackLeave - called from button / link
         * @param {string|number} LeaveRecID
         */
        const PullbackLeave = (LeaveRecID) => {
          debugger;
            try {
                const suiteletUrl = url.resolveScript({
                    scriptId: 'customscript_hris_mod_pullback_sl',
                    deploymentId: 'customdeploy_hris_mod_pullback_sl',
                    params: {
                        leavid: LeaveRecID
                    }
                });

                window.open(suiteletUrl, '_self');
            } catch (e) {
                log.error('PullbackLeave Error', e);
                alert('Error while opening Pullback form: ' + e.message);
            }
        };

        return {
            pageInit,
            PullbackLeave
        };
    });