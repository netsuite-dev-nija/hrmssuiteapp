/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 *
 * This script disables the Edit button for inactive employees and prevents editing of inactive employee records.
 * It applies to employees with custom form ID 776.
 */
define(['N/runtime', 'N/log'], (runtime, log) => {

    const beforeLoad = (context) => {
        try {
            const role = runtime.getCurrentUser().role;
            const executionContext = runtime.executionContext;
            const type = context.type;
            const form = context.form;
            const newRecord = context.newRecord;

            // Only process View and Edit
            if (type !== context.UserEventType.VIEW && type !== context.UserEventType.EDIT) {
                return;
            }

            // Administrator role (3) is allowed to edit
            if (role === 3) {
                return;
            }

            // Only run in UI
            if (executionContext !== runtime.ContextType.USER_INTERFACE) {
                return;
            }

            // Must have a record ID (not create)
            if (!newRecord.id) {
                return;
            }

            const customform = newRecord.getValue({ fieldId: 'customform' });
            log.debug('customform', customform);

            if (customform != 776) {
                return;
            }

            const isInactive = newRecord.getValue({ fieldId: 'isinactive' });
            log.debug('EmployeeButtonBeforeload()', 'Emp_status*****' + isInactive);

            // ---------- VIEW mode: disable Edit button ----------
            if (type === context.UserEventType.VIEW) {
                if (isInactive === true || isInactive === 'T') {
                    const editButton = form.getButton({ id: 'edit' });
                    if (editButton) {
                        editButton.isDisabled = true;
                    }
                }
            }

            // ---------- EDIT mode: block editing ----------
            if (type === context.UserEventType.EDIT) {
                if (isInactive === true || isInactive === 'T') {
                    throw 'Confirm settlement has been done for this employee. You cannot edit this record';
                }
            }

        } catch (e) {
            // Re-throw the business rule error so the user sees the message
            if (typeof e === 'string' && e.indexOf('Confirm settlement') !== -1) {
                throw e;
            }
            log.error('EmployeeButtonBeforeload ERROR', e.message || e.toString());
        }
    };

    return {
        beforeLoad
    };
});