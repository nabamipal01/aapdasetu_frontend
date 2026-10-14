import { useEffect, useState } from "react";
import { CircleMarker, GeoJSON, Popup } from "react-leaflet";
import L from "leaflet";
import useGeoJSONData from "../../hooks/useGeoJSONData";
import { getImdAlerts } from "../../services/IMDAlertService";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const ARRAY_KEYS = [
    "data",
    "result",
    "records",
    "items",
    "warnings",
    "districtWarnings",
    "districtwarning",
    "districts",
    "cycloneWind",
    "cyclone_wind",
    "cycloneTrack",
    "cyclone_track",
    "track",
    "tracks",
    "points",
    "features",
];

function getRecords(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    if (payload.type === "FeatureCollection" && Array.isArray(payload.features)) {
        return payload.features;
    }
    if (payload.type === "Feature") return [payload];

    for (const key of ARRAY_KEYS) {
        const nested = payload[key];
        if (Array.isArray(nested)) return nested;
        if (nested && typeof nested === "object") {
            const records = getRecords(nested);
            if (records.length > 0) return records;
        }
    }

    return [payload];
}

function getRecordProperties(record) {
    return record?.type === "Feature" ? record.properties || {} : record || {};
}

function normalizeDistrictName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findValue(record, keys) {
    for (const key of keys) {
        const value = record?.[key];
        if (value !== undefined && value !== null && String(value).trim()) {
            return value;
        }
    }
    return "";
}

function getWarningColor(warning) {
    const value = String(warning || "").toLowerCase();
    if (value.includes("red") || value.includes("extreme")) return "#dc2626";
    if (value.includes("orange") || value.includes("severe")) return "#f97316";
    if (value.includes("yellow") || value.includes("moderate")) return "#eab308";
    if (value.includes("green") || value.includes("watch")) return "#16a34a";
    return "#2563eb";
}

function getCoordinates(record) {
    const properties = getRecordProperties(record);
    const geometry = record?.geometry || properties.geometry;
    if (geometry?.type === "Point" && Array.isArray(geometry.coordinates)) {
        return geometry.coordinates;
    }

    const coordinates = findValue(properties, ["coordinates", "coordinate"]);
    if (
        Array.isArray(coordinates) &&
        coordinates.length >= 2 &&
        Number.isFinite(Number(coordinates[0])) &&
        Number.isFinite(Number(coordinates[1]))
    ) {
        return [Number(coordinates[0]), Number(coordinates[1])];
    }

    const latitude = findValue(properties, [
        "latitude",
        "lat",
        "LAT",
        "Latitude",
        "LATITUDE",
    ]);
    const longitude = findValue(properties, [
        "longitude",
        "lon",
        "lng",
        "LONG",
        "Longitude",
        "LONGITUDE",
    ]);
    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
        return [Number(longitude), Number(latitude)];
    }

    return null;
}

function toFeatureCollection(payload, layerName, isTrack = false) {
    if (payload?.type === "FeatureCollection" && Array.isArray(payload.features)) {
        return payload;
    }
    if (payload?.type === "Feature" && payload.geometry) {
        return { type: "FeatureCollection", features: [payload] };
    }

    const records = getRecords(payload);
    const features = records
        .map((record) => {
            const properties = getRecordProperties(record);
            if (record?.geometry?.type && record.geometry.coordinates) {
                return record;
            }

            const coordinates = getCoordinates(record);
            if (
                !coordinates ||
                !Number.isFinite(Number(coordinates[0])) ||
                !Number.isFinite(Number(coordinates[1]))
            ) {
                return null;
            }

            return {
                type: "Feature",
                properties: { ...properties, alertSource: layerName },
                geometry: {
                    type: "Point",
                    coordinates: [Number(coordinates[0]), Number(coordinates[1])],
                },
            };
        })
        .filter(Boolean);

    if (
        isTrack &&
        features.length > 1 &&
        features.every(({ geometry }) => geometry.type === "Point")
    ) {
        const trackCoordinates = features.map(
            ({ geometry }) => geometry.coordinates
        );
        return {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: { name: "Cyclone track" },
                    geometry: { type: "LineString", coordinates: trackCoordinates },
                },
                ...features,
            ],
        };
    }

    return { type: "FeatureCollection", features };
}

function getDistrictCenter(feature) {
    const bounds = L.geoJSON(feature).getBounds();
    return bounds.isValid() ? bounds.getCenter() : null;
}

function getDistrictWarnings(payload, districts) {
    const records = getRecords(payload);
    return records.flatMap((record, recordIndex) => {
        const warning = getRecordProperties(record);
        const districtName = findValue(warning, [
            "district",
            "district_name",
            "districtName",
            "districtname",
            "dtname",
            "name",
        ]);
        const districtId = findValue(warning, [
            "dist_lgd",
            "district_id",
            "districtId",
            "district_code",
            "lgd_code",
            "id",
        ]);
        const district = districts.find((feature) => {
            const properties = feature.properties || {};
            const matchesId =
                districtId &&
                [properties.dist_lgd, properties.district_id, properties.id]
                    .filter((value) => value != null)
                    .some((value) => String(value) === String(districtId));
            const names = [
                properties.dtname,
                properties.district_name,
                properties.name,
            ].map(normalizeDistrictName);
            return matchesId || (districtName && names.includes(normalizeDistrictName(districtName)));
        });

        if (!district) return [];
        const center = getDistrictCenter(district);
        if (!center) return [];

        return [{
            key: `${districtId || districtName}-${recordIndex}`,
            districtName: district.properties?.dtname || districtName,
            warning: findValue(warning, [
                "warning",
                "warning_text",
                "warningText",
                "warning_level",
                "warningLevel",
                "warning_type",
                "warningType",
                "alert",
                "level",
                "color",
            ]) || "District warning",
            details: findValue(warning, [
                "description",
                "message",
                "warning_message",
                "warningMessage",
                "details",
            ]),
            position: center,
        }];
    });
}

function getFeaturePopup(feature) {
    const properties = getRecordProperties(feature);
    const title = findValue(properties, [
        "name",
        "title",
        "eventname",
        "alertSource",
    ]) || "IMD alert";
    const detail = findValue(properties, [
        "warning",
        "warning_text",
        "warningText",
        "description",
        "message",
        "wind_speed",
        "windSpeed",
        "speed",
    ]);
    return `${title}${detail ? `: ${detail}` : ""}`;
}

export default function ImdAlertsLayer({ onStatus }) {
    const { data: districtData, error: districtDataError } = useGeoJSONData(
        "/gis/districts.geojson",
        "District"
    );
    const [alerts, setAlerts] = useState({
        districtWarnings: [],
        cycloneWind: { type: "FeatureCollection", features: [] },
        cycloneTrack: { type: "FeatureCollection", features: [] },
    });

    useEffect(() => {
        let disposed = false;
        let controller;

        async function loadAlerts() {
            controller?.abort();
            controller = new AbortController();
            onStatus?.({ loading: true, error: "", counts: null });

            try {
                const results = await getImdAlerts({ signal: controller.signal });
                if (disposed || controller.signal.aborted) return;

                const districts =
                    districtData?.features?.filter(
                        (feature) =>
                            String(feature.properties?.stcode11) === "19" ||
                            String(feature.properties?.state_lgd) === "19"
                    ) || [];
                const districtWarnings =
                    results.districtWarnings.data && districts.length > 0
                        ? getDistrictWarnings(results.districtWarnings.data, districts)
                        : [];
                const cycloneWind = results.cycloneWind.data
                    ? toFeatureCollection(results.cycloneWind.data, "Cyclone wind")
                    : { type: "FeatureCollection", features: [] };
                const cycloneTrack = results.cycloneTrack.data
                    ? toFeatureCollection(results.cycloneTrack.data, "Cyclone track", true)
                    : { type: "FeatureCollection", features: [] };
                const errors = Object.entries(results)
                    .filter(([, result]) => result.error)
                    .map(([name, result]) => `${name}: ${result.error}`);
                const hasData = Object.values(results).some(
                    (result) => result.data !== null
                );
                if (
                    results.districtWarnings.data &&
                    getRecords(results.districtWarnings.data).length > 0 &&
                    districtWarnings.length === 0
                ) {
                    errors.push("IMD district warnings did not match any West Bengal district.");
                }
                if (
                    results.cycloneWind.data &&
                    getRecords(results.cycloneWind.data).length > 0 &&
                    cycloneWind.features.length === 0
                ) {
                    errors.push("IMD cyclone wind data has no supported map coordinates.");
                }
                if (
                    results.cycloneTrack.data &&
                    getRecords(results.cycloneTrack.data).length > 0 &&
                    cycloneTrack.features.length === 0
                ) {
                    errors.push("IMD cyclone track data has no supported map coordinates.");
                }

                setAlerts({ districtWarnings, cycloneWind, cycloneTrack });
                onStatus?.({
                    loading: false,
                    error: errors.join(" "),
                    counts: hasData
                        ? {
                            districtWarnings: districtWarnings.length,
                            cycloneWind: cycloneWind.features.length,
                            cycloneTrack: cycloneTrack.features.length,
                        }
                        : null,
                    updatedAt: new Date().toISOString(),
                });
            } catch (error) {
                if (error.name === "AbortError") return;

                console.error("IMD alert error:", error);
                if (!disposed) {
                    onStatus?.({
                        loading: false,
                        error: error.message || "Unable to load IMD alerts.",
                        counts: null,
                    });
                }
            }
        }

        if (districtData) loadAlerts();
        const refreshTimer = window.setInterval(() => {
            if (districtData) loadAlerts();
        }, REFRESH_INTERVAL_MS);

        return () => {
            disposed = true;
            controller?.abort();
            window.clearInterval(refreshTimer);
        };
    }, [districtData, onStatus]);

    useEffect(() => {
        if (districtDataError) {
            onStatus?.({
                loading: false,
                error: districtDataError,
                counts: null,
            });
        }
    }, [districtDataError, onStatus]);

    return (
        <>
            {alerts.districtWarnings.map((alert) => {
                const color = getWarningColor(alert.warning);
                return (
                    <CircleMarker
                        key={alert.key}
                        center={alert.position}
                        radius={9}
                        pathOptions={{
                            color: "#ffffff",
                            weight: 2,
                            fillColor: color,
                            fillOpacity: 0.95,
                        }}
                    >
                        <Popup>
                            <strong>{alert.districtName}</strong>
                            <div>{alert.warning}</div>
                            {alert.details && <div>{alert.details}</div>}
                            <small>India Meteorological Department</small>
                        </Popup>
                    </CircleMarker>
                );
            })}
            {[alerts.cycloneWind, alerts.cycloneTrack].map((featureCollection, index) => (
                featureCollection.features.length > 0 && (
                    <GeoJSON
                        key={index === 0 ? "imd-cyclone-wind" : "imd-cyclone-track"}
                        data={featureCollection}
                        pointToLayer={(_feature, latlng) => L.circleMarker(latlng, {
                            radius: 7,
                            color: "#ffffff",
                            weight: 2,
                            fillColor: index === 0 ? "#f97316" : "#7c3aed",
                            fillOpacity: 0.95,
                        })}
                        style={{
                            color: index === 0 ? "#f97316" : "#7c3aed",
                            weight: 3,
                            fillOpacity: 0.2,
                        }}
                        onEachFeature={(feature, layer) => {
                            layer.bindTooltip(getFeaturePopup(feature));
                        }}
                    />
                )
            ))}
        </>
    );
}