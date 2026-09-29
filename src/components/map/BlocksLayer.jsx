import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";

function BlocksLayer({
  selectedDistrict,
  onBlockSelect,
}) {
  const [blockData, setBlockData] = useState(null);
  const [error, setError] = useState("");

  /*
   * -------------------------------------------------------
   * Load Block GeoJSON
   * -------------------------------------------------------
   */
  useEffect(() => {
    fetch("/gis/blocks.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP error: ${response.status}`
          );
        }

        return response.json();
      })
      .then((data) => {
        console.log(
          "Blocks GeoJSON:",
          data
        );

        if (
          !data ||
          !Array.isArray(data.features)
        ) {
          throw new Error(
            "Invalid blocks GeoJSON format."
          );
        }

        setBlockData(data);
      })
      .catch((error) => {
        console.error(
          "Blocks GeoJSON error:",
          error
        );

        setError(
          "Unable to load block map data."
        );
      });
  }, []);

  /*
   * -------------------------------------------------------
   * Filter Blocks According To Selected District
   * -------------------------------------------------------
   */
  const filteredBlockData =
    selectedDistrict && blockData
      ? {
          ...blockData,

          features:
            blockData.features.filter(
              (feature) => {
                const properties =
                  feature?.properties || {};

                return (
                  Number(
                    properties.dist_lgd
                  ) ===
                  Number(
                    selectedDistrict.dist_lgd ??
                      selectedDistrict.id
                  )
                );
              }
            ),
        }
      : null;

  /*
   * -------------------------------------------------------
   * Normal Block Style
   * -------------------------------------------------------
   */
  const normalStyle = {
    color: "#ea580c",
    weight: 1,
    fillColor: "#f97316",
    fillOpacity: 0.08,
  };

  /*
   * -------------------------------------------------------
   * Hover Block Style
   * -------------------------------------------------------
   */
  const hoverStyle = {
    color: "#c2410c",
    weight: 3,
    fillColor: "#f97316",
    fillOpacity: 0.30,
  };

  /*
   * -------------------------------------------------------
   * Block Events
   * -------------------------------------------------------
   */
  const onEachBlock = (
    feature,
    layer
  ) => {
    const properties =
      feature?.properties || {};

    const blockName =
      properties.block_name ||
      "Unknown Block";

    const blockId =
      properties.block_lgd;

    const districtId =
      properties.dist_lgd;

    const districtName =
      properties.district ||
      properties.dtname ||
      selectedDistrict?.name ||
      "";

    /*
     * Tooltip
     */
    layer.bindTooltip(
      blockName,
      {
        sticky: true,
        direction: "top",
      }
    );

    /*
     * Mouse Events
     */
    layer.on({
      mouseover: (event) => {
        event.target.setStyle(
          hoverStyle
        );

        event.target.bringToFront();
      },

      mouseout: (event) => {
        event.target.setStyle(
          normalStyle
        );
      },

      /*
       * ---------------------------------------------------
       * Block Click
       * ---------------------------------------------------
       */
      click: () => {
        /*
         * Get the actual polygon bounds.
         */
        const bounds =
          layer.getBounds();

        /*
         * Get the center of the polygon's
         * bounding box.
         */
        const center =
          bounds.getCenter();

        const block = {
          id: blockId,

          name: blockName,

          districtId: districtId,

          districtName: districtName,

          latitude: center.lat,

          longitude: center.lng,

          /*
           * Send bounds to the parent component.
           * BlocksLocation can use these to
           * fit the map to the selected block.
           */
          bounds: bounds,

          /*
           * Original GeoJSON properties
           */
          properties: properties,

          /*
           * Original GeoJSON feature
           */
          feature: feature,
        };

        console.log(
          "Selected block:",
          block
        );

        /*
         * Send selected block to
         * BlocksLocation.jsx
         */
        if (onBlockSelect) {
          onBlockSelect(block);
        }
      },
    });
  };

  /*
   * -------------------------------------------------------
   * Error
   * -------------------------------------------------------
   */
  if (error) {
    return (
      <div className="absolute left-4 top-4 z-[1000] rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 shadow">
        {error}
      </div>
    );
  }

  /*
   * No district selected
   */
  if (!selectedDistrict) {
    return null;
  }

  /*
   * GeoJSON still loading
   */
  if (!blockData) {
    return null;
  }

  /*
   * No filtered data
   */
  if (!filteredBlockData) {
    return null;
  }

  /*
   * No blocks found
   */
  if (
    filteredBlockData.features.length === 0
  ) {
    console.warn(
      "No blocks found for selected district:",
      selectedDistrict
    );

    return null;
  }

  /*
   * -------------------------------------------------------
   * Render
   * -------------------------------------------------------
   */
  return (
    <GeoJSON
      key={`blocks-${
        selectedDistrict.dist_lgd ??
        selectedDistrict.id
      }`}
      data={filteredBlockData}
      style={normalStyle}
      onEachFeature={onEachBlock}
    />
  );
}

export default BlocksLayer;