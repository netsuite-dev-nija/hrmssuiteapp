/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/file', 'N/search', 'N/record', 'N/log', 'N/runtime'],
    (serverWidget, file, search, record, log, runtime) => {

        const onRequest = (context) => {
            const request = context.request;
            const response = context.response;

            // =====================================================
            // GET – Show Upload Form
            // =====================================================
            if (request.method === 'GET') {
                try {
                    const recType        = request.parameters.recType || '';
                    const attchFldID     = request.parameters.attachFldNm || '';
                    const File_ID        = request.parameters.fileUploadId || request.parameters.i_File_Upload_Id || '';
                    const machineNm      = request.parameters.machineNm || '';
                    const isLineFld      = request.parameters.isLineFld || '';
                    const changedFldNm   = request.parameters.changedFldNm || '';
                    const folderNmPrefix = request.parameters.folderNmPrefix || '';

                    log.debug('GET Parameters', {
                        recType, attchFldID, File_ID, machineNm, isLineFld, changedFldNm, folderNmPrefix
                    });

                    const form = serverWidget.createForm({
                        title: 'Upload a File',
                        hideNavBar: true
                    });

                    // ---------- Hidden Fields ----------
                    form.addField({
                        id: 'custpage_islineidfieldid',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Is Line Field'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    }).defaultValue = isLineFld;

                    form.addField({
                        id: 'custpage_machinefieldid',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Machine Name'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    }).defaultValue = machineNm;

                    form.addField({
                        id: 'custpage_changedfieldid',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Changed Field ID'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    }).defaultValue = changedFldNm;

                    form.addField({
                        id: 'custpage_attachfieldid',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Attach Field ID'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    }).defaultValue = attchFldID;

                    form.addField({
                        id: 'custpage_fileid',
                        type: serverWidget.FieldType.TEXT,
                        label: 'File ID'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    }).defaultValue = File_ID;

                    form.addField({
                        id: 'custpage_rectype',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Record Type'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    }).defaultValue = recType;

                    // ---------- Visible Fields (Vertical Layout - No Scrollbar) ----------
                    const renameField = form.addField({
                        id: 'custpage_renamefileid',
                        type: serverWidget.FieldType.TEXT,
                        label: 'File Name (optional)'
                    });
                    renameField.updateBreakType({
                        breakType: serverWidget.FieldBreakType.STARTROW
                    });

                    const fileField = form.addField({
                        id: 'custpage_file',
                        type: serverWidget.FieldType.FILE,
                        label: 'Select File'
                    });
                    fileField.isMandatory = true;
                    fileField.updateBreakType({
                        breakType: serverWidget.FieldBreakType.STARTROW
                    });

                    const folderField = form.addField({
                        id: 'custpage_folder',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Folder'
                    });
                    folderField.isMandatory = true;
                    folderField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });
                    folderField.updateBreakType({
                        breakType: serverWidget.FieldBreakType.STARTROW
                    });

                    // Load the folder
                    if (folderNmPrefix) {
                        const folderSearch = search.create({
                            type: search.Type.FOLDER,
                            filters: [
                                ['name', 'is', folderNmPrefix]
                            ],
                            columns: ['name', 'internalid']
                        }).run().getRange({ start: 0, end: 1 });

                        if (folderSearch && folderSearch.length > 0) {
                            folderField.addSelectOption({
                                value: folderSearch[0].id,
                                text: folderSearch[0].getValue({ name: 'name' })
                            });
                        }
                    }

                    form.addSubmitButton({
                        label: 'Upload'
                    });

                    response.writePage(form);

                } catch (e) {
                    log.error('GET Error', e);
                    response.write('Error loading upload form: ' + e.message);
                }
            }

            // =====================================================
            // POST – Process Upload
            // =====================================================
            if (request.method === 'POST') {
                try {
                    const attachfieldid  = request.parameters.custpage_attachfieldid;
                    const changedfieldid = request.parameters.custpage_changedfieldid;
                    const machinefieldid = request.parameters.custpage_machinefieldid;
                    const fieldIdLine    = request.parameters.custpage_islineidfieldid;
                    const File_ID        = request.parameters.custpage_fileid;
                    const file_name      = request.parameters.custpage_renamefileid;
                    const rec_type       = request.parameters.custpage_rectype;
                    const folderId       = request.parameters.custpage_folder;

                    log.debug('POST Parameters', {
                        attachfieldid, changedfieldid, folderId, File_ID
                    });

                    // Delete old file if exists
                    if (isValid(File_ID)) {
                        try {
                            file.delete({ id: File_ID });
                            log.debug('Old file deleted', File_ID);
                        } catch (e) {
                            log.error('Error deleting old file', e);
                        }
                    }

                    // Folder not found
                    if (!isValid(folderId)) {
                        response.write(`
                            <html>
                                <head><title>Upload Failed</title></head>
                                <body>
                                    <script>
                                        if (parent && typeof parent.folderDoesNotExist === 'function') {
                                            parent.folderDoesNotExist();
                                        } else {
                                            alert('Please create the required folder first.');
                                            window.close();
                                        }
                                    </script>
                                </body>
                            </html>
                        `);
                        return;
                    }

                    // Get uploaded file
                    const uploadedFile = request.files.custpage_file;

                    if (!uploadedFile) {
                        throw new Error('No file was uploaded');
                    }

                    // Rename if user provided a custom name
                    let finalFileName = uploadedFile.name;
                    if (isValid(file_name)) {
                        const ext = finalFileName.split('.').pop();
                        finalFileName = file_name.trim() + '.' + ext;
                        uploadedFile.name = finalFileName;
                    }

                    uploadedFile.folder = parseInt(folderId, 10);
                    uploadedFile.isOnline = true;

                    const fileId = uploadedFile.save();
                    log.audit('File Uploaded Successfully', 'File ID: ' + fileId);

                    // Get folder name
                    let foldername = '';
                    try {
                        const folderRec = record.load({
                            type: record.Type.FOLDER,
                            id: folderId
                        });
                        foldername = folderRec.getValue({ fieldId: 'name' }) || '';
                    } catch (e) {
                        log.error('Error loading folder name', e);
                    }

                    const fileSize = uploadedFile.size || 0;
                    const fileType = uploadedFile.fileType || '';

                    // Callback to parent window
                    response.write(`
                        <html>
                            <head><title>Upload Successful</title></head>
                            <body>
                                <script type="text/javascript">
                                    try {
                                        if (parent && typeof parent.setFileOptimized === 'function') {
                                            parent.setFileOptimized(
                                                "${fileId}",
                                                "${rec_type}",
                                                "${attachfieldid}",
                                                "0",
                                                "${foldername}",
                                                "${fileSize}",
                                                "${fileType}",
                                                "${changedfieldid}",
                                                "${machinefieldid}",
                                                "${fieldIdLine}"
                                            );
                                        } else {
                                            alert('File uploaded successfully.\\nFile ID: ${fileId}');
                                            window.close();
                                        }
                                    } catch (err) {
                                        alert('File uploaded but could not set value on form.\\nFile ID: ${fileId}');
                                        window.close();
                                    }
                                </script>
                            </body>
                        </html>
                    `);

                } catch (e) {
                    log.error('POST Error', e);
                    response.write(`
                        <html>
                            <head><title>Upload Failed</title></head>
                            <body>
                                <script>
                                    alert('Upload failed: ${e.message || e}');
                                    window.close();
                                </script>
                            </body>
                        </html>
                    `);
                }
            }
        };

        const isValid = (value) => {
            return value !== null && value !== undefined && value !== '' && value !== 'undefined' && value !== 'NaN';
        };

        return {
            onRequest
        };
    });