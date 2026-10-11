/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/log', 'N/query'], function (log, query) {

    function doget(context) {
        try {
            var empId = context.empid;
            var year = context.year;

            var whereClauses = [];
            if (empId) {
                whereClauses.push("A.custrecord_hris_emp_payslip_empid = '" + empId + "'");
            }
            if (year) {
                whereClauses.push("BUILTIN.DF(A.custrecord_hris_payslip_year) = '" + year + "'");
            }

            var whereSql = "";
            if (whereClauses.length > 0) {
                whereSql = " WHERE " + whereClauses.join(" AND ");
            }

            var suiteQL = ""
                + "SELECT "
                + "A.custrecord_hris_emp_payslip_empid AS empid, "
                + "B.custentity_hris_emplegalname AS empname, "
                + "BUILTIN.DF(A.custrecord_hris_emp_payslip_month) AS paymonth, "
                + "BUILTIN.DF(A.custrecord_hris_payslip_year) AS payyear, "
                + "A.custrecord_hris_payslip_payslip AS fileid "
                + "FROM customrecord_hris_emp_payslip_monh AS A "
                + "LEFT JOIN employee AS B ON B.id = A.custrecord_hris_emp_payslip_empid "
                + whereSql;

            log.debug("SuiteQL", suiteQL);

            var results = query.runSuiteQL({ query: suiteQL }).asMappedResults();

            var empMap = {};
            results.forEach(function (row) {
                var empIdVal = row.empid;
                var empNameVal = row.empname;
                var payMonthVal = row.paymonth;
                var payYearVal = row.payyear;
                var fileId = row.fileid;

                var fileUrl = "";
                var urlpdf="";
                if (fileId) {
                    var fileQuery = "SELECT url FROM File WHERE id = " + fileId;
                    var fileResult = query.runSuiteQL({ query: fileQuery }).asMappedResults();
                    if (fileResult.length > 0) {
                        urlpdf = fileResult[0].url;
                        fileUrl="https://11929899.app.netsuite.com"+urlpdf;
                    }
                }

                if (!empMap[empIdVal]) {
                    empMap[empIdVal] = {
                        employeeId: empIdVal,
                        employeeName: empNameVal,
                        payslips: []
                    };
                }

                empMap[empIdVal].payslips.push({
                    paymonth: payMonthVal,
                    payyear: payYearVal,
                    payslip: fileUrl
                });
            });

            var finalData = Object.keys(empMap).map(function (key) {
                return empMap[key];
            });

            return JSON.stringify({
                Status: true,
                StatusCode: 200,
                Message: "Success",
                Response: "Records retrieved successfully",
                Data: finalData
            });

        } catch (e) {
            log.error('Error', e);
            return JSON.stringify({
                Status: false,
                StatusCode: 500,
                Message: "Error",
                Response: e.message,
                Data: []
            });
        }
    }

    return {
        get: doget
    };
});
