/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Confirm Pay Process Status Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/log', 'N/runtime', 'N/format'],
    (serverWidget, search, log, runtime, format) => {

        const onRequest = (context) => {
            const request = context.request;
            const response = context.response;

            try {
                log.debug('Request Method', request.method);

                if (request.method === 'GET') {
                    const form = serverWidget.createForm({
                        title: 'Confirm Pay Process Status'
                    });

                    // ---------- System Date ----------
                    const offset = -7; // adjust if needed
                    const d_SystemDate = new Date(new Date().getTime() + offset * 3600 * 1000);
                    const date_format = checkDateFormat();

                    const currentSystem_day = d_SystemDate.getDate();
                    const currentSystem_month = d_SystemDate.getMonth() + 1;
                    const currentSystem_year = d_SystemDate.getFullYear();
                    let currentSystem_hours = d_SystemDate.getHours();
                    const currentSystem_minutes = d_SystemDate.getMinutes();

                    let s_Meridiem = 'am';
                    if (currentSystem_hours === 12) s_Meridiem = 'pm';
                    if (currentSystem_hours > 12 || currentSystem_hours === 0) {
                        currentSystem_hours = getHours(currentSystem_hours);
                        s_Meridiem = (currentSystem_hours === 12) ? 'am' : 'pm';
                    }

                    const d_DateAsFormat = getDateAsFormat(
                        currentSystem_month,
                        currentSystem_day,
                        currentSystem_year,
                        date_format
                    );

                    let d_SystemDateTemp = `${d_DateAsFormat} ${currentSystem_hours}:${currentSystem_minutes} ${s_Meridiem}`;

                    const s_DateCreated = request.parameters.custscript_datecreated;
                    if (isValid(s_DateCreated)) {
                        d_SystemDateTemp = s_DateCreated;
                    }

                    // ---------- Hidden Fields ----------
                    addHiddenField(form, 'custpage_date', 'Date Created', d_SystemDateTemp);

                    const i_ParentProcesssID = request.parameters.custscript_parentid;
                    addHiddenField(form, 'custpage_parentid', 'Parent Process Id', i_ParentProcesssID);

                    const i_PayMonth = request.parameters.custscript_paymonth;
                    addHiddenField(form, 'custpage_paymonth', 'Pay Month', i_PayMonth);

                    const i_PayYear = request.parameters.custscript_payyear;
                    addHiddenField(form, 'custpage_payyear', 'Pay Year', i_PayYear);

                    addHiddenField(form, 'custpage_process', 'Process Status', '');

                    // Client Script
                    form.clientScriptModulePath = './hris_setconfirm_comple_cs.js';

                    // Count
                    let i_Count = request.parameters.custscript_truecount;
                    const i_CountTemp = request.parameters.custscript_count;
                    if (isValid(i_CountTemp)) i_Count = i_CountTemp;

                    addHiddenField(form, 'custpage_count', 'Count', i_Count);

                    // Ratio / Formula
                    let i_formula = 0;
                    if (isValid(i_Count) && parseFloat(i_Count) > 0) {
                        i_formula = 100 / parseFloat(i_Count);
                    }

                    const i_Ratio = request.parameters.custscript_ratio;
                    if (isValid(i_Ratio)) {
                        i_formula = parseFloat(i_Ratio);
                    }

                    addHiddenField(form, 'custpage_ratio', 'Ratio', i_formula);

                    // Pay Group Filter
                    let i_PayGroupFilter = request.parameters.custscript_paygroup;
                    const i_PayGroupFilterTemp = request.parameters.custscript_paygroupfilter;
                    if (!isValid(i_PayGroupFilter) && isValid(i_PayGroupFilterTemp)) {
                        i_PayGroupFilter = i_PayGroupFilterTemp;
                    }

                    addHiddenField(form, 'custpage_paygroupfilter', 'Pay Group Filter', i_PayGroupFilter);

                    // Processed Count & Status
                    let i_ProcessedCount = 0;
                    if (isValid(i_PayGroupFilter)) {
                        i_ProcessedCount = get_ProcessedCount(i_PayGroupFilter, i_ParentProcesssID);
                    }

                    let i_Status = (i_formula * i_ProcessedCount).toFixed(2);

                    // Progress Bar HTML
                    const style = `
                        <style type="text/css">
                            #myProgress { position: relative; width: 100%; height: 30px; background-color: #ddd; }
                            #myBar { position: absolute; width: ${i_Status}%; height: 100%; background-color: #4CAF50; }
                            #label { text-align: center; line-height: 30px; color: white; }
                        </style>
                    `;

                    let html = '<html>' + style + '<body>';
                    html += '<div id="myProgress"><div id="myBar">';
                    if (i_Status === '100.00') {
                        html += `<div id="label">${i_Status}% Completed</div>`;
                    } else {
                        html += `<div id="label">${i_Status}%</div>`;
                    }
                    html += '</div></div></body></html>';

                    addHiddenField(form, 'custpage_refresh', 'RefreshTrigger', i_Status);

                    const f_StatusBar = form.addField({
                        id: 'custpage_statusbar',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: ' '
                    });
                    f_StatusBar.defaultValue = html;

                    // ---------- Sublist ----------
                    const sublist = form.addSublist({
                        id: 'custpage_payprocesssublist',
                        type: serverWidget.SublistType.LIST,
                        label: 'Confirm Pay Process Record'
                    });

                    sublist.addField({
                        id: 'custpage_paygroup',
                        type: serverWidget.FieldType.TEXT,
                        label: 'PAY GROUP'
                    });
                    sublist.addField({
                        id: 'custpage_year',
                        type: serverWidget.FieldType.TEXT,
                        label: 'YEAR'
                    });
                    sublist.addField({
                        id: 'custpage_startdate',
                        type: serverWidget.FieldType.TEXT,
                        label: 'START DATE'
                    });
                    sublist.addField({
                        id: 'custpage_enddate',
                        type: serverWidget.FieldType.TEXT,
                        label: 'END DATE'
                    });

                    // Search Confirm Process Records
                    const filters = [];
                    log.debug('Filters', { i_PayGroupFilter, i_ParentProcesssID });
                    if (isValid(i_PayGroupFilter)) {
                        filters.push(['custrecord_hris_cnfrm_proce_rec_paygroup', 'anyof', i_PayGroupFilter]);
                    }
                    if (isValid(i_ParentProcesssID)) {
                        if (filters.length > 0) filters.push('AND');
                        filters.push(['custrecord_hris_cnfrm_proce_rec_parent_p', 'is', i_ParentProcesssID]);
                    }

                    const results = search.create({
                        type: 'customrecord_hris_confirm_process_record',
                        filters: filters,
                        columns: [
                            'custrecord_hris_cnfrm_proce_rec_paygroup',
                            'custrecord_hris_cnfrm_proce_rec_year',
                            'custrecord_hris_cnfrm_proce_rec_start_da',
                            'custrecord_hris_cnfrm_proce_rec_end_date',
                            search.createColumn({ name: 'created', sort: search.Sort.DESC })
                        ]
                    }).run().getRange({ start: 0, end: 1000 });
                   log.debug('Search Results', results);
                   log.debug('Search Results Length', results.length);
                  /*   if (results && results.length > 0) {
                        results.forEach((row, idx) => {
                            const line = idx + 1;
                            sublist.setSublistValue({
                                id: 'custpage_paygroup',
                                line: line,
                                value: row.getText('custrecord_hris_cnfrm_proce_rec_paygroup') || ' '
                            });
                            sublist.setSublistValue({
                                id: 'custpage_year',
                                line: line,
                                value: row.getText('custrecord_hris_cnfrm_proce_rec_year') || ' '
                            });
                            sublist.setSublistValue({
                                id: 'custpage_startdate',
                                line: line,
                                value: row.getValue('custrecord_hris_cnfrm_proce_rec_start_da') || ' '
                            });
                            sublist.setSublistValue({
                                id: 'custpage_enddate',
                                line: line,
                                value: row.getValue('custrecord_hris_cnfrm_proce_rec_end_date') || ' '
                            });
                        });
                    } */

                    if (results && results.length > 0) {
    results.forEach((row, idx) => {
        // IMPORTANT: lines are 0-based in SS 2.x
        sublist.setSublistValue({
            id: 'custpage_paygroup',
            line: idx,
            value: row.getText('custrecord_hris_cnfrm_proce_rec_paygroup') || ' '
        });
        sublist.setSublistValue({
            id: 'custpage_year',
            line: idx,
            value: row.getText('custrecord_hris_cnfrm_proce_rec_year') || ' '
        });
        sublist.setSublistValue({
            id: 'custpage_startdate',
            line: idx,
            value: row.getValue('custrecord_hris_cnfrm_proce_rec_start_da') || ' '
        });
        sublist.setSublistValue({
            id: 'custpage_enddate',
            line: idx,
            value: row.getValue('custrecord_hris_cnfrm_proce_rec_end_date') || ' '
        });
    });
}
                        // Refresh Button
                    form.addButton({
                        id: 'custpage_submitbutton',
                        label: 'Refresh',
                        functionName: 'saveRecord_SetConfrimCompleteStatus()'
                    });

                    response.writePage(form);
                }

            } catch (e) {
                log.error('onRequest Error', e);
                response.write('Error: ' + (e.message || e));
            }
        };

        // =====================================================
        // Helper Functions
        // =====================================================

        const addHiddenField = (form, id, label, value) => {
            const f = form.addField({
                id: id,
                type: serverWidget.FieldType.TEXT,
                label: label
            });
            f.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
            if (value != null && value !== undefined) {
                f.defaultValue = value;
            }
        };

        const isValid = (value) => {
            return value != null && value !== '' && value !== undefined && value !== 'undefined' && value !== 'NaN';
        };

        const get_ProcessedCount = (i_PayGroupFilter, i_ParentProcesssID) => {
            try {
                const filters = [];
                if (isValid(i_PayGroupFilter)) {
                    filters.push(['custrecord_hris_cnfrm_proce_rec_paygroup', 'anyof', i_PayGroupFilter]);
                }
                if (isValid(i_ParentProcesssID)) {
                    if (filters.length > 0) filters.push('AND');
                    filters.push(['custrecord_hris_cnfrm_proce_rec_parent_p', 'is', i_ParentProcesssID]);
                }

                const results = search.create({
                    type: 'customrecord_hris_confirm_process_record',
                    filters: filters,
                    columns: [
                        search.createColumn({ name: 'created', sort: search.Sort.DESC })
                    ]
                }).run().getRange({ start: 0, end: 1000 });

                return results ? results.length : 0;
            } catch (e) {
                log.error('get_ProcessedCount Error', e);
                return 0;
            }
        };

        const getHours = (hours) => {
            const map = {
                13: 1, 14: 2, 15: 3, 16: 4, 17: 5, 18: 6,
                19: 7, 20: 8, 21: 9, 22: 10, 23: 11, 0: 12
            };
            return map[hours] || hours;
        };

        const checkDateFormat = () => {
            try {
                return runtime.getCurrentUser().getPreference({ name: 'DATEFORMAT' }) || 'DD/MM/YYYY';
            } catch (e) {
                return 'DD/MM/YYYY';
            }
        };

        const getDateAsFormat = (month, day, year, date_format) => {
            const m = parseInt(month);
            const d = parseInt(day);
            const y = parseInt(year);

            if (date_format === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
            if (date_format === 'DD/MM/YYYY') return `${d}/${m}/${y}`;
            if (date_format === 'MM/DD/YYYY' || date_format === 'M/D/YYYY') return `${m}/${d}/${y}`;
            if (date_format === 'DD.MM.YYYY') return `${d}.${m}.${y}`;
            if (date_format === 'YYYY/MM/DD') return `${y}/${m}/${d}`;

            if (date_format === 'DD-Mon-YYYY') {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return `${d}-${months[m-1]}-${y}`;
            }

            if (date_format === 'DD-MONTH-YYYY' || date_format === 'DD MONTH, YYYY') {
                const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
                if (date_format === 'DD-MONTH-YYYY') return `${d}-${months[m-1]}-${y}`;
                return `${d} ${months[m-1]}, ${y}`;
            }

            // Default
            return `${d}/${m}/${y}`;
        };

        return {
            onRequest
        };
    });