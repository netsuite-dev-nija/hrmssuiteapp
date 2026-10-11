/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * @Description Creates Pre-Pay Process records for selected employees (SS 2.1)
 */
define(['N/log', 'N/record', 'N/search', 'N/runtime'],
(log, record, search, runtime) => {

    const getInputData = () => {
        try {
            const scriptParams = runtime.getCurrentScript().getParameter({
                name: 'custscript_hrms_preempid'
            });
            const dataArray = JSON.parse(scriptParams);
            log.debug('Input Data', dataArray);
            return dataArray;
        } catch (e) {
            log.error('Error in getInputData', e.message);
            return [];
        }
    };

    const map = (context) => {
        const data = JSON.parse(context.value);
        log.debug('Map Data', data);
        context.write({
            key: data.empid,
            value: data
        });
    };

    const reduce = (context) => {
        try {
            const records = context.values.map((value) => JSON.parse(value));
            const rec = records[0];
            const wageMonth = rec.wagemonth;
            const WMonthId = getWagePeriodNo(wageMonth);
            log.audit('WMonthId', WMonthId);

            const sPayProcess = record.create({
                type: 'customrecord_hris_pre_pay_process_record'
            });

            sPayProcess.setValue({
                fieldId: 'custrecord_hris_pre_pay_pr_employee_name',
                value: rec.empid
            });
            sPayProcess.setValue({
                fieldId: 'custrecord_hris_pre_pay_pr_pay_group',
                value: rec.paygroup
            });
            sPayProcess.setValue({
                fieldId: 'custrecord_hris_pre_pay_pr_subsidiary',
                value: rec.subsidiary
            });
            sPayProcess.setValue({
                fieldId: 'custrecord_hris_pre_pay_pr_wage_month',
                value: rec.wagemonth
            });
            sPayProcess.setText({
                fieldId: 'custrecord_hris_pre_pay_pr_year',
                text: rec.yeartext
            });
            sPayProcess.setValue({
                fieldId: 'custrecord_hris_pre_pay_pr_pay_freq_seq',
                value: rec.payfreq
            });

            const id = sPayProcess.save();
            log.debug('Record Created', 'Record ID: ' + id);
        } catch (e) {
            log.error('Error in reduce stage', e.message);
        }
    };

    const summarize = (summary) => {
        summary.mapSummary.errors.iterator().each((key, error) => {
            log.error('Map Error', 'Key: ' + key + ', Error: ' + error);
            return true;
        });

        log.audit('Map/Reduce Summary', {
            totalUsage: summary.usage,
            totalDuration: summary.seconds,
            totalYield: summary.yields
        });
    };

    const getWagePeriodNo = (wageMonth) => {
        const monthMap = {
            January: '1', February: '2', March: '3', April: '4',
            May: '5', June: '6', July: '7', August: '8',
            September: '9', October: '10', November: '11', December: '12'
        };
        return monthMap[wageMonth] || wageMonth;
    };

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});
