/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/https', 'N/file', 'N/log', 'N/encode'], function(https, file, log, encode) {

    function execute(context) {
        try {
            // Define the API endpoint and token
            var url = 'https://mobapp.nijatech.com:4000/api/netsuite/viewleave';
            var token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImhhbGFAZ21haWwuY29tIiwiaWF0IjoxNzIyMjQ2MDIwLCJleHAiOjE3NTM3ODIwMjB9.9zGSh8L2w2EjGOVCGrZDUQVb48wiJFs61yTC1RIGO1Q';

            // Make the POST request
            var response = https.post({
                url: url,
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (response.code === 200) {
                var responseData = JSON.parse(response.body);

                // Process each leave application in the response
                responseData.message.forEach(function(leaveApp) {
                    // Process each attachment in the leave application
                    leaveApp.attachment.forEach(function(document) {
                        var fileName = document.FileName;
                        var fileData = document.FileData; // Assume this is base64 encoded
                        var fileType = document.FileType;

                        log.debug("Processing File", "Name: " + fileName + ", Type: " + fileType);

                        // Create the file in NetSuite using base64 data directly
                        try {
                            var fileObj = file.create({
                                name: fileName,
                                fileType: getFileType(fileType),
                                contents: fileData, // Keep base64-encoded data as contents
                                encoding: file.Encoding.BASE_64, // Ensure it's recognized as base64
                                folder: 527 // Replace with your target folder's internal ID
                            });

                            var fileId = fileObj.save();
                            log.debug('File Created', 'File ID: ' + fileId + ' File Name: ' + fileName);
                        } catch (e) {
                            log.error('File Creation Error', 'File Name: ' + fileName + ' Error: ' + e.message);
                        }
                    });
                });
            } else {
                log.error('Request Failed', 'Response Code: ' + response.code + ' Body: ' + response.body);
            }

        } catch (e) {
            log.error('Error', e.message);
        }
    }

    // Helper function to map file extensions to NetSuite file types
    function getFileType(fileExtension) {
        switch (fileExtension.toLowerCase()) {
            case '.pdf':
                return file.Type.PDF;
            case '.jpg':
            case '.jpeg':
                return file.Type.JPGIMAGE;
            case '.png':
                return file.Type.PNGIMAGE;
            case '.doc':
            case '.docx':
                return file.Type.WORD;
            case '.xls':
            case '.xlsx':
                return file.Type.EXCEL;
            default:
                return file.Type.PLAINTEXT; // Default to text if type is unknown
        }
    }

    return {
        execute: execute
    };

});
