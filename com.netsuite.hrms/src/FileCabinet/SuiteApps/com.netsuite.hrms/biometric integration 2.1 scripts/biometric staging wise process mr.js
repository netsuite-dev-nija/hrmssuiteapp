/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/https', 'N/record', 'N/log', 'N/format', 'N/search'], (https, record, log, format, search) => {

    const getInputData = () => {
        try {
            // 1. LOGIN
            // const loginUrl = 'https://timelog.cwtme.ae:34800/login/GetLoginDetails';
            // const loginBody = { "useR_R": "CLNCO", "password": "CLNCO", "companyCode": "CLNCO" };

            // let loginResponse = https.post({
            //     url: loginUrl,
            //     body: JSON.stringify(loginBody),
            //     headers: { 'Content-Type': 'application/json' }
            // });

            // let loginData = JSON.parse(loginResponse.body);
            // let token = loginData.token;
            // if (!token) throw new Error('Auth Token Failed');

            // 2. FETCH DATA
            const dataUrl = 'https://63.biocloud.me:8194/api_gettransactions';
            // let targetDate = '2026-08-06'; // Update as needed
          let today = new Date();

          let year = today.getFullYear();
          let month = String(today.getMonth() + 1).padStart(2, '0');
          let day = String(today.getDate()).padStart(2, '0');  
          let startDate = `${year}-${month}-${day}`;
          let endDate = `${year}-${month}-${day}`;
          log.debug("StartDate",startDate);
          log.debug("EndDate",endDate);
          // let startDate = '2026-09-01';
          //   let endDate = '2026-09-04';
            let dataBody = {};

            let dataResponse = https.post({
                url: dataUrl,
                body: JSON.stringify(dataBody),
                headers: { 'Content-Type': 'application/json', 'token':'e0c1ebcce42140ab95fdb8e7896cea27'}
            });
            log.debug("dataResponse RAW:", dataResponse);
            let responseData = JSON.parse(dataResponse.body);
            log.debug("responce data", responseData)
            let transactions = responseData.message || responseData.results || (Array.isArray(responseData) ? responseData : []);

            let filteredTransactions = transactions.filter(txn => {
                if (!txn.VerifyTime) return false;
                let txnDate = txn.VerifyTime.split('T')[0];
                return txnDate >= startDate && txnDate <= endDate;
            });

            // log.audit('Data Fetch Summary', `Total transactions retrieved: ${transactions.length}. Filtered for date ${targetDate}: ${filteredTransactions.length}`);

            return filteredTransactions;

        } catch (e) {
            log.error('getInputData Error', e.message);
            return [];
        }
    };

    const map = (context) => {
        try {
            let punchData = JSON.parse(context.value);
            log.debug("Punch Data (MAP):", punchData);
            
            let transactionId = punchData.Id;
            let externalId = 'bio_' + transactionId;

            // Check if record already exists for this transaction ID
            let alreadyExists = false;
            search.create({
                type: 'customrecord_hris_biometric_staging',
                filters: [['custrecord_externalid', 'is', externalId]]
            }).run().each(result => {
                alreadyExists = true;
                return false; // Stop search iteration
            });

            if (alreadyExists) {
                log.debug('Skipped Duplicate', `Transaction ID ${transactionId} already exists.`);
                return;
            }

            let rawDateStr = punchData.VerifyTime.split('T')[0]; 
            let nsDate = format.parse({
                value: formatToDDMMYYYY(rawDateStr),
                type: format.Type.DATE
            });

            let rec = record.create({
                type: 'customrecord_hris_biometric_staging',
                isDynamic: true
            });

            rec.setValue({ fieldId: 'custrecord_externalid', value: externalId });
            rec.setValue({ fieldId: 'custrecord_hris_biostage_date', value: nsDate });
            rec.setValue({ fieldId: 'custrecord_hris_biostage_requestapi', value: 'https://63.biocloud.me:8194/api_gettransactions' });
            rec.setValue({ fieldId: 'custrecord_hris_biostage_response', value: JSON.stringify(punchData) });

            // --- ATTENTION: LIST/RECORD FIELDS ---
            // Replace these numbers with the Internal IDs from your Custom List
            
            // Example: If 'Success' ID is 1
            rec.setValue({ fieldId: 'custrecord_hris_biostage_responsestatus', value: 1 }); 
            
            // Example: If 'Pending' ID is 1 (Check your list internal IDs!)
            rec.setValue({ fieldId: 'custrecord_hris_biostage_processingsts', value: 1 }); 

            let id = rec.save();
            log.debug('Created Staging Record', `ID: ${id} | Transaction: ${transactionId}`);

        } catch (e) {
            log.error('Map Error', e.message);
        }
    };

    const summarize = (summary) => {
        log.audit('Summary', 'Done');
    };

    function formatToDDMMYYYY(dateStr) {
        let parts = dateStr.split('-'); 
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return { getInputData, map, summarize };
});