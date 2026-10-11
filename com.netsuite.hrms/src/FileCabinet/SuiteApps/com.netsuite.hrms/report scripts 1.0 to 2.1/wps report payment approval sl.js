/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/file', 'N/runtime', 'N/log', 'N/xml'],
function(serverWidget, search, record, file, runtime, log, xml) {

    // BEGIN GLOBAL / SCOPE-LEVEL VARIABLES
    var a_employee_name = [];
    var a_empSalary_Details = [];
    var processStrtDate = '', processEndDate = '', mol_id = '', AgentName = '';
    var StandardMonthDays = '';
    var i_index = '';
    var netPay_Array = [];

    // BEGIN SUITELET ==================================================
    function onRequest(context) {
        var request = context.request;
        var response = context.response;

        // LOCAL VARIABLES
        var strVar = "";
        var o_form = '';

        try {
            if (request.method === 'GET') {
                o_form = serverWidget.createForm({ title: 'SM- WPS Report Payment Approval - UAE' });
                var userSub = runtime.getCurrentUser().subsidiary;
                // var empPaygroup = searchEmpPayGroup(userSub);
                var empPaygroup = request.parameters.process_grp;
                log.debug('aa empPaygroup', empPaygroup);

                var molParameter = request.parameters.moltype;
                if (CheckValidOrNot(molParameter)) {
                    var molLookup = search.lookupFields({
                        type: 'customrecord_hris_visa_type_master',
                        id: molParameter,
                        columns: ['custrecord_hris_visa_type_master_moiid', 'name']
                    });
                    mol_id = molLookup.custrecord_hris_visa_type_master_moiid;
                    log.debug('molParameter', 'molParameter==' + molParameter);
                    AgentName = molLookup.name;
                }

                var processType = request.parameters.processtype;
                var reportType = request.parameters.report;
                var paymenttype = request.parameters.paymenttype;
                log.audit('paymenttype', 'paymenttype==' + paymenttype);

                var monthParameter = request.parameters.month;
                var yearParameter = request.parameters.year;
                var subsidiary = request.parameters.subsidiary;

                var i_mode = request.parameters.i_mode;
                log.audit('suiteletFunction_salaryRegister', 'i_mode==' + i_mode);

                var month = getMonth(monthParameter);
                log.debug(' month', month);
                var year = getYear(yearParameter);

                var monthParameterhris = gethrisMonth(monthParameter);
                log.debug('monthParameterhris', monthParameterhris);
                var monthLastDay = getArryMonthDays(month, year);
                processStrtDate = '01' + '-' + month + '-' + xml.escape({ xmlText: String(year) });
                processEndDate = monthLastDay + '-' + month + '-' + xml.escape({ xmlText: String(year) });

                StandardMonthDays = getArryMonthDays(month, year);

                log.debug(' StandardMonthDays', StandardMonthDays);
                o_form.clientScriptModulePath = './wps report export as excel cs.js';

                o_form.addButton({
                    id: 'custpage_excelapprovebtn',
                    label: 'Export As Excel',
                    functionName: 'callSuiteletForApprovalReport(\'' + molParameter + '\',\'' + yearParameter + '\',\'' + monthParameter + '\',\'' + processType + '\',\'' + empPaygroup + '\',\'' + subsidiary + '\',\'' + paymenttype + '\')'
                });

                if (i_mode == 1) {
                    var o_file = downloadReport(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary, paymenttype);
                    log.audit('o_file:- ', o_file);
                    
                    response.writeFile({
                        file: o_file,
                        isInline: true
                    });
                } else {
                    strVar += "<table style=\"border-collapse: collapse;\" width=\"100%\">";
                    strVar += "	<tr>";
                    strVar += "		<td font-size=\"40\"  font-family=\"Helvetica\" align=\"left\" style=\"text-decoration: underline; font-size: 16px\"><b>" + AgentName + "<\/b><\/td>";
                    strVar += "	<\/tr>";
                    strVar += "	<tr style=\"height:15px;\">";
                    strVar += "		<td font-size=\"40\"  font-family=\"Helvetica\" align=\"left\" style=\"text-decoration: underline; font-size: 16px\"><b><\/b><\/td>";
                    strVar += "	<\/tr>";
                    strVar += "	<tr>";
                    strVar += "		<td font-size=\"40\"  font-family=\"Helvetica\" align=\"left\" style=\"text-decoration: underline; font-size: 16px\"><b>PAYROLL FOR THE MONTH OF<\/b><span style=\"font-color: red;\"><b> " + xml.escape({ xmlText: String(month.toUpperCase()) }) + "-" + xml.escape({ xmlText: String(year) }) + "<\/b><\/span><\/td>";
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
                    strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>EDR<\/b><\/td>";
                    strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:black 1px solid;border-right:black 1px solid;\"><b>Employee ID<\/b><\/td>";
                    strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Agent ID<\/b><\/td>";
                    strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Account Number<\/b><\/td>";
                    strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Pay Start Date<\/b><\/td>";
                    strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Pay End Date<\/b><\/td>";
                    strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Days<\/b><\/td>";
                    strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Fixed<\/b><\/td>";
                    strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Variable<\/b><\/td>";
                    strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Total<\/b><\/td>";
                    strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Name<\/b><\/td>";
                    strVar += "	<\/tr>";

                    var columns = [
                        search.createColumn({ name: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "custrecord_hris_pay_proc_employee_legal", summary: search.Summary.GROUP, sort: search.Sort.NONE }),
                        search.createColumn({ name: "custrecord_hris_pay_proc_employee_code", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "custrecord_hris_pay_proc_paid_days", summary: search.Summary.MAX }),
                        search.createColumn({ name: "custrecord_hris_pay_proc_lop_days", summary: search.Summary.MAX }),
                        search.createColumn({
                            name: "formulanumeric",
                            summary: search.Summary.SUM,
                            formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris_payroll_calculation_type} = 'Fixed' then {custrecord_hris_pay_proc_value} else 0 end"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            summary: search.Summary.SUM,
                            formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris_payroll_calculation_type} = 'Variable' then {custrecord_hris_pay_proc_value} else 0 end"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            summary: search.Summary.SUM,
                            formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = '100' then {custrecord_hris_pay_proc_value} else 0 end"
                        }),
                        search.createColumn({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "custentity_hris_emp_bankaccno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "custentity_hris_empbankibanacctno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP })
                    ];

                    var filters = [
                        search.createFilter({ name: 'custentity_hris_empvisaallocationmoltype', join: 'custrecord_hris_pay_proc_employee', operator: search.Operator.IS, values: molParameter }),
                        search.createFilter({ name: 'custrecord_hris_pay_proc_year', operator: search.Operator.ANYOF, values: yearParameter }),
                        search.createFilter({ name: 'custrecord_hris_pay_proc_pay_month', operator: search.Operator.ANYOF, values: monthParameter }),
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
                    if (paymenttype) {
                        filters.push(search.createFilter({ name: 'custentity_hris_employeepaymentmode', join: 'custrecord_hris_pay_proc_employee', operator: search.Operator.ANYOF, values: paymenttype }));
                    }

                    var searchObj = search.create({
                        type: 'customrecord_hris_pay_process',
                        filters: filters,
                        columns: columns
                    });

                    var o_searchResult = searchObj.run().getRange({ start: 0, end: 1000 });

                    if (o_searchResult && o_searchResult.length > 0) {
                        var FixedTotal = 0.00;
                        var VaribleTotal = 0.00;
                        var NetTotal = 0.00;

                        for (var j = 0; j < o_searchResult.length; j++) {
                            strVar += "	<tr>";
                            strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">EDR<\/b><\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + ValueOrNot(o_searchResult[j].getValue(columns[8])) + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + ValueOrNot(o_searchResult[j].getValue(columns[9])) + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + ValueOrNot(o_searchResult[j].getValue(columns[10])) + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + processStrtDate + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + processEndDate + "<\/td>";

                            strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + Number(StandardMonthDays) + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"  align=\"right\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + parseFloat(o_searchResult[j].getValue(columns[5]) || 0).toFixed(2) + "<\/td>";

                            strVar += "		<td  font-family=\"Helvetica\"  align=\"right\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + parseFloat(o_searchResult[j].getValue(columns[6]) || 0).toFixed(2) + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"  align=\"right\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + parseFloat(o_searchResult[j].getValue(columns[7]) || 0).toFixed(2) + "<\/td>";
                            strVar += "		<td  font-family=\"Helvetica\"  align=\"left\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + ValueOrNot(o_searchResult[j].getValue(columns[1])) + "<\/td>";

                            FixedTotal = parseFloat(FixedTotal) + parseFloat(o_searchResult[j].getValue(columns[5]) || 0);
                            VaribleTotal = parseFloat(VaribleTotal) + parseFloat(o_searchResult[j].getValue(columns[6]) || 0);
                            NetTotal = parseFloat(NetTotal) + parseFloat(o_searchResult[j].getValue(columns[7]) || 0);

                            strVar += "	<\/tr>";
                        }

                        strVar += "</table>";

                        var inlineHtmlField = o_form.addField({
                            id: 'custpage_salaryregister',
                            type: serverWidget.FieldType.INLINEHTML,
                            label: 'Salary Register'
                        });
                        inlineHtmlField.defaultValue = strVar;

                        response.writePage(o_form);

                    } else {
                        response.write("<b>" + "Data not Found.Please Check the Parameter again" + "</b>");
                    }
                }
            }
        } catch (e) {
            if (e.name)
                log.debug('system error', e.name + '\n' + e.message);
            else
                log.debug('unexpected error', e.toString());
        }

        log.debug('suiteletFunction_salaryRegister', '****** Execution Ends Here ********');
    }

    // END SUITELET ====================================================

    // BEGIN OBJECT CALLED/INVOKING FUNCTION ===================================================

    function downloadReport(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary, paymenttype) {
        try {
            var userSub = runtime.getCurrentUser().subsidiary;
            if (CheckValidOrNot(molParameter)) {
                var molLookup = search.lookupFields({
                    type: 'customrecord_hris_visa_type_master',
                    id: molParameter,
                    columns: ['custrecord_hris_visa_type_establishment', 'custrecord_hris_visa_type_emp_bank_route', 'name']
                });
                mol_id = molLookup.custrecord_hris_visa_type_establishment;
                SCR_Bank_Routing_Num = molLookup.custrecord_hris_visa_type_emp_bank_route;
                AgentName = molLookup.name;
            }

            var month = getMonth(monthParameter);
            var year = getYear(yearParameter);

            SalMonthYear = padZero(monthParameter) + year;
            log.debug('SalMonthYear', SalMonthYear);

            monthLastDay = getArryMonthDays(month, year);
            var monthParameterhris = gethrisMonth(monthParameter);
            processStrtDate = xml.escape({ xmlText: String(year) }) + "-" + padZero(monthParameterhris) + "-01";
            processEndDate = xml.escape({ xmlText: String(year) }) + "-" + padZero(monthParameterhris) + "-" + monthLastDay;

            payroll_Period = processStrtDate + ' - ' + processEndDate;

            var strVar1 = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
                '<head>' +
                '<meta http-equiv=Content-Type content="text/html; charset=windows-1252"/>' +
                '<meta name=ProgId content=Excel.Sheet/>' +
                '<meta name=Generator content="Microsoft Excel 11"/>' +
                '<!--[if gte mso 9]><xml>' +
                '<x:excelworkbook>' +
                '<x:excelworksheets>' +
                '<x:excelworksheet=sheet1>' +
                '<x:name>** ESTIMATE FILE**</x:name>' +
                '<x:worksheetoptions>' +
                '<x:selected></x:selected>' +
                '<x:freezepanes></x:freezepanes>' +
                '<x:frozennosplit></x:frozennosplit>' +
                '<x:splithorizontal>** FROZEN ROWS + 1 **</x:splithorizontal>' +
                '<x:toprowbottompane>** FROZEN ROWS + 1 **</x:toprowbottompane>' +
                '<x:splitvertical>** FROZEN COLUMNS + 1 **</x:splitvertical>' +
                '<x:leftcolumnrightpane>** FROZEN COLUMNS + 1**</x:leftcolumnrightpane>' +
                '<x:activepane>0</x:activepane>' +
                '<x:panes>' +
                '<x:pane>' +
                '<x:number>3</x:number>' +
                '</x:pane>' +
                '<x:pane>' +
                '<x:number>1</x:number>' +
                '</x:pane>' +
                '<x:pane>' +
                '<x:number>2</x:number>' +
                '</x:pane>' +
                '<x:pane>' +
                '<x:number>0</x:number>' +
                '</x:pane>' +
                '</x:panes>' +
                '<x:protectcontents>False</x:protectcontents>' +
                '<x:protectobjects>False</x:protectobjects>' +
                '<x:protectscenarios>False</x:protectscenarios>' +
                '</x:worksheetoptions>' +
                '</x:excelworksheet>' +
                '</x:excelworksheets>' +
                '<x:protectstructure>False</x:protectstructure>' +
                '<x:protectwindows>False</x:protectwindows>' +
                '</x:excelworkbook>' +
                '</x:excelworkbook>' +
                '</xml><![endif]-->' +
                '<style>' +
                'p.MsoFooter, li.MsoFooter, div.MsoFooter' +
                '{ margin:0in; margin-bottom:.0001pt; mso-pagination:widow-orphan; tab-stops:center 3.0in right 6.0in; font-size:12.0pt;}' +
                '<style>' +
                'div.Section1' +
                '{ page:Section1;}' +
                'table#hrdftrtbl' +
                '{ margin:0in 0in 0in 900in; width:1px; height:1px; overflow:hidden; font-family:Arial; background-color:red;}-->' +
                '</style>' +
                '</head>' +
                '<body>' +
                '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">';

            var strVar = '';

            strVar += "<table style=\"border-collapse: collapse;\" width=\"100%\">";
            strVar += "	<tr>";
            strVar += "		<td font-size=\"40\"  font-family=\"Helvetica\" align=\"left\" style=\"text-decoration: underline; font-size: 16px\"><b>" + AgentName + "<\/b><\/td>";
            strVar += "	<\/tr>";
            strVar += "	<tr style=\"height:15px;\">";
            strVar += "		<td font-size=\"40\"  font-family=\"Helvetica\" align=\"left\" style=\"text-decoration: underline; font-size: 16px\"><b><\/b><\/td>";
            strVar += "	<\/tr>";
            strVar += "	<tr>";
            strVar += "		<td font-size=\"40\"  font-family=\"Helvetica\" align=\"left\" style=\"text-decoration: underline; font-size: 16px\"><b>PAYROLL FOR THE MONTH OF<\/b><span style=\"font-color: red;\"><b> " + xml.escape({ xmlText: String(month.toUpperCase()) }) + "-" + xml.escape({ xmlText: String(year) }) + "<\/b><\/span><\/td>";
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
            strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>EDR<\/b><\/td>";
            strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:black 1px solid;border-right:black 1px solid;\"><b>Employee ID<\/b><\/td>";
            strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Agent ID<\/b><\/td>";
            strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Account Number<\/b><\/td>";
            strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Pay Start Date<\/b><\/td>";
            strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Pay End Date<\/b><\/td>";
            strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Days<\/b><\/td>";
            strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Fixed<\/b><\/td>";
            strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Variable<\/b><\/td>";
            strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Total<\/b><\/td>";
            strVar += "		<td   font-family=\"Helvetica\"  align=\"center\" style=\"font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;\"><b>Name<\/b><\/td>";
            strVar += "	<\/tr>";

            var columns = [
                search.createColumn({ name: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                search.createColumn({ name: "custrecord_hris_pay_proc_employee_legal", summary: search.Summary.GROUP, sort: search.Sort.NONE }),
                search.createColumn({ name: "custrecord_hris_pay_proc_employee_code", summary: search.Summary.GROUP }),
                search.createColumn({ name: "custrecord_hris_pay_proc_paid_days", summary: search.Summary.MAX }),
                search.createColumn({ name: "custrecord_hris_pay_proc_lop_days", summary: search.Summary.MAX }),
                search.createColumn({
                    name: "formulanumeric",
                    summary: search.Summary.SUM,
                    formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris_payroll_calculation_type} = 'Fixed' then {custrecord_hris_pay_proc_value} else 0 end"
                }),
                search.createColumn({
                    name: "formulanumeric",
                    summary: search.Summary.SUM,
                    formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris_payroll_calculation_type} = 'Variable' then {custrecord_hris_pay_proc_value} else 0 end"
                }),
                search.createColumn({
                    name: "formulanumeric",
                    summary: search.Summary.SUM,
                    formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = '100' then {custrecord_hris_pay_proc_value} else 0 end"
                }),
                search.createColumn({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                search.createColumn({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                search.createColumn({ name: "custentity_hris_emp_bankaccno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                search.createColumn({ name: "custentity_hris_empbankibanacctno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP })
            ];

            var filters = [
                search.createFilter({ name: 'custentity_hris_empvisaallocationmoltype', join: 'custrecord_hris_pay_proc_employee', operator: search.Operator.IS, values: molParameter }),
                search.createFilter({ name: 'custrecord_hris_pay_proc_year', operator: search.Operator.ANYOF, values: yearParameter }),
                search.createFilter({ name: 'custrecord_hris_pay_proc_pay_month', operator: search.Operator.ANYOF, values: monthParameter }),
                search.createFilter({ name: 'custrecord_hris_pay_proc_value', operator: search.Operator.GREATERTHAN, values: "0" })
            ];

            if (paymenttype) {
                filters.push(search.createFilter({ name: 'custentity_hris_employeepaymentmode', join: 'custrecord_hris_pay_proc_employee', operator: search.Operator.ANYOF, values: paymenttype }));
            }
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

            var searchObj = search.create({
                type: 'customrecord_hris_pay_process',
                filters: filters,
                columns: columns
            });

            var o_searchResult = searchObj.run().getRange({ start: 0, end: 1000 });

            var FixedTotal = 0.00;
            var VaribleTotal = 0.00;
            var NetTotal = 0.00;

            if (o_searchResult && o_searchResult.length > 0) {
                for (var j = 0; j < o_searchResult.length; j++) {
                    strVar += "	<tr>";
                    strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">EDR<\/b><\/td>";
                    strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"mso-number-format:\@ ; border-bottom:black 1px solid;border-right:black 1px solid;\">" + ValueCheck(o_searchResult[j].getValue(columns[8])) + "<\/td>";
                    strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"mso-number-format:\@ ; border-bottom:black 1px solid;border-right:black 1px solid;\">" + ValueCheck(o_searchResult[j].getValue(columns[9])) + "<\/td>";
                    strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + ValueCheck(o_searchResult[j].getValue(columns[10])) + "<\/td>";
                    strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"mso-number-format:\@ ; border-bottom:black 1px solid;border-right:blackValueCheck1px solid;\">" + ValueCheck(processStrtDate) + "<\/td>";
                    strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"mso-number-format:\@ ; border-bottom:black 1px solid;border-right:black 1px solid;\">" + ValueCheck(processEndDate) + "<\/td>";

                    strVar += "		<td  font-family=\"Helvetica\"  align=\"center\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + Number(StandardMonthDays) + "<\/td>";
                    strVar += "		<td  font-family=\"Helvetica\"  align=\"right\" style=\"mso-number-format:\@ ; border-bottom:black 1px solid;border-right:black 1px solid;\">" + parseFloat(o_searchResult[j].getValue(columns[5]) || 0).toFixed(2) + "<\/td>";

                    strVar += "		<td  font-family=\"Helvetica\"  align=\"right\" style=\"mso-number-format:\@ ; border-bottom:black 1px solid;border-right:black 1px solid;\">" + parseFloat(o_searchResult[j].getValue(columns[6]) || 0).toFixed(2) + "<\/td>";
                    strVar += "		<td  font-family=\"Helvetica\"  align=\"right\" style=\"mso-number-format:\@ ; border-bottom:black 1px solid;border-right:black 1px solid;\">" + parseFloat(o_searchResult[j].getValue(columns[7]) || 0).toFixed(2) + "<\/td>";
                    strVar += "		<td  font-family=\"Helvetica\"  align=\"left\" style=\"border-bottom:black 1px solid;border-right:black 1px solid;\">" + ValueOrNot(o_searchResult[j].getValue(columns[1])) + "<\/td>";

                    FixedTotal = parseFloat(FixedTotal) + parseFloat(o_searchResult[j].getValue(columns[5]) || 0);
                    VaribleTotal = parseFloat(VaribleTotal) + parseFloat(o_searchResult[j].getValue(columns[6]) || 0);
                    NetTotal = parseFloat(NetTotal) + parseFloat(o_searchResult[j].getValue(columns[7]) || 0);

                    strVar += "	<\/tr>";
                }
            }

            strVar += "</table>";

            strVar1 = strVar1 + strVar;
            var excelFile = file.create({
                name: 'Payment Approval Report ' + month.toUpperCase() + '-' + year + '-' + AgentName + '.xls',
                fileType: file.Type.EXCEL,
                contents: strVar1
            });

            log.debug('file:- ', excelFile);
            return excelFile;
        } catch (err) {
            log.error('ERROR MESSAGE:- ', err);
        }
        log.debug('downloadApprovalReport', '****** downloadApprovalReport() function Execution Ends Here ********');
    }

    // Get Subsidiary
    function getSubsidiaries(paygroup) {
        var subsidiary = '';
        if (paygroup != null) {
            var payGrouprec = record.load({
                type: 'customrecord_hris_process_groupmaster',
                id: paygroup
            });
            subsidiary = payGrouprec.getText({ fieldId: 'custrecord_hris_subsidiary_new' });
            subsidiary = subsidiary.substring(subsidiary.indexOf(":") + 1, subsidiary.length);
        }
        return subsidiary;
    }

    // Get Month
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

    // Get Year
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
        var Filters = [
            search.createFilter({ name: 'internalid', operator: search.Operator.IS, values: paygroup }),
            search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' })
        ];
        var column = [
            search.createColumn({ name: 'name' }),
            search.createColumn({ name: 'custrecord_hris__currency' })
        ];
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
        } else if (month == 'February') {
            var date = new Date();
            var currYear = date.getFullYear();
            if (currYear % 4 == 0) {
                standard_month_days = 29;
            } else {
                standard_month_days = 28;
            }
        }
        return standard_month_days;
    }

    function searchGratuityVal(empID) {
        var gratuity_amount = '0.00';
        var filter = [
            search.createFilter({ name: "custrecord_hris_pay_proc_employee", operator: search.Operator.ANYOF, values: empID }),
            search.createFilter({ name: 'custrecord_hris_pay_proc_componet_sequen', operator: search.Operator.IS, values: '47' }),
            search.createFilter({ name: 'custrecord_hris_pay_proc_process_type', operator: search.Operator.ANYOF, values: '2' }),
            search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' })
        ];
        var column = [
            search.createColumn({ name: 'internalid' }),
            search.createColumn({ name: 'custrecord_hris_pay_proc_value' })
        ];

        var searchObj = search.create({
            type: 'customrecord_hris_pay_process',
            filters: filter,
            columns: column
        }).run().getRange({ start: 0, end: 1 });

        if (searchObj != null && searchObj.length > 0) {
            gratuity_amount = searchObj[0].getValue({ name: 'custrecord_hris_pay_proc_value' });
            log.debug('Gratuity Record EMPID', empID);
            log.debug('Gratuity Record', searchObj[0].getValue({ name: 'internalid' }));
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

    function searchEmpPayGroup(userSub) {
        log.debug('aa userSub', userSub);
        var empPayGrp = '-1';
        var filter = [
            search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' }),
            search.createFilter({ name: 'custrecord_hris_subsidiary_new', operator: search.Operator.IS, values: userSub })
        ];
        var column = [
            search.createColumn({ name: 'internalid' })
        ];

        var searchObj = search.create({
            type: 'customrecord_hris_process_groupmaster',
            filters: filter,
            columns: column
        }).run().getRange({ start: 0, end: 1 });

        if (searchObj && searchObj.length > 0) {
            empPayGrp = searchObj[0].getValue({ name: 'internalid' });
            log.debug('aabb empPayGrp', empPayGrp);
        }

        return empPayGrp;
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

    function padZero(val) {
        if (parseInt(val) < 10) {
            return "0" + val;
        } else if (parseInt(val) >= 10) {
            return val;
        }
    }

    // END OBJECT CALLED/INVOKING FUNCTION =====================================================

    return {
        onRequest: onRequest
    };
});