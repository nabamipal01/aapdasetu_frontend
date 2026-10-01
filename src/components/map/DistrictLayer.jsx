import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GeoJSON } from "react-leaflet";

const DISTRICT_COLORS = [
  "#FDE68A",
  "#BFDBFE",
  "#BBF7D0",
  "#FBCFE8",
  "#DDD6FE",
  "#FED7AA",
  "#BAE6FD",
  "#D9F99D",
  "#FECACA",
  "#C7D2FE",
  "#A7F3D0",
  "#FDE2E2",
  "#E9D5FF",
  "#CCFBF1",
  "#FEF3C7",
  "#DBEAFE",
  "#DCFCE7",
  "#FCE7F3",
  "#E0E7FF",
  "#FFEDD5",
  "#CFFAFE",
  "#ECFCCB",
  "#F3E8FF",
];

const normalizeDistrictName = (name = "") => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+district$/i, "")
    .replace(/\s+/g, " ");
};

const getDistrictColor = (districtLgd) => {
  const numericId = Number(districtLgd);

  if (Number.isNaN(numericId)) {
    return DISTRICT_COLORS[0];
  }

  return DISTRICT_COLORS[
    Math.abs(numericId) % DISTRICT_COLORS.length
  ];
};

export default function DistrictLayer({
  selectedDistrict,
  onDistrictSelect,
  databaseDistricts = [],
  requireDatabaseDistrict = false,
}) {
  const [geoData, setGeoData] = useState(null);
  const databaseDistrictsRef = useRef(databaseDistricts);

  useLayoutEffect(() => {
    databaseDistrictsRef.current = databaseDistricts;
  }, [databaseDistricts]);

  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const response = await fetch("/gis/districts.geojson");

        if (!response.ok) {
          throw new Error("Failed to load districts GeoJSON");
        }

        const data = await response.json();
        setGeoData(data);
      } catch (error) {
        console.error("District GeoJSON error:", error);
      }
    };

    loadDistricts();
  }, []);

  if (!geoData) {
    return null;
  }

  const getFeatureStyle = (feature) => {
    const properties = feature?.properties || {};

    const districtLgd = properties.dist_lgd;
    const color = getDistrictColor(districtLgd);

    const isSelected =
      selectedDistrict &&
      String(selectedDistrict.dist_lgd) === String(districtLgd);

    return {
      color: isSelected ? "#1d4ed8" : "#739cb6",
      weight: isSelected ? 2 : 0.8,
      fillColor: color,
      fillOpacity: isSelected ? 0.35 : 0.65,
    };
  };

  const handleEachFeature = (feature, layer) => {
    const properties = feature?.properties || {};

    const districtLgd = properties.dist_lgd;

    const districtName =
      properties.dtname ||
      properties.district_name ||
      properties.district ||
      properties.name ||
      "Unknown District";

    layer.bindTooltip(districtName, {
      sticky: true,
      direction: "top",
    });

    layer.on({
      mouseover: (event) => {
        event.target.setStyle({
          color: "#142d9c",
          weight: 2.5,
          fillColor: getDistrictColor(districtLgd),
          fillOpacity: 0.85,
        });

        event.target.bringToFront();
      },

      mouseout: (event) => {
        event.target.setStyle(getFeatureStyle(feature));
      },

      click: (event) => {
        const { lat, lng } = event.latlng;

        /*
         * -------------------------------------------------------
         * District page
         * -------------------------------------------------------
         *
         * A district does NOT need to exist in the DB.
         *
         * The purpose of this page is to create the district.
         */
        if (!requireDatabaseDistrict) {
          onDistrictSelect?.({
            id: null,

            dist_lgd: districtLgd,

            name: districtName,

            latitude: lat,
            longitude: lng,

            properties,
            feature,
          });

          return;
        }

        /*
         * -------------------------------------------------------
         * Subdivision / Block page
         * -------------------------------------------------------
         *
         * These workflows require an existing DB district.
         */
        const normalizedGeoName =
          normalizeDistrictName(districtName);

        const databaseDistrict = databaseDistrictsRef.current.find(
          (district) =>
            normalizeDistrictName(district.name) ===
            normalizedGeoName
        );

        if (!databaseDistrict) {
          alert(
            `District "${districtName}" was not found in the database. Please choose only a created district.`
          );

          return;
        }

        onDistrictSelect?.({
          id: databaseDistrict.id,

          dist_lgd: districtLgd,

          name: databaseDistrict.name,

          latitude:
            databaseDistrict.latitude != null
              ? Number(databaseDistrict.latitude)
              : lat,

          longitude:
            databaseDistrict.longitude != null
              ? Number(databaseDistrict.longitude)
              : lng,

          properties,
          feature,

          databaseDistrict,
        });
      },
    });
  };

  return (
    <GeoJSON
      data={geoData}
      style={getFeatureStyle}
      onEachFeature={handleEachFeature}
    />
  );
}