/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define([
    'N/ui/serverWidget',
    'N/log',
    'N/record',
    'N/https',
    'N/email',
    'N/runtime'
], function (
    serverWidget,
    log,
    record,
    https,
    email,
    runtime
) {

    function onRequest(context) {
        try {
            if (context.request.method === 'GET') {
                handleGet(context);
            } else if (context.request.method === 'POST') {
                handlePost(context);
            }
        } catch (e) {
            log.error('Suitelet Error', e);
            context.response.write('Error : ' + e.toString());
        }
    }

    function handleGet(context) {
        var empId = context.request.parameters.empid;

        /* VALIDATE EMPLOYEE ID */
        if (!empId) {
            context.response.write('Employee ID parameter missing');
            return;
        }

        /* LOAD EMPLOYEE RECORD */
        var empRec = record.load({
            type: record.Type.EMPLOYEE,
            id: empId
        });

        /* CREATE FORM */
        var form = serverWidget.createForm({
            title: 'ESS Mobile Password - Employee ID : ' + empId
        });

        /* HIDDEN EMPLOYEE SOURCE FIELD */
        var sourceField = form.addField({
            id: 'custpage_employee_source',
            type: serverWidget.FieldType.TEXT,
            label: 'Employee Source'
        });
        sourceField.defaultValue = empId;
        sourceField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        /* EMPLOYEE FIELD */
        var employeeField = form.addField({
            id: 'custpage_employee_id',
            type: serverWidget.FieldType.SELECT,
            label: 'Employee',
            source: 'employee'
        });
        employeeField.defaultValue = empId;
        employeeField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        /* ACCESS TO MOBILE */
        var accessField = form.addField({
            id: 'custpage_access_to_mobile',
            type: serverWidget.FieldType.CHECKBOX,
            label: 'Access To Mobile'
        });

        /* USERNAME FIELD */
        var usernameField = form.addField({
            id: 'custpage_mobile_username',
            type: serverWidget.FieldType.TEXT,
            label: 'Mobile Username'
        });
        usernameField.isMandatory = true;

        /* PASSWORD FIELD */
        var passwordField = form.addField({
            id: 'custpage_mobile_password',
            type: serverWidget.FieldType.TEXT,
            label: 'Mobile Password'
        });
        passwordField.isMandatory = true;

        /* EMAIL FIELD */
        var emailField = form.addField({
            id: 'custpage_mobile_email',
            type: serverWidget.FieldType.EMAIL,
            label: 'Mobile Email'
        });
        emailField.isMandatory = true;

        /* GET EXISTING EMPLOYEE VALUES */
        var accessToMobile = empRec.getValue({
            fieldId: 'custentity_hris_emp_accesstomobile'
        });
        var mobileUsername = empRec.getValue({
            fieldId: 'custentity_hris_mobile_user_name'
        });
        var mobileEmail = empRec.getValue({
            fieldId: 'custentity_hris_empmobileemail'
        });
        var employeeEmail = empRec.getValue({
            fieldId: 'email'
        });

        /* SET DEFAULT VALUES */
        accessField.defaultValue = accessToMobile ? 'T' : 'F';
        usernameField.defaultValue = mobileUsername || '';

        /* EMAIL DEFAULT LOGIC */
        if (mobileEmail) {
            emailField.defaultValue = mobileEmail;
        } else if (employeeEmail) {
            emailField.defaultValue = employeeEmail;
        } else {
            emailField.defaultValue = '';
        }

        /* SUBMIT BUTTON */
        form.addSubmitButton({
            label: 'Submit To Mobile API'
        });

        /* CLIENT SCRIPT */
        form.clientScriptModulePath = './access to mobile suitelet screen cs.js';

        /* WRITE FORM */
        context.response.writePage(form);
        log.debug('Suitelet Loaded', 'Employee : ' + empId);
    }

    function handlePost(context) {
        /* GET FORM VALUES */
        var empId = context.request.parameters.custpage_employee_source;
        var accessToMobile = context.request.parameters.custpage_access_to_mobile === 'T';
        var mobileUsername = context.request.parameters.custpage_mobile_username;
        var mobilePassword = context.request.parameters.custpage_mobile_password;
        var mobileEmail = context.request.parameters.custpage_mobile_email;

        /* VALIDATION */
        if (!empId || (accessToMobile && (!mobileUsername || !mobilePassword || !mobileEmail))) {
            var validationError =
                '<html><body style="font-family:Arial;text-align:center;padding:50px;background:#f8d7da;">' +
                '<h2 style="color:red;">FAILED</h2>' +
                '<p>Username, Password and Email are mandatory when Access To Mobile is enabled.</p>' +
                '<script>setTimeout(function(){window.close();},1500);</script>' +
                '</body></html>';
            context.response.write(validationError);
            return;
        }

        /* DYNAMIC TOKEN RETRIEVAL */
        var token = "";
        try {
            var authData = {
                "email": "elevate@gmail.com",
                "password": "elevate@123"
            };

            var authResponse = https.post({
                url: "https://mobapp.nijatech.com:5612/api/netsuite/gettoken",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(authData)
            });

            if (authResponse.code === 200) {
                var authBody = JSON.parse(authResponse.body);
                token = authBody.token || authBody.jwtoken;
            }
        } catch (e) {
            log.error('Authentication Error', e.message);
        }

        if (!token) {
            var tokenError =
                '<html><body style="font-family:Arial;text-align:center;padding:50px;background:#f8d7da;">' +
                '<h2 style="color:red;">FAILED</h2>' +
                '<p>Authentication failed with the mobile server.</p>' +
                '<script>setTimeout(function(){window.close();},1500);</script>' +
                '</body></html>';
            context.response.write(tokenError);
            return;
        }

        /* CREATE JSON PAYLOAD */
        var jsonData = {
            nsId: parseInt(empId),
            mobileemail: mobileEmail || "",
            mobileusername: mobileUsername || "",
            mobilepassword: mobilePassword || "",
            mobileaccess: accessToMobile
        };

        /* API CALL */
        var apiResponse = https.post({
            url: 'https://mobapp.nijatech.com:5612/api/netsuite/updatelogindetails',
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        });

        /* UPDATE NETSUITE RECORD FIELDS */
        try {
            var updateValues = {
                'custentity_hris_emp_accesstomobile': accessToMobile,
                'custentity_hris_mobile_user_name': mobileUsername,
                'custentity_hris_empmobileemail': mobileEmail
            };

            // Store response status in the response field
            if (apiResponse.code === 200) {
                updateValues['custentity_hris_access_to_mobile_respons'] = "Success";
            } else {
                updateValues['custentity_hris_access_to_mobile_respons'] = apiResponse.body.substring(0, 300);
            }

            // Perform the update
            record.submitFields({
                type: record.Type.EMPLOYEE,
                id: empId,
                values: updateValues
            });
            log.debug('Record Updated', 'Fields updated for Employee: ' + empId);
            
        } catch (e) {
            log.error('Record Update Error', e.message);
        }

        /* SUCCESS RESPONSE HANDLING */
        if (apiResponse.code === 200) {
            var currentUser = runtime.getCurrentUser();

            /* SEND EMAIL NOTIFICATION */
            if (accessToMobile) {
                var emailBody =
                    'Dear Employee,<br><br>' +
                    'Your ESS Mobile login credentials have been created successfully.<br><br>' +
                    '<b>Mobile Login Details</b><br>' +
                    'Username : <b>' + mobileUsername + '</b><br>' +
                    'Password : <b>' + mobilePassword + '</b><br><br>' +
                    'You can login using the ESS Mobile App.<br><br>' +
                    'Please keep this password confidential.<br><br>' +
                    'Regards,<br>' +
                    currentUser.name;

                email.send({
                    author: currentUser.id,
                    recipients: mobileEmail,
                    subject: 'ESS Mobile Login Credentials',
                    body: emailBody
                });
            }

            var successMessage =
                '<html><body style="font-family:Arial;text-align:center;padding:50px;background:#d4edda;">' +
                '<h2 style="color:green;">SUCCESS</h2>' +
                '<p>Data updated successfully in NetSuite and Mobile Server.</p>' +
                '<script>window.close();</script>' +
                '</body></html>';
            context.response.write(successMessage);

        } else {
            /* FAILED RESPONSE HANDLING */
            var failMessage =
                '<html><body style="font-family:Arial;text-align:center;padding:50px;background:#f8d7da;">' +
                '<h2 style="color:red;">FAILED</h2>' +
                '<p>Update failed on Mobile Server: ' + apiResponse.body + '</p>' +
                '<p>Note: NetSuite fields have been updated with your form values.</p>' +
                '<script>setTimeout(function(){window.close();},3000);</script>' +
                '</body></html>';
            context.response.write(failMessage);
        }
    }

    return {
        onRequest: onRequest
    };

});