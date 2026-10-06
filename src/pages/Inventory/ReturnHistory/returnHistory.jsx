import { useState, useEffect, useCallback } from "react";
import { listReturnHistory } from "../../../services";
import {
  AlertCircle,
  CheckCircle2,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

function ReturnHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filterInvId, setFilterInvId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const requestHistory = useCallback(
    () => listReturnHistory({ page: 1, limit: 100 }),
    []
  );

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const entries = await requestHistory();
      setLogs(entries);
    } catch (err) {
      setError(err.message || "Failed to load return history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestHistory]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => fetchHistory(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchHistory]);

  const filteredLogs = logs.filter((log) => {
    if (
      filterInvId &&
      String(log.inventory_id) !== String(filterInvId)
    ) {
      return false;
    }

    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;

    return (
      String(log.reference_no ?? "").toLowerCase().includes(search) ||
      String(log.issue_no ?? "").toLowerCase().includes(search) ||
      String(log.equipment_type ?? "").toLowerCase().includes(search) ||
      String(log.product_name ?? "").toLowerCase().includes(search) ||
      String(log.brand_name ?? "").toLowerCase().includes(search) ||
      String(log.source_location ?? "").toLowerCase().includes(search) ||
      String(log.destination_location ?? "").toLowerCase().includes(search) ||
      String(log.district_user_name ?? "").toLowerCase().includes(search) ||
      String(log.returned_by_name ?? log.returned_by ?? log.issued_by ?? "")
        .toLowerCase()
        .includes(search)
    );
  });

  const getReturnedQuantity = (log) =>
    log.return_quantity ??
    log.quantity_changed ??
    (log.quantity_before != null && log.quantity_after != null
      ? Math.abs(
          Number(log.quantity_after) - Number(log.quantity_before)
        )
      : log.quantity_after ?? 0);

  const totalReturned = filteredLogs.reduce(
    (total, log) => {
      const quantity = Number(getReturnedQuantity(log));
      return total + (Number.isFinite(quantity) ? quantity : 0);
    },
    0
  );
  const uniqueProducts = new Set(
    filteredLogs
      .map((log) => log.inventory_id ?? log.product_name)
      .filter(Boolean)
  ).size;
  const getInitials = (name = "") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <RotateCcw size={19} />
              </span>
              <span className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
                Inventory Management
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Stock Return History
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track returned equipment, quantities, and inventory changes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchHistory(true)}
            disabled={loading || refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Records
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {filteredLogs.length}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Based on current filters
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Package size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Returned Quantity
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {totalReturned}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Total units returned
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <TrendingUp size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Products Returned
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {uniqueProducts}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Unique inventory items
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <CheckCircle2 size={21} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search product, reference, location, or user..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <input
              type="number"
              min="1"
              value={filterInvId}
              onChange={(e) => setFilterInvId(e.target.value)}
              placeholder="Filter by inventory ID"
              aria-label="Filter by inventory ID"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 lg:w-56"
            />
          </div>
          {(searchTerm || filterInvId) && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {filteredLogs.length}
                </span>{" "}
                matching records
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setFilterInvId("");
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold">Unable to load return history</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => fetchHistory()}
                className="mt-3 text-sm font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">
                Return History Entries
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {!loading ? `${filteredLogs.length} records` : "Loading records"}
              </p>
            </div>
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              Returns
            </span>
          </div>

          {loading ? (
            <div className="animate-pulse">
              <div className="h-14 bg-slate-100" />
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="grid grid-cols-4 gap-4 border-t border-slate-100 p-5"
                >
                  <div className="h-5 rounded bg-slate-100" />
                  <div className="h-5 rounded bg-slate-100" />
                  <div className="h-5 rounded bg-slate-100" />
                  <div className="h-5 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={40} className="mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">
                No matching return history records
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try a different search term or clear your filters.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1800px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {[
                        ["Return No.", "text-left"],
                        ["Issue No.", "text-left"],
                        ["Equipment Type", "text-left"],
                        ["Product", "text-left"],
                        ["Brand", "text-left"],
                        ["Current Stock", "text-right"],
                        ["Before Return", "text-right"],
                        ["Qty Returned", "text-right"],
                        ["Source Location", "text-left"],
                        ["Destination Location", "text-left"],
                        ["District User", "text-left"],
                        ["Returned By", "text-left"],
                        ["Date", "text-right"],
                      ].map(([label, alignment]) => (
                        <th
                          key={label}
                          className={`px-5 py-4 ${alignment} text-xs font-bold uppercase tracking-wider text-slate-500`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => {
                      const historyId = log.history_id ?? log.id ?? "—";
                      const returnedQuantity = getReturnedQuantity(log);

                      return (
                        <tr
                          key={historyId}
                          className="group transition hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-5 font-semibold text-emerald-700">
                            {log.reference_no ?? "—"}
                          </td>
                          <td className="px-5 py-5 font-semibold text-slate-700">
                            {log.issue_no ?? "—"}
                          </td>
                          <td className="px-5 py-5">
                            <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                              {log.equipment_type ?? "N/A"}
                            </span>
                          </td>
                          <td className="px-5 py-5 font-semibold text-slate-800">
                            {log.product_name ?? "—"}
                          </td>
                          <td className="px-5 py-5 text-slate-600">
                            {log.brand_name ?? "—"}
                          </td>
                          <td className="px-5 py-5 text-right font-semibold text-slate-800">
                            {log.quantity ?? "—"}
                          </td>
                          <td className="px-5 py-5 text-right text-slate-600">
                            {log.quantity_before ?? "—"}
                          </td>
                          <td className="px-5 py-5 text-right">
                            <span className="inline-flex min-w-12 items-center justify-center rounded-lg bg-emerald-50 px-3 py-2 font-bold text-emerald-700">
                              {returnedQuantity !== "—" &&
                              returnedQuantity != null
                                ? `+${returnedQuantity}`
                                : "—"}
                            </span>
                          </td>
                          <td className="px-5 py-5 text-slate-600">
                            {log.source_location ?? "—"}
                          </td>
                          <td className="px-5 py-5 text-slate-600">
                            {log.destination_location ?? "—"}
                          </td>
                          <td className="px-5 py-5 font-medium text-slate-700">
                            {log.district_user_name ?? "—"}
                          </td>
                          <td className="px-5 py-5 font-medium text-slate-700">
                            {log.returned_by_name ?? log.returned_by ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-5 text-right text-xs text-slate-500">
                            {log.created_at
                              ? new Date(log.created_at).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredLogs.map((log) => {
                  const historyId = log.history_id ?? log.id ?? "—";
                  const returnedQuantity = getReturnedQuantity(log);

                  return (
                    <article key={historyId} className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">
                            {getInitials(log.product_name)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-bold capitalize text-slate-800">
                              {log.product_name || "Unknown Product"}
                            </h3>
                            <p className="truncate text-xs text-slate-500">
                              {log.brand_name || "—"}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-sm font-bold text-emerald-700">
                          {returnedQuantity !== "—" && returnedQuantity != null
                            ? `+${returnedQuantity}`
                            : "—"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          {log.equipment_type || "N/A"}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          Return {log.reference_no || "—"}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          Issue {log.issue_no || "—"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Stock Before
                          </p>
                          <p className="mt-1 text-lg font-bold text-slate-700">
                            {log.quantity_before ?? "—"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                            Current Stock
                          </p>
                          <p className="mt-1 text-lg font-bold text-emerald-700">
                            {log.quantity ?? "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Source Location
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                            {log.source_location || "—"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Destination Location
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                            {log.destination_location || "—"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            District User
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                            {log.district_user_name || "—"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Returned By
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                            {log.returned_by_name ?? log.returned_by ?? "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        <span className="font-medium text-slate-400">Date</span>
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString()
                          : "—"}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReturnHistory;
