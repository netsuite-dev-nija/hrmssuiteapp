/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/ui/dialog'], (currentRecord, dialog) => {

    const validateLine = (context) => {
        try {
            const rec = context.currentRecord;

            // Get the value of "custrecord_hris_loan_emi_end_date" from the main record
            const emiEndDateRaw = rec.getValue('custrecord_hris_loan_emi_end_date');
            if (!emiEndDateRaw) return true;

            const emiEndDate = new Date(emiEndDateRaw);

            // Get the value of "custrecord_hris_loan_outstanding_amount"
            const outstandingAmount = rec.getValue('custrecord_hris_loan_outstanding_amount');
            if (outstandingAmount === 0 || outstandingAmount === '0') {
                dialog.alert({
                    title: 'Outstanding Amount Zero',
                    message: 'The loan outstanding amount is zero...'
                });
                return false;
            }

            // Get the values from the sublist
            const sublistId = 'recmachcustrecord_hris_loan_alloc_link';
            const startDateRaw = rec.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_hris_loan_alloc_startdate'
            });
            const endDateRaw = rec.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custrecord_hris_loan_alloc_enddate'
            });

            if (!startDateRaw) return true;

            const startDate = new Date(startDateRaw);
            const endDate = new Date(endDateRaw);

            /* 
            // Uncomment if you want these validations back
            if (startDate > emiEndDate) {
                dialog.alert({
                    title: 'Invalid Date',
                    message: 'The loan allocation start date cannot be greater than the EMI end date.'
                });
                return false;
            }

            if (startDate.getTime() !== endDate.getTime()) {
                dialog.alert({
                    title: 'Date Mismatch',
                    message: 'The loan allocation start date and end date must be the same.'
                });
                return false;
            }
            */

            return true;
        } catch (e) {
            console.error('Error in validateLine:', e.message);
            return false;
        }
    };

    const fieldChanged = (context) => {
        try {
            const rec = context.currentRecord;

            if (context.sublistId === 'recmachcustrecord_hris_loan_alloc_link' &&
                context.fieldId === 'custrecord_hris_loan_alloc_startdate') {

                const startDate = rec.getCurrentSublistValue({
                    sublistId: context.sublistId,
                    fieldId: context.fieldId
                });

                if (startDate) {
                    rec.setCurrentSublistValue({
                        sublistId: context.sublistId,
                        fieldId: 'custrecord_hris_loan_alloc_enddate',
                        value: startDate
                    });
                }
            }
        } catch (e) {
            console.error('Error in fieldChanged:', e.message);
        }
    };

    const saveRecord = (context) => {
        const rec = context.currentRecord;

        // Header field
        const paidAmount = rec.getValue('custrecord_hris_loan_amount');
        console.log('Header Field - Paid Amount:', paidAmount);

        // Calculate sum of sublist field
        const sublistId = 'recmachcustrecord_hris_loan_alloc_link';
        const sublistLineCount = rec.getLineCount({ sublistId });
        console.log('Number of lines in sublist:', sublistLineCount);

        let totalPaidAmount = 0;

        for (let i = 0; i < sublistLineCount; i++) {
            const allocPaidAmount = rec.getSublistValue({
                sublistId,
                fieldId: 'custrecord_hris_loan_alloc_paidamount',
                line: i
            });

            console.log(`Line: ${i + 1}, Allocated Paid Amount: ${allocPaidAmount}`);
            totalPaidAmount += parseFloat(allocPaidAmount) || 0;
        }

        console.log('Total Allocated Paid Amount:', totalPaidAmount);

        if (paidAmount) {
            if (totalPaidAmount > paidAmount) {
                alert('The total allocated paid amount exceeds the Loan Paid Amount. Please adjust the values.');
                return false;
            }
        } else {
            console.log('Validation Skipped - Paid Amount is empty.');
        }

        console.log('Validation Passed - Total Allocated Paid Amount is within the Loan Paid Amount.');
        return true;
    };

    return {
        validateLine,
        fieldChanged,
        saveRecord
    };
});