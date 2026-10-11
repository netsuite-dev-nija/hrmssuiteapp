/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @Description Consolidated Client Script for Employee Record combining Employee Validation, File Upload Popup, Legal Name Set, Holiday Sourcing, and ESIC Verification.
 */
define([
    'N/search',
    'N/log',
    'N/runtime',
    'N/url',
    'N/https',
    'N/ui/dialog',
    'N/format',
    'N/currentRecord'
], (search, log, runtime, urlModule, httpsModule, dialog, format, currentRecordModule) => {

    let g_Type = "";

    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - Mode in which the record is loaded ('create', 'edit', etc.)
     */
    const pageInit = (scriptContext) => {
        try {
            const currentRec = scriptContext.currentRecord;
            g_Type = scriptContext.mode;
            log.debug('pageInit mode', scriptContext.mode);

            const customForm = currentRec.getValue({ fieldId: 'customform' });
            log.debug('customform', customForm);

            // Handle Employee Check Toggle (Legal Name Set logic)
            if (String(customForm) === '776') {
                const employeeCheck = currentRec.getValue({ fieldId: 'custentity_hris_emp_employeecheck' });
                log.debug('Employee check', employeeCheck);
                currentRec.setValue({ fieldId: 'custentity_hris_emp_employeecheck', value: true });
            } else {
                const employeeCheck = currentRec.getValue({ fieldId: 'custentity_hris_emp_employeecheck' });
                log.debug('Employee check', employeeCheck);
                currentRec.setValue({ fieldId: 'custentity_hris_emp_employeecheck', value: false });
            }
        } catch (e) {
            log.error('Error in pageInit', e.message || e);
        }
    };

    /**
     * Function to be executed when a field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.line - Line number (1-indexed)
     * @param {number} scriptContext.column - Column number
     */
    const fieldChanged = (scriptContext) => {
        debugger;
        try {
            const currentRec = scriptContext.currentRecord;
            const sublistId = scriptContext.sublistId;
            const fieldId = (scriptContext.fieldId || '').trim();
            const customForm = currentRec.getValue({ fieldId: 'customform' });

            // 1. File Upload Sublist Field Trigger
            if (sublistId === 'recmachcustrecord_hris_emp_supp_doc_employee_li' && fieldId === 'custrecord_hris_emp_supp_doc_click_here') {
                const s_folder_name = 'Employee Support Document';
                const s_fld_attach_file = 'custrecord_hris_emp_supp_doc_supporting';
                const s_sublist_id = 'recmachcustrecord_hris_emp_supp_doc_employee_li';

                const b_attachFile = currentRec.getCurrentSublistValue({
                    sublistId: s_sublist_id,
                    fieldId: fieldId
                });

                if (b_attachFile === true || b_attachFile === 'T') {
                    fileUploadOptimized(currentRec.type, fieldId, s_fld_attach_file, true, s_sublist_id, s_folder_name, currentRec);
                } else {
                    const i_File_Upload_Id = currentRec.getCurrentSublistValue({
                        sublistId: s_sublist_id,
                        fieldId: s_fld_attach_file
                    });

                    if (_logValidation(i_File_Upload_Id)) {
                        const urlStr = urlModule.resolveScript({
                            scriptId: 'customscript_hris_ess_deletefilecab_sl',
                            deploymentId: 'customdeploy_hris_ess_deletefilecab_sl',
                            params: { entity: i_File_Upload_Id }
                        });
                        httpsModule.get({ url: urlStr });
                        currentRec.setCurrentSublistValue({
                            sublistId: s_sublist_id,
                            fieldId: s_fld_attach_file,
                            value: '',
                            ignoreFieldChange: true
                        });
                    }
                }
            }

            // 2. Custom Form 776 Specific Triggers
            if (String(customForm) === '776') {

                // Legal Name Generation
                if (fieldId === 'custentity_hris_empfname' || fieldId === 'custentity_hris_empmname' || fieldId === 'custentity_hris_emplname') {
                    const firstName = currentRec.getValue({ fieldId: 'custentity_hris_empfname' }) || '';
                    const middleName = currentRec.getValue({ fieldId: 'custentity_hris_empmname' }) || '';
                    const lastName = currentRec.getValue({ fieldId: 'custentity_hris_emplname' }) || '';

                    const fullNameParts = [];
                    if (firstName) fullNameParts.push(firstName);
                    if (middleName) fullNameParts.push(middleName);
                    if (lastName) fullNameParts.push(lastName);

                    const fullName = fullNameParts.join(' ');

                    currentRec.setValue({ fieldId: 'firstname', value: firstName });
                    currentRec.setValue({ fieldId: 'middlename', value: middleName });
                    currentRec.setValue({ fieldId: 'lastname', value: lastName });
                    currentRec.setValue({ fieldId: 'custentity_hris_emplegalname', value: fullName });
                }

                // Probation Period & Job Confirmation Date Calculation
                if (fieldId === 'custentity_hris_empprobationperiod') {
                    const probationdaysText = currentRec.getText({ fieldId: 'custentity_hris_empprobationperiod' }) || '0';
                    const probationdays = parseInt(probationdaysText, 10) || 0;
                    const hireDate = currentRec.getValue({ fieldId: 'hiredate' });

                    if (hireDate) {
                        let jobdate;
                        if (hireDate instanceof Date) {
                            jobdate = new Date(hireDate.getTime());
                            jobdate.setDate(jobdate.getDate() + probationdays);
                        } else {
                            jobdate = format.parse({
                                value: hireDate,
                                type: format.Type.DATE
                            });
                            jobdate.setDate(jobdate.getDate() + probationdays);
                        }

                        currentRec.setValue({
                            fieldId: 'custentity_hris_empjobconfirmationdt',
                            value: jobdate,
                            ignoreFieldChange: true,
                            forceSyncSourcing: true
                        });
                    }
                }

                // Rotational Leave Category Enable/Disable
                if (fieldId === 'custentity_hris_emp_rotationalleave_appl') {
                    const rosterleave = currentRec.getValue({ fieldId: 'custentity_hris_emp_rotationalleave_appl' });
                    const rotationField = currentRec.getField({ fieldId: 'custentity_hris_emprotationlvecatagory' });

                    if (rotationField) {
                        if (rosterleave === true) {
                            rotationField.isDisabled = false;
                            rotationField.isMandatory = true;
                        } else {
                            rotationField.isDisabled = true;
                            rotationField.isMandatory = false;
                        }
                    }

                    currentRec.setValue({
                        fieldId: 'custentity_hris_emprotationlvecatagory',
                        value: '',
                        ignoreFieldChange: true,
                        forceSyncSourcing: true
                    });
                }

                // Access to Mobile Controls
                if (fieldId === 'custentity_hris_emp_accesstomobile') {
                    const accessmobile = currentRec.getValue({ fieldId: 'custentity_hris_emp_accesstomobile' });

                    const userField = currentRec.getField({ fieldId: 'custentity_hris_mobile_user_name' });
                    const passField = currentRec.getField({ fieldId: 'custentity_hris_mobile_password' });
                    const emailField = currentRec.getField({ fieldId: 'custentity_hris_empmobileemail' });

                    const isMobileAccess = (accessmobile === true);

                    if (userField) {
                        userField.isDisabled = !isMobileAccess;
                        userField.isMandatory = isMobileAccess;
                    }
                    if (passField) {
                        passField.isDisabled = !isMobileAccess;
                        passField.isMandatory = isMobileAccess;
                    }
                    if (emailField) {
                        emailField.isDisabled = !isMobileAccess;
                        emailField.isMandatory = isMobileAccess;
                    }
                }

                // Holiday Sourcing
                if (fieldId === 'custentity_hris_empworkinglocation' || fieldId === 'custentity_hris_empweeklyoffcriteria') {
                    const empRegion = currentRec.getValue({ fieldId: 'custentity_hris_empworkinglocation' });
                    const empWeekCriteria = currentRec.getValue({ fieldId: 'custentity_hris_empweeklyoffcriteria' });

                    if (empRegion && empWeekCriteria) {
                        const holidayList = searchHolidays(empRegion, empWeekCriteria);
                        currentRec.setValue({
                            fieldId: 'custentity_hris_empholidays',
                            value: holidayList
                        });
                    } else {
                        currentRec.setValue({
                            fieldId: 'custentity_hris_empholidays',
                            value: []
                        });
                    }
                }

                // Employee Job Status Confirmation Enablement
                if (fieldId === 'custentity_emp_employee_job_status') {
                    const empJobStatus = currentRec.getValue({ fieldId: 'custentity_emp_employee_job_status' });

                    if (String(empJobStatus) === '3') {
                        const jobConfirmationField = currentRec.getField({ fieldId: 'custentity_hris_empjobconfirmationdt' });
                        if (jobConfirmationField) {
                            jobConfirmationField.isDisabled = false;
                        }
                    }
                }

                // ESIC Check Verification
                if (fieldId === 'custentity_hris_isesiapplicable') {
                    const isEsicApplicable = currentRec.getValue({ fieldId: 'custentity_hris_isesiapplicable' });
                    log.debug("isEsicApplicable:", isEsicApplicable);
                    if (isEsicApplicable === false || isEsicApplicable === 'F') {
                        dialog.alert({
                            title: 'ESIC Validation Warning',
                            message: 'ESIC has to deducted till September or March. Verify Employee Salary details'
                        });
                    }
                }

            }
        } catch (e) {
            log.error('Error in fieldChanged', e.message || e);
        }
    };

    /**
     * Validation function executed when the record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid to save
     */
    const saveRecord = (scriptContext) => {
        try {
            const currentRec = scriptContext.currentRecord;
            const customForm = currentRec.getValue({ fieldId: 'customform' });

            // 1. Validation for Custom Form 776
            if (String(customForm) === '776') {
                const empStatus = currentRec.getValue({ fieldId: 'employeestatus' });
                if (String(empStatus) === '6' || String(empStatus) === '7') {
                    const dateLeaving = currentRec.getValue({ fieldId: 'custentity_hirs_empdol' });
                    if (!dateLeaving || dateLeaving === 'undefined') {
                        alert('Please enter the date of leaving of employee');
                        return false;
                    }
                }

                const ptCheck = currentRec.getValue({ fieldId: 'custentity_hris_emp_isptapplicable' });
                if (ptCheck === true || String(ptCheck) === 'T') {
                    const ptLoc = currentRec.getValue({ fieldId: 'custentity_hris_empptlocation' });
                    if (!ptLoc || ptLoc === 'undefined') {
                        alert('Please enter PT Location');
                        return false;
                    }
                }
            }
            // 2. Validation for Custom Form 776
            if (String(customForm) === '776') {
                const accessmobile = currentRec.getValue({ fieldId: 'custentity_hris_emp_accesstomobile' });
                if (accessmobile === true) {
                    const empemail = currentRec.getValue({ fieldId: 'custentity_hris_empmobileemail' }) || '';
                    if (!empemail.toString().trim()) {
                        alert('Please Enter Mobile E-Mail');
                        return false;
                    }
                }
            }

            return true;
        } catch (e) {
            log.error('Error in saveRecord', e.message || e);
            return true;
        }
    };

    /**
     * Validation function executed when a line is deleted on sublists.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @returns {boolean} Return true if delete is allowed
     */
    const validateDelete = (scriptContext) => {
        try {
            const currentRec = scriptContext.currentRecord;
            const sublistId = scriptContext.sublistId;

            if (sublistId === 'recmachcustrecord_hris_emp_supp_doc_employee_li') {
                const currentUser = runtime.getCurrentUser();
                const i_Current_User = currentUser.id;
                const i_Current_Role = currentUser.role;
                const i_Requester = currentRec.getValue({ fieldId: 'entity' });

                // if (i_Current_User == i_Requester || i_Current_Role == 3) {
                if (i_Current_Role == 4) {
                    const i_File_Upload_Id = currentRec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_hris_emp_supp_doc_employee_li',
                        fieldId: 'custrecord_hris_emp_supp_doc_employee_li'
                    });

                    if (_logValidation(i_File_Upload_Id)) {
                        const urlStr = urlModule.resolveScript({
                            scriptId: 'customscript_hris_ess_deletefilecab_sl',
                            deploymentId: 'customdeploy_hris_ess_deletefilecab_sl',
                            params: { entity: i_File_Upload_Id }
                        });
                        httpsModule.get({ url: urlStr });
                    }
                    return true;
                } else {
                    alert("You dont have access to remove files");
                    return false;
                }
            }
            return true;
        } catch (e) {
            log.error('Error in validateDelete', e.message || e);
            return true;
        }
    };

    /**
     * Searches for holiday master records based on region and weekly off criteria.
     */
    function searchHolidays(empRegion, empWeekCriteria) {
        try {
            const holidayLt = [];
            if (!empRegion || !empWeekCriteria) return holidayLt;

            const holidaySearch = search.create({
                type: 'customrecord_hris_holiday_master',
                filters: [
                    ['custrecord_hris_holi_region', 'anyof', empRegion],
                    'AND',
                    ['custrecord_hris_holidayweeklyoffcriteria', 'anyof', empWeekCriteria],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid']
            });

            const searchResults = holidaySearch.run().getRange({ start: 0, end: 1000 });
            if (searchResults && searchResults.length > 0) {
                searchResults.forEach(result => {
                    holidayLt.push(result.getValue({ name: 'internalid' }));
                });
            }
            return holidayLt;
        } catch (e) {
            log.error('Error in searchHolidays', e.message || e);
            return [];
        }
    }

    /**
     * Helper validation function.
     */
    function _logValidation(value) {
        return value !== null && value !== undefined && value !== '' && value.toString() !== 'null' && value.toString() !== 'undefined' && value.toString() !== 'NaN';
    }

    /**
     * Opens optimized file upload popup window.
     */
    function fileUploadOptimized(recType, changedFldID, attchFldID, isLineFld, machineNm, folderNmPrefix, curRec) {
        try {
            const currentRec = curRec || currentRecordModule.get();
            const b_uploafFileCheck = currentRec.getCurrentSublistValue({ sublistId: machineNm, fieldId: changedFldID });

            if (b_uploafFileCheck === true || b_uploafFileCheck === 'T') {
                const i_File_Upload_Id = currentRec.getCurrentSublistValue({ sublistId: machineNm, fieldId: attchFldID });
                let winURL = urlModule.resolveScript({
                    scriptId: 'customscript_hris_ess_uploadfile_sl',
                    deploymentId: 'customdeploy_hris_ess_uploadfile_sl'
                });

                winURL += '&recType=' + recType +
                    '&attachFldNm=' + attchFldID +
                    '&changedFldNm=' + changedFldID +
                    '&fileUploadId=' + i_File_Upload_Id +
                    '&machineNm=' + machineNm +
                    '&isLineFld=' + isLineFld +
                    '&folderNmPrefix=' + folderNmPrefix;

                if (typeof window.nlExtOpenWindow === 'function') {
                    window.nlExtOpenWindow(winURL, '', 450, 300, '', false, "Upload File");
                } else {
                    window.open(winURL, "Upload File", "width=450,height=300,resizable=yes,scrollbars=yes");
                }
            }
        } catch (e) {
            log.error('Error in fileUploadOptimized', e.message || e);
        }
    }

    /**
     * Triggered from suitelet form to set file ID.
     */
    function setFileOptimized(File_Id, type, attchFldID, fileExist, foldername, fileSize, fileType, changedFldID, machineNm, isLineFld) {
        try {
            const currentRec = currentRecordModule.get();
            if (isLineFld === 'true' || isLineFld === true) {
                currentRec.setCurrentSublistValue({ sublistId: machineNm, fieldId: attchFldID, value: File_Id });
            } else {
                currentRec.setValue({ fieldId: attchFldID, value: File_Id });
            }
            if (typeof window.close === 'function') window.close();
        } catch (e) {
            log.error('Error in setFileOptimized', e.message || e);
        }
    }

    /**
     * Triggered from suitelet form when folder does not exist.
     */
    function folderDoesNotExist() {
        alert('Please Create Folder');
        if (typeof window.close === 'function') window.close();
    }

    /**
     * Duplicate Employee ID search helper.
     */
    function searchEmployeeIdduplicate(employeeIdCheck) {
        try {
            const searchEmpRec = search.create({
                type: search.Type.EMPLOYEE,
                filters: [['custentity_hris_empcode', 'is', employeeIdCheck]],
                columns: ['internalid', 'custentity_hris_empcode']
            }).run().getRange({ start: 0, end: 100 });

            if (searchEmpRec && searchEmpRec.length > 0) {
                const empId = searchEmpRec[0].getValue({ name: 'custentity_hris_empcode' });
                alert('empId====searchEmpRec' + empId + '  ' + searchEmpRec);
            }
            return searchEmpRec;
        } catch (e) {
            log.error('Error in searchEmployeeIdduplicate', e.message || e);
            return [];
        }
    }

    // Bind global window callbacks for Suitelet popup windows (safely checked for browser environment)
    if (typeof window !== 'undefined') {
        window.setFileOptimized = setFileOptimized;
        window.folderDoesNotExist = folderDoesNotExist;
        window.fileUploadOptimized = fileUploadOptimized;
        window._logValidation = _logValidation;
        window.searchEmployeeIdduplicate = searchEmployeeIdduplicate;
    }

    return {
        pageInit,
        fieldChanged,
        saveRecord,
        validateDelete
    };
});

