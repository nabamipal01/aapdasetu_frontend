import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Package,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  listIncidents,
  listTasks,
  listVolunteers,
  getInventoryOverview,
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
} from "recharts";
import L from "leaflet";
import { MapContainer } from "react-leaflet";
import FloodRasterLayer from "../../components/map/FloodRasterLayer";
import RainfallForecastLayer from "../../components/map/RainfallForecastLayer";

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

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  loading,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-3xl font-bold ${
              loading
                ? "animate-pulse text-slate-300"
                : "text-slate-900"
            }`}
          >
            {loading ? "—" : value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );
}


// ============================================================
// DASHBOARD
// ============================================================

function Dashboard() {
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
  const [districtLayerError, setDistrictLayerError] = useState("");
  const [historicalLayerError, setHistoricalLayerError] = useState("");
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

  // ==========================================================
  // LOAD DASHBOARD DATA
  // ==========================================================

  const loadDashboard = async () => {
    setError("");

    try {
      const [
        incidentResponse,
        taskResponse,
        volunteerResponse,
        inventoryResponse,
      ] = await Promise.allSettled([
        listIncidents({
          page: 1,
          per_page: 100,
        }),

        listTasks({
          page: 1,
          per_page: 100,
        }),

        listVolunteers({
          status: "active",
          page: 1,
          per_page: 1,
        }),

        getInventoryOverview(),
      ]);

      // --------------------------------------------------------
      // INCIDENTS
      // --------------------------------------------------------

      const incidentList =
        incidentResponse.status === "fulfilled"
          ? (
              incidentResponse.value?.data?.incidents ??
              incidentResponse.value?.data?.items ??
              incidentResponse.value?.data ??
              []
            )
          : [];

      // --------------------------------------------------------
      // TASKS
      // --------------------------------------------------------

      const taskList =
        taskResponse.status === "fulfilled"
          ? (
              taskResponse.value?.data?.tasks ??
              taskResponse.value?.data?.items ??
              taskResponse.value?.data ??
              []
            )
          : [];

      // --------------------------------------------------------
      // VOLUNTEERS
      // --------------------------------------------------------

      const volunteerTotal =
        volunteerResponse.status === "fulfilled"
          ? (
              volunteerResponse.value?.data?.pagination?.total ??
              volunteerResponse.value?.data?.total ??
              volunteerResponse.value?.data?.volunteers?.length ??
              volunteerResponse.value?.data?.length ??
              0
            )
          : 0;

      // --------------------------------------------------------
      // INVENTORY
      // --------------------------------------------------------

      const inventorySummary =
        inventoryResponse.status === "fulfilled"
          ? inventoryResponse.value?.data?.summary ?? {}
          : {};

      const equipmentWise =
        inventoryResponse.status === "fulfilled"
          ? inventoryResponse.value?.data?.equipment_wise ?? []
          : [];

      // --------------------------------------------------------
      // INCIDENT STATUS
      // --------------------------------------------------------

      const resolvedIncidents = incidentList.filter(
        (incident) =>
          incident.status === "resolved" ||
          incident.status === "closed"
      );

      const pendingTasks = taskList.filter(
        (task) =>
          task.status === "pending" ||
          task.status === "assigned"
      );

      // --------------------------------------------------------
      // SET KPI DATA
      // --------------------------------------------------------

      setStats({
        incidents: incidentList.length,
        resolved: resolvedIncidents.length,
        pendingTasks: pendingTasks.length,
        volunteers: volunteerTotal,

        totalProducts:
          Number(inventorySummary.total_product) || 0,

        totalQuantity:
          Number(inventorySummary.total_quantity) || 0,
      });

      // --------------------------------------------------------
      // SET LIST DATA
      // --------------------------------------------------------

      setIncidents(incidentList);

      setRecentIncidents(
        [...incidentList]
          .sort((a, b) => {
            const dateA = new Date(
              a.created_at || a.reported_at || 0
            );

            const dateB = new Date(
              b.created_at || b.reported_at || 0
            );

            return dateB - dateA;
          })
          .slice(0, 5)
      );

      setRecentTasks(
        [...taskList]
          .sort((a, b) => {
            const dateA = new Date(
              a.created_at || a.updated_at || 0
            );

            const dateB = new Date(
              b.created_at || b.updated_at || 0
            );

            return dateB - dateA;
          })
          .slice(0, 5)
      );

      setInventoryCategories(equipmentWise);
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(
        err?.message || "Failed to load dashboard data."
      );
    }
  };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!mounted) return;

      setLoading(true);

      await loadDashboard();

      if (mounted) {
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);


  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  };


  // ==========================================================
  // INCIDENT TREND DATA
  // ==========================================================

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

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          reported: 0,
          resolved: 0,
        };
      }

      grouped[key].reported += 1;

      if (
        incident.status === "resolved" ||
        incident.status === "closed"
      ) {
        grouped[key].resolved += 1;
      }
    });

    return Object.values(grouped)
      .sort(
        (a, b) =>
          new Date(a.date) - new Date(b.date)
      )
      .slice(-14)
      .map((item) => ({
        ...item,
        displayDate: new Date(
          item.date
        ).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
      }));
  }, [incidents]);


  // ==========================================================
  // STATUS STYLES
  // ==========================================================

  const SEVERITY_STYLES = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  const STATUS_STYLES = {
    reported: "bg-blue-100 text-blue-700",
    acknowledged: "bg-purple-100 text-purple-700",
    in_progress: "bg-indigo-100 text-indigo-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-slate-100 text-slate-600",

    pending: "bg-yellow-100 text-yellow-700",
    assigned: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-slate-100 text-slate-500",
  };

    const selectedDistrictRainfall =
    selectedDistrict?.dist_lgd == null
      ? selectedDistrict?.precipitationMm
      : rainfallStatus.rainfallByDistrict[String(selectedDistrict.dist_lgd)] ??
        selectedDistrict.precipitationMm;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Live overview of disaster response operations
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>


        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}


        {/* ====================================================
            KPI CARDS
        ==================================================== */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">

          <StatCard
            title="Active Incidents"
            value={stats.incidents}
            description="Total incidents reported"
            icon={AlertTriangle}
            color="bg-orange-500"
            loading={loading}
          />

          <StatCard
            title="Resolved"
            value={stats.resolved}
            description="Resolved / closed incidents"
            icon={CheckCircle2}
            color="bg-green-500"
            loading={loading}
          />

          <StatCard
            title="Pending Tasks"
            value={stats.pendingTasks}
            description="Tasks awaiting action"
            icon={Clock}
            color="bg-indigo-500"
            loading={loading}
          />

          <StatCard
            title="Volunteers"
            value={stats.volunteers}
            description="Active volunteers"
            icon={Users}
            color="bg-blue-500"
            loading={loading}
          />

          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            description="Inventory product records"
            icon={Package}
            color="bg-emerald-500"
            loading={loading}
          />

          <StatCard
            title="Total Quantity"
            value={stats.totalQuantity}
            description="Available inventory quantity"
            icon={Package}
            color="bg-violet-500"
            loading={loading}
          />

        </div>


        {/* ====================================================
            CHARTS
        ==================================================== */}

        <div className="mb-8 grid gap-6 lg:grid-cols-2">

          {/* --------------------------------------------------
              INCIDENT TREND
          -------------------------------------------------- */}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                Incident Trend
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Reported vs resolved incidents
              </p>
            </div>

            <div className="h-[320px] p-4">

              {incidentTrendData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No incident trend data available
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={incidentTrendData}
                    margin={{
                      top: 10,
                      right: 15,
                      left: -15,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="displayDate"
                      tick={{
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      allowDecimals={false}
                      tick={{
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />

                    <Legend
                      wrapperStyle={{
                        fontSize: "12px",
                      }}
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
          </div>


          {/* --------------------------------------------------
              INVENTORY CATEGORY
          -------------------------------------------------- */}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                Inventory by Equipment Category
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Quantity available by equipment type
              </p>
            </div>

            <div className="h-[320px] p-4">

              {inventoryCategories.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No inventory data available
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={inventoryCategories}
                    margin={{
                      top: 10,
                      right: 15,
                      left: -15,
                      bottom: 30,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="equipment_type"
                      tick={{
                        fontSize: 10,
                      }}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      allowDecimals={false}
                      tick={{
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [
                        value,
                        "Quantity",
                      ]}
                    />

                    <Bar
                      dataKey="total_quantity"
                      name="Quantity"
                      fill="#10b981"
                      radius={[
                        5,
                        5,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}

            </div>
          </div>

        </div>


        {/* West Bengal rainfall forecast map */}

        <div className="relative z-0 mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Map Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-slate-900">
              {mapMode === "rainfall"
                ? "West Bengal Rainfall Forecast"
                : "West Bengal Historical Flood Inundation"}
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                Map layer
                <select
                  value={mapMode}
                  onChange={(event) => {
                    setMapMode(event.target.value);
                    setHistoricalLayerError("");
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="rainfall">Next 24-hour rainfall</option>
                  <option value="historical">Historical inundation (Bhuvan)</option>
                </select>
              </label>
              {mapMode === "historical" && (
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  Event date
                  <select
                    value={historicalEventLayer}
                    onChange={(event) => {
                      setHistoricalEventLayer(event.target.value);
                      setHistoricalLayerError("");
                    }}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    {HISTORICAL_FLOOD_EVENTS.map(({ layer, date }) => (
                      <option key={layer} value={layer}>{date}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>

          {/* Map + Legend */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px]">

            {/* -----------------------------------------
        MAP CONTAINER
    ------------------------------------------ */}
            <div className="h-[700px] w-full">

              <MapContainer
                center={[24.2726, 88.1]}
                crs={L.CRS.EPSG4326}
                zoom={6}
                minZoom={5}
                maxZoom={12}
                scrollWheelZoom={true}
                maxBounds={[
                  [21.45, 84.75],
                  [27.25, 89.90],
                ]}
                maxBoundsViscosity={1.0}
                className="h-full w-full"
                style={{
                  background: "#f1f5f9",
                }}
              >
                <RainfallForecastLayer
                  mapMode={mapMode}
                  historicalEventLayer={historicalEventLayer}
                  selectedDistrict={selectedDistrict}
                  onDistrictSelect={setSelectedDistrict}
                  onDistrictError={setDistrictLayerError}
                  onForecastStatus={setRainfallStatus}
                  onHistoricalLayerError={setHistoricalLayerError}
                />
              </MapContainer>

            </div>

            {/* -----------------------------------------
        MAP LEGEND AND SOURCE
    ------------------------------------------ */}
            <div className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">

              <div className="flex h-full flex-col">

                {/* Legend heading */}
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {mapMode === "rainfall"
                      ? "Next 24-hour rainfall"
                      : "Historical flood inundation"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {mapMode === "rainfall"
                      ? "Forecast precipitation by district, accumulated in millimetres."
                      : `Bhuvan satellite-derived inundation snapshot for ${
                        HISTORICAL_FLOOD_EVENTS.find(
                          ({ layer }) => layer === historicalEventLayer
                        )?.date
                      }.`}
                  </p>
                </div>

                {mapMode === "rainfall" ? (
                  <div className="mt-6 space-y-3">
                    {[
                      { color: "#f1f5f9", label: "0 mm", detail: "No forecast rain" },
                      { color: "#bfdbfe", label: "0–2 mm", detail: "Light" },
                      { color: "#60a5fa", label: "2–10 mm", detail: "Moderate" },
                      { color: "#facc15", label: "10–25 mm", detail: "Heavy" },
                      { color: "#ef4444", label: "25+ mm", detail: "Very heavy" },
                    ].map(({ color, label, detail }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span
                          className="h-4 w-7 shrink-0 rounded border border-slate-300"
                          style={{ backgroundColor: color }}
                        />
                        <div>
                          <p className="text-xs font-medium text-slate-700">{label}</p>
                          <p className="text-[10px] text-slate-400">{detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 text-xs leading-5 text-slate-600">
                    The WMS serves its own inundation imagery; no numeric
                    severity scale is published. These 2011/2013 event
                    snapshots are not current flood warnings, and each
                    footprint may cover only part of the state. The public
                    endpoint needs no API key; the service does not specify a
                    data reuse licence.
                  </p>
                )}

                <div className="mt-5 border-t border-slate-200 pt-4">
                  {mapMode === "rainfall" && rainfallStatus.loading && (
                    <p className="mt-3 text-xs text-blue-700" role="status">
                      Loading district forecasts…
                    </p>
                  )}
                  
                  {mapMode === "rainfall" && (
                <p className="mt-2 text-xs text-slate-500">
                  24-hour forecast:{" "}
                  {Number.isFinite(selectedDistrictRainfall)
                    ? `${selectedDistrictRainfall.toFixed(1)} mm`
                    : "Loading…"}
                </p>
              )}
              {mapMode === "rainfall" && rainfallStatus.updatedAt && !rainfallStatus.error && (
                    <p className="mt-3 text-xs text-slate-500">
                      Updated {new Date(rainfallStatus.updatedAt).toLocaleTimeString()}
                    </p>
                  )}
                  {districtLayerError && (
                    <p role="alert" className="mt-3 text-xs text-red-700">
                      {districtLayerError}
                    </p>
                  )}
                  {mapMode === "rainfall" && rainfallStatus.error && (
                    <p role="alert" className="mt-3 text-xs text-red-700">
                      {rainfallStatus.error}
                    </p>
                  )}
                  {mapMode === "historical" && historicalLayerError && (
                    <p role="alert" className="mt-3 text-xs text-red-700">
                      {historicalLayerError}
                    </p>
                  )}
                </div>
                <div className="mt-auto pt-5">
                  <a
                    href={mapMode === "rainfall"
                      ? "https://open-meteo.com/"
                      : "https://bhuvan-ras2.nrsc.gov.in/cgi-bin/flood.exe?SERVICE=WMS&REQUEST=GetCapabilities"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs font-medium text-blue-700 hover:underline"
                  >
                    {mapMode === "rainfall"
                      ? "Free forecast data by Open-Meteo"
                      : "NRSC Bhuvan flood WMS capabilities"}
                  </a>
                </div>

              </div>

            </div>

          </div>

          {/* Selected District */}
          {selectedDistrict && (
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Selected District
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {selectedDistrict.name}
                  </p>
                </div>

                <div className="text-right">

                  <p className="text-xs text-slate-400">
                    LGD ID
                  </p>

                  <p className="text-sm font-medium text-slate-700">
                    {selectedDistrict.dist_lgd}
                  </p>

                </div>

              </div>
              

            </div>
          )}

        </div>


        {/* ====================================================
            FLOOD MAP
        ==================================================== */}

        {/* <div className="relative z-0 mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 bg-white px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              West Bengal Flood Risk Overview
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Current flood-risk intensity across West Bengal
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px]"> */}

            {/* MAP */}

            {/* <div className="h-[700px] w-full">

              <MapContainer
                center={[24.2726, 88.3639]}
                zoom={8}
                minZoom={6}
                maxZoom={12}
                scrollWheelZoom={true}
                maxBounds={[
                  [21.45, 84.75],
                  [27.25, 89.90],
                ]}
                maxBoundsViscosity={1.0}
                className="h-full w-full"
                style={{
                  background: "#010101",
                }}
              >
                <FloodRasterLayer />
              </MapContainer>

            </div> */}


            {/* LEGEND */}

            {/* <div className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Flood Risk
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Flood-risk intensity represented by the
                  raster color scale.
                </p>
              </div>

              <div className="mt-6 space-y-4">

                <div className="flex items-center gap-3">
                  <span className="h-4 w-7 shrink-0 rounded bg-green-500" />

                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      Very Low
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Minimal flood risk
                    </p>
                  </div>
                </div>


                <div className="flex items-center gap-3">
                  <span className="h-4 w-7 shrink-0 rounded bg-lime-500" />

                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      Low
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Low flood risk
                    </p>
                  </div>
                </div>


                <div className="flex items-center gap-3">
                  <span className="h-4 w-7 shrink-0 rounded bg-yellow-400" />

                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      Moderate
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Moderate flood risk
                    </p>
                  </div>
                </div>


                <div className="flex items-center gap-3">
                  <span className="h-4 w-7 shrink-0 rounded bg-orange-500" />

                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      High
                    </p>

                    <p className="text-[10px] text-slate-400">
                      High flood risk
                    </p>
                  </div>
                </div>


                <div className="flex items-center gap-3">
                  <span className="h-4 w-7 shrink-0 rounded bg-red-600" />

                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      Very High
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Very high flood risk
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div> */}


        {/* ====================================================
            RECENT INCIDENTS + TASKS
        ==================================================== */}

        <div className="grid gap-6 lg:grid-cols-2">

          {/* --------------------------------------------------
              RECENT INCIDENTS
          -------------------------------------------------- */}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <AlertTriangle
                  size={16}
                  className="text-orange-500"
                />

                Recent Incidents
              </h2>

              <a
                href="/incident"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                View all →
              </a>

            </div>


            {loading ? (
              <div className="space-y-3 px-5 py-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-lg bg-slate-100"
                  />
                ))}
              </div>
            ) : recentIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">

                <AlertTriangle
                  size={32}
                  className="mb-2 text-slate-200"
                />

                <p className="text-sm text-slate-500">
                  No incidents yet
                </p>

              </div>
            ) : (
              <ul className="divide-y divide-slate-100">

                {recentIncidents.map((incident) => (
                  <li
                    key={incident.id}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50"
                  >

                    <div className="min-w-0">

                      <p className="truncate text-sm font-medium text-slate-800">
                        {incident.title || "Untitled Incident"}
                      </p>

                      <p className="text-xs text-slate-400">
                        {incident.incident_no || "—"}
                        {" · "}
                        {incident.incident_type || "—"}
                      </p>

                    </div>


                    <div className="ml-3 flex shrink-0 gap-2">

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          SEVERITY_STYLES[
                            incident.severity
                          ] ??
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {incident.severity || "—"}
                      </span>

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          STATUS_STYLES[
                            incident.status
                          ] ??
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {incident.status || "—"}
                      </span>

                    </div>

                  </li>
                ))}

              </ul>
            )}

          </div>


          {/* --------------------------------------------------
              RECENT TASKS
          -------------------------------------------------- */}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <ClipboardList
                  size={16}
                  className="text-indigo-500"
                />

                Recent Tasks
              </h2>

              <a
                href="/task"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                View all →
              </a>

            </div>


            {loading ? (
              <div className="space-y-3 px-5 py-4">

                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-lg bg-slate-100"
                  />
                ))}

              </div>
            ) : recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">

                <ClipboardList
                  size={32}
                  className="mb-2 text-slate-200"
                />

                <p className="text-sm text-slate-500">
                  No tasks yet
                </p>

              </div>
            ) : (
              <ul className="divide-y divide-slate-100">

                {recentTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50"
                  >

                    <div className="min-w-0">

                      <p className="truncate text-sm font-medium text-slate-800">
                        {task.title || "Untitled Task"}
                      </p>

                      <p className="text-xs text-slate-400">
                        Incident #
                        {task.incident_id ?? "—"}
                      </p>

                    </div>


                    <span
                      className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        STATUS_STYLES[
                          task.status
                        ] ??
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {task.status || "—"}
                    </span>

                  </li>
                ))}

              </ul>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

export default Dashboard;