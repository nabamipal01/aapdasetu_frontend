import { useEffect } from "react";
import { useMap } from "react-leaflet";

import parseGeoraster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";

export default function FloodRasterLayer() {
    const map = useMap();

    useEffect(() => {
        let rasterLayer = null;

        const loadRaster = async () => {
            try {
                const response = await fetch(
                    "/gis/flood-heatmap.tif"
                );

                if (!response.ok) {
                    throw new Error("Failed to load GeoTIFF");
                }

                const arrayBuffer = await response.arrayBuffer();

                const georaster = await parseGeoraster(arrayBuffer);

                console.log("GeoRaster:", georaster);

                rasterLayer = new GeoRasterLayer({
                    georaster,
                    opacity: 0.6,
                    resolution: 256,
                });

                rasterLayer.addTo(map);

                // Wait until Leaflet has the raster layer
                // and then fit the map to the raster bounds.
                const bounds = rasterLayer.getBounds();

                if (bounds && bounds.isValid()) {
                    map.fitBounds(bounds, {
                        padding: [20, 20],
                    });
                }

            } catch (error) {
                console.error(
                    "GeoTIFF loading error:",
                    error
                );
            }
        };

        loadRaster();

        return () => {
            if (rasterLayer) {
                map.removeLayer(rasterLayer);
            }
        };

    }, [map]);

    return null;
}