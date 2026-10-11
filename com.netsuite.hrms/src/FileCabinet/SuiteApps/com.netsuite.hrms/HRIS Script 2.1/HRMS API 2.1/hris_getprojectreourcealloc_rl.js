/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/query', 'N/log'], (query, log) => {

    const get = (requestParams) => {
        try {
            const empId = requestParams.empid;

            if (!empId) {
                return JSON.stringify({
                    success: false,
                    message: 'Missing required parameters: empid'
                });
            }

            log.debug('RESTlet GET', `empid = ${empId}`);

            // 1. Project / Resource Allocation query
            const projectSql = `
                SELECT 
                    r.id                         AS allocationid,
                    child.id                     AS child_id, 
                    child.title                  AS child_name, 
                    parent1.id                   AS parent_id, 
                    parent1.title                AS parent_name, 
                    parent2.id                   AS parent2_id, 
                    parent2.title                AS parent2_name, 
                    parent3.id                   AS parent3_id, 
                    parent3.title                AS parent3_name, 
                    j.id                         AS project_id, 
                    j.entitytitle                   AS project_name, 
                    j.cseg_njt_seg_proj          AS salesproject, 
                    BUILTIN.DF(j.cseg_njt_seg_proj) AS salesprojectname, 
                    child.status                 AS taskstatusid,
                    CASE child.status
        WHEN 'NOTSTART'  THEN 'Not Started'
        WHEN 'PROGRESS'  THEN 'In Progress'
        WHEN 'COMPLETE'  THEN 'Completed'
        WHEN 'CANCELLED' THEN 'Cancelled'
        ELSE child.status
    END                               AS taskstatus,
                    r.startdate, 
                    r.enddate, 
                    r.numberhours, 
                    r.percentoftime, 
                    BUILTIN.DF(r.allocationresource) AS allocation_resource
                FROM resourceallocation r
                JOIN projecttask child 
                    ON r.projecttask = child.id
                    AND child.isinactive = 'F'
                LEFT JOIN projecttask parent1 
                    ON child.parent = parent1.id
                    AND parent1.isinactive = 'F'
                LEFT JOIN projecttask parent2 
                    ON parent1.parent = parent2.id
                    AND parent2.isinactive = 'F'
                LEFT JOIN projecttask parent3 
                    ON parent2.parent = parent3.id
                    AND parent3.isinactive = 'F'
                JOIN job j 
                    ON child.project = j.id
                    AND j.isinactive = 'F'
                WHERE r.allocationresource = ?
                  AND child.status IN ('NOTSTART', 'PROGRESS')
                ORDER BY r.startdate DESC
            `;

            const projectResults = query.runSuiteQL({
                query: projectSql,
                params: [empId]
            }).asMappedResults();

            // 2. General (Custom Segment) query
            const generalSql = `
                SELECT 
                    id   AS salesproject,
                    name AS salesprojectname
                FROM customrecord_cseg_njt_seg_proj
                WHERE isinactive = 'F' and custrecord_njt_sales_project_general = 'T'
            `;

            const generalResults = query.runSuiteQL({
                query: generalSql
            }).asMappedResults();

            // Return with counts + structured arrays
            return JSON.stringify({
                success: true,
                count: projectResults.length + generalResults.length,
                projectCount: projectResults.length,
                generalCount: generalResults.length,
                Project: projectResults,
                General: generalResults
            });

        } catch (e) {
            log.error({
                title: 'RESTlet Error',
                details: e
            });

            return JSON.stringify({
                success: false,
                message: e.message || 'An unexpected error occurred',
                error: e.toString()
            });
        }
    };

    return { get };
});