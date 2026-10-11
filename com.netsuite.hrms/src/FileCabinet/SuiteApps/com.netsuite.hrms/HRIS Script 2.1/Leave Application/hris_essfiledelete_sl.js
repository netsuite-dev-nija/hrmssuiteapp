/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/file', 'N/log'],
    (file, log) => {

        const onRequest = (context) => {
            try {
                const request = context.request;
                const recId = request.parameters.entity;

                log.debug('deleteFile', 'File ID to delete --> ' + recId);

                if (recId) {
                    file.delete({
                        id: recId
                    });
                    log.debug('deleteFile', 'File deleted successfully: ' + recId);
                } else {
                    log.error('deleteFile', 'No file ID provided');
                }

            } catch (e) {
                log.error('deleteFile Error', e);
            }
        };

        return { onRequest };
    });