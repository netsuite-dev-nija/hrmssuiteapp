/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/url','N/runtime'], function(url,runtime) {

    // BEGIN PAGE INIT ==================================================
    function pageInit(scriptContext) {
        debugger;
    }
    // END PAGE INIT ====================================================

    // BEGIN SAVE RECORD ================================================
    function saveRecord(scriptContext) {
        return true;
    }
    // END SAVE RECORD ==================================================

    // BEGIN VALIDATE FIELD =============================================
    function validateField(scriptContext) {
        return true;
    }
    // END VALIDATE FIELD ===============================================

    // BEGIN FIELD CHANGED ==============================================
    function fieldChanged(scriptContext) {
    }
    // END FIELD CHANGED ================================================

    // BEGIN POST SOURCING ==============================================
    function postSourcing(scriptContext) {
    }
    // END POST SOURCING ================================================

    // BEGIN LINE INIT ==============================================
    function lineInit(scriptContext) {
    }
    // END LINE INIT ================================================

    // BEGIN VALIDATE LINE ==============================================
    function validateLine(scriptContext) {
        return true;
    }
    // END VALIDATE LINE ================================================

    // BEGIN RECALC =====================================================
    function recalc(scriptContext) {
    }
    // END RECALC =======================================================

    // BEGIN FUNCTION ===================================================
    function callSuitelet(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary) {
        debugger;
        var i_mode = 1;
        
        var s_suitelet_url = url.resolveScript({
            scriptId: 'customscript_hris_wpssalrpt_uae',
            deploymentId: 'customdeploy_hris_wpssalrpt_uae',
            returnExternalUrl: false,
            params: {
                moltype: molParameter || '',
                department: '',
                year: yearParameter || '',
                month: monthParameter || '',
                processtype: processType || '',
                i_mode: 1,
                process_grp: empPaygroup || '',
                subsidiary: subsidiary || ''
            }
        });
        window.open(s_suitelet_url, '_self');
    }

    function callSIF_File(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary) {
        debugger;
        var i_mode = 2;
        var s_suitelet_url = url.resolveScript({
            scriptId: 'customscript_hris_wpssalrpt_uae',
            deploymentId: 'customdeploy_hris_wpssalrpt_uae',
            returnurl: false,
            params: {
                moltype: molParameter || '',
                department: '',
                year: yearParameter || '',
                month: monthParameter || '',
                processtype: processType || '',
                i_mode: i_mode,
                process_grp: empPaygroup || '',
                subsidiary: subsidiary || ''
            }
        });
        window.open(s_suitelet_url, '_self');
    }

    function callSIFReport_File(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary) {
        debugger;
        var i_mode = 3;
        var s_suitelet_url = url.resolveScript({
            scriptId: 'customscript_hris_wpssalrpt_uae',
            deploymentId: 'customdeploy_hris_wpssalrpt_uae',
            returnurl: false,
            params: {
                moltype: molParameter || '',
                department: '',
                year: yearParameter || '',
                month: monthParameter || '',
                processtype: processType || '',
                i_mode: i_mode,
                process_grp: empPaygroup || '',
                subsidiary: subsidiary || ''
            }
        });
        window.open(s_suitelet_url, '_self');
    }

    function callSuiteletForApprovalReport(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary) {
        debugger;
        var i_mode = 1;
        
        var s_suitelet_url = url.resolveScript({
            scriptId: 'customscript_hris_payapproverpt',
            deploymentId: 'customdeploy_hris_payapproverpt',
            returnurl: false,
            params: {
                moltype: molParameter || '',
                department: '',
                year: yearParameter || '',
                month: monthParameter || '',
                processtype: processType || '',
                i_mode: i_mode,
                process_grp: empPaygroup || '',
                subsidiary: subsidiary || ''
            }
        });
        window.open(s_suitelet_url, '_self');
    }

    function CallWps(molParameter, yearParameter, monthParameter, processType, subsidiary) {
        var i_mode = 1;
        
        var s_suitelet_url = url.resolveScript({
            scriptId: 'customscript_sut_wps_report_2',
            deploymentId: 'customdeploy_sut_wps_report_2',
            returnurl: false,
            params: {
                moltype: molParameter || '',
                department: '',
                year: yearParameter || '',
                month: monthParameter || '',
                processtype: processType || '',
                i_mode: i_mode,
                subsidiary: subsidiary || ''
            }
        });
        window.open(s_suitelet_url, '_self');
    }

    function CallWps_Quatar(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary) {
        var i_mode = 1;
        
        var s_suitelet_url = url.resolveScript({
            scriptId: 'customscript_hris_wpssalrpt_qatar',
            deploymentId: 'customdeploy_hris_wpssalrpt_qatar',
            returnurl: false,
            params: {
                moltype: molParameter || '',
                department: '',
                year: yearParameter || '',
                month: monthParameter || '',
                processtype: processType || '',
                i_mode: i_mode,
                process_grp: empPaygroup || '',
                subsidiary: subsidiary || ''
            }
        });
        window.open(s_suitelet_url, '_self');
    }

    function downloadSFIReport_Quatar(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary) {
        var i_mode = 2;
        
        var s_suitelet_url = url.resolveScript({
            scriptId: 'customscript_hris_wpssalrpt_qatar',
            deploymentId: 'customdeploy_hris_wpssalrpt_qatar',
            returnurl: false,
            params: {
                moltype: molParameter || '',
                department: '',
                year: yearParameter || '',
                month: monthParameter || '',
                processtype: processType || '',
                i_mode: i_mode,
                process_grp: empPaygroup || '',
                subsidiary: subsidiary || ''
            }
        });
        window.open(s_suitelet_url, '_self');
    }

    function CallWps_Saudi(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary) {
        var i_mode = 1;
        
        var s_suitelet_url = url.resolveScript({
            scriptId: 'customscript_hris_wpssalrpt_saudi',
            deploymentId: 'customdeploy_hris_wpssalrpt_saudi',
            returnurl: false,
            params: {
                moltype: molParameter || '',
                department: '',
                year: yearParameter || '',
                month: monthParameter || '',
                processtype: processType || '',
                i_mode: i_mode,
                process_grp: empPaygroup || '',
                subsidiary: subsidiary || ''
            }
        });
        window.open(s_suitelet_url, '_self');
    }

    function downloadSFIReport_Saudi(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary) {
        var i_mode = 2;
        
        var s_suitelet_url = url.resolveScript({
            scriptId: 'customscript_hris_wpssalrpt_saudi',
            deploymentId: 'customdeploy_hris_wpssalrpt_saudi',
            returnurl: false,
            params: {
                moltype: molParameter || '',
                department: '',
                year: yearParameter || '',
                month: monthParameter || '',
                processtype: processType || '',
                i_mode: i_mode,
                process_grp: empPaygroup || '',
                subsidiary: subsidiary || ''
            }
        });
        window.open(s_suitelet_url, '_self');
    }
    // END FUNCTION =====================================================

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        lineInit: lineInit,
        validateLine: validateLine,
        recalc: recalc,
        callSuitelet: callSuitelet,
        callSIF_File: callSIF_File,
        callSIFReport_File: callSIFReport_File,
        callSuiteletForApprovalReport: callSuiteletForApprovalReport,
        CallWps: CallWps,
        CallWps_Quatar: CallWps_Quatar,
        downloadSFIReport_Quatar: downloadSFIReport_Quatar,
        CallWps_Saudi: CallWps_Saudi,
        downloadSFIReport_Saudi: downloadSFIReport_Saudi
    };
});