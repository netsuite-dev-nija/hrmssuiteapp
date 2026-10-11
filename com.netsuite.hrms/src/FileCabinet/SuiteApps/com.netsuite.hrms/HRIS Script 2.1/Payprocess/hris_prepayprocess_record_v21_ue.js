/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/redirect', 'N/https', 'N/log'], 
    function(record, redirect, https, log) {

    // ============= SHA-1 HMAC (Inline) =============
    var hexcase = 0;
    var b64pad = "";
    var chrsz = 8;

    function hex_sha1(s) { return binb2hex(core_sha1(str2binb(s), s.length * chrsz)); }
    function b64_sha1(s) { return binb2b64(core_sha1(str2binb(s), s.length * chrsz)); }
    function hex_hmac_sha1(key, data) { return binb2hex(core_hmac_sha1(key, data)); }
    function b64_hmac_sha1(key, data) { b64pad = '='; return binb2b64(core_hmac_sha1(key, data)); }

    function core_sha1(x, len) {
        x[len >> 5] |= 0x80 << (24 - len % 32);
        x[((len + 64 >> 9) << 4) + 15] = len;
        var w = Array(80);
        var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, e = -1009589776;
        for (var i = 0; i < x.length; i += 16) {
            var olda = a, oldb = b, oldc = c, oldd = d, olde = e;
            for (var j = 0; j < 80; j++) {
                if (j < 16) w[j] = x[i + j];
                else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
                var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
                e = d; d = c; c = rol(b, 30); b = a; a = t;
            }
            a = safe_add(a, olda); b = safe_add(b, oldb); c = safe_add(c, oldc); d = safe_add(d, oldd); e = safe_add(e, olde);
        }
        return Array(a, b, c, d, e);
    }

    function sha1_ft(t, b, c, d) {
        if (t < 20) return (b & c) | ((~b) & d);
        if (t < 40) return b ^ c ^ d;
        if (t < 60) return (b & c) | (b & d) | (c & d);
        return b ^ c ^ d;
    }

    function sha1_kt(t) {
        return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
    }

    function core_hmac_sha1(key, data) {
        var bkey = str2binb(key);
        if (bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);
        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
        var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
        return core_sha1(opad.concat(hash), 512 + 160);
    }

    function safe_add(x, y) { var lsw = (x & 0xFFFF) + (y & 0xFFFF); var msw = (x >> 16) + (y >> 16) + (lsw >> 16); return (msw << 16) | (lsw & 0xFFFF); }
    function rol(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
    function str2binb(str) { var bin = Array(); var mask = (1 << chrsz) - 1; for (var i = 0; i < str.length * chrsz; i += chrsz) bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i % 32); return bin; }
    function binb2str(bin) { var str = ""; var mask = (1 << chrsz) - 1; for (var i = 0; i < bin.length * 32; i += chrsz) str += String.fromCharCode((bin[i >> 5] >>> (32 - chrsz - i % 32)) & mask); return str; }
    function binb2hex(binarray) { var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef"; var str = ""; for (var i = 0; i < binarray.length * 4; i++) { str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) + hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF); } return str; }
    function binb2b64(binarray) { var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"; var str = ""; for (var i = 0; i < binarray.length * 4; i += 3) { var triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF); for (var j = 0; j < 4; j++) { if (i * 8 + j * 6 > binarray.length * 32) str += b64pad; else str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F); } } return str; }

    // ============= OAuth 1.0 (Inline) =============
    var OAuth = {};
    OAuth.setProperties = function(into, from) { if (into != null && from != null) { for (var key in from) { into[key] = from[key]; } } return into; };
    OAuth.setProperties(OAuth, {
        percentEncode: function(s) {
            if (s == null) return "";
            if (s instanceof Array) { var e = ""; for (var i = 0; i < s.length; ++i) { if (e != "") e += '&'; e += OAuth.percentEncode(s[i]); } return e; }
            s = encodeURIComponent(s);
            s = s.replace(/\!/g, "%21"); s = s.replace(/\*/g, "%2A"); s = s.replace(/\'/g, "%27"); s = s.replace(/\(/g, "%28"); s = s.replace(/\)/g, "%29");
            return s;
        },
        decodePercent: function(s) { if (s != null) s = s.replace(/\+/g, " "); return decodeURIComponent(s); },
        getParameterList: function(parameters) {
            if (parameters == null) return [];
            if (typeof parameters != "object") return OAuth.decodeForm(parameters + "");
            if (parameters instanceof Array) return parameters;
            var list = []; for (var p in parameters) list.push([p, parameters[p]]); return list;
        },
        getParameterMap: function(parameters) {
            if (parameters == null) return {};
            if (typeof parameters != "object") return OAuth.getParameterMap(OAuth.decodeForm(parameters + ""));
            if (parameters instanceof Array) { var map = {}; for (var p = 0; p < parameters.length; ++p) { var key = parameters[p][0]; if (map[key] === undefined) map[key] = parameters[p][1]; } return map; }
            return parameters;
        },
        getParameter: function(parameters, name) {
            if (parameters instanceof Array) { for (var p = 0; p < parameters.length; ++p) { if (parameters[p][0] == name) return parameters[p][1]; } } else { return OAuth.getParameterMap(parameters)[name]; }
            return null;
        },
        formEncode: function(parameters) { var form = ""; var list = OAuth.getParameterList(parameters); for (var p = 0; p < list.length; ++p) { var value = list[p][1]; if (value == null) value = ""; if (form != "") form += '&'; form += OAuth.percentEncode(list[p][0]) + '=' + OAuth.percentEncode(value); } return form; },
        decodeForm: function(form) {
            var list = []; var nvps = form.split('&');
            for (var n = 0; n < nvps.length; ++n) {
                var nvp = nvps[n]; if (nvp == "") continue;
                var equals = nvp.indexOf('='); var name; var value;
                if (equals < 0) { name = OAuth.decodePercent(nvp); value = null; } else { name = OAuth.decodePercent(nvp.substring(0, equals)); value = OAuth.decodePercent(nvp.substring(equals + 1)); }
                list.push([name, value]);
            }
            return list;
        },
        setParameter: function(message, name, value) {
            var parameters = message.parameters;
            if (parameters instanceof Array) {
                for (var p = 0; p < parameters.length; ++p) {
                    if (parameters[p][0] == name) {
                        if (value === undefined) { parameters.splice(p, 1); } else { parameters[p][1] = value; value = undefined; }
                    }
                }
                if (value !== undefined) parameters.push([name, value]);
            } else {
                parameters = OAuth.getParameterMap(parameters); parameters[name] = value; message.parameters = parameters;
            }
        },
        setParameters: function(message, parameters) { var list = OAuth.getParameterList(parameters); for (var i = 0; i < list.length; ++i) OAuth.setParameter(message, list[i][0], list[i][1]); },
        getAuthorizationHeader: function(realm, parameters) {
            var header = 'OAuth realm="' + OAuth.percentEncode(realm) + '"'; var list = OAuth.getParameterList(parameters);
            for (var p = 0; p < list.length; ++p) { var parameter = list[p]; var name = parameter[0]; if (name.indexOf("oauth_") == 0) { header += ',' + OAuth.percentEncode(name) + '="' + OAuth.percentEncode(parameter[1]) + '"'; } }
            return header;
        },
        timeCorrectionMsec: 0,
        timestamp: function() { var t = (new Date()).getTime() + OAuth.timeCorrectionMsec; return Math.floor(t / 1000); },
        correctTimestamp: function(timestamp) { OAuth.timeCorrectionMsec = (timestamp * 1000) - (new Date()).getTime(); },
        nonce: function(length) { var chars = OAuth.nonce.CHARS; var result = ""; for (var i = 0; i < length; ++i) { var rnum = Math.floor(Math.random() * chars.length); result += chars.substring(rnum, rnum + 1); } return result; }
    });
    OAuth.nonce.CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";

    OAuth.declareClass = function(parent, name, newConstructor) { var previous = parent[name]; parent[name] = newConstructor; if (newConstructor != null && previous != null) { for (var key in previous) { if (key != "prototype") newConstructor[key] = previous[key]; } } return newConstructor; };
    OAuth.declareClass(OAuth, "SignatureMethod", function OAuthSignatureMethod() {});

    OAuth.setProperties(OAuth.SignatureMethod.prototype, {
        sign: function(message) { var baseString = OAuth.SignatureMethod.getBaseString(message); var signature = this.getSignature(baseString); OAuth.setParameter(message, "oauth_signature", signature); return signature; },
        initialize: function(name, accessor) { var consumerSecret; if (accessor.accessorSecret != null && name.length > 9 && name.substring(name.length - 9) == "-Accessor") { consumerSecret = accessor.accessorSecret; } else { consumerSecret = accessor.consumerSecret; } this.key = OAuth.percentEncode(consumerSecret) + "&" + OAuth.percentEncode(accessor.tokenSecret); }
    });

    OAuth.setProperties(OAuth.SignatureMethod, {
        sign: function(message, accessor) { var name = OAuth.getParameterMap(message.parameters).oauth_signature_method; if (name == null || name == "") { name = "HMAC-SHA1"; OAuth.setParameter(message, "oauth_signature_method", name); } OAuth.SignatureMethod.newMethod(name, accessor).sign(message); },
        newMethod: function(name, accessor) { var impl = OAuth.SignatureMethod.REGISTERED[name]; if (impl != null) { var method = new impl(); method.initialize(name, accessor); return method; } throw new Error("signature_method_rejected"); },
        REGISTERED: {},
        registerMethodClass: function(names, classConstructor) { for (var n = 0; n < names.length; ++n) OAuth.SignatureMethod.REGISTERED[names[n]] = classConstructor; },
        makeSubclass: function(getSignatureFunction) { var superClass = OAuth.SignatureMethod; var subClass = function() { superClass.call(this); }; subClass.prototype = new superClass(); subClass.prototype.getSignature = getSignatureFunction; subClass.prototype.constructor = subClass; return subClass; },
        getBaseString: function(message) {
            var URL = message.action; var q = URL.indexOf('?'); var parameters;
            if (q < 0) { parameters = message.parameters; } else { parameters = OAuth.decodeForm(URL.substring(q + 1)); var toAdd = OAuth.getParameterList(message.parameters); for (var a = 0; a < toAdd.length; ++a) parameters.push(toAdd[a]); }
            return OAuth.percentEncode(message.method.toUpperCase()) + '&' + OAuth.percentEncode(OAuth.SignatureMethod.normalizeUrl(URL)) + '&' + OAuth.percentEncode(OAuth.SignatureMethod.normalizeParameters(parameters));
        },
        normalizeUrl: function(url) {
            var uri = OAuth.SignatureMethod.parseUri(url); var scheme = uri.protocol.toLowerCase(); var authority = uri.authority.toLowerCase();
            var dropPort = (scheme == "http" && uri.port == 80) || (scheme == "https" && uri.port == 443);
            if (dropPort) { var index = authority.lastIndexOf(":"); if (index >= 0) authority = authority.substring(0, index); }
            var path = uri.path; if (!path) path = "/";
            return scheme + "://" + authority + path;
        },
        parseUri: function(str) {
            var o = { key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"], parser: { strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@\/]*):?([^:@\/]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/ } };
            var m = o.parser.strict.exec(str); var uri = {}; var i = 14; while (i--) uri[o.key[i]] = m[i] || ""; return uri;
        },
        normalizeParameters: function(parameters) {
            if (parameters == null) return "";
            var list = OAuth.getParameterList(parameters); var sortable = [];
            for (var p = 0; p < list.length; ++p) { var nvp = list[p]; if (nvp[0] != "oauth_signature") { sortable.push([OAuth.percentEncode(nvp[0]) + " " + OAuth.percentEncode(nvp[1]), nvp]); } }
            sortable.sort(function(a, b) { if (a[0] < b[0]) return -1; if (a[0] > b[0]) return 1; return 0; });
            var sorted = []; for (var s = 0; s < sortable.length; ++s) sorted.push(sortable[s][1]); return OAuth.formEncode(sorted);
        }
    });

    OAuth.SignatureMethod.registerMethodClass(["PLAINTEXT", "PLAINTEXT-Accessor"], OAuth.SignatureMethod.makeSubclass(function getSignature(baseString) { return this.key; }));
    OAuth.SignatureMethod.registerMethodClass(["HMAC-SHA1", "HMAC-SHA1-Accessor"], OAuth.SignatureMethod.makeSubclass(function getSignature(baseString) { return b64_hmac_sha1(this.key, baseString); }));

    // ============= Main Script =============
    function RestLet_PrePayprocessRec_AfterSubmit(context) {
        try {
            if (context.type !== 'delete') {
                var recId = context.newRecord.id;
                log.debug('RestLet_PrePayprocessRec_AfterSubmit', 'RecId: ' + recId);
                
                var signatureKeyParam = getSign();
                
                var o_payprocess = record.load({
                    type: 'customrecord_hris_pre_pay_process_record',
                    id: recId
                });
                
                var checked_pay_process = o_payprocess.getValue({
                    fieldId: 'custrecord_hris_pre_pay_pr_checked'
                });
                var checked_prePayfrq_seq = o_payprocess.getValue({
                    fieldId: 'custrecord_hris_pre_pay_pr_pay_freq_seq'
                });
                
                var count = 0;
                
                if (checked_pay_process === 'F') {
                    var data = { Record_id: recId };
                    var myJson = JSON.stringify(data);
                    
                    var signatureKey = signatureKeyParam[2];
                    if (signatureKey.indexOf("+") !== -1) {
                        signatureKey = signatureKey.replace("+", "%2B");
                    }
                    signatureKey = encodeURIComponent(signatureKey);
                    
                    var nonce = signatureKeyParam[4];
                    var timestamp = signatureKeyParam[5];
                    
                    var authHeader = "OAuth oauth_signature=\"" + signatureKey + "\",oauth_version=\"1.0\",oauth_nonce=\"" + nonce + "\",oauth_signature_method=\"HMAC-SHA1\",oauth_consumer_key=\"caf3843626a060720893d71c9ef7cf2a57275a5a64fdbe43db5b75b06d51fa56\",oauth_token=\"bab5ecc5f70d09faca29b012c480659870602cb4e07fe371ac3c4b92663f8a82\",oauth_timestamp=\"" + timestamp + "\",realm=\"2772245\"";
                    
                    var headType = {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    };
                    
                    if (checked_prePayfrq_seq == 1 || checked_prePayfrq_seq == '1') {
                        try {
                            var headType = {};
                            headType['Authorization'] = authHeader;
                            headType['Content-Type'] = 'application/json';
                        
                            var restletResponse = https.post({
                                url: 'https://2772245.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=173&deploy=1',
                                body: myJson,
                                headers: headType
                            });
                        
                            var coderesult = restletResponse.code;
                            log.debug('Response Code', 'Code: ' + coderesult);
                            log.debug('Response Body', 'Body: ' + restletResponse.body);
                            
                            if (coderesult == 200 || coderesult == '200') {
                                var total_count = restletResponse.body;
                                count = parseInt(total_count) + count;
                                
                                redirect.toSuitelet({
                                    scriptId: 'customscript_hris_prepayprocessstatus',
                                    deploymentId: 'customdeploy_hris_prepayprocessstatus',
                                    parameters: {
                                        'custscript_hris_payprocess_totalcount': count,
                                        'custscript_hris_payprocess_truecount': total_count
                                    }
                                });
                            } else {
                                log.error('Restlet Error Response', 'Code: ' + coderesult + ', Body: ' + restletResponse.body);
                                throw new Error('Restlet returned error code ' + coderesult);
                            }
                        } catch (httpsError) {
                            log.error('HTTPS Request Error', httpsError.message);
                            throw httpsError;
                        }
                    }
                }
            }
        } catch (e) {
            log.error('RestLet_PrePayprocessRec_AfterSubmit Error', e.message || e.toString());
            throw e;
        }
    }
    
    function getSign() {
        var restletUrl = "https://2772245.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=173&deploy=1";
        var param = '';
        
        var accessor = {
            consumerSecret: '169ac31a182759240d927e0a4c08afcd7715108f4ced2045f1e3ea3c00e4e6b9',
            tokenSecret: '2e1f9365005215a0513c1acc368c3173cfacda030cc979b732481e977656fda9'
        };
        
        var message = {
            method: 'POST',
            action: restletUrl,
            parameters: OAuth.decodeForm(param)
        };
        
        var timeStamp = OAuth.timestamp();
        var nonce = OAuth.nonce(11);
        
        message.parameters.push(['oauth_consumer_key', 'caf3843626a060720893d71c9ef7cf2a57275a5a64fdbe43db5b75b06d51fa56']);
        message.parameters.push(['oauth_nonce', nonce]);
        message.parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
        message.parameters.push(['oauth_timestamp', timeStamp]);
        message.parameters.push(['oauth_token', 'bab5ecc5f70d09faca29b012c480659870602cb4e07fe371ac3c4b92663f8a82']);
        message.parameters.push(['oauth_version', '1.0']);
        
        OAuth.SignatureMethod.sign(message, accessor);
        
        var arrSign = [];
        arrSign[0] = OAuth.SignatureMethod.normalizeParameters(message.parameters);
        arrSign[1] = OAuth.SignatureMethod.getBaseString(message);
        arrSign[2] = OAuth.getParameter(message.parameters, "oauth_signature");
        arrSign[3] = OAuth.getAuthorizationHeader("2772245", message.parameters);
        arrSign[4] = nonce;
        arrSign[5] = timeStamp;
        
        return arrSign;
    }
    
    return {
        afterSubmit: RestLet_PrePayprocessRec_AfterSubmit
    };
});
