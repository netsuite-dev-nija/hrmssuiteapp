/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget', 'N/runtime'], (serverWidget, runtime) => {

    const beforeLoad = (context) => {
        const form = context.form;
        const role = runtime.getCurrentUser().role;
        log.debug('role', role);

        if (role != '1217' && role != '1220' && role != '1221') {
            form.getField({ id: 'custrecord_hris_monthly_gross_salary' }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            form.getField({ id: 'custrecord_hris_ctc' }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            form.getField({ id: 'custrecord_hris_annual_gross_salary' }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            form.getField({ id: 'custrecord_hris_monthly_gross_salary_in' }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            form.getField({ id: 'custrecord_hris_annual_gross_salary_in_b' }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            const sublist = form.getSublist({ id: 'recmachcustrecord_hris_comhis_compenhistoryid' });
            if (sublist) {
                sublist.getField({ id: 'custrecord_hris_comhis_monthlyamount' }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
                sublist.getField({ id: 'custrecord_hris_comhis_annuallyamount' }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
                sublist.getField({ id: 'custrecord_hris_comhis_prev_monthlyamt' }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
            }
        }
    };

    return {
        beforeLoad
    };
});