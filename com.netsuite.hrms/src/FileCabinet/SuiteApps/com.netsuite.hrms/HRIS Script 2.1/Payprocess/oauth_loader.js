/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['N/file', 'N/log'], function(file, log) {

    var _OAuth = null;
    var _CryptoJS = null;
    var isLoaded = false;

    function loadLibraries() {
        if (isLoaded) return;

        try {
            // ========== UPDATE THESE TWO PATHS ==========
            var oauthPath  = 'SuiteScripts/HRIS Script 2.1/Payprocess/oauth_new.js';
            var sha256Path = 'SuiteScripts/HRIS Script 2.1/Payprocess/sha256.js';
            // ============================================

            // Polyfill nlapiLogExecution
            globalThis.nlapiLogExecution = function(type, title, details) {
                try {
                    if (type === 'ERROR' || type === 'EMERGENCY') {
                        log.error(title || '', details || '');
                    } else {
                        log.debug(title || '', details || '');
                    }
                } catch (e) {}
            };

            var sha256Content = file.load({ id: sha256Path }).getContents();
            var oauthContent  = file.load({ id: oauthPath }).getContents();

            // Force the UMD pattern to use globalThis instead of this
            var forcedSha256 = sha256Content
                .replace(/\(this\s*,\s*function/, '(globalThis, function')
                .replace(/t\.CryptoJS\s*=\s*r\(\)/g, 'globalThis.CryptoJS = r()');

            // Execute CryptoJS
            eval(forcedSha256);

            _CryptoJS = globalThis.CryptoJS;

            if (!_CryptoJS) {
                // Last resort fallback
                eval('var root = globalThis; ' + sha256Content);
                _CryptoJS = globalThis.CryptoJS;
            }

            if (!_CryptoJS) {
                throw new Error('CryptoJS still not available after all attempts');
            }

            globalThis.CryptoJS = _CryptoJS;
            log.debug('CryptoJS', 'Loaded successfully');

            // Execute OAuth library
            eval(oauthContent);

            _OAuth = globalThis.OAuth || OAuth;

            if (!_OAuth) {
                throw new Error('OAuth still not available');
            }

            globalThis.OAuth = _OAuth;
            log.debug('OAuth', 'Loaded successfully');

            isLoaded = true;

        } catch (e) {
            log.error('loadLibraries Error', e);
            throw e;
        }
    }

    return {
        getOAuth: function() {
            loadLibraries();
            return _OAuth;
        },
        getCryptoJS: function() {
            loadLibraries();
            return _CryptoJS;
        }
    };
});