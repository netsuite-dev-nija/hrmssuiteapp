/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/record', 'N/redirect', 'N/search', 'N/runtime', 'N/log', 'N/query'],
    function (serverWidget, record, redirect, search, runtime, log, query) {

        // Constants for script and deployment IDs
        var SCRIPT_ID = 'customscript_hris_provisionjvsl';
        var DEPLOYMENT_ID = 'customdeploy_hris_provisionjvsl';

        /**
         * Main function handling Suitelet requests
         * @param {Object} context - Suitelet context
         */
        function onRequest(context) {
            try {
                var request = context.request;
                var response = context.response;

                if (request.method === 'GET') {
                    renderForm(response);
                } else if (request.method === 'POST') {
                    processJournalEntry(request, response);
                }
            } catch (e) {
                log.error('Error in onRequest', e);
                if (context.response) {
                    context.response.write('An error occurred: ' + e.message);
                }
            }
        }

        /**
         * Renders the input form for month/year selection
         * @param {Object} response - The Suitelet response object
         */
        function renderForm(response) {
            var form = serverWidget.createForm({
                title: 'Provision Journal Entries'
            });
            
            /* //Add Subsidiary
            var subsidiaryField = form.addField({
                id: 'custpage_subsidiary',
                type: serverWidget.FieldType.SELECT,
                label: 'Subsidiary',
                source: 'subsidiary'
            });
            subsidiaryField.isMandatory = true; */
// 2. Get current user's role
            // -------------------------------------------------
            var currentUser = runtime.getCurrentUser();
            var curRole = currentUser.role; // Role internal ID
            log.debug('Current Role ID', curRole);

            if (!curRole) {
                form.addPageInitMessage({ type: serverWidget.MessageType.ERROR, title: 'Error', message: 'Unable to determine user role.' });
                context.response.writePage(form);
                return;
            }

            // -------------------------------------------------
            // 3. Get accessible subsidiaries for the role
            // -------------------------------------------------
            var accessibleSubsidiaries = [];

            var roleSearch = search.create({
                type: 'role',
                filters: [
                    ['internalid', 'anyof', curRole]
                ],
                columns: ['subsidiaries'] // Note: 'subsidiary' is the field on Role record
            });

            roleSearch.run().each(function (result) {
                var subId = result.getValue('subsidiaries');
                var subText = result.getText('subsidiaries');

                if (subId && !accessibleSubsidiaries.some(function (s) { return s.id === subId; })) {
                    accessibleSubsidiaries.push({
                        id: subId,
                        name: subText
                    });
                }
                return true;
            });

            log.debug('Accessible Subsidiaries', accessibleSubsidiaries.length + ' found');

            // -------------------------------------------------
            // 4. Add Subsidiary dropdown (mandatory)
            // -------------------------------------------------
            var subsidiaryField = form.addField({
                id: 'custpage_subsidiary',
                type: serverWidget.FieldType.SELECT,
                label: 'Subsidiary',
              //container: 'custpage_filters_group'
            });
            subsidiaryField.isMandatory = true;
            subsidiaryField.addSelectOption({ value: '', text: '-- Select Subsidiary --' });

            accessibleSubsidiaries.forEach(function (sub) {
                subsidiaryField.addSelectOption({
                    value: sub.id,
                    text: sub.name
                });
            });
            // Add month dropdown
            var monthField = form.addField({
                id: 'custpage_month',
                type: serverWidget.FieldType.SELECT,
                label: 'Month',
                source: 'customlist_hris_month_list'
            });
            monthField.isMandatory = true;

            // Add year dropdown
            var yearField = form.addField({
                id: 'custpage_year',
                type: serverWidget.FieldType.SELECT,
                label: 'Year',
                source: 'customlist_hris_year_master'
            });
            yearField.isMandatory = true;


            // Add submit button
            form.addSubmitButton({
                label: 'Generate Journal Entry'
            });

            response.writePage(form);
        }

        /**
         * Processes the form submission and creates journal entries
         * @param {Object} request - The Suitelet request object
         * @param {Object} response - The Suitelet response object
         */
        function processJournalEntry(request, response) {
            var subsidiaryId = request.parameters.custpage_subsidiary;
            var monthId = request.parameters.custpage_month;
            var yearId = request.parameters.custpage_year;
            var processtype=3;

            // Validate inputs
            if (!monthId || !yearId) {
                response.write('Error: Both month and year are required.');
                return;
            }
            var journalcheck= checkalreadyjvprocessed(monthId,yearId,subsidiaryId,processtype);
            if(journalcheck==true){

            // Get accrual totals
            var accuralSums = getAccrualTotals(monthId, yearId,subsidiaryId);
            log.debug('Accrual Totals', accuralSums);

            // Get account mappings
            var accountMappings = getAccountMappings();
            log.debug('Account Mappings', accountMappings);

            // Create journal entry
            //var jvId = createJournalEntry(accuralSums, accountMappings, monthId, yearId,subsidiaryId);

           /*  if (jvId) {
                // Redirect to the same suitelet with success message
                var redirectUrl = redirect.toSuitelet({
                    scriptId: SCRIPT_ID,
                    deploymentId: DEPLOYMENT_ID,
                });
                response.sendRedirect(redirectUrl);
            } else {
                response.write('Error: No journal entry was created.');
            } */
        }
        else{

            response.write('Provision JV is already created for selected Subsidiary and Process period.')
        }

        }

        /**
         * Retrieves accrual totals by type from the database
         * @param {string} monthId - The month ID
         * @param {string} yearId - The year ID
         * @return {Object} Object containing leave, gratuity, and airticket totals
         */
        function getAccrualTotals(monthId, yearId,subsidiaryId) {
            var results = query.runSuiteQL({
               /*  query: "SELECT custrecord_hris_accural_type AS accural_type, " +
                       "SUM(custrecord_hris_accural_amount) AS total_accural " +
                       "FROM customrecord_hris_monthly_accural_trans " +                       
                       "WHERE custrecord_hris_accural_subsidiary = ?"+
                       "AND custrecord_hris_accural_month = ? " +
                       "AND custrecord_hris_accural_year = ? " +
                       "GROUP BY custrecord_hris_accural_type",
                params: [subsidiaryId,monthId, yearId] */
                query: "SELECT a.custrecord_hris_accural_type AS accural_type, " +
                "SUM(a.custrecord_hris_accural_amount) AS total_accural,b.custrecord_hris_accural_seqno as accuralseqno " +
                "FROM customrecord_hris_monthly_accural_trans a join " +
                " customrecord_hris_accuraltype_master b on a.custrecord_hris_accural_type=b.id " +                       
                "WHERE a.custrecord_hris_accural_subsidiary = ? AND a.custrecord_hris_accural_month = ? "+                
                "AND a.custrecord_hris_accural_year = ? " +               
                "GROUP BY a.custrecord_hris_accural_type,b.custrecord_hris_accural_seqno",
         params: [subsidiaryId,monthId, yearId]
            }).asMappedResults();

           

            log.debug('query',query);
            var totals = { leave: 0, gratuity: 0, airticket: 0 };

            results.forEach(function(row) {
                var amount = parseFloat(row.total_accural) || 0;
                switch (parseInt(row.accuralseqno)) {
                    case 1: totals.leave = amount; break;
                    case 2: totals.gratuity = amount; break;
                    case 3: totals.airticket = amount; break;
                }
            });

            return totals;
        }

        /**
         * Retrieves account mappings from sequence numbers
         * @return {Object} Object containing account IDs for each type
         */
        function getAccountMappings() {
            var mappings = {
                leaveDebit: getAccountIdBySequence(51),
                leaveCredit: getAccountIdBySequence(48),
                gratuityDebit: getAccountIdBySequence(47),
                gratuityCredit: getAccountIdBySequence(80),
                airticketDebit: getAccountIdBySequence(36),
                airticketCredit: getAccountIdBySequence(37)
            };

            // Validate all accounts exist
            for (var key in mappings) {
                if (!mappings[key]) {
                    throw new Error('Account mapping not found for ' + key);
                }
            }

            return mappings;
        }

        /**
         * Creates the journal entry record
         * @param {Object} accuralSums - Object containing accrual amounts
         * @param {Object} accountMappings - Object containing account IDs
         * @param {string} monthId - The month ID
         * @param {string} yearId - The year ID
         * @return {number} The ID of the created journal entry
         */
        /* function createJournalEntry(accuralSums, accountMappings, monthId, yearId,subsidiaryId) {
            // Create journal entry record
            var journalEntry = record.create({
                type: record.Type.JOURNAL_ENTRY,
                isDynamic: true
            });

            // Set header values
            journalEntry.setValue({
                fieldId: 'customform',
                value: 135
            });
            journalEntry.setValue({
                fieldId: 'approvalstatus',
                value: 2 // Pending approval
            });
            journalEntry.setValue({
                fieldId: 'subsidiary',
                value: subsidiaryId
            });
            journalEntry.setValue({
                fieldId: 'trandate',
                value: new Date()
            });
            journalEntry.setValue({
                fieldId: 'memo',
                value: 'Accruals for ' + monthId + '/' + yearId
            });
            journalEntry.setValue({
                fieldId: 'custbody_hris_passjv_processtype',
                value: 3
            });
            
            // Set the custom month and year fields
            journalEntry.setValue({
                fieldId: 'custbody_hris_jv_month',
                value: monthId
            });
            journalEntry.setValue({
                fieldId: 'custbody_hris_jv_year',
                value: yearId
            });

            // Add line items for each accrual type
            if (accuralSums.leave > 0) {
                addJournalLine(journalEntry, accountMappings.leaveDebit, accuralSums.leave, 'Leave Accrual Debit', true);
                addJournalLine(journalEntry, accountMappings.leaveCredit, accuralSums.leave, 'Leave Accrual Credit', false);
            }

            if (accuralSums.gratuity > 0) {
                addJournalLine(journalEntry, accountMappings.gratuityDebit, accuralSums.gratuity, 'Gratuity Accrual Debit', true);
                addJournalLine(journalEntry, accountMappings.gratuityCredit, accuralSums.gratuity, 'Gratuity Accrual Credit', false);
            }

            if (accuralSums.airticket > 0) {
                addJournalLine(journalEntry, accountMappings.airticketDebit, accuralSums.airticket, 'Air Ticket Accrual Debit', true);
                addJournalLine(journalEntry, accountMappings.airticketCredit, accuralSums.airticket, 'Air Ticket Accrual Credit', false);
            }

            // Save the journal entry
            var lineCount = journalEntry.getLineCount({ sublistId: 'line' });
            if (lineCount > 0) {
                return journalEntry.save();
            }
            return null;
        } */

        /**
         * Adds a line to the journal entry
         * @param {record.Record} journalEntry - The journal entry record
         * @param {number} accountId - The account internal ID
         * @param {number} amount - The line amount
         * @param {string} memo - The line memo
         * @param {boolean} isDebit - Whether this is a debit line
         */
        function addJournalLine(journalEntry, accountId, amount, memo, isDebit) {
            journalEntry.selectNewLine({ sublistId: 'line' });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'account',
                value: accountId
            });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: isDebit ? 'debit' : 'credit',
                value: amount.toFixed(2)
            });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'memo',
                value: memo
            });
            journalEntry.commitLine({ sublistId: 'line' });
        }

        /**
         * Retrieves an account ID by its sequence number
         * @param {number} seqNo - The sequence number
         * @return {number|null} The account internal ID or null if not found
         */
        function getAccountIdBySequence(seqNo) {
            var results = query.runSuiteQL({
                query: "SELECT custrecord_hris_account_name AS accountid " +
                       "FROM customrecord_hris_payroll_component " +
                       "WHERE custrecord_hris__sequence_no_ = ? AND isinactive = 'F'",
                params: [seqNo]
            }).asMappedResults();

            return results.length > 0 ? parseInt(results[0].accountid) : null;
        }
        function checkalreadyjvprocessed(monthId,yearId,subsidiaryId,processtype){
            var jvcheck=true;  
           
            var jvresults = query.runSuiteQL({   
                         
                query: "SELECT * from transaction a join transactionline b on a.id=b.transaction where a.type='Journal' \
                        and b.subsidiary =?  and \
                       a.custbody_hris_jv_month =? and a.custbody_hris_jv_year=? and a.custbody_hris_passjv_processtype =? ", 
                params: [subsidiaryId,monthId, yearId,processtype]
            }).asMappedResults();
            log.debug('query',query);
            if(jvresults.length>0){
                jvcheck=false;
            } 
            return jvcheck;
        }
        return {
            onRequest: onRequest
        };
    });