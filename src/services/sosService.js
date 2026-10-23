import { postFormData } from "./api";

 

/**

 * Send an emergency email with multiple recipients and attachments.

 *

 * @param {FormData} formData

 * @returns {Promise<any>}

 */

export const sendEmergencyEmail = (formData) => {

    return postFormData("/api/sos/send.php", formData);

};