/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope public
 */
define(['N/record', 'N/search', 'N/runtime', 'N/log'], (record, search, runtime, log) => {

    /**
     * Check if Subsidiaries feature is enabled
     */
    const isSubsidiariesEnabled = () => {
        try {
            const enabled = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
            log.debug('isSubsidiariesEnabled', 'Return value → ' + enabled);
            return enabled;
        } catch (e) {
            log.debug('Feature check error', e.message);
            log.debug('isSubsidiariesEnabled', 'Return value → false (error)');
            return false;
        }
    };
    /**
     * Convert search date string to proper Date object
     */
    const formatDate = (dateValue) => {
        if (!dateValue) return null;

        try {
            return format.parse({
                value: dateValue,
                type: format.Type.DATE
            });
        } catch (e) {
            log.error('Date Parse Error', `Value: ${dateValue} | Error: ${e.message}`);
            return null;
        }
    };

    /**
     * afterSubmit entry point
     */
    const afterSubmit = (context) => {
        try {
            if (context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.EDIT) {
                return;
            }

            const newRec = context.newRecord;
            const customform = newRec.getValue({ fieldId: 'customform' });
            log.debug('customform', customform);

            if (customform != 776) {
                log.debug('afterSubmit', 'Skipped – customform is not 776');
                return;
            }

            const recordId = newRec.id;
            log.debug('afterSubmit', 'recordId → ' + recordId);

            // ---------- Search Employee Info ----------
            const empData = searchEmployeeInfo(recordId);

            // **** Print full empData object in log ****
            log.debug({
                title: 'empData FULL OBJECT',
                details: empData ? JSON.stringify(empData, null, 2) : 'null'
            });

            if (!empData) {
                log.debug('afterSubmit', 'No employee data found – exiting');
                return;
            }

            // ---------- Subsidiary (only if feature enabled) ----------
            let empSubsidiary = '';
            if (isSubsidiariesEnabled()) {
                empSubsidiary = searchEmpSubsidiary(recordId) || '';
            }
            log.debug('searchEmpSubsidiary RETURN', empSubsidiary || '(empty)');

            log.debug('afterSubmit', 'EMPGender → ' + empData.EMPGender);

            // ---------- Find existing Compensation Change record ----------
            const edcId = searchEmpDataChange(empData.EmpId);
            log.debug('searchEmpDataChange RETURN', edcId ? edcId : 'null');

            if (!edcId) {
                log.debug('afterSubmit', 'No existing Employee Compensation Change record found – exiting');
                return;
            }

            // ---------- Load & update the custom record ----------
            const oEmployeeDataChange = record.load({
                type: 'customrecord_hris_employee_compen_change',
                id: edcId,
                isDynamic: false
            });

            const setIfPresent = (fieldId, value) => {
                if (value !== '' && value !== null && value !== undefined) {
                    oEmployeeDataChange.setValue({ fieldId, value });
                }
            };
           
            setIfPresent('custrecord_hris_empchange_department', empData.Dept);
         // ***** Formatted Date Fields *****
            setIfPresent('custrecord_hris_empchange_date_of_join', formatDate(empData.DOJ));
            setIfPresent('custrecord_hris_empchange_date_of_leave', formatDate(empData.DOL));     setIfPresent('custrecord_hris_empchange_grade', empData.grade);
            setIfPresent('custrecord_hris_empchange_designation', empData.designation);
            setIfPresent('custrecord_hris_empchange_business_area', empData.costCenter);
            setIfPresent('custrecord_hris_empchange_subsidiary', empSubsidiary);
            setIfPresent('custrecord_hris_empchange_marital_status', empData.MaritalStatus);
            setIfPresent('custrecord_hris_empchange_emp_status', empData.employeeStatus);
            setIfPresent('custrecord_hris_empchange_emp_active_sts', empData.EmpActiveStatus);
            setIfPresent('custrecord_hris_empchange_pt_appicable', empData.PT_Check);
            setIfPresent('custrecord_hris_empchange_pt_location', empData.PT_Loc);
            setIfPresent('custrecord_hris_empchange_esic_applicabe', empData.ESIC_Check);
            setIfPresent('custrecord_hris_empchange_esic_num', empData.ESIC_no);
            setIfPresent('custrecord_hris_empchange_pf_number', empData.PF_Number);
            setIfPresent('custrecord_hris_empchange_emp_code', empData.EMPCode);
            setIfPresent('custrecord_hris_empchange_gender', empData.EMPGender);
            setIfPresent('custrecord_hris_empchange_pf_applicable', empData.PFAppli);
            setIfPresent('custrecord_hris_empchange_location', empData.loc);
            setIfPresent('custrecord_hris_empchange_location_no', empData.loc);
            setIfPresent('custrecord_hris_empchange_gratuity_app', empData.gratuityApplicable);
            setIfPresent('custrecord_hris_empchange_emp_legal_name', empData.EmployeeLegalName);
            setIfPresent('custrecord_hris_empchange_bank_name', empData.bankName);
            setIfPresent('custrecord_hris_empchange_iban_num', empData.IbanNumber);
            setIfPresent('custrecord_hris_empchange_bank_route_no', empData.BankRoutingNo);
            setIfPresent('custrecord_hris_empchange_bank_acc_no', empData.bankAccNo);
            setIfPresent('custrecord_hris_empchange_social_insu_ap', empData.socialApplicable);
            setIfPresent('custrecord_hris_empchange_labour_type', empData.labourcardtype);
            setIfPresent('custrecord_hris_empchange_visa_allow_fix', empData.fixedVisaAllocation);
            setIfPresent('custrecord_hris_empchange_visa_allo_wps', empData.visaUnderSubsidiary);
            setIfPresent('custrecord_hris_empchange_mol_id', empData.personalno);
            setIfPresent('custrecord_hris_empchange_air_tck_amt', empData.airticketamnt);

            log.debug('lms_employeecode', 'lms_employeecode → ' + empData.lmsEmployeeCode);

            const savedId = oEmployeeDataChange.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });

            log.debug('afterSubmit SUCCESS', 'Saved customrecord_hris_employee_compen_change ID → ' + savedId);

        } catch (e) {
            log.error('ERROR in afterSubmit', e.name + ' : ' + e.message);
            log.error('ERROR stack', e.stack);
        }
    };

    /**
     * Search employee information
     */
    const searchEmployeeInfo = (recordId) => {
        log.debug('searchEmployeeInfo', 'Searching for employee ID → ' + recordId);

        const empSearch = search.create({
            type: search.Type.EMPLOYEE,
            filters: [['internalid', 'is', recordId]],
            columns: [
                'internalid',
                'custentity_hris_empdepartment_new',
                'custentity_hris_empdesignation',
                'class',
                'hiredate',
                'custentity_hirs_empdol',
                'custentity_emp_grade_',
                'custentity_hris_empmaritalstatus',
                'employeestatus',
                'custentity_hris_empemploymentstatus',
                'custentity_hris_emp_isptapplicable',
                'custentity_hris_empptlocation',
                'custentity_hris_isesiapplicable',
                'custentity_hris_esinumber',
                'custentity_hris_pfnumber',
                'custentity_hris_empcode',
                'custentity_hris_empgender',
                'custentity_hris_pfapplicable',
                'location',
                'custentity_hris_empdlocation_new',
                'custentity_hris_emplegalname',
                'custentity_hris_empiseosapplicable',
                'custentity_hris_empbankname',
                'custentity_hris_empbankroutingno',
                'custentity_hris_empbankibanacctno',
                'custentity_hris_emp_bankaccno',
                'custentity_hris_empsocialinsurapplicable',
                'custentity_hris_emp_labcontract_type',
                'custentity_hris_empvisaallocationfixed',
                'custentity_hris_empvisaallocationmoltype',
                'custentity_hris_emp_molpersonid',
                'custentity_hris_empairticketamt'
            ]
        });

        const results = empSearch.run().getRange({ start: 0, end: 1 });

        if (!results || results.length === 0) {
            log.debug('searchEmployeeInfo', 'No results found – returning null');
            return null;
        }

        const r = results[0];

        const empData = {
            EmpId: r.getValue({ name: 'internalid' }),
            Dept: r.getValue({ name: 'custentity_hris_empdepartment_new' }),
            designation: r.getValue({ name: 'custentity_hris_empdesignation' }),
            costCenter: r.getValue({ name: 'class' }),
            DOJ: r.getValue({ name: 'hiredate' }),
            DOL: r.getValue({ name: 'custentity_hirs_empdol' }),
            grade: r.getValue({ name: 'custentity_emp_grade_' }),
            MaritalStatus: r.getValue({ name: 'custentity_hris_empmaritalstatus' }),
            employeeStatus: r.getValue({ name: 'employeestatus' }),
            EmpActiveStatus: r.getValue({ name: 'custentity_hris_empemploymentstatus' }),
            PT_Check: r.getValue({ name: 'custentity_hris_emp_isptapplicable' }),
            PT_Loc: r.getValue({ name: 'custentity_hris_empptlocation' }),
            ESIC_Check: r.getValue({ name: 'custentity_hris_isesiapplicable' }),
            ESIC_no: r.getValue({ name: 'custentity_hris_esinumber' }),
            PF_Number: r.getValue({ name: 'custentity_hris_pfnumber' }),
            EMPCode: r.getValue({ name: 'custentity_hris_empcode' }),
            EMPGender: r.getValue({ name: 'custentity_hris_empgender' }),
            PFAppli: r.getValue({ name: 'custentity_hris_pfapplicable' }),
            oldloc: r.getValue({ name: 'location' }),
            loc: r.getValue({ name: 'custentity_hris_empdlocation_new' }),
            EmployeeLegalName: r.getValue({ name: 'custentity_hris_emplegalname' }),
            gratuityApplicable: r.getValue({ name: 'custentity_hris_empiseosapplicable' }),
            bankName: r.getValue({ name: 'custentity_hris_empbankname' }),
            BankRoutingNo: r.getValue({ name: 'custentity_hris_empbankroutingno' }),
            IbanNumber: r.getValue({ name: 'custentity_hris_empbankibanacctno' }),
            bankAccNo: r.getValue({ name: 'custentity_hris_emp_bankaccno' }),
            socialApplicable: r.getValue({ name: 'custentity_hris_empsocialinsurapplicable' }),
            labourcardtype: r.getValue({ name: 'custentity_hris_emp_labcontract_type' }),
            fixedVisaAllocation: r.getValue({ name: 'custentity_hris_empvisaallocationfixed' }),
            visaUnderSubsidiary: r.getValue({ name: 'custentity_hris_empvisaallocationmoltype' }),
            personalno: r.getValue({ name: 'custentity_hris_emp_molpersonid' }),
            airticketamnt: r.getValue({ name: 'custentity_hris_empairticketamt' }),
            lmsEmployeeCode: r.getValue({ name: 'custentity_hris_empcode' })
        };

        log.debug('searchEmployeeInfo', 'Successfully built empData object');
        log.debug({
            title: 'empData FULL OBJECT',
            details: empData ? JSON.stringify(empData, null, 2) : 'null'
        });

        if (!empData) {
            log.debug('afterSubmit', 'No employee data found – exiting');
            return;
        }
        return empData;
    };

    /**
     * Get employee subsidiary
     */
    const searchEmpSubsidiary = (recordId) => {
        log.debug('searchEmpSubsidiary', 'Looking up subsidiary for employee → ' + recordId);

        const empSearch = search.create({
            type: search.Type.EMPLOYEE,
            filters: [['internalid', 'is', recordId]],
            columns: ['subsidiary']
        });

        const results = empSearch.run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            const sub = results[0].getValue({ name: 'subsidiary' });
            log.debug('searchEmpSubsidiary', 'Found subsidiary → ' + sub);
            return sub;
        }

        log.debug('searchEmpSubsidiary', 'No subsidiary found – returning empty string');
        return '';
    };

    /**
     * Find existing Employee Compensation Change record
     */
    const searchEmpDataChange = (empId) => {
        log.debug('searchEmpDataChange', 'Looking for Compensation Change record for employee → ' + empId);

        const edcSearch = search.create({
            type: 'customrecord_hris_employee_compen_change',
            filters: [
                ['custrecord_hris_empchange_employee_nam', 'is', empId]
            ],
            columns: ['internalid']
        });

        const results = edcSearch.run().getRange({ start: 0, end: 1 });

        if (results && results.length > 0) {
            const id = results[0].getValue({ name: 'internalid' });
            log.debug('searchEmpDataChange', 'Found record ID → ' + id);
            return id;
        }

        log.debug('searchEmpDataChange', 'No matching record found – returning null');
        return null;
    };

    return {
        afterSubmit
    };
});