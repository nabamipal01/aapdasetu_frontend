import { useEffect, useState } from "react";

import { GeoJSON, Pane, TileLayer } from "react-leaflet";

 

const DISTRICTS_URL = "/gis/districts.geojson";

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;

const OUTSIDE_STATE_MASK = {

  type: "Feature",

  properties: {},

  geometry: {

    type: "Polygon",

    coordinates: [

      [

        [-180, -85],

        [180, -85],

        [180, 85],

        [-180, 85],

        [-180, -85],

      ],

    ],

  },

};

 

function createOutsideStateMask(districts) {

  const westBengalDistricts = districts.features.filter(

    (feature) =>

      String(feature?.properties?.stcode11) === "19" ||

      String(feature?.properties?.state_lgd) === "19"

  );

 

  if (westBengalDistricts.length === 0) {

    throw new Error("West Bengal district boundaries were not found.");

  }

 

  const stateRings = westBengalDistricts.flatMap((feature) => {

    const geometry = feature.geometry;

    const polygons =

      geometry?.type === "Polygon"

        ? [geometry.coordinates]

        : geometry?.type === "MultiPolygon"

          ? geometry.coordinates

          : [];

 

    return polygons

      .map((polygon) => polygon[0])

      .filter((ring) => Array.isArray(ring) && ring.length >= 4);

  });

 

  if (stateRings.length === 0) {

    throw new Error("West Bengal district boundaries have no usable polygons.");

  }

 

  return {

    type: "Feature",

    properties: {},

    geometry: {

      type: "Polygon",

      coordinates: [OUTSIDE_STATE_MASK.geometry.coordinates[0], ...stateRings],

    },

  };

}

 

export default function WestBengalBasemap({

  onMapError,

  satellite = false,

}) {

  const [mask, setMask] = useState(null);

  const [boundaryError, setBoundaryError] = useState("");

 

  useEffect(() => {

    let cancelled = false;

 

    async function loadDistrictBoundaries() {

      try {

        const response = await fetch(DISTRICTS_URL);

        if (!response.ok) {

          throw new Error(`District boundaries returned HTTP ${response.status}.`);

        }

 

        const districts = await response.json();

        if (!Array.isArray(districts?.features)) {

          throw new Error("District boundaries are not a valid GeoJSON FeatureCollection.");

        }

 

        const outsideStateMask = createOutsideStateMask(districts);

        if (!cancelled) {

          setMask(outsideStateMask);

          setBoundaryError("");

        }

      } catch (error) {

        console.error("West Bengal basemap boundary error:", error);

        if (!cancelled) {

          setBoundaryError("Unable to load West Bengal boundaries for the basemap.");

        }

      }

    }

 

    loadDistrictBoundaries();

    return () => {

      cancelled = true;

    };

  }, []);

 

  useEffect(() => {

    if (boundaryError) {

      onMapError?.(boundaryError);

    } else if (!satellite && !MAPTILER_API_KEY) {

      onMapError?.("Add VITE_MAPTILER_API_KEY to enable the MapTiler basemap.");

    } else {

      onMapError?.("");

    }

  }, [boundaryError, onMapError, satellite]);

 

  return (

    <>

      {(satellite || MAPTILER_API_KEY) && (

        <TileLayer

          url={

            satellite

              ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

              : `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`

          }

          attribution={

            satellite

              ? ""

              : ""

          }

          noWrap

          maxZoom={satellite ? 19 : 22}

          eventHandlers={{

            tileerror: () =>

              onMapError?.(

                satellite

                  ? "Unable to load Esri World Imagery satellite tiles."

                  : "Unable to load MapTiler street tiles. Check the API key and domain restrictions."

              ),

            tileload: () => {

              if (!boundaryError) onMapError?.("");

            },

          }}

        />

      )}

      {mask && (

        <Pane name="outsideStateMask" style={{ zIndex: 650, pointerEvents: "none" }}>

          <GeoJSON

            data={mask}

            interactive={false}

            style={{

              stroke: false,

              fillColor: "#f1f5f9",

              fillOpacity: 1,

            }}

          />

        </Pane>

      )}

    </>

  );

}