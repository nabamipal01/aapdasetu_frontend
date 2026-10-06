
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getIssueStockEquipmentTypes,
  getIssueStockHistory,
} from "../../../services/IssueStockHistory";
import {
  Search,
  RefreshCw,
  Package,
  ArrowRight,
  MapPin,
  CalendarDays,
  Hash,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";

function IssueStockHistory() {
  const [history, setHistory] = useState([]);
  const [availableEquipmentTypes, setAvailableEquipmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [equipmentTypesError, setEquipmentTypesError] = useState("");

  const [search, setSearch] = useState("");
  const [equipmentType, setEquipmentType] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const fetchHistory = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [historyResult, equipmentResult] = await Promise.allSettled([
        getIssueStockHistory(),
        getIssueStockEquipmentTypes(),
      ]);

      if (historyResult.status === "rejected") {
        throw historyResult.reason;
      }

      const result = historyResult.value;
      if (result?.success === false) {
        throw new Error(
          result.message || "Unable to fetch stock history."
        );
      }

      const historyData = result?.data;
      const historyItems = Array.isArray(historyData)
        ? historyData
        : historyData?.items ?? historyData?.history ?? [];
      setHistory(historyItems);

      if (equipmentResult.status === "fulfilled") {
        const equipmentData = equipmentResult.value?.data;
        const typeItems = Array.isArray(equipmentData)
          ? equipmentData
          : equipmentData?.types ?? equipmentData?.items ?? [];
        setAvailableEquipmentTypes(
          typeItems
            .map((type) =>
              typeof type === "string"
                ? type
                : type?.equipment_type ?? type?.type_name ?? type?.name
            )
            .filter(Boolean)
        );
        setEquipmentTypesError("");
      } else {
        console.error(
          "Equipment type loading error:",
          equipmentResult.reason
        );
        setAvailableEquipmentTypes([]);
        setEquipmentTypesError(
          equipmentResult.reason?.message ||
            "Unable to load equipment types."
        );
      }
    } catch (err) {
      console.error("Stock history error:", err);
      setError(
        err.message || "Something went wrong while loading stock history."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchHistory();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchHistory]);

  const equipmentTypes = useMemo(() => {
    const historyTypes = history
      .map((item) => item.equipment_type ?? item.equipment?.equipment_type)
      .filter(Boolean);

    return [
      "ALL",
      ...new Set([...availableEquipmentTypes, ...historyTypes]),
    ];
  }, [availableEquipmentTypes, history]);

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return history.filter((item) => {
      const itemEquipmentType =
        item.equipment_type ?? item.equipment?.equipment_type;
      const matchesType =
        equipmentType === "ALL" ||
        itemEquipmentType === equipmentType;

      if (!query) return matchesType;

      const searchableText = [
        item.product_name,
        item.brand_name,
        item.oem,
        itemEquipmentType,
        item.reference_no,
        item.source_location,
        item.destination_location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesType && searchableText.includes(query);
    });
  }, [history, search, equipmentType]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredHistory.length / itemsPerPage)
  );

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage]);

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name = "") => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  const totalIssued = useMemo(() => {
    return filteredHistory.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
  }, [filteredHistory]);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <TrendingDown size={19} />
              </span>

              <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Inventory Management
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Issue Stock History
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track issued equipment, stock movement, and inventory changes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchHistory(true)}
            disabled={loading || refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Records
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {history.length}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Stock movement records
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Package size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Issued Quantity
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {totalIssued}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Based on current filters
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <TrendingDown size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Equipment Types
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {equipmentTypes.length - 1}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Available equipment categories
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={21} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search product, brand, reference, location..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {/* Equipment type */}
            <select
              value={equipmentType}
              onChange={(e) => {
                setEquipmentType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 lg:w-52"
            >
              {equipmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "ALL" ? "All Equipment Types" : type}
                </option>
              ))}
            </select>
          </div>

          {(search || equipmentType !== "ALL") && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {filteredHistory.length}
                </span>{" "}
                matching records
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setEquipmentType("ALL");
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {equipmentTypesError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Equipment types could not be loaded: {equipmentTypesError}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />

            <div>
              <p className="font-semibold">Unable to load stock history</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>

              <button
                onClick={() => fetchHistory()}
                className="mt-3 text-sm font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="animate-pulse">
              <div className="h-14 bg-slate-100" />

              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="grid grid-cols-6 gap-4 border-t border-slate-100 p-5"
                >
                  <div className="h-5 rounded bg-slate-100" />
                  <div className="h-5 rounded bg-slate-100" />
                  <div className="h-5 rounded bg-slate-100" />
                  <div className="h-5 rounded bg-slate-100" />
                  <div className="h-5 rounded bg-slate-100" />
                  <div className="h-5 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Desktop Table */}
        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1150px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Equipment
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Reference
                    </th>

                    {/* <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                      Quantity
                    </th> */}

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Stock Movement
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Location
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedHistory.map((item) => (
                    <tr
                      key={item.history_id}
                      className="group transition hover:bg-slate-50/80"
                    >
                      {/* Equipment */}
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600">
                            {getInitials(item.product_name)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold capitalize text-slate-800">
                              {item.product_name || "Unknown Product"}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.brand_name || "—"}
                              {item.oem && ` • ${item.oem}`}
                            </p>

                            <span className="mt-1.5 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                              {item.equipment_type || "N/A"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Reference */}
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2">
                          <Hash size={15} className="text-slate-400" />

                          <div>
                            <p className="font-semibold text-slate-700">
                              {item.reference_no || "—"}
                            </p>

                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      {/* <td className="px-5 py-5 text-center">
                        <span className="inline-flex min-w-12 items-center justify-center rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600">
                          -{item.quantity ?? 0}
                        </span>
                      </td> */}

                      {/* Stock Movement */}
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-600">
                            {item.quantity_before ?? 0}
                          </span>

                          <ArrowRight
                            size={16}
                            className="text-slate-400"
                          />

                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-700">
                            {item.quantity_after ?? 0}
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs text-slate-400">
                          Before → After
                        </p>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-5">
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-xs">
                            <MapPin
                              size={14}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <div>
                              <span className="font-medium text-slate-400">
                                From
                              </span>

                              <p className="font-semibold capitalize text-slate-700">
                                {item.source_location || "—"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 text-xs">
                            <MapPin
                              size={14}
                              className="mt-0.5 shrink-0 text-blue-500"
                            />

                            <div>
                              <span className="font-medium text-slate-400">
                                To
                              </span>

                              <p className="font-semibold text-slate-700">
                                {item.destination_location || "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-5 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
                          <CalendarDays size={14} />
                          {formatDate(
                            item.created_at ||
                              item.issue_date ||
                              item.created_on
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {paginatedHistory.map((item) => (
                <div
                  key={item.history_id}
                  className="p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600">
                        {getInitials(item.product_name)}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-bold capitalize text-slate-800">
                          {item.product_name || "Unknown Product"}
                        </h3>

                        <p className="truncate text-xs text-slate-500">
                          {item.brand_name || "—"}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1.5 text-sm font-bold text-rose-600">
                      -{item.quantity ?? 0}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                      {item.equipment_type || "N/A"}
                    </span>

                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                      {item.reference_no || "No Reference"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Stock Before
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-700">
                        {item.quantity_before ?? 0}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                        Stock After
                      </p>

                      <p className="mt-1 text-lg font-bold text-emerald-700">
                        {item.quantity_after ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin
                        size={15}
                        className="mt-0.5 shrink-0 text-slate-400"
                      />

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          From
                        </p>

                        <p className="text-sm font-semibold capitalize text-slate-700">
                          {item.source_location || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin
                        size={15}
                        className="mt-0.5 shrink-0 text-blue-500"
                      />

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Destination
                        </p>

                        <p className="text-sm font-semibold text-slate-700">
                          {item.destination_location || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <CalendarDays size={14} />

                      {formatDate(
                        item.created_at ||
                          item.issue_date ||
                          item.created_on
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty */}
            {paginatedHistory.length === 0 && (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Package size={25} />
                </div>

                <h3 className="mt-4 font-semibold text-slate-800">
                  No stock history found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing your search or filter.
                </p>
              </div>
            )}

            {/* Pagination */}
            {filteredHistory.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-700">
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredHistory.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredHistory.length}
                  </span>{" "}
                  records
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handlePageChange(currentPage - 1)
                    }
                    disabled={currentPage === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={17} />
                  </button>

                  <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-bold text-white">
                    {currentPage}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handlePageChange(currentPage + 1)
                    }
                    disabled={currentPage === totalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default IssueStockHistory;
