//final update search 
/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/format'], function (record, search, log, format) {
  var handlePostRequest = function (data) {
      try {
          var nsId = data.nsId;
        log.debug("nsId",nsId);
          var firstName = data.firstName;
          var middleName = data.middleName;
          var lastName = data.lastName;
          
          /* var documents = data.documents;
          var qualifications = data.qualification; 
          var dependantIdDetails = data.dependantIdDetails; 
          var skills = data.skills; */ 
          var documents = data.documents || []; // Default to empty array if not provided
          var dependantDetails = data.dependantDetails || []; // Default to empty array if not provided
          var qualifications = data.qualification || []; // Default to empty array if not provided
          var dependantIdDetails = data.dependantIdDetails || []; // Default to empty array if not provided
          var skills = data.skills || []; // Default to empty array if not provided   
          var contacts = data.contacts || []; // Default to empty array if not provided
          var emergencyContacts = data.emergencyContact || []; // Default to empty array if not provided

          // Helper function to parse date string
          function parseDate(dateStr) {
              try {
                  return format.parse({
                      value: dateStr,
                      type: format.Type.DATE
                  });
              } catch (e) {
                  throw new Error('Invalid date value (must be DD/MM/YYYY): ' + dateStr);
              }
          }
        
          var documentRecordIds = []; // Array to store all document record IDs
          documents.forEach(function (doc, index) {
              log.debug('Processing Document #' + (index + 1), JSON.stringify(doc));
  
              var internalId = doc.internalid;
              var documentType = doc.documentType;
              var companyName = doc.companyName;
              var issueDate = doc.issueDate ? parseDate(doc.issueDate) : null;
              var expiryDate = doc.expiryDate ? parseDate(doc.expiryDate) : null;
              var attachmentUrl = doc.attachmentUrl;
              var idNo = doc.idNo;
              var countryOfIssue = doc.countryOfIssue;
              var designation = doc.designation;
              var remarks = doc.remarks;
              var remainder = doc.remainder;
              var remainderDate = doc.remainderDate ? parseDate(doc.remainderDate) : null;

              var recordExists = [];
              if (internalId) {
                  recordExists = search.create({
                      type: 'customrecord_hris_emp_id_info',
                      filters: [
                          ['internalid', 'is', internalId]
                      ],
                      columns: ['internalid']
                  }).run().getRange({ start: 0, end: 1 });
              }

              var empRecord;

              if (recordExists.length > 0) {
                  // Record exists, load and update
                  empRecord = record.load({
                      type: 'customrecord_hris_emp_id_info',
                      id: internalId
                  });

                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_id_type', value: documentType });
                  empRecord.setValue({ fieldId: 'custrecord_hris_company_name', value: companyName });
                  empRecord.setValue({ fieldId: 'custrecord_hris_id_no', value: idNo });
                  if (issueDate) empRecord.setValue({ fieldId: 'custrecord_hris_date_issue', value: issueDate });
                  if (expiryDate) empRecord.setValue({ fieldId: 'custrecord_hris_date_exp', value: expiryDate });
                  empRecord.setValue({ fieldId: 'custrecord_hris_country_issue', value: countryOfIssue });
                  empRecord.setValue({ fieldId: 'custrecord_hris_design_per_work', value: designation });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_remarks', value: remarks });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_remainder', value: remainder });
                  if (remainderDate) empRecord.setValue({ fieldId: 'custrecord_hris_remainder_date', value: remainderDate });
                  empRecord.setValue({ fieldId: 'custrecord_hris_attachment', value: attachmentUrl });
                  empRecord.save();

                  log.debug('Record Updated', 'Record with ID ' + internalId + ' updated successfully.');
              } else {
                  // Record does not exist, create new
                  empRecord = record.create({
                      type: 'customrecord_hris_emp_id_info'
                  });

                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_id_type', value: documentType });
                  empRecord.setValue({ fieldId: 'custrecord_hris_company_name', value: companyName });
                  if (issueDate) empRecord.setValue({ fieldId: 'custrecord_hris_date_issue', value: issueDate });
                  if (expiryDate) empRecord.setValue({ fieldId: 'custrecord_hris_date_exp', value: expiryDate });
                  empRecord.setValue({ fieldId: 'custrecord_hris_attachment', value: attachmentUrl });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_link', value: nsId });
                  empRecord.setValue({ fieldId: 'custrecord_hris_id_no', value: idNo });
                  empRecord.setValue({ fieldId: 'custrecord_hris_country_issue', value: countryOfIssue });
                  empRecord.setValue({ fieldId: 'custrecord_hris_design_per_work', value: designation });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_remarks', value: remarks });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_remainder', value: remainder });
                  if (remainderDate) empRecord.setValue({ fieldId: 'custrecord_hris_remainder_date', value: remainderDate });
                  var documentRecordId = empRecord.save();

                  log.debug('Record Created', 'New Document record created successfully with ID: ' + documentRecordId);
                  documentRecordIds.push(documentRecordId);
              }
          });

          var dependantRecordIds = [];
          dependantDetails.forEach(function (doc) {
              var internalId = doc.internalid;
              var dependantName = doc.dependantName;
              var relationship = doc.relationship;
              /* var issueDate = doc.issueDate ? parseDate(doc.issueDate) : null;
              var expiryDate = doc.expiryDate ? parseDate(doc.expiryDate) : null; */
              var dob = doc.dob ? parseDate(doc.dob) : null;
              var phoneNo = doc.phoneNo;
              var insurance = doc.insurance;
              var airTicket = doc.airTicket;
              //var address = doc.address;
              var educationAllowance = doc.educationAllowance;

              var recordExists = [];
              if (internalId) {
                  recordExists = search.create({
                      type: 'customrecord_hris_emp_employee_dependent',
                      filters: [
                          ['internalid', 'is', internalId]
                      ],
                      columns: ['internalid']
                  }).run().getRange({ start: 0, end: 1 });
              }

              var empDependentRecord;

              if (recordExists.length > 0) {
                  // Record exists, load and update
                  empDependentRecord = record.load({
                      type: 'customrecord_hris_emp_employee_dependent',
                      id: internalId
                  });

                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_dependent_name', value: dependantName });
                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_relationship', value: relationship });
                  /* if (issueDate) empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_issue_date', value: issueDate });
                  if (expiryDate) empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_expiry_date', value: expiryDate }); */
                  if (dob) empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_dob', value: dob });
                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_phone_no', value: phoneNo });
                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_insuranceap', value: insurance });
                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_air_ticketap', value: airTicket });
                  //empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_address', value: address });
                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_education_allowance', value: educationAllowance });
                  empDependentRecord.save();

                  log.debug('Dependent Record Updated', 'Dependent record with ID ' + internalId + ' updated successfully.');
              } else {
                  // Record does not exist, create new
                  empDependentRecord = record.create({
                      type: 'customrecord_hris_emp_employee_dependent'
                  });

                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_dependent_name', value: dependantName });
                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_relationship', value: relationship });
                  /* if (issueDate) empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_issue_date', value: issueDate });
                  if (expiryDate) empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_expiry_date', value: expiryDate }); */
                  if (dob) empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_dob', value: dob });
                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_phone_no', value: phoneNo });
                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_insuranceap', value: insurance });
                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_air_ticketap', value: airTicket });
                  //empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_address', value: address });
                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_education_allowance', value: educationAllowance });
                  empDependentRecord.setValue({ fieldId: 'custrecord_hris_emp_employeedependenlink', value: nsId });
                  var empDepRecordId = empDependentRecord.save(); 

                  log.debug('Record Created', 'New emp Dependant record created successfully with ID: ' + empDepRecordId);
                  dependantRecordIds.push(empDepRecordId);
              }
          });

          var qualificationRecordIds = [];  
          qualifications.forEach(function (qual, index) {
              log.debug('Processing Qualification #' + (index + 1), JSON.stringify(qual));
              var internalId = qual.internalid;
              var education = qual.education;
              var college = qual.college;
              var passingYear = qual.passingYear;
              var percentage = qual.percentage;
              var attachmentUrl = qual.attachmentUrl;
              var levelofeducation = qual.levelofeducation;

              var qualificationExists = [];
              if (internalId) {
                  qualificationExists = search.create({
                      type: 'customrecord_hris_emp_qualification',
                      filters: [
                          ['internalid', 'is', internalId]
                      ],
                      columns: ['internalid']
                  }).run().getRange({ start: 0, end: 1 });
              }

              var qualRecord;

              if (qualificationExists.length > 0) {
                  // Qualification record exists, load and update
                  qualRecord = record.load({
                      type: 'customrecord_hris_emp_qualification',
                      id: internalId
                  });

                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_education', value: education });
                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_college_univercity', value: college });
                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_passing_year', value: passingYear });
                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_percentage', value: percentage });
                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_certificate', value: attachmentUrl });
                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_levek_of_education', value: levelofeducation });
                  qualRecord.save();

                  log.debug('Qualification Updated', 'Qualification with ID ' + internalId + ' updated successfully.');
              } else {
                  // Qualification record does not exist, create new
                  qualRecord = record.create({
                      type: 'customrecord_hris_emp_qualification'
                  });

                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_education', value: education });
                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_college_univercity', value: college });
                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_passing_year', value: passingYear });
                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_percentage', value: percentage });
                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_certificate', value: attachmentUrl });
                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_levek_of_education', value: levelofeducation });
                  qualRecord.setValue({ fieldId: 'custrecord_hris_emp_qm_link', value: nsId });
                  var qualificationRecordId = qualRecord.save(); 

                  log.debug('Record Created', 'New qualification record created successfully with ID: ' + qualificationRecordId);
                  qualificationRecordIds.push(qualificationRecordId);
              }
          });

          var dependantIdRecordIds = [];  
          dependantIdDetails.forEach(function (dep) {
              var internalId = dep.internalid;
              var idType = dep.idType;
              var idNo = dep.idNo;
              var dependantIdName = dep.dependantIdName;
              var companyName = dep.companyName;
              var countryOfIssue = dep.countryOfIssue;
              var issueDate = dep.issueDate ? parseDate(dep.issueDate) : null;
              var expiryDate = dep.expiryDate ? parseDate(dep.expiryDate) : null;
              var designation = dep.designation;
              var remarks = dep.remarks;
              var remainder = dep.remainder;
              var remainderDate = dep.remainderDate ? parseDate(dep.remainderDate) : null;
              var attachmentUrl = dep.attachmentUrl;

              var recordExists = [];
              if (internalId) {
                  recordExists = search.create({
                      type: 'customrecord_hris_empdependentiddetails',
                      filters: [
                          ['internalid', 'anyof', internalId]
                      ],
                      columns: ['internalid']
                  }).run().getRange({ start: 0, end: 1 });
              }

              var dependentRecord;

              if (recordExists.length > 0) {
                  // Dependent record exists, load and update
                  dependentRecord = record.load({
                      type: 'customrecord_hris_empdependentiddetails',
                      id: recordExists[0].id
                  });

                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepidtype', value: idType });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepidno', value: idNo });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdependentname', value: dependantIdName });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepcompanyname', value: companyName });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepcountryofissue', value: countryOfIssue });
                  if (issueDate) dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepdtissue', value: issueDate });
                  if (expiryDate) dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepdtexpiry', value: expiryDate });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepworkpermitdes', value: designation });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepremarks', value: remarks });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepremainder', value: remainder });
                  if (remainderDate) dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepremainderdt', value: remainderDate });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepattachment', value: attachmentUrl });
                  dependentRecord.save();

                  log.debug('Dependent Updated', 'Dependent with ID ' + internalId + ' updated successfully.');
              } else {
                  // Dependent record does not exist, create new
                  dependentRecord = record.create({
                      type: 'customrecord_hris_empdependentiddetails'
                  });

                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepidtype', value: idType });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepidno', value: idNo });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdependentname', value: dependantIdName });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepcompanyname', value: companyName });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepcountryofissue', value: countryOfIssue });
                  if (issueDate) dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepdtissue', value: issueDate });
                  if (expiryDate) dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepdtexpiry', value: expiryDate });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepworkpermitdes', value: designation });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepremarks', value: remarks });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepremainder', value: remainder });
                  if (remainderDate) dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepremainderdt', value: remainderDate });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepattachment', value: attachmentUrl });
                  dependentRecord.setValue({ fieldId: 'custrecord_hris_empdepidlink', value: nsId });
                  var dependantIdRecordId = dependentRecord.save(); 

                  log.debug('Record Created', 'New dependant Id record created successfully with ID: ' + dependantIdRecordId);
                  dependantIdRecordIds.push(dependantIdRecordId);
              }
          });

          var skillRecordIds = []; 
          skills.forEach(function (skill, index) {
              log.debug('Processing Skill #' + (index + 1), JSON.stringify(skill));
              var internalId = skill.internalid;
              var skillCode = skill.skillCode;
              var skillName = skill.skillName;
              var attachmentUrl = skill.attachmentUrl;
              var yearsofexperience = skill.yearsOfExperience;
  
              var recordExists = [];
              if (internalId) {
                  recordExists = search.create({
                      type: 'customrecord_hris_emp_skill',
                      filters: [
                          ['internalid', 'is', internalId]
                      ],
                      columns: ['internalid']
                  }).run().getRange({ start: 0, end: 1 });
              }

              var empRecord;

              if (recordExists.length > 0) {
                  // Record exists, load and update
                  empRecord = record.load({
                      type: 'customrecord_hris_emp_skill',
                      id: internalId
                  });

                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_skill_code', value: skillCode });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_skill_name', value: skillName });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_skilldet_certificate', value: attachmentUrl });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_skilldet_years_of_ex', value: yearsofexperience });
                  empRecord.save();

                  log.debug('Record Updated', 'Record with ID ' + internalId + ' updated successfully.');
              } else {
                  // Record does not exist, create new
                  empRecord = record.create({
                      type: 'customrecord_hris_emp_skill'
                  });

                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_skill_code', value: skillCode });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_skill_name', value: skillName });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_skilldet_certificate', value: attachmentUrl });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_skilldet_link', value: nsId });
                  empRecord.setValue({ fieldId: 'custrecord_hris_emp_skilldet_years_of_ex', value: yearsofexperience });
                  var skillRecordId = empRecord.save(); 

                  log.debug('Record Created', 'New Skill record created successfully with ID: ' + skillRecordId);
                  skillRecordIds.push(skillRecordId);
              }
          });

          // Load the employee record once to handle both contacts and emergency contacts
          var employeeRecord = record.load({
              type: 'employee',
              id: nsId,
              isDynamic: true // Use dynamic mode for sublist operations
          });

var contactRecordIds = [];
          // Run the search to get existing address data for the employee
          var employeeSearchObj = search.create({
              type: "employee",
              filters: [
                  ["internalid", "is", nsId]
              ],
              columns: [
                  search.createColumn({ name: "addressinternalid", join: "Address", label: "internalid" }),
                  search.createColumn({ name: "address", join: "Address", label: "address" }),
                  search.createColumn({ name: "address1", join: "Address", label: "address1" }),
                  search.createColumn({ name: "address2", join: "Address", label: "address2" }),
                  search.createColumn({ name: "city", join: "Address", label: "city" }),
                  search.createColumn({ name: "state", join: "Address", label: "state" }),
                  search.createColumn({ name: "country", join: "Address", label: "country" }),
                  search.createColumn({ name: "zipcode", join: "Address", label: "zipCode" }),
                  search.createColumn({ name: "addressphone", join: "Address", label: "phone" }),
                  search.createColumn({ name: "firstname", label: "firstName" }),
                  search.createColumn({ name: "isdefaultbilling", join: "Address", label: "defaultBilling" })
              ]
          });

          // Process Contacts (addressbook sublist)
          if (contacts.length > 0) {
              log.debug('Processing Contacts', 'Total contacts: ' + contacts.length);

              // Store search results in an array for easier lookup
              var existingAddresses = [];
              try {
                  employeeSearchObj.run().each(function(result) {
                      existingAddresses.push({
                          internalId: result.getValue({ name: "addressinternalid", join: "Address" }) || '',
                          address: result.getValue({ name: "address", join: "Address" }) || '',
                          address1: result.getValue({ name: "address1", join: "Address" }) || '',
                          address2: result.getValue({ name: "address2", join: "Address" }) || '',
                          city: result.getValue({ name: "city", join: "Address" }) || '',
                          state: result.getValue({ name: "state", join: "Address" }) || '',
                          country: result.getValue({ name: "country", join: "Address" }) || '',
                          zipCode: result.getValue({ name: "zipcode", join: "Address" }) || '',
                          phone: result.getValue({ name: "addressphone", join: "Address" }) || '',
                          firstName: result.getValue({ name: "firstname" }) || '',
                          defaultBilling: result.getValue({ name: "isdefaultbilling", join: "Address" }) === 'T'
                      });
                      return true; // Continue processing all results
                  });
                  log.debug('Existing Addresses from Search', JSON.stringify(existingAddresses));
              } catch (e) {
                  log.error('Search Execution Error', 'Failed to run search: ' + e.message);
              }

              contacts.forEach(function(contact, index) {
                  log.debug('Processing Contact #' + (index + 1), JSON.stringify(contact));
                  var internalId = contact.internalid;
                  var address = contact.address;
                  var address1 = contact.address1;
                  var address2 = contact.address2;
                  var city = contact.city;
                  var state = contact.state;
                  var country = contact.country;
                  var zipCode = contact.zipCode;
                  var phone = contact.phone;
                  var firstName = contact.firstName;
                  var defaultBilling = contact.defaultBilling;

                  // Log state value for debugging
                  log.debug('Contact State Value', 'State: ' + JSON.stringify(state) + ', Type: ' + typeof state);

                  // Find matching address in search results using a loop
                  var matchingAddress = null;
                  if (Array.isArray(existingAddresses)) {
                      for (var i = 0; i < existingAddresses.length; i++) {
                          if (existingAddresses[i].internalId == internalId) {
                              matchingAddress = existingAddresses[i];
                              break;
                          }
                      }
                  } else {
                      log.error('Invalid existingAddresses', 'existingAddresses is not an array: ' + JSON.stringify(existingAddresses));
                  }

                  var lineNumber = -1;
                  if (internalId && matchingAddress) {
                      for (var i = 0; i < employeeRecord.getLineCount({ sublistId: 'addressbook' }); i++) {
                          var addressInternalId = employeeRecord.getSublistValue({
                              sublistId: 'addressbook',
                              fieldId: 'internalid',
                              line: i
                          });
                          log.debug('Comparing Address IDs', 'Provided ID: ' + internalId + ', Sublist ID: ' + addressInternalId);
                          if (addressInternalId == internalId) {
                              lineNumber = i;
                              break;
                          }
                      }
                      if (lineNumber == -1) {
                          log.debug('No Match Found in Sublist', 'No address found with ID: ' + internalId);
                      }
                  }

                  try {
                      if (lineNumber >= 0) {
                          // Update existing address
                          employeeRecord.selectLine({ sublistId: 'addressbook', line: lineNumber });
                          var addressSubrecord = employeeRecord.getCurrentSublistSubrecord({
                              sublistId: 'addressbook',
                              fieldId: 'addressbookaddress'
                          });

                          if (addressSubrecord) {
                              if (country) addressSubrecord.setValue({ fieldId: 'country', value: country });
                              if (address) addressSubrecord.setValue({ fieldId: 'addrtext', value: address });
                              if (address1 && typeof address1 === 'string' && address1.trim() !== '') {
                                  addressSubrecord.setValue({ fieldId: 'addr1', value: address1 });
                                  log.debug('Address1 Updated', 'address1: ' + address1 + ', Retrieved: ' + addressSubrecord.getValue({ fieldId: 'addr1' }));
                              }
                              if (address2 && typeof address2 === 'string' && address2.trim() !== '') {
                                  addressSubrecord.setValue({ fieldId: 'addr2', value: address2 });
                                  log.debug('Address2 Updated', 'address2: ' + address2 + ', Retrieved: ' + addressSubrecord.getValue({ fieldId: 'addr2' }));
                              }
                              if (city && typeof city === 'string' && city.trim() !== '') {
                                  addressSubrecord.setValue({ fieldId: 'city', value: city });
                                  log.debug('City Updated', 'city: ' + city + ', Retrieved: ' + addressSubrecord.getValue({ fieldId: 'city' }));
                              }
                              if (state && typeof state === 'string' && state.trim() !== '') {
                                  addressSubrecord.setValue({ fieldId: 'state', value: state });
                                  log.debug('State Updated', 'state: ' + state + ', Retrieved: ' + addressSubrecord.getValue({ fieldId: 'state' }));
                              }
                              if (zipCode) addressSubrecord.setValue({ fieldId: 'zip', value: zipCode });
                              if (phone) addressSubrecord.setValue({ fieldId: 'addrphone', value: phone });
                              if (firstName) addressSubrecord.setValue({ fieldId: 'addressee', value: firstName });

                              employeeRecord.setCurrentSublistValue({
                                  sublistId: 'addressbook',
                                  fieldId: 'defaultbilling',
                                  value: defaultBilling
                              });
                              employeeRecord.commitLine({ sublistId: 'addressbook' });
                              contactRecordIds.push(internalId);
                              log.debug('Contact Updated', 'Address with ID ' + internalId + ' updated successfully.');
                          } else {
                              log.error('Address Subrecord Error', 'Failed to access addressbookaddress subrecord for line ' + lineNumber);
                          }
                      } else {
                          // Create new address
                          employeeRecord.selectNewLine({ sublistId: 'addressbook' });
                          var addressSubrecord = employeeRecord.getCurrentSublistSubrecord({
                              sublistId: 'addressbook',
                              fieldId: 'addressbookaddress'
                          });

                          if (addressSubrecord) {
                              if (country) addressSubrecord.setValue({ fieldId: 'country', value: country });
                              if (address) addressSubrecord.setValue({ fieldId: 'addrtext', value: address });
                              if (address1 && typeof address1 === 'string' && address1.trim() !== '') {
                                  addressSubrecord.setValue({ fieldId: 'addr1', value: address1 });
                                  log.debug('Address1 Created', 'address1: ' + address1 + ', Retrieved: ' + addressSubrecord.getValue({ fieldId: 'addr1' }));
                              }
                              if (address2 && typeof address2 === 'string' && address2.trim() !== '') {
                                  addressSubrecord.setValue({ fieldId: 'addr2', value: address2 });
                                  log.debug('Address2 Created', 'address2: ' + address2 + ', Retrieved: ' + addressSubrecord.getValue({ fieldId: 'addr2' }));
                              }
                              if (city && typeof city === 'string' && city.trim() !== '') {
                                  addressSubrecord.setValue({ fieldId: 'city', value: city });
                                  log.debug('City Created', 'city: ' + city + ', Retrieved: ' + addressSubrecord.getValue({ fieldId: 'city' }));
                              }
                              if (state && typeof state === 'string' && state.trim() !== '') {
                                  addressSubrecord.setValue({ fieldId: 'state', value: state });
                                  log.debug('State Created', 'state: ' + state + ', Retrieved: ' + addressSubrecord.getValue({ fieldId: 'state' }));
                              }
                              if (zipCode) addressSubrecord.setValue({ fieldId: 'zip', value: zipCode });
                              if (phone) addressSubrecord.setValue({ fieldId: 'addrphone', value: phone });
                              if (firstName) addressSubrecord.setValue({ fieldId: 'addressee', value: firstName });

                              employeeRecord.setCurrentSublistValue({
                                  sublistId: 'addressbook',
                                  fieldId: 'defaultbilling',
                                  value: defaultBilling
                              });
                              employeeRecord.commitLine({ sublistId: 'addressbook' });
                              log.debug('Contact Created', 'New address added to employee with ID: ' + nsId);
                          } else {
                              log.error('Address Subrecord Error', 'Failed to create addressbookaddress subrecord');
                          }
                      }
                  } catch (e) {
                      log.error('Error Processing Contact #' + (index + 1), e.message);
                  }
              });
          }
          var emergencyContactRecordIds = [];
          // Process Emergency Contacts (emergencycontact sublist)
          if (emergencyContacts.length > 0) {
              log.debug('Processing Emergency Contacts', 'Total emergency contacts: ' + emergencyContacts.length);
              emergencyContacts.forEach(function (emergencyContact, index) {
                  log.debug('Processing Emergency Contact #' + (index + 1), JSON.stringify(emergencyContact));
                  var internalId = emergencyContact.internalid; // Changed to internalid to match JSON
                  var emergencyContactName = emergencyContact.emergencyContactName;
                  var emergencyContactAddress = emergencyContact.emergencyContactAddress;
                  var emergencyContactRelationship = emergencyContact.emergencyContactRelationship;
                  var emergencyContactNo = emergencyContact.emergencyContactNo;

                  // Validate that at least one field has data to prevent empty lines
                  if (!emergencyContactName && !emergencyContactAddress && !emergencyContactRelationship && !emergencyContactNo) {
                      log.debug('Skipping Emergency Contact #' + (index + 1), 'No data provided, skipping to prevent empty line');
                      return;
                  }

                  var lineNumber = -1;
                  if (internalId) {
                      // Find the sublist line with the matching internalid
                      for (var i = 0; i < employeeRecord.getLineCount({ sublistId: 'emergencycontact' }); i++) {
                          var contactInternalId = employeeRecord.getSublistValue({
                              sublistId: 'emergencycontact',
                              fieldId: 'id', // Changed from 'id' to 'internalid'
                              line: i
                          });
                          log.debug('Comparing Emergency Contact IDs', 'Provided ID: ' + internalId + ', Sublist ID: ' + contactInternalId);
                          if (contactInternalId == internalId) {
                              lineNumber = i;
                              break;
                          }
                      }
                      if (lineNumber == -1) {
                          log.debug('No Match Found', 'No emergency contact found with ID: ' + internalId);
                      }
                  }

                  try {
                      if (lineNumber >= 0) {
                          // Update existing emergency contact
                          employeeRecord.selectLine({ sublistId: 'emergencycontact', line: lineNumber });
                          if (emergencyContactName) employeeRecord.setCurrentSublistValue({
                              sublistId: 'emergencycontact',
                              fieldId: 'contact',
                              value: emergencyContactName
                          });
                          if (emergencyContactAddress) employeeRecord.setCurrentSublistValue({
                              sublistId: 'emergencycontact',
                              fieldId: 'address',
                              value: emergencyContactAddress
                          });
                          if (emergencyContactRelationship) employeeRecord.setCurrentSublistValue({
                              sublistId: 'emergencycontact',
                              fieldId: 'relationship',
                              value: emergencyContactRelationship
                          });
                          if (emergencyContactNo) employeeRecord.setCurrentSublistValue({
                              sublistId: 'emergencycontact',
                              fieldId: 'phone',
                              value: emergencyContactNo
                          });
                          employeeRecord.commitLine({ sublistId: 'emergencycontact' });
                          emergencyContactRecordIds.push(internalId);
                          log.debug('Emergency Contact Updated', 'Emergency Contact with ID ' + internalId + ' updated successfully.');
                      } else {
                          // Create new emergency contact
                          employeeRecord.selectNewLine({ sublistId: 'emergencycontact' });
                          if (emergencyContactName) employeeRecord.setCurrentSublistValue({
                              sublistId: 'emergencycontact',
                              fieldId: 'contact',
                              value: emergencyContactName
                          });
                          if (emergencyContactAddress) employeeRecord.setCurrentSublistValue({
                              sublistId: 'emergencycontact',
                              fieldId: 'address',
                              value: emergencyContactAddress
                          });
                          if (emergencyContactRelationship) employeeRecord.setCurrentSublistValue({
                              sublistId: 'emergencycontact',
                              fieldId: 'relationship',
                              value: emergencyContactRelationship
                          });
                          if (emergencyContactNo) employeeRecord.setCurrentSublistValue({
                              sublistId: 'emergencycontact',
                              fieldId: 'phone',
                              value: emergencyContactNo
                          });
                          employeeRecord.setCurrentSublistValue({
                              sublistId: 'emergencycontact',
                              fieldId: 'custrecord_hris_emergencycontact_link',
                              value: nsId
                          });
                          employeeRecord.commitLine({ sublistId: 'emergencycontact' });
                          log.debug('Emergency Contact Created', 'New emergency contact added to employee with ID: ' + nsId);
                      }
                  } catch (e) {
                      log.error('Error Processing Emergency Contact #' + (index + 1), e.message);
                  }
              });
          }

          // Process image data
          if (data.imagename) {
              var imageName = data.imagename;
              employeeRecord.setValue({
                  fieldId: 'image',
                  value: imageName // Set the image using the internal ID
              });
              log.debug('Image Set', 'Image for employee with internal ID ' + nsId + ' set successfully.');
          }

          // Save the employee record after updating contacts, emergency contacts, and image
          employeeRecord.save();
          log.debug('Employee Record Saved', 'Employee record with ID ' + nsId + ' saved successfully.');

          return {
              success: true,
              message: 'Records processed successfully.',
              documentRecordIds: documentRecordIds,
              dependantRecordIds: dependantRecordIds,
              qualificationRecordIds: qualificationRecordIds,
              dependantIdRecordIds: dependantIdRecordIds,
              skillRecordIds: skillRecordIds,
              contactRecordIds: contactRecordIds,
              emergencyContactRecordIds: emergencyContactRecordIds
          };
      } catch (error) {
          log.error('Error Processing Request', error);
          return {
              success: false,
              message: error.message
          };
      }
  };

  return {
      post: handlePostRequest
  };
});