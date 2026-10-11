
    function pageInit(context) {
        try {
            var rec = currentRecord.get();
            var internalId = rec.getValue('custpage_record_internalid');

            if (internalId) {
                var paygroup = rec.getValue('custrecord_paygroup');
                var employee = rec.getValue('custrecord_employee');
                var startDate = rec.getValue('custrecord_start_date');
                var endDate = rec.getValue('custrecord_end_date');

                // Call the Suitelet
                var suiteletUrl = url.resolveScript({
                    scriptId: 'customscript_your_suitelet_script',
                    deploymentId: 'customdeploy_your_suitelet_deployment'
                });

                var payload = {
                    recordId: internalId,
                    paygroup: paygroup,
                    employee: employee,
                    startDate: startDate,
                    endDate: endDate
                };

                var response = https.post({
                    url: suiteletUrl,
                    body: JSON.stringify(payload),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                log.debug({ title: 'Suitelet Response', details: response.body });
            }
        } catch (e) {
            console.error('Error in pageInit', e);
        }
    }

 