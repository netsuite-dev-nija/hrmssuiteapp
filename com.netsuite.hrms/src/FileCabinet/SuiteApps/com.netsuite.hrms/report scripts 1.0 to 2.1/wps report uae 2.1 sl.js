/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/search', 'N/record', 'N/log', 'N/file', 'N/runtime', 'N/ui/serverWidget'],
    function(search, record, log, file, runtime, serverWidget) {

        //  Initialize any Global Variables
        var a_employee_name = [];
        var a_empSalary_Details = [];
        var processStrtDate = '',
            processEndDate = '',
            mol_id = '',
            AgentName = '';
        var monthParameterhris = '';    
        var StandardMonthDays = '';
        var i_index = '';
        var netPay_Array = [];
        //END GLOBAL VARIABLE BLOCK  

        var SalMonthYear;
        var monthLastDay;
        var scr_table = '';
        var SCR_Bank_Routing_Num = '';

        function escapeXML(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        }

        //BEGIN SUITELET ==================================================
        function onRequest(context) {
            var request = context.request;
            var response = context.response;

            var strVar = "";
            var o_form = '';

            try {
                if (request.method === 'GET') {
                    o_form = serverWidget.createForm({title: 'WPS Report-UAE' });

                   var userSub = runtime.getCurrentUser().subsidiary;
                    var empPaygroup = request.parameters.process_grp;
                    log.debug('aa empPaygroup', empPaygroup);

                    var molParameter = request.parameters.moltype;
                    if (CheckValidOrNot(molParameter)) {
                        var lookupFields = search.lookupFields({
                            type: 'customrecord_hris_visa_type_master',
                            id: molParameter,
                            columns: ['custrecord_hris_visa_type_establishment', 'custrecord_hris_visa_type_emp_bank_route', 'name']
                        });
                        mol_id = lookupFields.custrecord_hris_visa_type_establishment;
                        SCR_Bank_Routing_Num = lookupFields.custrecord_hris_visa_type_emp_bank_route;
                        AgentName = lookupFields.name;
                        log.debug('molParameter', 'molParameter==' + molParameter);
                    }

                    var processType = request.parameters.processtype;
                    var monthParameter = request.parameters.month;
                    log.debug('suiteletFunction_salaryRegister', 'monthParameter==' + monthParameter);
                    var yearParameter = request.parameters.year;
                    var subsidiary = request.parameters.subsidiary;
                    var i_mode = request.parameters.i_mode;
                    log.audit('suiteletFunction_salaryRegister', 'i_mode==' + i_mode);

                    var month = getMonth(monthParameter);
                    var year = getYear(yearParameter);

                    SalMonthYear = padZero(monthParameter) + year;
                    var monthParameterhris = gethrisMonth(monthParameter);
                    SalMonthYear = padZero(monthParameterhris) + year;
                    log.debug('SalMonthYear', SalMonthYear);

                    monthLastDay = getArryMonthDays(month, year);
                    monthParameterhris = gethrisMonth(monthParameter);

                    processStrtDate = escapeXML(year) + "-" + padZero(monthParameterhris) + "-01";
                    processEndDate = escapeXML(year) + "-" + padZero(monthParameterhris) + "-" + monthLastDay;

                    var payroll_Period = processStrtDate + ' - ' + processEndDate;
                    StandardMonthDays = getArryMonthDays(month, year);

                    log.debug(' StandardMonthDays', StandardMonthDays);

                 
                //  o_form.clientScriptFileId =8205
                    o_form.addButton({
                        id: 'custpage_excelbtn',
                        label: 'Export As Excel',
                        functionName: 'callSuitelet(\'' + molParameter + '\',\'' + yearParameter + '\',\'' + monthParameter + '\', \'' + processType + '\', \'' + empPaygroup + '\', \'' + subsidiary + '\');'
                    });
                    o_form.addButton({
                        id: 'custpage_sifbtn',
                        label: 'Export As CSV',
                        functionName: 'callSIF_File(\'' + molParameter + '\',\'' + yearParameter + '\',\'' + monthParameter + '\', \'' + processType + '\', \'' + empPaygroup + '\', \'' + subsidiary + '\');'
                    });
                    o_form.addButton({
                        id: 'custpage_sifreportbtn',
                        label: 'Export As SIF',
                        functionName: 'callSIFReport_File(\'' + molParameter + '\',\'' + yearParameter + '\',\'' + monthParameter + '\', \'' + processType + '\', \'' + empPaygroup + '\', \'' + subsidiary + '\');'
                    });
                    o_form.clientScriptModulePath = './wps report export as excel cs.js';

                    if (i_mode == 1) {
                        var repMonth = (typeof month !== 'undefined' && month) ? month.toUpperCase() : 'REPORT';
                        var repYear = (typeof year !== 'undefined' && year) ? year : '';
                        var repAgent = (typeof AgentName !== 'undefined' && AgentName) ? AgentName : 'WPS';

                        var reportContent = downloadReport(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary);
                        log.audit('reportContent length:- ', reportContent ? reportContent.length : 0);
                        
                        if (reportContent) {
                            response.setHeader({
                                name: 'Content-Type',
                                value: 'text/csv'
                            });
                            response.setHeader({
                                name: 'Content-Disposition',
                                value: 'attachment; filename="WPS Report ' + repMonth + '-' + repYear + '-' + repAgent + '.xls"'
                            });
                            
                            response.write({ output: reportContent });
                        } else {
                            response.write({ output: "<b>Error: Report content could not be generated.</b>" });
                        }
                    } else if (i_mode == 2) {
                        downloadSFIReport(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary, response);
                    } else if (i_mode == 3) {
                        downloadSIFReport(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary, response);
                    } else {
                        strVar += "<table style=\"border-collapse: collapse;\" width=\"100%\">";
                        strVar += "	<tr>";
                        strVar += "		<td font-size=\"40\"  font-family=\"Helvetica\" align=\"left\" style=\"text-decoration: underline; font-size: 16px\"><b>" + (AgentName || '') + "<\/b><\/td>";
                        strVar += "	<\/tr>";
                        strVar += "	<tr style=\"height:15px;\">";
                        strVar += "		<td font-size=\"40\"  font-family=\"Helvetica\" align=\"left\" style=\"text-decoration: underline; font-size: 16px\"><b><\/b><\/td>";
                        strVar += "	<\/tr>";
                        strVar += "	<tr>";
                        strVar += "		<td font-size=\"40\"  font-family=\"Helvetica\" align=\"left\" style=\"text-decoration: underline; font-size: 16px\"><b>PAYROLL FOR THE MONTH OF<\/b><span style=\"font-color: red;\"><b> " + escapeXML((month || '').toUpperCase()) + "-" + escapeXML(year || '') + "<\/b><\/span><\/td>";
                        strVar += "	<\/tr>";
                        strVar += "	<tr style=\"height:15px;\">";
                        strVar += "		<td font-size=\"40\"  font-family=\"Helvetica\" align=\"left\" style=\"text-decoration: underline; font-size: 16px\"><b><\/b><\/td>";
                        strVar += "	<\/tr>";
                        strVar += "<\/table>";

                        strVar += "<style type=\"text/css\">";
                        strVar += ".tbl tr:hover {background-color: #C7C2C1;}";
                        strVar += "</style>";
                        strVar += "<table class=\"tbl\" style=\"border-collapse: collapse; border: black 1px solid;\" align=\"center\" border=\"1\" width=\"100%\">";
                        strVar += "	<tr>";
                        strVar += "		<td    font-family=\"Helvetica\"    align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:black 1px solid;border-right:black 1px solid;\"><b>Indicator<\/b><\/td>";
                        strVar += "		<td    font-family=\"Helvetica\"   align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Employee Id<\/b><\/td>";
                        strVar += "		<td    font-family=\"Helvetica\"   align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:black 1px solid;border-right:black 1px solid;\"><b>Agent ID<\/b><\/td>";
                        strVar += "		<td    font-family=\"Helvetica\"   align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Bank Account<\/b><\/td>";
                        strVar += "		<td    font-family=\"Helvetica\"   align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Salary Start Date<\/b><\/td>";
                        strVar += "		<td    font-family=\"Helvetica\"   align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Salary End Date<\/b><\/td>";
                        strVar += "		<td    font-family=\"Helvetica\"   align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Paid Days<\/b><\/td>";
                        strVar += "		<td    font-family=\"Helvetica\"   align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Fixed Income<\/b><\/td>";
                        strVar += "		<td    font-family=\"Helvetica\"   align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Variable Income<\/b><\/td>";
                        strVar += "		<td    font-family=\"Helvetica\"   align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Number of Absent Days<\/b><\/td>";
                        strVar += "	<\/tr>";

                        var scr_table = "<table class=\"tbl\" id = \"scr_table\" style=\"border-collapse: collapse; border: #060a0f 1px solid; margin-top:10px;\" align=\"center\" border=\"1\" width=\"100%\">";
                        scr_table += "	<tr>";
                        scr_table += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;\"><b>SCR<\/b><\/td>";
                        scr_table += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;\"><b>Employer Id<\/b><\/td>";
                        scr_table += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;\"><b>Bank Routing Code and Bank Acount<\/b><\/td>";
                        scr_table += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;\"><b>Date of File Creation <\/b>";
                        scr_table += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;\"><b>Time of File Creation <\/b><\/td>";
                        scr_table += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;\"><b>Salary Month and Year<\/b><\/td>";
                        scr_table += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;\"><b>EDR Count<\/b><\/td>";
                        scr_table += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;\"><b>Total Salary<\/b><\/td>";
                        scr_table += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;\"><b>Payment Currency<\/b><\/td>";
                        scr_table += "	<\/tr>";

                        var columns = [
                            search.createColumn({ name: "custrecord_hris_pay_proc_employee" }),
                            search.createColumn({ name: "custrecord_hris_pay_proc_employee_legal" }),
                            search.createColumn({ name: "custrecord_hris_pay_proc_employee_code" }),
                            search.createColumn({ name: "custrecord_hris_pay_proc_bank_account_no", sort: search.Sort.NONE }),
                            search.createColumn({ name: "custrecord_hris_pay_proc_paid_days" }),
                            search.createColumn({ name: "custrecord_hris_pay_proc_lop_days_final" }),
                            search.createColumn({ name: "custrecord_hris_pay_proc_value" }),
                            search.createColumn({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee" }),
                            search.createColumn({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee" }),
                            search.createColumn({ name: "custentity_hris_empbankibanacctno", join: "custrecord_hris_pay_proc_employee" })
                        ];

                        var filters = [
                            search.createFilter({ name: 'custentity_hris_empvisaallocationmoltype', join: 'custrecord_hris_pay_proc_employee', operator: search.Operator.ANYOF, values: molParameter }),
                            search.createFilter({ name: 'custrecord_hris_pay_proc_year', operator: search.Operator.ANYOF, values: yearParameter }),
                            search.createFilter({ name: 'custrecord_hris_pay_proc_pay_month', operator: search.Operator.ANYOF, values: monthParameter }),
                            search.createFilter({ name: 'custrecord_hris_pay_proc_componet_sequen', operator: search.Operator.EQUALTO, values: "100" }),
                            search.createFilter({ name: 'custrecord_hris_pay_proc_value', operator: search.Operator.GREATERTHAN, values: "0" })
                        ];

                        if (empPaygroup) {
                            filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_pay_group', operator: search.Operator.ANYOF, values: empPaygroup }));
                        }
                        filters.push(search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' }));
                        if (processType) {
                            filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_process_type', operator: search.Operator.IS, values: processType }));
                        }
                        if (subsidiary) {
                            filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_company_name', operator: search.Operator.ANYOF, values: subsidiary }));
                        }

                        var payProcessSearch = search.create({
                            type: 'customrecord_hris_pay_process',
                            filters: filters,
                            columns: columns
                        });

                        var o_searchResult = [];
                        var pagedData = payProcessSearch.runPaged({ pageSize: 1000 });
                        pagedData.pageRanges.forEach(function(pageRange) {
                            var page = pagedData.fetch({ index: pageRange.index });
                            o_searchResult = o_searchResult.concat(page.data);
                        });

                        if (o_searchResult && o_searchResult.length > 0) {
                            var total_net_pay = 0.00;
                            var j = 0;
                            for (j = 0; j < o_searchResult.length; j++) {
                                strVar += "	<tr>";
                                strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">EDR<\/td>";
                                strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + ValueOrNot(o_searchResult[j].getValue({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee" })) + "<\/td>";
                                strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + ValueOrNot(o_searchResult[j].getValue({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee" })) + "<\/td>";
                                strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_bank_account_no" }) + "<\/td>";
                                strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + processStrtDate + "<\/td>";
                                strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + processEndDate + "<\/td>";
                                strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + Number(StandardMonthDays) + "<\/td>";

                                var _NetPay = o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_value" });
                                strVar += "		<td  font-family=\"Helvetica\"   align=\"right\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + parseFloat(RoundValue(_NetPay)).toFixed(2) + "<\/td>";
                                strVar += "		<td  font-family=\"Helvetica\"   align=\"right\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + parseFloat(0.00).toFixed(2) + "<\/td>";
                                strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + Number(o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_lop_days_final" })) + "<\/td>";
                                strVar += "	<\/tr>";

                                total_net_pay = parseFloat(total_net_pay) + parseFloat(RoundValue(_NetPay));
                            }

                            strVar += "</table>";
                            strVar += " " + scr_table + " ";

                            var currentTime = new Date();
                            var currentOffset = currentTime.getTimezoneOffset();
                            var ISTOffset = 240; 
                            var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);

                            var hoursIST = ISTTime.getHours();
                            var minutesIST = ISTTime.getMinutes();

                            strVar += "	<tr>";
                            strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:#060a0f 1px solid;border-right:#C7C2C1 1px solid;\">SCR<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:#060a0f 1px solid;border-right:#C7C2C1 1px solid;\">" + mol_id + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:#060a0f 1px solid;border-right:#C7C2C1 1px solid;\">" + SCR_Bank_Routing_Num + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:#060a0f 1px solid;border-right:#C7C2C1 1px solid;\">" + escapeXML(ISTTime.getFullYear() + "-" + padZero(parseInt(ISTTime.getMonth()) + 1) + "-" + padZero(ISTTime.getDate())) + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:#060a0f 1px solid;border-right:#C7C2C1 1px solid;\">" + escapeXML(padZero(hoursIST).toString() + padZero(minutesIST).toString()) + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:#060a0f 1px solid;border-right:#C7C2C1 1px solid;\">" + SalMonthYear + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:#060a0f 1px solid;border-right:#C7C2C1 1px solid;\">" + escapeXML(j) + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"   align=\"right\" style=\"border-bottom:#060a0f 1px solid;border-right:#C7C2C1 1px solid;\">" + escapeXML(parseFloat(total_net_pay).toFixed(2)) + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"   align=\"center\" style=\"border-bottom:#060a0f 1px solid;border-right:#C7C2C1 1px solid;\">AED<\/td>";
                            strVar += "	<\/tr>";
                            strVar += "<\/table>";

                            var inlineHtmlField = o_form.addField({
                                id: 'custpage_salaryregister',
                                type: serverWidget.FieldType.INLINEHTML,
                                label: 'Salary Register'
                            });
                            inlineHtmlField.defaultValue = strVar;
                            response.writePage(o_form);
                        } else {
                            response.write({ output: "<b>Data not Found.Please Check the Parameter again<\/b>" });
                        }
                    }
                }
             
            } catch (e) {
                log.error('system or unexpected error', e.toString());
            }

            log.debug('suiteletFunction_salaryRegister', '****** Execution Ends Here ********');
        }
        //END SUITELET ====================================================

        function downloadReport(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary) {
            try {
                var userSub = runtime.getCurrentUser().subsidiary;
                if (CheckValidOrNot(molParameter)) {
                    var lookupFields = search.lookupFields({
                        type: 'customrecord_hris_visa_type_master',
                        id: molParameter,
                        columns: ['custrecord_hris_visa_type_establishment', 'custrecord_hris_visa_type_emp_bank_route', 'name']
                    });
                    mol_id = lookupFields.custrecord_hris_visa_type_establishment;
                    SCR_Bank_Routing_Num = lookupFields.custrecord_hris_visa_type_emp_bank_route;
                    AgentName = lookupFields.name;
                }

                var month = getMonth(monthParameter);
                var year = getYear(yearParameter);
                var monthParameterhris = gethrisMonth(monthParameter);

                SalMonthYear = padZero(monthParameterhris) + year;

                monthLastDay = getArryMonthDays(month, year);
                monthParameterhris = gethrisMonth(monthParameter);

                processStrtDate = escapeXML(year) + "-" + padZero(monthParameterhris) + "-01";
                processEndDate = escapeXML(year) + "-" + padZero(monthParameterhris) + "-" + monthLastDay;

                var columns = [
                    search.createColumn({ name: "custrecord_hris_pay_proc_employee" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_employee_legal" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_employee_code" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_bank_account_no", sort: search.Sort.NONE }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_paid_days" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_lop_days_final" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_value" }),
                    search.createColumn({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee" }),
                    search.createColumn({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee" }),
                    search.createColumn({ name: "custentity_hris_empbankibanacctno", join: "custrecord_hris_pay_proc_employee" })
                ];

                var filters = [
                    search.createFilter({ name: 'custentity_hris_empvisaallocationmoltype', join: 'custrecord_hris_pay_proc_employee', operator: search.Operator.ANYOF, values: molParameter }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_year', operator: search.Operator.ANYOF, values: yearParameter }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_pay_month', operator: search.Operator.ANYOF, values: monthParameter }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_componet_sequen', operator: search.Operator.EQUALTO, values: "100" }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_value', operator: search.Operator.GREATERTHAN, values: "0" })
                ];

                if (empPaygroup) {
                    filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_pay_group', operator: search.Operator.ANYOF, values: empPaygroup }));
                }
                filters.push(search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' }));
                if (processType) {
                    filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_process_type', operator: search.Operator.IS, values: processType }));
                }
                if (subsidiary) {
                    filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_company_name', operator: search.Operator.ANYOF, values: subsidiary }));
                }

                var payProcessSearch = search.create({
                    type: 'customrecord_hris_pay_process',
                    filters: filters,
                    columns: columns
                });

                var o_searchResult = [];
                var pagedData = payProcessSearch.runPaged({ pageSize: 1000 });
                pagedData.pageRanges.forEach(function(pageRange) {
                    var page = pagedData.fetch({ index: pageRange.index });
                    o_searchResult = o_searchResult.concat(page.data);
                });

                var Csv_Content = '';
                var total_net_pay = 0.00;
                var j = 0;
                for (j = 0; j < o_searchResult.length; j++) {
                    Csv_Content += "EDR,";
                    Csv_Content += "" + ValueOrNot(o_searchResult[j].getValue({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee" })) + ",";
                    Csv_Content += "" + ValueOrNot(o_searchResult[j].getValue({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee" })) + ",";
                    Csv_Content += "" + ValueOrNot(o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_bank_account_no" })) + ",";
                    Csv_Content += "" + escapeXML(processStrtDate) + ",";
                    Csv_Content += "" + escapeXML(processEndDate) + ",";
                    Csv_Content += "" + Number(StandardMonthDays) + ",";

                    var _NetPay = o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_value" });
                    total_net_pay = parseFloat(total_net_pay) + parseFloat(RoundValue(_NetPay));
                    Csv_Content += "" + parseFloat(RoundValue(_NetPay)).toFixed(2) + ",";
                    Csv_Content += "" + parseFloat(0.00).toFixed(2) + ",";
                    Csv_Content += "" + Number(o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_lop_days_final" })) + "";
                    Csv_Content += "\n";
                }

                var currentTime = new Date();
                var currentOffset = currentTime.getTimezoneOffset();
                var ISTOffset = 240; 
                var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);

                var hoursIST = ISTTime.getHours();
                var minutesIST = ISTTime.getMinutes();

                Csv_Content += "SCR,";
                Csv_Content += "" + escapeXML(mol_id) + ",";
                Csv_Content += "" + SCR_Bank_Routing_Num + ",";
                Csv_Content += "" + escapeXML(ISTTime.getFullYear() + "-" + padZero(parseInt(ISTTime.getMonth()) + 1) + "-" + padZero(ISTTime.getDate())) + ",";
                Csv_Content += "" + escapeXML(padZero(hoursIST).toString() + padZero(minutesIST).toString()) + ",";
                Csv_Content += "" + escapeXML(SalMonthYear) + ",";
                Csv_Content += "" + parseInt(j) + ",";
                Csv_Content += "" + escapeXML(Number(total_net_pay)) + ",";
                Csv_Content += "AED";
                Csv_Content += "\n";

                return Csv_Content;
            } catch (err) {
                log.error('ERROR MESSAGE IN downloadReport:- ', err);
                return '';
            }
        }

        function downloadSFIReport(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary, response) {
            try {
                var userSub = runtime.getCurrentUser().subsidiary; 
                if (CheckValidOrNot(molParameter)) {
                    var lookupFields = search.lookupFields({
                        type: 'customrecord_hris_visa_type_master',
                        id: molParameter,
                        columns: ['custrecord_hris_visa_type_establishment', 'custrecord_hris_visa_type_emp_bank_route', 'name']
                    });
                    mol_id = lookupFields.custrecord_hris_visa_type_establishment;
                    SCR_Bank_Routing_Num = lookupFields.custrecord_hris_visa_type_emp_bank_route;
                    AgentName = lookupFields.name;
                }

                var month = getMonth(monthParameter);
                var year = getYear(yearParameter);

                var monthParameterhris = gethrisMonth(monthParameter);
                SalMonthYear = padZero(monthParameterhris) + year;
                log.debug('SalMonthYear', SalMonthYear);

                monthLastDay = getArryMonthDays(month, year);
                monthParameterhris = gethrisMonth(monthParameter);

                processStrtDate = escapeXML(year) + "-" + padZero(monthParameterhris) + "-01";
                processEndDate = escapeXML(year) + "-" + padZero(monthParameterhris) + "-" + monthLastDay;

                var payroll_Period = processStrtDate + ' - ' + processEndDate;

                var columns = [
                    search.createColumn({ name: "custrecord_hris_pay_proc_employee" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_employee_legal" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_employee_code" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_bank_account_no", sort: search.Sort.NONE }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_paid_days" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_lop_days_final" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_value" }),
                    search.createColumn({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee" }),
                    search.createColumn({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee" }),
                    search.createColumn({ name: "custentity_hris_empbankibanacctno", join: "custrecord_hris_pay_proc_employee" })
                ];

                var filters = [
                    search.createFilter({ name: 'custentity_hris_empvisaallocationmoltype', join: 'custrecord_hris_pay_proc_employee', operator: search.Operator.ANYOF, values: molParameter }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_year', operator: search.Operator.ANYOF, values: yearParameter }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_pay_month', operator: search.Operator.ANYOF, values: monthParameter }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_componet_sequen', operator: search.Operator.EQUALTO, values: "100" }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_value', operator: search.Operator.GREATERTHAN, values: "0" })
                ];

                if (empPaygroup) {
                    filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_pay_group', operator: search.Operator.ANYOF, values: empPaygroup }));
                }
                filters.push(search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' }));
                if (processType) {
                    filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_process_type', operator: search.Operator.IS, values: processType }));
                }
                if (subsidiary) {
                    filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_company_name', operator: search.Operator.ANYOF, values: subsidiary }));
                }

                var payProcessSearch = search.create({
                    type: 'customrecord_hris_pay_process',
                    filters: filters,
                    columns: columns
                });

                var o_searchResult = [];
                var pagedData = payProcessSearch.runPaged({ pageSize: 1000 });
                pagedData.pageRanges.forEach(function(pageRange) {
                    var page = pagedData.fetch({ index: pageRange.index });
                    o_searchResult = o_searchResult.concat(page.data);
                });

                var Csv_Content = '';
                var total_net_pay = 0.00;
                var j = 0;
                for (j = 0; j < o_searchResult.length; j++) {
                    Csv_Content += "EDR,";
                    Csv_Content += "" + ValueOrNot(o_searchResult[j].getValue({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee" })) + ",";
                    Csv_Content += "" + ValueOrNot(o_searchResult[j].getValue({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee" })) + ",";
                    Csv_Content += "" + ValueOrNot(o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_bank_account_no" })) + ",";
                    Csv_Content += "" + escapeXML(processStrtDate) + ",";
                    Csv_Content += "" + escapeXML(processEndDate) + ",";
                    Csv_Content += "" + Number(StandardMonthDays) + ",";

                    var _NetPay = o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_value" });
                    total_net_pay = parseFloat(total_net_pay) + parseFloat(RoundValue(_NetPay));
                    Csv_Content += "" + parseFloat(RoundValue(_NetPay)).toFixed(2) + ",";
                    Csv_Content += "" + parseFloat(0.00).toFixed(2) + ",";
                    Csv_Content += "" + Number(o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_lop_days_final" })) + "";
                    Csv_Content += "\n";
                }

                var currentTime = new Date();
                var currentOffset = currentTime.getTimezoneOffset();
                var ISTOffset = 240; 
                var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);

                var hoursIST = ISTTime.getHours();
                var minutesIST = ISTTime.getMinutes();
                var SecondsIST = ISTTime.getSeconds();

                Csv_Content += "SCR,";
                Csv_Content += "" + escapeXML(mol_id) + ",";
                Csv_Content += "" + SCR_Bank_Routing_Num + ",";
                Csv_Content += "" + escapeXML(ISTTime.getFullYear() + "-" + padZero(parseInt(ISTTime.getMonth()) + 1) + "-" + padZero(ISTTime.getDate())) + ",";
                Csv_Content += "" + escapeXML(padZero(hoursIST).toString() + padZero(minutesIST).toString()) + ",";
                Csv_Content += "" + escapeXML(SalMonthYear) + ",";
                Csv_Content += "" + parseInt(j) + ",";
                Csv_Content += "" + escapeXML(Number(total_net_pay)) + ",";
                Csv_Content += "AED,";
                Csv_Content += "" + mol_id.toString() + SalMonthYear.toString() + "-" + (parseInt(j)).toString();
                Csv_Content += "\n";

                var filename = mol_id.toString() + (ISTTime.getFullYear().toString()) + (padZero(parseInt(ISTTime.getMonth()) + 1)).toString() + padZero(ISTTime.getDate()).toString() + (padZero(hoursIST).toString()) + (padZero(minutesIST).toString()) + (padZero(minutesIST).toString()) + (padZero(SecondsIST).toString()) + ".xls";
                
                response.setHeader({
                    name: 'Content-Type',
                    value: 'text/csv'
                });
                response.setHeader({
                    name: 'Content-Disposition',
                    value: 'attachment; filename="' + filename + '"'
                });
                response.write({ output: Csv_Content });
            } catch (err) {
                log.error('ERROR MESSAGE:- ', err);
            }
        }

        function downloadSIFReport(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary, response) {
            try {
                var userSub = runtime.getCurrentUser().subsidiary; 
                if (CheckValidOrNot(molParameter)) {
                    var lookupFields = search.lookupFields({
                        type: 'customrecord_hris_visa_type_master',
                        id: molParameter,
                        columns: ['custrecord_hris_visa_type_establishment', 'custrecord_hris_visa_type_emp_bank_route', 'name']
                    });
                    mol_id = lookupFields.custrecord_hris_visa_type_establishment;
                    SCR_Bank_Routing_Num = lookupFields.custrecord_hris_visa_type_emp_bank_route;
                    AgentName = lookupFields.name;
                }

                var month = getMonth(monthParameter);
                var year = getYear(yearParameter);

                var monthParameterhris = gethrisMonth(monthParameter);
                SalMonthYear = padZero(monthParameterhris) + year;
                log.debug('SalMonthYear', SalMonthYear);

                monthLastDay = getArryMonthDays(month, year);
                monthParameterhris = gethrisMonth(monthParameter);

                processStrtDate = escapeXML(year) + "-" + padZero(monthParameterhris) + "-01";
                processEndDate = escapeXML(year) + "-" + padZero(monthParameterhris) + "-" + monthLastDay;

                var payroll_Period = processStrtDate + ' - ' + processEndDate;

                var columns = [
                    search.createColumn({ name: "custrecord_hris_pay_proc_employee" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_employee_legal" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_employee_code" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_bank_account_no", sort: search.Sort.NONE }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_paid_days" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_lop_days_final" }),
                    search.createColumn({ name: "custrecord_hris_pay_proc_value" }),
                    search.createColumn({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee" }),
                    search.createColumn({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee" }),
                    search.createColumn({ name: "custentity_hris_empbankibanacctno", join: "custrecord_hris_pay_proc_employee" })
                ];

                var filters = [
                    search.createFilter({ name: 'custentity_hris_empvisaallocationmoltype', join: 'custrecord_hris_pay_proc_employee', operator: search.Operator.ANYOF, values: molParameter }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_year', operator: search.Operator.ANYOF, values: yearParameter }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_pay_month', operator: search.Operator.ANYOF, values: monthParameter }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_componet_sequen', operator: search.Operator.EQUALTO, values: "100" }),
                    search.createFilter({ name: 'custrecord_hris_pay_proc_value', operator: search.Operator.GREATERTHAN, values: "0" })
                ];

                if (empPaygroup) {
                    filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_pay_group', operator: search.Operator.ANYOF, values: empPaygroup }));
                }
                filters.push(search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' }));
                if (processType) {
                    filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_process_type', operator: search.Operator.IS, values: processType }));
                }
                if (subsidiary) {
                    filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_company_name', operator: search.Operator.ANYOF, values: subsidiary }));
                }

                var payProcessSearch = search.create({
                    type: 'customrecord_hris_pay_process',
                    filters: filters,
                    columns: columns
                });

                var o_searchResult = [];
                var pagedData = payProcessSearch.runPaged({ pageSize: 1000 });
                pagedData.pageRanges.forEach(function(pageRange) {
                    var page = pagedData.fetch({ index: pageRange.index });
                    o_searchResult = o_searchResult.concat(page.data);
                });

                var Csv_Content = '';
                var total_net_pay = 0.00;
                var j = 0;
                for (j = 0; j < o_searchResult.length; j++) {
                    Csv_Content += "EDR,";
                    Csv_Content += "" + ValueOrNot(o_searchResult[j].getValue({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee" })) + ",";
                    Csv_Content += "" + ValueOrNot(o_searchResult[j].getValue({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee" })) + ",";
                    Csv_Content += "" + ValueOrNot(o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_bank_account_no" })) + ",";
                    Csv_Content += "" + escapeXML(processStrtDate) + ",";
                    Csv_Content += "" + escapeXML(processEndDate) + ",";
                    Csv_Content += "" + Number(StandardMonthDays) + ",";

                    var _NetPay = o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_value" });
                    total_net_pay = parseFloat(total_net_pay) + parseFloat(RoundValue(_NetPay));
                    Csv_Content += "" + parseFloat(RoundValue(_NetPay)).toFixed(2) + ",";
                    Csv_Content += "" + parseFloat(0.00).toFixed(2) + ",";
                    Csv_Content += "" + Number(o_searchResult[j].getValue({ name: "custrecord_hris_pay_proc_lop_days_final" })) + "";
                    Csv_Content += "\n";
                }

                var currentTime = new Date();
                var currentOffset = currentTime.getTimezoneOffset();
                var ISTOffset = 240; 
                var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);

                var hoursIST = ISTTime.getHours();
                var minutesIST = ISTTime.getMinutes();
                var SecondsIST = ISTTime.getSeconds();

                Csv_Content += "SCR,";
                Csv_Content += "" + escapeXML(mol_id) + ",";
                Csv_Content += "" + SCR_Bank_Routing_Num + ",";
                Csv_Content += "" + escapeXML(ISTTime.getFullYear() + "-" + padZero(parseInt(ISTTime.getMonth()) + 1) + "-" + padZero(ISTTime.getDate())) + ",";
                Csv_Content += "" + escapeXML(padZero(hoursIST).toString() + padZero(minutesIST).toString()) + ",";
                Csv_Content += "" + escapeXML(SalMonthYear) + ",";
                Csv_Content += "" + parseInt(j) + ",";
                Csv_Content += "" + escapeXML(Number(total_net_pay)) + ",";
                Csv_Content += "AED,";
                Csv_Content += "" + mol_id.toString() + SalMonthYear.toString() + "-" + (parseInt(j)).toString();
                Csv_Content += "\n";

                var filename = mol_id.toString() + (ISTTime.getFullYear().toString()) + (padZero(parseInt(ISTTime.getMonth()) + 1)).toString() + padZero(ISTTime.getDate()).toString() + (padZero(hoursIST).toString()) + (padZero(minutesIST).toString()) + (padZero(minutesIST).toString()) + (padZero(SecondsIST).toString()) + ".sif";
                
                response.setHeader({
                    name: 'Content-Type',
                    value: 'text/plain'
                });
                response.setHeader({
                    name: 'Content-Disposition',
                    value: 'attachment; filename="' + filename + '"'
                });
                response.write({ output: Csv_Content });
            } catch (err) {
                log.error('ERROR MESSAGE:- ', err);
            }
        }

        //Get Subsidiary
        function getSubsidiaries(paygroup) {
            var subsidiary = '';
            if (paygroup != null) {
                var payGrouprec = record.load({
                    type: 'customrecord_hris_process_groupmaster',
                    id: paygroup
                });
                subsidiary = payGrouprec.getText({ fieldId: 'custrecord_apm_pro_grp_company' });
                subsidiary = subsidiary.substring(subsidiary.indexOf(":") + 1, subsidiary.length);
            }
            return subsidiary;
        }

        // HRIS MONTH
        function gethrisMonth(monthParameter) {
            if (monthParameter == 1) {
                return '1';
            } else if (monthParameter == 2) {
                return '2';
            } else if (monthParameter == 3) {
                return '3';
            } else if (monthParameter == 4) {
                return '4';
            } else if (monthParameter == 5) {
                return '5';
            } else if (monthParameter == 6) {
                return '6';
            } else if (monthParameter == 7) {
                return '7';
            } else if (monthParameter == 8) {
                return '8';
            } else if (monthParameter == 9) {
                return '9';
            } else if (monthParameter == 10) {
                return '10';
            } else if (monthParameter == 11) {
                return '11';
            } else if (monthParameter == 12) {
                return '12';
            }
        }

        //Get Month
        function getMonth(monthParameter) {
            if (monthParameter == 1) {
                return 'January';
            } else if (monthParameter == 2) {
                return 'February';
            } else if (monthParameter == 3) {
                return 'March';
            } else if (monthParameter == 4) {
                return 'April';
            } else if (monthParameter == 5) {
                return 'May';
            } else if (monthParameter == 6) {
                return 'June';
            } else if (monthParameter == 7) {
                return 'July';
            } else if (monthParameter == 8) {
                return 'August';
            } else if (monthParameter == 9) {
                return 'September';
            } else if (monthParameter == 10) {
                return 'October';
            } else if (monthParameter == 11) {
                return 'November';
            } else if (monthParameter == 12) {
                return 'December';
            }
        }

        //Get Year
        function getYear(yearParameter) {
            var year = '';
            if (yearParameter != null) {
                var yearRec = record.load({
                    type: 'customlist_hris_year_master',
                    id: yearParameter
                });
                year = yearRec.getValue({ fieldId: 'name' });
            }
            return year;
        }

        // Start - searchPGName
        function searchPGName(paygroup) {
            var PaygrpName;
            var currencyname;
            var Filters = [];
            Filters.push(search.createFilter({ name: 'internalid', operator: search.Operator.IS, values: paygroup }));
            Filters.push(search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' }));
            var column = [];
            column.push(search.createColumn({ name: 'name' }));
            column.push(search.createColumn({ name: 'custrecord_hris__currency' }));
            
            var searchEarnGrossCheck = search.create({
                type: 'customrecord_hris_process_groupmaster',
                filters: Filters,
                columns: column
            }).run().getRange({ start: 0, end: 1 });

            if (searchEarnGrossCheck != null && searchEarnGrossCheck.length > 0) {
                PaygrpName = searchEarnGrossCheck[0].getValue({ name: 'name' });
                currencyname = searchEarnGrossCheck[0].getText({ name: 'custrecord_hris__currency' });
            }
            return PaygrpName + "#" + currencyname;
        }

        function getArryMonthDays(month, year) {
            var standard_month_days;

            if (month == 'January' || month == 'March' || month == 'May' || month == 'July' || month == 'August' || month == 'October' || month == 'December') {
                standard_month_days = 31;
            }
            if (month == 'April' || month == 'June' || month == 'September' || month == 'November') {
                standard_month_days = 30;
            }
            else if (month == 'February') {
                var date = new Date();
                var yr = date.getFullYear();
                if (yr % 4 == 0) {
                    standard_month_days = 29;
                } else {
                    standard_month_days = 28;
                }
            }
            return standard_month_days;
        }

        function searchGratuityVal(empID) {
            var gratuity_amount = '0.00';
            var filter = [];
            var column = [];

            filter.push(search.createFilter({ name: 'custrecord_hris_pay_proc_employee', operator: search.Operator.ANYOF, values: empID }));
            filter.push(search.createFilter({ name: 'custrecord_hris_pay_proc_componet_sequen', operator: search.Operator.IS, values: '47' }));
            filter.push(search.createFilter({ name: 'custrecord_hris_pay_proc_process_type', operator: search.Operator.ANYOF, values: '2' }));
            filter.push(search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' }));

            column.push(search.createColumn({ name: 'internalid' }));
            column.push(search.createColumn({ name: 'custrecord_hris_pay_proc_value' }));

            var searchRes = search.create({
                type: 'customrecord_hris_pay_process',
                filters: filter,
                columns: column
            }).run().getRange({ start: 0, end: 1 });

            if (searchRes != null && searchRes.length > 0) {
                gratuity_amount = searchRes[0].getValue({ name: 'custrecord_hris_pay_proc_value' });
                log.debug('Gratuity Record EMPID', empID);
                log.debug('Gratuity Record', searchRes[0].getValue({ name: 'internalid' }));
            }

            return gratuity_amount;
        }

        function _logValidation(value) {
            if (value != 'null' && value != null && value != '' && value != undefined && value != 'undefined' && value != 'NaN' && !isNaN(value)) {
                return true;
            } else {
                return false;
            }
        }

        function padZero(val) {
            if (parseInt(val) < 10) {
                return "0" + val;
            } else if (parseInt(val) >= 10) {
                return val;
            }
        }

        function CheckValidOrNot(value) {
            if ((value != null) && (value != '') && (value != undefined) && (value.toString() != 'NaN')) {
                return true;
            } else {
                return false;
            }
        }

        function ValueOrNot(Value) {
            if (CheckValidOrNot(Value) && Value != '- None -') {
                return Value;
            } else {
                return '';
            }
        }

        function searchEmpPayGroup(userSub) {
            log.debug('aa userSub', userSub);
            var empPayGrp = '-1';
            var filter = [];
            var column = [];

            filter.push(search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' }));
            filter.push(search.createFilter({ name: 'custrecord_hris_subsidiary_new', operator: search.Operator.IS, values: userSub }));

            column.push(search.createColumn({ name: 'internalid' }));
            var searchRes = search.create({
                type: 'customrecord_hris_process_groupmaster',
                filters: filter,
                columns: column
            }).run().getRange({ start: 0, end: 1 });

            if (searchRes && searchRes.length > 0) {
                empPayGrp = searchRes[0].getValue({ name: 'internalid' });
                log.debug('aabb empPayGrp', empPayGrp);
            }

            return empPayGrp;
        }

        function ValueCheck(Value) {
            if (CheckValidOrNot(Value) && Value != '- None -') {
                return "'" + Value;
            } else {
                return '';
            }
        }

        function GetZero(Value) {
            if (CheckValidOrNot(Value) && Value != '- None -') {
                return Value;
            } else {
                return 0;
            }
        }

        function RoundValue(val) {
            var numericVal = parseFloat(val);
            var diff = numericVal - parseInt(numericVal);
            if (parseFloat(diff) < 0.5) {
                numericVal = parseInt(numericVal);
            } else if (parseFloat(diff) >= 0.5) {
                numericVal = parseInt(numericVal) + 1;
            }
            return numericVal;
        }

        return {
            onRequest: onRequest
        };
    });