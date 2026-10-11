/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/record', 'N/log', 'N/redirect', 'N/runtime'],
    (serverWidget, record, log, redirect, runtime) => {

        const onRequest = (context) => {
            const request = context.request;
            const response = context.response;

            if (request.method === 'GET') {
                try {
                    log.debug('GET Method', '*** Into Get Method ***');

                    const PullbackForm = serverWidget.createForm({
                        title: 'Do you want to Pullback Request?'
                    });

                    // Attach Client Script
                    PullbackForm.clientScriptModulePath = './hris_pullbackcall_cs.js'; 
                    // Or use Script ID if preferred:
                    // PullbackForm.clientScriptFileId = 12345; // replace with actual file ID

                    // Remark field (mandatory)
                    const remarkField = PullbackForm.addField({
                        id: 'custpage_remark',
                        type: serverWidget.FieldType.LONGTEXT,
                        label: 'PullBack Reason'
                    });
                    remarkField.isMandatory = true;

                    // Hidden Trigger field
                    const redirectTrigger = request.parameters.custscript_trigger_open || '';
                    log.debug('redirectTrigger', redirectTrigger);

                    const triggerField = PullbackForm.addField({
                        id: 'custpage_triggerredirect',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Redirect Trigger'
                    });
                    triggerField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    triggerField.defaultValue = redirectTrigger;

                    // Hidden Leave ID parameter
                    const leaveId = request.parameters.leavid || '';
                    log.debug('Leave ID Parameter', leaveId);

                    const paramField = PullbackForm.addField({
                        id: 'custpage_parameter',
                        type: serverWidget.FieldType.LONGTEXT,
                        label: 'Remarks'
                    });
                    paramField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    paramField.defaultValue = leaveId;

                    // Buttons
                    PullbackForm.addSubmitButton({
                        label: 'Submit'
                    });

                    PullbackForm.addButton({
                        id: 'custombutton_back',
                        label: 'Back',
                        functionName: 'window.history.back()'
                    });

                    log.debug('GET Method', '*** Out of Get Method ***');
                    response.writePage(PullbackForm);

                } catch (ex) {
                    log.error('GET Error', ex);
                }
            }

            // =====================================================
            // POST Method
            // =====================================================
            if (request.method === 'POST') {
                try {
                    log.debug('POST Method', '*** Into Post Method ***');

                    const s_Remark = request.parameters.custpage_remark;
                    log.debug('s_Remark', s_Remark);

                    const s_Parameters = request.parameters.custpage_parameter;
                    log.debug('s_Parameters', s_Parameters);

                    if (!s_Parameters) {
                        throw new Error('Leave Application ID is missing');
                    }

                    // Load original Leave Application
                    const LeaveRecord = record.load({
                        type: 'customrecord_hris_leaveapplication',
                        id: s_Parameters,
                        isDynamic: false
                    });

                    // Get all required values
                    const EmployeeNAME          = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_employeename' });
                    const EmployeeCODE          = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_empcode' });
                    const Manager               = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_supervisor' });
                    const ProjectSupervisor     = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_project_supervisor' });
                    const LeaveType             = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_leavetype' });
                    const LeaveBalance          = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_leavebalance' });
                    const FromDate              = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_fromdate' });
                    const FromHalfDay           = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_fromhalfday' });
                    const ToDate                = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_todate' });
                    const ToHalfDay             = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_tohalfday' });
                    const TotalNoDays           = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_totalnodays' });
                    const ValidTillDate         = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_validtilldate' });
                    const LeaveReason           = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_leavereason' });
                    const SupportDoc            = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_supportdocument' });
                    const LeaveAppStatus        = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_staus' });
                    const LeaveName             = LeaveRecord.getValue({ fieldId: 'name' });

                    const s_lms_approver0             = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_approver0' });
                    const s_lms_approver1             = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_approver1' });
                    const s_lms_approver2             = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_approver2' });
                    const s_lms_approver3             = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_approver3' });
                    const s_lms_approver4             = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_approver4' });
                    const s_lms_currentapproverlevel  = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve__current_wflevel_no' });
                    const s_lms_currentapprover       = LeaveRecord.getValue({ fieldId: 'custrecord_hris_lve_current_approver' });

                    log.debug('Data Loaded', 'Employee: ' + EmployeeNAME + ' | Leave: ' + LeaveName);

                    // Create Pullback Record
                    const PullBackRecord = record.create({
                        type: 'customrecord_hris_pullback_lveapplicatio',
                        isDynamic: true
                    });

                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_employee_name', value: EmployeeNAME });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_employee_code', value: EmployeeCODE });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_supervisor', value: Manager });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_hod', value: ProjectSupervisor });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_leave_type', value: LeaveType });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_leave_balance', value: LeaveBalance });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_from_date', value: FromDate });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_from_halfday', value: FromHalfDay });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_todate', value: ToDate });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_to_halfday', value: ToHalfDay });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_total_days', value: TotalNoDays });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_vaid_tilldate', value: ValidTillDate });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_leave_reason', value: LeaveReason });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_support_document', value: SupportDoc });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_leave_applica_status', value: LeaveAppStatus });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_lve_pullback_reason', value: s_Remark });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_leave_ref_no', value: LeaveName });

                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_approver0', value: s_lms_approver0 });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_approver1', value: s_lms_approver1 });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_approver2', value: s_lms_approver2 });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_approver3', value: s_lms_approver3 });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_approver4', value: s_lms_approver4 });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_currentapprolevel', value: s_lms_currentapproverlevel });
                    PullBackRecord.setValue({ fieldId: 'custrecord_hris_plb_currentapprover', value: s_lms_currentapprover });

                    const PullBackRecord_ID = PullBackRecord.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });

                    log.debug('Pullback Record Created', 'ID: ' + PullBackRecord_ID);

                    // Delete original Leave Application
                    /* record.delete({
                        type: 'customrecord_hris_leaveapplication',
                        id: s_Parameters
                    });

                    log.debug('Leave Application Deleted', 'ID: ' + s_Parameters); */

                      var LeaveRec = record.load({
            type: 'customrecord_hris_leaveapplication',
            id: s_Parameters
        });

        LeaveRec.setValue({
            fieldId: 'isinactive',
            value: true
        });

        var Leaveid = LeaveRec.save({
    enableSourcing: true,
    ignoreMandatoryFields: true
});
        log.debug({
            title: 'check 1',
            details: 'Leave Record ID: ' + Leaveid
        });

                    // Redirect back to the same Suitelet with trigger
                    redirect.toSuitelet({
                        scriptId: 'customscript_hris_mod_pullback_sl',
                        deploymentId: 'customdeploy_hris_mod_pullback_sl',
                        parameters: {
                            custscript_trigger_open: 'open'
                        }
                    });

                } catch (ex) {
                    log.error('POST Error', ex);
                    throw ex; // or show a user-friendly message
                }
            }
        };

        return {
            onRequest
        };
    });