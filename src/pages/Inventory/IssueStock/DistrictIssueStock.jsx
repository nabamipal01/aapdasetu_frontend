import { useCallback, useEffect, useState } from "react";
import { ArrowDownCircle, RefreshCw } from "lucide-react";
import { getAssignedItems } from "../../../services/returnStockService";

function DistrictIssueStock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setItems(await getAssignedItems());
    } catch (err) {
      setItems([]);
      setError(err.message || "Failed to load assigned stock.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <ArrowDownCircle size={25} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Issue Stock
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Stock assigned to your district account.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadItems}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">My Assigned Stock</h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading assigned stock...
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No assigned stock items available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Issue No.</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Equipment</th>
                    <th className="px-4 py-3">Issued Qty.</th>
                    <th className="px-4 py-3">Return Qty.</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr
                      key={`${item.inventory_id}-${item.issue_id}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-medium text-slate-800">
                        {item.issue_no || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">
                          {item.product_name || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.brand_name || ""}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {item.equipment_type || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {item.issued_quantity ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {item.return_quantity ?? "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {String(item.status || "not_returned")
                            .replaceAll("_", " ")
                            .replace(/\b\w/g, (character) => character.toUpperCase())}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default DistrictIssueStock;