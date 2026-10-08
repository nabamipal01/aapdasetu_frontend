import React, { useState, useEffect, useCallback } from "react";
import {
  listInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
} from "../../../services";
import { useNavigate } from "react-router";
import {
  Package,
  RefreshCw,
  Trash2,
  Pencil,
  X,
  Check,
  Search,
} from "lucide-react";

const EMPTY_EDIT_FORM = {
  equipment_id: "",
  product_name: "",
  brand_name: "",
  oem: "",
  location: "",
  quantity: "",
  purchase_date: "",
};

const EMPTY_PAGINATION = {
  page: 1,
  limit: 10,
  total_items: 0,
  total_pages: 1,
  has_next_page: false,
  has_previous_page: false,
};

function StockOverview() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] =
    useState(EMPTY_PAGINATION);

  // ============================================================
  // Fetch inventory
  // ============================================================
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await listInventoryItems({
        page,
        limit: 10,
      });

      const data = response?.data;

      setItems(
        data?.items ??
          data ??
          []
      );

      setPagination(
        data?.pagination ??
          {
            ...EMPTY_PAGINATION,
            page,
          }
      );
    } catch (err) {
      setError(
        err.message ||
          "Failed to load equipment inventory."
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ============================================================
  // Clear messages automatically
  // ============================================================
  useEffect(() => {
    if (!success && !error) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccess("");
      setError("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [success, error]);

  // ============================================================
  // Reset page when searching
  // ============================================================
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // ============================================================
  // Delete inventory item
  // ============================================================
  const handleDelete = async (id, name) => {
    const confirmed = window.confirm(
      `Remove "${name}" from equipment inventory?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteInventoryItem(id);

      setItems((prev) =>
        prev.filter(
          (item) => item.id !== id
        )
      );

      setSuccess(
        `"${name}" removed successfully.`
      );

      // If deleting the last item on the current page,
      // go back one page when possible.
      if (
        items.length === 1 &&
        page > 1
      ) {
        setPage((prev) =>
          Math.max(1, prev - 1)
        );
      } else {
        fetchInventory();
      }
    } catch (err) {
      setError(
        err.message ||
          "Failed to delete inventory item."
      );
    }
  };

  // ============================================================
  // Open edit modal
  // ============================================================
  const openEdit = (item) => {
    setEditingItem(item);

    setEditForm({
      equipment_id:
        item.equipment_id ?? "",

      product_name:
        item.product_name ?? "",

      brand_name:
        item.brand_name ?? "",

      oem:
        item.oem ?? "",

      location:
        item.location ?? "",

      quantity:
        item.quantity ?? "",

      purchase_date:
        item.purchase_date ?? "",
    });

    setError("");
    setSuccess("");
  };

  // ============================================================
  // Edit input change
  // ============================================================
  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ============================================================
  // Update inventory item
  // ============================================================
  const handleUpdate = async (e) => {
    e.preventDefault();

    if (
      !editForm.product_name.trim() ||
      editForm.quantity === ""
    ) {
      setError(
        "Product name and quantity are required."
      );

      return;
    }

    if (
      Number(editForm.quantity) < 0
    ) {
      setError(
        "Quantity cannot be negative."
      );

      return;
    }

    setEditSubmitting(true);
    setError("");

    try {
      const payload = {
        equipment_id:
          editForm.equipment_id
            ? Number(editForm.equipment_id)
            : undefined,

        product_name:
          editForm.product_name.trim(),

        brand_name:
          editForm.brand_name.trim(),

        oem:
          editForm.oem.trim(),

        location:
          editForm.location.trim(),

        quantity:
          Number(editForm.quantity),

        purchase_date:
          editForm.purchase_date ||
          null,
      };

      const response =
        await updateInventoryItem(
          editingItem.id,
          payload
        );

      const updatedItem =
        response?.data ?? payload;

      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                ...updatedItem,
              }
            : item
        )
      );

      setEditingItem(null);

      setSuccess(
        `"${payload.product_name}" updated successfully.`
      );
    } catch (err) {
      setError(
        err.message ||
          "Failed to update inventory item."
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  // ============================================================
  // Search
  // ============================================================
  const filteredItems = items.filter(
    (item) => {
      const search =
        searchTerm
          .toLowerCase()
          .trim();

      if (!search) {
        return true;
      }

      return (
        item.product_name
          ?.toLowerCase()
          .includes(search) ||

        item.brand_name
          ?.toLowerCase()
          .includes(search) ||

        item.equipment_type
          ?.toLowerCase()
          .includes(search) ||

        item.location
          ?.toLowerCase()
          .includes(search) ||

        item.oem
          ?.toLowerCase()
          .includes(search)
      );
    }
  );

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1400px]">

        {/* ======================================================
            Header
        ====================================================== */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
              <Package
                size={23}
                className="text-emerald-600"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Equipment Inventory
              </h1>

              <p className="mt-0.5 text-sm text-slate-500">
                Manage and monitor available equipment and inventory items
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={fetchInventory}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
  type="button"
  onClick={() => navigate("/inventory/add")}
  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
>
  <Package size={15} />
  Add Equipment
</button>
          </div>
        </div>

        {/* ======================================================
            Alerts
        ====================================================== */}
        {success && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span>{success}</span>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
              className="rounded p-0.5 text-green-600 hover:bg-green-100"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="rounded p-0.5 text-red-600 hover:bg-red-100"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ======================================================
            Inventory Table Card
        ====================================================== */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* ----------------------------------------------------
              Table Header / Search
          ---------------------------------------------------- */}
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <h2 className="font-semibold text-slate-900">
                  Equipment List

                  {!loading && (
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({pagination.total_items ?? filteredItems.length})
                    </span>
                  )}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  View, update, or remove equipment inventory records.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full lg:w-96">

                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  placeholder="Search equipment..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchTerm("")
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------
              Loading
          ---------------------------------------------------- */}
          {loading ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center">

              <RefreshCw
                size={26}
                className="animate-spin text-emerald-500"
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading equipment inventory...
              </p>
            </div>
          ) : items.length === 0 ? (

            /* --------------------------------------------------
               No Inventory
            -------------------------------------------------- */
            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">

              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Package
                  size={30}
                  className="text-slate-300"
                />
              </div>

              <p className="mt-4 font-medium text-slate-700">
                No equipment in inventory
              </p>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                No equipment records are currently available.
                Add equipment to start managing your inventory.
              </p>

              <button
  type="button"
  onClick={() => navigate("/inventory/add")}
  className="mt-5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
>
  Add Equipment
</button>
            </div>
          ) : filteredItems.length === 0 ? (

            /* --------------------------------------------------
               No Search Results
            -------------------------------------------------- */
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Search
                  size={25}
                  className="text-slate-300"
                />
              </div>

              <p className="mt-4 font-medium text-slate-700">
                No matching equipment
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Try searching with a different product,
                brand, equipment type, or location.
              </p>

              <button
                type="button"
                onClick={() =>
                  setSearchTerm("")
                }
                className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear Search
              </button>
            </div>
          ) : (

            /* --------------------------------------------------
               Equipment Table
            -------------------------------------------------- */
            <div className="w-full overflow-x-auto">

              <table className="min-w-[1200px] w-full table-fixed text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">

                  <tr>

                    <th className="w-[220px] px-5 py-3 font-semibold">
                      Product Name
                    </th>

                    <th className="w-[150px] px-5 py-3 font-semibold">
                      Brand
                    </th>

                    <th className="w-[180px] px-5 py-3 font-semibold">
                      Equipment Type
                    </th>

                    <th className="w-[220px] px-5 py-3 font-semibold">
                      Storage Location
                    </th>

                    <th className="w-[90px] px-5 py-3 text-right font-semibold">
                      Quantity
                    </th>

                    <th className="w-[150px] px-5 py-3 font-semibold">
                      Purchase Date
                    </th>

                    <th className="sticky right-0 z-10 w-[110px] min-w-[110px] bg-slate-50 px-5 py-3 text-center font-semibold shadow-[-4px_0_8px_rgba(0,0,0,0.04)]">
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filteredItems.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-slate-50"
                      >

                        {/* Product */}
                        <td className="px-5 py-3 font-medium text-slate-800">
                          <div
                            className="truncate"
                            title={
                              item.product_name
                            }
                          >
                            {item.product_name ||
                              "—"}
                          </div>
                        </td>

                        {/* Brand */}
                        <td className="px-5 py-3 text-slate-600">
                          <div
                            className="truncate"
                            title={
                              item.brand_name ||
                              ""
                            }
                          >
                            {item.brand_name ||
                              "—"}
                          </div>
                        </td>

                        {/* Equipment Type */}
                        <td className="px-5 py-3 text-slate-600">
                          <div
                            className="truncate"
                            title={
                              item.equipment_type ||
                              ""
                            }
                          >
                            {item.equipment_type ||
                              "—"}
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-5 py-3 text-slate-500">
                          <div
                            className="truncate"
                            title={
                              item.location ||
                              ""
                            }
                          >
                            {item.location ||
                              "—"}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">
                          {item.quantity ??
                            0}
                        </td>

                        {/* Purchase Date */}
                        <td className="px-5 py-3 text-slate-500">
                          {item.purchase_date ||
                            "—"}
                        </td>

                        {/* Actions */}
                        <td className="sticky right-0 z-10 w-[110px] min-w-[110px] bg-white px-5 py-3 shadow-[-4px_0_8px_rgba(0,0,0,0.04)]">

                          <div className="flex items-center justify-center gap-1">

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  item
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                              title="Edit equipment"
                            >
                              <Pencil
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  item.id,
                                  item.product_name
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Remove equipment"
                            >
                              <Trash2
                                size={15}
                              />
                            </button>

                          </div>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>
              </table>
            </div>
          )}

          {/* ====================================================
              Pagination
          ==================================================== */}
          {!loading &&
            pagination.total_pages > 1 && (

              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-sm text-slate-500">

                  Showing{" "}

                  <span className="font-medium text-slate-700">
                    {pagination.total_items === 0
                      ? 0
                      : (pagination.page - 1) *
                          pagination.limit +
                        1}
                  </span>

                  {" "}to{" "}

                  <span className="font-medium text-slate-700">
                    {Math.min(
                      pagination.page *
                        pagination.limit,
                      pagination.total_items
                    )}
                  </span>

                  {" "}of{" "}

                  <span className="font-medium text-slate-700">
                    {pagination.total_items}
                  </span>

                  {" "}items
                </p>

                <div className="flex items-center gap-2">

                  <button
                    type="button"
                    disabled={
                      !pagination.has_previous_page
                    }
                    onClick={() =>
                      setPage((prev) =>
                        Math.max(
                          1,
                          prev - 1
                        )
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    Page{" "}
                    {pagination.page}{" "}
                    of{" "}
                    {pagination.total_pages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      !pagination.has_next_page
                    }
                    onClick={() =>
                      setPage(
                        (prev) =>
                          prev + 1
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>

                </div>
              </div>
            )}
        </div>
      </div>

      {/* ========================================================
          Edit Equipment Modal
      ======================================================== */}
      {editingItem && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Edit Equipment
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Update equipment inventory details.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingItem(null)
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                title="Close"
              >
                <X size={18} />
              </button>

            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleUpdate}
              className="grid gap-5 p-6 sm:grid-cols-2"
            >

              {/* Product Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Product Name *
                </label>

                <input
                  name="product_name"
                  type="text"
                  value={
                    editForm.product_name
                  }
                  onChange={
                    handleEditChange
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />
              </div>

              {/* Brand */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Brand Name
                </label>

                <input
                  name="brand_name"
                  type="text"
                  value={
                    editForm.brand_name
                  }
                  onChange={
                    handleEditChange
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* OEM */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  OEM
                </label>

                <input
                  name="oem"
                  type="text"
                  value={editForm.oem}
                  onChange={
                    handleEditChange
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Storage Location */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Storage Location
                </label>

                <input
                  name="location"
                  type="text"
                  value={
                    editForm.location
                  }
                  onChange={
                    handleEditChange
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Quantity *
                </label>

                <input
                  name="quantity"
                  type="number"
                  min="0"
                  value={
                    editForm.quantity
                  }
                  onChange={
                    handleEditChange
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />
              </div>

              {/* Purchase Date */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Purchase Date
                </label>

                <input
                  name="purchase_date"
                  type="date"
                  value={
                    editForm.purchase_date
                  }
                  onChange={
                    handleEditChange
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 sm:col-span-2">

                <button
                  type="button"
                  onClick={() =>
                    setEditingItem(null)
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    editSubmitting
                  }
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check size={15} />

                  {editSubmitting
                    ? "Updating..."
                    : "Update Equipment"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOverview;