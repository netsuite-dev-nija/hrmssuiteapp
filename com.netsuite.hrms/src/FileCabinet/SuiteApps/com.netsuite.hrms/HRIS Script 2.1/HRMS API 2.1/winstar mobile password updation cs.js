/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/url', 'N/currentRecord'], function (url, currentRecord) {
    
    function pageInit(context) {
        // Optional: Initialize any page setup
    }

    function openMobilePasswordSuitelet(empId) {
        try {
            // Get Suitelet URL with employee ID parameter
            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_hirs_mobile_password_updati',  // Your Suitelet script ID
                deploymentId: 'customdeploy_hirs_mobile_password_updati',  // Your deployment ID
                params: {
                    'empid': empId
                },
                returnExternalUrl: false
            });

            // Calculate screen dimensions for perfect centering
            var screenWidth = screen.availWidth;
            var screenHeight = screen.availHeight;
            var popupWidth = 520;   // Fixed nice width
            var popupHeight = 680;  // Fixed nice height
            var leftPos = (screenWidth - popupWidth) / 2;
            var topPos = (screenHeight - popupHeight) / 2;

            // Professional centered popup with modern features
            var popup = window.open(
                suiteletUrl, 
                'MobilePasswordPopup',
                'width=' + popupWidth + 
                ',height=' + popupHeight + 
                ',left=' + leftPos + 
                ',top=' + topPos +
                ',scrollbars=yes,' +
                'resizable=yes,' +
                'status=no,' +
                'toolbar=no,' +
                'menubar=no,' +
                'location=no,' +
                'directories=no'
            );

            // Focus on popup and prevent blocking
            if (popup) {
                popup.focus();
                console.log('✅ Mobile Password Suitelet opened successfully for Employee ID: ' + empId);
            } else {
                alert('Please allow popups for this site to open Mobile Password window');
            }

        } catch (error) {
            console.error('❌ Error opening Suitelet:', error);
            alert('Error opening Mobile Password window: ' + error.message);
        }
    }

    return {
        pageInit: pageInit,
        openMobilePasswordSuitelet: openMobilePasswordSuitelet
    };
});
