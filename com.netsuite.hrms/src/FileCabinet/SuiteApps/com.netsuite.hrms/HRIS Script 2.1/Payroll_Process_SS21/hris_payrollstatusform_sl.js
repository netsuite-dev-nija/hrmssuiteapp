/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @Description Converted to SuiteScript 2.1 (functionality unchanged)
 */
var runtime;
var format;
var search;
var query;
define(['N/log', 'N/search', 'N/record', 'N/ui/serverWidget', 'N/format', 'N/runtime', 'N/query', 'N/task'],
    function (log, search, record, serverWidget, format, runtime, query, task) {
        runtime = runtime;
        format = format;
        search = search;
        query = query;
        function onRequest(context) {
            try {
                log.debug('Request Method', ' ' + context.request.method);

                if (context.request.method === 'GET') {
                    /*   var timeZone = checkTimeZone();
                     log.debug('time_Zone', timeZone); */
                    var timeZone = 'Asia/Muscat';
                    var form = serverWidget.createForm({
                        title: 'Pay Process Status'
                    });

                    var offsetTemp = getOffSet(timeZone);
                 //   log.debug('offset_Temp', offsetTemp);
                    var offset = -7;

                    var systemDate = new Date(new Date().getTime() + offset * 3600 * 1000);
                 //   log.debug('d_SystemDate', systemDate + 'type' + typeof (systemDate));

                    //var dateFormat = checkDateFormat();
                    var dateFormat = 'DD/MM/YYYY';
                //    log.debug('date_format', dateFormat);

                    var currentSystemDay = systemDate.getDate();
                //    log.debug('currentSystem_day', currentSystemDay);

                    var currentSystemMonth = systemDate.getMonth() + 1;
                  //  log.debug('currentSystem_month', currentSystemMonth);

                    var currentSystemYear = systemDate.getFullYear();
                  //  log.debug('currentSystem_year', currentSystemYear);

                    var currentSystemHours = systemDate.getHours();
                  //  log.debug('currentSystem_hours', currentSystemHours);

                    var currentSystemMinutes = systemDate.getMinutes();
                  //  log.debug('currentSystem_minutes', currentSystemMinutes);

                    var sMeridiem = 'am';
                    if (currentSystemHours == 12)
                        sMeridiem = 'pm';
                    if ((currentSystemHours > 12) || (currentSystemHours == '00')) {
                        currentSystemHours = getHours(currentSystemHours);
                        if (currentSystemHours == 12)
                            sMeridiem = 'am';
                        else
                            sMeridiem = 'pm';
                       //log.debug('currentSystem_hours', currentSystemHours);
                    }

                    var fDateCreated = form.addField({
                        id: 'custpage_date',
                        type: 'text',
                        label: 'Date Created'
                    });
                    fDateCreated.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    var dateAsFormat = getDateAsFormat(currentSystemMonth, currentSystemDay, currentSystemYear, dateFormat);
                    //log.debug('d_DateAsFormat', dateAsFormat);

                    var systemDateTemp = dateAsFormat + ' ' + currentSystemHours + ':' + currentSystemMinutes + ' ' + sMeridiem;
                   //log.debug('d_SystemDateTemp', systemDateTemp);

                    var sDateCreated = context.request.parameters.custscript_datecreated;
                   // log.debug('s_DateCreated', sDateCreated);

                    if (_logValidation(sDateCreated))
                        systemDateTemp = sDateCreated;
                   // log.debug('d_SystemDateTemp', systemDateTemp);
                    fDateCreated.defaultValue = systemDateTemp;

                    var fProcessStatus = form.addField({
                        id: 'custpage_process',
                        type: 'float',
                        label: 'Process Status'
                    });
                    fProcessStatus.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    form.clientScriptModulePath = './hris_payrollcomplstatus_cl';
                    var iCount = context.request.parameters.custscript_truecount;
                    var iCountTemp = context.request.parameters.custscript_count;
                    //log.debug('i_CountTemp', iCountTemp);

                    var fCount = form.addField({
                        id: 'custpage_count',
                        type: 'text',
                        label: 'Count'
                    });
                    if (_logValidation(iCount))
                        fCount.defaultValue = iCount;
                    if (_logValidation(iCountTemp))
                        fCount.defaultValue = iCountTemp;
                     fCount.updateDisplayType({
                         displayType: serverWidget.FieldDisplayType.HIDDEN
                     });

                    if (_logValidation(iCount))
                        var formula = 100 / iCount;
                    //log.debug('i_Count', iCount);

                    var iRatio = context.request.parameters.custscript_ratio;
                   // log.debug('i_Ratio', iRatio);

                    var fRatio = form.addField({
                        id: 'custpage_ratio',
                        type: 'float',
                        label: 'Ratio'
                    });
                     fRatio.updateDisplayType({
                         displayType: serverWidget.FieldDisplayType.HIDDEN
                     });

                    var iFormula;
                    if (_logValidation(iCount)) {
                        fRatio.defaultValue = formula;
                        iFormula = formula;
                    } else if (_logValidation(iRatio)) {
                        fRatio.defaultValue = iRatio;
                        iFormula = iRatio;
                    }

                    var iPayGroupFilter = context.request.parameters.custscript_pagegroup;
                    //log.debug('i_PayGroupFilter', iPayGroupFilter);

                    var iPayGroupFilterTemp = context.request.parameters.custscript_paygroupfilter;
                    //log.debug('i_PayGroupFilterTemp', iPayGroupFilterTemp);


                  
                    var fPayGroupFilter = form.addField({
                        id: 'custpage_paygroupfilter',
                        type: 'integer',
                        label: 'Pay Group Filter'
                    });
                    fPayGroupFilter.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                   
                    var iSubsidiaryFilter = context.request.parameters.custscript_subsidiary;
                    //log.audit('i_SubsidiaryFilter', iSubsidiaryFilter);

                    var iSubsidiaryFilterTemp = context.request.parameters.custscript_subsidiaryfilter;
                  //  log.audit('i_SubsidiaryTemp', iSubsidiaryFilterTemp);


                   
                    var fSubsidiaryFilter = form.addField({
                        id: 'custpage_subsidiaryfilter',
                        type: 'integer',
                        label: 'Subsidiary Filter'
                    });
                    fSubsidiaryFilter.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                  
                   
                    var Paygrp = context.request.parameters.custscript_prepagegroup;
                    log.audit("Paygrp", Paygrp)
                    var PaygrpFilter = form.addField({
                        id: 'custpage_paygrpfilter',
                        type: serverWidget.FieldType.INTEGER,
                        label: 'Paygrp Filter'
                    });

                    PaygrpFilter.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    //  if (_logValidation(checkedemp)) {
                    PaygrpFilter.defaultValue = Paygrp;
                  
                    var Subsidiary = context.request.parameters.custscript_presubsidiary;
                    log.audit("Subsidiary", Subsidiary)
                    var SubsidiaryFilter = form.addField({
                        id: 'custpage_subsifilter',
                        type: serverWidget.FieldType.INTEGER,
                        label: 'Subsidiary Filter'
                    });

                    SubsidiaryFilter.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    //  if (_logValidation(checkedemp)) {
                        SubsidiaryFilter.defaultValue = Subsidiary;
                  
                 
                  
                 
                    var iProcessedCount;
                    /* if (_logValidation(iPayGroupFilter) && _logValidation(iSubsidiaryFilter)) {
                        fPayGroupFilter.defaultValue = iPayGroupFilter;
                        //iProcessedCount = getProcessedCount(iPayGroupFilter);
                        iProcessedCount = get_ProcessedCount(query, iPayGroupFilter,iSubsidiaryFilter);
                        log.audit('i_ProcessedCount', iProcessedCount);
                    } else if (_logValidation(iPayGroupFilterTemp)&&_logValidation(iSubsidiaryFilterTemp)) {
                        fPayGroupFilter.defaultValue = iPayGroupFilterTemp;
                        iProcessedCount = get_ProcessedCount(query, iPayGroupFilterTemp, iSubsidiaryFilterTemp);
                        log.audit('i_ProcessedCount', iProcessedCount);
                    } */

                    if (_logValidation(Paygrp) && _logValidation(Subsidiary)) {
                        fPayGroupFilter.defaultValue = Paygrp;
                        fSubsidiaryFilter.defaultValue = Subsidiary;
                        //iProcessedCount = getProcessedCount(iPayGroupFilter);
                        iProcessedCount = get_ProcessedCount(query, Paygrp,Subsidiary);
                        log.audit('i_ProcessedCount', iProcessedCount);
                    }

                    var iStatus = 0.00;
                    iStatus = (iFormula * iProcessedCount);
                    iStatus = iStatus.toFixed(0);
                    //log.debug('i_Status', iStatus);

                    var style = '<style type="text/css">#myProgress { position: relative; width: 100%; height: 30px; background-color: #ddd; } #myBar { position: absolute; width: ' + iStatus + '%; height: 100%; background-color: #4CAF50; } #label { text-align: center; line-height: 30px; color: white; }</style>';

                    var message = '<head>';
                    message += "<meta http-equiv=\"refresh\" content=\"10\" \/>";
                    message += '<meta charset="utf-8" />';
                    //create HTML
                    var html = '<html>';
                    html = html + style;

                    html = html + '</head>';
                    html = html + '<body>';

                    html = html + '<div id= "myProgress">';
                    html = html + '<div id="myBar">';
                    if (iStatus == '100')
                        html = html + '<div id="label">' + iStatus + '% Completed</div>';
                    else
                        html = html + '<div id="label">' + iStatus + '%</div>';
                    html = html + '</div>';
                    html = html + '</div>';
                    html = html + '</body>';
                    html = html + '</html>';

                    var fRefresh = form.addField({
                        id: 'custpage_refresh',
                        type: 'text',
                        label: 'RefreshTrigger'
                    });
                    fRefresh.defaultValue = iStatus;
                    fRefresh.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    var fStatusBar = form.addField({
                        id: 'custpage_statusbar',
                        type: 'inlinehtml',
                        label: 'HTML Content'
                    });
                    fStatusBar.defaultValue = html;

                    var fPayProcessSublist = form.addSublist({
                        id: 'custpage_payprocesssublist',
                        type: serverWidget.SublistType.LIST,
                        label: 'Pre Pay Process Record for pay process display'
                    });
                    fPayProcessSublist.addField({
                        id: 'custpage_emp',
                        type: 'text',
                        label: 'EMPLOYEE NAME'
                    });
                    fPayProcessSublist.addField({
                        id: 'custpage_paygroup',
                        type: 'text',
                        label: 'PAY GROUP'
                    });
                    fPayProcessSublist.addField({
                        id: 'custpage_wagemnt',
                        type: 'text',
                        label: 'WAGE MONTH'
                    });
                    fPayProcessSublist.addField({
                        id: 'custpage_year',
                        type: 'text',
                        label: 'YEAR'
                    });
                    fPayProcessSublist.addField({
                        id: 'custpage_check',
                        type: 'text',
                        label: 'CHECKED'
                    });
                    fPayProcessSublist.addField({
                        id: 'custpage_status',
                        type: 'text',
                        label: 'STATUS'
                    });

                    /*     form.addSubmitButton({
                            label: "Refresh",
                        });
    
                        context.response.writePage(form);
                    }
                    if (context.request.method === 'POST') { */





                    /*   
                       if (_logValidation(iPayGroupFilter))
                           searchFilters.push(search.createFilter({
                               name: 'custrecord_hris_pre_pay_pr_pay_group',
                               operator: search.Operator.ANYOF,
                               values: iPayGroupFilter
                           }));
                     
   
                       var searchColumns = [
                           search.createColumn({ name: 'custrecord_hris_pre_pay_pr_employee_name' }),
                           search.createColumn({ name: 'custrecord_hris_pre_pay_pr_pay_group' }),
                           search.createColumn({ name: 'custrecord_hris_pre_pay_pr_wage_month' }),
                           search.createColumn({ name: 'custrecord_hris_pre_pay_pr_year' }),
                           search.createColumn({ name: 'custrecord_hris_pre_pay_pr_checked' }),
                           search.createColumn({ name: 'custrecord_hris_pre_pay_pr_status' }),
                           //  search.createColumn({ name: 'created',sort: search.Sort.ASC})
                       ];
   
                       var customrecord_hris_pre_pay_process_recordSearch = search.create({
                           type: 'customrecord_hris_pre_pay_process_record',
                           filters: searchFilters,
                           columns: searchColumns
                       }).run().getRange({ start: 0, end: 1000 }); // Adjust the limit as needed
   
                       if (_logValidation(customrecord_hris_pre_pay_process_recordSearch)) {
                           log.debug('Inside Search')
                           log.debug('customrecord_hris_pre_pay_process_recordSearch.length',customrecord_hris_pre_pay_process_recordSearch.length)
                           for (var iTemp = 0; iTemp < customrecord_hris_pre_pay_process_recordSearch.length; iTemp++) {
                               var row = customrecord_hris_pre_pay_process_recordSearch[iTemp];
                               var sEmpName = row.getText({ name: 'custrecord_hris_pre_pay_pr_employee_name' });
                               log.debug('sEmpName',sEmpName);
                               var sPayGroup = row.getText({ name: 'custrecord_hris_pre_pay_pr_pay_group' });
                               log.debug('sPayGroup',sPayGroup);
                               var sWageMnt = row.getValue({ name: 'custrecord_hris_pre_pay_pr_wage_month' });
                               log.debug('sWageMnt',sWageMnt);
                               var sYear = row.getText({ name: 'custrecord_hris_pre_pay_pr_year' });
                               log.debug('sYear',sYear);
                               var sCheck = row.getValue({ name: 'custrecord_hris_pre_pay_pr_checked' });
                               log.debug('sCheck',sCheck);
                               sCheck = (sCheck == 'T') ? 'Yes' : 'No';
                               var sStatus = row.getValue({ name: 'custrecord_hris_pre_pay_pr_status' });
   
                               fPayProcessSublist.setSublistValue({
                                   id: 'custpage_emp',
                                   line: iTemp,
                                   value: sEmpName
                               });
                               fPayProcessSublist.setSublistValue({
                                   id: 'custpage_paygroup',
                                   line: iTemp,
                                   value: sPayGroup
                               });
                               fPayProcessSublist.setSublistValue({
                                   id: 'custpage_wagemnt',
                                   line: iTemp,
                                   value: sWageMnt
                               });
                               fPayProcessSublist.setSublistValue({
                                   id: 'custpage_year',
                                   line: iTemp,
                                   value: sYear
                               });
                               fPayProcessSublist.setSublistValue({
                                   id: 'custpage_check',
                                   line: iTemp,
                                   value: sCheck
                               });
                               fPayProcessSublist.setSublistValue({
                                   id: 'custpage_status',
                                   line: iTemp,
                                   value: sStatus
                               });
                           }
                       } */


             /*        var sqlprepay = " select BUILTIN.DF(custrecord_hris_pre_pay_pr_employee_name)as empname,BUILTIN.DF(custrecord_hris_pre_pay_pr_pay_group) as paygroup ,custrecord_hris_pre_pay_pr_wage_month,\
                     BUILTIN.DF(custrecord_hris_pre_pay_pr_year) as year ,custrecord_hris_pre_pay_pr_checked,custrecord_hris_pre_pay_pr_status\
                      from customrecord_hris_pre_pay_process_record where custrecord_hris_pre_pay_pr_pay_group = " + Paygrp;
                    log.debug("sqlprepay", sqlprepay); */

                    var sqlprepay = " select BUILTIN.DF(custrecord_hris_pre_pay_pr_employee_name)as empname,BUILTIN.DF(custrecord_hris_pre_pay_pr_pay_group) as paygroup ,custrecord_hris_pre_pay_pr_wage_month,\
                    BUILTIN.DF(custrecord_hris_pre_pay_pr_year) as year ,custrecord_hris_pre_pay_pr_checked,custrecord_hris_pre_pay_pr_status\
                     from customrecord_hris_pre_pay_process_record where custrecord_hris_pre_pay_pr_pay_group = " + Paygrp+"\
                    and custrecord_hris_pre_pay_pr_subsidiary = " + Subsidiary;
                    
                 

                   
                    /*  if(_logValidation(iPayGroupFilter)) {
                        sqlprepay += " where custrecord_hris_pre_pay_pr_pay_group = " + iPayGroupFilter+"";
                    }
                    if(_logValidation(iSubsidiaryFilter)) {
                        sqlprepay += " and custrecord_hris_pre_pay_pr_subsidiary = " + iSubsidiaryFilter;
                    } */

                      /*   if(_logValidation(Paygrp)) {
                            sqlprepay += " where custrecord_hris_pre_pay_pr_pay_group = " + Paygrp+"";
                        }
                        if(_logValidation(Subsidiary)) {
                            sqlprepay += " and custrecord_hris_pre_pay_pr_subsidiary = " + Subsidiary;
                        }   */ 
                    log.debug("sqlprepay", sqlprepay);

                    var queryRes = query.runSuiteQL({ query: sqlprepay });
                    var preResult = queryRes.asMappedResults();

                    if (preResult.length > 0) {

                        for (var iTemp = 0; iTemp < preResult.length; iTemp++) {
                            var prerow = preResult[iTemp];
                            var s_Status = prerow.custrecord_hris_pre_pay_pr_status;
                            var sEmpName = prerow.empname;
                            //log.debug('sEmpName', sEmpName);
                            var sPayGroup = prerow.paygroup
                          //  log.debug('sPayGroup', sPayGroup);
                            var sWageMnt = prerow.custrecord_hris_pre_pay_pr_wage_month;
                         //   log.debug('sWageMnt', sWageMnt);
                            var sYear = prerow.year;
                        //    log.debug('sYear', sYear);
                            var sCheck = prerow.custrecord_hris_pre_pay_pr_checked || '';
                        //    log.debug('sCheck', sCheck);
                            sCheck = (sCheck == 'T') ? 'Yes' : 'No';
                            var sStatus = prerow.custrecord_hris_pre_pay_pr_status || '';

                            fPayProcessSublist.setSublistValue({
                                id: 'custpage_emp',
                                line: iTemp,
                                value: sEmpName
                            });
                            fPayProcessSublist.setSublistValue({
                                id: 'custpage_paygroup',
                                line: iTemp,
                                value: sPayGroup
                            });
                            fPayProcessSublist.setSublistValue({
                                id: 'custpage_wagemnt',
                                line: iTemp,
                                value: sWageMnt
                            });
                            fPayProcessSublist.setSublistValue({
                                id: 'custpage_year',
                                line: iTemp,
                                value: sYear
                            });
                            fPayProcessSublist.setSublistValue({
                                id: 'custpage_check',
                                line: iTemp,
                                value: sCheck
                            });
                            if (sStatus != '') {
                                fPayProcessSublist.setSublistValue({
                                    id: 'custpage_status',
                                    line: iTemp,
                                    value: sStatus
                                });
                            }

                        }



                    }

                    form.addButton({
                        id: 'custpage_submitbutton',
                        label: 'Refresh',
                        functionName: 'saveRecord()'
                    });

                    context.response.writePage(form);
                }
            } catch (e) {
                if (e instanceof nlobjError)
                    log.debug('system error', e.code + '\n' + e.details);
                else
                    log.debug('unexpected error', e.toString());
            }
        }

        // Function Definitions go here...

        return {
            onRequest: onRequest
        };
    });
/**
 * Check if the value is valid.
 * @param {string|number|null|undefined} value - The value to be checked.
 * @returns {boolean} - True if the value is valid, false otherwise.
 */
function _logValidation(value) {
    return (
        value !== 'null' &&
        value !== null &&
        value !== '' &&
        value !== undefined &&
        value !== 'undefined' &&
        !isNaN(value)
    );
}

/**
 * Get the processed count based on the pay group filter.
 * @param {string} i_PayGroupFilter - Pay group filter.
 * @returns {number} - The processed count.
 */
function get_ProcessedCount(query, i_PayGroupFilter,i_SubsidiaryFilter) {
    var trueCount = 0;
    /*  var a_Filter = [];
 
     if (_logValidation(i_PayGroupFilter)) {
         a_Filter.push(['custrecord_hris_pre_pay_pr_pay_group', 'anyof', i_PayGroupFilter]);
     }
 
     var a_Columns = [
         ['custrecord_hris_pre_pay_pr_status', null, null],
         ['created', null, null, true],
     ];
 
     var customrecord_hris_pre_pay_process_recordSearch = search.create({
         type: 'customrecord_hris_pre_pay_process_record',
         filters: a_Filter,
         columns: a_Columns,
     }).run().getRange({ start: 0, end: 1000 }); // Adjust the limit as needed
 
     if (_logValidation(customrecord_hris_pre_pay_process_recordSearch)) {
         for (var i_Temp = 0; i_Temp < customrecord_hris_pre_pay_process_recordSearch.length; i_Temp++) {
             var row = customrecord_hris_pre_pay_process_recordSearch[i_Temp];
             var s_Status = row.getValue({ name: 'custrecord_hris_pre_pay_pr_status' });
 
             if (s_Status == 'Completed') {
                 trueCount++;
             }
         }
     } */
    var sqlprepay = " select * from customrecord_hris_pre_pay_process_record \
       where custrecord_hris_pre_pay_pr_pay_group = " + i_PayGroupFilter +" and custrecord_hris_pre_pay_pr_subsidiary = " + i_SubsidiaryFilter;
    log.debug("sqlprepay getprocessed count", sqlprepay);
    var queryRes = query.runSuiteQL({ query: sqlprepay });
    var preResult = queryRes.asMappedResults();

    if (preResult.length > 0) {

        for (var loop = 0; loop < preResult.length; loop++) {
            var prerow = preResult[loop];
            var s_Status = prerow.custrecord_hris_pre_pay_pr_status;
            if (s_Status == 'Completed') {
                trueCount++;
            }
        }
    }

    return trueCount;
}

/**
 * Delete previous records based on the pay group filter.
 * @param {string} i_PayGroupFilter - Pay group filter.
 * @returns {boolean} - True if deletion is successful, false otherwise.
 */
function deletePrevRecords(i_PayGroupFilter) {
    var a_Filter = [];

    if (_logValidation(i_PayGroupFilter)) {
        a_Filter.push(['custrecord_hris_pre_pay_pr_pay_group', 'anyof', i_PayGroupFilter]);
    }

    a_Filter.push(['created', null, 'on', 'today']);

    var a_Columns = ['internalid', 'custrecord_hris_pre_pay_pr_status', 'created'];

    var customrecord_hris_pre_pay_process_recordSearch = search.create({
        type: 'customrecord_hris_pre_pay_process_record',
        filters: a_Filter,
        columns: a_Columns,
    }).run().getRange({ start: 0, end: 1000 });

    if (_logValidation(customrecord_hris_pre_pay_process_recordSearch)) {
        for (var i_Temp = 0; i_Temp < customrecord_hris_pre_pay_process_recordSearch.length; i_Temp++) {
            var row = customrecord_hris_pre_pay_process_recordSearch[i_Temp];
            var s_Status = row.getValue({ name: 'custrecord_hris_pre_pay_pr_status' });
            var i_InternalID = row.getValue({ name: 'internalid' });

            log.debug('DEBUG', 'i_InternalID', i_InternalID);
            //nlapiDeleteRecord('customrecord_hris_pre_pay_process_record', i_InternalID);
            record.delete({
                type: 'customrecord_hris_pre_pay_process_record',
                id: i_InternalID
            });

            log.debug({
                title: 'Record Deleted',
                details: 'Record with internal ID ' + i_InternalID + ' deleted successfully.'
            });
        }
    }

    return true;
}

/**
 * Convert 12-hour format to 24-hour format.
 * @param {string} currentSystem_hours - The current system hours in 12-hour format.
 * @returns {number} - The converted system hours in 24-hour format.
 */
function getHours(currentSystem_hours) {
    var i_SystemHours;

    switch (currentSystem_hours) {
        case '13':
            i_SystemHours = 1;
            break;
        case '14':
            i_SystemHours = 2;
            break;
        case '15':
            i_SystemHours = 3;
            break;
        case '16':
            i_SystemHours = 4;
            break;
        case '17':
            i_SystemHours = 5;
            break;
        case '18':
            i_SystemHours = 6;
            break;
        case '19':
            i_SystemHours = 7;
            break;
        case '20':
            i_SystemHours = 8;
            break;
        case '21':
            i_SystemHours = 9;
            break;
        case '22':
            i_SystemHours = 10;
            break;
        case '23':
            i_SystemHours = 11;
            break;
        case '0':
            i_SystemHours = 12;
            break;
        default:
            i_SystemHours = parseInt(currentSystem_hours);
            break;
    }

    return i_SystemHours;
}

/**
 * Check the time zone.
 * @returns {string} - The time zone.
 */
function checkTimeZone() {
    /* var timeFormatPref = runtime.getCurrentScript().getParameter({
        name: 'TIMEZONE'
    }); */

    /* var timeFormatPref = runtime.getCurrentUser().getPreference({
        name: 'TIMEZONE'
    }); */

    var timeFormatPref = runtime.getUserTimezone();

    log.debug({
        title: 'Time Zone',
        details: timeFormatPref
    });

    return timeFormatPref;
}

/**
 * Get the time offset based on the time zone.
 * @param {string} time_Zone - The time zone.
 * @returns {number} - The time offset.
 */
function getOffSet(time_Zone) {
    var i_offSet;

    switch (time_Zone) {
        case 'Asia/Calcutta':
            i_offSet = 5.5;
            break;
        case 'Etc/GMT+12':
            i_offSet = -12;
            break;
        case 'Pacific/Samoa':
            i_offSet = -11;
            break;
        case 'Pacific/Honolulu':
            i_offSet = -10;
            break;
        case 'America/Anchorage':
            i_offSet = -8;
            break;
        case 'America/Tijuana':
        case 'America/Los_Angeles':
            i_offSet = -7;
            break;
        case 'America/Denver':
        case 'America/Los_Angeles':
            i_offSet = -6;
            break;
        // Add more cases for other time zones as needed
    }

    return i_offSet;
}

/**
 * Check the date format preference.
 * @returns {string} - The date format.
 */
function checkDateFormat() {
    /* var dateFormatPref = runtime.getCurrentScript().getParameter({
        name: 'dateformat'
    }); */
    var dateFormatPref = format.format({
        type: format.Type.DATE,
        value: new Date()
    });


    log.debug({
        title: 'Date Format',
        details: dateFormatPref
    });

    return dateFormatPref;
}

/**
 * Get the date formatted based on the given parameters.
 * @param {number} currentSystem_month - The current system month.
 * @param {number} currentSystem_day - The current system day.
 * @param {number} currentSystem_year - The current system year.
 * @param {string} date_format - The desired date format.
 * @returns {string} - The formatted date.
 */
function getDateAsFormat(currentSystem_month, currentSystem_day, currentSystem_year, date_format) {
    var d_current_date_f = '';
    var s_month = '';

    switch (date_format) {
        case 'YYYY-MM-DD':
            d_current_date_f = currentSystem_year + '-' + currentSystem_month + '-' + currentSystem_day;
            break;
        case 'DD/MM/YYYY':
            d_current_date_f = currentSystem_day + '/' + currentSystem_month + '/' + currentSystem_year;
            break;
        case 'MM/DD/YYYY':
            d_current_date_f = currentSystem_month + '/' + currentSystem_day + '/' + currentSystem_year;
            break;
        case 'DD.MM.YYYY':
            d_current_date_f = currentSystem_day + '.' + currentSystem_month + '.' + currentSystem_year;
            break;
        case 'YYYY/MM/DD':
            d_current_date_f = currentSystem_year + '/' + currentSystem_month + '/' + currentSystem_day;
            break;
        case 'DD-Mon-YYYY':
            var s_month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            s_month = s_month_names[currentSystem_month - 1];
            d_current_date_f = currentSystem_day + '-' + s_month + '-' + currentSystem_year;
            break;
        case 'DD-MONTH-YYYY':
            var s_month_names_full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            s_month = s_month_names_full[currentSystem_month - 1];
            d_current_date_f = currentSystem_day + '-' + s_month + '-' + currentSystem_year;
            break;
        case 'DD MONTH, YYYY':
            s_month = s_month_names_full[currentSystem_month - 1];
            d_current_date_f = currentSystem_day + ' ' + s_month + ', ' + currentSystem_year;
            break;
        default:
            break;
    }

    return d_current_date_f;
}
