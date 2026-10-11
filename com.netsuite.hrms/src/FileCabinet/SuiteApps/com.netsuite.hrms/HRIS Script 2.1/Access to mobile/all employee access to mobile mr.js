/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/https', 'N/email', 'N/runtime', 'N/log'], 
    (record, https, email, runtime, log) => {

    const getInputData = () => {
        try {
            const scriptObj = runtime.getCurrentScript();
            const payloadStr = scriptObj.getParameter({ name: 'custscript_mr_mobile_payload' });
            const payload = JSON.parse(payloadStr);
            log.debug('MR Input Data Count', payload.data.length);
            return payload.data;
        } catch (e) {
            log.error('Error in getInputData', e.message);
            return [];
        }
    };

    const map = (context) => {
        const scriptObj = runtime.getCurrentScript();
        const payloadStr = scriptObj.getParameter({ name: 'custscript_mr_mobile_payload' });
        const payload = JSON.parse(payloadStr);
        
        const targetAccess = (payload.targetAccess === 'T');
        const sendEmailFlag = (payload.sendMail === 'T');
        const authorId = payload.author;
        const token = payload.token;
        const emp = JSON.parse(context.value);

        try {
            // A. External API Sync
            const apiPayload = {
                "nsId": parseInt(emp.id),
                "mobileemail": emp.email,
                "mobileusername": emp.user,
                "mobilepassword": "123456",
                "mobileaccess": targetAccess
            };

            const apiRes = https.post({
                url: "https://mobapp.nijatech.com:5612/api/netsuite/updatelogindetails",
                headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
                body: JSON.stringify(apiPayload)
            });

            // B. NetSuite Record Update
            const empRecord = record.load({ type: record.Type.EMPLOYEE, id: emp.id, isDynamic: true });
            empRecord.setValue({ fieldId: 'custentity_hris_emp_accesstomobile', value: targetAccess });
            empRecord.setValue({ fieldId: 'custentity_hris_mobile_user_name', value: emp.user });
            empRecord.setValue({ fieldId: 'custentity_hris_empmobileemail', value: emp.email });
            empRecord.setValue({ 
                fieldId: 'custentity_hris_access_to_mobile_respons', 
                value: apiRes.code === 200 ? "Success" : "External API Error (" + apiRes.code + ")" 
            });
            empRecord.save({ ignoreMandatoryFields: true });

            // C. Email
            if (sendEmailFlag && apiRes.code === 200) {
                const statusDesc = targetAccess ? "ENABLED" : "DISABLED";
                email.send({
                    author: authorId, 
                    recipients: emp.id,
                    subject: `Mobile App Access: ${statusDesc}`,
                    body: `<div style="font-family:sans-serif; color:#333; padding:20px;"><h3>Hello ${emp.name},</h3><p>Your mobile application access has been <b>${statusDesc.toLowerCase()}</b>.</p></div>`
                });
            }
        } catch (err) {
            log.error(`Error ID ${emp.id}`, err.message);
        }
    };

    return { getInputData, map };
});