/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/https', 'N/log', 'N/search', 'N/record', 'N/runtime', 'N/format', 'N/file', 'N/query'], function (https, log, search, record, runtime, format, file, query) {

    function searchEmployeeDetails(empid) {
        var employeeData = {
            nsId: '',
            employeeCode: '',
            title: '',
            firstName: '',
            middleName: '',
            lastName: '',
            email: '',
            gender: '',
            dateOfBirth: '',
            nationality: '',
            mobileNo: '',
            phoneNo: '',
            workRegion: '',
            religion: '',
            jobStatus: '',
            bankName: '',
            bankRoutingNo: '',
            bankAccountNo: '',
            weeklyOff: '',
            staffType: '',
            employmentStatus: '',
            contactAddress: '',
            maritalStatus: '',
            role: '',
            supervisor: '',
            supervisorId: '',
            linemanager: '',
            linemanagerId: '',
            hod: '',
            hodId: '',
            subsidiaryId: '',
            subsidiary: '',
            paygroupid: '',
            paygroupname: '',
            imageurl: '',
            imagename: '',
            department: '',
            band: '',
            subBand: '',
            weeklyOffCriteria: '',
            hireDate: '',
            employeeCategory: '',
            mobileaccess: '',
            mobileemail: '',
            mobileusername: '',
            mobileIMEI: '',
            designation: '',
            //mobilepassword: '',
            Source: "Net Suite",
            jobLocation: '',
            contacts: [],
            documents: [],
            skill: [],
            qualification: [],
            dependantDetails: [],
            dependantIdDetails: [],
            emergencyContact: [],
            healthInsurance:[]
        };

        try {
            // Employee Search
            var employeeSearchObj = search.create({
                type: "employee",
                filters: [["internalid", "is", empid]],
                columns: [
                    search.createColumn({ name: "internalid", label: "nsId" }),
                    search.createColumn({ name: "custentity_hris_empcode", label: "employeeCode" }),
                    search.createColumn({ name: "salutation", label: "title" }),
                    search.createColumn({ name: "firstname", label: "firstName" }),
                    search.createColumn({ name: "middlename", label: "middleName" }),
                    search.createColumn({ name: "lastname", label: "lastName" }),
                    search.createColumn({ name: "email", label: "email" }),
                    search.createColumn({ name: "custentity_hris_empgender", label: "gender" }),
                    search.createColumn({ name: "birthdate", label: "dateOfBirth" }),
                    search.createColumn({ name: "custentity_hris_empnationality", label: "nationality" }),
                    search.createColumn({ name: "mobilephone", label: "mobileNo" }),
                    search.createColumn({ name: "phone", label: "phoneNo" }),
                    search.createColumn({ name: "custentity_hris_empworkinglocation", label: "workRegion" }),
                    search.createColumn({ name: "role", label: "role" }),
                    search.createColumn({ name: "supervisor", label: "supervisor" }),
                    search.createColumn({ name: "custentity_hris_emplinemanger", label: "linemanager" }),
                    search.createColumn({ name: "custentity_hris_emphod", label: "hod" }),
                    search.createColumn({ name: "subsidiary", label: "subsidiary" }),
                    search.createColumn({ name: "custentity_hris_emppayrollgroup", label: "paygroupid" }),
                    search.createColumn({ name: "image", label: "image" }),
                    search.createColumn({ name: "custentity_hris_empdepartment_new", label: "department" }),
                    search.createColumn({ name: "custentity_emp_grade_", label: "band" }),
                    search.createColumn({ name: "custentity_hris_subband", label: "subBand" }),
                    search.createColumn({ name: "custentity_hris_empweeklyoffcriteria", label: "weeklyOffCriteria" }),
                     search.createColumn({ name: "custentity_hris_emp_accesstomobile", label: "mobileaccess" }),
                    search.createColumn({ name: "custentity_hris_empmobileemail", label: "mobileemail" }),
                    search.createColumn({ name: "custentity_hris_mobile_user_name", label: "mobileusername" }),
                   // search.createColumn({ name: "custentity_hris_mobile_imei_number", label: "mobileIMEI" }),
                    //search.createColumn({name: "custentity_hris_ent_password_mobile", label: "mobilepassword"}),
                    search.createColumn({ name: "custentity_hris_empreligion", label: "religion" }),
                    search.createColumn({ name: "custentity_emp_employee_job_status", label: "jobStatus" }),
                    search.createColumn({ name: "custentity_hris_empbankname", label: "bankName" }),
                    search.createColumn({ name: "custentity_hris_empbankroutingno", label: "bankRoutingNo" }),
                    search.createColumn({ name: "custentity_hris_emp_bankaccno", label: "bankAccountNo" }),
                    search.createColumn({ name: "custentity_hris_empweeklyoffs", label: "weeklyOff" }),
                    search.createColumn({ name: "custentity_hris_empstafftype", label: "staffType" }),
                    search.createColumn({ name: "custentity_hris_empemploymentstatus", label: "employmentStatus" }),
                    search.createColumn({ name: "custentity_hris_empaccomdationaddress", label: "contactAddress" }),
                    search.createColumn({ name: "custentity_hris_empmaritalstatus_els", label: "maritalStatus" }),
                    search.createColumn({ name: "hiredate", label: "hireDate" }),
                    search.createColumn({ name: "custentity_hris_empcategory", label: "employeeCategory" }),
                    search.createColumn({ name: "custentity_hris_empdesignation", label: "designation" }),
                    search.createColumn({ name: "custentity_hris_empdlocation_new", label: "jobLocation" }),
                ]
            });

            var searchResult = employeeSearchObj.run().getRange({ start: 0, end: 1 });
            if (searchResult.length > 0) {
                var result = searchResult[0];
                employeeData.nsId = result.getValue({ name: "internalid" }) || "";
                employeeData.employeeCode = result.getValue({ name: "custentity_hris_empcode" });
                employeeData.title = result.getValue({ name: "salutation" }) || "";
                employeeData.firstName = result.getValue({ name: "firstname" }) || "";
                employeeData.middleName = result.getValue({ name: "middlename" }) || "";
                employeeData.lastName = result.getValue({ name: "lastname" }) || "";
                employeeData.email = result.getValue({ name: "email" }) || "";
                employeeData.gender = result.getText({ name: "custentity_hris_empgender" });
                employeeData.dateOfBirth = formatDateString(result.getValue({ name: "birthdate" })) || "";
                employeeData.nationality = result.getText({ name: "custentity_hris_empnationality" }) || "";
                employeeData.mobileNo = result.getValue({ name: "mobilephone" }) || "";
                employeeData.phoneNo = result.getValue({ name: "phone" }) || "";
                employeeData.workRegion = result.getText({ name: "custentity_hris_empworkinglocation" }) || "";
                employeeData.religion = result.getText({ name: "custentity_hris_empreligion" }) || "";
                employeeData.jobStatus = result.getText({ name: "custentity_emp_employee_job_status" }) || "";
                employeeData.bankName = result.getText({ name: "custentity_hris_empbankname" }) || "";
                employeeData.bankRoutingNo = result.getValue({ name: "custentity_hris_empbankroutingno" }) || "";
                employeeData.bankAccountNo = result.getValue({ name: "custentity_hris_emp_bankaccno" }) || "";
                employeeData.weeklyOff = result.getText({ name: "custentity_hris_empweeklyoffs" }) || "";
                employeeData.staffType = result.getText({ name: "custentity_hris_empstafftype" }) || "";
                employeeData.employmentStatus = result.getText({ name: "custentity_hris_empemploymentstatus" }) || "";
                employeeData.contactAddress = result.getValue({ name: "custentity_hris_empaccomdationaddress" }) || "";
                employeeData.maritalStatus = result.getText({ name: "custentity_hris_empmaritalstatus_els" }) || "";
                employeeData.role = result.getText({ name: "role" }) || "";
                employeeData.supervisor = result.getText({ name: "supervisor" }) || "";
                employeeData.supervisorId = result.getValue({ name: "supervisor" }) || "";
                employeeData.linemanager = result.getText({ name: "custentity_hris_emplinemanger" }) || "";
                employeeData.linemanagerId = result.getValue({ name: "custentity_hris_emplinemanger" }) || "";
                employeeData.hod = result.getText({ name: "custentity_hris_emphod" }) || "";
                employeeData.hodId = result.getValue({ name: "custentity_hris_emphod" }) || "";
                employeeData.subsidiary = result.getText({ name: "subsidiary" }) || "";
                employeeData.subsidiaryId = result.getValue({ name: "subsidiary" }) || "";
                employeeData.paygroupid = result.getValue({ name: "custentity_hris_emppayrollgroup" }) || "";
                employeeData.paygroupname = result.getText({ name: "custentity_hris_emppayrollgroup" }) || "";
                employeeData.department = result.getText({ name: "custentity_hris_empdepartment_new" }) || "";
                employeeData.band = result.getText({ name: "custentity_emp_grade_" }) || "";
                employeeData.subBand = result.getText({ name: "custentity_hris_subband" }) || "";
                employeeData.weeklyOffCriteria = result.getText({ name: "custentity_hris_empweeklyoffcriteria" }) || "";
                employeeData.hireDate = result.getValue({ name: "hiredate" }) || "";
                employeeData.employeeCategory = result.getText({ name: "custentity_hris_empcategory" }) || "";
                 employeeData.mobileaccess = result.getValue({ name: "custentity_hris_emp_accesstomobile" }) || "";
                employeeData.mobileemail = result.getValue({ name: "custentity_hris_empmobileemail" }) || "";
                employeeData.mobileusername = result.getValue({ name: "custentity_hris_mobile_user_name" }) || "";
              /// employeeData.mobilepassword = result.getValue({ name: "custentity_hris_ent_password_mobile" }) || "";
                //employeeData.mobileIMEI = result.getValue({ name: "custentity_hris_mobile_imei_number" }) || "";
              //setMobileAccessFromCustomRecord(empid, employeeData);
                employeeData.designation = result.getText({ name: "custentity_hris_empdesignation" }) || "";
                employeeData.jobLocation = result.getText({ name: "custentity_hris_empdlocation_new" }) || "";

                var imageId = result.getValue({ name: "image" });
                var subLogoId=result.getValue({ name: "subsidiary" });
              //var subLogoId=1
                if (imageId) {
                    try {
                        var fileObj = file.load({ id: imageId });

                        // Ensure the file is online
                        if (!fileObj.isOnline) {
                            fileObj.isOnline = true;
                            fileObj.save();
                        }

                        // Construct the full URL for the image
                        var accountId = runtime.accountId;
                        var imageUrl = 'https://11951030.app.netsuite.com' + fileObj.url;

                        employeeData.imageurl = imageUrl;
                        employeeData.imagename = imageId; // Store image ID
                    } catch (e) {
                        log.error("Error loading image file", e);
                    }
                } else {
                    log.debug("No image found", "No image found for employee ID: " + empid);
                }
              //subsidiary logo id
               if (subLogoId) {
                    try {
                       var subRec=record.load({
                         type:"subsidiary",
                         id:subLogoId
                       });
                      var getLogo=subRec.getValue({
                        fieldId:"logo"
                      });
                        var fileObj = file.load({ id: getLogo });

                        // Ensure the file is online
                        if (!fileObj.isOnline) {
                            fileObj.isOnline = true;
                            fileObj.save();
                        }

                        // Construct the full URL for the image
                        var accountId = runtime.accountId;
                        var SubLogoUrl = 'https://11951030.app.netsuite.com' + fileObj.url;

                        employeeData.mobileIMEI = SubLogoUrl;
                        //employeeData.imagename = imageId; // Store image ID
                    } catch (e) {
                        log.error("Error loading image file", e);
                    }
                } else {
                    log.debug("No image found", "No image found for employee ID: " + empid);
                }
            } else {
                log.debug({ title: 'No Employee Found', details: 'No employee data found for ID: ' + empid });
                return null; // Or handle accordingly
            }

            // Add additional searches for contacts, documents, skills, qualifications, etc.
            employeeData.contacts = searchContacts(empid);
            employeeData.documents = searchDocuments(empid);
            employeeData.skill = searchSkills(empid);
            employeeData.qualification = searchQualifications(empid);
            employeeData.dependantDetails = searchDependants(empid);
            employeeData.dependantIdDetails = searchDependantIdDetails(empid);
            employeeData.emergencyContact = searchEmergencyContacts(empid);
           employeeData.healthInsurance = searchhealthandLife(empid);

            return [employeeData];

        } catch (error) {
            log.error({ title: 'Error in Employee Search', details: error });
            return null;
        }
    }
  //health and life insurance 
  function searchhealthandLife(empid) {
        var healthInsurance = [];
        try {
            var healthandLifeSearchObj = search.create({
                type: "employee",
                filters: [["internalid", "anyof", empid]], // Assuming custentity_employee is the link to employee records
                columns: [
                    search.createColumn({
                        name: "internalid",
                        join: "custrecord_hris_employee_healthandlife",
                        label: "internalid"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_health_document",
                        join: "custrecord_hris_employee_healthandlife",
                        label: "HealthDocument"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_life_insurance_document",
                        join: "custrecord_hris_employee_healthandlife",
                        label: "LifeInsuranceDocument"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_health_remarks",
                        join: "custrecord_hris_employee_healthandlife",
                        label: "HealthRemarks"
                    })
                ]
            });

            healthandLifeSearchObj.run().each(function (result) {
                var internalId = result.getValue({ name: "internalid", join: "custrecord_hris_employee_healthandlife" });
                if (internalId) {
                    var attachmentIdHealth = result.getValue({ name: "custrecord_hris_health_document", join: "custrecord_hris_employee_healthandlife" });
                    var attachmentIdLife = result.getValue({ name: "custrecord_hris_life_insurance_document", join: "custrecord_hris_employee_healthandlife" });
                    var attachmentUrlHealth = "";
                    var attachmentUrlLife = "";

                    if (attachmentIdHealth) {
                        try {
                            var fileObj = file.load({ id: attachmentIdHealth });

                            if (!fileObj.isOnline) {
                                fileObj.isOnline = true;
                                fileObj.save();
                            }

                            var accountId = runtime.accountId;
                            //attachmentUrl = 'https://' + accountId + '.app.netsuite.com' + fileObj.url;
                            attachmentUrlHealth = 'https://11951030.app.netsuite.com' + fileObj.url;
                        } catch (e) {
                            log.error("Error loading attachment file", e);
                        }
                    }
                    if (attachmentIdLife) {
                        try {
                            var fileObj = file.load({ id: attachmentIdLife });

                            if (!fileObj.isOnline) {
                                fileObj.isOnline = true;
                                fileObj.save();
                            }

                            var accountId = runtime.accountId;
                            //attachmentUrl = 'https://' + accountId + '.app.netsuite.com' + fileObj.url;
                            attachmentUrlLife = 'https://11951030.app.netsuite.com' + fileObj.url;
                        } catch (e) {
                            log.error("Error loading attachment file", e);
                        }
                    }
                    healthInsurance.push({
                        internalid: internalId,
                        attachmentUrlHealth: attachmentUrlHealth,
                        attachmentUrlLife: attachmentUrlLife,
                        healthRemarks: result.getValue({ name: "custrecord_hris_health_remarks", join: "custrecord_hris_employee_healthandlife" })

                    });
                }
                return true;
            });

            return healthInsurance;
        } catch (error) {
            log.error({ title: 'Error in Document Search', details: error });
            return [];
        }
    }

    function searchContacts(empid) {
        var contacts = [];
        try {
            var contactSearchObj = search.create({
                type: "employee",
                filters: [["internalid", "anyof", empid]],
                columns: [
                    search.createColumn({ name: "addressinternalid", join: "Address", label: "internalid" }),
                    search.createColumn({ name: "address", join: "Address", label: "address" }),
                    search.createColumn({ name: "address1", join: "Address", label: "address1" }),
                    search.createColumn({ name: "address2", join: "Address", label: "address2" }),
                    search.createColumn({ name: "city", join: "Address", label: "city" }),
                    search.createColumn({ name: "statedisplayname", join: "Address", label: "statedisplayname" }),
                    search.createColumn({ name: "country", join: "Address", label: "country" }),
                    search.createColumn({ name: "country", join: "Address", label: "countryName" }),
                    search.createColumn({ name: "zipcode", join: "Address", label: "zip_Code" }),
                    search.createColumn({ name: "addressphone", join: "Address", label: "phone" }),
                    //search.createColumn({ name: "internalid", join: "Address", label: "internalid" }),
                    search.createColumn({ name: "addressee", join: "Address", label: "first_name" }),
                    search.createColumn({ name: "isdefaultbilling", join: "Address", label: "default_billing" }),
                ]
            });

            contactSearchObj.run().each(function (result) {
                contacts.push({
                    internalid: result.getValue({ name: "addressinternalid", join: "Address" }) || "",
                    address: result.getValue({ name: "address", join: "Address" }),
                    address1: result.getValue({ name: "address1", join: "Address" }),
                    address2: result.getValue({ name: "address2", join: "Address" }),
                    city: result.getValue({ name: "city", join: "Address" }),
                    state: result.getValue({ name: "statedisplayname", join: "Address" }),
                    country: result.getValue({ name: "country", join: "Address" }),
                    countryName: result.getText({ name: "country", join: "Address" }),
                    zipCode: result.getValue({ name: "zipcode", join: "Address" }),
                    phone: result.getValue({ name: "addressphone", join: "Address" }),
                    //internalid: result.getValue({ name: "internalid", join: "Address" }),
                    firstName: result.getValue({ name: "addressee", join: "Address" }),
                    defaultBilling: result.getValue({ name: "isdefaultbilling", join: "Address" })
                });
                return true; // continue to the next result
            });

            return contacts;
        } catch (error) {
            log.error({ title: 'Error in Contact Search', details: error });
            return contacts; // Return empty array in case of error
        }
    }

/*  function setMobileAccessFromCustomRecord(empid, employeeData) {
    try {
        // Create search on mobile custom record type
        var mobileSearchObj = search.create({
            type: 'customrecord_hris_mobile_process_reset_u',  // Your custom record type ID
            filters: [
                ['custrecord_hris_mobile_pass_employee', 'anyof', empid],  // Link to employee
                'AND',
                ['isinactive', 'is', 'F'],  // Only active records
               'AND',
               ['custrecord_hris_mobile_password_access', 'is', 'T']
            ],
            columns: [
                'custrecord_hris_mobile_password_access',   // Mobile access flag
                'custrecord_hris_mobile_user_name',         // Mobile username
                'custrecord_hris_mobile_password',         // Mobile password
                'custrecord_hris_mobile_email_update',     // Mobile email
            ]
        });

        // Execute search and get first result
        var mobileResults = mobileSearchObj.run().getRange({
            start: 0,
            end: 1
        });

        // If custom record exists for this employee, populate mobile fields
        if (mobileResults && mobileResults.length > 0) {
            var mobRes = mobileResults[0];

            // Override employeeData values from custom record ONLY
            employeeData.mobileaccess = mobRes.getValue('custrecord_hris_mobile_password_access');
            employeeData.mobileusername = mobRes.getValue('custrecord_hris_mobile_user_name');
            employeeData.mobilepassword = mobRes.getValue('custrecord_hris_mobile_password');
            employeeData.mobileemail = mobRes.getValue('custrecord_hris_mobile_email_update');
            
            // IMEI field if it exists on custom record (optional)
          //  var imeiValue = mobRes.getValue('custrecordhrismobileimeinumber');
             if (imeiValue) {
                employeeData.mobileIMEI = imeiValue;
            } 

            log.debug('Mobile data from custom record set for employee', empid);
        } else {
            log.debug('No Mobile Custom Record', 'No active mobile custom record found for employee ' + empid);
            // Mobile fields stay empty '' which is correct behavior
        }

    } catch (mobErr) {
        log.error({
            title: 'Error fetching mobile custom record details',
            details: mobErr
        });
        // If error, mobile fields stay empty - don't break the script
    }
} */
    function searchDocuments(empid) {
        var documents = [];
        try {
            var documentSearchObj = search.create({
                type: "employee",
                filters: [["internalid", "anyof", empid]], // Assuming custentity_employee is the link to employee records
                columns: [
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "internalid"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_id_type",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "documentType"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_company_name",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "companyName"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_id_no",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "idNo"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_date_issue",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "issueDate"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_date_exp",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "expiryDate"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_country_issue",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "countryOfIssue"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_attachment",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "attachment"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_design_per_work",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "designation"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_remarks",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "remarks"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_remainder",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "remainder"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_remainder_date",
                        join: "CUSTRECORD_HRIS_EMP_LINK",
                        label: "remainderDate"
                    })
                ]
            });

            documentSearchObj.run().each(function (result) {
                var internalId = result.getValue({ name: "internalid", join: "CUSTRECORD_HRIS_EMP_LINK" });
                if (internalId) {
                    var attachmentId = result.getValue({ name: "custrecord_hris_attachment", join: "CUSTRECORD_HRIS_EMP_LINK" });
                    var attachmentUrl = "";

                    if (attachmentId) {
                        try {
                            var fileObj = file.load({ id: attachmentId });

                            if (!fileObj.isOnline) {
                                fileObj.isOnline = true;
                                fileObj.save();
                            }

                            var accountId = runtime.accountId;
                            //attachmentUrl = 'https://' + accountId + '.app.netsuite.com' + fileObj.url;
                            attachmentUrl = 'https://11951030.app.netsuite.com' + fileObj.url;
                        } catch (e) {
                            log.error("Error loading attachment file", e);
                        }
                    }

                    documents.push({
                        internalid: internalId,
                        idNo: result.getValue({ name: "custrecord_hris_id_no", join: "CUSTRECORD_HRIS_EMP_LINK" }),
                        documentNo: result.getValue({ name: "custrecord_hris_emp_id_type", join: "CUSTRECORD_HRIS_EMP_LINK" }),
                        documentType: result.getText({ name: "custrecord_hris_emp_id_type", join: "CUSTRECORD_HRIS_EMP_LINK" }),
                        companyName: result.getValue({ name: "custrecord_hris_company_name", join: "CUSTRECORD_HRIS_EMP_LINK" }),
                        companyId: result.getText({ name: "custrecord_hris_company_name", join: "CUSTRECORD_HRIS_EMP_LINK" }),
                        issueDate: formatDateString(result.getValue({ name: "custrecord_hris_date_issue", join: "CUSTRECORD_HRIS_EMP_LINK" })),
                        expiryDate: formatDateString(result.getValue({ name: "custrecord_hris_date_exp", join: "CUSTRECORD_HRIS_EMP_LINK" })),
                        countryOfIssue: result.getValue({ name: "custrecord_hris_country_issue", join: "CUSTRECORD_HRIS_EMP_LINK" }),
                        designation: result.getValue({ name: "custrecord_hris_design_per_work", join: "CUSTRECORD_HRIS_EMP_LINK" }),
                        remarks: result.getValue({ name: "custrecord_hris_emp_remarks", join: "CUSTRECORD_HRIS_EMP_LINK" }),
                        remainder: result.getValue({ name: "custrecord_hris_emp_remainder", join: "CUSTRECORD_HRIS_EMP_LINK" }),
                        remainderDate: formatDateString(result.getValue({ name: "custrecord_hris_remainder_date", join: "CUSTRECORD_HRIS_EMP_LINK" })),
                        attachmentID: attachmentId,
                        attachmentUrl: attachmentUrl

                    });
                }
                return true;
            });

            return documents;
        } catch (error) {
            log.error({ title: 'Error in Document Search', details: error });
            return [];
        }
    }


    function searchSkills(empid) {
        var skills = [];
        try {
            var skillSearchObj = search.create({
                type: "employee", // Replace with the actual skill record type
                filters: [["internalid", "anyof", empid]], // Assuming custrecord_employee is the link to employee records
                columns: [
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_HRIS_EMP_SKILLDET_LINK",
                        label: "internalid"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_skill_code",
                        join: "CUSTRECORD_HRIS_EMP_SKILLDET_LINK",
                        label: "skillCode"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_skill_name",
                        join: "CUSTRECORD_HRIS_EMP_SKILLDET_LINK",
                        label: "skillName"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_skilldet_certificate",
                        join: "CUSTRECORD_HRIS_EMP_SKILLDET_LINK",
                        label: "skillCertificate"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_skilldet_years_of_ex",
                        join: "CUSTRECORD_HRIS_EMP_SKILLDET_LINK",
                        label: "YearsOfExperience"
                    }),
                ]
            });

            skillSearchObj.run().each(function (result) {
                // Validate if the primary field 'internalid' has a value
                var internalId = result.getValue({ name: "internalid", join: "CUSTRECORD_HRIS_EMP_SKILLDET_LINK" });
                if (internalId) {
                    var attachmentId = result.getValue({ name: "custrecord_hris_emp_skilldet_certificate", join: "CUSTRECORD_HRIS_EMP_SKILLDET_LINK" });
                    var attachmentUrl = "";
                    var accountId = runtime.accountId;

                    if (attachmentId) {
                        try {
                            var fileObj = file.load({ id: attachmentId });

                            // Check if the file is online, if not, set it to be online
                            if (!fileObj.isOnline) {
                                fileObj.isOnline = true;
                                fileObj.save();
                                log.debug("File set to be online", attachmentId);
                            }

                            // Construct the full file URL
                            //attachmentUrl = 'https://' + accountId + '.app.netsuite.com' + fileObj.url;
                            attachmentUrl = 'https://11951030.app.netsuite.com' + fileObj.url;
                            log.debug("Full Attachment URL", attachmentUrl);

                        } catch (e) {
                            log.error("Error loading attachment file", e);
                        }
                    }

                    skills.push({
                        internalid: internalId,
                        skillCode: result.getValue({ name: "custrecord_hris_emp_skill_code", join: "CUSTRECORD_HRIS_EMP_SKILLDET_LINK" }),
                        skillName: result.getValue({ name: "custrecord_hris_emp_skill_name", join: "CUSTRECORD_HRIS_EMP_SKILLDET_LINK" }),
                        attachmentID: attachmentId,
                        attachmentUrl: attachmentUrl,
                        yearsOfExperience: result.getValue({ name: "custrecord_hris_emp_skilldet_years_of_ex", join: "CUSTRECORD_HRIS_EMP_SKILLDET_LINK" })
                    });
                }
                return true; // Continue to the next result
            });

            return skills;
        } catch (error) {
            log.error({ title: 'Error in Skill Search', details: error });
            return skills; // Return empty array in case of error
        }
    }

    function searchQualifications(empid) {
        var qualifications = [];
        try {
            var qualificationSearchObj = search.create({
                type: "employee", // Replace with the actual qualification record type
                filters: [["internalid", "anyof", empid]], // Assuming custrecord_employee is the link to employee records
                columns: [
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_HRIS_EMP_QM_LINK",
                        label: "internalid"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_education",
                        join: "CUSTRECORD_HRIS_EMP_QM_LINK",
                        label: "education"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_college_univercity",
                        join: "CUSTRECORD_HRIS_EMP_QM_LINK",
                        label: "college"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_passing_year",
                        join: "CUSTRECORD_HRIS_EMP_QM_LINK",
                        label: "passingYear"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_percentage",
                        join: "CUSTRECORD_HRIS_EMP_QM_LINK",
                        label: "percentage"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_certificate",
                        join: "CUSTRECORD_HRIS_EMP_QM_LINK",
                        label: "certificate"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_levek_of_education",
                        join: "CUSTRECORD_HRIS_EMP_QM_LINK",
                        label: "levelofeducation"
                    }),
                ]
            });

            qualificationSearchObj.run().each(function (result) {
                var internalId = result.getValue({ name: "internalid", join: "CUSTRECORD_HRIS_EMP_QM_LINK" });
                if (internalId) {
                    var certificateId = result.getValue({ name: "custrecord_hris_emp_certificate", join: "CUSTRECORD_HRIS_EMP_QM_LINK" });
                    var attachmentUrl = "";
                    var certificateSize = "";

                    if (certificateId) {
                        try {
                            var fileObj = file.load({ id: certificateId });
                            log.debug("Loaded File Object", fileObj);

                            // Check if the file is online, if not, set it to be online
                            if (!fileObj.isOnline) {
                                fileObj.isOnline = true;
                                fileObj.save();
                                log.debug("File set to be online", certificateId);
                            }
                            // Make file available without login (public)
                            // fileObj.isAvailableWithoutLogin = true;

                            // Construct the full file URL
                            var accountId = runtime.accountId;
                            //attachmentUrl = 'https://' + accountId + '.app.netsuite.com' + fileObj.url;
                            attachmentUrl = 'https://11951030.app.netsuite.com' + fileObj.url;
                            log.debug("Full Certificate URL", attachmentUrl);

                            // Format the file size
                            certificateSize = formatFileSize(fileObj.size);
                        } catch (e) {
                            log.error("Error loading certificate file", e);
                        }
                    }
                    qualifications.push({
                        internalid: result.getValue({ name: "internalid", join: "CUSTRECORD_HRIS_EMP_QM_LINK" }),
                        education: result.getText({ name: "custrecord_hris_emp_education", join: "CUSTRECORD_HRIS_EMP_QM_LINK" }),
                        qualificationId: result.getValue({ name: "custrecord_hris_emp_education", join: "CUSTRECORD_HRIS_EMP_QM_LINK" }),
                        college: result.getValue({ name: "custrecord_hris_emp_college_univercity", join: "CUSTRECORD_HRIS_EMP_QM_LINK" }),
                        passingYear: result.getValue({ name: "custrecord_hris_emp_passing_year", join: "CUSTRECORD_HRIS_EMP_QM_LINK" }),
                        percentage: result.getValue({ name: "custrecord_hris_emp_percentage", join: "CUSTRECORD_HRIS_EMP_QM_LINK" }),
                        levelofeducation: result.getValue({ name: "custrecord_hris_emp_levek_of_education", join: "CUSTRECORD_HRIS_EMP_QM_LINK" }),
                        //certificate: result.getText({ name: "custrecord_hris_emp_certificate", join: "CUSTRECORD_HRIS_EMP_QM_LINK" })
                        attachmentID: certificateId,
                        attachmentUrl: attachmentUrl
                        //certificateSize: certificateSize
                    });
                }
                return true; // continue to the next result
            });

            return qualifications;
        } catch (error) {
            log.error({ title: 'Error in Qualification Search', details: error });
            return qualifications; // Return empty array in case of error
        }
    }

    function searchDependants(empid) {
        var dependants = [];
        try {
            var dependantSearchObj = search.create({
                type: "employee", // Replace with the actual dependant record type
                filters: [["internalid", "anyof", empid]], // Assuming custrecord_employee is the link to employee records
                columns: [
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "internalid"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_dependent_name",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "dependantName"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_id_name",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "idName"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_issue_date",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "issueDate"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_expiry_date",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "expiryDate"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_dob",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "dob"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_phone_no",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "phoneNo"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_relationship",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "relationship"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_insuranceap",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "insurance"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_air_ticketap",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "airTicket"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_address",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "address"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_emp_education_allowance",
                        join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK",
                        label: "educationAllowance"
                    }),
                ]
            });

            dependantSearchObj.run().each(function (result) {
                var internalId = result.getValue({ name: "internalid", join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK" });
                if (internalId) {
                    dependants.push({
                        internalid: result.getValue({ name: "internalid", join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK" }),
                        dependantName: result.getValue({ name: "custrecord_hris_emp_dependent_name", join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK" }),
                        dob: result.getValue({ name: "custrecord_hris_emp_dob", join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK" }),
                        phoneNo: result.getValue({ name: "custrecord_hris_emp_phone_no", join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK" }),
                        relationship: result.getText({ name: "custrecord_hris_emp_relationship", join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK" }),
                        insurance: result.getValue({ name: "custrecord_hris_emp_insuranceap", join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK" }),
                        airTicket: result.getValue({ name: "custrecord_hris_emp_air_ticketap", join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK" }),
                        address: result.getValue({ name: "custrecord_hris_emp_address", join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK" }),
                        educationAllowance: result.getValue({ name: "custrecord_hris_emp_education_allowance", join: "CUSTRECORD_HRIS_EMP_EMPLOYEEDEPENDENLINK" })
                    });
                }
                return true; // continue to the next result
            });

            return dependants;
        } catch (error) {
            log.error({ title: 'Error in Dependant Search', details: error });
            return dependants; // Return empty array in case of error
        }
    }

    function searchDependantIdDetails(empid) {
        var dependantIdDetails = [];
        try {
            var dependantIdSearchObj = search.create({
                type: "employee", // Replace with the actual dependant ID record type
                filters: [["internalid", "anyof", empid]], // Assuming custrecord_employee is the link to employee records
                columns: [
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "internalid"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdepidtype",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "idType"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdepidno",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "idNo"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdependentname",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "dependantIdName"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdepcompanyname",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "companyName"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdepcountryofissue",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "countryOfIssue"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdepdtissue",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "issueDate"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdepdtexpiry",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "expiryDate"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdepworkpermitdes",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "designation"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdepremarks",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "remarks"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdepremainder",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "remainder"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdepremainderdt",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "remainderDate"
                    }),
                    search.createColumn({
                        name: "custrecord_hris_empdepattachment",
                        join: "CUSTRECORD_HRIS_EMPDEPIDLINK",
                        label: "attachment"
                    }),
                ]
            });

            dependantIdSearchObj.run().each(function (result) {
                var internalId = result.getValue({ name: "internalid", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" });
                if (internalId) {
                    var attachmentId = result.getValue({ name: "custrecord_hris_empdepattachment", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" });
                    var attachmentUrl = "";
                    var accountId = runtime.accountId;

                    if (attachmentId) {
                        try {
                            var fileObj = file.load({ id: attachmentId });

                            // Check if the file is online, if not, set it to be online
                            if (!fileObj.isOnline) {
                                fileObj.isOnline = true;
                                fileObj.save();
                                log.debug("File set to be online", attachmentId);
                            }

                            // Construct the full file URL
                            // attachmentUrl = 'https://' + accountId + '.app.netsuite.com' + fileObj.url;
                            attachmentUrl = 'https://11951030.app.netsuite.com' + fileObj.url;
                            log.debug("Full Attachment URL", attachmentUrl);

                        } catch (e) {
                            log.error("Error loading attachment file", e);
                        }
                    }
                    dependantIdDetails.push({
                        internalid: result.getValue({ name: "internalid", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        idType: result.getText({ name: "custrecord_hris_empdepidtype", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        idNo: result.getValue({ name: "custrecord_hris_empdepidno", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        dependantIdName: result.getValue({ name: "custrecord_hris_empdependentname", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        companyName: result.getValue({ name: "custrecord_hris_empdepcompanyname", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        countryOfIssue: result.getValue({ name: "custrecord_hris_empdepcountryofissue", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        issueDate: result.getValue({ name: "custrecord_hris_empdepdtissue", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        expiryDate: result.getValue({ name: "custrecord_hris_empdepdtexpiry", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        designation: result.getValue({ name: "custrecord_hris_empdepworkpermitdes", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        remarks: result.getValue({ name: "custrecord_hris_empdepremarks", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        remainder: result.getValue({ name: "custrecord_hris_empdepremainder", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        remainderDate: result.getValue({ name: "custrecord_hris_empdepremainderdt", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" }),
                        //attachment: result.getText({ name: "custrecord_hris_empdepattachment", join: "CUSTRECORD_HRIS_EMPDEPIDLINK" })
                        attachmentID: attachmentId || '',
                        attachmentUrl: attachmentUrl || ''
                    });
                }
                return true; // continue to the next result
            });

            return dependantIdDetails;
        } catch (error) {
            log.error({ title: 'Error in Dependant ID Search', details: error });
            return dependantIdDetails; // Return empty array in case of error
        }
    }

    /* function searchEmergencyContacts(empid) {
        var emergencyContacts = [];
        try {
            var emergencyContactSearchObj = search.create({
                type: "employee", // Replace with the actual emergency contact record type
                filters: [["internalid", "anyof", empid]], // Assuming custrecord_employee is the link to employee records
                columns: [
                    search.createColumn({name: "internalid", label: "internalid"}),
                    search.createColumn({name: "emergencycontactname", label: "emergencyContactName"}),
      search.createColumn({name: "emergencycontactaddress", label: "emergencyContactAddress"}),
      search.createColumn({name: "emergencycontactrelationship", label: "emergencyContactRelationship"}),
      search.createColumn({name: "emergencycontactphone", label: "emergencyContactNo"})
                ]
            });

            emergencyContactSearchObj.run().each(function(result) {
            
                emergencyContacts.push({
                internalid: result.getValue({ name: "internalid" }),
                emergencyContactName: result.getValue({ name: "emergencycontactname" }),
                emergencyContactAddress: result.getValue({ name: "emergencycontactaddress" }),
                emergencyContactRelationship: result.getValue({ name: "emergencycontactrelationship" }),
                emergencyContactNo: result.getValue({ name: "emergencycontactphone" })
                });
                return true; // continue to the next result
            });

            return emergencyContacts;
        } catch (error) {
            log.error({ title: 'Error in Emergency Contact Search', details: error });
            return emergencyContacts; // Return empty array in case of error
        }
    } */
    function searchEmergencyContacts(empid) {
        var emergencyContacts = [];
        try {
            var suiteql =
                "SELECT id, contact AS emergencyContactName, address AS emergencyContactAddress, " +
                "relationship AS emergencyContactRelationship, phone AS emergencyContactNo " +
                "FROM employeeEmergencyContact " +
                "WHERE employee = ?";


            var resultSet = query.runSuiteQL({
                query: suiteql,
                params: [empid]
            });

            if (resultSet && resultSet.results.length > 0) {
                resultSet.results.forEach(function (result) {
                    emergencyContacts.push({
                        internalid: result.values[0],
                        emergencyContactName: result.values[1],
                        emergencyContactAddress: result.values[2],
                        emergencyContactRelationship: result.values[3],
                        emergencyContactNo: result.values[4]
                    });
                });
            }

            return emergencyContacts;
        } catch (error) {
            log.error({ title: 'Error in SuiteQL Emergency Contact Query', details: error });
            return emergencyContacts;
        }
    }

    function formatFileSize(size) {
        // Convert file size to a readable format
        if (size < 1024) return size + " Bytes";
        else if (size < 1048576) return (size / 1024).toFixed(2) + " KB";
        else if (size < 1073741824) return (size / 1048576).toFixed(2) + " MB";
        else return (size / 1073741824).toFixed(2) + " GB";
    }

    function formatDateString(dateString) {
        if (!dateString) return '';
        var dateObj = format.parse({ value: dateString, type: format.Type.DATE });
        return format.format({ value: dateObj, type: format.Type.DATE });
    }

    /* function execute(context) {
        
        try {
              var empid = runtime.getCurrentScript().getParameter({ name: "custscript_hris_empid" });
              var method = runtime.getCurrentScript().getParameter({ name: "custscript_hris_method" });
              log.debug("empid", empid);
              log.debug("method", method);
              if (!empid || !method) {
                  log.error({ title: 'Missing Parameter', details: 'Employee HID or Method parameter is missing' });
                  return;
              }
  
              var employeeData = searchEmployeeDetails(empid);
              log.debug("employeeData", employeeData);
  
              if (employeeData.length === 0) {
                  log.error({ title: 'Employee not found', details: 'No employee found with HID ' + empid });
                  return;
              }
  
              var employee = employeeData[0];
              var jsonData = JSON.stringify(employee);
  
              
              var employeeRecord = record.load({
                  type: "employee",
                  id: empid,
                  isDynamic: true,
              });
              employeeRecord.setValue({
                  fieldId: "custentity_hris_emp_process_status",
                  value: 1
              });
              employeeRecord.setValue({
                  fieldId: "custentity_hris_emp_api_method",
                  value: method.toUpperCase()
              });
              employeeRecord.setValue({
                  fieldId: "custentity_hris_emp_api_url",
                  value: 'https://mobapp.nijatech.com:4000/api/netsuite/addemployee'
                  
              });
              employeeRecord.setValue({
                  fieldId: "custentity_hris_emp_json_data",
                  value: jsonData
              });
              employeeRecord.save({
      enableSourcing: true, 
      ignoreMandatoryFields: true 
  });
  
          } catch (e) {
              log.error({ title: 'Error in scheduled script', details: e });
          }
        
      } */
    function execute(context) {
        var employeeRecord;

        try {
            var empid = runtime.getCurrentScript().getParameter({ name: "custscript_hris_empid" });
            var method = runtime.getCurrentScript().getParameter({ name: "custscript_hris_method" });

            log.debug("Processing Employee ID:", empid);
            log.debug("Request Method:", method);

            if (!empid || !method) {
                log.error("Missing Parameter", "Employee HID or Method parameter is missing.");
                return;
            }

            // Fetch employee details
            var employeeData = searchEmployeeDetails(empid);
            log.debug("Employee Data:", employeeData);

            if (employeeData.length === 0) {
                log.error("Employee Not Found", "No employee found with HID " + empid);
                return;
            }

            var employee = employeeData[0];
            var jsonData = JSON.stringify(employee);
            log.debug("jsonData",jsonData);
            //  Load Employee Record ONCE
            employeeRecord = record.load({
                type: "employee",
                id: empid,
                isDynamic: true
            });
           var authData = {
    "email": "elevate@gmail.com",
    "password": "elevate@123"
            };
            var authJsonData = JSON.stringify(authData);

            var authResponse = https.post({
                url: "https://mobapp.nijatech.com:5612/api/netsuite/gettoken", // Update with your actual login API URL
                headers: {
                    "Content-Type": "application/json"
                },
                body: authJsonData
            });

            var authBody = JSON.parse(authResponse.body);
            var token = authBody.jwtoken;

            // Define the API token
            //var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFsZmFyZWV0aGEiLCJpYXQiOjE3NjczNTE2MzAsImV4cCI6MTc5ODg4NzYzMH0.O2PyW-wuvk5Bsgmqge-hc8uXaie4oJOK9X6mX3dheMk";

            // Send data to the external API
            var response = https.post({
                url: "https://mobapp.nijatech.com:5612/api/netsuite/addemployee",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: jsonData
            });

            log.debug("Response Code:", response.code);
            log.debug("Response Body:", response.body);

            var responseBody;
            try {
                responseBody = JSON.parse(response.body);
            } catch (e) {
                log.error("Failed to Parse Response Body", response.body);
                throw new Error("Invalid JSON response: " + e.message);
            }

            var isSuccess = responseBody.status === true;
            var statusField = isSuccess ? 2 : 3;

            log.debug("Process Status:", statusField);
            log.debug("API Response Status:", isSuccess ? "Success" : "Failure");

            //  Update Employee Record (Success Case)
            employeeRecord.setValue({ fieldId: "custentity_hris_emp_process_status", value: statusField });
            employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_status", value: isSuccess ? "Success" : "Failure" });
            employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_message", value: responseBody.message || "No message received" });
            employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_code", value: response.code });
            employeeRecord.setValue({ fieldId: "custentity_hris_emp_api_method", value: method.toUpperCase() });
            employeeRecord.setValue({ fieldId: "custentity_hris_emp_api_url", value: 'https://mobapp.nijatech.com:5612/api/netsuite/addemployee' });
            employeeRecord.setValue({ fieldId: "custentity_hris_emp_json_data", value: jsonData });

            employeeRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

            log.debug("Employee record updated successfully for empid:", empid);

            if (response.code !== 200) {
                throw new Error("Failed to modify employee. Response Code: " + response.code + ", Body: " + response.body);
            }

        } catch (e) {
            log.error({ title: "Error modifying employee", details: e });

            if (employeeRecord) {
                try {
                    //  Update Employee Record (Failure Case)
                    employeeRecord.setValue({ fieldId: "custentity_hris_emp_process_status", value: 3 }); // Failure status
                    employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_status", value: "Failure" });
                    employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_message", value: e.message });
                    employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_code", value: 500 });

                    employeeRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

                    log.debug("Employee record updated after failure for empid:", empid);
                } catch (saveError) {
                    log.error({ title: "Error saving employee record after failure", details: saveError });
                }
            }
        }
    }
    /* function execute(context) {
     var employeeRecord;
     
     try {
         var empid = runtime.getCurrentScript().getParameter({ name: "custscript_hris_empid" });
         var method = runtime.getCurrentScript().getParameter({ name: "custscript_hris_method" });
 
         log.debug("Processing Employee ID:", empid);
         log.debug("Request Method:", method);
 
         if (!empid || !method) {
             log.error("Missing Parameter", "Employee HID or Method parameter is missing.");
             return;
         }
 
         // Fetch employee details
         var employeeData = searchEmployeeDetails(empid);
         log.debug("Employee Data:", employeeData);
 
         if (employeeData.length === 0) {
             log.error("Employee Not Found", "No employee found with HID " + empid);
             return;
         }
 
         var employee = employeeData[0];
         var jsonData = JSON.stringify(employee);
 
         // Load Employee Record
         employeeRecord = record.load({
             type: "employee",
             id: empid,
             isDynamic: true
         });
 
         // Set API-related fields
         employeeRecord.setValue({ fieldId: "custentity_hris_emp_process_status", value: 1 });
         
 
         // Save record before sending API request
         employeeRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
 
         // Define the API token
         var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImhhbGFAZ21haWwuY29tIiwiaWF0IjoxNzIyMjQ2MDIwLCJleHAiOjE3NTM3ODIwMjB9.9zGSh8L2w2EjGOVCGrZDUQVb48wiJFs61yTC1RIGO1Q";
 
         // Send data to the external API
         var response = https.post({
             url: "https://mobapp.nijatech.com:4000/api/netsuite/addemployee",
             headers: {
                 "Authorization": "Bearer " + token,
                 "Content-Type": "application/json"
             },
             body: jsonData
         });
 
         log.debug("Response Code:", response.code);
         log.debug("Response Body:", response.body);
 
         var responseBody;
         try {
             responseBody = JSON.parse(response.body);
         } catch (e) {
             log.error("Failed to Parse Response Body", response.body);
             throw new Error("Invalid JSON response: " + e.message);
         }
 
         var isSuccess = responseBody.status === true;
         var statusField = isSuccess ? 2 : 3;
 
         log.debug("Process Status:", statusField);
         log.debug("API Response Status:", isSuccess ? "Success" : "Failure");
 
         // Update Employee Record (Success Case)
         employeeRecord.setValue({ fieldId: "custentity_hris_emp_process_status", value: statusField });
         employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_status", value: isSuccess ? "Success" : "Failure" });
         employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_message", value: responseBody.message || "No message received" });
         employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_code", value: response.code });
 
         employeeRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
 
         log.debug("Employee record updated successfully for empid:", empid);
 
         if (response.code !== 200) {
             throw new Error("Failed to modify employee. Response Code: " + response.code + ", Body: " + response.body);
         }
     } catch (e) {
         log.error({ title: "Error modifying employee", details: e });
 
         if (employeeRecord) {
             try {
               
                 employeeRecord.setValue({ fieldId: "custentity_hris_emp_process_status", value: 3 }); // Failure status
                 employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_status", value: "Failure" });
                 employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_message", value: e.message });
                 employeeRecord.setValue({ fieldId: "custentity_hris_emp_response_code", value: 500 });
 
                 employeeRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
 
                 log.debug("Employee record updated after failure for empid:", empid);
             } catch (saveError) {
                 log.error({ title: "Error saving employee record after failure", details: saveError });
             }
         }
     }
 }  */

function execute(context) {
    var empid; // Declared outside to ensure it is accessible in the catch block

    try {
        empid = runtime.getCurrentScript().getParameter({ name: "custscript_hris_empid" });
        var method = runtime.getCurrentScript().getParameter({ name: "custscript_hris_method" });

        log.debug("Processing Employee ID:", empid);
        log.debug("Request Method:", method);

        if (!empid || !method) {
            log.error("Missing Parameter", "Employee HID or Method parameter is missing.");
            return;
        }

        // Fetch employee details
        var employeeData = searchEmployeeDetails(empid);
        log.debug("Employee Data:", employeeData);

        if (employeeData.length === 0) {
            log.error("Employee Not Found", "No employee found with HID " + empid);
            return;
        }

        var employee = employeeData[0];
        var jsonData = JSON.stringify(employee);
        log.debug("JSON DATA",jsonData);
        var authData = {
           "email": "elevate@gmail.com",
    "password": "elevate@123"
        };
        var authJsonData = JSON.stringify(authData);

        var authResponse = https.post({
            url: "https://mobapp.nijatech.com:5612/api/netsuite/gettoken", // Update with your actual login API URL
            headers: {
                "Content-Type": "application/json"
            },
            body: authJsonData
        });

        var authBody = JSON.parse(authResponse.body);
        var token = authBody.jwtoken;

        // Send data to the external API
        var response = https.post({
            url: "https://mobapp.nijatech.com:5612/api/netsuite/addemployee",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: jsonData
        });

        log.debug("Response Code:", response.code);
        log.debug("Response Body:", response.body);

        var responseBody;
        try {
            responseBody = JSON.parse(response.body);
        } catch (e) {
            log.error("Failed to Parse Response Body", response.body);
            throw new Error("Invalid JSON response: " + e.message);
        }

        var isSuccess = responseBody.status === true;
        var statusField = isSuccess ? 2 : 3;

        log.debug("Process Status:", statusField);
        log.debug("API Response Status:", isSuccess ? "Success" : "Failure");

        // Use submitFields for efficiency (Success Case)
        record.submitFields({
            type: "employee",
            id: empid,
            values: {
                "custentity_hris_emp_process_status": statusField,
                "custentity_hris_emp_response_status": isSuccess ? "Success" : "Failure",
                "custentity_hris_emp_response_message": responseBody.message || "No message received",
                "custentity_hris_emp_response_code": response.code,
                "custentity_hris_emp_api_method": method.toUpperCase(),
                "custentity_hris_emp_api_url": 'https://mobapp.nijatech.com:5612/api/netsuite/addemployee',
                "custentity_hris_emp_json_data": jsonData
            },
            options: {
                enableSourcing: true,
                ignoreMandatoryFields: true
            }
        });

        log.debug("Employee record updated successfully for empid:", empid);

        if (response.code !== 200) {
            throw new Error("Failed to modify employee. Response Code: " + response.code + ", Body: " + response.body);
        }

    } catch (e) {
        log.error({ title: "Error modifying employee", details: e });

        if (empid) {
            try {
                // Use submitFields for efficiency (Failure Case)
                record.submitFields({
                    type: "employee",
                    id: empid,
                    values: {
                        "custentity_hris_emp_process_status": 3, // Failure status
                        "custentity_hris_emp_response_status": "Failure",
                        "custentity_hris_emp_response_message": e.message,
                        "custentity_hris_emp_response_code": 500
                    },
                    options: {
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    }
                });

                log.debug("Employee record updated after failure for empid:", empid);
            } catch (saveError) {
                log.error({ title: "Error saving employee record after failure", details: saveError });
            }
        }
    }
}
    return {
        execute: execute
    };
});
