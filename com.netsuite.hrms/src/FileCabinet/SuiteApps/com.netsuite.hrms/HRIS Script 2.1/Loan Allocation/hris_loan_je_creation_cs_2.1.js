/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/record', 'N/search', './moment.js', 'N/format', 'N/query'],
    (currentRecord, record, search, moment, format, query) => {

        const pageInit = (context) => {
            // intentionally empty
        };

        const jvcreation = () => {
            debugger;

            try {
                const currentrecord = currentRecord.get();
                const leaveSettlemenID = currentrecord.id;

                const newRecordObj = record.load({
                    type: 'customrecord_hris_empchange_loan_applicn',
                    id: leaveSettlemenID,
                    isDynamic: true
                });

                const approvalStatus = newRecordObj.getValue('custrecord_hris_loan_approval_status');
                log.debug('approvalStatus', approvalStatus);

                const jeno = newRecordObj.getValue('custrecord_hris_loan_allo_je_no') || '';
                log.debug('jeno', jeno);

                const empid = newRecordObj.getValue('custrecord_hris_loan_emp_name');
                const empname = newRecordObj.getValue('custrecord_hris_loan_emp_name');
                const paygroup = newRecordObj.getValue('custrecord_hris_loan_process_group');
                const subsidiaries = newRecordObj.getValue('custrecord_hris_loan_subsidiary');
                const loanamt = newRecordObj.getValue('custrecord_hris_loan_amount') || 0;
                const loanType = newRecordObj.getValue('custrecord_hris_loan_loan_type');
                const loanDate = newRecordObj.getValue('custrecord_hris_loan_amount_issue_date');

                const loanTypeRec = record.load({
                    type: 'customrecord_hris_loan_master',
                    id: loanType,
                    isDynamic: true
                });

                const paycomponent = loanTypeRec.getValue('custrecord_hris_loan_component');

                const jvarray = [{
                    leavesettleid: leaveSettlemenID,
                    empid: empid,
                    empname: empname,
                    paygroup: paygroup,
                    paycomponent: paycomponent,
                    subsidiary: subsidiaries,
                    loanamt: loanamt,
                    loanDate: loanDate
                }];

                log.debug('JV Array', jvarray);

                const subsidiariesRes = jvarray[0].subsidiary;
                const paygroupParameter = jvarray[0].paygroup;
                const emp = jvarray[0].empid;
                const empTxt = jvarray[0].empname;
                const today = jvarray[0].loanDate;
                const loanamtsalaryamt = jvarray[0].loanamt;

                const componentsql = `SELECT * FROM customrecord_hris_payroll_component WHERE id = ${paycomponent}`;
                log.debug('componentsql', componentsql);

                const queryResults = query.runSuiteQL({ query: componentsql });
                const componentsqlrecords = queryResults.asMappedResults();

                let sett_comp_accountCodeID = '';
                if (componentsqlrecords.length > 0) {
                    sett_comp_accountCodeID = componentsqlrecords[0].custrecord_hris_account_name || '';
                    log.debug('Account id', sett_comp_accountCodeID);
                }

                const jvObject = record.create({
                    type: 'journalentry',
                    isDynamic: true
                });

                jvObject.setValue('customform', 135);
                jvObject.setValue('approvalstatus', 2);
                jvObject.setValue('subsidiary', subsidiariesRes);
                jvObject.setValue('trandate', today);
                jvObject.setValue('memo', 'JE creation for loan allocation');
                jvObject.setValue('custbody_hris_paygroup_jv', paygroupParameter);
                jvObject.setValue('custbody_hris_jv_employeename', emp);

                if (loanamtsalaryamt > 0) {
                    const Deduct = parseFloat(loanamtsalaryamt);
                    const get_paycomponent = getleavesalarycomponent(paygroup, paycomponent);
                    const getpaycomponent = get_paycomponent.toString().split('#');

                    const comp_accountCodeID = getpaycomponent[0];
                    const paycompname = getpaycomponent[2];

                    jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account', comp_accountCodeID);
                    jvObject.setCurrentSublistValue('line', 'debit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'credit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'memo', paycompname);
                    jvObject.commitLine('line');
                }

                if (loanamtsalaryamt > 0) {
                    const Deduct = parseFloat(loanamtsalaryamt);
                    const comp_accountCodeID = getEmloyeecomponent(emp);

                    jvObject.selectNewLine('line');
                    jvObject.setCurrentSublistValue('line', 'account', comp_accountCodeID);
                    jvObject.setCurrentSublistValue('line', 'debit', 0.0);
                    jvObject.setCurrentSublistValue('line', 'credit', Deduct.toFixed(2));
                    jvObject.setCurrentSublistValue('line', 'memo', 'payable Account');
                    jvObject.commitLine('line');
                }

                const jvrecordId = jvObject.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                log.debug('jvrecordid', jvrecordId);

                const leavesettleID = record.submitFields({
                    type: 'customrecord_hris_empchange_loan_applicn',
                    id: leaveSettlemenID,
                    values: {
                        custrecord_hris_loan_allo_je_no: jvrecordId
                    }
                });

                log.debug('Info', `Leave settlement voucher Updated. Internal ID : ${leavesettleID}`);

                const url = `/app/common/custom/custrecordentry.nl?rectype=282&id=${leavesettleID}`;
                window.location.href = url;

            } catch (e) {
                log.error('Error in JV Creation', e);
            }
        };

        const getleavesalarycomponent = (paygroup, paycomponent) => {
            let comp_accountCodeID = '';
            let paycompid = '';
            let paycompname = '';

            const componentsqlsal = `SELECT id AS paycompid, BUILTIN.DF(id) AS paycompname, custrecord_hris_account_name AS accountid
                                     FROM customrecord_hris_payroll_component
                                     WHERE custrecord_hris__sequence_no_ = 62
                                     AND custrecord_hris_pay_process_group = ${paygroup}
                                     AND id = ${paycomponent}`;

            log.debug('componentsqlsal', componentsqlsal);

            const queryResults = query.runSuiteQL({ query: componentsqlsal });
            const componentsqlrecords = queryResults.asMappedResults();

            if (componentsqlrecords.length > 0) {
                paycompid = componentsqlrecords[0].paycompid;
                paycompname = componentsqlrecords[0].paycompname;
                comp_accountCodeID = componentsqlrecords[0].accountid;
                log.debug('Account id', comp_accountCodeID);
            }

            return `${comp_accountCodeID}#${paycompid}#${paycompname}`;
        };

        const getEmloyeecomponent = (emp) => {
            let comp_accountCodeID = '';

            const componentsql = `SELECT custentity_hris_payable_account AS accountid FROM employee WHERE id = ${emp}`;
            log.debug('componentsql', componentsql);

            const queryResults = query.runSuiteQL({ query: componentsql });
            const componentsqlrecords = queryResults.asMappedResults();

            if (componentsqlrecords.length > 0) {
                comp_accountCodeID = componentsqlrecords[0].accountid;
                log.debug('Account id', comp_accountCodeID);
            }

            return comp_accountCodeID;
        };

        return {
            pageInit,
            jvcreation
        };
    });