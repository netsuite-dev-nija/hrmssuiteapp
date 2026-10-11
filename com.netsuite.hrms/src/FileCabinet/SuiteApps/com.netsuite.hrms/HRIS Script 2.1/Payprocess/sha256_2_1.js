/**
 * @NApiVersion 2.1
 * SHA-256 implementation for NetSuite 2.1
 * Based on Paul Johnston's SHA implementation
 * Converted for use with NetSuite require() modules
 */
define([], function() {

    var hexcase = 0;  // hex output format. 0 - lowercase; 1 - uppercase
    var b64pad  = ""; // base-64 pad character. "=" for strict RFC compliance
    var chrsz   = 8;  // bits per input character. 8 - ASCII; 16 - Unicode

    function hex_sha256(s) {
        return binb2hex(core_sha256(str2binb(s), s.length * chrsz));
    }

    function b64_sha256(s) {
        return binb2b64(core_sha256(str2binb(s), s.length * chrsz));
    }

    function str_sha256(s) {
        return binb2str(core_sha256(str2binb(s), s.length * chrsz));
    }

    function hex_hmac_sha256(key, data) {
        return binb2hex(core_hmac_sha256(key, data));
    }

    function b64_hmac_sha256(key, data) {
        return binb2b64(core_hmac_sha256(key, data));
    }

    function str_hmac_sha256(key, data) {
        return binb2str(core_hmac_sha256(key, data));
    }

    function sha256_vm_test() {
        return hex_sha256("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    }

    var sha256_K = [
        0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
        0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEBA02, 0x9BDC06A7, 0xC19BF174,
        0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
        0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
        0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
        0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
        0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
        0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
    ];

    function core_sha256(x, len) {
        x[len >> 5] |= 0x80 << (24 - len % 32);
        x[((len + 64 >> 9) << 4) + 15] = len;

        var w = Array(64);
        var a = 0x6a09e667;
        var b = 0xbb67ae85;
        var c = 0x3c6ef372;
        var d = 0xa54ff53a;
        var e = 0x510e527f;
        var f = 0x9b05688c;
        var g = 0x1f83d9ab;
        var h = 0x5be0cd19;

        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;
            var olde = e;
            var oldf = f;
            var oldg = g;
            var oldh = h;

            for (var j = 0; j < 64; j++) {
                if (j < 16) w[j] = x[i + j];
                else w[j] = safe_add(safe_add(safe_add(gamma1256(w[j-2]), w[j-7]), gamma0256(w[j-15])), w[j-16]);

                var t1 = safe_add(safe_add(safe_add(safe_add(h, sigma1256(e)), ch(e, f, g)), sha256_K[j]), w[j]);
                var t2 = safe_add(sigma0256(a), maj(a, b, c));
                h = g;
                g = f;
                f = e;
                e = safe_add(d, t1);
                d = c;
                c = b;
                b = a;
                a = safe_add(t1, t2);
            }

            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
            e = safe_add(e, olde);
            f = safe_add(f, oldf);
            g = safe_add(g, oldg);
            h = safe_add(h, oldh);
        }
        return Array(a, b, c, d, e, f, g, h);
    }

    function ch(x, y, z) {
        return ((x & y) ^ ((~x) & z));
    }

    function maj(x, y, z) {
        return ((x & y) ^ (x & z) ^ (y & z));
    }

    function sigma0256(x) {
        return (ror(x, 2) ^ ror(x, 13) ^ ror(x, 22));
    }

    function sigma1256(x) {
        return (ror(x, 6) ^ ror(x, 11) ^ ror(x, 25));
    }

    function gamma0256(x) {
        return (ror(x, 7) ^ ror(x, 18) ^ (x >>> 3));
    }

    function gamma1256(x) {
        return (ror(x, 17) ^ ror(x, 19) ^ (x >>> 10));
    }

    function core_hmac_sha256(key, data) {
        // Ensure proper UTF-8 encoding for key and data
        var keyUTF8 = utf8Encode(key);
        var dataUTF8 = utf8Encode(data);
        
        var bkey = str2binb(keyUTF8);
        if (bkey.length > 16) bkey = core_sha256(bkey, keyUTF8.length * chrsz);

        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        var hash = core_sha256(ipad.concat(str2binb(dataUTF8)), 512 + dataUTF8.length * chrsz);
        return core_sha256(opad.concat(hash), 512 + 256);
    }

    function safe_add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    function ror(num, cnt) {
        return ((num >>> cnt) | (num << (32 - cnt)));
    }

    function str2binb(str) {
        var bin = Array();
        var mask = (1 << chrsz) - 1;
        for (var i = 0; i < str.length * chrsz; i += chrsz)
            bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i % 32);
        return bin;
    }

    function binb2str(bin) {
        var str = "";
        var mask = (1 << chrsz) - 1;
        for (var i = 0; i < bin.length * 32; i += chrsz)
            str += String.fromCharCode((bin[i >> 5] >>> (32 - chrsz - i % 32)) & mask);
        return str;
    }

    function binb2hex(binarray) {
        var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var str = "";
        for (var i = 0; i < binarray.length * 4; i++) {
            str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
                   hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
        }
        return str;
    }

    function binb2b64(binarray) {
        var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var str = "";
        for (var i = 0; i < binarray.length * 4; i += 3) {
            var triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16)
                        | (((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8)
                        | ((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
            for (var j = 0; j < 4; j++) {
                if (i * 8 + j * 6 > binarray.length * 32) str += b64pad;
                else str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
            }
        }
        return str;
    }

    // UTF-8 encoding for proper string to bytes conversion
    function utf8Encode(str) {
        var utf8 = [];
        for (var i = 0; i < str.length; i++) {
            var code = str.charCodeAt(i);
            if (code < 0x80) {
                utf8.push(code);
            } else if (code < 0x800) {
                utf8.push(0xC0 | (code >> 6));
                utf8.push(0x80 | (code & 0x3F));
            } else if (code < 0x10000) {
                utf8.push(0xE0 | (code >> 12));
                utf8.push(0x80 | ((code >> 6) & 0x3F));
                utf8.push(0x80 | (code & 0x3F));
            }
        }
        var str2 = "";
        for (var i = 0; i < utf8.length; i++) {
            str2 += String.fromCharCode(utf8[i]);
        }
        return str2;
    }

    return {
        hex_sha256: hex_sha256,
        b64_sha256: b64_sha256,
        str_sha256: str_sha256,
        hex_hmac_sha256: hex_hmac_sha256,
        b64_hmac_sha256: b64_hmac_sha256,
        str_hmac_sha256: str_hmac_sha256,
        sha256_vm_test: sha256_vm_test
    };
});
