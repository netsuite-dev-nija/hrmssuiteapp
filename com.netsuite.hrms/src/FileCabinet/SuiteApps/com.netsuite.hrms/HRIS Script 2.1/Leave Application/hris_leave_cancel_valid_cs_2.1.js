/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/search', 'N/query', 'N/format', 'N/record', 'N/currentRecord', 'N/url'],
    (search, query, format, record, currentRecord, url) => {

        const pageInit = (scriptContext) => {
            try {
                const leaverecord = scriptContext.currentRecord;
                const flag = getUrlParameter('flag');
                console.log('Flag Check', flag);

                if (flag == 1) {
                    leaverecord.setValue({
                        fieldId: 'custrecord_hris_lve_cancellation',
                        value: true,
                        ignoreFieldChange: false,
                        forceSyncSourcing: true
                    });

                    leaverecord.setValue({
                        fieldId: 'custrecord_hris_lve_cancel_leavestatus',
                        value: 2,
                        ignoreFieldChange: false,
                        forceSyncSourcing: true
                    });

                    leaverecord.setValue('custrecord_hris_lveappapprovallevel', '', true, true);
                    leaverecord.setValue('custrecord_hris_lveapp_approvalusrtype', '', true, true);
                    leaverecord.setValue('custrecord_hris_lveapp_role', '', true, true);
                    leaverecord.setValue('custrecord_hris_lveapp_appruser', '', true, true);
                }
            } catch (e) {
                console.log('error in pageInit : ' + e);
            }
        };

        const fieldChanged = (scriptContext) => {
            try {
                const leaverecord = scriptContext.currentRecord;

                if (scriptContext.fieldId === 'custrecord_hris_lve_fromdate' ||
                    scriptContext.fieldId === 'custrecord_hris_lve_todate') {

                    let fromdate = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_fromdate' }) || '';
                    let todate = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_todate' }) || '';

                    if (!fromdate) return;

                    const fromdateno = fromdate.getMonth() + 1;
                    const fromdateyear = fromdate.getFullYear();

                    let totaldays = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' }) || 0;
                    const leavetype = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_leavetype' }) || '';
                    const empname = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_employeename' }) || '';

                    const Leave_type_seqno = get_sequence_no(leavetype);

                    // Sick Leave (sequence 7)
                    if (Leave_type_seqno == 7) {
                        const sicksql = `
                            SELECT NVL(SUM(a.custrecord_hris_lve_totalnodays), 0) AS totdays, 
                                   EXTRACT(MONTH FROM a.custrecord_hris_lve_fromdate) AS leave_month,
                                   EXTRACT(YEAR FROM a.custrecord_hris_lve_fromdate) as leave_year 
                            FROM customrecord_hris_leaveapplication a 
                            JOIN customrecord_hris_leaveconfig b ON a.custrecord_hris_lve_leavetype = b.id  
                            WHERE a.custrecord_hris_lve_employeename = ${empname} 
                              AND a.custrecord_hris_lve_leavetype = ${leavetype} 
                              AND EXTRACT(MONTH FROM a.custrecord_hris_lve_fromdate) = ${fromdateno} 
                              AND EXTRACT(YEAR FROM a.custrecord_hris_lve_fromdate) = ${fromdateyear}
                              AND a.custrecord_hris_lve_hrmsapprovalstatus = 2 
                              AND custrecord_hris_lve_cancellation = 'F' 
                            GROUP BY EXTRACT(MONTH FROM a.custrecord_hris_lve_fromdate), 
                                     EXTRACT(YEAR FROM a.custrecord_hris_lve_fromdate)`;

                        const sicksqlrecord = query.runSuiteQL({ query: sicksql }).asMappedResults();

                        let totalnodays = 0;
                        if (sicksqlrecord.length > 0) {
                            totalnodays = sicksqlrecord[0].totdays || 0;
                        }

                        totaldays = parseFloat(totaldays) + parseFloat(totalnodays);

                        if (totaldays != 0 && totaldays > 2) {
                            leaverecord.getField({ fieldId: 'custrecord_hris_lve_attachdocument' }).isMandatory = true;
                            leaverecord.setValue({
                                fieldId: 'custrecord_hris_lve_attachdocument',
                                value: true,
                                ignoreFieldChange: false,
                                forceSyncSourcing: true
                            });
                        } else {
                            leaverecord.getField({ fieldId: 'custrecord_hris_lve_attachdocument' }).isMandatory = false;
                            leaverecord.setValue({
                                fieldId: 'custrecord_hris_lve_attachdocument',
                                value: false,
                                ignoreFieldChange: false,
                                forceSyncSourcing: true
                            });
                        }
                    }
                }
            } catch (e) {
                console.log('error in fieldChanged : ' + e);
            }
        };

        const get_sequence_no = (Leave_type) => {
            try {
                let sequence_no = '';
                const leavesequencesql = `select * from customrecord_hris_leaveconfig where id ='${Leave_type}' and isinactive ='F'`;
                const leavesequencesqlrecords = query.runSuiteQL({ query: leavesequencesql }).asMappedResults();

                if (leavesequencesqlrecords.length > 0) {
                    sequence_no = leavesequencesqlrecords[0].custrecord_hris_lvecnfg_seqno;
                }
                return sequence_no;
            } catch (e) {
                console.log('error in get_sequence_no : ' + e);
                return '';
            }
        };

        const Cancelclick = () => {
            try {
                const leaverecord1 = currentRecord.get();
                const leaverecordid = leaverecord1.id;

                const leaverecord = record.load({
                    type: 'customrecord_hris_leaveapplication',
                    id: leaverecordid,
                    isDynamic: true
                });

                leaverecord.setValue({
                    fieldId: 'custrecord_hris_lve_cancel_leavestatus',
                    value: 2,
                    ignoreFieldChange: true,
                    forceSyncSourcing: true
                });

                leaverecord.setValue('custrecord_hris_lveappapprovallevel', '', true, true);
                leaverecord.setValue('custrecord_hris_lveapp_approvalusrtype', '', true, true);
                leaverecord.setValue('custrecord_hris_lveapp_role', '', true, true);
                leaverecord.setValue('custrecord_hris_lveapp_appruser', '', true, true);

                const flagid = 1;
                const redirectUrl = `/app/common/custom/custrecordentry.nl?rectype=894&e=T&id=${leaverecordid}&flag=${flagid}`;
                console.log('url', redirectUrl);
                window.location.href = redirectUrl;
            } catch (e) {
                console.log('Error in Cancelclick', e.name + ' ' + e.message);
            }
        };

        const Settlementclick = () => {
            try {
                const leaverecord1 = currentRecord.get();
                const leaverecordid = leaverecord1.id;

                const leaverecord = record.load({
                    type: 'customrecord_hris_leaveapplication',
                    id: leaverecordid,
                    isDynamic: true
                });

                const empid = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_employeename' });
                const flagid = 1;
                const redirectUrl = `/app/common/custom/custrecordentry.nl?rectype=806&leaverecordid=${leaverecordid}&flag=${flagid}&empid=${empid}`;
                window.location.href = redirectUrl;
            } catch (e) {
                console.log('error in Settlementclick: ' + e);
            }
        };

        const saveRecord = (scriptContext) => {
            try {
                const leaverecord = scriptContext.currentRecord;
                const flag = getUrlParameter('flag');

                const cancelcheck = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_cancellation' });
                const cancelstatus = leaverecord.getValue({ fieldId: 'custrecord_hris_lve_cancel_leavestatus' });

                if (cancelcheck === true && cancelstatus == 1 && flag == 1) {
                    leaverecord.setValue({
                        fieldId: 'custrecord_hris_lveapp_approvalstatus',
                        value: 3,
                        ignoreFieldChange: true,
                        forceSyncSourcing: true
                    });

                    leaverecord.setValue('custrecord_hris_lveappapprovallevel', '', true, true);
                    leaverecord.setValue('custrecord_hris_lveapp_approvalusrtype', '', true, true);
                    leaverecord.setValue('custrecord_hris_lveapp_role', '', true, true);
                    leaverecord.setValue('custrecord_hris_lveapp_appruser', '', true, true);
                }

                return true;
            } catch (e) {
                console.log('error in saveRecord : ' + e);
                return true;
            }
        };

        const getResult = (pSQL) => {
            const queryResults = query.runSuiteQL({ query: pSQL });
            return queryResults.asMappedResults();
        };

        const getUrlParameter = (param) => {
            const queryString = window.location.search.substring(1);
            const vars = queryString.split('&');

            for (let i = 0; i < vars.length; i++) {
                const pair = vars[i].split('=');
                if (pair[0] === param) {
                    return decodeURIComponent(pair[1]);
                }
            }
            return false;
        };

        return {
            pageInit,
            Cancelclick,
            Settlementclick,
            // saveRecord,          // uncomment if you want to enable it
            fieldChanged
        };
    });

const _logValidation = (value) => {
    return value != null && value !== '' && value != undefined && value.toString() != 'NaN' && value != NaN;
};