/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define(['N/currentRecord'], function(currentRecord) {

    /* =========================================
       PAGE INIT
    ========================================= */

    function pageInit(context){

        var rec = currentRecord.get();

        var access = rec.getValue({
            fieldId:'custpage_access_to_mobile'
        });

        /* Apply mandatory logic */

        applyMandatory(access);

        /* IMPORTANT: Generate password on page load */

        if(access === true){

            var randomPassword = generatePassword(10);

            rec.setValue({
                fieldId:'custpage_mobile_password',
                value: randomPassword
            });

        }
      setMandatory(rec);

    }

    /* =========================================
       FIELD CHANGE
    ========================================= */

    function fieldChanged(context){

        if(context.fieldId === 'custpage_access_to_mobile'){

            var rec = currentRecord.get();

            var access = rec.getValue({
                fieldId:'custpage_access_to_mobile'
            });

            applyMandatory(access);

            /* Generate password when checkbox checked */

            if(access === true){

                var randomPassword = generatePassword(10);

                rec.setValue({
                    fieldId:'custpage_mobile_password',
                    value: randomPassword
                });

            }else{

                /* Clear password if unchecked */

                rec.setValue({
                    fieldId:'custpage_mobile_password',
                    value:''
                });

            }

        }
      if(context.fieldId === 'custpage_access_to_mobile'){

var rec = currentRecord.get();

setMandatory(rec);

}

    }

    /* =========================================
       MANDATORY LOGIC
    ========================================= */

    function applyMandatory(access){

        var usernameField = document.getElementById('custpage_mobile_username');
        var passwordField = document.getElementById('custpage_mobile_password');
        var emailField = document.getElementById('custpage_mobile_email');

        if(access === true){

            if(usernameField) usernameField.required = true;
            if(passwordField) passwordField.required = true;
            if(emailField) emailField.required = true;

        }
        else{

            if(usernameField) usernameField.required = false;
            if(passwordField) passwordField.required = false;
            if(emailField) emailField.required = false;

        }

    }
  function setMandatory(rec){

var access = rec.getValue('custpage_access_to_mobile');

var usernameField = rec.getField({ fieldId:'custpage_mobile_username' });
var passwordField = rec.getField({ fieldId:'custpage_mobile_password' });
var emailField = rec.getField({ fieldId:'custpage_mobile_email' });

if(access){

usernameField.isMandatory = true;
passwordField.isMandatory = true;
emailField.isMandatory = true;

}else{

usernameField.isMandatory = false;
passwordField.isMandatory = false;
emailField.isMandatory = false;

}

}

    /* =========================================
       RANDOM PASSWORD GENERATOR
    ========================================= */

    function generatePassword(length){

        var chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"+
        "abcdefghijklmnopqrstuvwxyz"+
        "0123456789"+
        "!@#$%^&*";

        var password = "";

        for(var i=0;i<length;i++){

            password += chars.charAt(
                Math.floor(Math.random()*chars.length)
            );

        }

        return password;

    }

    /* =========================================
       RETURN
    ========================================= */

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    };

});