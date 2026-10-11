/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/log', 'N/search'], function (currentRecord, log, search) {

  function pageInit(scriptContext) {
    debugger;
    var rec = scriptContext.currentRecord;
    
  }

  function fieldChanged(scriptContext) {
    debugger;
    var rec = scriptContext.currentRecord;

    // When the user selects a file in the upload field
    if (scriptContext.fieldId === 'custrecord_hris_letter_upload') {
      var fileId = rec.getValue({
        fieldId: 'custrecord_hris_letter_upload'
      });

      if (fileId) {
        try {
          // Search the file record to check file type
          var fileSearch = search.create({
            type: 'file',
            filters: [['internalid', 'anyof', fileId]],
            columns: ['filetype', 'name']
          });

          var searchResult = fileSearch.run().getRange({ start: 0, end: 1 });

          if (searchResult && searchResult.length > 0) {
            var fileType = searchResult[0].getValue('filetype');
            var fileName = searchResult[0].getValue('name');

            log.debug('File Selected', fileName + ' (' + fileType + ')');

            // If file type is not PDF → show alert and clear the field
            if (fileType !== 'PDF') {
              alert('Only PDF files are allowed.');
              rec.setValue({
                fieldId: 'custrecord_hris_letter_upload',
                value: null
              });
            }
          }
        } catch (e) {
          log.error('Error checking file type', e.message);
        }
      }
    }
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged
  };
});
