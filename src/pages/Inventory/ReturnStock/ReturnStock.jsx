import { useEffect, useState } from "react";

import {
  getDistricts,
  getDistrictUsers,
  getAssignedItems,
  returnStock,
} from "../../../services/returnStockService";

function ReturnStock() {
  const [districts, setDistricts] = useState([]);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);

  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedItem, setSelectedItem] = useState("");

  const [returnQuantity, setReturnQuantity] = useState("");

  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * Load districts when page opens
   */
  useEffect(() => {
    let isActive = true;

    getDistricts()
      .then((data) => {
        if (isActive) setDistricts(data);
      })
      .catch((err) => {
        if (isActive) {
          setError(err.message || "Unable to load districts.");
        }
      })
      .finally(() => {
        if (isActive) setLoadingDistricts(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  /*
   * District changed
   */
  const handleDistrictChange = async (event) => {
    const districtId = event.target.value;

    setSelectedDistrict(districtId);

    // Reset everything below district
    setSelectedUser("");
    setSelectedItem("");
    setUsers([]);
    setItems([]);
    setReturnQuantity("");

    setError("");
    setSuccess("");

    if (!districtId) {
      return;
    }

    try {
      setLoadingUsers(true);

      const data = await getDistrictUsers(districtId);

      setUsers(data);
    } catch (err) {
      setError(
        err.message || "Unable to load district users."
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  /*
   * District user changed
   */
  const handleUserChange = async (event) => {
    const userId = event.target.value;

    setSelectedUser(userId);

    // Reset stock item
    setSelectedItem("");
    setItems([]);
    setReturnQuantity("");

    setError("");
    setSuccess("");

    if (!userId) {
      return;
    }

    try {
      setLoadingItems(true);

      const data = await getAssignedItems(userId);

      const formattedItems = data.map(
        (item) => ({
          ...item,
          return_quantity: 0,
        })
      );

      setItems(formattedItems);
    } catch (err) {
      setError(
        err.message || "Unable to load stock items."
      );
    } finally {
      setLoadingItems(false);
    }
  };

  /*
   * Stock item changed
   */
  const handleItemChange = (event) => {
    const inventoryId = event.target.value;

    setSelectedItem(inventoryId);
    setReturnQuantity("");
    setError("");
    setSuccess("");
  };

  /*
   * Currently selected item
   */
  const selectedItemData = items.find(
    (item) =>
      String(item.inventory_id) ===
      String(selectedItem)
  );

  /*
   * Quantity changed
   */
  const handleQuantityChange = (event) => {
    let quantity = Number(event.target.value);

    if (Number.isNaN(quantity)) {
      quantity = 0;
    }

    const maxQuantity = Number(
      selectedItemData?.remaining_quantity || 0
    );

    quantity = Math.max(0, quantity);
    quantity = Math.min(quantity, maxQuantity);

    setReturnQuantity(quantity);
  };

  /*
   * Return all remaining stock
   */
  const handleReturnAll = () => {
    if (!selectedItemData) {
      return;
    }

    setReturnQuantity(
      Number(selectedItemData.remaining_quantity || 0)
    );
  };

  /*
   * Submit return
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedDistrict) {
      setError("Please select a district.");
      return;
    }

    if (!selectedUser) {
      setError("Please select a district user.");
      return;
    }

    if (!selectedItem) {
      setError("Please select a stock item.");
      return;
    }

    if (
      !returnQuantity ||
      Number(returnQuantity) <= 0
    ) {
      setError("Please enter a valid return quantity.");
      return;
    }

    if (
      Number(returnQuantity) >
      Number(selectedItemData.remaining_quantity)
    ) {
      setError(
        `Return quantity cannot exceed ${selectedItemData.remaining_quantity}.`
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await returnStock({
        districtUserId: selectedUser,

        items: [
          {
            inventory_id:
              selectedItemData.inventory_id,

            issue_id:
              selectedItemData.issue_id,

            return_quantity:
              Number(returnQuantity),
          },
        ],
      });

      setSuccess(
        result.message ||
          "Stock returned successfully."
      );

      // Refresh stock
      const data = await getAssignedItems(
        selectedUser
      );

      setItems(
        data.map((item) => ({
          ...item,
          return_quantity: 0,
        }))
      );

      setSelectedItem("");
      setReturnQuantity("");
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while returning stock."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Return Stock
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Select district, district user and stock item
            to return inventory.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="mr-2 font-bold">!</span>
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span className="mr-2 font-bold">✓</span>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* Card Header */}
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                Stock Return Details
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Select the required information step by
                step.
              </p>
            </div>

            <div className="space-y-6 p-5 md:p-6">

              {/* STEP 1 - DISTRICT */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  District
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <select
                  value={selectedDistrict}
                  onChange={handleDistrictChange}
                  disabled={loadingDistricts}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {loadingDistricts
                      ? "Loading districts..."
                      : "Select district"}
                  </option>

                  {districts.map((district) => (
                    <option
                      key={district.id}
                      value={district.id}
                    >
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* STEP 2 - DISTRICT USER */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  District User
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <select
                  value={selectedUser}
                  onChange={handleUserChange}
                  disabled={
                    !selectedDistrict ||
                    loadingUsers
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {!selectedDistrict
                      ? "Select district first"
                      : loadingUsers
                      ? "Loading district users..."
                      : users.length === 0
                      ? "No district users found"
                      : "Select district user"}
                  </option>

                  {users.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.name} - {user.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* STEP 3 - STOCK ITEM */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Stock Item
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <select
                  value={selectedItem}
                  onChange={handleItemChange}
                  disabled={
                    !selectedUser ||
                    loadingItems
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {!selectedUser
                      ? "Select district user first"
                      : loadingItems
                      ? "Loading stock items..."
                      : items.length === 0
                      ? "No stock available"
                      : "Select stock item"}
                  </option>

                  {items.map((item) => (
                    <option
                      key={`${item.inventory_id}-${item.issue_id}`}
                      value={item.inventory_id}
                      disabled={
                        Number(
                          item.remaining_quantity
                        ) <= 0
                      }
                    >
                      {item.product_name} — Remaining:{" "}
                      {item.remaining_quantity} —{" "}
                      {item.issue_no}
                    </option>
                  ))}
                </select>
              </div>

              {/* SELECTED ITEM INFORMATION */}
              {selectedItemData && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                  <div className="mb-4">
                    <h3 className="font-semibold text-slate-800">
                      Selected Stock
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedItemData.product_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

                    <InfoBox
                      label="Equipment"
                      value={
                        selectedItemData.equipment_type
                      }
                    />

                    <InfoBox
                      label="Issue No."
                      value={
                        selectedItemData.issue_no
                      }
                    />

                    <InfoBox
                      label="Assigned"
                      value={
                        selectedItemData.assigned_quantity
                      }
                    />

                    <InfoBox
                      label="Remaining"
                      value={
                        selectedItemData.remaining_quantity
                      }
                      highlight
                    />

                  </div>

                  {/* RETURN QUANTITY */}
                  <div className="mt-5">

                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Return Quantity
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <div className="flex flex-col gap-2 sm:flex-row">

                      <input
                        type="number"
                        min="1"
                        max={
                          selectedItemData.remaining_quantity
                        }
                        value={returnQuantity}
                        onChange={handleQuantityChange}
                        placeholder="Enter quantity"
                        className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-40"
                      />

                      <button
                        type="button"
                        onClick={handleReturnAll}
                        className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Return All
                      </button>

                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Maximum return quantity:{" "}
                      <span className="font-semibold">
                        {
                          selectedItemData.remaining_quantity
                        }
                      </span>
                    </p>

                  </div>
                </div>
              )}

              {/* SUBMIT */}
              <div className="flex justify-end border-t border-slate-100 pt-5">

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedItem ||
                    !returnQuantity
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <span>↩</span>
                      Return Stock
                    </>
                  )}
                </button>

              </div>

            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
  highlight = false,
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-semibold ${
          highlight
            ? "text-amber-600"
            : "text-slate-700"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}

export default ReturnStock;