/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/file', 'N/runtime', 'N/log', 'N/xml'],
(serverWidget, search, record, file, runtime, log, xml) => {

    // BEGIN GLOBAL VARIABLE BLOCK  =====================================
    let a_employee_name = [];
    let a_empSalary_Details = [];
    let processStrtDate = '', processEndDate = '', mol_id = '', AgentName = '';
    let i_index = '';
    let netPay_Array = [];
    let SalMonthYear;
    let monthLastDay;
    let scr_table = '';
    let SCR_Bank_Routing_Num = '';
    let empPaygroup = '';
    let payroll_Period = '';
    // END GLOBAL VARIABLE BLOCK  =======================================

    // BEGIN SUITELET ==================================================
    const onRequest = (scriptContext) => {
        let strVar = "";
        let o_form = '';

        try {
            if (scriptContext.request.method === 'GET') {
                o_form = serverWidget.createForm({ title: 'SM- WPS Report - Qatar' });

                const userSub = runtime.getCurrentUser().subsidiary;
                empPaygroup = scriptContext.request.parameters.process_grp;
                log.debug('aa empPaygroup', empPaygroup);

                const molParameter = scriptContext.request.parameters.moltype;
                if (CheckValidOrNot(molParameter)) {
                    const visaLookups = search.lookupFields({
                        type: 'customrecord_hris_visa_type_master',
                        id: molParameter,
                        columns: ['custrecord_hris_visa_type_establishment', 'custrecord_hris_visa_type_emp_bank_route', 'name']
                    });
                    mol_id = visaLookups.custrecord_hris_visa_type_establishment;
                    SCR_Bank_Routing_Num = visaLookups.custrecord_hris_visa_type_emp_bank_route;

                    log.debug('molParameter', 'molParameter==' + molParameter);
                    AgentName = visaLookups.name;
                }

                const processType = scriptContext.request.parameters.processtype;
                const monthParameter = scriptContext.request.parameters.month;
                const yearParameter = scriptContext.request.parameters.year;
                const subsidiary = scriptContext.request.parameters.subsidiary;

                const i_mode = scriptContext.request.parameters.i_mode;
                log.audit('suiteletFunction_salaryRegister', 'i_mode==' + i_mode);

                const month = getMonth(monthParameter);
                const year = getYear(yearParameter);

                SalMonthYear = padZero(monthParameter) + year;
                log.debug('SalMonthYear', SalMonthYear);

                monthLastDay = getArryMonthDays(month, year);
                processStrtDate = xml.escape({ xmlText: String(year) }) + "-" + padZero(monthParameter) + "-01";
                processEndDate = xml.escape({ xmlText: String(year) }) + "-" + padZero(monthParameter) + "-" + monthLastDay;

                payroll_Period = processStrtDate + ' - ' + processEndDate;

                o_form.clientScriptModulePath = './wps report export as excel cs.js';
                o_form.addButton({
                    id: 'custpage_excelbtn',
                    label: 'Export As Excel',
                    functionName: `CallWps_Quatar('${molParameter}','${yearParameter}','${monthParameter}','${processType}', '${empPaygroup}', '${subsidiary}');`
                });
                o_form.addButton({
                    id: 'custpage_sifbtn',
                    label: 'Export As CSV',
                    functionName: `downloadSFIReport_Quatar('${molParameter}','${yearParameter}','${monthParameter}','${processType}', '${empPaygroup}', '${subsidiary}');`
                });

                if (i_mode == 1) {
                    const o_file = downloadReport(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary);
                    log.audit('o_file:- ', o_file);
                    scriptContext.response.writeFile({
                        file: o_file,
                        isInline: true
                    });
                } else if (i_mode == 2) {
                    const o_file = downloadSFIReport_Quatar(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary, scriptContext.response);
                } else {
                    strVar += `<table style="border-collapse: collapse;" width="100%">`;
                    strVar += `	<tr>`;
                    strVar += `		<td font-size="40" font-family="Helvetica" align="left" style="text-decoration: underline; font-size: 16px"><b>${AgentName}</b></td>`;
                    strVar += `	</tr>`;
                    strVar += `	<tr style="height:15px;">`;
                    strVar += `		<td font-size="40" font-family="Helvetica" align="left" style="text-decoration: underline; font-size: 16px"><b></b></td>`;
                    strVar += `	</tr>`;
                    strVar += `	<tr>`;
                    strVar += `		<td font-size="40" font-family="Helvetica" align="left" style="text-decoration: underline; font-size: 16px"><b>PAYROLL FOR THE MONTH OF</b><span style="font-color: red;"><b> ${xml.escape({ xmlText: month.toUpperCase() })}-${xml.escape({ xmlText: String(year) })}</b></span></td>`;
                    strVar += `	</tr>`;
                    strVar += `	<tr style="height:15px;">`;
                    strVar += `		<td font-size="40" font-family="Helvetica" align="left" style="text-decoration: underline; font-size: 16px"><b></b></td>`;
                    strVar += `	</tr>`;
                    strVar += `</table>`;

                    strVar += `<style type="text/css">`;
                    strVar += `.tbl tr:hover {background-color: #C7C2C1;}`;
                    strVar += `</style>`;
                    strVar += `<table class="tbl" style="border-collapse: collapse; border: black 1px solid;" align="center" border="1" width="100%">`;
                    strVar += `	<tr>`;
                    strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:black 1px solid;border-right:black 1px solid;"><b>Employee No</b></td>`;
                    strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:black 1px solid;border-right:black 1px solid;"><b>First Name</b></td>`;
                    strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Last Name</b></td>`;
                    strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>No.Of Days Worked</b></td>`;
                    strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Overtime Hours</b></td>`;
                    strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Basic Salary</b></td>`;
                    strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Extra Income</b></td>`;
                    strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Deductions</b></td>`;
                    strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Net Salary</b></td>`;
                    strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Comments</b></td>`;
                    strVar += `	</tr>`;

                    const columns = [
                        search.createColumn({ name: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "custrecord_hris_pay_proc_employee_legal", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "custrecord_hris_pay_proc_employee_code", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "custrecord_hris_pay_proc_paid_days", summary: search.Summary.MAX }),
                        search.createColumn({ name: "custrecord_hris_pay_proc_lop_days", summary: search.Summary.MAX }),
                        search.createColumn({
                            name: "formulanumeric",
                            summary: search.Summary.SUM,
                            formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 1 then {custrecord_hris_pay_proc_value} else 0 end"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            summary: search.Summary.SUM,
                            formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 50 then {custrecord_hris_pay_proc_value} else 0 end"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            summary: search.Summary.SUM,
                            formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 99 then {custrecord_hris_pay_proc_value} else 0 end"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            summary: search.Summary.SUM,
                            formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 100 then {custrecord_hris_pay_proc_value} else 0 end"
                        }),
                        search.createColumn({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "custentity_hris_emp_bankaccno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "custentity_hris_empbankibanacctno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                        search.createColumn({ name: "firstname", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP, sort: search.Sort.ASC }),
                        search.createColumn({ name: "lastname", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP, sort: search.Sort.ASC })
                    ];

                    const filters = [
                        search.createFilter({ name: 'custentity_hris_empvisaallocationmoltype', join: 'custrecord_hris_pay_proc_employee', operator: search.Operator.ANYOF, values: molParameter }),
                        search.createFilter({ name: 'custrecord_hris_pay_proc_year', operator: search.Operator.ANYOF, values: yearParameter }),
                        search.createFilter({ name: 'custrecord_hris_pay_proc_pay_month', operator: search.Operator.ANYOF, values: monthParameter }),
                        search.createFilter({ name: 'custrecord_hris_pay_proc_value', operator: search.Operator.GREATERTHAN, values: "0" }),
                        search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' })
                    ];

                    if (empPaygroup) {
                        filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_pay_group', operator: search.Operator.ANYOF, values: empPaygroup }));
                    }
                    if (processType) {
                        filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_process_type', operator: search.Operator.IS, values: processType }));
                    }
                    if (subsidiary) {
                        filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_company_name', operator: search.Operator.ANYOF, values: subsidiary }));
                    }

                    const paySearch = search.create({
                        type: 'customrecord_hris_pay_process',
                        filters: filters,
                        columns: columns
                    });

                    const o_searchResult = paySearch.run().getRange({ start: 0, end: 1000 });

                    if (o_searchResult && o_searchResult.length > 0) {
                        let total_net_pay = 0.00;
                        for (let j = 0; j < o_searchResult.length; j++) {
                            strVar += `	<tr>`;
                            strVar += `		<td font-family="Helvetica" align="center" style="border-bottom:black 1px solid;border-right:black 1px solid;">${ValueOrNot(o_searchResult[j].getValue(columns[9]))}</td>`;
                            strVar += `		<td font-family="Helvetica" align="left" style="border-bottom:black 1px solid;border-right:black 1px solid;">${ValueOrNot(o_searchResult[j].getValue(columns[13]))}</td>`;
                            strVar += `		<td font-family="Helvetica" align="left" style="border-bottom:black 1px solid;border-right:black 1px solid;">${ValueOrNot(o_searchResult[j].getValue(columns[14]))}</td>`;
                            strVar += `		<td font-family="Helvetica" align="center" style="border-bottom:black 1px solid;border-right:black 1px solid;">${Number(o_searchResult[j].getValue(columns[3]))}</td>`;
                            strVar += `		<td font-family="Helvetica" align="center" style="border-bottom:black 1px solid;border-right:black 1px solid;">0</td>`;
                            strVar += `		<td font-family="Helvetica" align="right" style="border-bottom:black 1px solid;border-right:black 1px solid;">${parseFloat(o_searchResult[j].getValue(columns[5]) || 0).toFixed(2)}</td>`;
                            strVar += `		<td font-family="Helvetica" align="right" style="border-bottom:black 1px solid;border-right:black 1px solid;">${(parseFloat(o_searchResult[j].getValue(columns[6]) || 0) - parseFloat(o_searchResult[j].getValue(columns[5]) || 0)).toFixed(2)}</td>`;
                            strVar += `		<td font-family="Helvetica" align="right" style="border-bottom:black 1px solid;border-right:black 1px solid;">${parseFloat(o_searchResult[j].getValue(columns[7]) || 0).toFixed(2)}</td>`;
                            strVar += `		<td font-family="Helvetica" align="right" style="border-bottom:black 1px solid;border-right:black 1px solid;">${parseFloat(o_searchResult[j].getValue(columns[8]) || 0).toFixed(2)}</td>`;
                            strVar += `		<td font-family="Helvetica" align="center" style="border-bottom:black 1px solid;border-right:black 1px solid;"></td>`;
                            strVar += `	</tr>`;
                        }

                        strVar += `</table>`;

                        const _date = new Date();
                        const currentTime = new Date();
                        const currentOffset = currentTime.getTimezoneOffset();
                        const ISTOffset = 240; // Dubai offset UTC +4  
                        const ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);

                        const hoursIST = ISTTime.getHours();
                        const minutesIST = ISTTime.getMinutes();

                        const field = o_form.addField({
                            id: 'custpage_salaryregister',
                            type: serverWidget.FieldType.INLINEHTML,
                            label: ' '
                        });
                        field.defaultValue = strVar;
                        scriptContext.response.writePage(o_form);
                    } else {
                        scriptContext.response.write("<b>Data not Found.Please Check the Parameter again</b>");
                    }
                }
            }
        } catch (e) {
            log.debug('system/unexpected error', e.message || e.toString());
        }

        log.debug('suiteletFunction_salaryRegister', '****** Execution Ends Here ********');
    };

    // END SUITELET ====================================================

    function downloadReport(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary) {
        const userSub = runtime.getCurrentUser().subsidiary;
        if (CheckValidOrNot(molParameter)) {
            const visaLookups = search.lookupFields({
                type: 'customrecord_hris_visa_type_master',
                id: molParameter,
                columns: ['custrecord_hris_visa_type_establishment', 'custrecord_hris_visa_type_emp_bank_route', 'name']
            });
            mol_id = visaLookups.custrecord_hris_visa_type_establishment;
            SCR_Bank_Routing_Num = visaLookups.custrecord_hris_visa_type_emp_bank_route;
            AgentName = visaLookups.name;
        }

        const month = getMonth(monthParameter);
        const year = getYear(yearParameter);

        SalMonthYear = padZero(monthParameter) + year;
        log.debug('SalMonthYear', SalMonthYear);

        monthLastDay = getArryMonthDays(month, year);
        processStrtDate = xml.escape({ xmlText: String(year) }) + "-" + padZero(monthParameter) + "-01";
        processEndDate = xml.escape({ xmlText: String(year) }) + "-" + padZero(monthParameter) + "-" + monthLastDay;

        payroll_Period = processStrtDate + ' - ' + processEndDate;

        let strVar1 = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
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
            '<x:pane><x:number>3</x:number></x:pane>' +
            '<x:pane><x:number>1</x:number></x:pane>' +
            '<x:pane><x:number>2</x:number></x:pane>' +
            '<x:pane><x:number>0</x:number></x:pane>' +
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
            '</xml><![endif]-->' +
            '<style>' +
            'p.MsoFooter, li.MsoFooter, div.MsoFooter' +
            '{ margin:0in; margin-bottom:.0001pt; mso-pagination:widow-orphan; tab-stops:center 3.0in right 6.0in; font-size:12.0pt;}' +
            'div.Section1{ page:Section1;}' +
            'table#hrdftrtbl{ margin:0in 0in 0in 900in; width:1px; height:1px; overflow:hidden; font-family:Arial; background-color:red;}' +
            '</style>' +
            '</head>' +
            '<body>' +
            '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">';

        let strVar = '';
        strVar += `<table style="border-collapse: collapse;" width="100%">`;
        strVar += `	<tr>`;
        strVar += `		<td font-size="40" font-family="Helvetica" align="left" style="text-decoration: underline; font-size: 16px"><b>${AgentName}</b></td>`;
        strVar += `	</tr>`;
        strVar += `	<tr style="height:15px;">`;
        strVar += `		<td font-size="40" font-family="Helvetica" align="left" style="text-decoration: underline; font-size: 16px"><b></b></td>`;
        strVar += `	</tr>`;
        strVar += `	<tr>`;
        strVar += `		<td font-size="40" font-family="Helvetica" align="left" style="text-decoration: underline; font-size: 16px"><b>PAYROLL FOR THE MONTH OF</b><span style="font-color: red;"><b> ${xml.escape({ xmlText: month.toUpperCase() })}-${xml.escape({ xmlText: String(year) })}</b></span></td>`;
        strVar += `	</tr>`;
        strVar += `	<tr style="height:15px;">`;
        strVar += `		<td font-size="40" font-family="Helvetica" align="left" style="text-decoration: underline; font-size: 16px"><b></b></td>`;
        strVar += `	</tr>`;
        strVar += `</table>`;

        strVar += `<style type="text/css">`;
        strVar += `.tbl tr:hover {background-color: #C7C2C1;}`;
        strVar += `</style>`;
        strVar += `<table class="tbl" style="border-collapse: collapse; border: black 1px solid;" align="center" border="1" width="100%">`;
        strVar += `	<tr>`;
        strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:black 1px solid;border-right:black 1px solid;"><b>Employee No</b></td>`;
        strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:black 1px solid;border-right:black 1px solid;"><b>First Name</b></td>`;
        strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Last Name</b></td>`;
        strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>No.Of Days Worked</b></td>`;
        strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Overtime Hours</b></td>`;
        strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Basic Salary</b></td>`;
        strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Extra Income</b></td>`;
        strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Deductions</b></td>`;
        strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Net Salary</b></td>`;
        strVar += `		<td font-family="Helvetica" align="center" style="font-size:13px; color:aliceblue; background-color: gray;border-bottom:none;border-right:black 1px solid;"><b>Comments</b></td>`;
        strVar += `	</tr>`;

        scr_table += `<table class="tbl" id="scr_table" style="border-collapse: collapse; border: #060a0f 1px solid; margin-top:10px;" align="center" border="1" width="100%">`;
        scr_table += `	<tr>`;
        scr_table += `		<td font-family="Helvetica" align="center" style="background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;"><b>SCR</b></td>`;
        scr_table += `		<td font-family="Helvetica" align="center" style="background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;"><b>Employer Id</b></td>`;
        scr_table += `		<td font-family="Helvetica" align="center" style="background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;"><b>Bank Routing Code and Bank Acount</b></td>`;
        scr_table += `		<td font-family="Helvetica" align="center" style="background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;"><b>Date of File Creation </b></td>`;
        scr_table += `		<td font-family="Helvetica" align="center" style="background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;"><b>Time of File Creation </b></td>`;
        scr_table += `		<td font-family="Helvetica" align="center" style="background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;"><b>Salary Month and Year</b></td>`;
        scr_table += `		<td font-family="Helvetica" align="center" style="background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;"><b>EDR Count</b></td>`;
        scr_table += `		<td font-family="Helvetica" align="center" style="background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;"><b>Total Salary</b></td>`;
        scr_table += `		<td font-family="Helvetica" align="center" style="background-color: #D1D2F1;border-bottom:#C7C2C1 1px solid;border-right:#C7C2C1 1px solid;"><b>Payment Currency</b></td>`;
        scr_table += `	</tr>`;

        const columns = [
            search.createColumn({ name: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
            search.createColumn({ name: "custrecord_hris_pay_proc_employee_legal", summary: search.Summary.GROUP }),
            search.createColumn({ name: "custrecord_hris_pay_proc_employee_code", summary: search.Summary.GROUP }),
            search.createColumn({ name: "custrecord_hris_pay_proc_paid_days", summary: search.Summary.MAX }),
            search.createColumn({ name: "custrecord_hris_pay_proc_lop_days", summary: search.Summary.MAX }),
            search.createColumn({
                name: "formulanumeric",
                summary: search.Summary.SUM,
                formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 1 then {custrecord_hris_pay_proc_value} else 0 end"
            }),
            search.createColumn({
                name: "formulanumeric",
                summary: search.Summary.SUM,
                formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 50 then {custrecord_hris_pay_proc_value} else 0 end"
            }),
            search.createColumn({
                name: "formulanumeric",
                summary: search.Summary.SUM,
                formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 99 then {custrecord_hris_pay_proc_value} else 0 end"
            }),
            search.createColumn({
                name: "formulanumeric",
                summary: search.Summary.SUM,
                formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 100 then {custrecord_hris_pay_proc_value} else 0 end"
            }),
            search.createColumn({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
            search.createColumn({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
            search.createColumn({ name: "custentity_hris_emp_bankaccno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
            search.createColumn({ name: "custentity_hris_empbankibanacctno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
            search.createColumn({ name: "firstname", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP, sort: search.Sort.ASC }),
            search.createColumn({ name: "lastname", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP, sort: search.Sort.ASC })
        ];

        const filters = [
            search.createFilter({ name: 'custentity_hris_empvisaallocationmoltype', join: 'custrecord_hris_pay_proc_employee', operator: search.Operator.ANYOF, values: molParameter }),
            search.createFilter({ name: 'custrecord_hris_pay_proc_year', operator: search.Operator.ANYOF, values: yearParameter }),
            search.createFilter({ name: 'custrecord_hris_pay_proc_pay_month', operator: search.Operator.ANYOF, values: monthParameter }),
            search.createFilter({ name: 'custrecord_hris_pay_proc_value', operator: search.Operator.GREATERTHAN, values: "0" }),
            search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' })
        ];

        if (empPaygroup) {
            filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_pay_group', operator: search.Operator.ANYOF, values: empPaygroup }));
        }
        if (processType) {
            filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_process_type', operator: search.Operator.IS, values: processType }));
        }
        if (subsidiary) {
            filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_company_name', operator: search.Operator.ANYOF, values: subsidiary }));
        }

        const paySearch = search.create({
            type: 'customrecord_hris_pay_process',
            filters: filters,
            columns: columns
        });

        const o_searchResult = paySearch.run().getRange({ start: 0, end: 1000 });

        if (o_searchResult) {
            let total_net_pay = 0.00;
            for (let j = 0; j < o_searchResult.length; j++) {
                strVar += `	<tr>`;
                strVar += `		<td font-family="Helvetica" align="center" style="mso-number-format:\\@ ; border-bottom:black 1px solid;border-right:black 1px solid;">${ValueOrNot(o_searchResult[j].getValue(columns[9]))}</td>`;
                strVar += `		<td font-family="Helvetica" align="left" style="border-bottom:black 1px solid;border-right:black 1px solid;">${ValueOrNot(o_searchResult[j].getValue(columns[13]))}</td>`;
                strVar += `		<td font-family="Helvetica" align="left" style="border-bottom:black 1px solid;border-right:black 1px solid;">${ValueOrNot(o_searchResult[j].getValue(columns[14]))}</td>`;
                strVar += `		<td font-family="Helvetica" align="center" style="mso-number-format:\\@ ; border-bottom:black 1px solid;border-right:black 1px solid;">${Number(o_searchResult[j].getValue(columns[3]))}</td>`;
                strVar += `		<td font-family="Helvetica" align="center" style="mso-number-format:\\@ ; border-bottom:black 1px solid;border-right:black 1px solid;">0</td>`;
                strVar += `		<td font-family="Helvetica" align="right" style="mso-number-format:\\@ ; border-bottom:black 1px solid;border-right:black 1px solid;">${parseFloat(o_searchResult[j].getValue(columns[5]) || 0).toFixed(2)}</td>`;
                strVar += `		<td font-family="Helvetica" align="right" style="mso-number-format:\\@ ; border-bottom:black 1px solid;border-right:black 1px solid;">${(parseFloat(o_searchResult[j].getValue(columns[6]) || 0) - parseFloat(o_searchResult[j].getValue(columns[5]) || 0)).toFixed(2)}</td>`;
                strVar += `		<td font-family="Helvetica" align="right" style="mso-number-format:\\@ ; border-bottom:black 1px solid;border-right:black 1px solid;">${parseFloat(o_searchResult[j].getValue(columns[7]) || 0).toFixed(2)}</td>`;
                strVar += `		<td font-family="Helvetica" align="right" style="mso-number-format:\\@ ; border-bottom:black 1px solid;border-right:black 1px solid;">${parseFloat(o_searchResult[j].getValue(columns[8]) || 0).toFixed(2)}</td>`;
                strVar += `		<td font-family="Helvetica" align="center" style="border-bottom:black 1px solid;border-right:black 1px solid;"></td>`;
                strVar += `	</tr>`;
            }

            strVar += `</table>`;

            const _date = new Date();
            const currentTime = new Date();
            const currentOffset = currentTime.getTimezoneOffset();
            const ISTOffset = 240; // Dubai offset UTC +4  
            const ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);

            const hoursIST = ISTTime.getHours();
            const minutesIST = ISTTime.getMinutes();

            strVar1 = strVar1 + strVar;
            const fileObj = file.create({
                name: 'WPS Report.xls',
                fileType: file.Type.EXCEL,
                contents: strVar1
            });
            log.debug('file:- ', fileObj);
            return fileObj;
        }
    }

    function downloadSFIReport_Quatar(molParameter, yearParameter, monthParameter, processType, empPaygroup, subsidiary, response) {
        try {
            const userSub = runtime.getCurrentUser().subsidiary;
            if (CheckValidOrNot(molParameter)) {
                const visaLookups = search.lookupFields({
                    type: 'customrecord_hris_visa_type_master',
                    id: molParameter,
                    columns: ['custrecord_hris_visa_type_establishment', 'custrecord_hris_visa_type_emp_bank_route', 'name']
                });
                mol_id = visaLookups.custrecord_hris_visa_type_establishment;
                SCR_Bank_Routing_Num = visaLookups.custrecord_hris_visa_type_emp_bank_route;
                AgentName = visaLookups.name;
            }

            const month = getMonth(monthParameter);
            const year = getYear(yearParameter);

            SalMonthYear = padZero(monthParameter) + year;
            log.debug('SalMonthYear', SalMonthYear);

            monthLastDay = getArryMonthDays(month, year);
            processStrtDate = xml.escape({ xmlText: String(year) }) + "-" + padZero(monthParameter) + "-01";
            processEndDate = xml.escape({ xmlText: String(year) }) + "-" + padZero(monthParameter) + "-" + monthLastDay;

            payroll_Period = processStrtDate + ' - ' + processEndDate;

            let strVar1 = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
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
                '<x:pane><x:number>3</x:number></x:pane>' +
                '<x:pane><x:number>1</x:number></x:pane>' +
                '<x:pane><x:number>2</x:number></x:pane>' +
                '<x:pane><x:number>0</x:number></x:pane>' +
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
                '</xml><![endif]-->' +
                '<style>' +
                'p.MsoFooter, li.MsoFooter, div.MsoFooter' +
                '{ margin:0in; margin-bottom:.0001pt; mso-pagination:widow-orphan; tab-stops:center 3.0in right 6.0in; font-size:12.0pt;}' +
                'div.Section1{ page:Section1;}' +
                'table#hrdftrtbl{ margin:0in 0in 0in 900in; width:1px; height:1px; overflow:hidden; font-family:Arial; background-color:red;}' +
                '</style>' +
                '</head>' +
                '<body>' +
                '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">';

            const columns = [
                search.createColumn({ name: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                search.createColumn({ name: "custrecord_hris_pay_proc_employee_legal", summary: search.Summary.GROUP }),
                search.createColumn({ name: "custrecord_hris_pay_proc_employee_code", summary: search.Summary.GROUP }),
                search.createColumn({ name: "custrecord_hris_pay_proc_paid_days", summary: search.Summary.MAX }),
                search.createColumn({ name: "custrecord_hris_pay_proc_lop_days", summary: search.Summary.MAX }),
                search.createColumn({
                    name: "formulanumeric",
                    summary: search.Summary.SUM,
                    formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 1 then {custrecord_hris_pay_proc_value} else 0 end"
                }),
                search.createColumn({
                    name: "formulanumeric",
                    summary: search.Summary.SUM,
                    formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 50 then {custrecord_hris_pay_proc_value} else 0 end"
                }),
                search.createColumn({
                    name: "formulanumeric",
                    summary: search.Summary.SUM,
                    formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 99 then {custrecord_hris_pay_proc_value} else 0 end"
                }),
                search.createColumn({
                    name: "formulanumeric",
                    summary: search.Summary.SUM,
                    formula: "case when {custrecord_hris_pay_proc_payroll_compone.custrecord_hris__sequence_no_} = 100 then {custrecord_hris_pay_proc_value} else 0 end"
                }),
                search.createColumn({ name: "custentity_hris_emp_molpersonid", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                search.createColumn({ name: "custentity_hris_empbankroutingno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                search.createColumn({ name: "custentity_hris_emp_bankaccno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                search.createColumn({ name: "custentity_hris_empbankibanacctno", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP }),
                search.createColumn({ name: "firstname", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP, sort: search.Sort.ASC }),
                search.createColumn({ name: "lastname", join: "custrecord_hris_pay_proc_employee", summary: search.Summary.GROUP, sort: search.Sort.ASC })
            ];

            const filters = [
                search.createFilter({ name: 'custentity_hris_empvisaallocationmoltype', join: 'custrecord_hris_pay_proc_employee', operator: search.Operator.ANYOF, values: molParameter }),
                search.createFilter({ name: 'custrecord_hris_pay_proc_year', operator: search.Operator.ANYOF, values: yearParameter }),
                search.createFilter({ name: 'custrecord_hris_pay_proc_pay_month', operator: search.Operator.ANYOF, values: monthParameter }),
                search.createFilter({ name: 'custrecord_hris_pay_proc_value', operator: search.Operator.GREATERTHAN, values: "0" }),
                search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' })
            ];

            if (empPaygroup) {
                filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_pay_group', operator: search.Operator.ANYOF, values: empPaygroup }));
            }
            if (processType) {
                filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_process_type', operator: search.Operator.IS, values: processType }));
            }
            if (subsidiary) {
                filters.push(search.createFilter({ name: 'custrecord_hris_pay_proc_company_name', operator: search.Operator.ANYOF, values: subsidiary }));
            }

            const paySearch = search.create({
                type: 'customrecord_hris_pay_process',
                filters: filters,
                columns: columns
            });

            const o_searchResult = paySearch.run().getRange({ start: 0, end: 1000 });

            let Csv_Content = '';
            let total_net_pay = 0.00;
            if (o_searchResult) {
                for (let j = 0; j < o_searchResult.length; j++) {
                    Csv_Content += `${ValueOrNot(o_searchResult[j].getValue(columns[9]))},`;
                    Csv_Content += `${ValueOrNot(o_searchResult[j].getValue(columns[13]))},`;
                    Csv_Content += `${ValueOrNot(o_searchResult[j].getValue(columns[14]))},`;
                    Csv_Content += `${Number(o_searchResult[j].getValue(columns[3]))},`;
                    Csv_Content += `0,`;
                    Csv_Content += `${parseFloat(o_searchResult[j].getValue(columns[5]) || 0).toFixed(2)},`;
                    Csv_Content += `${(parseFloat(o_searchResult[j].getValue(columns[6]) || 0) - parseFloat(o_searchResult[j].getValue(columns[5]) || 0)).toFixed(2)},`;
                    Csv_Content += `${parseFloat(o_searchResult[j].getValue(columns[7]) || 0).toFixed(2)},`;
                    Csv_Content += `${parseFloat(o_searchResult[j].getValue(columns[8]) || 0).toFixed(2)}`;
                    Csv_Content += `\n`;
                }
            }

            const _date = new Date();
            const currentTime = new Date();
            const currentOffset = currentTime.getTimezoneOffset();
            const ISTOffset = 240; // Dubai offset UTC +4  
            const ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);

            const hoursIST = ISTTime.getHours();
            const minutesIST = ISTTime.getMinutes();
            const SecondsIST = ISTTime.getSeconds();

            const filename = String(mol_id) + String(ISTTime.getFullYear()) + String(padZero(parseInt(ISTTime.getMonth()) + 1)) + String(padZero(ISTTime.getDate())) + String(padZero(hoursIST)) + String(padZero(minutesIST)) + String(padZero(minutesIST)) + String(padZero(SecondsIST)) + ".csv";
            
            if (response) {
                response.writeFile({
                    file: file.create({
                        name: filename,
                        fileType: file.Type.CSV,
                        contents: Csv_Content
                    }),
                    isInline: true
                });
            }
        } catch (err) {
            log.error('ERROR MESSAGE:- ', err);
        }
    }

    // Get Subsidiary
    function getSubsidiaries(paygroup) {
        let subsidiary = '';
        if (paygroup != null) {
            const payGrouprec = record.load({
                type: 'customrecord_hris_process_groupmaster',
                id: paygroup
            });
            subsidiary = payGrouprec.getText('custrecord_hris_subsidiary_new');
            subsidiary = subsidiary.substring(subsidiary.indexOf(":") + 1, subsidiary.length);
        }
        return subsidiary;
    }

    // Get Month
    function getMonth(monthParameter) {
        const months = {
            1: 'January', 2: 'February', 3: 'March', 4: 'April',
            5: 'May', 6: 'June', 7: 'July', 8: 'August',
            9: 'September', 10: 'October', 11: 'November', 12: 'December'
        };
        return months[monthParameter] || '';
    }

    // Get Year
    function getYear(yearParameter) {
        let year = '';
        if (yearParameter != null) {
            const yearRec = record.load({
                type: 'customlist_hris_year_master',
                id: yearParameter
            });
            year = yearRec.getValue('name');
        }
        return year;
    }

    // Start - searchPGName
    function searchPGName(paygroup) {
        let PaygrpName;
        let currencyname;
        const Filters = [
            search.createFilter({ name: 'internalid', operator: search.Operator.IS, values: paygroup }),
            search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' })
        ];
        const Columns = [
            search.createColumn({ name: 'name' }),
            search.createColumn({ name: 'custrecord_hris__currency' })
        ];
        const searchEarnGrossCheck = search.create({
            type: 'customrecord_hris_process_groupmaster',
            filters: Filters,
            columns: Columns
        }).run().getRange({ start: 0, end: 1 });

        if (searchEarnGrossCheck != null && searchEarnGrossCheck.length > 0) {
            PaygrpName = searchEarnGrossCheck[0].getValue('name');
            currencyname = searchEarnGrossCheck[0].getText('custrecord_hris__currency');
        }
        return PaygrpName + "#" + currencyname;
    }

    function getArryMonthDays(month, year) {
        let standard_month_days;
        if (month === 'January' || month === 'March' || month === 'May' || month === 'July' || month === 'August' || month === 'October' || month === 'December') {
            standard_month_days = 31;
        }
        if (month === 'April' || month === 'June' || month === 'September' || month === 'November') {
            standard_month_days = 30;
        } else if (month === 'February') {
            const date = new Date();
            const currYear = year || date.getFullYear();
            if (currYear % 4 === 0) {
                standard_month_days = 29;
            } else {
                standard_month_days = 28;
            }
        }
        return standard_month_days;
    }

    function searchGratuityVal(empID) {
        let gratuity_amount = '0.00';
        const filter = [
            search.createFilter({ name: 'custrecord_hris_pay_proc_employee', operator: search.Operator.ANYOF, values: empID }),
            search.createFilter({ name: 'custrecord_hris_pay_proc_componet_sequen', operator: search.Operator.IS, values: '47' }),
            search.createFilter({ name: 'custrecord_hris_pay_proc_process_type', operator: search.Operator.ANYOF, values: '2' }),
            search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' })
        ];
        const column = [
            search.createColumn({ name: 'internalid' }),
            search.createColumn({ name: 'custrecord_hris_pay_proc_value' })
        ];

        const searchRes = search.create({
            type: 'customrecord_hris_pay_process',
            filters: filter,
            columns: column
        }).run().getRange({ start: 0, end: 1 });

        if (searchRes != null && searchRes.length > 0) {
            gratuity_amount = searchRes[0].getValue('custrecord_hris_pay_proc_value');
            log.debug('Gratuity Record EMPID', empID);
            log.debug('Gratuity Record', searchRes[0].getValue('internalid'));
        }

        return gratuity_amount;
    }

    function _logValidation(value) {
        if (value !== 'null' && value != null && value !== '' && value !== undefined && value !== 'undefined' && value !== 'NaN' && !isNaN(value)) {
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
        if ((value != null) && (value !== '') && (value !== undefined) && (value.toString() !== 'NaN')) {
            return true;
        } else {
            return false;
        }
    }

    function ValueOrNot(Value) {
        if (CheckValidOrNot(Value) && Value !== '- None -') {
            return Value;
        } else {
            return '';
        }
    }

    function RoundValue(val) {
        const val2 = val;
        val = val | 0;
        const diff = parseFloat(val2) - parseFloat(val);
        if (parseFloat(diff) < 0.5) {
            val = parseFloat(val);
        } else {
            val = parseFloat(val) + 1;
        }
        return val;
    }

    // END OBJECT CALLED/INVOKING FUNCTION =====================================================

    function searchEmpPayGroup(userSub) {
        log.debug('aa userSub', userSub);
        let empPayGrp = '-1';
        const filter = [
            search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' }),
            search.createFilter({ name: 'custrecord_hris_subsidiary_new', operator: search.Operator.IS, values: userSub })
        ];
        const column = [search.createColumn({ name: 'internalid' })];

        const searchRes = search.create({
            type: 'customrecord_hris_process_groupmaster',
            filters: filter,
            columns: column
        }).run().getRange({ start: 0, end: 1 });

        if (searchRes && searchRes.length > 0) {
            empPayGrp = searchRes[0].getValue('internalid');
            log.debug('aabb empPayGrp', empPayGrp);
        }

        return empPayGrp;
    }

    function GetZero(Value) {
        if (CheckValidOrNot(Value) && Value !== '- None -') {
            return Value;
        } else {
            return 0;
        }
    }

    return {
        onRequest: onRequest
    };

});