/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define([
  "N/ui/serverWidget",
  "N/log",
  "N/search",
  "N/runtime",
  "N/query",
  "N/file",
  "N/encode",
  "N/http",
  "N/record",
  "N/email"
], function (
  serverWidget,
  log,
  search,
  runtime,
  query,
  file,
  encode,
  http,
  record,
  email
) {
  function onRequest(context) {
    var request = context.request;
    var response = context.response;

    if (request.method === "GET") {
      var paygroupParameter = request.parameters["paygroup"];
      var departmentParameter = request.parameters["department"];
      log.debug("Salary JV", "paygroupParameter=" + paygroupParameter);
      log.debug("Salary JV", "departmentParameter=" + departmentParameter);

      var department_name = departmentParameter
        ? searchDeptName(departmentParameter)
        : "";
      log.debug("Salary JV", "department_name=" + department_name);

      var emp = request.parameters["custpage_employee"];
      var empTxt = request.parameters["custpage_employee_txt"];
      var processType = request.parameters["customlist_hris_process_type_list"];

      var monthParameter = request.parameters["month"];
      var yearParameter = request.parameters["year"];
      var subsidiariesRes = request.parameters["subsidiary"];
      var i_mode = request.parameters["i_mode"];

      log.debug("Salary JV", "emp= " + emp);
      log.debug("Salary JV", "monthParameter=" + monthParameter);
      log.debug("Salary JV", "subsidiariesRes=" + subsidiariesRes);
      log.audit("suiteletFunction_salaryRegister", "i_mode==" + i_mode);

      var subsidiaries = searchSubName(subsidiariesRes);
      var Currency = SearchCurrency();
      var month = getMonth(monthParameter);
      log.audit("yearParameter", yearParameter);
      var year = getYear(yearParameter);
      var days = getmonth_days(monthParameter);

      var today = monthParameter + "/" + days + "/" + year;
      log.debug("Salary JV", "today=" + today);

      var form = serverWidget.createForm({
        title: "Salary",
      });

      var inlineField = form.addField({
        id: "custpage_inlineid",
        type: serverWidget.FieldType.INLINEHTML,
        label: "Inline HTML",
      });

      form.addButton({
        id: "custpage_excelbtn",
        label: "Export As Excel",
        functionName:
          "callSuitelet('" +
          paygroupParameter +
          "','" +
          processType +
          "','" +
          subsidiariesRes +
          "','" +
          yearParameter +
          "','" +
          monthParameter +
          "','" +
          emp +
          "','" +
          empTxt +
          "');",
      });

      var html = '<style type="text/css">';
      html += ".tbl tr:hover td { background-color: #B4B6B3 };";
      html += "</style>";
      html = '<table id="resultsTable" class="display" style="width:100%; margin-top:20px;">';

      html += '<tr height="14" style="height:20.5pt">';
      html +=
        '<td colspan="7" style="font-size: 12.0pt; font-weight: 700; font-family: Verdana; text-align: center;">';
      html +=
        processType === "1"
          ? "Salary JV Report - Regular Process - " + month + " " + year
          : "Salary JV Report - OT and Bonus - " + month + " " + year;

      html += "</td></tr>";

      html +=
        '<tr height="14"><td colspan="7" align="center" style="font-size: 12.0pt; font-weight: 700; font-family: Verdana;">' +
        subsidiaries +
        "</td></tr>";

      if (processType === "2") {
        html +=
          '<tr height="14"><td colspan="7" align="left" style="font-family: Verdana; background-color: #E2E4E0;">';
        html += "<b>EMPLOYEE NAME - " + empTxt.toUpperCase() + "</b></td></tr>";
      }

      html += '<tr style="height:25.5pt">';
      html +=
        '<td style="background-color: #607799; font-size: 16px; color: white;">DR/CR</td>';
      html +=
        '<td style="background-color: #607799; font-size: 16px; color: white;">Account Number</td>';
      html +=
        '<td style="background-color: #607799; font-size: 16px; color: white;">Account Name</td>';
      html +=
        '<td style="background-color: #607799; font-size: 16px; color: white;">Employee Category</td>';
      html +=
        '<td style="background-color: #607799; font-size: 16px; color: white;">Payment Method</td>';
      html +=
        '<td style="background-color: #607799; font-size: 16px; color: white;">Debit amount</td>';
      html +=
        '<td style="background-color: #607799; font-size: 16px; color: white;">Credit amount</td>';
      html += "</tr>";

      var totaldebit = 0.0;
      var totalcredit = 0.0;

      // START DYNAMIC SQL QUERY
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
      
      var resultSet = query.runSuiteQL({ query: sql }).asMappedResults();
      if (resultSet.length > 0) {
        for (var i = 0; i < resultSet.length; i++) {
          var debitamt = "0.0";
          var creditamt = "0.0";
          var Acc_Code_Number = resultSet[i].accountnumber;
          var Account_Code = resultSet[i].accounttext;
          var empcategorytext = resultSet[i].employeecategorytext;
          var paymentMethod = resultSet[i].paymentmodetext || "";
          
          debitamt = resultSet[i].debit || "0.00";
          creditamt = resultSet[i].credit || "0.00";
          
          var acctxt = (parseFloat(debitamt) != 0) ? "DR" : "CR";

          totaldebit = parseFloat(totaldebit) + parseFloat(debitamt);
          totalcredit = parseFloat(totalcredit) + parseFloat(creditamt);

          html += '<tr height="14" style="height:20.5pt;background-color: #E2E4E0;">';
          html += '  <td height="14" style="font-family: Verdana, sans-serif;" align="center">' + acctxt + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="center">' + Acc_Code_Number + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="center">' + Account_Code + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="center">' + empcategorytext + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="center">' + paymentMethod + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="right">' + numberWithCommas(debitamt) + '</td>';
          html += '  <td style="font-family: Verdana, sans-serif;" align="right">' + numberWithCommas(creditamt) + '</td>';
          html += '</tr>'; 
        }

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

        html += '<script>';
        html += '  jQuery(document).ready(function () {';
        html += '    jQuery("#custpage_excelbtn").click(function () {';
        html += '      var table = document.getElementById("resultsTable");';
        html += '      var html = table.outerHTML;';
        html += '      var url = "data:application/vnd.ms-excel," + encodeURIComponent(html);';
        html += '      var link = document.createElement("a");';
        html += '      link.href = url;';
        html += '      link.download = "exported_table.xls";';
        html += '      document.body.appendChild(link);';
        html += '      link.click();';
        html += '      document.body.removeChild(link);';
        html += '    });';
        html += '  });';
        html += '</script>';

        inlineField.defaultValue = html;
        response.writePage(form);
      } else {
        response.write("<b>" + "Data Not Found.Please check the parameters again" + "</b>");
      }
    }
  }

 /*  function numberWithCommas(x) {
    if (x === null || x === undefined || x === '') return '';
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  } */
  function numberWithCommas(x) {
    if (x === null || x === undefined || x === '' || isNaN(x)) return '0.00';
    
    // 1. Force the number to have 2 decimal places
    var parts = parseFloat(x).toFixed(2).split(".");
    
    // 2. Add commas to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    // 3. Join them back together
    return parts.join(".");
}

  function getMonth(monthParameter) {
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months[parseInt(monthParameter) - 1];
  }

  function SearchCurrency() {
    var currSymbol = null;
    var currencySearch = search.create({
      type: search.Type.CURRENCY,
      filters: [["isinactive", "is", "F"]],
      columns: ["internalid"],
    });
    var searchResults = currencySearch.run().getRange({ start: 0, end: 1000 });
    for (var i = 0; i < searchResults.length; i++) {
      var currencyId = searchResults[i].getValue({ name: "internalid" });
      var currencyRecord = record.load({ type: record.Type.CURRENCY, id: currencyId });
      if (currencyRecord.getValue({ fieldId: "isbasecurrency" })) {
        currSymbol = currencyRecord.getValue({ fieldId: "symbol" });
        break;
      }
    }
    return currSymbol;
  }

  function searchSubName(subsidiariesRes) {
    var subsidiary;
    if (!subsidiariesRes) return;
    try {
      var subSearch = search.create({
        type: search.Type.SUBSIDIARY,
        filters: [
          ["isinactive", search.Operator.IS, "F"],
          "and",
          ["internalid", search.Operator.ANYOF, subsidiariesRes]
        ],
        columns: ["name"],
      });
      var results = subSearch.run().getRange({ start: 0, end: 1 });
      if (results && results.length > 0) {
        var fullName = results[0].getValue({ name: "name" });
        var parts = fullName.split(":");
        subsidiary = parts[parts.length - 1].trim();
      }
    } catch (e) {
      log.error("Error in searchSubName", e);
    }
    return subsidiary;
  }

  function getmonth_days(wage_month) {
    var monthInt = parseInt(wage_month);
    if ([1, 3, 5, 7, 8, 10, 12].indexOf(monthInt) !== -1) return 31;
    if ([4, 6, 9, 11].indexOf(monthInt) !== -1) return 30;
    if (monthInt === 2) {
      var year = new Date().getFullYear();
      return (year % 4 === 0) ? 29 : 28;
    }
  }

  function getYear(yearParameter) {
    var year = "";
    if (yearParameter) {
      var yearRec = record.load({ type: "customlist_hris_year_master", id: yearParameter });
      year = yearRec.getValue("name");
    }
    return year;
  }

  return {
    onRequest: onRequest,
  };
});