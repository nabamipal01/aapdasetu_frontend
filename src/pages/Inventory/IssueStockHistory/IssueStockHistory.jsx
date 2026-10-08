import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getIssueStockEquipmentTypes,
  getIssueStockHistory,
} from "../../../services/IssueStockHistory";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Hash,
  MapPin,
  Package,
  RefreshCw,
  Search,
  TrendingDown,
  X,
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
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
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
                : type?.equipment_type ??
                  type?.type_name ??
                  type?.name
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
        err.message ||
          "Something went wrong while loading stock history."
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
      .map(
        (item) =>
          item.equipment_type ??
          item.equipment?.equipment_type
      )
      .filter(Boolean);

    return [
      "ALL",
      ...new Set([
        ...availableEquipmentTypes,
        ...historyTypes,
      ]),
    ];
  }, [availableEquipmentTypes, history]);

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return history.filter((item) => {
      const itemEquipmentType =
        item.equipment_type ??
        item.equipment?.equipment_type;

      const matchesType =
        equipmentType === "ALL" ||
        itemEquipmentType === equipmentType;

      if (!query) {
        return matchesType;
      }

      const searchableText = [
        item.product_name,
        item.brand_name,
        item.oem,
        itemEquipmentType,
        item.reference_no,
        item.issue_no,
        item.source_location,
        item.destination_location,
        item.district_user_name,
        item.issued_by_name,
        item.issued_by,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesType &&
        searchableText.includes(query)
      );
    });
  }, [history, search, equipmentType]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredHistory.length / itemsPerPage
    )
  );

  const paginatedHistory = useMemo(() => {
    const start =
      (currentPage - 1) * itemsPerPage;

    return filteredHistory.slice(
      start,
      start + itemsPerPage
    );
  }, [filteredHistory, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const totalIssued = useMemo(() => {
    return filteredHistory.reduce(
      (sum, item) => {
        const quantity = Number(
          item.quantity ??
            item.quantity_changed ??
            (item.quantity_before != null &&
            item.quantity_after != null
              ? Math.abs(
                  Number(item.quantity_before) -
                    Number(item.quantity_after)
                )
              : 0)
        );

        return (
          sum +
          (Number.isFinite(quantity)
            ? quantity
            : 0)
        );
      },
      0
    );
  }, [filteredHistory]);

  const uniqueProducts = useMemo(() => {
    return new Set(
      filteredHistory
        .map(
          (item) =>
            item.inventory_id ??
            item.product_id ??
            item.product_name
        )
        .filter(Boolean)
    ).size;
  }, [filteredHistory]);

  const getIssuedQuantity = (item) => {
    if (
      item.quantity != null &&
      item.quantity !== ""
    ) {
      return item.quantity;
    }

    if (
      item.quantity_changed != null &&
      item.quantity_changed !== ""
    ) {
      return Math.abs(
        Number(item.quantity_changed)
      );
    }

    if (
      item.quantity_before != null &&
      item.quantity_after != null
    ) {
      return Math.abs(
        Number(item.quantity_before) -
          Number(item.quantity_after)
      );
    }

    return 0;
  };

  const getInitials = (name = "") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (
      Number.isNaN(parsedDate.getTime())
    ) {
      return date;
    }

    return parsedDate.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) {
      return;
    }

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

              <span className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                Inventory Management
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Issue Stock History
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track issued equipment, quantities, and inventory changes.
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
              className={
                refreshing ? "animate-spin" : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Total Records */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Records
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {filteredHistory.length}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Based on current filters
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Package size={21} />
              </div>
            </div>
          </div>

          {/* Issued Quantity */}
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
                  Total units issued
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <TrendingDown size={21} />
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Products Issued
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
                placeholder="Search product, reference, location, or user..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Equipment Type */}
            <select
              value={equipmentType}
              onChange={(e) => {
                setEquipmentType(
                  e.target.value
                );
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 lg:w-64"
            >
              {equipmentTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type === "ALL"
                    ? "All Equipment Types"
                    : type}
                </option>
              ))}
            </select>
          </div>

          {(search ||
            equipmentType !== "ALL") && (
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
                className="text-xs font-semibold text-blue-700 hover:text-blue-800"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Equipment Types Warning */}
        {equipmentTypesError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Equipment types could not be loaded:{" "}
            {equipmentTypesError}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Unable to load stock history
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  fetchHistory()
                }
                className="mt-3 text-sm font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Main History Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">
                Issue History Entries
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {!loading
                  ? `${filteredHistory.length} records`
                  : "Loading records"}
              </p>
            </div>

            <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              Issues
            </span>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="animate-pulse">
              <div className="h-14 bg-slate-100" />

              {[1, 2, 3, 4, 5].map(
                (item) => (
                  <div
                    key={item}
                    className="grid grid-cols-5 gap-4 border-t border-slate-100 p-5"
                  >
                    <div className="h-5 rounded bg-slate-100" />
                    <div className="h-5 rounded bg-slate-100" />
                    <div className="h-5 rounded bg-slate-100" />
                    <div className="h-5 rounded bg-slate-100" />
                    <div className="h-5 rounded bg-slate-100" />
                  </div>
                )
              )}
            </div>
          ) : filteredHistory.length === 0 ? (
            /* Empty */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search
                size={40}
                className="mb-3 text-slate-300"
              />

              <p className="font-medium text-slate-700">
                No matching issue history records
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Try a different search term or clear your filters.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1700px]">

                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Issue No.
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Equipment Type
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Product
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Brand
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Before Issue
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Current Stock
                      </th>

                      

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Qty Issued
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Source Location
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Destination Location
                      </th>
{/* 
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Issued By
                      </th> */}

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Date
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {paginatedHistory.map(
                      (item) => {
                        const historyId =
                          item.history_id ??
                          item.id ??
                          `${item.reference_no}-${item.created_at}`;

                        const issuedQuantity =
                          getIssuedQuantity(item);

                        return (
                          <tr
                            key={historyId}
                            className="group transition hover:bg-slate-50/80"
                          >

                            {/* Issue No */}
                            <td className="px-5 py-5 font-semibold text-blue-700">
                              {item.reference_no ??
                                item.issue_no ??
                                "—"}
                            </td>

                            {/* Equipment Type */}
                            <td className="px-5 py-5">
                              <span className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                                {item.equipment_type ??
                                  item.equipment
                                    ?.equipment_type ??
                                  "N/A"}
                              </span>
                            </td>

                            {/* Product */}
                            <td className="px-5 py-5 font-semibold text-slate-800">
                              {item.product_name ??
                                "—"}
                            </td>

                            {/* Brand */}
                            <td className="px-5 py-5 text-slate-600">
                              {item.brand_name ??
                                "—"}

                              {item.oem && (
                                <span className="block text-xs text-slate-400">
                                  {item.oem}
                                </span>
                              )}
                            </td>


                            {/* Before Issue */}
                            <td className="px-5 py-5 text-right text-slate-600">
                              {item.quantity_before ??
                                "—"}
                            </td>

                            {/* Current Stock */}
                            <td className="px-5 py-5 text-right font-semibold text-slate-800">
                              {item.quantity_after ??
                                item.quantity ??
                                "—"}
                            </td>

                            

                            {/* Qty Issued */}
                            <td className="px-5 py-5 text-right">
                              <span className="inline-flex min-w-12 items-center justify-center rounded-lg bg-rose-50 px-3 py-2 font-bold text-rose-600">
                                {issuedQuantity != null
                                  ? `${issuedQuantity}`
                                  : "—"}
                              </span>
                            </td>

                            {/* Source */}
                            <td className="px-5 py-5 text-slate-600">
                              {item.source_location ??
                                "—"}
                            </td>

                            {/* Destination */}
                            <td className="px-5 py-5 text-slate-600">
                              {item.destination_location ??
                                "—"}
                            </td>

                            {/* Issued By
                            <td className="px-5 py-5 font-medium text-slate-700">
                              {item.issued_by_name ??
                                item.issued_by ??
                                item.district_user_name ??
                                "—"}
                            </td> */}

                            {/* Date */}
                            <td className="whitespace-nowrap px-5 py-5 text-right text-xs text-slate-500">
                              {formatDate(
                                item.created_at ??
                                  item.issue_date ??
                                  item.created_on
                              )}
                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="divide-y divide-slate-100 lg:hidden">

                {paginatedHistory.map(
                  (item) => {
                    const historyId =
                      item.history_id ??
                      item.id ??
                      `${item.reference_no}-${item.created_at}`;

                    const issuedQuantity =
                      getIssuedQuantity(item);

                    return (
                      <article
                        key={historyId}
                        className="p-4 sm:p-5"
                      >

                        {/* Product Header */}
                        <div className="flex items-start justify-between gap-3">

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                              {getInitials(
                                item.product_name
                              )}
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate font-bold capitalize text-slate-800">
                                {item.product_name ||
                                  "Unknown Product"}
                              </h3>

                              <p className="truncate text-xs text-slate-500">
                                {item.brand_name ||
                                  "—"}
                              </p>
                            </div>

                          </div>

                          <span className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1.5 text-sm font-bold text-rose-600">
                            -
                            {issuedQuantity ?? 0}
                          </span>

                        </div>

                        {/* Tags */}
                        <div className="mt-4 flex flex-wrap gap-2">

                          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                            {item.equipment_type ??
                              item.equipment
                                ?.equipment_type ??
                              "N/A"}
                          </span>

                          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                            Issue{" "}
                            {item.reference_no ??
                              item.issue_no ??
                              "—"}
                          </span>

                        </div>

                        {/* Stock */}
                        <div className="mt-4 grid grid-cols-2 gap-3">

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Stock Before
                            </p>

                            <p className="mt-1 text-lg font-bold text-slate-700">
                              {item.quantity_before ??
                                0}
                            </p>
                          </div>

                          <div className="rounded-xl bg-blue-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                              Current Stock
                            </p>

                            <p className="mt-1 text-lg font-bold text-blue-700">
                              {item.quantity_after ??
                                item.quantity ??
                                0}
                            </p>
                          </div>

                        </div>

                        {/* Locations */}
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                          <div className="rounded-xl bg-slate-50 p-3">

                            <div className="flex items-start gap-2">
                              <MapPin
                                size={15}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />

                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Source Location
                                </p>

                                <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                  {item.source_location ||
                                    "—"}
                                </p>
                              </div>
                            </div>

                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">

                            <div className="flex items-start gap-2">
                              <MapPin
                                size={15}
                                className="mt-0.5 shrink-0 text-blue-500"
                              />

                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Destination Location
                                </p>

                                <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                  {item.destination_location ||
                                    "—"}
                                </p>
                              </div>
                            </div>

                          </div>
{/* 
                          <div className="rounded-xl bg-slate-50 p-3">

                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Issued By
                            </p>

                            <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                              {item.issued_by_name ??
                                item.issued_by ??
                                item.district_user_name ??
                                "—"}
                            </p>

                          </div> */}

                          <div className="rounded-xl bg-slate-50 p-3">

                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Brand / OEM
                            </p>

                            <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                              {item.brand_name ||
                                "—"}

                              {item.oem && (
                                <span className="block text-xs font-normal text-slate-400">
                                  {item.oem}
                                </span>
                              )}
                            </p>

                          </div>

                        </div>

                        {/* Date */}
                        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">

                          <CalendarDays
                            size={14}
                          />

                          <span className="font-medium text-slate-400">
                            Date
                          </span>

                          {formatDate(
                            item.created_at ??
                              item.issue_date ??
                              item.created_on
                          )}

                        </div>

                      </article>
                    );
                  }
                )}

              </div>

              {/* Pagination */}
              {filteredHistory.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">

                  <p className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {(currentPage - 1) *
                        itemsPerPage +
                        1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-700">
                      {Math.min(
                        currentPage *
                          itemsPerPage,
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
                        handlePageChange(
                          currentPage - 1
                        )
                      }
                      disabled={
                        currentPage === 1
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft
                        size={17}
                      />
                    </button>

                    <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-bold text-white">
                      {currentPage}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handlePageChange(
                          currentPage + 1
                        )
                      }
                      disabled={
                        currentPage ===
                        totalPages
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight
                        size={17}
                      />
                    </button>

                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default IssueStockHistory;