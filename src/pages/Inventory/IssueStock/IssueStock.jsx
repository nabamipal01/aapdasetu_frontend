import React, { useState, useEffect, useCallback } from "react";
import {
  listInventoryItems,
  createStockIssue,
  listStockIssues,
  deleteStockIssue,
  listUsers,
  listDistricts,
} from "../../../services";

import {
  ArrowDownCircle,
  Plus,
  X,
  RefreshCw,
  Trash2,
  Search,
  Eye,
} from "lucide-react";

const EMPTY_FORM = {
  district_id: "",
  district_user_id: "",
  storage_location: "",
  remarks: "",
};

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  total_items: 0,
  total_pages: 1,
  has_next_page: false,
  has_previous_page: false,
};

function IssueStock() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [issues, setIssues] = useState([]);
  const [districtUsers, setDistrictUsers] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedItems, setSelectedItems] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  // Preview selected issue
  const [previewIssue, setPreviewIssue] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

  const LIMIT = 10;

  // =========================================================
  // FETCH DATA
  // =========================================================
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [invRes, issueRes, userRes] =
        await Promise.allSettled([
          listInventoryItems({
            page: 1,
            limit: 200,
          }),

          listStockIssues({
            page,
            limit: LIMIT,
            search: searchTerm,
          }),

          listUsers({
            role: "district",
            page: 1,
            per_page: 100,
          }),
        ]);

      // Inventory
      setInventoryItems(
        invRes.status === "fulfilled"
          ? invRes.value?.data?.items ?? []
          : []
      );

      // Issues
      if (issueRes.status === "fulfilled") {
        const data = issueRes.value?.data;

        setIssues(
          data?.issues ??
            data?.items ??
            (Array.isArray(data) ? data : [])
        );

        setPagination(
          data?.pagination ?? DEFAULT_PAGINATION
        );
      } else {
        setIssues([]);
        setPagination(DEFAULT_PAGINATION);
      }

      // District users
      setDistrictUsers(
        userRes.status === "fulfilled"
          ? userRes.value?.data?.users ?? []
          : []
      );
    } catch (err) {
      setError(
        err.message || "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fetchDistricts = useCallback(async () => {
    setDistrictsLoading(true);

    try {
      const response = await listDistricts();
      const districtList = Array.isArray(response?.data?.districts)
        ? response.data.districts
        : Array.isArray(response?.data)
        ? response.data
        : [];

      setDistricts(districtList);
    } catch (err) {
      setDistricts([]);
      setError(err.message || "Failed to load districts.");
    } finally {
      setDistrictsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDistricts();
  }, [fetchDistricts]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // =========================================================
  // FORM HANDLERS
  // =========================================================
  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleDistrictChange = (e) => {
    const districtId = e.target.value;
    const selectedDistrict = districts.find(
      (district) => String(district.id) === districtId
    );

    setForm((prev) => ({
      ...prev,
      district_id: districtId,
      district_user_id: "",
      storage_location: selectedDistrict?.storage_location || "",
    }));
    setError("");
  };

  const selectedDistrict = districts.find(
    (district) => String(district.id) === String(form.district_id)
  );

  const filteredDistrictUsers = districtUsers.filter((user) => {
    const userDistrictId =
      user.district_id ??
      user.districtId ??
      user.linked_id ??
      user.district?.id;

    if (userDistrictId != null) {
      return String(userDistrictId) === String(form.district_id);
    }

    const userDistrictName =
      user.district_name ??
      user.districtName ??
      user.district?.name;

    return Boolean(
      selectedDistrict?.name &&
      userDistrictName &&
      String(userDistrictName).trim().toLowerCase() ===
        String(selectedDistrict.name).trim().toLowerCase()
    );
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedItems([]);
    setShowForm(false);
  };

  // =========================================================
  // ITEM HANDLERS
  // =========================================================
  const addItemRow = () => {
    setSelectedItems((prev) => [
      ...prev,
      {
        inventory_id: "",
        quantity: "",
      },
    ]);
  };

  const removeItemRow = (idx) => {
    setSelectedItems((prev) =>
      prev.filter((_, i) => i !== idx)
    );
  };

  const updateItemRow = (
    idx,
    field,
    value
  ) => {
    setSelectedItems((prev) =>
      prev.map((row, i) =>
        i === idx
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  // =========================================================
  // SUBMIT STOCK ISSUE
  // =========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.district_id) {
      setError("Select a district.");
      return;
    }

    if (!form.district_user_id) {
      setError("Select a district user.");
      return;
    }

    if (!form.storage_location.trim()) {
      setError("Storage location is required.");
      return;
    }

    if (selectedItems.length === 0) {
      setError("Add at least one item to issue.");
      return;
    }

    const itemsPayload = selectedItems
      .filter(
        (r) =>
          r.inventory_id &&
          Number(r.quantity) > 0
      )
      .map((r) => ({
        inventory_id: Number(
          r.inventory_id
        ),
        quantity: Number(r.quantity),
      }));

    if (itemsPayload.length === 0) {
      setError(
        "Each item needs a valid inventory ID and quantity."
      );
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        district_user_id: Number(
          form.district_user_id
        ),

        storage_location:
          form.storage_location.trim(),

        items: itemsPayload,

        ...(form.remarks.trim() && {
          remarks: form.remarks.trim(),
        }),
      };

      await createStockIssue(payload);

      setSuccess(
        "Stock issued successfully."
      );

      resetForm();

      fetchAll();
    } catch (err) {
      setError(
        err.message ||
          "Failed to issue stock"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================
  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this stock issue record?"
      )
    ) {
      return;
    }

    try {
      await deleteStockIssue(id);

      setIssues((prev) =>
        prev.filter(
          (issue) =>
            (issue.id ?? issue.issue_id) !== id
        )
      );

      setSuccess(
        "Stock issue deleted successfully."
      );

      fetchAll();
    } catch (err) {
      setError(
        err.message ||
          "Failed to delete stock issue"
      );
    }
  };

  // =========================================================
  // SEARCH
  // =========================================================
  const filteredIssues = issues.filter(
    (issue) => {
      const search = searchTerm
        .toLowerCase()
        .trim();

      if (!search) return true;

      return (
        String(
          issue.id ??
            issue.issue_id ??
            ""
        )
          .toLowerCase()
          .includes(search) ||

        String(
          issue.district_user_name ?? ""
        )
          .toLowerCase()
          .includes(search) ||

        String(
          issue.district_user_id ?? ""
        )
          .toLowerCase()
          .includes(search) ||

        String(
          issue.storage_location ?? ""
        )
          .toLowerCase()
          .includes(search) ||

        String(
          issue.remarks ?? ""
        )
          .toLowerCase()
          .includes(search)
      );
    }
  );

  const inventoryItemsByCategory = inventoryItems.reduce(
    (groups, item) => {
      const category =
        item.equipment_type ??
        item.equipment?.equipment_type ??
        item.category_name ??
        "Uncategorized";

      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
      return groups;
    },
    {}
  );

  // =========================================================
  // JSX
  // =========================================================
  return (
    <>
      {/* =====================================================
          MAIN PAGE
      ====================================================== */}
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl">

          {/* =================================================
              HEADER
          ================================================== */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">

              <ArrowDownCircle
                className="text-orange-500"
                size={28}
              />

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Issue Stock
                </h1>

                <p className="text-sm text-slate-500">
                  Assign inventory items to district
                  users for field deployment
                </p>
              </div>
            </div>

            <div className="flex gap-2">

              {/* Refresh */}
              <button
                type="button"
                onClick={fetchAll}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={15} />
                Refresh
              </button>

              {/* Issue Stock */}
              <button
                type="button"
                onClick={() => {
                  setShowForm(!showForm);
                  setError("");
                  setSuccess("");
                }}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                {showForm ? (
                  <>
                    <X size={15} />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Issue Stock
                  </>
                )}
              </button>

            </div>
          </div>

          {/* =================================================
              ALERTS
          ================================================== */}
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

          {/* =================================================
              ISSUE FORM
          ================================================== */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              showForm
                ? "mb-6 grid-rows-[1fr] opacity-100"
                : "pointer-events-none grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

                <h2 className="mb-5 text-lg font-semibold text-slate-900">
                  New Stock Issue
                </h2>

                <form onSubmit={handleSubmit}>

                  <div className="grid gap-4 sm:grid-cols-2">

                    {/* District */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        District *
                      </label>

                      <select
                        name="district_id"
                        value={form.district_id}
                        onChange={handleDistrictChange}
                        disabled={districtsLoading}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        <option value="">
                          {districtsLoading
                            ? "Loading districts..."
                            : "Select district"}
                        </option>

                        {districts.map((district) => (
                          <option key={district.id} value={district.id}>
                            {district.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* District User */}
                    {form.district_id && (
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                          District User *
                        </label>

                        <select
                          name="district_user_id"
                          value={form.district_user_id}
                          onChange={handleChange}
                          disabled={loading || filteredDistrictUsers.length === 0}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                          <option value="">
                            {loading
                              ? "Loading district users..."
                              : filteredDistrictUsers.length === 0
                              ? "No users for this district"
                              : "Select district user"}
                          </option>

                          {filteredDistrictUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Storage Location */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Storage Location *
                      </label>

                      <input
                        name="storage_location"
                        value={form.storage_location}
                        readOnly
                        placeholder={
                          form.district_id
                            ? "No storage location configured for this district"
                            : "Select a district first"
                        }
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                      />
                    </div>

                    {/* Remarks */}
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Notes
                      </label>

                      <input
                        name="remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        placeholder="e.g. Flood emergency response stock issue"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mt-5">

                    <div className="mb-2 flex items-center justify-between">

                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Items to Issue *
                      </label>

                      <button
                        type="button"
                        onClick={addItemRow}
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <Plus size={12} />
                        Add Item
                      </button>

                    </div>

                    {selectedItems.length ===
                    0 ? (
                      <p className="rounded-lg border border-dashed border-slate-300 py-4 text-center text-xs text-slate-400">
                        Click "Add Item" to select
                        inventory items
                      </p>
                    ) : (
                      <div className="space-y-2">

                        {selectedItems.map(
                          (row, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2"
                            >

                              <select
                                value={
                                  row.inventory_id
                                }
                                onChange={(e) =>
                                  updateItemRow(
                                    idx,
                                    "inventory_id",
                                    e.target.value
                                  )
                                }
                                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                              >
                                <option value="">
                                  Select item
                                </option>

                                {Object.entries(
                                  inventoryItemsByCategory
                                ).map(([category, items]) => (
                                  <optgroup
                                    key={category}
                                    label={category}
                                  >
                                    {items.map((item) => (
                                      <option
                                        key={item.id}
                                        value={item.id}
                                      >
                                        {item.product_name} — Stock: {item.quantity}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>

                              <input
                                type="number"
                                min="1"
                                value={
                                  row.quantity
                                }
                                onChange={(e) =>
                                  updateItemRow(
                                    idx,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                                placeholder="Qty"
                                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-center text-sm outline-none focus:border-orange-400"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeItemRow(
                                    idx
                                  )
                                }
                                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <X size={15} />
                              </button>

                            </div>
                          )
                        )}

                      </div>
                    )}
                  </div>

                  {/* Form Buttons */}
                  <div className="mt-5 flex justify-end gap-3">

                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting
                        ? "Issuing…"
                        : "Issue Stock"}
                    </button>

                  </div>
                </form>

              </div>
            </div>
          </div>

          {/* =================================================
              ISSUES LIST
          ================================================== */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* Search Header */}
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <h2 className="font-semibold text-slate-900">
                Stock Issue Records{" "}

                {!loading && (
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    ({pagination.total_items})
                  </span>
                )}
              </h2>

              <div className="relative w-full sm:w-80">

                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  placeholder="Search issue records..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchTerm("")
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}

              </div>
            </div>

            {/* =================================================
                TABLE
            ================================================== */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-sm text-slate-500">
                Loading…
              </div>
            ) : filteredIssues.length ===
              0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">

                <Search
                  size={40}
                  className="mb-3 text-slate-300"
                />

                <p className="font-medium text-slate-700">
                  {searchTerm
                    ? "No matching stock issues"
                    : "No stock issue records"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {searchTerm
                    ? "Try a different search term."
                    : "No stock has been issued yet."}
                </p>

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchTerm("")
                    }
                    className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Clear Search
                  </button>
                )}

              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full text-left text-sm">

                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>

                      <th className="px-5 py-3 font-semibold">
                        ID
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        District User
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Storage Location
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Notes
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Issued At
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Action
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredIssues.map(
                      (issue) => {
                        const id =
                          issue.id ??
                          issue.issue_id;

                        return (
                          <tr
                            key={id}
                            className="transition-colors hover:bg-slate-50"
                          >

                            {/* ID */}
                            <td className="px-5 py-3 text-slate-500">
                              {id}
                            </td>

                            {/* District User */}
                            <td className="px-5 py-3 font-medium text-slate-800">
                              {issue.district_user_name ||
                                districtUsers.find(
                                  (u) => Number(u.id) === Number(issue.district_user_id)
                                )?.name ||
                                "—"}
                            </td>

                            {/* Storage */}
                            <td className="max-w-xs truncate px-5 py-3 text-slate-600">
                              {issue.storage_location ||
                                "—"}
                            </td>

                            {/* Notes */}
                            <td className="max-w-xs truncate px-5 py-3 text-slate-500">
                              {issue.remarks ||
                                "—"}
                            </td>

                            {/* Date */}
                            <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-400">
                              {issue.created_at
                                ? new Date(
                                    issue.created_at
                                  ).toLocaleString()
                                : "—"}
                            </td>

                            {/* =================================================
                                ACTION BUTTONS
                            ================================================== */}
                            <td className="px-5 py-3">
  <div className="flex items-center gap-2">

    <button
      type="button"
      onClick={() => setPreviewIssue(issue)}
      title="Preview"
    >
      <Eye size={17} />
    </button>

    <button
      type="button"
      onClick={() => handleDelete(id)}
      title="Delete"
    >
      <Trash2 size={17} />
    </button>

  </div>
</td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>
                </table>
              </div>
            )}

            {/* =================================================
                PAGINATION
            ================================================== */}
            {!loading &&
              pagination.total_pages >
                1 && (
                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                  <p className="text-sm text-slate-500">

                    Showing{" "}

                    <span className="font-medium text-slate-700">
                      {pagination.total_items ===
                      0
                        ? 0
                        : (pagination.page -
                            1) *
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
                    </span>{" "}
                    issues

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
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <span className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-600">
                      Page{" "}
                      {pagination.page}{" "}
                      of{" "}
                      {
                        pagination.total_pages
                      }
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
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>

                  </div>
                </div>
              )}

          </div>
        </div>
      </div>

      {/* =====================================================
          PREVIEW MODAL
      ====================================================== */}
      {previewIssue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() =>
            setPreviewIssue(null)
          }
        >

          <div
            className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Stock Issue Preview
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Issue #
                  {previewIssue.id ??
                    previewIssue.issue_id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreviewIssue(null)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>

            </div>

            {/* Modal Body */}
            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">

              {/* Details */}
              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Issue ID
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {previewIssue.district_user_name ||
                        districtUsers.find(
                          (u) =>
                            Number(u.id) === Number(previewIssue.district_user_id)
                        )?.name ||
                        "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    District User
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {previewIssue.district_user_name ??
                      previewIssue.district_user_id ??
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Storage Location
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {previewIssue.storage_location ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Issued At
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {previewIssue.created_at
                      ? new Date(
                          previewIssue.created_at
                        ).toLocaleString()
                      : "—"}
                  </p>
                </div>

              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Notes
                </p>

                <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {previewIssue.remarks ||
                    "No notes provided."}
                </div>
              </div>

              {/* Issued Items */}
              <div>

                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Issued Items
                </p>

                {previewIssue.items?.length >
                0 ? (
                  <div className="overflow-hidden rounded-lg border border-slate-200">

                    <table className="w-full text-left text-sm">

                      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <tr>

                          <th className="px-4 py-3 font-semibold">
                            Item
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            Equipment Type
                          </th>

                          <th className="px-4 py-3 text-right font-semibold">
                            Quantity
                          </th>

                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">

                        {previewIssue.items.map(
                          (item, index) => (
                            <tr
                              key={
                                item.id ??
                                index
                              }
                            >

                              <td className="px-4 py-3 font-medium text-slate-800">
                                {item.product_name ??
                                  item.item_name ??
                                  item.inventory_id ??
                                  "—"}
                              </td>

                              <td className="px-4 py-3 text-slate-500">
                                {item.equipment_type ??
                                  "—"}
                              </td>

                              <td className="px-4 py-3 text-right font-semibold text-slate-700">
                                {item.quantity ??
                                  "—"}
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>
                    </table>

                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                    No item details available
                    for this issue.
                  </div>
                )}

              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

              <button
                type="button"
                onClick={() =>
                  setPreviewIssue(null)
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
}

export default IssueStock;