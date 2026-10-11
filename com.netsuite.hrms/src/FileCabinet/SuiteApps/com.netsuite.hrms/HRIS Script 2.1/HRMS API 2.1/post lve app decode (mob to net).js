/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/https', 'N/file', 'N/log', 'N/encode', 'N/runtime'], function(https, file, log, encode, runtime) {

    function postRequest(data) {
        var result = {
            success: true,
            createdRecords: [],
            failedRecords: []
        };

        var baseUrl = 'https://11951030.app.netsuite.com'; // Base URL for file access
        
        try {
            if (data && data.attachment && Array.isArray(data.attachment)) {
                data.attachment.forEach(function(document) {
                    try {
                        var fileName = document.FileName;
                        var fileData = document.FileData;
                        var fileType = document.FileType;
                        log.debug("fileName", fileName);
                        log.debug("fileType", fileType);

                        // Create the file in NetSuite with base64-encoded content
                        var fileObj = file.create({
                            name: fileName,
                            fileType: getFileType(fileType),
                            contents: fileData, // Use the base64 encoded data directly
                            encoding: file.Encoding.BASE_64, // Specify the encoding as BASE_64
                            folder: 1163,// Replace with your target folder's internal ID 
                            isOnline: true 
                            
                        });

                        var fileId = fileObj.save();
                        log.debug('File Created', 'File ID: ' + fileId + ' File Name: ' + fileName);

                        // Fetch the file object again after saving to get the URL
                        var savedFile = file.load({
                            id: fileId
                        });

                        // Construct the full file URL
                        var fileUrl = baseUrl + savedFile.url; // Create the full URL
                        log.debug('File URL', fileUrl);

                        // Add the created file info to the result object
                        result.createdRecords.push({
                            fileInternalID: fileId || null,  // File internal ID (null if no file)
                            fileUrl: fileUrl || null         // Full file URL (null if no file)
                        });
                        
                    } catch (e) {
                        log.error("Error Creating File", e.message);
                        result.failedRecords.push({
                            error: e.message
                        });
                        result.success = false;
                    }
                });
            } else {
                throw new Error("No valid attachment data provided.");
            }
        } catch (e) {
            log.error("Error Processing Request", e.message);
            result.success = false;
            result.error = e.message;
        }

        return result;
    }

    // Helper function to map file extensions to NetSuite file types
    /* function getFileType(fileExtension) {
        switch (fileExtension.toLowerCase()) {
            case 'pdf':
                return file.Type.PDF;
            case 'jpg':
            case 'jpeg':
                return file.Type.JPGIMAGE;
            case 'png':
                return file.Type.PNGIMAGE;
            case 'doc':
            case 'docx':
                return file.Type.WORD;
            case 'xls':
            case 'xlsx':
                return file.Type.EXCEL;
            default:
                return file.Type.PLAINTEXT; // Default to text if type is unknown
        }
    } */
function getFileType(fileExtension) {
    switch (fileExtension.toLowerCase()) {
        case 'pdf':
            return file.Type.PDF;
        case 'jpg':
        case 'jpeg':
            return file.Type.JPGIMAGE;  // Handling both .jpg and .jpeg
        case 'png':
            return file.Type.PNGIMAGE;
        case 'doc':
        case 'docx':
            return file.Type.WORD;
        case 'xls':
        case 'xlsx':
            return file.Type.EXCEL;
        default:
            return file.Type.PLAINTEXT; // Default to text if type is unknown
    }
}


  
    return {
        post: postRequest
    };

});
