
import { useState, useEffect, useCallback } from "react";
import {
  listInventoryItems,
  createStockIssue,
  updateStockIssue,
  listStockIssues,
  getStockIssue,
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
  CheckCircle2,
  AlertCircle,
  Package,
  MapPin,
  User,
  CalendarDays,
  Warehouse,
  Hash,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import DownloadMenu from "../../../components/common/DownloadMenu";

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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editingIssueId, setEditingIssueId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [previewIssue, setPreviewIssue] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const LIMIT = 10;

  const fetchAll = useCallback(async () => {
    setLoading(true);

    try {
      const [invRes, issueRes, userRes] = await Promise.allSettled([
        listInventoryItems({ page: 1, limit: 200 }),
        listStockIssues({ page, limit: LIMIT, search: searchTerm }),
        listUsers({ role: "district", page: 1, per_page: 100 }),
      ]);

      if (invRes.status === "fulfilled") {
        const inventoryData = invRes.value?.data;
        setInventoryItems(
          inventoryData?.items ??
            (Array.isArray(inventoryData) ? inventoryData : [])
        );
      } else {
        setInventoryItems([]);
      }

      if (issueRes.status === "fulfilled") {
        const data = issueRes.value?.data;
        const issueList =
          data?.issues ??
          data?.items ??
          (Array.isArray(data) ? data : []);

        setIssues(issueList);
        setPagination(data?.pagination ?? DEFAULT_PAGINATION);
      } else {
        setIssues([]);
        setPagination(DEFAULT_PAGINATION);
      }

      if (userRes.status === "fulfilled") {
        const userData = userRes.value?.data;
        setDistrictUsers(
          userData?.users ??
            (Array.isArray(userData) ? userData : [])
        );
      } else {
        setDistrictUsers([]);
      }
    } catch (err) {
      console.error("Failed to load stock issue data:", err);
      showToast("error", err?.message || "Failed to load stock issue data.");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, showToast]);

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
      console.error("Failed to load districts:", err);
      setDistricts([]);
      showToast("error", err?.message || "Failed to load districts.");
    } finally {
      setDistrictsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDistricts();
  }, [fetchDistricts]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDistrictChange = (e) => {
    const districtId = e.target.value;
    const selectedDistrict = districts.find(
      (district) => String(district.id) === String(districtId)
    );

    setForm((prev) => ({
      ...prev,
      district_id: districtId,
      district_user_id: "",
      storage_location: selectedDistrict?.storage_location || "",
    }));
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
    setEditingIssueId(null);
    setShowForm(false);
  };

  const addItemRow = () => {
    setSelectedItems((prev) => [
      ...prev,
      { category: "", inventory_id: "", quantity: "" },
    ]);
  };

  const removeItemRow = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemRow = (index, field, value) => {
    setSelectedItems((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
              ...(field === "category" ? { inventory_id: "" } : {}),
            }
          : row
      )
    );
  };

  const inventoryItemsByCategory = inventoryItems.reduce((groups, item) => {
    const category =
      item.equipment_type ??
      item.equipment?.equipment_type ??
      item.category_name ??
      "Uncategorized";

    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {});

  const inventoryCategories = Object.keys(inventoryItemsByCategory).sort(
    (a, b) => a.localeCompare(b)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.district_id) {
      showToast("error", "Please select a district.");
      return;
    }

    if (!form.district_user_id) {
      showToast("error", "Please select a district user.");
      return;
    }

    if (!form.storage_location.trim()) {
      showToast("error", "Storage location is required.");
      return;
    }

    if (selectedItems.length === 0) {
      showToast("error", "Add at least one item to issue.");
      return;
    }

    const invalidRow = selectedItems.find(
      (row) => !row.inventory_id || Number(row.quantity) <= 0
    );

    if (invalidRow) {
      showToast("error", "Every item needs a product and valid quantity.");
      return;
    }

    const itemsPayload = selectedItems
      .filter((row) => row.inventory_id && Number(row.quantity) > 0)
      .map((row) => ({
        inventory_id: Number(row.inventory_id),
        quantity: Number(row.quantity),
      }));

    if (itemsPayload.length === 0) {
      showToast("error", "Please add valid inventory items.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        district_user_id: Number(form.district_user_id),
        storage_location: form.storage_location.trim(),
        items: itemsPayload,
        ...(form.remarks.trim() && { remarks: form.remarks.trim() }),
      };

      const response = await createStockIssue(payload);
      const createdIssue =
        response?.data?.issue ??
        response?.issue ??
        response?.data ??
        response ??
        {};

      const issuedItems = itemsPayload.map((issuedItem) => {
        const inventoryItem = inventoryItems.find(
          (item) =>
            Number(item.inventory_id ?? item.id) ===
            issuedItem.inventory_id
        );

        return {
          ...inventoryItem,
          ...issuedItem,
          product_name:
            inventoryItem?.product_name ??
            inventoryItem?.item_name ??
            `Inventory item ${issuedItem.inventory_id}`,
          equipment_type:
            inventoryItem?.equipment_type ??
            inventoryItem?.equipment?.equipment_type ??
            inventoryItem?.category_name ??
            "—",
          brand_name: inventoryItem?.brand_name ?? inventoryItem?.brand ?? "",
          oem: inventoryItem?.oem ?? "",
          source_location: inventoryItem?.source_location ?? "",
        };
      });

      const selectedDistrictUser = districtUsers.find(
        (user) => Number(user.id) === Number(form.district_user_id)
      );

      const createdIssueId =
        createdIssue?.id ??
        createdIssue?.issue_id ??
        response?.issue_id ??
        response?.id;

      setPreviewIssue({
        ...createdIssue,
        id: createdIssueId,
        issue_id: createdIssue?.issue_id ?? createdIssueId,
        district_user_id: Number(form.district_user_id),
        district_user_name:
          createdIssue?.district_user_name ??
          selectedDistrictUser?.name ??
          "—",
        storage_location: payload.storage_location,
        remarks: payload.remarks ?? "",
        issue_date: createdIssue?.issue_date ?? new Date().toISOString(),
        created_at: createdIssue?.created_at ?? new Date().toISOString(),
        status: createdIssue?.status ?? "issued",
        items: issuedItems,
        total_items: createdIssue?.total_items ?? issuedItems.length,
        total_quantity:
          createdIssue?.total_quantity ??
          issuedItems.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
          ),
      });

      resetForm();
      showToast("success", "Stock issue created successfully.");
      await fetchAll();
    } catch (err) {
      console.error("Failed to issue stock:", err);
      showToast("error", err?.message || "Failed to issue stock.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = async (issue) => {
    const issueId = issue?.issue_id ?? issue?.id;

    if (!issueId) {
      showToast("error", "Invalid stock issue ID.");
      return;
    }

    setPreviewLoading(true);

    try {
      const response = await getStockIssue(issueId);
      const detail = response?.data;

      if (!detail) throw new Error("Stock issue details not found.");
      setPreviewIssue(detail);
    } catch (err) {
      console.error("Failed to load stock issue:", err);
      showToast("error", err?.message || "Failed to load stock issue details.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleEdit = async (issue) => {
    const issueId = issue?.issue_id ?? issue?.id;

    if (!issueId) {
      showToast("error", "Invalid stock issue ID.");
      return;
    }

    setPreviewLoading(true);

    try {
      const response = await getStockIssue(issueId);
      const detail = response?.data;

      if (!detail) throw new Error("Stock issue details not found.");

      const districtUserId = String(detail.district_user_id ?? "");
      const districtUser = districtUsers.find(
        (user) => String(user.id) === districtUserId
      );

      setEditingIssueId(issueId);

      setForm({
        district_id: String(
          detail.district_id ??
            districtUser?.district_id ??
            districtUser?.district?.id ??
            ""
        ),
        district_user_id: districtUserId,
        storage_location: detail.storage_location ?? "",
        remarks: detail.remarks ?? "",
      });

      setSelectedItems(
        (detail.items ?? []).map((item) => {
          const inventoryId = String(item.inventory_id ?? "");
          const inventoryItem = inventoryItems.find(
            (inventory) =>
              String(inventory.inventory_id ?? inventory.id) === inventoryId
          );

          return {
            category:
              inventoryItem?.equipment_type ??
              inventoryItem?.equipment?.equipment_type ??
              inventoryItem?.category_name ??
              item.equipment_type ??
              "",
            inventory_id: inventoryId,
            quantity: String(item.quantity ?? ""),
          };
        })
      );

      setShowForm(true);
    } catch (err) {
      showToast("error", err?.message || "Failed to load issue for editing.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const issueId = Number(id);

    if (!issueId) {
      showToast("error", "Invalid stock issue ID.");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete this stock issue?"
      )
    ) {
      return;
    }

    setDeletingId(issueId);

    try {
      await deleteStockIssue(issueId);

      setIssues((prev) =>
        prev.filter(
          (issue) => Number(issue.id ?? issue.issue_id) !== issueId
        )
      );

      setPagination((prev) => ({
        ...prev,
        total_items: Math.max(0, Number(prev.total_items || 0) - 1),
      }));

      setPreviewIssue((current) => {
        if (
          current &&
          Number(current.id ?? current.issue_id) === issueId
        ) {
          return null;
        }
        return current;
      });

      showToast("success", "Stock issue deleted successfully.");
      await fetchAll();
    } catch (err) {
      console.error("Failed to delete stock issue:", err);
      showToast("error", err?.message || "Failed to delete stock issue.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;

    return (
      String(issue.issue_no ?? issue.id ?? issue.issue_id ?? "")
        .toLowerCase()
        .includes(search) ||
      String(issue.district_user_name ?? issue.assigned_to ?? "")
        .toLowerCase()
        .includes(search) ||
      String(issue.district_user_id ?? "").toLowerCase().includes(search) ||
      String(issue.storage_location ?? "").toLowerCase().includes(search) ||
      String(issue.remarks ?? "").toLowerCase().includes(search)
    );
  });

  const formatDate = (date) => {
    if (!date) return "—";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    if (!date) return "";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {toast && (
        <div className="fixed right-5 top-5 z-[100] w-[min(390px,calc(100vw-2rem))]">
          <div
            className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xl ${
              toast.type === "success"
                ? "border-emerald-200"
                : "border-red-200"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                toast.type === "success"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">
                {toast.type === "success" ? "Success" : "Error"}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-slate-50 p-4 md:p-7">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-sm">
                <ArrowDownCircle size={25} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    Issue Stock
                  </h1>
                  {!loading && (
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {pagination.total_items ?? issues.length}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Assign inventory items to district users for field deployment.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={fetchAll}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm((prev) => !prev);
                  if (!showForm) {
                    setForm(EMPTY_FORM);
                    setSelectedItems([]);
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
              >
                {showForm ? (
                  <>
                    <X size={16} />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Issue Stock
                  </>
                )}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="mb-6 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <Package size={19} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">
                      {editingIssueId ? "Edit Stock Issue" : "New Stock Issue"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Select recipient and inventory items to issue.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      District *
                    </label>
                    <select
                      name="district_id"
                      value={form.district_id}
                      onChange={handleDistrictChange}
                      disabled={districtsLoading}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-50"
                    >
                      <option value="">
                        {districtsLoading ? "Loading districts..." : "Select district"}
                      </option>
                      {districts.map((district) => (
                        <option key={district.id} value={district.id}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      District User *
                    </label>
                    <select
                      name="district_user_id"
                      value={form.district_user_id}
                      onChange={handleChange}
                      disabled={
                        !form.district_id || filteredDistrictUsers.length === 0
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-50"
                    >
                      <option value="">
                        {!form.district_id
                          ? "Select district first"
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

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Store Location *
                    </label>
                    <div className="relative">
                      <Warehouse
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        name="storage_location"
                        value={form.storage_location}
                        readOnly
                        placeholder={
                          form.district_id
                            ? "No storage location configured"
                            : "Select a district first"
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Note
                    </label>
                    <input
                      name="remarks"
                      value={form.remarks}
                      onChange={handleChange}
                      placeholder="e.g. Flood emergency response"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Products</p>
                      <p className="text-xs text-slate-400">
                        Add inventory items and quantities.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-100"
                    >
                      <Plus size={14} />
                      Add Item
                    </button>
                  </div>

                  {selectedItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-7 text-center">
                      <Package size={26} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">
                        No items added
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Click "Add Item" to select inventory.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedItems.map((row, index) => (
                        <div
                          key={index}
                          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1.5fr_110px_40px] sm:items-end"
                        >
                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-500">
                              Category *
                            </label>
                            <select
                              value={row.category}
                              onChange={(e) =>
                                updateItemRow(index, "category", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            >
                              <option value="">Select category</option>
                              {inventoryCategories.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-500">
                              Product *
                            </label>
                            <select
                              value={row.inventory_id}
                              onChange={(e) =>
                                updateItemRow(index, "inventory_id", e.target.value)
                              }
                              disabled={!row.category}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
                            >
                              <option value="">
                                {row.category ? "Select product" : "Select category first"}
                              </option>
                              {(inventoryItemsByCategory[row.category] || []).map(
                                (item) => (
                                  <option
                                    key={item.inventory_id ?? item.id}
                                    value={item.inventory_id ?? item.id}
                                  >
                                    {item.product_name || "Unnamed product"} — Stock:{" "}
                                    {item.quantity ?? 0}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-500">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) =>
                                updateItemRow(index, "quantity", e.target.value)
                              }
                              placeholder="Qty"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Issuing...
                      </>
                    ) : (
                      <>
                        <ArrowDownCircle size={16} />
                        {editingIssueId ? "Update Issue" : "Issue Stock"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Stock Issues</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {pagination.total_items ?? issues.length}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Track inventory issued to district users.
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <div className="relative w-full md:w-96">
                  <Search
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search issue, user or location..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <DownloadMenu
                  records={filteredIssues.map((issue, index) => ({
                    "S.No": index + 1,
                    "Issue Number": issue.issue_no ?? "",
                    "District User ID": issue.district_user_id ?? "",
                    "Assigned To": issue.district_user_name ?? issue.assigned_to ?? "",
                    "Storage Location": issue.storage_location ?? "",
                    "Issue Date": formatDate(issue.issue_date ?? issue.created_at),
                    Status: issue.status ?? "",
                    Remarks: issue.remarks ?? "",
                    "Total Items": issue.total_items ?? 0,
                    "Total Quantity": issue.total_quantity ?? 0,
                  }))}
                  title="Stock Issue Report"
                  disabled={loading}
                  onError={(err) =>
                    showToast(
                      "error",
                      err.message || "Failed to download stock issues."
                    )
                  }
                />
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="text-center">
                  <RefreshCw
                    size={28}
                    className="mx-auto mb-3 animate-spin text-orange-500"
                  />
                  <p className="text-sm font-semibold text-slate-700">
                    Loading stock issues...
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Please wait</p>
                </div>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Search size={25} />
                </div>
                <p className="mt-4 font-bold text-slate-700">
                  {searchTerm ? "No matching stock issues" : "No stock issue records"}
                </p>
                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  {searchTerm
                    ? "Try a different search term."
                    : "No stock has been issued yet."}
                </p>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        {[
                          "Issue",
                          "Recipient",
                          "Location",
                          "Items",
                          "Qty",
                          "Issued At",
                          "Status",
                          "Action",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className={`px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                              ["Items", "Qty", "Status"].includes(heading)
                                ? "text-center"
                                : heading === "Action"
                                  ? "text-right"
                                  : ""
                            }`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredIssues.map((issue) => {
                        const id = issue.id ?? issue.issue_id;
                        const userName =
                          issue.district_user_name ??
                          issue.assigned_to ??
                          districtUsers.find(
                            (user) =>
                              Number(user.id) === Number(issue.district_user_id)
                          )?.name ??
                          "—";

                        return (
                          <tr
                            key={id}
                            className="group transition-colors hover:bg-orange-50/30"
                          >
                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() => handlePreview(issue)}
                                className="text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-100">
                                    <Hash size={16} />
                                  </div>
                                  <p className="font-bold text-slate-800 transition group-hover:text-orange-600">
                                    {issue.issue_no ||
                                      `ISS-${String(id).padStart(6, "0")}`}
                                  </p>
                                </div>
                              </button>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                  <User size={16} />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {userName}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    District user
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex max-w-[230px] items-start gap-2">
                                <MapPin
                                  size={15}
                                  className="mt-0.5 shrink-0 text-slate-400"
                                />
                                <span className="truncate text-sm text-slate-600">
                                  {issue.storage_location || "—"}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                                {issue.total_items ?? 0}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span className="font-bold text-slate-800">
                                {issue.total_quantity ?? 0}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <CalendarDays
                                  size={15}
                                  className="shrink-0 text-slate-400"
                                />
                                <div>
                                  <p className="whitespace-nowrap text-sm font-semibold text-slate-700">
                                    {formatDate(issue.issue_date ?? issue.created_at)}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {formatTime(issue.issue_date ?? issue.created_at)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold capitalize text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {issue.status || "issued"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handlePreview(issue)}
                                  title="View issue"
                                  className="rounded-xl p-2.5 text-slate-400 transition hover:bg-orange-50 hover:text-orange-600"
                                >
                                  <Eye size={17} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(issue)}
                                  title="Edit issue"
                                  className="rounded-xl p-2.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                                >
                                  <Pencil size={17} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(id)}
                                  disabled={deletingId === Number(id)}
                                  title="Delete issue"
                                  className="rounded-xl p-2.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deletingId === Number(id) ? (
                                    <RefreshCw size={17} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={17} />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {pagination.total_pages > 1 && (
                  <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                      Page{" "}
                      <span className="font-bold text-slate-700">
                        {pagination.page ?? page}
                      </span>{" "}
                      of{" "}
                      <span className="font-bold text-slate-700">
                        {pagination.total_pages}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!pagination.has_previous_page}
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={15} />
                        Previous
                      </button>
                      <span className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                        {pagination.page ?? page}
                      </span>
                      <button
                        type="button"
                        disabled={!pagination.has_next_page}
                        onClick={() => setPage((prev) => prev + 1)}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* COMPACT VIEW MODAL */}
      {previewIssue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
          onClick={() => setPreviewIssue(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-issue-preview-title"
            className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Compact header */}
            <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-white px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <Package size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        id="stock-issue-preview-title"
                        className="text-base font-black text-slate-900 sm:text-lg"
                      >
                        Stock Issue Details
                      </h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {previewIssue.status || "issued"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {previewIssue.issue_no ||
                        `Issue ${previewIssue.issue_id ?? previewIssue.id ?? "—"}`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewIssue(null)}
                  aria-label="Close preview"
                  className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {previewLoading ? (
                <div className="flex min-h-[220px] items-center justify-center">
                  <div className="text-center">
                    <RefreshCw
                      size={25}
                      className="mx-auto mb-3 animate-spin text-orange-500"
                    />
                    <p className="text-sm font-bold text-slate-800">
                      Loading issue details...
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Fetching issued items.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Compact summary */}
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="mb-1.5 flex items-center gap-2 text-slate-400">
                        <User size={14} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">
                          Recipient
                        </p>
                      </div>
                      <p className="break-words text-sm font-bold text-slate-900">
                        {previewIssue.district_user_name ??
                          districtUsers.find(
                            (user) =>
                              Number(user.id) ===
                              Number(previewIssue.district_user_id)
                          )?.name ??
                          "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="mb-1.5 flex items-center gap-2 text-slate-400">
                        <Warehouse size={14} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">
                          Storage Location
                        </p>
                      </div>
                      <p className="break-words text-sm font-bold text-slate-900">
                        {previewIssue.storage_location || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="mb-1.5 flex items-center gap-2 text-slate-400">
                        <CalendarDays size={14} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">
                          Issued At
                        </p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {formatDate(
                          previewIssue.issue_date ?? previewIssue.created_at
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatTime(
                          previewIssue.issue_date ?? previewIssue.created_at
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                      <div className="mb-1.5 flex items-center gap-2 text-orange-600">
                        <Package size={14} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">
                          Total Issued
                        </p>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black leading-none text-orange-700">
                          {previewIssue.total_quantity ?? 0}
                        </p>
                        <p className="text-xs font-semibold text-orange-600">
                          units
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-orange-700/70">
                        {previewIssue.total_items ??
                          previewIssue.items?.length ??
                          0}{" "}
                        item types
                      </p>
                    </div>
                  </div>

                  {/* Compact items table */}
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Package size={15} className="text-orange-500" />
                        <p className="text-sm font-bold text-slate-800">
                          Issued Items
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                          {previewIssue.items?.length ?? 0} items
                        </span>
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700">
                          Total: {previewIssue.total_quantity ?? 0}
                        </span>
                      </div>
                    </div>

                    {previewIssue.items?.length > 0 ? (
                      <div className="max-h-64 overflow-auto">
                        <table className="w-full min-w-[600px] text-left">
                          <thead className="sticky top-0 z-10 bg-white">
                            <tr className="border-b border-slate-100">
                              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Product
                              </th>
                              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Category
                              </th>
                              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Brand
                              </th>
                              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                OEM / Source
                              </th>
                              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Quantity
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewIssue.items.map((item, index) => (
                              <tr
                                key={
                                  item.issue_item_id ??
                                  item.inventory_id ??
                                  index
                                }
                                className="transition hover:bg-slate-50"
                              >
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                                      <Package size={15} />
                                    </div>
                                    <p className="max-w-[220px] break-words text-sm font-semibold text-slate-800">
                                      {item.product_name || "Unnamed item"}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-xs text-slate-600">
                                  {item.equipment_type || "—"}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-slate-600">
                                  {item.brand_name || "—"}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-slate-600">
                                  <div>{item.oem || "—"}</div>
                                  {item.source_location && (
                                    <div className="mt-0.5 text-[10px] text-slate-400">
                                      {item.source_location}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <span className="inline-flex min-w-9 justify-center rounded-lg bg-orange-50 px-2.5 py-1.5 text-sm font-black text-orange-700">
                                    {item.quantity ?? 0}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <Package
                          size={24}
                          className="mx-auto text-slate-300"
                        />
                        <p className="mt-2 text-sm font-bold text-slate-600">
                          No issued items found
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          There are no item details available for this issue.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Note and issue number share one row */}
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="min-w-0 rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                        Note
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-5 text-slate-700">
                        {previewIssue.remarks || "No notes provided."}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Hash size={14} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">
                          Issue Number
                        </p>
                      </div>
                      <p className="mt-1.5 break-words text-sm font-bold text-slate-800">
                        {previewIssue.issue_no ||
                          previewIssue.issue_id ||
                          previewIssue.id ||
                          "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Compact footer */}
            <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => setPreviewIssue(null)}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
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
