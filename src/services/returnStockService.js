const API_BASE = "http://localhost/AapdaSetu/backend/api";
// District dropdown
export const getDistricts = async () => {
  const response = await fetch(
    `${API_BASE}/districts/list.php`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch districts: ${response.status}`
    );
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to fetch districts.");
  }

  return result.data;
};

// District user dropdown
export const getDistrictUsers = async () => {
  const response = await fetch(
    `${API_BASE}/users/list.php?role=district`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch district users: ${response.status}`
    );
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to fetch district users."
    );
  }

  return result.data;
};

// Stock dropdown
export const getAssignedItems = async (districtUserId) => {
  const response = await fetch(
    `${API_BASE}/inventory/return/items.php?district_user_id=${districtUserId}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch stock items: ${response.status}`
    );
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to fetch stock items."
    );
  }

  return result.data;
};

// Return stock
export const returnStock = async ({
  districtUserId,
  items,
}) => {
  const response = await fetch(
    `${API_BASE}/inventory/return/update.php`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        district_user_id: Number(districtUserId),
        items: items.map((item) => ({
          inventory_id: Number(item.inventory_id),
          issue_id: Number(item.issue_id),
          return_quantity: Number(item.return_quantity),
        })),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to return stock: ${response.status}`
    );
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Stock return failed."
    );
  }

  return result;
};