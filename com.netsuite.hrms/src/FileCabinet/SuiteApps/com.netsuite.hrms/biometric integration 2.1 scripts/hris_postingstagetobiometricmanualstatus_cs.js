/**
*@NApiVersion 2.1
*@NScriptType ClientScript
* @NModuleScope Public
 */

var QUERY;
define(['N/currentRecord', 'N/record', 'N/ui/dialog', 'N/search', 'N/format', 'N/query', 'N/url'],
    function (currentRecord, record, dialog, search, format, query, url) {
        QUERY = query;



        //function fieldChangedCount(type, name, linenum)
        function pageInit(scriptContext) {
            debugger;
            try {

                var currentRecordObj = currentRecord.get();


                var status = currentRecordObj.getValue({
                    fieldId: 'custpage_mrstatus'
                });


                function refresh() {
                    if (new Date().getTime() - time >= 60000) {
                        window.location.reload(true);
                    } else {
                        setTimeout(refresh(), 1000);
                    }
                }

                setTimeout(function () {

                    var status = currentRecordObj.getValue({
                        fieldId: 'custpage_mrstatus'
                    });


                    if (status != 'Completed') {
                        // Assuming 'custpage_submitbutton' is the id of the submit button
                        document.getElementById('custpage_submitbutton').click();


                        saveRecord();

                    } else {

                        var suiteletURL = url.resolveScript({
                            scriptId: 'customscript_hris_postingtobiomanual_sl',
                            deploymentId: 'customdeploy_hris_postingtobiomanual_sl',

                        });



                        window.location.href = suiteletURL

                    }
                }, 1000);
            }
            catch (e) {
                log.debug("error in page init ", e);
            }
        }


        function saveRecord(scriptContext) {
            debugger;
            try {
                //  var currentRecord = scriptContext.currentRecord;
                var currentRecordObj = currentRecord.get();

                var status = currentRecordObj.getValue({
                    fieldId: 'custpage_mrstatus'
                });
                var mrTaskId = currentRecordObj.getValue({
                    fieldId: 'custpage_mrstask'
                });


                var suiteletURL = url.resolveScript({
                    scriptId: 'customscript_hris_postingtobiostatus_sl',
                    deploymentId: 'customdeploy_hris_postingtobiostatus_sl',
                    params: {
                        custscript_chqall_tskid: mrTaskId,

                    }
                });



                window.location.href = suiteletURL

            }
            catch (e) {
                log.debug("error in saverecord ", e);
            }
        }

        return {
            pageInit: pageInit,
            saveRecord: saveRecord,

        };
    });
















