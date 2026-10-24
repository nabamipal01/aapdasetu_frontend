import { get, post, patch } from "./api";

 

const getResponseData = (response, fallbackMessage) => {

  if (response?.success === false) {

    throw new Error(response.message || fallbackMessage);

  }

 

  return response?.data;

};

 

// District user's assigned stock and return status.

// Omit status to retrieve all assigned items.

export const getAssignedItems = async (status = "") => {

  const params = status ? { status } : {};

 

  const response = await get(

    "/api/inventory/return/get_assigned_items.php",

    params

  );

 

  const data = getResponseData(

    response,

    "Failed to fetch assigned stock items."

  );

 

  return Array.isArray(data) ? data : [];

};

 

// Admin / Super Admin return-request queue.

// Supports status filtering and pagination.

export const getReturnRequests = async ({

  status = "pending",

  page = 1,

  limit = 100,

} = {}) => {

  const params = {

    page,

    limit,

    ...(status && status !== "all" ? { status } : {}),

  };

 

  const response = await get(

    "/api/inventory/return/list.php",

    params

  );

 

  const data = getResponseData(

    response,

    "Failed to fetch return requests."

  );

 

  return {

    items: Array.isArray(data) ? data : [],

    pagination: response?.pagination ?? null,

  };

};

 

// District user submits an individual return request.

export const returnStock = async ({

  inventory_id,

  issue_id,

  return_quantity,

}) => {

  const response = await post(

    "/api/inventory/return/request.php",

    {

      inventory_id: Number(inventory_id),

      issue_id: Number(issue_id),

      return_quantity: Number(return_quantity),

    }

  );

 

  getResponseData(response, "Stock return request failed.");

 

  return response;

};

 

// Admin / Super Admin approves a pending return request.

export const approveReturn = async (request) => {

  const response = await patch(

    `/api/inventory/return/approve.php?id=${Number(

      request.return_history_id

    )}`,

    {

      inventory_id: Number(request.inventory_id),

      issue_id: Number(request.issue_id),

      return_quantity: Number(request.return_quantity),

    }

  );

 

  getResponseData(response, "Failed to approve return request.");

 

  return response;

};

 

// Admin / Super Admin rejects a pending return request.

export const rejectReturn = async (

  returnHistoryId,

  rejectionNote

) => {

  const response = await patch(

    `/api/inventory/return/reject.php?id=${Number(

      returnHistoryId

    )}`,

    {

      rejection_note: rejectionNote.trim(),

    }

  );

 

  getResponseData(response, "Failed to reject return request.");

 

  return response;

};

 

// Retrieve the details of one return request when needed.

export const getReturnDetails = async (returnHistoryId) => {

  const response = await get(

    "/api/inventory/return/get.php",

    { id: Number(returnHistoryId) }

  );

 

  return getResponseData(

    response,

    "Failed to fetch return request details."

  );

};