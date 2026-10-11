/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
  * @NModuleScope Public
 */
var error = "Salary JV is already created for selected Subsidiary and Process period."

define([
    'N/ui/serverWidget', 'N/log', 'N/search', 'N/runtime', 'N/query', 'N/file', 'N/encode', 'N/http', 'N/record','N/email'
], function (serverWidget, log, search, runtime, query, file, encode, http, record,email) {

    function onRequest(context) {
        var request = context.request;
        var response = context.response;

        if (request.method === 'GET') {
            var paygroupParameter = request.parameters['paygroup'];
            var departmentParameter = request.parameters['department'];
            log.debug('Salary JV', 'paygroupParameter=' + paygroupParameter);
            log.debug('Salary JV', 'departmentParameter=' + departmentParameter);

            var department_name = departmentParameter ? searchDeptName(departmentParameter) : '';
            log.debug('Salary JV', 'department_name=' + department_name);

            var emp = request.parameters['custpage_employee'];
            var empTxt = request.parameters['custpage_employee_txt'];
            var processType = request.parameters['customlist_hris_process_type_list'];

            var monthParameter = request.parameters['month'];
            var yearParameter = request.parameters['year'];
            var subsidiariesRes = request.parameters['subsidiary'];
            var i_mode = request.parameters['i_mode'];

            log.debug('Salary JV', 'emp= ' + emp);
            //log.debug('Salary JV', 'empType=' + empType);
            log.debug('Salary JV', 'monthParameter=' + monthParameter);
            log.debug('Salary JV', 'subsidiariesRes=' + subsidiariesRes);
            log.audit('suiteletFunction_salaryRegister', 'i_mode==' + i_mode);

            var subsidiaries = searchSubName(subsidiariesRes);
            var Currency = SearchCurrency();
            var month = getMonth(monthParameter);
            log.audit('yearParameter', yearParameter);
            var year = getYear(yearParameter);
            // var component = getcomponent(paygroupParameter);
            var days = getmonth_days(monthParameter);

            var today = monthParameter + '/' + days + '/' + year;
            log.debug('Salary JV', 'today=' + today);

            // var form = ui.createForm({ title: '' });
            var form = serverWidget.createForm({
                title: 'Salary JV'
            });

            var inlineField = form.addField({
                id: 'custpage_inlineid',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Inline HTML'
            });

            // form.clientScriptModulePath = 'SuiteScripts/customscript_hris_exportsalaryjv_cs';

            /*   form.addButton({
                  id: 'custpage_excelbtn',
                  label: 'Export As Excel',
                  functionName: 'callSuitelet(\'' + paygroupParameter + '\',\'' + processType + '\',\'' + subsidiariesRes + '\',\'' + yearParameter + '\',\'' + monthParameter + '\',\'' + emp + '\',\'' + empTxt + '\');'
              }); */

            var html = '<style type="text/css">';
            html += '.tbl tr:hover td { background-color: #B4B6B3 };';
            html += '</style>';
            html += '<table class="tbl" align="center" border="0" cellpadding="0" cellspacing="4" width="60%">';

            html += '<tr height="14" style="height:20.5pt">';
            html += '<td colspan="6" style="font-size: 12.0pt; font-weight: 700; font-family: Verdana; text-align: center;">';
            html += processType === '1' ?
                'Salary JV Report - Regular Process - ' + month + ' ' + year :
                'Salary JV Report - OT and Bonus - ' + month + ' ' + year;
            html += '</td></tr>';

            html += '<tr height="14"><td colspan="6" align="center" style="font-size: 12.0pt; font-weight: 700; font-family: Verdana;">' + subsidiaries + '</td></tr>';

            if (processType === '2') {
                html += '<tr height="14"><td colspan="6" align="left" style="font-family: Verdana; background-color: #E2E4E0;">';
                html += '<b>EMPLOYEE NAME - ' + empTxt.toUpperCase() + '</b></td></tr>';
            }

            html += '<tr style="height:25.5pt">';
            html += '<td style="background-color: #607799; font-size: 16px; color: white;">DR/CR</td>';
            html += '<td style="background-color: #607799; font-size: 16px; color: white;">Account Number</td>';
            html += '<td style="background-color: #607799; font-size: 16px; color: white;">Account Name</td>';
           // html += '<td style="background-color: #607799; font-size: 16px; color: white;">Department</td>';
            html += '<td style="background-color: #607799; font-size: 16px; color: white;">Sub Department</td>';

            html += '<td style="background-color: #607799; font-size: 16px; color: white;">Employee Category</td>';
            html += '<td style="background-color: #607799; font-size: 16px; color: white;">Debit amt</td>';
            html += '<td style="background-color: #607799; font-size: 16px; color: white;">Credit amt</td>';
            html += '</tr>';





            var today = new Date()//monthParameter + '/' + days + '/' + year;
            var today = new Date(monthParameter + '/' + days + '/' + year)
            log.debug('today', 'Year ==' + today);

            var Earn_total = '0.00';
            var deduction_total = 0.00;
            var net_pay = 0.00;
            var NP = 0.00;
            var accountCode_credit = new Array();
            var comp_accountCode;
            var Total_Deduct = 0.00;
            var Final_Dedu_Total = 0.00;
            var Earn_value = 0.00;
            var salAndWage = 0.00;
            var Deduct = 0.00;
            var Debit_total = 0.00;
            var deductionNet;
            var totaldebit = 0.00;
            var totalcredit = 0.00;
            /*    var sql = "Select XX.Subsidiary,XX.Account,XX.EmployeeCategory,XX.payDepartment,XX.subdepartment,XX.paymonth,XX.payyear,XX.Department,XX.shortname,XX.Subsidiarytext,XX.Accounttext,XX.EmployeeCategorytext,XX.payDepartmenttext,\
    XX.subdepartmenttext,XX.Departmenttext,Sum(XX.Debit) as debit ,Sum(XX.Credit) as credit from(\
     SELECT \
        A.custrecord_hris_pay_proc_company_name AS Subsidiary,\
        B.custrecord_hris_acctmap_glcode AS Account,\
        A.custrecord_hris_pay_proc_employeecategor AS EmployeeCategory,\
        A.custrecord_hris_pay_proc_department AS PayDepartment,\
        A.custrecord_hris_pay_proc_subdept AS SubDepartment,\
    A.custrecord_hris_pay_proc_pay_month as paymonth,\
    A.custrecord_hris_pay_proc_year as payyear,\
        C.id AS Department,A.custrecord_hris_pay_component_shrt_nme as shortname,\
        BUILTIN.DF(A.custrecord_hris_pay_proc_company_name) AS SubsidiaryText,\
        BUILTIN.DF(B.custrecord_hris_acctmap_glcode) AS AccountText,\
        BUILTIN.DF(A.custrecord_hris_pay_proc_employeecategor) AS EmployeeCategoryText,\
        BUILTIN.DF(A.custrecord_hris_pay_proc_department) AS PayDepartmentText,\
        BUILTIN.DF(A.custrecord_hris_pay_proc_subdept) AS SubDepartmentText,\
        BUILTIN.DF(C.id) AS DepartmentText,\
        CASE \
            WHEN A.custrecord_hris_pay_proc_component_type = '1' THEN A.custrecord_hris_pay_proc_value \
            ELSE NULL \
        END AS Debit,\
        CASE \
            WHEN A.custrecord_hris_pay_proc_component_type = '2' THEN A.custrecord_hris_pay_proc_value \
            ELSE NULL \
             END AS Credit \
    FROM customrecord_hris_pay_process A \
    LEFT OUTER JOIN customrecord_hris_accountmapping B \
        ON A.custrecord_hris_pay_proc_company_name = B.custrecord_hris_acctmap_subsidiary \
        AND A.custrecord_hris_pay_proc_pay_group = B.custrecord_hris_acctmap_paygroup \
        AND A.custrecord_hris_pay_proc_subdept = B.custrecord_hris_acctmap_subdepartment \
        AND A.custrecord_hris_pay_proc_employeecategor = B.custrecord_hris_acctmap_employeecategory \
        AND A.custrecord_hris_pay_proc_payroll_compone = B.custrecord_hris_acctmap_paycomponent \
        AND A.custrecord_hris_pay_proc_department = B.custrecord_hris_acctmap_department \
    LEFT OUTER JOIN department C \
        ON A.custrecord_hris_pay_proc_subdept = C.custrecord_hris_subdepartment \
    UNION ALL \
    SELECT \
        A.custrecord_hris_pay_proc_company_name AS Subsidiary, \
        B.custrecord_hris_acctmap_salarypayableacc AS Account, \
        A.custrecord_hris_pay_proc_employeecategor AS EmployeeCategory, \
        A.custrecord_hris_pay_proc_department AS PayDepartment, \
        A.custrecord_hris_pay_proc_subdept AS SubDepartment, \
    A.custrecord_hris_pay_proc_pay_month as paymonth, \
    A.custrecord_hris_pay_proc_year as payyear, \
      C.id AS Department,A.custrecord_hris_pay_component_shrt_nme as shortname, \
        BUILTIN.DF(A.custrecord_hris_pay_proc_company_name) AS SubsidiaryText, \
        BUILTIN.DF(B.custrecord_hris_acctmap_salarypayableacc) AS AccountText,\
        BUILTIN.DF(A.custrecord_hris_pay_proc_employeecategor) AS EmployeeCategoryText, \
        BUILTIN.DF(A.custrecord_hris_pay_proc_department) AS PayDepartmentText, \
        BUILTIN.DF(A.custrecord_hris_pay_proc_subdept) AS SubDepartmentText, \
        BUILTIN.DF(C.id) AS DepartmentText, \
        CASE  \
            WHEN A.custrecord_hris_pay_proc_component_type = '2' THEN A.custrecord_hris_pay_proc_value\
            ELSE NULL \
        END AS Debit, \
        CASE \
            WHEN A.custrecord_hris_pay_proc_component_type = '1' THEN A.custrecord_hris_pay_proc_value\
            ELSE NULL \
        END AS Credit \
    FROM customrecord_hris_pay_process A \
    LEFT OUTER JOIN customrecord_hris_accountmapping B \
        ON A.custrecord_hris_pay_proc_company_name = B.custrecord_hris_acctmap_subsidiary \
        AND A.custrecord_hris_pay_proc_pay_group = B.custrecord_hris_acctmap_paygroup \
        AND A.custrecord_hris_pay_proc_subdept = B.custrecord_hris_acctmap_subdepartment \
        AND A.custrecord_hris_pay_proc_employeecategor = B.custrecord_hris_acctmap_employeecategory \
        AND A.custrecord_hris_pay_proc_payroll_compone = B.custrecord_hris_acctmap_paycomponent \
        AND A.custrecord_hris_pay_proc_department = B.custrecord_hris_acctmap_department \
    LEFT OUTER JOIN department C \
        ON A.custrecord_hris_pay_proc_subdept = C.custrecord_hris_subdepartment) XX \
        where XX.Account IS NOT NULL and XX.paymonth="+monthParameter+" and xx.payyear ="+yearParameter+"  \
        Group by XX.Subsidiary,XX.Account,XX.EmployeeCategory,XX.payDepartment,XX.subdepartment,\
        XX.paymonth,XX.payyear,XX.Department,XX.shortname,XX.Subsidiarytext,XX.Accounttext,XX.EmployeeCategorytext,\
        XX.payDepartmenttext,XX.subdepartmenttext,XX.Departmenttext  ORDER BY \
        XX.Subsidiary,XX.subdepartment,XX.EmployeeCategory";*/


            /*   var sql = "Select XX.Subsidiary,XX.Account,XX.accountcode,XX.EmployeeCategory,XX.Department,XX.subdepartment,XX.paymonth,XX.payyear,XX.Subsidiarytext,XX.Accounttext,XX.EmployeeCategorytext,XX.Departmenttext,\
              XX.subdepartmenttext,Sum(XX.Debit) as debit ,Sum(XX.Credit) as credit from(\
               SELECT \
                  A.custrecord_hris_pay_proc_company_name AS Subsidiary,\
                  B.custrecord_hris_acctmap_glcode AS Account,B.custrecord_hris_acctmap_glacctcode as accountcode,\
                  A.custrecord_hris_pay_proc_employeecategor AS EmployeeCategory,\
                  A.custrecord_hris_pay_proc_department AS Department,\
                  A.custrecord_hris_pay_proc_subdept AS SubDepartment,\
              A.custrecord_hris_pay_proc_pay_month as paymonth,\
              A.custrecord_hris_pay_proc_year as payyear,\
                  BUILTIN.DF(A.custrecord_hris_pay_proc_company_name) AS SubsidiaryText,\
                  BUILTIN.DF(B.custrecord_hris_acctmap_glcode) AS AccountText,\
                  BUILTIN.DF(A.custrecord_hris_pay_proc_employeecategor) AS EmployeeCategoryText,\
                  BUILTIN.DF(A.custrecord_hris_pay_proc_department) AS DepartmentText,\
                  BUILTIN.DF(A.custrecord_hris_pay_proc_subdept) AS SubDepartmentText,\
                   CASE \
                      WHEN A.custrecord_hris_pay_proc_component_type = '1' THEN A.custrecord_hris_pay_proc_value \
                      ELSE NULL \
                  END AS Debit,\
                  CASE \
                      WHEN A.custrecord_hris_pay_proc_component_type = '2' THEN A.custrecord_hris_pay_proc_value \
                      ELSE NULL \
                       END AS Credit \
              FROM customrecord_hris_pay_process A \
              LEFT OUTER JOIN customrecord_hris_accountmapping B \
                  ON A.custrecord_hris_pay_proc_company_name = B.custrecord_hris_acctmap_subsidiary \
                  AND A.custrecord_hris_pay_proc_pay_group = B.custrecord_hris_acctmap_paygroup \
                  AND A.custrecord_hris_pay_proc_subdept = B.custrecord_hris_acctmap_subdepartment \
                  AND A.custrecord_hris_pay_proc_employeecategor = B.custrecord_hris_acctmap_employeecategory \
                  AND A.custrecord_hris_pay_proc_payroll_compone = B.custrecord_hris_acctmap_paycomponent \
                  AND A.custrecord_hris_pay_proc_department = B.custrecord_hris_acctmap_department \
              UNION ALL \
              SELECT \
                  A.custrecord_hris_pay_proc_company_name AS Subsidiary, \
                  B.custrecord_hris_acctmap_salarypayableacc AS Account,B.custrecord_hris_acctmap_salpayacctcode as accountcode, \
                  A.custrecord_hris_pay_proc_employeecategor AS EmployeeCategory, \
                  A.custrecord_hris_pay_proc_department AS Department, \
                  A.custrecord_hris_pay_proc_subdept AS SubDepartment, \
              A.custrecord_hris_pay_proc_pay_month as paymonth, \
              A.custrecord_hris_pay_proc_year as payyear, \
                      BUILTIN.DF(A.custrecord_hris_pay_proc_company_name) AS SubsidiaryText, \
                  BUILTIN.DF(B.custrecord_hris_acctmap_salarypayableacc) AS AccountText,\
                  BUILTIN.DF(A.custrecord_hris_pay_proc_employeecategor) AS EmployeeCategoryText, \
                  BUILTIN.DF(A.custrecord_hris_pay_proc_department) AS DepartmentText, \
                  BUILTIN.DF(A.custrecord_hris_pay_proc_subdept) AS SubDepartmentText, \
                  CASE  \
                      WHEN A.custrecord_hris_pay_proc_component_type = '2' THEN A.custrecord_hris_pay_proc_value\
                      ELSE NULL \
                  END AS Debit, \
                  CASE \
                      WHEN A.custrecord_hris_pay_proc_component_type = '1' THEN A.custrecord_hris_pay_proc_value\
                      ELSE NULL \
                  END AS Credit \
              FROM customrecord_hris_pay_process A \
              LEFT OUTER JOIN customrecord_hris_accountmapping B \
                  ON A.custrecord_hris_pay_proc_company_name = B.custrecord_hris_acctmap_subsidiary \
                  AND A.custrecord_hris_pay_proc_pay_group = B.custrecord_hris_acctmap_paygroup \
                  AND A.custrecord_hris_pay_proc_subdept = B.custrecord_hris_acctmap_subdepartment \
                  AND A.custrecord_hris_pay_proc_employeecategor = B.custrecord_hris_acctmap_employeecategory \
                  AND A.custrecord_hris_pay_proc_payroll_compone = B.custrecord_hris_acctmap_paycomponent \
                  AND A.custrecord_hris_pay_proc_department = B.custrecord_hris_acctmap_department \
             ) XX \
                  where XX.Account IS NOT NULL and XX.paymonth="+monthParameter+" and xx.payyear ="+yearParameter+"  \
                  Group by XX.Subsidiary,XX.Account,XX.accountcode,XX.EmployeeCategory,XX.Department,XX.subdepartment,\
                  XX.paymonth,XX.payyear,XX.Subsidiarytext,XX.Accounttext,XX.EmployeeCategorytext,\
                  XX.Departmenttext,XX.subdepartmenttext  ORDER BY \
                  XX.Subsidiary,XX.Department,XX.subdepartment,XX.EmployeeCategory"; */

            /*     var sql = 
        " SELECT XX.Subsidiary, XX.Account, XX.EmployeeCategory, XX.Department, XX.subdepartment, XX.paymonth, XX.payyear,  XX.Subsidiarytext, XX.Accounttext, XX.EmployeeCategorytext, XX.Departmenttext, XX.subdepartmenttext, SUM(XX.Debit) AS debit, SUM(XX.Credit) AS credit,XX.processtype  " + 
        " FROM (" + 
        " SELECT " + 
        " A.custrecord_hris_pay_proc_company_name AS Subsidiary, " + 
        " B.custrecord_hris_acctmap_glcode AS Account, " + 
        " A.custrecord_hris_pay_proc_employeecategor AS EmployeeCategory, " + 
        " A.custrecord_hris_pay_proc_department AS Department, " + 
        " A.custrecord_hris_pay_proc_subdept AS SubDepartment, " + 
        " A.custrecord_hris_pay_proc_pay_month AS paymonth, " + 
        " A.custrecord_hris_pay_proc_year AS payyear, " + 
        " BUILTIN.DF(A.custrecord_hris_pay_proc_company_name) AS SubsidiaryText, " + 
        " BUILTIN.DF(B.custrecord_hris_acctmap_glcode) AS AccountText, " + 
        " BUILTIN.DF(A.custrecord_hris_pay_proc_employeecategor) AS EmployeeCategoryText, " + 
        " BUILTIN.DF(A.custrecord_hris_pay_proc_department) AS DepartmentText, " + 
        " BUILTIN.DF(A.custrecord_hris_pay_proc_subdept) AS SubDepartmentText, " + 
        " CASE " + 
        "     WHEN A.custrecord_hris_pay_proc_component_type = '1' THEN A.custrecord_hris_pay_proc_value " + 
        "     ELSE NULL " + 
        " END AS Debit, " + 
        " CASE " + 
        "     WHEN A.custrecord_hris_pay_proc_component_type = '2' THEN A.custrecord_hris_pay_proc_value " + 
        "     ELSE NULL " + 
        " END AS Credit ,A.custrecord_hris_pay_proc_process_type as processtype" + 
        " FROM customrecord_hris_pay_process A " + 
        " LEFT OUTER JOIN customrecord_hris_accountmapping B " + 
        " ON A.custrecord_hris_pay_proc_company_name = B.custrecord_hris_acctmap_subsidiary " + 
        " AND A.custrecord_hris_pay_proc_pay_group = B.custrecord_hris_acctmap_paygroup " + 
        " AND A.custrecord_hris_pay_proc_subdept = B.custrecord_hris_acctmap_subdepartment " + 
        " AND A.custrecord_hris_pay_proc_employeecategor = B.custrecord_hris_acctmap_employeecategory " + 
        " AND A.custrecord_hris_pay_proc_payroll_compone = B.custrecord_hris_acctmap_paycomponent " + 
        " AND A.custrecord_hris_pay_proc_department = B.custrecord_hris_acctmap_department " + 
        " UNION ALL " + 
        " SELECT " + 
        " A.custrecord_hris_pay_proc_company_name AS Subsidiary, " + 
        " B.custrecord_hris_acctmap_salarypayableacc AS Account, " + 
        " A.custrecord_hris_pay_proc_employeecategor AS EmployeeCategory, " + 
        " A.custrecord_hris_pay_proc_department AS Department, " + 
        " A.custrecord_hris_pay_proc_subdept AS SubDepartment, " + 
        " A.custrecord_hris_pay_proc_pay_month AS paymonth, " + 
        " A.custrecord_hris_pay_proc_year AS payyear, " + 
        " BUILTIN.DF(A.custrecord_hris_pay_proc_company_name) AS SubsidiaryText, " + 
        " BUILTIN.DF(B.custrecord_hris_acctmap_salarypayableacc) AS AccountText, " + 
        " BUILTIN.DF(A.custrecord_hris_pay_proc_employeecategor) AS EmployeeCategoryText, " + 
        " BUILTIN.DF(A.custrecord_hris_pay_proc_department) AS DepartmentText, " + 
        " BUILTIN.DF(A.custrecord_hris_pay_proc_subdept) AS SubDepartmentText, " + 
        " CASE " + 
        "     WHEN A.custrecord_hris_pay_proc_component_type = '2' THEN A.custrecord_hris_pay_proc_value " + 
        "     ELSE NULL " + 
        " END AS Debit, " + 
        " CASE " + 
        "     WHEN A.custrecord_hris_pay_proc_component_type = '1' THEN A.custrecord_hris_pay_proc_value " + 
        "     ELSE NULL " + 
        " END AS Credit ,A.custrecord_hris_pay_proc_process_type as processtype " + 
        " FROM customrecord_hris_pay_process A " + 
        " LEFT OUTER JOIN customrecord_hris_accountmapping B " + 
        " ON A.custrecord_hris_pay_proc_company_name = B.custrecord_hris_acctmap_subsidiary " + 
        " AND A.custrecord_hris_pay_proc_pay_group = B.custrecord_hris_acctmap_paygroup " + 
        " AND A.custrecord_hris_pay_proc_subdept = B.custrecord_hris_acctmap_subdepartment " + 
        " AND A.custrecord_hris_pay_proc_employeecategor = B.custrecord_hris_acctmap_employeecategory " + 
        " AND A.custrecord_hris_pay_proc_payroll_compone = B.custrecord_hris_acctmap_paycomponent " + 
        " AND A.custrecord_hris_pay_proc_department = B.custrecord_hris_acctmap_department " + 
        ") XX "+
        " WHERE XX.Account IS NOT NULL AND  XX.paymonth ="+monthParameter+" and XX.payyear ="+yearParameter+" and XX.Subsidiary="+subsidiariesRes+ " and XX.processtype ="+processType+""+
        " GROUP BY XX.Subsidiary, XX.Account, XX.EmployeeCategory, XX.Department, XX.subdepartment, XX.paymonth, XX.payyear,  XX.Subsidiarytext, XX.Accounttext, XX.EmployeeCategorytext, XX.Departmenttext, XX.subdepartmenttext,XX.processtype   " + 
        " ORDER BY XX.Subsidiary, XX.Department, XX.subdepartment, XX.EmployeeCategory";
        
        
         */

//payment mode based the journal create below comment 13/02/2026
            /* var sql = "";
sql += "SELECT                                                                 \n";
sql += "    XX.Subsidiary,                                                     \n";
sql += "    XX.Account,                                                        \n";
sql += "    XX.EmployeeCategory,                                               \n";
sql += "    XX.paymonth,                                                       \n";
sql += "    XX.payyear,                                                        \n";
sql += "    XX.SubsidiaryText,                                                 \n";
sql += "    XX.AccountText,                                                    \n";
sql += "    XX.EmployeeCategoryText,                                           \n";
sql += "    XX.paygroup,                                                       \n";
sql += "    XX.paygroupText,                                                   \n";
sql += "    SUM(XX.Debit) AS debit,                                            \n";
sql += "    SUM(XX.Credit) AS credit,                                          \n";
sql += "    XX.processtype,                                                    \n";
sql += "    XX.accountnumber                                                   \n";
sql += "FROM (                                                                 \n";
sql += "   SELECT                                                              \n";
sql += "        A.custrecord_hris_pay_proc_company_name AS Subsidiary,        \n";
sql += "        B.custrecord_hris_acctmap_glcode AS Account,                   \n";
sql += "        E.custentity_hris_empcategory AS EmployeeCategory,            \n";
sql += "        A.custrecord_hris_pay_proc_pay_month AS paymonth,             \n";
sql += "        A.custrecord_hris_pay_proc_year AS payyear,                    \n";
sql += "        BUILTIN.DF(A.custrecord_hris_pay_proc_company_name) AS SubsidiaryText, \n";
sql += "        BUILTIN.DF(B.custrecord_hris_acctmap_glcode) AS AccountText,   \n";
sql += "        BUILTIN.DF(E.custentity_hris_empcategory) AS EmployeeCategoryText, \n";
sql += "        A.custrecord_hris_pay_proc_pay_group AS paygroup,              \n";
sql += "        BUILTIN.DF(A.custrecord_hris_pay_proc_pay_group) AS paygroupText, \n";
sql += "        CASE WHEN A.custrecord_hris_pay_proc_component_type = '1'      \n";
sql += "             THEN A.custrecord_hris_pay_proc_value ELSE NULL END AS Debit, \n";
sql += "        CASE WHEN A.custrecord_hris_pay_proc_component_type = '2'      \n";
sql += "             THEN A.custrecord_hris_pay_proc_value ELSE NULL END AS Credit, \n";
sql += "        A.custrecord_hris_pay_proc_process_type AS processtype,       \n";
sql += "        B.custrecord_hris_acctmap_glacctcode AS accountnumber         \n";
sql += "    FROM customrecord_hris_pay_process A                               \n";
sql += "    INNER JOIN employee E                                              \n";
sql += "        ON A.custrecord_hris_pay_proc_employee = E.id                  \n";
sql += "    LEFT OUTER JOIN customrecord_hris_accountmapping B                 \n";
sql += "        ON A.custrecord_hris_pay_proc_company_name = B.custrecord_hris_acctmap_subsidiary \n";
sql += "       AND A.custrecord_hris_pay_proc_pay_group = B.custrecord_hris_acctmap_paygroup \n";
sql += "       AND E.custentity_hris_empcategory = B.custrecord_hris_acctmap_employeecategory \n";
sql += "       AND A.custrecord_hris_pay_proc_payroll_compone = B.custrecord_hris_acctmap_paycomponent \n";
sql += "union all                                                              \n";
sql += "SELECT                                                                 \n";
sql += "        A.custrecord_hris_pay_proc_company_name AS Subsidiary,         \n";
sql += "        B.custrecord_hris_acctmap_salarypayableacc AS Account,                   \n";
sql += "        E.custentity_hris_empcategory AS EmployeeCategory,            \n";
sql += "        A.custrecord_hris_pay_proc_pay_month AS paymonth,              \n";
sql += "        A.custrecord_hris_pay_proc_year AS payyear,                    \n";
sql += "        BUILTIN.DF(A.custrecord_hris_pay_proc_company_name) AS SubsidiaryText, \n";
sql += "        BUILTIN.DF(B.custrecord_hris_acctmap_salarypayableacc) AS AccountText,   \n";
sql += "        BUILTIN.DF(E.custentity_hris_empcategory) AS EmployeeCategoryText, \n";
sql += "        A.custrecord_hris_pay_proc_pay_group AS paygroup,              \n";
sql += "        BUILTIN.DF(A.custrecord_hris_pay_proc_pay_group) AS paygroupText, \n";
sql += "        CASE WHEN A.custrecord_hris_pay_proc_component_type = '2'      \n";
sql += "             THEN A.custrecord_hris_pay_proc_value ELSE NULL END AS Debit, \n";
sql += "        CASE WHEN A.custrecord_hris_pay_proc_component_type = '1'      \n";
sql += "             THEN A.custrecord_hris_pay_proc_value ELSE NULL END AS Credit, \n";
sql += "        A.custrecord_hris_pay_proc_process_type AS processtype,       \n";
sql += "        B.custrecord_hris_acctmap_salpayacctcode AS accountnumber         \n";
sql += "    FROM customrecord_hris_pay_process A                               \n";
sql += "    INNER JOIN employee E                                              \n";
sql += "        ON A.custrecord_hris_pay_proc_employee = E.id                  \n";
sql += "    LEFT OUTER JOIN customrecord_hris_accountmapping B                 \n";
sql += "        ON A.custrecord_hris_pay_proc_company_name = B.custrecord_hris_acctmap_subsidiary \n";
sql += "       AND A.custrecord_hris_pay_proc_pay_group = B.custrecord_hris_acctmap_paygroup \n";
sql += "       AND E.custentity_hris_empcategory = B.custrecord_hris_acctmap_employeecategory \n";
sql += "       AND A.custrecord_hris_pay_proc_payroll_compone = B.custrecord_hris_acctmap_paycomponent \n";
sql += ") XX                                                                   \n";
sql += "WHERE                                                                  \n";
sql += "    XX.Account IS NOT NULL                                             \n";
sql += "    AND XX.paymonth = " + monthParameter + "                           \n";
sql += "    AND XX.payyear = " + yearParameter + "                             \n";
sql += "    AND XX.Subsidiary = " + subsidiariesRes + "                        \n";
sql += "    AND XX.processtype = " + processType + "                           \n";
sql += "    AND XX.paygroup = " + paygroupParameter + "                        \n";
sql += "GROUP BY                                                               \n";
sql += "    XX.Subsidiary,                                                     \n";
sql += "    XX.Account,                                                        \n";
sql += "    XX.EmployeeCategory,                                               \n";
sql += "    XX.paymonth,                                                       \n";
sql += "    XX.payyear,                                                        \n";
sql += "    XX.SubsidiaryText,                                                 \n";
sql += "    XX.AccountText,                                                    \n";
sql += "    XX.EmployeeCategoryText,                                           \n";
sql += "    XX.paygroup,                                                       \n";
sql += "    XX.paygroupText,                                                   \n";
sql += "    XX.processtype,                                                    \n";
sql += "    XX.accountnumber                                                   \n";
sql += "ORDER BY                                                               \n";
sql += "    XX.Subsidiary,                                                     \n";
sql += "    XX.EmployeeCategory,                                               \n";
sql += "    XX.paygroup;                                                       \n"; */
           var sql = "SELECT                                                                 \n";
      sql += "    XX.Subsidiary,                                                     \n";
      sql += "    XX.Account,                                                        \n";
      sql += "    XX.EmployeeCategory,                                               \n";
      sql += "    XX.paymonth,                                                       \n";
      sql += "    XX.payyear,                                                        \n";
      sql += "    XX.SubsidiaryText,                                                 \n";
      sql += "    XX.AccountText,                                                    \n";
      sql += "    XX.EmployeeCategoryText,                                           \n";
      sql += "    XX.paygroup,                                                       \n";
      sql += "    XX.paygroupText,                                                   \n";
      sql += "    XX.PaymentModeText,                                                \n";
      sql += "    SUM(XX.Debit) AS debit,                                            \n";
      sql += "    SUM(XX.Credit) AS credit,                                          \n";
      sql += "    XX.processtype,                                                    \n";
      sql += "    XX.accountnumber                                                   \n";
      sql += "FROM (                                                                 \n";
      sql += "   SELECT                                                              \n";
      sql += "        A.custrecord_hris_pay_proc_company_name AS Subsidiary,        \n";
      sql += "        B.custrecord_hris_acctmap_glcode AS Account,                   \n";
      sql += "        E.custentity_hris_empcategory AS EmployeeCategory,            \n";
      sql += "        A.custrecord_hris_pay_proc_pay_month AS paymonth,             \n";
      sql += "        A.custrecord_hris_pay_proc_year AS payyear,                    \n";
      sql += "        BUILTIN.DF(A.custrecord_hris_pay_proc_company_name) AS SubsidiaryText, \n";
      sql += "        BUILTIN.DF(B.custrecord_hris_acctmap_glcode) AS AccountText,   \n";
      sql += "        BUILTIN.DF(E.custentity_hris_empcategory) AS EmployeeCategoryText, \n";
      sql += "        A.custrecord_hris_pay_proc_pay_group AS paygroup,              \n";
      sql += "        BUILTIN.DF(A.custrecord_hris_pay_proc_pay_group) AS paygroupText, \n";
      sql += "        CASE WHEN B.custrecord_hris_acctmap_glcode = 506              \n";
      sql += "             THEN BUILTIN.DF(E.custentity_hris_employeepaymentmode) ELSE '' END AS PaymentModeText, \n";
      sql += "        CASE WHEN A.custrecord_hris_pay_proc_component_type = '1'      \n";
      sql += "             THEN A.custrecord_hris_pay_proc_value ELSE NULL END AS Debit, \n";
      sql += "        CASE WHEN A.custrecord_hris_pay_proc_component_type = '2'      \n";
      sql += "             THEN A.custrecord_hris_pay_proc_value ELSE NULL END AS Credit, \n";
      sql += "        A.custrecord_hris_pay_proc_process_type AS processtype,       \n";
      sql += "        B.custrecord_hris_acctmap_glacctcode AS accountnumber         \n";
      sql += "    FROM customrecord_hris_pay_process A                               \n";
      sql += "    INNER JOIN employee E                                              \n";
      sql += "        ON A.custrecord_hris_pay_proc_employee = E.id                  \n";
      sql += "    LEFT OUTER JOIN customrecord_hris_accountmapping B                 \n";
      sql += "        ON A.custrecord_hris_pay_proc_company_name = B.custrecord_hris_acctmap_subsidiary \n";
      sql += "       AND A.custrecord_hris_pay_proc_pay_group = B.custrecord_hris_acctmap_paygroup \n";
      sql += "       AND E.custentity_hris_empcategory = B.custrecord_hris_acctmap_employeecategory \n";
      sql += "       AND A.custrecord_hris_pay_proc_payroll_compone = B.custrecord_hris_acctmap_paycomponent \n";
      sql += "union all                                                              \n";
      sql += "SELECT                                                                 \n";
      sql += "        A.custrecord_hris_pay_proc_company_name AS Subsidiary,         \n";
      sql += "        B.custrecord_hris_acctmap_salarypayableacc AS Account,                   \n";
      sql += "        E.custentity_hris_empcategory AS EmployeeCategory,            \n";
      sql += "        A.custrecord_hris_pay_proc_pay_month AS paymonth,              \n";
      sql += "        A.custrecord_hris_pay_proc_year AS payyear,                    \n";
      sql += "        BUILTIN.DF(A.custrecord_hris_pay_proc_company_name) AS SubsidiaryText, \n";
      sql += "        BUILTIN.DF(B.custrecord_hris_acctmap_salarypayableacc) AS AccountText,   \n";
      sql += "        BUILTIN.DF(E.custentity_hris_empcategory) AS EmployeeCategoryText, \n";
      sql += "        A.custrecord_hris_pay_proc_pay_group AS paygroup,              \n";
      sql += "        BUILTIN.DF(A.custrecord_hris_pay_proc_pay_group) AS paygroupText, \n";
      sql += "        CASE WHEN B.custrecord_hris_acctmap_salarypayableacc = 506    \n";
      sql += "             THEN BUILTIN.DF(E.custentity_hris_employeepaymentmode) ELSE '' END AS PaymentModeText, \n";
      sql += "        CASE WHEN A.custrecord_hris_pay_proc_component_type = '2'      \n";
      sql += "             THEN A.custrecord_hris_pay_proc_value ELSE NULL END AS Debit, \n";
      sql += "        CASE WHEN A.custrecord_hris_pay_proc_component_type = '1'      \n";
      sql += "             THEN A.custrecord_hris_pay_proc_value ELSE NULL END AS Credit, \n";
      sql += "        A.custrecord_hris_pay_proc_process_type AS processtype,       \n";
      sql += "        B.custrecord_hris_acctmap_salpayacctcode AS accountnumber         \n";
      sql += "    FROM customrecord_hris_pay_process A                               \n";
      sql += "    INNER JOIN employee E                                              \n";
      sql += "        ON A.custrecord_hris_pay_proc_employee = E.id                  \n";
      sql += "    LEFT OUTER JOIN customrecord_hris_accountmapping B                 \n";
      sql += "        ON A.custrecord_hris_pay_proc_company_name = B.custrecord_hris_acctmap_subsidiary \n";
      sql += "       AND A.custrecord_hris_pay_proc_pay_group = B.custrecord_hris_acctmap_paygroup \n";
      sql += "       AND E.custentity_hris_empcategory = B.custrecord_hris_acctmap_employeecategory \n";
      sql += "       AND A.custrecord_hris_pay_proc_payroll_compone = B.custrecord_hris_acctmap_paycomponent \n";
      sql += ") XX                                                                   \n";
      sql += "WHERE                                                                  \n";
      sql += "    XX.Account IS NOT NULL                                             \n";
      sql += "    AND XX.paymonth = " + monthParameter + "                           \n";
      sql += "    AND XX.payyear = " + yearParameter + "                             \n";
      sql += "    AND XX.Subsidiary = " + subsidiariesRes + "                        \n";
      sql += "    AND XX.processtype = " + processType + "                           \n";
      sql += "    AND XX.paygroup = " + paygroupParameter + "                        \n";
      sql += "GROUP BY                                                               \n";
      sql += "    XX.Subsidiary,                                                     \n";
      sql += "    XX.Account,                                                        \n";
      sql += "    XX.EmployeeCategory,                                               \n";
      sql += "    XX.paymonth,                                                       \n";
      sql += "    XX.payyear,                                                        \n";
      sql += "    XX.SubsidiaryText,                                                 \n";
      sql += "    XX.AccountText,                                                    \n";
      sql += "    XX.EmployeeCategoryText,                                           \n";
      sql += "    XX.paygroup,                                                       \n";
      sql += "    XX.paygroupText,                                                   \n";
      sql += "    XX.PaymentModeText,                                                \n";
      sql += "    XX.processtype,                                                    \n";
      sql += "    XX.accountnumber                                                   \n";
      sql += "ORDER BY                                                               \n";
      sql += "    XX.Subsidiary,                                                     \n";
      sql += "    XX.EmployeeCategory,                                               \n";
      sql += "    XX.paygroup,                                                       \n";
      sql += "    XX.Account,                                                        \n";
      sql += "    XX.PaymentModeText;                                                \n";

      log.debug("sql", sql);

            //log.debug('sql', sql)
             var senderid = -5;

                 
                    var Sendemail = email.send({
                        author: senderid,
                        recipients: 'vishal@nijatech.com',
                        subject: 'JV creation Query',
                        body: JSON.stringify(sql),
                        isInternalOnly: true
                    });

            var resultSet = query.runSuiteQL({ query: sql }).asMappedResults();
            if (resultSet.length > 0) {

                var journalquery = "SELECT je.id FROM transaction je JOIN transactionline jt ON je.id = jt.transaction WHERE je.type = 'Journal' \
                AND je.custbody_hris_paygroup_jv = "+ paygroupParameter + " \
      AND jt.subsidiary = "+ subsidiariesRes + " AND je.custbody_hris_jv_month = " + monthParameter + " \
      AND je.custbody_hris_jv_year ="+ yearParameter + " AND je.custbody_hris_passjv_processtype = " + processType + "";

                log.debug('journalquerysql', journalquery)
                var journalqueryresult = query.runSuiteQL({ query: journalquery }).asMappedResults();
                if (journalqueryresult.length == 0) {
                    var jvObject = record.create({
                        type: record.Type.JOURNAL_ENTRY,
                        isDynamic: true
                    });

                    jvObject.setValue({ fieldId: 'customform', value: 143 });
                    jvObject.setValue({ fieldId: 'approvalstatus', value: 1 });
                    jvObject.setValue({ fieldId: 'subsidiary', value: subsidiariesRes });
                    jvObject.setValue({ fieldId: 'trandate', value: today });

                    // Set posting period using Text if necessary (optional and context-dependent)
                    jvObject.setText({ fieldId: 'postingperiod', text: month + ' ' + year });

                    jvObject.setValue({
                        fieldId: 'memo',
                        value: 'Salaries and Allowances for ' + month + ' ' + year
                    });

                    jvObject.setValue({
                        fieldId: 'custbody_hris_paygroup_jv',
                        value: paygroupParameter
                    });

                    jvObject.setValue({
                        fieldId: 'custbody_hris_jv_month',
                        value: monthParameter
                    });

                    jvObject.setValue({
                        fieldId: 'custbody_hris_jv_year',
                        value: yearParameter
                    });

                    jvObject.setValue({
                        fieldId: 'custbody_hris_passjv_processtype',
                        value: processType
                    });

                   /*  if (processType === '2') {
                        jvObject.setValue({
                            fieldId: 'custbody_hris_jv_employeename',
                            value: emp
                        });
                        jvObject.setValue({
                            fieldId: 'custbody_hris_jv_emplegalname',
                            value: empTxt
                        });
                    } */
var check=0;
                    for (var i = 0; i < resultSet.length; i++) {
                        var debitamt = '0.0';
                        var creditamt = '0.0';
                        var compo_name = '';
                        //var Acc_Code_Number = resultSet[i].accountcode||'';

                        var Acc_Code_Number = resultSet[i].accountnumber || '';
                        // log.emergency('Acc_Code_Number',Acc_Code_Number)
                        var accountid = resultSet[i].account;
                        log.emergency(' accountid', accountid)
                        log.emergency('Line number', i);
                        var Account_Code = resultSet[i].accounttext;
                        var department = resultSet[i].department;
                        var departmenttext = resultSet[i].departmenttext;
                        var empcategory = resultSet[i].employeecategory;
                       // log.emergency('empcategory',empcategory)
                        var empcategorytext = resultSet[i].employeecategorytext;
                        var subdepartmenttext = resultSet[i].subdepartmenttext;
                        var subdepartment=resultSet[i].subdepartment;
                      var paymentMode = resultSet[i].paymentmodetext || ''; 
                       var lineMemo = paymentMode ? paymentMode : "";
                      
                       // log.emergency('subdepartment',subdepartment);
                       //  log.audit('Departmenttext: ' + departmenttext + ', Subdepartmenttext: ' + subdepartmenttext);
                     //  log.audit('Department: ' + department + ', Subdepartment: ' + subdepartment);

                        compo_name = resultSet[i].shortname;
                        debitamt = resultSet[i].debit || 0;
                        creditamt = resultSet[i].credit || 0;
                      
                        // log.emergency('debitamt', debitamt);
                       // log.emergency('creditamt', creditamt);
                       
                        totaldebit = parseFloat(totaldebit) + parseFloat(debitamt);
                        totalcredit = parseFloat(totalcredit) + parseFloat(creditamt);
                       /*  log.audit('totaldebit',totaldebit);
                        log.audit('totalcredit',totalcredit);
                        */  if (debitamt != 0) {
                            var acctxt = 'DR'
                             jvObject.selectNewLine({ sublistId: 'line' });
                            check=check+1;

                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'account',
                            value: accountid
                        });

                         /* jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'cseg_hris_empdept',
                            value: department,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        }); */
                           /* jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'custcol_hris_jv_employeecategory',
                            value: empcategory
                        }); */
                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'debit',
                            value: parseFloat(debitamt).toFixed(2)
                        });

                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'credit',
                            value: 0.0
                        });
                       //log.audit('Inner subdepartment',subdepartment);
                        /*  jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'cseg_hris_empsubdpt',
                            value:subdepartment,
                           // ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        }); */
                       /*  jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'custcol_hris_jv_subdepartment',
                            value:subdepartment,
                            //ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        }); */
                      
                        //jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'cseg_hris_empdept', value: department });
                        // Optional fields like class, department, location
                        // jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: business_area });

                        if (processType === '2') {
                            jvObject.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'entity',
                                value: emp
                            });
                            jvObject.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: empTxt
                            });
                        } else {
                            jvObject.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: lineMemo 
                            });
                        }

                        //jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'cseg_hris_empdept', value: department });
                        // jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: 4 });

                        // Commit the line
                        jvObject.commitLine({ sublistId: 'line' });


                        }
                        if(creditamt!=0) {
                            var acctxt = 'CR'
                             jvObject.selectNewLine({ sublistId: 'line' });
                              check=check+1;

                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'account',
                            value: accountid
                        });

                        /*  jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'cseg_hris_empdept',
                            value: department,
                           // ignoreFieldChange:false,
                           // forceSyncSourcing:true,
                           
                        }); */
                          /*  jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'custcol_hris_jv_employeecategory',
                            value: empcategory
                        }); */
                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'debit',
                            value: 0.0
                        });

                        jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'credit',
                            value: parseFloat(creditamt).toFixed(2)
                        });
                        //log.audit('Inner subdepartment',subdepartment);
                         /* jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'cseg_hris_empsubdpt',
                            value:subdepartment,
                           // ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        }); */
                        /* jvObject.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId:'custcol_hris_jv_subdepartment',
                            value:subdepartment,
                            //ignoreFieldChange: true,
                           // forceSyncSourcing:true,
                            
                        }); */
                      
                        //jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'cseg_hris_empdept', value: department });
                        // Optional fields like class, department, location
                        // jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: business_area });

                         if (processType === '2') {
                            jvObject.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'entity',
                                value: emp
                            });
                            jvObject.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: empTxt
                            });
                        } else {
                            jvObject.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: lineMemo
                            });
                        }

                       // jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'cseg_hris_empdept', value: department });
                        // jvObject.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: 4 });

                        // Commit the line
                        jvObject.commitLine({ sublistId: 'line' });


                        }
                       
                        html += '<tr height="14" style="height:20.5pt;background-color: #E2E4E0;">';
          html += '  <td height="14" style="font-family: Verdana, sans-serif;" align="center">' + acctxt + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="center">' + Acc_Code_Number + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="center">' + Account_Code + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="center">' + empcategorytext + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="center">' + paymentMode + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="right">' + numberWithCommas(debitamt) + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="right">' + numberWithCommas(creditamt) + '</td>';
          html += '</tr>'; 


                    }
                    log.audit('Total Debit', totaldebit);
                    log.audit('Total Credit', totalcredit);
                    if (parseFloat(totaldebit).toFixed(2) != parseFloat(totalcredit).toFixed(2)) {
                        throw 'Debit Amount and  Credit Amount should be same'
                    }
                    var jvid = jvObject.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });

                    log.debug("JV Creation ID", jvid);

                     html += '<tr height="14" style="height:10.5pt;background-color: #B4B6B3;">';
        html += '  <td height="14">&nbsp;</td>';
        html += '  <td>&nbsp;</td>';
        html += '  <td>&nbsp;</td>';
        html += '  <td>&nbsp;</td>';
        html += '  <td>&nbsp;</td>';
        html += '  <td align="right"><b>' + numberWithCommas(totaldebit.toFixed(2)) + '</b></td>';
        html += '  <td align="right"><b>' + numberWithCommas(totalcredit.toFixed(2)) + '</b></td>';
        html += '</tr>';
        html += '</table>'; 
                }
                else {
                    throw error;
                }
                inlineField.defaultValue = html;
            }
            else {
                response.write('<b>' + 'Data Not Found.Please check the parameters again' + '</b>');
            }

            context.response.writePage(form);
        }
    }




    function getMonth(monthParameter) {
        if (monthParameter == 1) {
            return 'Jan'
        }
        else if (monthParameter == 2) {
            return 'Feb'
        }
        else if (monthParameter == 3) {
            return 'Mar'
        }
        else if (monthParameter == 4) {
            return 'Apr'
        }
        else if (monthParameter == 5) {
            return 'May'
        }
        else if (monthParameter == 6) {
            return 'Jun'
        }
        else if (monthParameter == 7) {
            return 'Jul'
        }
        else if (monthParameter == 8) {
            return 'Aug'
        }
        else if (monthParameter == 9) {
            return 'Sep'
        }
        else if (monthParameter == 10) {
            return 'Oct'
        }
        else if (monthParameter == 11) {
            return 'Nov'
        }
        else if (monthParameter == 12) {
            return 'Dec'
        }
    }//End function getMonth()

    function SearchCurrency() {
        var currSymbol = null;

        var currencySearch = search.create({
            type: search.Type.CURRENCY,
            filters: [['isinactive', 'is', 'F']],
            columns: ['internalid']
        });

        var searchResults = currencySearch.run().getRange({ start: 0, end: 1000 });

        for (var i = 0; i < searchResults.length; i++) {
            var currencyId = searchResults[i].getValue({ name: 'internalid' });
            var currencyRecord = record.load({
                type: record.Type.CURRENCY,
                id: currencyId
            });

            var isBase = currencyRecord.getValue({ fieldId: 'isbasecurrency' });

            if (isBase === true) {
                currSymbol = currencyRecord.getValue({ fieldId: 'symbol' });
                break;
            }
        }

        return currSymbol;
    }


    function searchSubName(subsidiariesRes) {
        var subsidiary;

        var subSearch = search.create({
            type: search.Type.SUBSIDIARY,
            filters: [
                ['isinactive', 'is', 'F'],
                'and',
                ['internalid', 'is', subsidiariesRes]
            ],
            columns: ['name']
        });

        var results = subSearch.run().getRange({ start: 0, end: 1 });

        if (results.length > 0) {
            var fullName = results[0].getValue({ name: 'name' });

            // Split by ":" and take the last portion
            var parts = fullName.split(':');
            log.debug('subsidiary name parts', parts);

            subsidiary = parts[parts.length - 1].trim();
            log.debug('final subsidiary name', subsidiary);
        }

        return subsidiary;
    }
function numberWithCommas(x) {
    if (x === null || x === undefined || x === '') return '';
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

    function getmonth_days(wage_month) {
        var standard_month_days;
        if (wage_month == 'January' || wage_month == 'March' || wage_month == 'May' || wage_month == 'July' || wage_month == 'August' || wage_month == 'October' || wage_month == 'December' || wage_month == '1' || wage_month == '3' || wage_month == '5' || wage_month == '7' || wage_month == '8' || wage_month == '10' || wage_month == '12') {
            standard_month_days = 31
        }//End if for odd month
        if (wage_month == 'April' || wage_month == 'June' || wage_month == 'September' || wage_month == 'November' || wage_month == '4' || wage_month == '6' || wage_month == '9' || wage_month == '11') {
            standard_month_days = 30
        }//End if for even month
        else
            if (wage_month == 'February' || wage_month == '2') {
                var date = new Date()
                var year = date.getFullYear();
                if (year % 4 == 0) {
                    standard_month_days = 29
                }
                else {
                    standard_month_days = 28
                }
            }//End else if for feb month
        return standard_month_days
    }//End function getmonth_days()
    //Get Year
    function getYear(yearParameter) {
        var year = '';

        if (yearParameter != null) {
            //var yearRec=record.load('customlist_hris_year_master',yearParameter)
            var yearRec = record.load({
                type: 'customlist_hris_year_master',
                id: yearParameter,
                isDynamic: true,
            });
            year = yearRec.getValue('name')

        }//End if(yearParameter!=null)
        return year
    }//End function getYear()


    return {
        onRequest: onRequest
    };
});
