/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/record', 'N/redirect', 'N/search', 'N/runtime'],
    function(serverWidget, record, redirect, search, runtime) {
        
        function onRequest(context) {
            var request = context.request;
            var response = context.response;

            if (request.method === 'GET') {
                var form = serverWidget.createForm({
                    title: 'Update employee mobile device id'
                });

                // Employee Dropdown
                var employeeField = form.addField({
                    id: 'custpage_employee',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Select Employee',
                    source: 'employee' // Automatically fetches Employee records
                }).isMandatory = true;

                // Current IMEI Number (Read-only)
                var currentImeiField = form.addField({
                    id: 'custpage_current_imei',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Current Mobile device id'
                }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                // New IMEI Number (Input)
                var newImeiField = form.addField({
                    id: 'custpage_new_imei',
                    type: serverWidget.FieldType.TEXT,
                    label: 'New Mobile device id'
                }).isMandatory = true;

                form.addSubmitButton({ label: 'Update Mobile Device ID' });

                 // Attach Client Script for Dynamic IMEI Fetch
                form.clientScriptModulePath = './update employee device id Cl.js';

                response.writePage(form);
            } 
            else if (request.method === 'POST') {
                var employeeId = request.parameters.custpage_employee;
                var newIMEI = request.parameters.custpage_new_imei;

                if (!employeeId || !newIMEI) {
                    response.write('Missing required fields.');
                    return;
                }

                // Load and update the Employee record
                var employeeRecord = record.load({ type: 'employee', id: employeeId, isDynamic: true });
                employeeRecord.setValue({ fieldId: 'custentity_hris_mobile_imei_number', value: newIMEI });
                var nsId = employeeRecord.save({ ignoreMandatoryFields: true });

                // Fetch Updated Values
                var mobileUserName = employeeRecord.getValue('custentity_hris_mobile_user_name');
                var empMobileEmail = employeeRecord.getValue('custentity_hris_empmobileemail');
                var empMobileIMEI = employeeRecord.getValue('custentity_hris_mobile_imei_number');

                // Create IMEI Log Record
                var imeiLogRecord = record.create({
                    type: 'customrecord_hris_emp_imei_log',
                    isDynamic: true
                });

                imeiLogRecord.setValue({ fieldId: 'custrecord_hris_emp_log_int_id', value: nsId });
                imeiLogRecord.setValue({ fieldId: 'custrecord_hris_emp_log_mob_username', value: mobileUserName });
                imeiLogRecord.setValue({ fieldId: 'custrecord_hris_emp_log_mob_email', value: empMobileEmail });
                imeiLogRecord.setValue({ fieldId: 'custrecord_hris_emp_log_emp_link', value: nsId });
                imeiLogRecord.setValue({ fieldId: 'custrecord_hris_emp_log_mob_imei', value: empMobileIMEI });

                imeiLogRecord.save();

                // Redirect back to Employee Record
                redirect.toRecord({ type: 'employee', id: employeeId });
            }
        }

        return { onRequest: onRequest };
    });
