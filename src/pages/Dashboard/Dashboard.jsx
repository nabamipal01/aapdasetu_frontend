import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Package,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  MapPin,
  Search,
  ChevronRight,
  Activity,
} from "lucide-react";
import {
  listIncidents,
  listTasks,
  listVolunteers,
  getInventoryOverview,
  getInventoryChartData,
} from "../../services";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { MapContainer } from "react-leaflet";
import RainfallForecastLayer from "../../components/map/RainfallForecastLayer";
import WestBengalBasemap from "../../components/map/WestBengalBasemap";
import FitWestBengalBounds from "../../components/map/FitWestBengalBounds";
import EsriWorldImageryBasemap from "../../components/map/EsriWorldImageryBasemap";
import ImdAlertsLayer from "../../components/map/IMDAlertsLayer";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const HISTORICAL_FLOOD_EVENTS = [
  { layer: "wb_020711_flood", date: "Jul 2, 2011" },
  { layer: "wb_120811_flood", date: "Aug 12, 2011" },
  { layer: "wb_160811_flood", date: "Aug 16, 2011" },
  { layer: "wb_240811_flood", date: "Aug 24, 2011" },
  { layer: "wb_150713_flood", date: "Jul 15, 2013" },
  { layer: "wb_170713_flood", date: "Jul 17, 2013" },
  { layer: "wb_131013_flood", date: "Oct 13, 2013" },
  { layer: "wb_281013_flood", date: "Oct 28, 2013" },
];

const SEVERITY_STYLES = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  high: "bg-orange-50 text-orange-700 ring-orange-600/20",
  critical: "bg-red-50 text-red-700 ring-red-600/20",
};

const STATUS_STYLES = {
  reported: "bg-blue-50 text-blue-700 ring-blue-600/20",
  acknowledged: "bg-violet-50 text-violet-700 ring-violet-600/20",
  in_progress: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  closed: "bg-slate-100 text-slate-600 ring-slate-500/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  assigned: "bg-blue-50 text-blue-700 ring-blue-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-500/20",
};

/* ------------------------------------------------------------------ */
/*  UI primitives                                                      */
/* ------------------------------------------------------------------ */

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-3.5 py-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
            <Icon size={14} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold leading-tight text-slate-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
      {Icon && <Icon size={22} className="text-slate-300" />}
      <p className="text-xs font-medium text-slate-600">{title}</p>
      {description && (
        <p className="max-w-[220px] text-[11px] text-slate-400">{description}</p>
      )}
    </div>
  );
}

function Skeleton({ lines = 3 }) {
  return (
    <div className="space-y-2 px-3.5 py-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-7 animate-pulse rounded-md bg-slate-100"
          style={{ width: `${100 - i * 8}%` }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI strip                                                          */
/* ------------------------------------------------------------------ */

function KpiItem({ label, value, loading, icon: Icon, tone, trend }) {
  const tones = {
    orange: "bg-orange-50 text-orange-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    sky: "bg-sky-50 text-sky-600",
    teal: "bg-teal-50 text-teal-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
      >
        <Icon size={15} strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <p
            className={`text-base font-bold tabular-nums leading-tight ${
              loading ? "animate-pulse text-slate-300" : "text-slate-900"
            }`}
          >
            {loading ? "—" : value.toLocaleString("en-IN")}
          </p>
          {trend != null && !loading && (
            <span
              className={`flex items-center gap-0.5 text-[10px] font-medium ${
                trend >= 0 ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp size={10} />
              ) : (
                <TrendingDown size={10} />
              )}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [stats, setStats] = useState({
    incidents: 0,
    resolved: 0,
    pendingTasks: 0,
    volunteers: 0,
    totalProducts: 0,
    totalQuantity: 0,
  });
  const [incidents, setIncidents] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [inventoryCategories, setInventoryCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [pointWeather, setPointWeather] = useState(null);
  const [districtLayerError, setDistrictLayerError] = useState("");
  const [basemapError, setBasemapError] = useState("");
  const [historicalLayerError, setHistoricalLayerError] = useState("");
  const [imdStatus, setImdStatus] = useState({
    loading: false,
    error: "",
    counts: null,
    updatedAt: "",
  });
  const [mapMode, setMapMode] = useState("rainfall");
  const [historicalEventLayer, setHistoricalEventLayer] = useState(
    HISTORICAL_FLOOD_EVENTS[0].layer
  );
  const [rainfallStatus, setRainfallStatus] = useState({
    loading: false,
    error: "",
    updatedAt: "",
    rainfallByDistrict: {},
  });
  const [inventoryChartData, setInventoryChartData] = useState([]);
  const [inventoryChartLoading, setInventoryChartLoading] = useState(true);
  const [inventoryChartError, setInventoryChartError] = useState("");
  const [selectedInventoryDistrict, setSelectedInventoryDistrict] =
    useState("all");
  const [rainfallDate, setRainfallDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [activityTab, setActivityTab] = useState("incidents");

  /* -------------------------------------------------------------- */
  /*  Data loading                                                   */
  /* -------------------------------------------------------------- */

  const loadDashboard = async () => {
    setError("");
    try {
      const [
        incidentResponse,
        taskResponse,
        volunteerResponse,
        inventoryResponse,
        chartResponse,
      ] = await Promise.allSettled([
        listIncidents({ page: 1, per_page: 100 }),
        listTasks({ page: 1, per_page: 100 }),
        listVolunteers({ status: "active", page: 1, per_page: 1 }),
        getInventoryOverview(),
        getInventoryChartData(),
      ]);

      /* --- inventory chart --- */
      const chartPayload =
        chartResponse.status === "fulfilled"
          ? chartResponse.value?.data?.data?.chart_data ??
            chartResponse.value?.data?.chart_data ??
            chartResponse.value?.chart_data ??
            []
          : [];

      if (chartResponse.status === "fulfilled") {
        const normalizedData = Array.isArray(chartPayload)
          ? chartPayload
              .filter((item) => item && typeof item === "object")
              .map((item) => {
                const districtName = String(item.district_name ?? "").trim();
                const safeDistrictName =
                  !districtName || districtName.toLowerCase() === "null"
                    ? "Unmapped District"
                    : districtName;
                const productName = item.product_name || "Unnamed Product";
                return {
                  ...item,
                  district_name: safeDistrictName,
                  product_name: productName,
                  storage_location:
                    item.storage_location || "Not specified",
                  equipment_type: item.equipment_type || "Not specified",
                  current_quantity: Number(item.current_quantity) || 0,
                  chartLabel: `${safeDistrictName} — ${productName}`,
                };
              })
          : [];
        setInventoryChartData(normalizedData);
        setInventoryChartError("");
      } else {
        setInventoryChartData([]);
        setInventoryChartError(
          chartResponse.reason?.message ||
            "Unable to load district-wise inventory data."
        );
      }

      /* --- incidents --- */
      const incidentList =
        incidentResponse.status === "fulfilled"
          ? incidentResponse.value?.data?.incidents ??
            incidentResponse.value?.data?.items ??
            incidentResponse.value?.data ??
            []
          : [];

      /* --- tasks --- */
      const taskList =
        taskResponse.status === "fulfilled"
          ? taskResponse.value?.data?.tasks ??
            taskResponse.value?.data?.items ??
            taskResponse.value?.data ??
            []
          : [];

      /* --- volunteers --- */
      const volunteerTotal =
        volunteerResponse.status === "fulfilled"
          ? volunteerResponse.value?.data?.pagination?.total ??
            volunteerResponse.value?.data?.total ??
            volunteerResponse.value?.data?.volunteers?.length ??
            volunteerResponse.value?.data?.length ??
            0
          : 0;

      /* --- inventory summary --- */
      const inventorySummary =
        inventoryResponse.status === "fulfilled"
          ? inventoryResponse.value?.data?.summary ?? {}
          : {};
      const equipmentWise =
        inventoryResponse.status === "fulfilled"
          ? inventoryResponse.value?.data?.equipment_wise ?? []
          : [];

      const resolvedIncidents = incidentList.filter(
        (i) => i.status === "resolved" || i.status === "closed"
      );
      const pendingTasks = taskList.filter(
        (t) => t.status === "pending" || t.status === "assigned"
      );

      setStats({
        incidents: incidentList.length,
        resolved: resolvedIncidents.length,
        pendingTasks: pendingTasks.length,
        volunteers: volunteerTotal,
        totalProducts: Number(inventorySummary.total_product) || 0,
        totalQuantity: Number(inventorySummary.total_quantity) || 0,
      });

      setIncidents(incidentList);
      setRecentIncidents(
        [...incidentList]
          .sort((a, b) => {
            const da = new Date(a.created_at || a.reported_at || 0);
            const db = new Date(b.created_at || b.reported_at || 0);
            return db - da;
          })
          .slice(0, 5)
      );
      setRecentTasks(
        [...taskList]
          .sort((a, b) => {
            const da = new Date(a.created_at || a.updated_at || 0);
            const db = new Date(b.created_at || b.updated_at || 0);
            return db - da;
          })
          .slice(0, 5)
      );
      setInventoryCategories(equipmentWise);
    } catch (err) {
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setInventoryChartLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      setLoading(true);
      await loadDashboard();
      if (mounted) setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  };

  /* -------------------------------------------------------------- */
  /*  Derived data                                                   */
  /* -------------------------------------------------------------- */

  const incidentTrendData = useMemo(() => {
    const grouped = {};
    incidents.forEach((incident) => {
      const rawDate =
        incident.created_at ||
        incident.reported_at ||
        incident.date ||
        incident.incident_date;
      if (!rawDate) return;
      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      if (!grouped[key]) grouped[key] = { date: key, reported: 0, resolved: 0 };
      grouped[key].reported += 1;
      if (incident.status === "resolved" || incident.status === "closed") {
        grouped[key].resolved += 1;
      }
    });
    return Object.values(grouped)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-14)
      .map((item) => ({
        ...item,
        displayDate: new Date(item.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
      }));
  }, [incidents]);

  const selectedDistrictRainfall =
    selectedDistrict?.dist_lgd == null
      ? selectedDistrict?.precipitationMm
      : rainfallStatus.rainfallByDistrict[String(selectedDistrict.dist_lgd)] ??
        selectedDistrict.precipitationMm;

  const inventoryDistrictOptions = useMemo(
    () =>
      [
        ...new Set(
          inventoryChartData.map(
            (item) => item.district_name || "Unmapped District"
          )
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [inventoryChartData]
  );

  const filteredInventoryChartData = useMemo(() => {
    const filtered =
      selectedInventoryDistrict === "all"
        ? inventoryChartData
        : inventoryChartData.filter(
            (item) =>
              (item.district_name || "Unmapped District") ===
              selectedInventoryDistrict
          );
    return [...filtered].sort(
      (a, b) => b.current_quantity - a.current_quantity
    );
  }, [inventoryChartData, selectedInventoryDistrict]);

  const totalInventoryQuantity = useMemo(
    () =>
      filteredInventoryChartData.reduce(
        (sum, item) => sum + item.current_quantity,
        0
      ),
    [filteredInventoryChartData]
  );

  const mapTitle = useMemo(() => {
    if (mapMode === "rainfall") {
      const today = new Date().toISOString().slice(0, 10);
      if (rainfallDate === today) return "West Bengal Rainfall Forecast";
      return `West Bengal Rainfall — ${new Date(
        rainfallDate + "T00:00:00"
      ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;
    }
    if (mapMode === "historical")
      return "West Bengal Historical Flood Inundation";
    return "West Bengal Satellite Basemap";
  }, [mapMode, rainfallDate]);

  /* -------------------------------------------------------------- */
  /*  Render                                                         */
  /* -------------------------------------------------------------- */

  return (
    <div className="bg-slate-50/80">
      <div className="mx-auto max-w-[1280px] px-3 py-3 sm:px-4 sm:py-4">
        {/* ============================================================
            HEADER
        ============================================================ */}
        <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-600" />
              </span>
              Live operations
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Dashboard
            </h1>
            <p className="mt-0.5 max-w-xl text-[12px] leading-snug text-slate-500">
              Real-time overview of incidents, tasks, inventory and field
              response across West Bengal
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ============================================================
            KPI STRIP
        ============================================================ */}
        <Card className="mb-3 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
            <KpiItem
              label="Incidents"
              value={stats.incidents}
              loading={loading}
              icon={AlertTriangle}
              tone="orange"
            />
            <KpiItem
              label="Resolved"
              value={stats.resolved}
              loading={loading}
              icon={CheckCircle2}
              tone="emerald"
            />
            <KpiItem
              label="Pending tasks"
              value={stats.pendingTasks}
              loading={loading}
              icon={Clock}
              tone="indigo"
            />
            <KpiItem
              label="Volunteers"
              value={stats.volunteers}
              loading={loading}
              icon={Users}
              tone="sky"
            />
            <KpiItem
              label="Products"
              value={stats.totalProducts}
              loading={loading}
              icon={Package}
              tone="teal"
            />
            <KpiItem
              label="Quantity"
              value={stats.totalQuantity}
              loading={loading}
              icon={Package}
              tone="violet"
            />
          </div>
        </Card>

        {/* ============================================================
            MAIN GRID — 2 columns on xl, stacked on smaller
        ============================================================ */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-4">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-3 xl:gap-4">
            {/* ------------- Inventory distribution ------------- */}
            <Card>
              <SectionHeader
                icon={Package}
                title="District-wise Inventory Distribution"
                subtitle="Current stock by district, product and storage location"
                action={
                  <select
                    value={selectedInventoryDistrict}
                    onChange={(e) =>
                      setSelectedInventoryDistrict(e.target.value)
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All districts</option>
                    {inventoryDistrictOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                }
              />

              {inventoryChartLoading ? (
                <Skeleton lines={5} />
              ) : inventoryChartError ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="Failed to load inventory"
                  description={inventoryChartError}
                />
              ) : filteredInventoryChartData.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No inventory records"
                  description={
                    inventoryChartData.length === 0
                      ? "No inventory chart data available."
                      : "No records found for this district."
                  }
                />
              ) : (
                <>
                  <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                    <div className="px-3 py-2">
                      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                        Records
                      </p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
                        {filteredInventoryChartData.length}
                      </p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                        Total quantity
                      </p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
                        {totalInventoryQuantity.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                        Districts
                      </p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
                        {selectedInventoryDistrict === "all"
                          ? inventoryDistrictOptions.length
                          : 1}
                      </p>
                    </div>
                  </div>

                  <div className="h-[240px] p-2.5 sm:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={filteredInventoryChartData.slice(0, 12)}
                        margin={{ top: 8, right: 30, left: 8, bottom: 8 }}
                        barCategoryGap="28%"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="chartLabel"
                          width={210}
                          interval={0}
                          tick={{ fontSize: 11, fill: "#334155" }}
                          tickFormatter={(v) =>
                            v.length > 30 ? `${v.slice(0, 27)}…` : v
                          }
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "#f1f5f9" }}
                          content={(props) => {
                            const item = props.payload?.[0]?.payload;
                            if (!props.active || !item) return null;
                            return (
                              <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
                                <p className="mb-2 font-semibold text-slate-900">
                                  {item.product_name}
                                </p>
                                <p className="text-slate-600">
                                  <span className="font-medium">District:</span>{" "}
                                  {item.district_name}
                                </p>
                                <p className="text-slate-600">
                                  <span className="font-medium">Storage:</span>{" "}
                                  {item.storage_location}
                                </p>
                                <p className="text-slate-600">
                                  <span className="font-medium">Type:</span>{" "}
                                  {item.equipment_type}
                                </p>
                                <p className="mt-1 font-semibold text-teal-700">
                                  Quantity: {item.current_quantity}
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Bar
                          dataKey="current_quantity"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={22}
                          isAnimationActive={false}
                        >
                          {filteredInventoryChartData
                            .slice(0, 12)
                            .map((item, index) => (
                              <Cell
                                key={`${item.inventory_id}-${index}`}
                                fill={
                                  item.district_id == null
                                    ? "#94a3b8"
                                    : "#0d9488"
                                }
                              />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
                    <p className="text-[11px] text-slate-500">
                      {filteredInventoryChartData.length > 12
                        ? `Showing top 12 of ${filteredInventoryChartData.length} records`
                        : `Showing ${filteredInventoryChartData.length} records`}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" />
                      Mapped
                      <span className="ml-2 h-2.5 w-2.5 rounded-sm bg-slate-400" />
                      Unmapped
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* ------------- Incident trend ------------- */}
            <Card>
              <SectionHeader
                icon={Activity}
                title="Incident Trend"
                subtitle="Reported vs resolved over the last 14 active days"
              />
              <div className="h-[220px] p-2.5 sm:h-[240px]">
                {incidentTrendData.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No trend data"
                    description="No incidents recorded in the recent period."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={incidentTrendData}
                      margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          fontSize: 12,
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        iconType="circle"
                      />
                      <Line
                        type="monotone"
                        dataKey="reported"
                        name="Reported"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="resolved"
                        name="Resolved"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-3 xl:gap-4">
            <Card className="">
              <SectionHeader
                icon={Package}
                title="By Equipment Category"
                subtitle="Quantity available by equipment type"
              />
              <div className="h-[200px] p-2.5 sm:h-[220px]">
                {inventoryCategories.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No inventory data"
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={inventoryCategories}
                      margin={{ top: 8, right: 8, left: -20, bottom: 32 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="equipment_type"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          fontSize: 12,
                        }}
                        formatter={(v) => [v, "Quantity"]}
                      />
                      <Bar
                        dataKey="total_quantity"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden flex-1 min-h-0">
              <div className="border-b border-slate-100 px-3.5 pt-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-[13px] font-semibold text-slate-900">
                    Recent Activity
                  </h2>
                  <a
                    href={
                      activityTab === "incidents" ? "/incident" : "/task"
                    }
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:underline"
                  >
                    View all <ChevronRight size={12} />
                  </a>
                </div>
                <div className="mt-2 flex gap-1 border-b border-slate-100 -mb-px">
                  {[
                    { id: "incidents", label: "Incidents", icon: AlertTriangle },
                    { id: "tasks", label: "Tasks", icon: ClipboardList },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActivityTab(id)}
                      className={`flex items-center gap-1.5 border-b-2 px-2.5 py-1.5 text-[11px] font-medium transition ${
                        activityTab === id
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {activityTab === "incidents" ? (
                loading ? (
                  <Skeleton lines={5} />
                ) : recentIncidents.length === 0 ? (
                  <EmptyState
                    icon={AlertTriangle}
                    title="No incidents yet"
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {recentIncidents.map((incident) => (
                      <li
                        key={incident.id}
                        className="flex items-start justify-between gap-3 px-3.5 py-2 transition hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-800">
                            {incident.title || "Untitled Incident"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {incident.incident_no || "—"} ·{" "}
                            {incident.incident_type || "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge
                            className={
                              SEVERITY_STYLES[incident.severity] ??
                              "bg-slate-100 text-slate-600 ring-slate-500/20"
                            }
                          >
                            {incident.severity || "—"}
                          </Badge>
                          <Badge
                            className={
                              STATUS_STYLES[incident.status] ??
                              "bg-slate-100 text-slate-600 ring-slate-500/20"
                            }
                          >
                            {incident.status || "—"}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : loading ? (
                <Skeleton lines={5} />
              ) : recentTasks.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No tasks yet" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start justify-between gap-3 px-3.5 py-2 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-slate-800">
                          {task.title || "Untitled Task"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Incident #{task.incident_id ?? "—"}
                        </p>
                      </div>
                      <Badge
                        className={
                          STATUS_STYLES[task.status] ??
                          "bg-slate-100 text-slate-600 ring-slate-500/20"
                        }
                      >
                        {task.status || "—"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

            {/* ------------- Map (full width) ------------- */}
            <Card className="overflow-hidden xl:col-span-2">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-3.5 py-2.5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <MapPin size={14} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[13px] font-semibold leading-tight text-slate-900">
                      {mapTitle}
                    </h2>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {mapMode === "rainfall"
                        ? "Forecast precipitation by district, accumulated in millimetres."
                        : mapMode === "historical"
                        ? `Bhuvan satellite-derived inundation snapshot for ${
                            HISTORICAL_FLOOD_EVENTS.find(
                              ({ layer }) => layer === historicalEventLayer
                            )?.date
                          }.`
                        : "Esri World Imagery satellite imagery is used as the base map."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={mapMode}
                    onChange={(e) => {
                      setMapMode(e.target.value);
                      setHistoricalLayerError("");
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="rainfall">Next 24h rainfall</option>
                    <option value="historical">
                      Historical inundation
                    </option>
                    <option value="satellite-alerts">Satellite</option>
                  </select>

                  {mapMode === "rainfall" && (
                    <input
                      type="date"
                      value={rainfallDate}
                      max={new Date().toISOString().slice(0, 10)}
                      min="1940-01-01"
                      onChange={(e) => setRainfallDate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  )}

                  {mapMode === "historical" && (
                    <select
                      value={historicalEventLayer}
                      onChange={(e) => {
                        setHistoricalEventLayer(e.target.value);
                        setHistoricalLayerError("");
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      {HISTORICAL_FLOOD_EVENTS.map(({ layer, date }) => (
                        <option key={layer} value={layer}>
                          {date}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px]">
                <div className="h-[380px] w-full sm:h-[420px]">
                  <MapContainer
                    center={[24.2726, 88.1]}
                    zoom={7}
                    minZoom={2}
                    maxZoom={12}
                    scrollWheelZoom
                    maxBounds={[
                      [21.45, 84.75],
                      [27.25, 89.9],
                    ]}
                    maxBoundsViscosity={1}
                    className="dashboard-map h-full w-full"
                    style={{ background: "#f1f5f9" }}
                  >
                    <FitWestBengalBounds
                      satellite={mapMode === "satellite-alerts"}
                    />
                    <RainfallForecastLayer
                      mapMode={mapMode}
                      historicalEventLayer={historicalEventLayer}
                      rainfallDate={rainfallDate}
                      selectedDistrict={selectedDistrict}
                      onDistrictSelect={setSelectedDistrict}
                      onDistrictError={setDistrictLayerError}
                      onForecastStatus={setRainfallStatus}
                      onHistoricalLayerError={setHistoricalLayerError}
                      onPointWeatherChange={setPointWeather}
                    />
                    {mapMode === "satellite-alerts" ? (
                      <>
                        <EsriWorldImageryBasemap
                          onMapError={setBasemapError}
                        />
                        <ImdAlertsLayer onStatus={setImdStatus} />
                      </>
                    ) : (
                      <WestBengalBasemap onMapError={setBasemapError} />
                    )}
                  </MapContainer>
                </div>

                {/* Legend panel */}
                <aside className="border-t border-slate-100 bg-slate-50/60 p-3 lg:border-l lg:border-t-0">
                  {mapMode === "rainfall" ? (
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Intensity
                      </p>
                      {[
                        {
                          color: "#f1f5f9",
                          label: "0 mm",
                          detail: "No rain",
                        },
                        {
                          color: "#bfdbfe",
                          label: "0–2 mm",
                          detail: "Light",
                        },
                        {
                          color: "#60a5fa",
                          label: "2–10 mm",
                          detail: "Moderate",
                        },
                        {
                          color: "#facc15",
                          label: "10–25 mm",
                          detail: "Heavy",
                        },
                        {
                          color: "#ef4444",
                          label: "25+ mm",
                          detail: "Very heavy",
                        },
                      ].map(({ color, label, detail }) => (
                        <div
                          key={label}
                          className="flex items-center gap-2.5"
                        >
                          <span
                            className="h-3.5 w-6 shrink-0 rounded border border-slate-300"
                            style={{ backgroundColor: color }}
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-slate-700">
                              {label}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : mapMode === "historical" ? (
                    <p className="text-[11px] leading-5 text-slate-600">
                      The WMS serves its own inundation imagery; no numeric
                      severity scale is published. These snapshots are not
                      current flood warnings.
                    </p>
                  ) : (
                    <div className="space-y-2 text-[11px] leading-5 text-slate-600">
                      <p>
                        Satellite imagery provides geographic context. IMD
                        warning and cyclone overlays are shown when available.
                      </p>
                    </div>
                  )}

                  {/* Weather */}
                  {mapMode === "rainfall" && pointWeather?.location && (
                    <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3">
                      <p className="text-[11px] font-semibold text-slate-800">
                        Weather at point
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {pointWeather.location.lat.toFixed(4)},{" "}
                        {pointWeather.location.lng.toFixed(4)}
                      </p>
                      {pointWeather.loading && (
                        <p className="mt-2 text-[11px] text-blue-700">
                          Loading…
                        </p>
                      )}
                      {pointWeather.error && (
                        <p className="mt-2 text-[11px] text-red-700">
                          {pointWeather.error}
                        </p>
                      )}
                      {pointWeather.weather?.current && (
                        <div className="mt-2 space-y-0.5 text-[11px] text-slate-600">
                          {[
                            ["Temp", "temperature_2m"],
                            ["Precip.", "precipitation"],
                            ["Cloud", "cloud_cover"],
                            ["Wind", "wind_speed_10m"],
                          ].map(([label, key]) => {
                            const v = pointWeather.weather.current[key];
                            const u =
                              pointWeather.weather.current_units[key];
                            return (
                              <p key={key}>
                                {label}: {v ?? "—"}
                                {v != null && u ? ` ${u}` : ""}
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status */}
                  <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-[11px]">
                    {mapMode === "rainfall" &&
                      rainfallStatus.loading && (
                        <p className="text-blue-700">Loading forecasts…</p>
                      )}
                    {mapMode === "rainfall" &&
                      rainfallStatus.updatedAt &&
                      !rainfallStatus.error && (
                        <p className="text-slate-500">
                          Updated{" "}
                          {new Date(
                            rainfallStatus.updatedAt
                          ).toLocaleTimeString()}
                        </p>
                      )}
                    {districtLayerError && (
                      <p className="text-red-700">{districtLayerError}</p>
                    )}
                    {basemapError && (
                      <p className="text-amber-700">{basemapError}</p>
                    )}
                    {mapMode === "rainfall" && rainfallStatus.error && (
                      <p className="text-red-700">{rainfallStatus.error}</p>
                    )}
                    {mapMode === "historical" &&
                      historicalLayerError && (
                        <p className="text-red-700">
                          {historicalLayerError}
                        </p>
                      )}
                    {mapMode === "satellite-alerts" &&
                      imdStatus.loading && (
                        <p className="text-blue-700">Loading IMD…</p>
                      )}
                  </div>
                </aside>
              </div>

              {selectedDistrict && (
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Selected district
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">
                      {selectedDistrict.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[10px] text-slate-400">LGD ID</p>
                      <p className="text-sm font-medium text-slate-700">
                        {selectedDistrict.dist_lgd}
                      </p>
                    </div>
                    {mapMode === "rainfall" && (
                      <div>
                        <p className="text-[10px] text-slate-400">
                          24h forecast
                        </p>
                        <p className="text-sm font-semibold text-blue-700">
                          {Number.isFinite(selectedDistrictRainfall)
                            ? `${selectedDistrictRainfall.toFixed(1)} mm`
                            : "Loading…"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
        </div>
      </div>
    </div>
  );
}
