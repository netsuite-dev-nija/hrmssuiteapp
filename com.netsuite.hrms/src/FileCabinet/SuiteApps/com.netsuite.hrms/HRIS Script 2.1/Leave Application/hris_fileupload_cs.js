/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/url', 'N/https', 'N/runtime', 'N/log'],
    (currentRecord, url, https, runtime, log) => {

        let g_Type = '';

        /**
         * pageInit
         */
        const pageInit = (context) => {
            g_Type = context.mode;

            // Very important: expose functions to window so Suitelet popup can call them
            window.setFileOptimized = setFileOptimized;
            window.folderDoesNotExist = folderDoesNotExist;
        };

        /**
         * validateDelete
         */
        const validateDelete = (context) => {
            try {
                const rec = context.currentRecord;
                const sublistId = context.sublistId;

                if (sublistId === 'recmachcustrecord_exp_link') {
                    const fileUploadId = rec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_attach_file'
                    });

                    if (isValid(fileUploadId)) {
                        const deleteUrl = url.resolveScript({
                            scriptId: 'customscript_hris_ess_deletefile_v21_sl',
                            deploymentId: 'customdeploy_hris_ess_deletefile_v21_sl',
                            params: {
                                entity: fileUploadId
                            }
                        });
                        https.get({ url: deleteUrl });
                    }
                }
            } catch (e) {
                log.error('validateDelete Error', e);
            }
            return true;
        };

        /**
         * fieldChanged
         */
        const fieldChanged = (context) => {
            try {
                const rec = context.currentRecord;
                const name = context.fieldId;

                const recordType = rec.type;
                let folderName = '';

                if (recordType === 'customrecord_hris_leaveapplication') {
                    folderName = 'ELS Support Document';
                }

                // Attach Document checkbox
                if (name === 'custrecord_hris_lve_attachdocument') {

                    const attachFileField = 'custrecord_hris_lve_supportdocument';
                    const isChecked = rec.getValue({ fieldId: name });

                    if (isChecked === true || isChecked === 'T') {
                        // Open upload popup
                        fileUploadOptimized(
                            recordType,
                            name,                    // changedFldID
                            attachFileField,         // attchFldID
                            false,
                            '',
                            folderName
                        );
                    } else {
                        // Unchecked → delete file
                        const fileId = rec.getValue({ fieldId: attachFileField });

                        if (isValid(fileId)) {
                            const deleteUrl = url.resolveScript({
                                scriptId: 'customscript_hris_ess_deletefile_v21_sl',
                                deploymentId: 'customdeploy_hris_ess_deletefile_v21_sl',
                                params: {
                                    entity: fileId
                                }
                            });

                            https.get({ url: deleteUrl });

                            rec.setValue({
                                fieldId: attachFileField,
                                value: '',
                                ignoreFieldChange: true
                            });
                        }
                    }
                }

            } catch (e) {
                log.error('fieldChanged Error', e);
            }
        };

        /**
         * Open upload popup
         */
        const fileUploadOptimized = (recType, changedFldID, attchFldID, isLineFld, machineNm, folderNmPrefix) => {
            try {
                const rec = currentRecord.get();
                let fileUploadId = '';

                if (isLineFld === true) {
                    fileUploadId = rec.getCurrentSublistValue({
                        sublistId: machineNm,
                        fieldId: attchFldID
                    });
                } else {
                    fileUploadId = rec.getValue({ fieldId: attchFldID });
                }

                const winURL = url.resolveScript({
                    scriptId: 'customscript_hris_ess_uploadfile_v21_sl',
                    deploymentId: 'customdeploy_hris_ess_uploadfile_v21_sl',
                    params: {
                        recType: recType,
                        attachFldNm: attchFldID,
                        changedFldNm: changedFldID,
                        fileUploadId: fileUploadId || '',
                        machineNm: machineNm || '',
                        isLineFld: isLineFld,
                        folderNmPrefix: folderNmPrefix || ''
                    }
                });

                nlExtOpenWindow(winURL, '', 450, 300, '', false, 'Upload File');

            } catch (e) {
                log.error('fileUploadOptimized Error', e);
                alert('Error opening file upload window: ' + e.message);
            }
        };

        /**
         * Called from Suitelet after successful upload
         * This function MUST be available on window
         */
        const setFileOptimized = (File_Id, type, attchFldID, fileExist, foldername, fileSize, fileType, changedFldID, machineNm, isLineFld) => {
            try {
                console.log('setFileOptimized received:', {
                    File_Id, attchFldID, changedFldID, isLineFld
                });

                const rec = currentRecord.get();

                // Set Support Document field
                if (attchFldID) {
                    rec.setValue({
                        fieldId: attchFldID,
                        value: File_Id,
                        ignoreFieldChange: true
                    });
                }

                // Uncheck the Attach Document checkbox
                if (changedFldID) {
                    rec.setValue({
                        fieldId: changedFldID,
                        value: false,
                        ignoreFieldChange: true
                    });
                }

                // Close popup
                if (typeof closePopup === 'function') {
                    closePopup();
                } else {
                    window.close();
                }

            } catch (e) {
                console.error('setFileOptimized Error', e);
                alert('Error setting file: ' + e.message);
            }
        };

        /**
         * Called when folder does not exist
         */
        const folderDoesNotExist = () => {
            alert('Please Create Folder');
            if (typeof closePopup === 'function') {
                closePopup();
            } else {
                window.close();
            }
        };

        const isValid = (value) => {
            return value != null && value !== '' && value !== undefined && value !== 'undefined' && value !== 'NaN';
        };

        return {
            pageInit,
            validateDelete,
            fieldChanged,
            setFileOptimized,
            folderDoesNotExist,
            fileUploadOptimized
        };
    });