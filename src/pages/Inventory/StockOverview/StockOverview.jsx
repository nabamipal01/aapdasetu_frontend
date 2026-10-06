import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getInventoryOverview,
  listInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
} from "../../../services";
import {
  Package,
  Layers,
  RefreshCw,
  Trash2,
  Pencil,
  X,
  Check,
  Search,
  ChevronRight,
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

// Colors for the category cards
const CARD_COLORS = [
  {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: "bg-blue-500",
    activeBg: "bg-blue-600",
    activeText: "text-white",
  },
  {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    icon: "bg-emerald-500",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    icon: "bg-violet-500",
    activeBg: "bg-violet-600",
    activeText: "text-white",
  },
  {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    icon: "bg-orange-500",
    activeBg: "bg-orange-600",
    activeText: "text-white",
  },
];

function StockOverview() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [equipTypes, setEquipTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_items: 0,
    total_pages: 1,
    has_next_page: false,
    has_previous_page: false,
  });

  // ============================================================
  // Fetch inventory
  // ============================================================
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [ovRes, itemRes] = await Promise.allSettled([
        getInventoryOverview(),
        listInventoryItems({
          page,
          limit: 10,
        }),
      ]);

      if (ovRes.status === "fulfilled") {
        setSummary(ovRes.value?.data?.summary ?? null);
        setEquipTypes(ovRes.value?.data?.equipment_wise ?? []);
      }

      if (itemRes.status === "fulfilled") {
        setItems(
          itemRes.value?.data?.items ??
          itemRes.value?.data ??
          []
        );

        setPagination(
          itemRes.value?.data?.pagination ?? {
            page: 1,
            limit: 10,
            total_items: 0,
            total_pages: 1,
            has_next_page: false,
            has_previous_page: false,
          }
        );
      }
    } catch (err) {
      setError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // ============================================================
  // Delete item
  // ============================================================
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from inventory?`)) {
      return;
    }

    try {
      await deleteInventoryItem(id);

      setItems((prev) =>
        prev.filter((i) => i.id !== id)
      );

      setSuccess(`"${name}" removed successfully.`);
    } catch (err) {
      setError(
        err.message || "Failed to delete item"
      );
    }
  };

  // ============================================================
  // Open edit modal
  // ============================================================
  const openEdit = (item) => {
    setEditingItem(item);

    setEditForm({
      equipment_id: item.equipment_id ?? "",
      product_name: item.product_name || "",
      brand_name: item.brand_name || "",
      oem: item.oem || "",
      location: item.location || "",
      quantity: item.quantity ?? "",
      purchase_date: item.purchase_date || "",
      expiry_date: item.expiry_date || "",
    });

    setError("");
    setSuccess("");
  };

  // ============================================================
  // Edit input change
  // ============================================================
  const handleEditChange = (e) => {
    setEditForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ============================================================
  // Update item
  // ============================================================
  const handleUpdate = async (e) => {
    e.preventDefault();

    if (
      !editForm.product_name.trim() ||
      !editForm.quantity
    ) {
      setError(
        "Product name and quantity are required."
      );
      return;
    }

    setEditSubmitting(true);
    setError("");

    try {
      const payload = {
        equipment_id: editForm.equipment_id
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
          editForm.purchase_date || null,

        expiry_date:
          editForm.expiry_date || null,
      };

      const res = await updateInventoryItem(
        editingItem.id,
        payload
      );

      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
              ...item,
              ...res.data,
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
        "Failed to update inventory item"
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  // ============================================================
  // Search
  // ============================================================
  const filteredItems = items.filter((item) => {
    const search = searchTerm
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
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto w-full max-w-[1400px]">

        {/* ======================================================
            Header
        ====================================================== */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Package
              className="text-emerald-600"
              size={28}
            />

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Stock Overview
              </h1>

              <p className="text-sm text-slate-500">
                Inventory summary and item list
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchAll}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <a
              href="/inventory/add"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              + Add Stock
            </a>
          </div>
        </div>

        {/* ======================================================
            Alerts
        ====================================================== */}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ======================================================
            Summary Cards
        ====================================================== */}
        {loading ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-slate-200"
              />
            ))}
          </div>
        ) : (
          summary && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Product Count",
                  value: summary.total_product,
                },
                {
                  label: "Product Quantity",
                  value: summary.total_quantity,
                },
                {
                  label: "Product Category",
                  value: summary.total_equipment_types,
                },
                // {
                //   label: "Expired Items",
                //   value: summary.expired_items,
                // },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {s.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {s.value ?? 0}
                  </p>
                </div>
              ))}
            </div>
          )
        )}

        {/* ======================================================
            Category Overview
            SAME PLACE AS ORIGINAL
            ONLY CARD SIZE IS CHANGED
        ====================================================== */}
        {!loading && equipTypes.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Layers
                size={15}
                className="text-indigo-500"
              />

              <h2 className="text-sm font-semibold text-slate-700">
                Category Overview
              </h2>

              <span className="text-xs text-slate-400">
                — click a card to view items &amp; history
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {equipTypes.map((e, idx) => {
                const c =
                  CARD_COLORS[
                  idx % CARD_COLORS.length
                  ];

                return (
                  <button
                    key={e.equipment_id}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/inventory/category/${e.equipment_id}`
                      )
                    }

                    /*
                     * ONLY SIZE CHANGED HERE
                     * Original:
                     * p-4
                     *
                     * Now:
                     * h-24 px-4 py-3
                     */
                    className={`group h-24 rounded-xl border px-4 py-3 text-left shadow-sm transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 ${c.bg} ${c.border}`}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`rounded-lg p-1.5 ${c.icon}`}
                      >
                        <Package
                          size={15}
                          className="text-white"
                        />
                      </div>

                      <ChevronRight
                        size={15}
                        className={`transition-transform group-hover:translate-x-1 ${c.text}`}
                      />
                    </div>

                    {/* Content */}
                    <div className="mt-1.5">
                      <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {e.equipment_type}
                      </p>

                      <div className="mt-0.5 flex items-baseline gap-2">
                        <p className="text-2xl font-bold leading-none text-slate-900">
                          {e.total_quantity ?? 0}
                        </p>

                        <p className="text-xs text-slate-400">
                          {e.product_count ?? 0} product
                          {e.product_count !== 1
                            ? "s"
                            : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================
            Full Item List
        ====================================================== */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Header + Search */}
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <h2 className="font-semibold text-slate-900">
                All Items{" "}

                {!loading && (
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    ({filteredItems.length}
                    {searchTerm &&
                      ` of ${items.length}`}
                    )
                  </span>
                )}
              </h2>

              <div className="relative w-full sm:w-80">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  placeholder="Search inventory..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchTerm("")
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">
              Loading inventory…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package
                size={40}
                className="mb-3 text-slate-300"
              />

              <p className="font-medium text-slate-700">
                No items in inventory
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Use{" "}
                <a
                  href="/inventory/add"
                  className="text-emerald-600 underline"
                >
                  Add Stock
                </a>{" "}
                to add the first item.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search
                size={36}
                className="mb-3 text-slate-300"
              />

              <p className="font-medium text-slate-700">
                No matching items
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Try a different search term.
              </p>

              <button
                type="button"
                onClick={() =>
                  setSearchTerm("")
                }
                className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-[1150px] w-full table-fixed text-left text-sm">

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
                      Location
                    </th>

                    <th className="w-[90px] px-5 py-3 text-right font-semibold">
                      Qty
                    </th>

                    <th className="w-[150px] px-5 py-3 font-semibold">
                      Purchase Date
                    </th>

                    <th className="sticky right-0 z-10 w-[110px] min-w-[110px] bg-slate-50 px-5 py-3 text-center font-semibold shadow-[-4px_0_8px_rgba(0,0,0,0.04)]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      {/* Product Name */}
                      <td className="px-5 py-3 font-medium text-slate-800">
                        <div
                          className="truncate"
                          title={item.product_name}
                        >
                          {item.product_name}
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="px-5 py-3 text-slate-600">
                        <div
                          className="truncate"
                          title={item.brand_name || ""}
                        >
                          {item.brand_name || "—"}
                        </div>
                      </td>

                      {/* Equipment Type */}
                      <td className="px-5 py-3 text-slate-600">
                        <div
                          className="truncate"
                          title={item.equipment_type || ""}
                        >
                          {item.equipment_type || "—"}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-3 text-slate-500">
                        <div
                          className="truncate"
                          title={item.location || ""}
                        >
                          {item.location || "—"}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">
                        {item.quantity}
                      </td>

                      {/* Purchase Date */}
                      <td className="px-5 py-3 text-slate-500">
                        {item.purchase_date || "—"}
                      </td>

                      {/* Action */}
                      <td className="sticky right-0 z-10 w-[110px] min-w-[110px] bg-white px-5 py-3 shadow-[-4px_0_8px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-center gap-1">

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(item)
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                item.id,
                                item.product_name
                              )
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Remove"
                          >
                            <Trash2 size={15} />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}
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
                    {(pagination.page - 1) *
                      pagination.limit +
                      1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-slate-700">
                    {Math.min(
                      pagination.page *
                      pagination.limit,
                      pagination.total_items
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-700">
                    {pagination.total_items}
                  </span>{" "}
                  items
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      !pagination.has_previous_page
                    }
                    onClick={() =>
                      setPage((prev) =>
                        Math.max(1, prev - 1)
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    Page {pagination.page} of{" "}
                    {pagination.total_pages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      !pagination.has_next_page
                    }
                    onClick={() =>
                      setPage((prev) =>
                        prev + 1
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* ========================================================
          Edit Modal
      ======================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Edit Stock Item
              </h2>

              <button
                type="button"
                onClick={() =>
                  setEditingItem(null)
                }
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleUpdate}
              className="mt-5 grid gap-4 sm:grid-cols-2"
            >
              {[
                ["product_name", "Product Name"],
                ["brand_name", "Brand Name"],
                ["oem", "OEM"],
                ["location", "Storage Location"],
                ["quantity", "Quantity"],
                ["purchase_date", "Purchase Date"],
              ].map(([name, label]) => (
                <div key={name}>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    {label}
                    {name === "product_name" ||
                      name === "quantity"
                      ? " *"
                      : ""}
                  </label>

                  <input
                    name={name}
                    type={
                      name.includes("date")
                        ? "date"
                        : name === "quantity"
                          ? "number"
                          : "text"
                    }
                    min={
                      name === "quantity"
                        ? "1"
                        : undefined
                    }
                    value={
                      editForm[name] ?? ""
                    }
                    onChange={
                      handleEditChange
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              ))}

              <div className="flex justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditingItem(null)
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Check size={15} />

                  {editSubmitting
                    ? "Updating…"
                    : "Update Item"}
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