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
            }
            catch (e) {
                console.log("error in lineinit : " + e);
            }

        }
        function fieldChanged(scriptContext) {
            try {
                debugger;
                var currentObjRecord = scriptContext.currentRecord;       

               if(scriptContext.fieldId =='custrecord_hris_vehi_section_type'){
                var SectionType = currentObjRecord.getValue("custrecord_hris_vehi_section_type");              
        
                if (SectionType == "1") {                   
                   currentObjRecord.setValue("customform", "639", true);
               }else if (SectionType == "2") {                  
                
                currentObjRecord.setValue("customform", "640", true);


           }

             
                
                   



                }
               

            


            }


            catch (e) {
                console.log("error in fieldchange : " + e);

            }



        }
       

        
       

        return {

            fieldChanged: fieldChanged,
           
            //  pageInit: pageInit,
           

        }
    });


