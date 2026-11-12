import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  CloudSun,
  CloudRain,
  Cloud,
  Wind,
  Thermometer,
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  Droplets,
  LoaderCircle,
  Database,
  ChevronDown,
  Sun,
} from "lucide-react";

import "leaflet/dist/leaflet.css";

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const API_BASE_URL = (
  import.meta.env.VITE_WEATHER_API_BASE_URL || "http://192.168.0.6:8000"
).replace(/\/+$/, "");

const GEOJSON_URL = "/gis/districts.geojson";

const api = {
  async get(path, { params = {} } = {}) {
    const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(
          data?.detail || data?.message || `Weather API error (${response.status})`
        );
        error.response = { data, status: response.status };
        throw error;
      }

      return { data };
    } finally {
      window.clearTimeout(timeoutId);
    }
  },
};

const MAP_CENTER = [23.5, 87.8];

const MAP_ZOOM = 7;

const COLORS = {
  blue: "#2563eb",
  cyan: "#0891b2",
  orange: "#ea580c",
  green: "#059669",
  purple: "#7c3aed",
};

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function getArray(response) {
  if (Array.isArray(response)) return response;

  for (const key of [
    "data",
    "districts",
    "items",
    "results",
    "forecast",
    "predictions",
    "records",
  ]) {
    if (Array.isArray(response?.[key])) return response[key];
  }

  if (response?.data && typeof response.data === "object") {
    return getArray(response.data);
  }

  return [];
}

function getNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, digits = 1) {
  const number = getNumber(value);

  return number === null ? "—" : number.toFixed(digits);
}

function formatDate(value, options = {}) {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    ...options,
  });
}

function normalizeDistrict(district) {
  return {
    ...district,
    id: district.id ?? district.district_id,
    district_name:
      district.district_name ??
      district.name ??
      district.district ??
      "Unknown district",
    latitude: getNumber(district.latitude ?? district.lat),
    longitude: getNumber(district.longitude ?? district.lon),
  };
}

function normalizeWeather(record) {
  return {
    ...record,
    prediction_date:
      record.prediction_date ??
      record.weather_date ??
      record.date,
    temperature_max: getNumber(
      record.predicted_temperature_max ?? record.temperature_max
    ),
    temperature_min: getNumber(
      record.predicted_temperature_min ?? record.temperature_min
    ),
    temperature_mean: getNumber(
      record.predicted_temperature_mean ?? record.temperature_mean
    ),
    precipitation: getNumber(
      record.predicted_precipitation ?? record.precipitation
    ),
    wind_speed: getNumber(
      record.predicted_wind_speed ?? record.wind_speed
    ),
    wind_direction: getNumber(
      record.predicted_wind_direction ?? record.wind_direction
    ),
    cloud_cover: getNumber(
      record.predicted_cloud_cover ?? record.cloud_cover
    ),
  };
}

function getRainfallLevel(value) {
  const rainfall = getNumber(value);

  if (rainfall === null) {
    return {
      label: "No data",
      color: "text-slate-500",
      background: "bg-slate-100",
    };
  }

  if (rainfall >= 64.5) {
    return {
      label: "Heavy rainfall",
      color: "text-red-700",
      background: "bg-red-100",
    };
  }

  if (rainfall >= 15.6) {
    return {
      label: "Moderate rainfall",
      color: "text-orange-700",
      background: "bg-orange-100",
    };
  }

  if (rainfall > 0) {
    return {
      label: "Light rainfall",
      color: "text-blue-700",
      background: "bg-blue-100",
    };
  }

  return {
    label: "No rainfall",
    color: "text-emerald-700",
    background: "bg-emerald-100",
  };
}

function getWeatherIcon(rainfall, cloudCover) {
  const rain = getNumber(rainfall) ?? 0;
  const clouds = getNumber(cloudCover) ?? 0;

  if (rain >= 15.6) return CloudRain;
  if (clouds >= 60) return Cloud;
  if (clouds >= 20) return CloudSun;

  return Sun;
}

// --------------------------------------------------
// Map marker
// --------------------------------------------------

function createDistrictIcon(rainfall, selected) {
  const level = getRainfallLevel(rainfall);

  let color = "#059669";

  if (level.label === "Light rainfall") color = "#2563eb";
  if (level.label === "Moderate rainfall") color = "#ea580c";
  if (level.label === "Heavy rainfall") color = "#dc2626";
  if (selected) color = "#7c3aed";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(15,23,42,0.35);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function MapController({ selectedDistrict }) {
  const map = useMap();

  useEffect(() => {
    if (
      selectedDistrict?.latitude != null &&
      selectedDistrict?.longitude != null
    ) {
      map.flyTo(
        [selectedDistrict.latitude, selectedDistrict.longitude],
        9,
        { duration: 0.8 }
      );
    }
  }, [map, selectedDistrict]);

  return null;
}

// --------------------------------------------------
// Reusable UI
// --------------------------------------------------

function SectionHeading({ title, description, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
      <Database size={30} className="mb-3 text-slate-400" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-96 items-center justify-center">
      <div className="text-center">
        <LoaderCircle
          size={38}
          className="mx-auto animate-spin text-blue-600"
        />
        <p className="mt-3 text-sm text-slate-500">
          Loading weather information...
        </p>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Main Weather Dashboard
// --------------------------------------------------

export default function Weather() {
  const [districts, setDistricts] = useState([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [weatherRecords, setWeatherRecords] = useState([]);
  const [geoJson, setGeoJson] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [forecastError, setForecastError] = useState("");
  const [dataType, setDataType] = useState("forecast");

  const [lastUpdated, setLastUpdated] = useState(null);

  const selectedDistrict = useMemo(
    () =>
      districts.find(
        (district) => String(district.id) === String(selectedDistrictId)
      ) ?? null,
    [districts, selectedDistrictId]
  );

  // ------------------------------------------------
  // Load district list
  // ------------------------------------------------

  const loadDistricts = useCallback(async () => {
    const response = await api.get("/weather/districts");

    const districtList = getArray(response.data)
      .map(normalizeDistrict)
      .filter(
        (district) =>
          district.id !== undefined &&
          district.id !== null &&
          district.district_name
      );

    setDistricts(districtList);

    setSelectedDistrictId((current) => {
      if (
        current &&
        districtList.some(
          (district) => String(district.id) === String(current)
        )
      ) {
        return current;
      }

      return districtList.length ? String(districtList[0].id) : "";
    });

    return districtList;
  }, []);

  // ------------------------------------------------
  // Load historical observations
  // ------------------------------------------------

  const loadHistoricalWeather = useCallback(async (district) => {
    if (!district) return [];

    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);

    startDate.setDate(startDate.getDate() - 30);

    const toISODate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    const response = await api.get("/weather/history", {
      params: {
        district_name: district.district_name,
        start_date: toISODate(startDate),
        end_date: toISODate(endDate),
      },
    });

    const records = getArray(response.data);

    return records
      .map(normalizeWeather)
      .sort((a, b) =>
        String(a.prediction_date).localeCompare(
          String(b.prediction_date)
        )
      );
  }, []);

  // ------------------------------------------------
  // Load ML predictions
  // ------------------------------------------------

  const loadForecast = useCallback(async (district) => {
    if (!district) return [];

    // These routes are intended for the prediction API in
    // your FastAPI backend. The first route supports filtering
    // by district name; the second supports district ID.
    const requests = [
      () =>
        api.get("/weather/predictions", {
          params: {
            district_name: district.district_name,
          },
        }),
      () => api.get(`/weather/predictions/${district.id}`),
    ];

    let lastError = null;

    for (const request of requests) {
      try {
        const response = await request();

        let records = getArray(response.data);

        // Some APIs return one forecast object rather than an array.
        if (
          records.length === 0 &&
          response.data &&
          typeof response.data === "object" &&
          (response.data.prediction_date ||
            response.data.weather_date ||
            response.data.forecast)
        ) {
          records = response.data.forecast
            ? getArray(response.data.forecast)
            : [response.data];
        }

        return records
          .map(normalizeWeather)
          .sort((a, b) =>
            String(a.prediction_date).localeCompare(
              String(b.prediction_date)
            )
          );
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError ?? new Error("Unable to retrieve forecasts.");
  }, []);

  // ------------------------------------------------
  // Load weather for selected district
  // ------------------------------------------------

  const loadWeather = useCallback(
    async (district, mode = dataType) => {
      if (!district) {
        setWeatherRecords([]);
        return;
      }

      try {
        let records = [];

        if (mode === "forecast") {
          records = await loadForecast(district);
        } else {
          records = await loadHistoricalWeather(district);
        }

        setWeatherRecords(records);
        setForecastError("");
        setLastUpdated(new Date());
      } catch (err) {
        setWeatherRecords([]);

        const message =
          err.response?.data?.detail ||
          err.message ||
          "Unable to retrieve weather data.";

        if (mode === "forecast") {
          setForecastError(
            `Forecast API unavailable. ${message} Ensure that the prediction endpoint is implemented in your FastAPI backend.`
          );
        } else {
          setForecastError(
            `Historical weather could not be loaded. ${message}`
          );
        }
      }
    },
    [dataType, loadForecast, loadHistoricalWeather]
  );

  // ------------------------------------------------
  // Initial load
  // ------------------------------------------------

  const initializeDashboard = useCallback(async () => {
    try {
      await loadDistricts();

      // Map data is optional. The map still works with district
      // markers if the GeoJSON file is unavailable.
      try {
        const response = await fetch(GEOJSON_URL);

        if (response.ok) {
          const json = await response.json();
          setGeoJson(json);
        }
      } catch {
        setGeoJson(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to connect to the weather backend. Check the API URL and CORS settings."
      );
    } finally {
      setLoading(false);
    }
  }, [loadDistricts]);

  const handleRetryConnection = () => {
    setLoading(true);
    setError("");
    void initializeDashboard();
  };

  // These effects synchronize the view with remote weather data.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initializeDashboard();
  }, [initializeDashboard]);

  useEffect(() => {
    if (!selectedDistrict) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWeather(selectedDistrict, dataType);
  }, [selectedDistrict, dataType, loadWeather]);

  // ------------------------------------------------
  // Refresh
  // ------------------------------------------------

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");

    try {
      await loadDistricts();

      if (selectedDistrict) {
        await loadWeather(selectedDistrict, dataType);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to refresh weather information."
      );
    } finally {
      setRefreshing(false);
    }
  };

  // ------------------------------------------------
  // Dashboard calculations
  // ------------------------------------------------

  const districtForecasts = useMemo(() => {
    const byDistrict = new Map();

    for (const record of weatherRecords) {
      const districtId =
        record.district_id ?? record.district?.id;

      if (districtId != null) {
        byDistrict.set(String(districtId), record);
      }
    }

    return byDistrict;
  }, [weatherRecords]);

  const chartData = useMemo(
    () =>
      weatherRecords.map((record) => ({
        date: formatDate(record.prediction_date),
        rainfall: record.precipitation,
        maximumTemperature: record.temperature_max,
        minimumTemperature: record.temperature_min,
        windSpeed: record.wind_speed,
        cloudCover: record.cloud_cover,
      })),
    [weatherRecords]
  );

  // ------------------------------------------------
  // Map styles
  // ------------------------------------------------

  const geoJsonStyle = useCallback(
    () => ({
      color: "#64748b",
      weight: 1,
      opacity: 0.8,
      fillColor: "#bfdbfe",
      fillOpacity: 0.12,
    }),
    []
  );

  const onEachDistrictFeature = useCallback((feature, layer) => {
    const name =
      feature.properties?.district_name ??
      feature.properties?.DISTRICT ??
      feature.properties?.district ??
      feature.properties?.NAME_2 ??
      feature.properties?.name ??
      "District";

    layer.bindTooltip(name);

    layer.on({
      mouseover: (event) => {
        event.target.setStyle({
          weight: 2,
          color: "#2563eb",
          fillOpacity: 0.25,
        });
      },
      mouseout: (event) => {
        event.target.setStyle({
          weight: 1,
          color: "#64748b",
          fillOpacity: 0.12,
        });
      },
    });
  }, []);

  // ------------------------------------------------
  // Loading and error screens
  // ------------------------------------------------

  if (loading) {
    return <LoadingState />;
  }

  if (error && districts.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={24}
              className="shrink-0 text-red-600"
            />
            <div>
              <h2 className="font-bold text-red-900">
                Weather backend unavailable
              </h2>

              <p className="mt-2 text-sm text-red-800">{error}</p>

              <p className="mt-3 text-sm text-red-800">
                API URL: {API_BASE_URL}
              </p>

              <button
                onClick={handleRetryConnection}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <RefreshCw size={16} />
                Retry connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------
  // Dashboard UI
  // ------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-7">

        {/* Header */}

        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
              <CloudSun size={19} />
            WEATHER MONITORING
            </div>

            

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor district-wise weather conditions, rainfall
              predictions, temperature trends, and historical observations
              across West Bengal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
              <CalendarDays size={17} className="text-slate-400" />
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
            {lastUpdated && (
              <span className="text-xs text-slate-500">
                Updated {lastUpdated.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </header>

        {/* Backend warning */}

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {error}
          </div>
        )}

        {/* Forecast / historical selector */}

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Weather data view
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Switch between model predictions and recorded weather.
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setDataType("forecast")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                dataType === "forecast"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Forecast
            </button>

            <button
              onClick={() => setDataType("historical")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                dataType === "historical"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Historical
            </button>
          </div>
        </div>

        

        {/* Map and selected district */}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  West Bengal Weather Map
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select a district to inspect its weather conditions.
                </p>
              </div>

              <div className="relative min-w-52">
                <select
                  value={selectedDistrictId}
                  onChange={(event) =>
                    setSelectedDistrictId(event.target.value)
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.district_name}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="relative h-[400px] sm:h-[500px]">
              <MapContainer
                center={MAP_CENTER}
                zoom={MAP_ZOOM}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController selectedDistrict={selectedDistrict} />

                {geoJson && (
                  <GeoJSON
                    key={JSON.stringify(geoJson)}
                    data={geoJson}
                    style={geoJsonStyle}
                    onEachFeature={onEachDistrictFeature}
                  />
                )}

                {districts
                  .filter(
                    (district) =>
                      district.latitude != null &&
                      district.longitude != null
                  )
                  .map((district) => {
                    const forecast = districtForecasts.get(
                      String(district.id)
                    );

                    const isSelected =
                      String(district.id) ===
                      String(selectedDistrictId);

                    return (
                      <Marker
                        key={district.id}
                        position={[
                          district.latitude,
                          district.longitude,
                        ]}
                        icon={createDistrictIcon(
                          forecast?.precipitation,
                          isSelected
                        )}
                        eventHandlers={{
                          click: () =>
                            setSelectedDistrictId(String(district.id)),
                        }}
                      >
                        <Popup>
                          <div className="min-w-40">
                            <p className="font-bold">
                              {district.district_name}
                            </p>

                            <p className="mt-1 text-sm">
                              Rainfall:{" "}
                              {formatNumber(
                                forecast?.precipitation
                              )}{" "}
                              mm
                            </p>

                            <p className="text-sm">
                              Maximum temperature:{" "}
                              {formatNumber(
                                forecast?.temperature_max
                              )}{" "}
                              °C
                            </p>

                            <button
                              onClick={() =>
                                setSelectedDistrictId(
                                  String(district.id)
                                )
                              }
                              className="mt-2 text-sm font-semibold text-blue-700"
                            >
                              View district
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
              </MapContainer>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-600">
              {[
                ["#059669", "No rainfall"],
                ["#2563eb", "Light rainfall"],
                ["#ea580c", "Moderate rainfall"],
                ["#dc2626", "Heavy rainfall"],
                ["#7c3aed", "Selected district"],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* District summary */}

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Selected District
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {selectedDistrict?.district_name ?? "Select district"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    West Bengal, India
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-3">
                  <CloudSun size={25} className="text-blue-700" />
                </div>
              </div>

              <div className="my-5 border-t border-slate-100" />

              {weatherRecords.length > 0 ? (
                <>
                  {(() => {
                    const latest = weatherRecords[0];
                    const Icon = getWeatherIcon(
                      latest.precipitation,
                      latest.cloud_cover
                    );

                    return (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-4xl font-bold text-slate-900">
                            {formatNumber(latest.temperature_mean)}°C
                          </p>

                          <p className="mt-2 text-sm text-slate-500">
                            Mean temperature
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(latest.prediction_date)}
                          </p>
                        </div>

                        <Icon size={55} className="text-blue-500" />
                      </div>
                    );
                  })()}

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Thermometer size={15} />
                        Maximum
                      </div>
                      <p className="mt-2 font-bold text-slate-900">
                        {formatNumber(weatherRecords[0].temperature_max)}°C
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Thermometer size={15} />
                        Minimum
                      </div>
                      <p className="mt-2 font-bold text-slate-900">
                        {formatNumber(weatherRecords[0].temperature_min)}°C
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Droplets size={15} />
                        Rainfall
                      </div>
                      <p className="mt-2 font-bold text-slate-900">
                        {formatNumber(weatherRecords[0].precipitation)} mm
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Wind size={15} />
                        Wind speed
                      </div>
                      <p className="mt-2 font-bold text-slate-900">
                        {formatNumber(weatherRecords[0].wind_speed)} km/h
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState
                  message={
                    forecastError ||
                    "No weather records are available for this district."
                  }
                />
              )}
            </div>

            {/* Rainfall alert card */}

            {/* <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-3">
                  <AlertTriangle
                    size={22}
                    className="text-amber-600"
                  />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Rainfall Assessment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Based on the selected weather record
                  </p>
                </div>
              </div>

              {weatherRecords.length > 0 ? (
                (() => {
                  const level = getRainfallLevel(
                    weatherRecords[0].precipitation
                  );

                  return (
                    <div
                      className={`mt-5 rounded-xl p-4 ${level.background}`}
                    >
                      <p className={`font-bold ${level.color}`}>
                        {level.label}
                      </p>

                      <p className={`mt-1 text-sm ${level.color}`}>
                        {formatNumber(
                          weatherRecords[0].precipitation
                        )}{" "}
                        mm predicted or recorded rainfall
                      </p>

                      
                    </div>
                  );
                })()
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Rainfall assessment will appear when weather data
                  is available.
                </p>
              )}
            </div> */}
          </div>
        </section>

        {/* Forecast table */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title={
              dataType === "forecast"
                ? "District Weather Forecast"
                : "Historical Weather Records"
            }
            description={
              dataType === "forecast"
                ? "Daily predicted weather conditions for the selected district."
                : "Historical daily weather observations for the selected district."
            }
            action={
              <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {weatherRecords.length} records
              </span>
            }
          />

          {forecastError && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {forecastError}
            </div>
          )}

          {weatherRecords.length === 0 ? (
            <EmptyState
              message={
                dataType === "forecast"
                  ? "No forecasts available. Ensure that the prediction API exists and the ML model has saved predictions."
                  : "No historical records were returned for this district and date range."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Temperature</th>
                    <th className="px-4 py-3 font-semibold">Rainfall</th>
                    <th className="px-4 py-3 font-semibold">Wind speed</th>
                    <th className="px-4 py-3 font-semibold">Wind direction</th>
                    <th className="px-4 py-3 font-semibold">Cloud cover</th>
                    <th className="px-4 py-3 font-semibold">Rainfall level</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {weatherRecords.map((record, index) => {
                    const level = getRainfallLevel(
                      record.precipitation
                    );

                    return (
                      <tr
                        key={`${record.prediction_date}-${index}`}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-800">
                          {formatDate(record.prediction_date, {
                            year: "numeric",
                          })}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                          <span className="font-medium">
                            {formatNumber(record.temperature_max)}°C
                          </span>
                          <span className="ml-2 text-xs text-slate-400">
                            / {formatNumber(record.temperature_min)}°C
                          </span>
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-700">
                          {formatNumber(record.precipitation)} mm
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatNumber(record.wind_speed)} km/h
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatNumber(record.wind_direction, 0)}°
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatNumber(record.cloud_cover, 0)}%
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${level.background} ${level.color}`}
                          >
                            {level.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Charts */}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Rainfall chart */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              title="Rainfall Trend"
              description="Daily precipitation in millimetres."
            />

            {chartData.length === 0 ? (
              <EmptyState message="Rainfall chart requires weather records." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
                      bottom: 5,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="rainfallGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={COLORS.cyan}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={COLORS.cyan}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      unit=" mm"
                    />

                    <Tooltip
                      formatter={(value) => [
                        `${formatNumber(value)} mm`,
                        "Rainfall",
                      ]}
                    />

                    <Area
                      type="monotone"
                      dataKey="rainfall"
                      name="Rainfall"
                      stroke={COLORS.cyan}
                      strokeWidth={2.5}
                      fill="url(#rainfallGradient)"
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Temperature chart */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              title="Temperature Analysis"
              description="Daily maximum and minimum temperatures."
            />

            {chartData.length === 0 ? (
              <EmptyState message="Temperature chart requires weather records." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      unit="°C"
                    />

                    <Tooltip
                      formatter={(value) => [
                        `${formatNumber(value)}°C`,
                      ]}
                    />

                    <Legend />

                    <Area
                      type="monotone"
                      dataKey="maximumTemperature"
                      name="Maximum"
                      stroke={COLORS.orange}
                      fill={COLORS.orange}
                      fillOpacity={0.08}
                      strokeWidth={2.5}
                      connectNulls
                    />

                    <Area
                      type="monotone"
                      dataKey="minimumTemperature"
                      name="Minimum"
                      stroke={COLORS.blue}
                      fill={COLORS.blue}
                      fillOpacity={0.06}
                      strokeWidth={2.5}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* Additional weather metrics */}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              title="Wind Speed Analysis"
              description="Daily maximum wind speed in km/h."
            />

            {chartData.length === 0 ? (
              <EmptyState message="Wind chart requires weather records." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      unit=" km/h"
                    />

                    <Tooltip
                      formatter={(value) => [
                        `${formatNumber(value)} km/h`,
                        "Wind speed",
                      ]}
                    />

                    <Bar
                      dataKey="windSpeed"
                      name="Wind speed"
                      fill={COLORS.purple}
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              title="Cloud Cover Analysis"
              description="Mean cloud cover as a percentage."
            />

            {chartData.length === 0 ? (
              <EmptyState message="Cloud cover chart requires weather records." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                    />

                    <Tooltip
                      formatter={(value) => [
                        `${formatNumber(value, 0)}%`,
                        "Cloud cover",
                      ]}
                    />

                    <Area
                      type="monotone"
                      dataKey="cloudCover"
                      name="Cloud cover"
                      stroke={COLORS.blue}
                      fill={COLORS.blue}
                      fillOpacity={0.12}
                      strokeWidth={2.5}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}

      </div>
    </div>
  );
}
