/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/log', 'N/runtime', 'N/search'], 
function (log, runtime, search) {

    /**
     * pageInit – restricts Subsidiary dropdown to role‑allowed subsidiaries
     */
    function pageInit(context) {
        try {
            var rec = context.currentRecord;

            // -------------------------------------------------
            // 1. Get role ID
            // -------------------------------------------------
            var roleId = runtime.getCurrentUser().role;
            log.debug('Current Role ID', roleId);

            var allowedSubs = [];

            // -------------------------------------------------
            // 2. Search role for allowed subsidiaries
            // -------------------------------------------------
            if (roleId) {
                var roleSearch = search.create({
                    type: 'role',
                    filters: [
                        ['internalid', 'anyof', roleId]
                    ],
                    columns: [
                        'subsidiaries'
                    ]
                });

                roleSearch.run().each(function (result) {
                    var subId   = result.getValue('subsidiaries');
                    var subText = result.getText('subsidiaries');

                    if (subId && !allowedSubs.some(function (s) { return s.id === subId; })) {
                        allowedSubs.push({ id: subId, name: subText });
                    }
                    return true;
                });
            }

            // -------------------------------------------------
            // 3. Update Subsidiary field
            // -------------------------------------------------
            var subField = rec.getField({ fieldId: 'custpage_subsidiary' });

            if (!subField) {
                log.error('Field Not Found', 'custpage_subsidiary field does not exist');
                return;
            }

            if (subField.type !== 'select') {
                log.error('Field Type Error', 'custpage_subsidiary is not a select field');
                return;
            }

            // Clear all existing options
            clearSelectOptions(subField);

            // Add placeholder
            subField.insertSelectOption({
                value: '',
                text: '-- Select Subsidiary --'
            });

            // Add only allowed subsidiaries
            allowedSubs.forEach(function (sub) {
                subField.insertSelectOption({
                    value: sub.id,
                    text: sub.name
                });
            });

            // Auto-select if only one option
            if (allowedSubs.length === 1) {
                rec.setValue({
                    fieldId: 'custpage_subsidiary',
                    value: allowedSubs[0].id
                });
                log.debug('Auto-selected Subsidiary', allowedSubs[0].id);
            }

            log.audit('Subsidiary Restriction Applied', 
                      'Allowed count: ' + allowedSubs.length);

        } catch (e) {
            log.error('pageInit Error', e.name + ': ' + e.message);
        }
    }

    /**
     * Helper: Remove all options from a select field
     */
    function clearSelectOptions(field) {
        var options = field.getSelectOptions() || [];
        options.forEach(function (opt) {
            field.removeSelectOption({ value: opt.value });
        });
    }

    return {
        pageInit: pageInit
    };
});