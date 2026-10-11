/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/https', 'N/log', 'N/format', 'N/runtime'], function (record, search, https, log, format, runtime) {

    function execute(context) {
        var recid = runtime.getCurrentScript().getParameter({ name: 'custscript_expensereportid' });
        log.debug('API Parameter', recid);
        try {
            processExpenseReports(recid);
        } catch (e) {
            log.error("Execution Error", e.message);
        }
    }

    function processExpenseReports(recid) {
        var expenseReportSearch = search.create({
            type: "customrecord_hris_expense_report",
            filters: [
                ["custrecord_hris_expense_approval_status", "anyof", ["2", "3"]],
                "AND",
                ["isinactive", "is", "F"],
                "AND",
                ["internalid", "is", recid]
            ],
            columns: [
                "internalid",
                "custrecord_hris_exchange_rate",
                "custrecord_hris_expense_currency",
                "custrecord_hris_expense_department",
                "custrecord_hris_expense_journal_report",
                "custrecord_hris_expense_paymonth",
                "custrecord_hris_expense_payyear",
                // "custrecord_hris_expense_report_class",
                "custrecord_hris_expense_report_date",
                "custrecord_hris_expense_report_emp",
                "custrecord_hris_expense_report_paygroup",
                "custrecord_hris_expense_report_total",
                "custrecord_hris_expense_subsidiary",
                "custrecord_hris_payroll_component_expens",
                "custrecord_hris_expense_approval_status",
                "custrecord_hris_expense_approval_role"
            ]
        });

        expenseReportSearch.run().each(function (result) {
            var internalid = result.getValue("internalid");
            var rawDate = result.getValue("custrecord_hris_expense_report_date");
            var formattedDate = formatDate(rawDate);

            var payload = {
                recordType: "customrecord_hris_expense_report",
                id: internalid,
                data: {
                    empid: result.getValue("custrecord_hris_expense_report_emp") || "",
                    empname: result.getText("custrecord_hris_expense_report_emp") || "",
                    exchangerate: result.getValue("custrecord_hris_exchange_rate") || "",
                    approvalstatus: result.getValue("custrecord_hris_expense_approval_status") || "",
                    approvaluserrole: result.getValue("custrecord_hris_expense_approval_role") || "",
                    expensecurrency: result.getValue("custrecord_hris_expense_currency") || "",
                    departmentid: result.getValue("custrecord_hris_expense_department") || "",
                    departmentname: result.getText("custrecord_hris_expense_department") || "",
                    paymonth: result.getText("custrecord_hris_expense_paymonth") || "",
                    payyear: result.getText("custrecord_hris_expense_payyear") || "",
                    //classid: result.getValue("custrecord_hris_expense_report_class") || "",
                    //classname: result.getText("custrecord_hris_expense_report_class") || "",
                    date: formattedDate || "",
                    paygroupid: result.getValue("custrecord_hris_expense_report_paygroup") || "",
                    paygroupname: result.getText("custrecord_hris_expense_report_paygroup") || "",
                    totalamt: result.getValue("custrecord_hris_expense_report_total") || "",
                    subsidiary: result.getValue("custrecord_hris_expense_subsidiary") || "",
                    subsidiaryName:result.getText("custrecord_hris_expense_subsidiary") || "",
                    payrollcomponentid: result.getValue("custrecord_hris_payroll_component_expens") || "",
                    payrollcomponentname: result.getText("custrecord_hris_payroll_component_expens") || ""
                }
            };

            // Fetch and add child details
            payload.details = getChildExpenseDetails(internalid);

            log.debug("Expense Report Payload", payload);

            // Uncomment to send:
            // var response = sendToAPI(payload);
            // if (response.code === 200) {
            //     markAsSynced("customrecord_hris_expense_report", internalid);
            // }

            return true;
        });
    }

    function getChildExpenseDetails(recid) {
        var details = [];
        log.debug("details", details);

        var childSearch = search.create({
            type: "customrecord_hris_expense_details",
            filters: [
                ["custrecord_hris_expense_details_link", "is", recid],
                "AND",
                ["isinactive", "is", "F"]
            ],
            columns: [
                "internalid",
                "custrecord_hri_expense_detais_date",
                "custrecord_hris_details_subsidiary",
                //"custrecord_hris_employee_expense_cl_clas",
                "custrecord_hris_expense_detai_department",
                "custrecord_hris_expense_details_amount",
                "custrecord_hris_expense_details_currency",
                "custrecord_hris_expense_details_exrate",
                "custrecord_hris_expense_details_forginam",
                "custrecord_hris_expense_details_taxcode",
              "custrecord_hris_expense_details_catagory",
                "custrecord_hris_expense_details_taxrate",
                "custrecord_hris_expense_gross_amt",
                "custrecord_hris_expense_report_acc",
                "custrecord_hris_expense_tax_amt"
            ]
        });

        childSearch.run().each(function (res) {
            details.push({
                id: res.getValue("internalid"),
                date: formatDate(res.getValue("custrecord_hri_expense_detais_date")) || "",
                subsidiary: res.getValue("custrecord_hris_details_subsidiary") || "",
                subsidiaryName:res.getText("custrecord_hris_details_subsidiary") || "",
                //class: res.getValue("custrecord_hris_employee_expense_cl_clas") || "",
               catgoryname: res.getText("custrecord_hris_expense_details_catagory") || "",
               catgoryid: res.getValue("custrecord_hris_expense_details_catagory") || "",
                department: res.getValue("custrecord_hris_expense_detai_department") || "",
                amount: res.getValue("custrecord_hris_expense_details_amount") || "",
                currency: res.getValue("custrecord_hris_expense_details_currency") || "",
                exchangerate: res.getValue("custrecord_hris_expense_details_exrate") || "",
                forignamount: res.getValue("custrecord_hris_expense_details_forginam") || "",
                taxcode: res.getValue("custrecord_hris_expense_details_taxcode") || "",
                taxrate: res.getValue("custrecord_hris_expense_details_taxrate") || "",
                grossamount: res.getValue("custrecord_hris_expense_gross_amt") || "",
                account: res.getValue("custrecord_hris_expense_report_acc") || "",
                taxamount: res.getValue("custrecord_hris_expense_tax_amt") || ""
            });
            return true;
        });

        return details;
    }

    function formatDate(nsDate) {
        if (!nsDate) return "";
        try {
            var dateObj = format.parse({ value: nsDate, type: format.Type.DATE });
            var dd = ("0" + dateObj.getDate()).slice(-2);
            var mm = ("0" + (dateObj.getMonth() + 1)).slice(-2);
            var yyyy = dateObj.getFullYear();
            return dd + "/" + mm + "/" + yyyy;
        } catch (e) {
            log.error("Date Format Error", e.message);
            return nsDate;
        }
    }

    // Optional: Send data to external API
    // function sendToAPI(payload) {
    //     var url = 'https://mobapp.nijatech.com:5602/api/netsuite/updateleavehistory';
    //     var headers = {
    //         'Content-Type': 'application/json',
    //         'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
    //     };

    //     try {
    //         var response = https.post({
    //             url: url,
    //             headers: headers,
    //             body: JSON.stringify(payload)
    //         });
    //         log.debug("API Response", response.body);
    //         return { code: response.code, body: response.body };
    //     } catch (e) {
    //         log.error("API Send Error", e.message);
    //         return { code: e.code || 500, body: e.message };
    //     }
    // }

    // Optional: Mark record as synced
    // function markAsSynced(recordType, id) {
    //     try {
    //         var rec = record.load({ type: recordType, id: id });
    //         rec.setValue({ fieldId: 'custrecord_hris_expense_approval_sync', value: true });
    //         rec.save();
    //         log.debug("Marked as Synced", recordType + " ID: " + id);
    //     } catch (e) {
    //         log.error("Mark Sync Error", e.message);
    //     }
    // }

    return {
        execute: execute
    };
});