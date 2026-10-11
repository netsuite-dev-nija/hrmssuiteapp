/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */

// Define the required NetSuite modules: log for debugging, record for loading/saving, error for standard errors
define(['N/log', 'N/record', 'N/error'], 
function(log, record, error) {

    // Define the main POST function that will trigger when an external system sends data to this RESTlet
    function post(context) {
        try {
            // Log the raw input payload data received by the RESTlet to help with debugging
            log.debug('RESTlet POST - Input Data', JSON.stringify(context));
            
            // Extract the Employee ID from the incoming JSON payload
            var empId = context.empId;
            
            // Extract the mobile password from the incoming JSON payload
            var mobilePassword = context.mobilePassword;
            
            // Log the extracted parameters, masking the password so it doesn't show in plain text in the logs
            log.debug('Received Parameters', {
                empId: empId,
                mobilePassword: mobilePassword ? '***MASKED***' : null
            });
            
            // Check if either empId or mobilePassword is empty, null, or undefined
            if (!empId || !mobilePassword) {
                // If missing, stop the script immediately and return a failure response
                return {
                    success: false,
                    message: 'Missing required parameters: empId and mobilePassword'
                };
            }
            
            // Load the standard NetSuite Employee record using the provided employee ID
            var employeeRecord = record.load({
                type: record.Type.EMPLOYEE, // Specifies we are loading an Employee record
                id: empId,                  // The internal ID passed from the payload
                isDynamic: false            // Load in standard mode (faster than dynamic mode)
            });
            
            // Log a success message indicating the Employee record was found and loaded into memory
            log.debug('Employee Record Loaded Successfully', 'Employee ID: ' + empId);
            
            // Set the value of the first custom mobile password field
            employeeRecord.setValue({
                fieldId: 'custentity_hris_mobile_password',
                value: mobilePassword
            });
            
            // Set the value of the second custom mobile password field
            employeeRecord.setValue({
                fieldId: 'custentity_hris_ent_password_mobile', // Ensure this ID exactly matches NetSuite
                value: mobilePassword
            });
            
            // Log that the new password values have been updated in the system's memory
            log.debug('Passwords Set', 'Both password fields updated in memory for Employee ID: ' + empId);
            
            // Save the Employee record back to the NetSuite database
            var savedRecordId = employeeRecord.save({
                enableSourcing: false,       // Do not run sourcing logic (saves the record much faster)
                ignoreMandatoryFields: true  // Bypass mandatory field checks so the save doesn't fail on empty required fields
            });
            
            // Create an audit-level log to permanently record that this employee's password was successfully changed
            log.audit('Employee Record Saved Successfully', {
                recordId: savedRecordId,
                empId: empId,
                passwordUpdated: true
            });
            
            // Return a success JSON response back to the external system that called this RESTlet
            return {
                success: true,
                message: 'Employee mobile password updated successfully',
                recordId: savedRecordId,
                empId: empId,
                timestamp: new Date().toISOString() // Attach a standard timestamp of when it finished
            };
            
        } catch (e) {
            // If any error occurs inside the try block (like invalid ID, permission error, etc.), catch it here
            
            // Log the exact error details, message, and stack trace to NetSuite Script Execution Logs
            log.error('RESTlet POST Error', {
                message: e.message,
                stack: e.stack || 'No stack trace',
                inputData: JSON.stringify(context)
            });
            
            // Return a clean failure response back to the external system with the error message
            return {
                success: false,
                message: 'Server error: ' + e.message,
                errorCode: 'INTERNAL_ERROR'
            };
        }
    }
    
    // Expose the 'post' function to the NetSuite RESTlet framework so it knows which function to execute
    return {
        post: post
    };
});