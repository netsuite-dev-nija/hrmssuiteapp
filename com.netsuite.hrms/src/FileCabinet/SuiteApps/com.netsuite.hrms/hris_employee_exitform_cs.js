/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *@NModuleScope Public
 */
var MOMENT;
define(['N/search', 'N/query', 'N/format', 'N/record', './moment.js'],
    function (search, query, format, record, moment) {
        MOMENT = moment;   
        function pageInit(scriptContext) {
            try {
                debugger;
                var currentObjRecord = scriptContext.currentRecord;        

               
                var reqform = currentObjRecord.getValue("customform");
                log.debug(reqform);
            
                if (reqform == "489") {
                    currentObjRecord.setValue("custrecord_hris_employee_exit_section", 1, false);
                    currentObjRecord.getField("custrecord_hris_employee_exit_section").isDisabled = true;
                    log.debug("comign in reqform" + currentObjRecord.setValue("custrecord_hris_employee_exit_section", 1, false));
                }
            
                if (reqform == "644") {
                    currentObjRecord.setValue("custrecord_hris_employee_exit_section", 2,false);
                    currentObjRecord.getField("custrecord_hris_employee_exit_section").isDisabled = true;
                  
                    log.debug("comign in reqform" + currentObjRecord.setValue("custrecord_hris_employee_exit_section", 2, false));
                }
            
                
            }
            catch (e) {
                log.debug("error in lineinit : " + e);
            }

        }
        function fieldChanged(scriptContext) {
            try {
                debugger;
                var currentObjRecord = scriptContext.currentRecord;        

               if(scriptContext.fieldId =='custrecord_hris_employee_exit_section'){
                var SectionType = currentObjRecord.getValue("custrecord_hris_employee_exit_section");               
        
                if (SectionType == "1") {
                    
                  
                    currentObjRecord.setValue("customform", "489", true);


               }else if (SectionType == "2") {                   
                
                currentObjRecord.setValue("customform", "644", true);
           }         
          



                }
               

            


            }


            catch (e) {
                log.debug("error in fieldchange : " + e);

            }



        }
       

        
       

        return {

            fieldChanged: fieldChanged,
           
            pageInit: pageInit,
           

        }
    });


