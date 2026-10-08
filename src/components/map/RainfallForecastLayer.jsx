import { useEffect, useRef, useState } from "react";
import { GeoJSON, WMSTileLayer } from "react-leaflet";
import useGeoJSONData from "../../hooks/useGeoJSONData";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const FORECAST_HOURS = 24;
const BHUVAN_FLOOD_WMS_URL = "https://bhuvan-ras2.nrsc.gov.in/cgi-bin/flood.exe";

function getDistrictName(feature) {
  const properties = feature?.properties || {};
  return (
    properties.dtname ||
    properties.district_name ||
    properties.district ||
    properties.name ||
    "Unknown District"
  );
}

function getPolygonCentroid(ring) {
  let crossSum = 0;
  let latitudeSum = 0;
  let longitudeSum = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [longitude, latitude] = ring[index];
    const [nextLongitude, nextLatitude] = ring[index + 1];
    const cross = longitude * nextLatitude - nextLongitude * latitude;
    crossSum += cross;
    longitudeSum += (longitude + nextLongitude) * cross;
    latitudeSum += (latitude + nextLatitude) * cross;
  }

  if (Math.abs(crossSum) < Number.EPSILON) {
    const points = ring.slice(0, -1);
    if (points.length === 0) {
      throw new Error("A district boundary has no usable coordinates.");
    }

    return points.reduce(
      (center, [longitude, latitude]) => ({
        latitude: center.latitude + latitude / points.length,
        longitude: center.longitude + longitude / points.length,
      }),
      { latitude: 0, longitude: 0 }
    );
  }

  return {
    longitude: longitudeSum / (3 * crossSum),
    latitude: latitudeSum / (3 * crossSum),
    weight: Math.abs(crossSum),
  };
}

function getFeatureCentroid(feature) {
  const geometry = feature?.geometry;
  const polygons =
    geometry?.type === "Polygon"
      ? [geometry.coordinates]
      : geometry?.type === "MultiPolygon"
        ? geometry.coordinates
        : [];

  if (polygons.length === 0) {
    throw new Error(`Unsupported district geometry for ${getDistrictName(feature)}.`);
  }

  const centroids = polygons.map((polygon) => getPolygonCentroid(polygon[0]));
  const totalWeight = centroids.reduce(
    (total, centroid) => total + (centroid.weight || 1),
    0
  );

  return centroids.reduce(
    (center, centroid) => ({
      latitude:
        center.latitude +
        (centroid.latitude * (centroid.weight || 1)) / totalWeight,
      longitude:
        center.longitude +
        (centroid.longitude * (centroid.weight || 1)) / totalWeight,
    }),
    { latitude: 0, longitude: 0 }
  );
}

function getRainfallColor(precipitationMm) {
  if (precipitationMm === undefined) return "#cbd5e1";
  if (precipitationMm === 0) return "#f1f5f9";
  if (precipitationMm < 2) return "#bfdbfe";
  if (precipitationMm < 10) return "#60a5fa";
  if (precipitationMm < 25) return "#facc15";
  return "#ef4444";
}

export default function RainfallForecastLayer({
  mapMode,
  historicalEventLayer,
  selectedDistrict,
  onDistrictSelect,
  onDistrictError,
  onForecastStatus,
  onHistoricalLayerError,
}) {
  const { data, error } = useGeoJSONData(
    "/gis/districts.geojson",
    "District"
  );
  const [rainfallByDistrict, setRainfallByDistrict] = useState({});
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const rainfallRef = useRef({});

  useEffect(() => {
    onDistrictError?.(error);
  }, [error, onDistrictError]);

  useEffect(() => {
    rainfallRef.current = rainfallByDistrict;
  }, [rainfallByDistrict]);

  useEffect(() => {
    onForecastStatus?.({
      loading: forecastLoading,
      error: forecastError,
      updatedAt,
      rainfallByDistrict,
    });
  }, [
    forecastLoading,
    forecastError,
    updatedAt,
    rainfallByDistrict,
    onForecastStatus,
  ]);

  useEffect(() => {
    if (!data?.features?.length) return undefined;

    const controller = new AbortController();

    async function loadForecast() {
      setForecastLoading(true);
      setForecastError("");
      setUpdatedAt("");

      try {
        const locations = data.features.map((feature) => ({
          id: feature?.properties?.dist_lgd,
          ...getFeatureCentroid(feature),
        }));
        const query = new URLSearchParams({
          latitude: locations.map(({ latitude }) => latitude.toFixed(4)).join(","),
          longitude: locations.map(({ longitude }) => longitude.toFixed(4)).join(","),
          hourly: "precipitation",
          forecast_hours: String(FORECAST_HOURS),
          timezone: "GMT",
        });
        const response = await fetch(`${FORECAST_URL}?${query}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Open-Meteo returned HTTP ${response.status}.`);
        }

        const results = await response.json();
        if (!Array.isArray(results) || results.length !== locations.length) {
          throw new Error("The rainfall forecast response did not include every district.");
        }

        const nextRainfall = {};
        results.forEach((result, index) => {
          const hourly = result?.hourly?.precipitation;
          if (
            !Array.isArray(hourly) ||
            hourly.length !== FORECAST_HOURS ||
            hourly.some((value) => value == null || !Number.isFinite(Number(value)))
          ) {
            throw new Error(
              `The rainfall forecast for ${getDistrictName(data.features[index])} is incomplete.`
            );
          }

          const districtId = locations[index].id;
          if (districtId == null) {
            throw new Error(`A district is missing its LGD identifier.`);
          }

          nextRainfall[String(districtId)] = hourly.reduce(
            (total, value) => total + Number(value),
            0
          );
        });

        if (!controller.signal.aborted) {
          setRainfallByDistrict(nextRainfall);
          setUpdatedAt(new Date().toISOString());
        }
      } catch (forecastLoadError) {
        if (forecastLoadError.name === "AbortError") return;
        console.error("Rainfall forecast error:", forecastLoadError);
        if (!controller.signal.aborted) {
          setForecastError(
            "Unable to load the 24-hour rainfall forecast. Please try again later."
          );
        }
      } finally {
        if (!controller.signal.aborted) setForecastLoading(false);
      }
    }

    loadForecast();
    return () => controller.abort();
  }, [data]);

  const handleEachDistrict = (feature, layer) => {
    const name = getDistrictName(feature);
    layer.bindTooltip(name, { sticky: true });
    layer.on("click", (event) => {
      const districtId = feature?.properties?.dist_lgd;
      onDistrictSelect?.({
        name,
        dist_lgd: districtId,
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        precipitationMm:
          districtId == null
            ? undefined
            : rainfallRef.current[String(districtId)],
      });
    });
  };

  const handleHistoricalTileError = () => {
    onHistoricalLayerError?.(
      "Unable to load this historical inundation layer from the Bhuvan WMS."
    );
  };

  if (!data) return null;

  return (
    <>
      {mapMode === "historical" && historicalEventLayer && (
        <WMSTileLayer
          url={BHUVAN_FLOOD_WMS_URL}
          layers={historicalEventLayer}
          format="image/png"
          transparent
          version="1.1.1"
          className="bhuvan-flood-red"
          attribution="Historical flood inundation: NRSC Bhuvan"
          eventHandlers={{ tileerror: handleHistoricalTileError }}
        />
      )}
      <GeoJSON
        data={data}
        style={(feature) => {
          const districtId = feature?.properties?.dist_lgd;
          const isSelected =
            selectedDistrict &&
            String(selectedDistrict.dist_lgd) === String(districtId);

          return {
            color: isSelected ? "#1d4ed8" : "#334155",
            weight: isSelected ? 2.5 : 1,
            fillColor:
              mapMode === "historical"
                ? "#ffffff"
                : getRainfallColor(
                  districtId == null
                    ? undefined
                    : rainfallByDistrict[String(districtId)]
                ),
            fillOpacity: mapMode === "historical" ? 0 : 0.78,
          };
        }}
        onEachFeature={handleEachDistrict}
      />
    </>
  );
}