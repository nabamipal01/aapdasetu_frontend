import { get } from "./api";

const normalizeEntry = (entry) => ({
  ...entry,
  history_id: entry.return_history_id ?? entry.history_id ?? entry.id,
  reference_no: entry.return_no ?? entry.reference_no,
  issue_no: entry.issue_no ?? entry.issue?.issue_no,
  district_user_name:
    entry.district_user?.name ?? entry.district_user_name,
  product_name: entry.product?.product_name ?? entry.product_name,
  brand_name: entry.product?.brand_name ?? entry.brand_name,
  quantity: entry.quantity?.after ?? entry.quantity_after ?? entry.quantity,
  quantity_before: entry.quantity?.before ?? entry.quantity_before,
  return_quantity:
    entry.quantity?.returned ??
    entry.return_quantity ??
    entry.returned_quantity,
  returned_by: entry.received_by?.id ?? entry.returned_by,
  returned_by_name:
    entry.received_by?.name ?? entry.returned_by_name,
});

export const listReturnHistory = async (params = {}) => {
  const response = await get(
    "/api/inventory/return_history/list.php",
    params
  );

  if (response?.success === false) {
    throw new Error(response.message || "Failed to load return history.");
  }

  const data = response?.data;
  const entries = Array.isArray(data)
    ? data
    : data?.history ?? data?.returns ?? data?.items ?? [];

  return Array.isArray(entries) ? entries.map(normalizeEntry) : [];
};