/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 */
define(['N/search', 'N/https', 'N/encode', 'N/file', 'N/log', 'N/runtime'], function(search, https, encode, file, log, runtime) {
    function execute(context) {
        var employeeId = runtime.getCurrentScript().getParameter({ name: 'custscript_employee_id' });
        log.debug('API Parameter', employeeId);

        var employeeSearchObj = search.create({
            type: "employee",
            filters: [
                ["internalid", "is", employeeId]
            ],
            columns: [
                search.createColumn({name: "internalid", label: "EmployeeHID"}),
                search.createColumn({
                   name: "internalid",
                   join: "CUSTRECORD_HRIS_EMP_LINK",
                   label: "DocumentHID"
                }),
                search.createColumn({
                   name: "custrecord_hris_emp_id_type",
                   join: "CUSTRECORD_HRIS_EMP_LINK",
                   label: "DocumentType"
                }),
                search.createColumn({
                   name: "custrecord_hris_id_no",
                   join: "CUSTRECORD_HRIS_EMP_LINK",
                   label: "DocumentNo"
                }),
                search.createColumn({
                   name: "custrecord_hris_attachment",
                   join: "CUSTRECORD_HRIS_EMP_LINK",
                   label: "FileName"
                })
                    ]
                  });

        var searchResultCount = employeeSearchObj.runPaged().count;
        log.debug("employeeSearchObj result count", searchResultCount);

        var employeeData = {
            EmployeeHID: null,
            Documents: []
        };

        employeeSearchObj.run().each(function(result) {
            if (!employeeData.EmployeeHID) {
                employeeData.EmployeeHID = parseInt(result.getValue({ name: 'internalid' }), 10);
            }

            var fileId = result.getValue({ name: 'custrecord_hris_attachment', join: 'CUSTRECORD_HRIS_EMP_LINK' });
            var fileName = result.getText({ name: 'custrecord_hris_attachment', join: 'CUSTRECORD_HRIS_EMP_LINK' });

            var fileObj = file.load({ id: fileId });
            log.debug("fileObj", fileObj);

            var fileContent = fileObj.getContents();
            log.debug("fileContent", fileContent);

            var encodedFileContent = encode.convert({
                string: fileContent,
                inputEncoding: encode.Encoding.BASE_64,
                outputEncoding: encode.Encoding.BASE_64
            });
            log.debug("encodedFileContent:", encodedFileContent);

            if (!encodedFileContent) {
                log.error("Failed to encode file content");
                return false;
            }

            var fileType = getFileTypeFromFileName(fileName);
            var fileSize = formatFileSize(fileObj.size);

            log.debug("Encoded File Content Length:", encodedFileContent.length);
            log.debug("File Size:", fileSize);

            employeeData.Documents.push({
                DocumentHID: parseInt(result.getValue({ name: 'internalid', join: 'CUSTRECORD_HRIS_EMP_LINK' }), 10),
                DocumentType: result.getText({ name: 'custrecord_hris_emp_id_type', join: 'CUSTRECORD_HRIS_EMP_LINK' }),
                DocumentNo: result.getValue({ name: 'custrecord_hris_id_no', join: 'CUSTRECORD_HRIS_EMP_LINK' }),
                FileData: encodedFileContent,
                FileName: fileName,
                FileType: fileType,
                FileSize: fileSize,
                Sync: 1
            });
            return true;
        });

        log.debug('Employee Data', JSON.stringify(employeeData));

        var fileContent = JSON.stringify(employeeData);

// Create a new file name based on the employee ID and a custom suffix
var newFileName = 'employee_' + employeeId + '_documentData.json';

// Save the employee data as a new text file in the File Cabinet
var newFile = file.create({
    name: newFileName,
    fileType: file.Type.PLAINTEXT,
    contents: fileContent,
    folder: 527 // Replace with your target folder internal ID
});

var newFileId = newFile.save();
log.debug("Document data saved with ID:", newFileId);

        var isValid = validateEmployeeData(employeeData);
        if (!isValid) {
            log.error('Validation Failed', 'Employee data is missing required fields');
            return;
        }

        var headers = {
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImhhbGFAZ21haWwuY29tIiwiaWF0IjoxNzIyMjQ2MDIwLCJleHAiOjE3NTM3ODIwMjB9.9zGSh8L2w2EjGOVCGrZDUQVb48wiJFs61yTC1RIGO1Q",
            "Content-Type": "application/json",
        };
        var url = "https://mobapp.nijatech.com:4000/api/fileupload/adddocument";

        var response = https.post({
            url: url,
            headers: headers,
            body: JSON.stringify(employeeData)
        });

        log.debug('API Response', response.body);

        var responseBody = JSON.parse(response.body);
        if (response.code === 200 && responseBody.Status === "Success") {
            log.audit('Success Response', responseBody.Message);
        } else {
            log.error('Failure Response', responseBody.Message);
        }
    }

    function getFileTypeFromFileName(fileName) {
        var fileType = fileName.substring(fileName.lastIndexOf('.')).toUpperCase();
        log.debug("FileType extracted", fileType);
        return fileType;
    }

    function formatFileSize(size) {
        if (size < 1024) return size + ' bytes';
        else if (size < 1048576) return (size / 1024).toFixed(2) + ' KB';
        else if (size < 1073741824) return (size / 1048576).toFixed(2) + ' MB';
        else return (size / 1073741824).toFixed(2) + ' GB';
    }

    function validateEmployeeData(data) {
        if (!data.EmployeeHID) {
            log.error('Validation Error', 'Missing EmployeeHID');
            return false;
        }
        for (var i = 0; i < data.Documents.length; i++) {
            var doc = data.Documents[i];
            if (!doc.DocumentHID || !doc.DocumentType || !doc.DocumentNo || !doc.FileData || !doc.FileName) {
                log.error('Validation Error', 'Missing document fields: ' + JSON.stringify(doc));
                return false;
            }
        }
        return true;
    }

    return {
        execute: execute
    };
});
