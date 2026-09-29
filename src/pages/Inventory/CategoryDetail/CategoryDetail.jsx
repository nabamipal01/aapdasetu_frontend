import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  listInventoryItems,
  listEquipmentTypes,
  listStockHistory,
  listUsers,
} from "../../../services";
import {
  ArrowLeft,
  Package,
  History,
  Search,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const CARD_COLORS = [
  { border: "border-blue-500",    bg: "bg-blue-50",    text: "text-blue-700",    badge: "bg-blue-100 text-blue-700" },
  { border: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  { border: "border-violet-500",  bg: "bg-violet-50",  text: "text-violet-700",  badge: "bg-violet-100 text-violet-700" },
  { border: "border-orange-500",  bg: "bg-orange-50",  text: "text-orange-700",  badge: "bg-orange-100 text-orange-700" },
];

function CategoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [category, setCategory]     = useState(null);
  const [colorIdx, setColorIdx]     = useState(0);
  const [items, setItems]           = useState([]);
  const [history, setHistory]       = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [expandedItem, setExpandedItem] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [typeRes, itemRes, histRes, userRes] = await Promise.allSettled([
        listEquipmentTypes(),
        listInventoryItems({ equipment_id: Number(id), page: 1, limit: 200 }),
        listStockHistory({ page: 1, limit: 500 }),
        listUsers({ page: 1, per_page: 200 }),
      ]);

      if (typeRes.status === "fulfilled") {
        const all = Array.isArray(typeRes.value?.data)
          ? typeRes.value.data
          : (typeRes.value?.data?.types ?? []);
        const idx = all.findIndex((t) => Number(t.equipment_id) === Number(id));
        setColorIdx(idx >= 0 ? idx % CARD_COLORS.length : 0);
        setCategory(all.find((t) => Number(t.equipment_id) === Number(id)) ?? null);
      }

      if (itemRes.status === "fulfilled") {
        const d = itemRes.value?.data;
        setItems(Array.isArray(d) ? d : (d?.items ?? []));
      }

      if (histRes.status === "fulfilled") {
        const d = histRes.value?.data;
        setHistory(Array.isArray(d) ? d : (d?.history ?? d?.logs ?? d?.items ?? []));
      }

      if (userRes.status === "fulfilled") {
        const d = userRes.value?.data;
        setUsers(Array.isArray(d) ? d : (d?.users ?? d?.data ?? d?.items ?? []));
      }
    } catch (err) {
      setError(err.message || "Failed to load category data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resolveUser = (val) => {
    if (val == null) return "—";
    if (isNaN(Number(val))) return String(val);
    const found = users.find((u) => Number(u.id ?? u.user_id) === Number(val));
    return found ? (found.name ?? found.username ?? String(val)) : String(val);
  };

  const historyForItem = (inventoryId) =>
    history.filter((h) => Number(h.inventory_id) === Number(inventoryId));

  const filteredItems = items.filter((item) => {
    const s = itemSearch.toLowerCase().trim();
    if (!s) return true;
    return (
      item.product_name?.toLowerCase().includes(s) ||
      item.brand_name?.toLowerCase().includes(s) ||
      item.location?.toLowerCase().includes(s) ||
      item.oem?.toLowerCase().includes(s)
    );
  });

  const c = CARD_COLORS[colorIdx];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/inventory/overview")}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className={`rounded-xl border-l-4 ${c.border} ${c.bg} px-4 py-2`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Category</p>
              <h1 className={`text-xl font-bold ${c.text}`}>
                {loading ? "Loading…" : (category?.equipment_type ?? "Unknown")}
              </h1>
            </div>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Summary strip */}
        {!loading && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {[
              { label: "Total Products", value: items.length },
              { label: "Total Quantity", value: items.reduce((s, i) => s + Number(i.quantity ?? 0), 0) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
                <p className={`mt-1 text-3xl font-bold ${c.text}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Items table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Package size={16} className={c.text} />
              Items
              {!loading && (
                <span className="text-sm font-normal text-slate-500">({filteredItems.length})</span>
              )}
            </h2>
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search items…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">Loading items…</div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package size={36} className="mb-2 text-slate-200" />
              <p className="text-sm text-slate-500">No items found for this category.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Product Name</th>
                    <th className="px-5 py-3 font-semibold">Brand</th>
                    <th className="px-5 py-3 font-semibold">Location</th>
                    <th className="px-5 py-3 text-right font-semibold">Qty</th>
                    <th className="px-5 py-3 font-semibold">Purchase Date</th>
                    <th className="px-5 py-3 font-semibold">Expiry</th>
                    <th className="px-5 py-3 font-semibold">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const invId = item.id ?? item.inventory_id;
                    const isExpanded = expandedItem === invId;
                    const itemHistory = historyForItem(invId);
                    const isExpired = item.expiry_date && new Date(item.expiry_date) < new Date();

                    return (
                      <React.Fragment key={invId}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-slate-800">{item.product_name}</td>
                          <td className="px-5 py-3 text-slate-600">{item.brand_name || "—"}</td>
                          <td className="max-w-xs truncate px-5 py-3 text-slate-500">{item.location || "—"}</td>
                          <td className="px-5 py-3 text-right font-semibold text-slate-800">{item.quantity}</td>
                          <td className="px-5 py-3 text-slate-500">{item.purchase_date || "—"}</td>
                          <td className="px-5 py-3">
                            {item.expiry_date ? (
                              <span className={`flex items-center gap-1 text-xs font-medium ${isExpired ? "text-red-600" : "text-slate-500"}`}>
                                {isExpired && <AlertTriangle size={12} />}
                                {item.expiry_date}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <button
                              type="button"
                              onClick={() => setExpandedItem(isExpanded ? null : invId)}
                              disabled={itemHistory.length === 0}
                              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                itemHistory.length === 0
                                  ? "cursor-default text-slate-300"
                                  : isExpanded
                                  ? `${c.badge} border border-current`
                                  : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <History size={12} />
                              {itemHistory.length}
                              {itemHistory.length > 0 && (isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                            </button>
                          </td>
                        </tr>

                        {/* Inline history for this item */}
                        {isExpanded && itemHistory.length > 0 && (
                          <tr>
                            <td colSpan={7} className="bg-slate-50 px-0 py-0">
                              <div className="border-y border-slate-200 px-8 py-3">
                                <p className={`mb-2 text-xs font-bold uppercase tracking-wider ${c.text}`}>
                                  Stock History — {item.product_name}
                                </p>
                                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                                      <tr>
                                        <th className="px-4 py-2 font-semibold">Ref No.</th>
                                        <th className="px-4 py-2 text-right font-semibold">Before</th>
                                        <th className="px-4 py-2 text-right font-semibold">Allocated</th>
                                        <th className="px-4 py-2 text-right font-semibold">Current Stock</th>
                                        <th className="px-4 py-2 font-semibold">From (Warehouse)</th>
                                        <th className="px-4 py-2 font-semibold">To (District)</th>
                                        <th className="px-4 py-2 font-semibold">District User</th>
                                        <th className="px-4 py-2 font-semibold">Issued By</th>
                                        <th className="px-4 py-2 font-semibold">Date</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {itemHistory.map((h) => {
                                        const hId = h.history_id ?? h.id ?? Math.random();
                                        return (
                                          <tr key={hId} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 font-medium text-indigo-600">{h.reference_no ?? "—"}</td>
                                            <td className="px-4 py-2 text-right text-slate-600">{h.quantity_before ?? "—"}</td>
                                            <td className="px-4 py-2 text-right font-semibold text-slate-800">{h.quantity_after ?? "—"}</td>
                                            <td className="px-4 py-2 text-right text-slate-600">{h.quantity ?? "—"}</td>
                                            <td className="px-4 py-2 text-slate-500">{h.source_location ?? "—"}</td>
                                            <td className="px-4 py-2 text-slate-500">{h.destination_location ?? "—"}</td>
                                            <td className="px-4 py-2 text-slate-700">{h.district_user_name ?? "—"}</td>
                                            <td className="px-4 py-2 font-medium text-slate-700">{resolveUser(h.issued_by)}</td>
                                            <td className="whitespace-nowrap px-4 py-2 text-slate-400">
                                              {h.created_at ? new Date(h.created_at).toLocaleString() : "—"}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default CategoryDetail;
