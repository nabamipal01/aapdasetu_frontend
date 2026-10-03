import { useState, useEffect, useCallback } from "react";
import { listReturnHistory } from "../../../services";
import { History, RefreshCw, Search } from "lucide-react";

function ReturnHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterInvId, setFilterInvId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const requestHistory = useCallback(
    () => listReturnHistory({ page: 1, limit: 100 }),
    []
  );

  const fetchHistory = useCallback(() => {
    setLoading(true);
    setError("");

    requestHistory()
      .then((entries) => setLogs(entries))
      .catch((err) => {
        setError(err.message || "Failed to load return history");
      })
      .finally(() => setLoading(false));
  }, [requestHistory]);

  useEffect(() => {
    let isActive = true;

    requestHistory()
      .then((entries) => {
        if (isActive) setLogs(entries);
      })
      .catch((err) => {
        if (isActive) {
          setError(err.message || "Failed to load return history");
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [requestHistory]);

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

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-[1600px]">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <History className="text-indigo-600" size={28} />

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Return History
              </h1>

              <p className="text-sm text-slate-500">
                Audit trail of all inventory returns
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Filter by inventory item */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="number"
                value={filterInvId}
                onChange={(e) => setFilterInvId(e.target.value)}
                placeholder="Filter by Inventory ID"
                className="w-48 rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              onClick={fetchHistory}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-slate-900">
              Return History Entries{" "}
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
                placeholder="Search return history..."
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
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">
              Loading return history…
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={40} className="mb-3 text-slate-300" />

              <p className="font-medium text-slate-700">
                No matching return history records
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
                    <th className="px-5 py-3 font-semibold">
                      Return No.
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Issue No.
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Equipment Type
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Product
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Brand
                    </th>

                    <th className="px-5 py-3 font-semibold text-right">
                      Current Stock
                    </th>

                    <th className="px-5 py-3 font-semibold text-right">
                      Before Return
                    </th>

                    <th className="px-5 py-3 font-semibold text-right">
                      Qty Returned
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Source Location
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Destination Location
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      District User
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Returned By
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const historyId =
                      log.history_id ?? log.id ?? "—";

                    return (
                      <tr
                        key={historyId}
                        className="transition-colors hover:bg-slate-50"
                      >
                        {/* Reference */}
                        <td className="px-5 py-3">
                          <div>
                            <p className="text-indigo-600">
                              {log.reference_no ?? "—"}
                            </p>
                          </div>
                        </td>

                        {/* Issue No. */}
                        <td className="px-5 py-3 text-slate-600">
                          {log.issue_no ?? "—"}
                        </td>

                        {/* Equipment Type */}
                        <td className="px-5 py-3">
                          <span className="font-medium text-slate-800">
                            {log.equipment_type ?? "—"}
                          </span>
                        </td>

                        {/* Product */}
                        <td className="px-5 py-3">
                          <div>
                            <p className="text-slate-800">
                              {log.product_name ?? "—"}
                            </p>
                          </div>
                        </td>

                        {/* Brand */}
                        <td className="px-5 py-3 text-slate-600">
                          {log.brand_name ?? "—"}
                        </td>

                        {/* Current Stock */}
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">
                          {log.quantity ?? "—"}
                        </td>

                        {/* Quantity Before Return */}
                        <td className="px-5 py-3 text-right text-slate-600">
                          {log.quantity_before ?? "—"}
                        </td>

                        {/* Quantity Returned */}
                        <td className="px-5 py-3 text-right text-slate-600">
                          {log.return_quantity ??
                            log.quantity_changed ??
                            (log.quantity_before != null &&
                            log.quantity_after != null
                              ? Math.abs(
                                  Number(log.quantity_after) -
                                    Number(log.quantity_before)
                                )
                              : log.quantity_after ?? "—")}
                        </td>

                        {/* Central Warehouse */}
                        <td className="px-5 py-3 text-slate-600">
                          {log.source_location ?? "—"}
                        </td>

                        {/* District */}
                        <td className="px-5 py-3 text-slate-600">
                          {log.destination_location ?? "—"}
                        </td>

                        {/* District User */}
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-medium text-slate-700">
                              {log.district_user_name ?? "—"}
                            </p>
                          </div>
                        </td>

                        {/* Returned By */}
                        <td className="px-5 py-3">
                          <span className="font-medium text-slate-700">
                            {log.returned_by_name ?? log.returned_by ?? "—"}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                          {log.created_at
                            ? new Date(
                                log.created_at
                              ).toLocaleString()
                            : "—"}
                        </td>
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

export default ReturnHistory;