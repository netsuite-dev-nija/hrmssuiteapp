/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/query', 'N/email', 'N/runtime'], (query, email, runtime) => {

    const execute = (context) => {
        // 1. Construct the SuiteQL Query using the WITH clause to force the last 5 days
      /*   const sql = `
            WITH DateRange AS (
                SELECT TRUNC(SYSDATE) AS report_date FROM DUAL
                UNION ALL SELECT TRUNC(SYSDATE) - 1 FROM DUAL
                UNION ALL SELECT TRUNC(SYSDATE) - 2 FROM DUAL
                UNION ALL SELECT TRUNC(SYSDATE) - 3 FROM DUAL
                UNION ALL SELECT TRUNC(SYSDATE) - 4 FROM DUAL
                UNION ALL SELECT TRUNC(SYSDATE) - 5 FROM DUAL
            )
            SELECT 
                TO_CHAR(dr.report_date, 'DD/MM/YYYY') as biodate, 
                COUNT(s.id) as record_count 
            FROM 
                DateRange dr
            LEFT JOIN 
                customrecord_hris_biometric_staging s ON TRUNC(s.custrecord_hris_biostage_date) = dr.report_date
            GROUP BY 
                dr.report_date
            ORDER BY 
                dr.report_date DESC
        `;
 */

       /*  const sql =`WITH DateRange AS (
   
    SELECT TRUNC(SYSDATE) - 1 AS report_date FROM DUAL
    UNION ALL SELECT TRUNC(SYSDATE) - 2 FROM DUAL
    UNION ALL SELECT TRUNC(SYSDATE) - 3 FROM DUAL
    UNION ALL SELECT TRUNC(SYSDATE) - 4 FROM DUAL
    UNION ALL SELECT TRUNC(SYSDATE) - 5 FROM DUAL
)
SELECT 
    TO_CHAR(dr.report_date, 'DD/MM/YYYY') as biodate, 
    COUNT(s.id) as record_count 
FROM 
    DateRange dr
LEFT JOIN 
    customrecord_hris_biometric_staging s ON TRUNC(s.custrecord_hris_biostage_date) = dr.report_date
GROUP BY 
    dr.report_date
ORDER BY 
    dr.report_date DESC`; */

    const sql =`WITH DateRange AS (
  /* LEVEL 1 = Yesterday, LEVEL 2 = 2 days ago, etc. */
  SELECT TRUNC(CURRENT_DATE) - LEVEL AS report_date
  FROM DUAL
  CONNECT BY LEVEL <= 5
)
SELECT 
    TO_CHAR(dr.report_date, 'DD/MM/YYYY') AS biodate, 
    COUNT(s.id) AS record_count
FROM DateRange dr
LEFT JOIN customrecord_hris_biometric_staging s 
    ON TRUNC(s.custrecord_hris_biostage_date) = dr.report_date
GROUP BY dr.report_date
ORDER BY dr.report_date DESC;`
    log.debug("sql",sql);
        try {
            const queryResults = query.runSuiteQL({ query: sql }).asMappedResults();

            if (queryResults.length > 0) {
                sendEmailReport(queryResults);
            } else {
                log.debug('No Data', 'No records found (unexpected with DateRange CTE).');
            }
        } catch (e) {
            log.error('Query Error', e.message);
        }
    };

    const sendEmailReportold = (results) => {
        // 2. Build HTML Table for the Email body

         let htmlBody =
          "<html><body>" +
          "Hi,<br/><br/>" +
          "Biometric Staging Report has been generated." +
          "<br/><br/>Thank you.<br/>" +
          "This is an auto-generated mail. Please do not reply." +
          "</body></html>";
        log.debug("emailBody", emailBody);

         htmlBody += '<h2>Biometric Staging Report (Last 5 Days)</h2>';
        htmlBody += '<table border="1" cellpadding="5" style="border-collapse: collapse; width: 300px; text-align: center;">';
        htmlBody += '<tr style="background-color: #607799; color: white;"><th>Date</th><th>Count</th></tr>';

        results.forEach(row => {
            // Highlight row in red if count is 0
            let rowStyle = (row.record_count === 0 || row.record_count === '0') ? 'style="color: red; font-weight: bold; background-color: #fff0f0;"' : '';
            
            htmlBody += `<tr ${rowStyle}>`;
            htmlBody += `<td>${row.biodate}</td>`;
            htmlBody += `<td>${row.record_count}</td>`;
            htmlBody += `</tr>`;
        });
        
        htmlBody += '</table>';

        // 3. Send the Email
        email.send({
            author: -5, 
            recipients: 'florence@nijatech.com',
            subject: 'Daily Biometric Sync Staging Count Report',
            body: htmlBody
        });

        log.debug('Email Sent', 'Report successfully mailed with zero-count dates included.');
    };
    const sendEmailReport = (results) => {
         var To1 = ["s.santoki@pureharvestfarms.com","f.khan@pureharvestfarms.com","p.tourani@pureharvestfarms.com"];
       //  var To1 =["florence@nijatech.com"]
        log.debug("To1", To1);
      //  var To =["florence@nijatech.com"]
        var To = ["vanitha@nijatech.com","florence@nijatech.com","sundari@nijatech.com"];
    // 1. Start with the Header/Intro
    let htmlBody = "<html><body>";
    htmlBody += "Hi,<br/><br/>";
    htmlBody += "Biometric Staging Report has been generated.<br/><br/>";

    // 2. Add the Table
    htmlBody += '<h2>Biometric Staging Report (Last 5 Days)</h2>';
    htmlBody += '<table border="1" cellpadding="5" style="border-collapse: collapse; width: 300px; text-align: center;">';
    htmlBody += '<tr style="background-color: #607799; color: white;"><th>Date</th><th>Count</th></tr>';

    results.forEach(row => {
        // Highlight row in red if count is 0
        let rowStyle = (row.record_count === 0 || row.record_count === '0') ? 'style="color: red; font-weight: bold; background-color: #fff0f0;"' : '';
        
        htmlBody += `<tr ${rowStyle}>`;
        htmlBody += `<td>${row.biodate}</td>`;
        htmlBody += `<td>${row.record_count}</td>`;
        htmlBody += `</tr>`;
    });

    htmlBody += '</table>';

    // 3. NOW add the Footer below the table
    htmlBody += "<br/><br/>Thank you.<br/>";
    htmlBody += "<i>This is an auto-generated mail. Please do not reply.</i>";
    htmlBody += "</body></html>";

    log.debug("emailBody", htmlBody);

    // 4. Send the Email
    email.send({
        author: -5, 
         recipients:To1,
            cc: To,
        subject: 'Daily Biometric Sync Staging Count Report',
        body: htmlBody
    });
};

    return { execute };
});