import { get, patch } from "./api";

const getResponseData = (response, fallbackMessage) => {
  if (response?.success === false) {
    throw new Error(response.message || fallbackMessage);
  }

  return response?.data;
};

// District dropdown
export const getDistricts = async () => {
  const response = await get("/api/districts/list.php");
  const data = getResponseData(response, "Failed to fetch districts.");

  return Array.isArray(data?.districts)
    ? data.districts
    : Array.isArray(data)
    ? data
    : [];
};

// District user dropdown
export const getDistrictUsers = async (districtId) => {
  const response = await get("/api/inventory/return/district_users.php", {
    district_id: districtId,
  });
  const data = getResponseData(response, "Failed to fetch district users.");

  return Array.isArray(data?.users) ? data.users : [];
};

// Stock dropdown
export const getAssignedItems = async (districtUserId) => {
  const response = await get("/api/inventory/return/items.php", {
    district_user_id: districtUserId,
  });
  const data = getResponseData(response, "Failed to fetch stock items.");

  return Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];
};

// Return stock
export const returnStock = async ({
  districtUserId,
  items,
}) => {
  const result = await patch("/api/inventory/return/update.php", {
    district_user_id: Number(districtUserId),
    items: items.map((item) => ({
      inventory_id: Number(item.inventory_id),
      issue_id: Number(item.issue_id),
      return_quantity: Number(item.return_quantity),
    })),
  });

  if (result?.success === false) {
    throw new Error(result.message || "Stock return failed.");
  }

  return result;
};