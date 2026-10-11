/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], function (query, log) {

    function trueorfals(configList, empValue) {
        if (!empValue) return false;

        for (var i = 0; i < configList.length; i++) {
            var configVal = configList[i];
            if (configVal != null && configVal !== '') {
                var parts = configVal.toString().split(',').map(function (p) {
                    return p.trim();
                });
                if (parts.indexOf(empValue.toString()) !== -1) {
                    return true;
                }
            }
        }
        return false;
    }

    function getMatchingLeaveConfigs(request) {
        try {
            var empId = request.empId;
           

            var empSql = "" +
                "SELECT " +
                "id, entityid, custentity_hris_emplegalname, " +
                "subsidiary, " +
                "custentity_hris_empdlocation_new, " +
                "custentity_emp_employee_job_status, " +
                "custentity_hris_empgender, " +
                "custentity_hris_empmaritalstatus, " +
                "custentity_hris_empreligion, " +
                "custentity_emp_grade_, " +
                "custentity_hris_empweeklyoffcriteria, " +
                "custentity_hris_empomani, " +
                "custentity_hris_empcategory " +
                "FROM employee";

            if (empId) {
                empSql += " WHERE id = " + empId;
            }


            var empResult = query.runSuiteQL({ query: empSql }).asMappedResults();

            if (!empResult || empResult.length === 0) {
                return JSON.stringify({
                    Status: "Error",
                    ResponseCode: "404",
                    Message: "Employee not found with id: " + empId
                });
            }

            var leaveSql = "" +
                "SELECT " +
                "id, name, " +
                "custrecord_hris_lveconfig_subsidiary, " +
                "custrecord_hris_lveconfig_location, " +
                "custrecord_hris_lvecfg_accuraldays, " +
               "custrecord_hris_lvecfg_accuraldays_month, " +
              "custrecord_hris_lvecfg_accuralcheck, " +
                "custrecord_hris_lveconfig_empjobstatus, " +
                "custrecord_hris_lveconfig_gender, " +
                "custrecord_hris_lveconfig_maritalstatus, " +
                "custrecord_hris_lveconfig_religion, " +
                "custrecord_hris_lveconfig_grade, " +
                "custrecord_hris_lveconf_wklyoffcriteria, " +
                "custrecord_hris_lvecfg_omaninonomani, " +
                "custrecord_hris_lvecfg_employee_catagory, " +
                "custrecord_hris_lveconfig_isairtckapble, " +
                "custrecord_hris_lveconfig_allowhalfday, " +
                "custrecord_hris_lvecfg_credit_on_joining " +
                "FROM customrecord_hris_leaveconfig WHERE isinactive ='F'";

            log.debug("leaveSql",leaveSql);

            var leaveResults = query.runSuiteQL({ query: leaveSql }).asMappedResults();

            var records = [];
            // Individual match flags
            var isSubsidiaryMatch = true;
            var isLocationMatch = true;
            var isJobStatusMatch = true;
            var isGenderMatch = true;
            var isMaritalMatch = true;
            var isReligionMatch = true;
            var isGradeMatch = true;
            var isCategoryMatch = true;
            var isweeklyoffcriteriamatch=true;
            var isstafftype=true;

            empResult.forEach(function (emp) {
                var empName = emp.custentity_hris_emplegalname || "";
                var matchedLeaveTypes = [];
              log.debug("matchedLeaveTypes",matchedLeaveTypes);

                leaveResults.forEach(function (cfg) {


                    // Subsidiary
                    if (emp.subsidiary != null && emp.subsidiary !== "") {
                        isSubsidiaryMatch = trueorfals([cfg.custrecord_hris_lveconfig_subsidiary], emp.subsidiary);
                    }

                    // Location
                    if (emp.custentity_hris_empdlocation_new != null && emp.custentity_hris_empdlocation_new !== "") {
                        isLocationMatch = trueorfals([cfg.custrecord_hris_lveconfig_location], emp.custentity_hris_empdlocation_new);
                    }

                    // Job Status
                    if (emp.custentity_emp_employee_job_status != null && emp.custentity_emp_employee_job_status !== "") {
                        isJobStatusMatch = trueorfals([cfg.custrecord_hris_lveconfig_empjobstatus], emp.custentity_emp_employee_job_status);
                    }

                    // Gender
                    if (emp.custentity_hris_empgender != null && emp.custentity_hris_empgender !== "") {
                        isGenderMatch = trueorfals([cfg.custrecord_hris_lveconfig_gender], emp.custentity_hris_empgender);
                    }

                    // Marital Status
                    if (emp.custentity_hris_empmaritalstatus != null && emp.custentity_hris_empmaritalstatus !== "") {
                        isMaritalMatch = trueorfals([cfg.custrecord_hris_lveconfig_maritalstatus], emp.custentity_hris_empmaritalstatus);
                    }

                    // Religion
                    if (emp.custentity_hris_empreligion != null && emp.custentity_hris_empreligion !== "") {
                        isReligionMatch = trueorfals([cfg.custrecord_hris_lveconfig_religion], emp.custentity_hris_empreligion);
                    }

                    // Grade
                    if (emp.custentity_emp_grade_ != null && emp.custentity_emp_grade_ !== "") {
                        isGradeMatch = trueorfals([cfg.custrecord_hris_lveconfig_grade], emp.custentity_emp_grade_);
                    }

                    // Employee Category
                    if (emp.custentity_hris_empcategory != null && emp.custentity_hris_empcategory !== "") {
                        isCategoryMatch = trueorfals([cfg.custrecord_hris_lvecfg_employee_catagory], emp.custentity_hris_empcategory);
                    }

                    // weekly off
                    if(emp.custentity_hris_empweeklyoffcriteria!= null && emp.custentity_hris_empweeklyoffcriteria !== ""){
                        isweeklyoffcriteriamatch = trueorfals([cfg.custrecord_hris_lveconf_wklyoffcriteria], emp.custentity_hris_empweeklyoffcriteria);
                    }
                    // // staff type
                    
                     if(emp.custentity_hris_empomani!= null && emp.custentity_hris_empomani !== ""){
                        isstafftype = trueorfals([cfg.custrecord_hris_lvecfg_omaninonomani], emp.custentity_hris_empomani);
                    }

                    // Final check
                    var isMatch =
                        isSubsidiaryMatch &&
                        isLocationMatch &&
                        isJobStatusMatch &&
                        isGenderMatch &&
                        isMaritalMatch &&
                        isReligionMatch &&
                        isGradeMatch &&
                        isCategoryMatch &&
                        isweeklyoffcriteriamatch&&
                        isstafftype;

                       log.debug("MATCH RESULT", {
    subsidiary: isSubsidiaryMatch,
    location: isLocationMatch,
    job: isJobStatusMatch,
    gender: isGenderMatch,
    final: isMatch
});
                    if (isMatch) {
                        matchedLeaveTypes.push({
                            leavetypeid: cfg.id,
                            leavetypename: cfg.name,
                            isAirTicketApplicable: cfg.custrecord_hris_lveconfig_isairtckapble === 'T',
                            allowhalfday: cfg.custrecord_hris_lveconfig_allowhalfday,
                            creditOnJoining: cfg.custrecord_hris_lvecfg_credit_on_joining || null,
                           accrualperdays: cfg.custrecord_hris_lvecfg_accuraldays || null,
                           accrualpermonth: cfg.custrecord_hris_lvecfg_accuraldays_month || null,
                       accrualcheck: cfg.custrecord_hris_lvecfg_accuralcheck || null
                        });
                    }
                });

                if (matchedLeaveTypes.length > 0) {
                    records.push({
                        empid: emp.id,
                        empname: empName.trim(),
                        leaveTypes: matchedLeaveTypes
                    });
                }
            });

            return JSON.stringify({
                Status: "Success",
                ResponseCode: "200",
                totalRecords: records.length,
                records: records
            });

        } catch (e) {
            log.error({
                title: 'RESTlet Error',
                details: e
            });
            return JSON.stringify({
                Status: "Error",
                ResponseCode: "500",
                Message: "Unexpected error: " + e.message
            });
        }
    }

    return {
        get: getMatchingLeaveConfigs
    };
});
