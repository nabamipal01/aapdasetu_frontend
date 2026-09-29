import { useEffect, useMemo, useState } from "react";
import { GeoJSON } from "react-leaflet";

function SubdivisionLayer({
    selectedDistrict,
    onSubdivisionSelect,
}) {
    const [subdivisionData, setSubdivisionData] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/gis/subdivisions.geojson")
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error: ${response.status}`);
                }

                return response.json();
            })
            .then((data) => {
                console.log(
                    "Subdivision GeoJSON:",
                    data
                );

                if (
                    !data ||
                    !Array.isArray(data.features)
                ) {
                    throw new Error(
                        "Invalid subdivision GeoJSON format."
                    );
                }
                setSubdivisionData(data);
            })
            .catch((error) => {
                console.error(
                    "Subdivision GeoJSON error:",
                    error
                );

                setError(
                    "Unable to load subdivision map data."
                );
            });
    }, []);

    /*
     * Filter before sending data to GeoJSON.
     */
    const filteredSubdivisionData = useMemo(() => {
        if (!subdivisionData) {
            return null;
        }

        if (!selectedDistrict) {
            return null;
        }

        console.log(
            "Filtering subdivisions for district:",
            selectedDistrict
        );

        const selectedDistrictId =
            Number(
                selectedDistrict.dist_lgd ??
                selectedDistrict.id
            );

        console.log(
            "Selected dist_lgd:",
            selectedDistrictId
        );

        if (Number.isNaN(selectedDistrictId)) {
            console.error(
                "Invalid selected district ID:",
                selectedDistrict
            );

            return null;
        }

        const filteredFeatures =
            subdivisionData.features.filter((feature) => {

                const properties =
                    feature?.properties || {};

                const subdivisionDistrictId =
                    Number(
                        properties.dist_lgd
                    );

                return (
                    subdivisionDistrictId ===
                    selectedDistrictId
                );
            });

        console.log(
            "Number of subdivisions:",
            filteredFeatures.length
        );

        console.log(
            "Filtered subdivisions:",
            filteredFeatures
        );

        return {
            ...subdivisionData,
            features: filteredFeatures,
        };

    }, [
        subdivisionData,
        selectedDistrict,
    ]);

    const normalStyle = {
        color: "#16a34a",
        weight: 1,
        fillColor: "#22c55e",
        fillOpacity: 0.08,
    };

    const hoverStyle = {
        color: "#15803d",
        weight: 3,
        fillColor: "#22c55e",
        fillOpacity: 0.30,
    };

    // const selectedStyle = {
    //     color: "#166534",
    //     weight: 4,
    //     fillColor: "#22c55e",
    //     fillOpacity: 0.40,
    // };

    const onEachSubdivision = (feature, layer) => {
        const properties = feature.properties || {};

        /*
         * Change these property names according to
         * your actual subdistricts.geojson.
         */
        const subdivisionName =
            properties.subdivision_name ||
            "Unknown Subdivision";

        const subdivisionId =
            properties.subdivision_id;

        const districtId =
            properties.dist_lgd;

        // if (
        //     !selectedDistrict ||
        //     Number(districtId) !==
        //     Number(selectedDistrict.id)
        // ) {
        //     return;
        // }

        layer.bindTooltip(subdivisionName, {
            sticky: true,
            direction: "top",
        });

        layer.on({
            mouseover: (event) => {
                event.target.setStyle(hoverStyle);
                event.target.bringToFront();
            },

            mouseout: (event) => {
                event.target.setStyle(normalStyle);
            },

            click: () => {
                const bounds = layer.getBounds();
                const center = bounds.getCenter();

                const subdivision = {
                    id: subdivisionId,
                    name: subdivisionName,
                    districtId: districtId,
                    districtName: properties.dtname,
                    latitude: center.lat,
                    longitude: center.lng,
                    properties,
                    feature,
                };

                console.log(
                    "Selected subdivision:",
                    subdivision
                );

                if (onSubdivisionSelect) {
                    onSubdivisionSelect(subdivision);
                }
            },
        });
    };

    // --------------------------------------------------
    // Error
    // --------------------------------------------------
    if (error) {
        return (
            <div className="absolute left-4 top-4 z-[1000] rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 shadow">
                {error}
            </div>
        );
    }

    // --------------------------------------------------
    // No district selected
    // --------------------------------------------------
    if (!selectedDistrict) {
        return null;
    }

    // --------------------------------------------------
    // GeoJSON not loaded yet
    // --------------------------------------------------
    if (!subdivisionData) {
        return null;
    }

    // --------------------------------------------------
    // No matching subdivisions
    // --------------------------------------------------
    if (!filteredSubdivisionData) {
        return null;
    }

    // if (!subdivisionData) {
    //     return null;
    // }

    if (
        filteredSubdivisionData.features.length ===
        0
    ) {
        console.warn(
            "No subdivisions found for selected district."
        );

        return null;
    }

    // if (
    //     !selectedDistrict ||
    //     !filteredSubdivisionData
    // ) {
    //     return null;
    // }

    // return (
    //     <GeoJSON
    //         key={selectedDistrict.id}
    //         data={subdivisionData}
    //         style={normalStyle}
    //         onEachFeature={onEachSubdivision}
    //     />
    // );

    return (
        <GeoJSON
            key={`subdivision-${selectedDistrict.dist_lgd ?? selectedDistrict.id}`}
            data={filteredSubdivisionData}
            style={normalStyle}
            onEachFeature={onEachSubdivision}
        />
    );
}

export default SubdivisionLayer;