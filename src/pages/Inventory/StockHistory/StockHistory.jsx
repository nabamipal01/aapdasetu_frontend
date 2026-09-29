import React, { useState, useEffect, useCallback } from "react";
import { listStockHistory, getInventoryHistory,listUsers } from "../../../services";
import { History, RefreshCw, Search } from "lucide-react";

function StockHistory() {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [filterInvId, setFilterInvId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let res;
      if (filterInvId && !isNaN(Number(filterInvId))) {
        res = await getInventoryHistory(Number(filterInvId));
      } else {
        res = await listStockHistory({ page: 1, limit: 100 });
      }
      // history API returns data.history, data.logs, data.items, or data directly
      const data = res?.data;
      setLogs(
        Array.isArray(data)
          ? data
          : (data?.history ?? data?.logs ?? data?.items ?? [])
      );
    } catch (err) {
      setError(err.message || "Failed to load stock history");
    } finally {
      setLoading(false);
    }
  }, [filterInvId]);

const fetchUsers = useCallback(async () => {
  try {
    const res = await listUsers({
      page: 1,
      per_page: 100,
    });

    console.log("USERS API RESPONSE:", res);

    const data = res?.data;

    const userList = Array.isArray(data)
      ? data
      : data?.users ??
        data?.data ??
        data?.items ??
        [];

    console.log("USER LIST:", userList);

    setUsers(userList);
  } catch (err) {
    console.error("Failed to load users:", err);
  }
}, []);

  const ACTION_STYLES = {
    add:    "bg-green-100 text-green-700",
    issue:  "bg-orange-100 text-orange-700",
    adjust: "bg-blue-100 text-blue-700",
    delete: "bg-red-100 text-red-700",
  };

    useEffect(() => { fetchHistory(); fetchUsers(); }, [fetchHistory, fetchUsers]);


 

const getIssuedByUser = (userId) => {
  if (userId == null) return null;

  const numericId = Number(userId);

  // System users
  if (numericId === 1) {
    return {
      id: 1,
      name: "SuperAdmin",
      
    };
  }

  if (numericId === 2) {
    return {
      id: 2,
      name: "Admin",
    };
  }

  // Other users from API
  return (
    users.find(
      (user) =>
        Number(user.id ?? user.user_id) === numericId
    ) ?? null
  );
};



const filteredLogs = logs.filter((log) => {
  const search = searchTerm.toLowerCase().trim();

  if (!search) return true;

  return (
    String(log.reference_no ?? "").toLowerCase().includes(search) ||
    String(log.equipment_type ?? "").toLowerCase().includes(search) ||
    String(log.product_name ?? "").toLowerCase().includes(search) ||
    String(log.brand_name ?? "").toLowerCase().includes(search) ||
    String(log.source_location ?? "").toLowerCase().includes(search) ||
    String(log.destination_location ?? "").toLowerCase().includes(search) ||
    String(log.district_user_name ?? "").toLowerCase().includes(search) ||
    String(log.issued_by ?? "").toLowerCase().includes(search)
  );
});

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-[1600px]">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <History className="text-indigo-600" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stock History</h1>
              <p className="text-sm text-slate-500">Audit trail of all inventory movements</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Filter by inventory item */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={filterInvId}
                onChange={(e) => setFilterInvId(e.target.value)}
                placeholder="Filter by Inventory ID"
                className="rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-48"
              />
            </div>
            <button onClick={fetchHistory}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
  <h2 className="font-semibold text-slate-900">
    History Entries{" "}
    {!loading && (
      <span className="ml-1 text-sm font-normal text-slate-500">
        ({filteredLogs.length})
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
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search history..."
      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
    />

    {searchTerm && (
      <button
        type="button"
        onClick={() => setSearchTerm("")}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        ×
      </button>
    )}
  </div>
</div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">Loading…</div>
          ) : filteredLogs.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <Search size={40} className="mb-3 text-slate-300" />
    <p className="font-medium text-slate-700">
      No matching history records
    </p>
    <p className="mt-1 text-sm text-slate-500">
      Try a different search term.
    </p>
  </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1800px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    {/* <th className="px-5 py-3 font-semibold">History ID</th>
                    <th className="px-5 py-3 font-semibold">Inventory ID</th>
                    <th className="px-5 py-3 font-semibold">Equipment ID</th> */}
                    <th className="px-5 py-3 font-semibold">Reference No.</th>
                    <th className="px-5 py-3 font-semibold">Equipment Type</th>
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-5 py-3 font-semibold">Brand</th>
                    {/* <th className="px-5 py-3 font-semibold">OEM</th> */}
                    <th className="px-5 py-3 font-semibold text-right">Current Stock</th>
                    <th className="px-5 py-3 font-semibold text-right">Before Allocation</th>
                    {/* <th className="px-5 py-3 font-semibold text-right">Change</th> */}
                    <th className="px-5 py-3 font-semibold text-right">Qty Allocated</th>
                    <th className="px-5 py-3 font-semibold">Central Warehouse</th>
                    <th className="px-5 py-3 font-semibold">District</th>
                    <th className="px-5 py-3 font-semibold">District User</th>
                    <th className="px-5 py-3 font-semibold">Issued By</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                 {filteredLogs.map((log) => {
                    const historyId = log.history_id ?? log.id ?? "—";
                    const quantityBefore = Number(log.quantity_before ?? 0);
                    const quantityAfter = Number(log.quantity_after ?? 0);
                    const change = quantityAfter - quantityBefore;
                    return (
                      <tr key={historyId} className="hover:bg-slate-50 transition-colors">
                        {/* History ID */}
                        {/* <td className="px-5 py-3 text-slate-400">{historyId}</td> */}
                        {/* Inventory ID */}
                        {/* <td className="px-5 py-3 font-medium text-slate-800">
                          {log.product_name ?? log.inventory_id ?? "—"}
                        </td> */}
                        {/* Equipment ID */}
                        {/* <td className="px-5 py-3">{log.equipment_id ?? "—"}</td> */}
                         {/* Reference */}
                        <td className="px-5 py-3"> <div> <p className="text-indigo-600"> {log.reference_no ?? "—"} </p>  </div> </td>
                        {/* Equipment Type */}
                        <td className="px-5 py-3"><span className="font-medium text-slate-800"> {log.equipment_type ?? "—"} </span></td>
                        {/* Product */}
                        <td className="px-5 py-3"> <div> <p className="text-slate-800"> {log.product_name ?? "—"} </p>  </div> </td>
                        {/* Brand */}
                        <td className="px-5 py-3 text-slate-600">{log.brand_name ?? "—"}</td>
                        {/* OEM */}
                        {/* <td className="px-5 py-3 text-slate-600">{log.oem ?? "—"}</td> */}
                       
                        {/* Quantity */}
                        <td className="px-5 py-3 text-right font-semibold text-slate-800"> {log.quantity ?? "—"} </td>
                        {/* Quantity Before */}
                        <td className="px-5 py-3 text-right text-slate-600">{log.quantity_before ?? "—"}</td>
                        {/* <td className="px-5 py-3 text-right font-semibold">
                          {change !== null ? (
                            <span className={change > 0 ? "text-green-600" : "text-red-600"}>
                              {change > 0 ? `+${change}` : change}
                            </span>
                          ) : "—"}
                        </td> */}
                        {/* Quantity After */}
                        <td className="px-5 py-3 text-right text-slate-600">{log.quantity_after ?? "—"}</td>
                        {/* <td className="px-5 py-3 text-slate-500">
                          {log.performed_by_name ?? log.actor?.name ?? log.performed_by ?? "—"}
                        </td> */}
                        {/* Source */}
                        <td className="px-5 py-3 text-slate-600"> {log.source_location ?? "—"} </td>
                        {/* Destination */}
                        <td className="px-5 py-3 text-slate-600"> {log.destination_location ?? "—"} </td>
                        {/* District User */}
                        <td className="px-5 py-3"> <div> <p className="font-medium text-slate-700"> {log.district_user_name ?? "—"} </p>  </div> </td>
                        {/* Issued By */}
                        <td className="px-5 py-3">
                          {(() => {
                            const rawVal = log.issued_by;

                            // If the raw value is not numeric, it's already a name — show it directly
                            if (rawVal != null && isNaN(Number(rawVal))) {
                              return (
                                <span className="font-medium text-slate-700">{rawVal}</span>
                              );
                            }

                            // Numeric ID — try to resolve to a user name
                            const user = getIssuedByUser(rawVal);

                            if (!user) {
                              // Fallback: show the raw value (ID) or a dash
                              return (
                                <span className="text-slate-500">
                                  {rawVal != null ? String(rawVal) : "—"}
                                </span>
                              );
                            }

                            return (
                              <div>
                                <p className="font-medium text-slate-700">
                                  {user.name}
                                </p>
                                <p className="text-xs capitalize text-slate-400">
                                  {user.role?.replace(/_/g, " ")}
                                </p>
                              </div>
                            );
                          })()}
                        </td>
                        {/* Date */} 
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500"> {log.created_at ? new Date( log.created_at ).toLocaleString() : "—"} </td>
                      </tr>
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

export default StockHistory;
