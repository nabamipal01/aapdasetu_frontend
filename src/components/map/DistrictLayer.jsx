import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";


const districtColors = [
    "#fecaca",
    "#fed7aa",
    "#fef08a",
    "#d9f99d",
    "#bbf7d0",
    "#a7f3d0",
    "#99f6e4",
    "#a5f3fc",
    "#bae6fd",
    "#bfdbfe",
    "#c7d2fe",
    "#ddd6fe",
    "#e9d5ff",
    "#f5d0fe",
    "#fbcfe8",
    "#fecdd3",
    "#e2e8f0",
    "#cbd5e1",
    "#d6d3d1",
    "#fde68a",
    "#bef264",
    "#86efac",
    "#67e8f9",
];


const getDistrictColor = (districtId) => {

    const numericId = Number(districtId);

    const index =
        Math.abs(numericId) %
        districtColors.length;

    return districtColors[index];
};


const getDistrictStyle = (districtId) => ({
    color: "#64748b",
    weight: 1,
    fillColor: getDistrictColor(districtId),
    fillOpacity: 0.65,
});


function DistrictLayer({
    selectedDistrict,
    onDistrictSelect,
}) {

    const [districtData, setDistrictData] =
        useState(null);


    /*
    |--------------------------------------------------------------------------
    | Load District GeoJSON
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        fetch("/gis/districts.geojson")

            .then((response) => {

                if (!response.ok) {
                    throw new Error(
                        `HTTP error: ${response.status}`
                    );
                }

                return response.json();

            })

            .then((data) => {

                setDistrictData(data);

            })

            .catch((error) => {

                console.error(
                    "District GeoJSON error:",
                    error
                );

            });

    }, []);


    /*
    |--------------------------------------------------------------------------
    | Styles
    |--------------------------------------------------------------------------
    */

    const selectedDistrictStyle = {
        color: "#1d4ed8",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 0.35,
    };


    const hoverStyle = {
        color: "#142d9c",
        weight: 2,
        fillColor: "#142d9c",
        fillOpacity: 0.5,
    };


    /*
    |--------------------------------------------------------------------------
    | District Feature Events
    |--------------------------------------------------------------------------
    */

    const onEachDistrict = (
        feature,
        layer
    ) => {

        const properties =
            feature?.properties || {};


        const districtName =
            properties.dtname ||
            "Unknown District";


        const districtId =
            properties.dist_lgd;


        const isSelected =
            selectedDistrict &&
            Number(selectedDistrict.id) ===
            Number(districtId);


        /*
        |--------------------------------------------------------------------------
        | Tooltip
        |--------------------------------------------------------------------------
        */

        layer.bindTooltip(
            districtName,
            {
                sticky: true,
                direction: "top",
            }
        );


        /*
        |--------------------------------------------------------------------------
        | Events
        |--------------------------------------------------------------------------
        */

        layer.on({

            /*
            |--------------------------------------------------------------------------
            | Mouse Over
            |--------------------------------------------------------------------------
            */

            mouseover: (event) => {

                /*
                 * If another district is selected,
                 * don't highlight other districts.
                 */

                if (
                    selectedDistrict &&
                    !isSelected
                ) {
                    return;
                }


                event.target.setStyle(
                    hoverStyle
                );

                event.target.bringToFront();

            },


            /*
            |--------------------------------------------------------------------------
            | Mouse Out
            |--------------------------------------------------------------------------
            */

            mouseout: (event) => {

                /*
                 * Don't modify other districts
                 * when one district is selected.
                 */

                if (
                    selectedDistrict &&
                    !isSelected
                ) {
                    return;
                }


                /*
                 * Restore selected style
                 */

                if (isSelected) {

                    event.target.setStyle(
                        selectedDistrictStyle
                    );

                } else {

                    event.target.setStyle(
                        getDistrictStyle(
                            districtId
                        )
                    );

                }

            },


            /*
            |--------------------------------------------------------------------------
            | District Click
            |--------------------------------------------------------------------------
            */

            click: (event) => {

                /*
                 * IMPORTANT:
                 *
                 * event.latlng contains the exact
                 * point where the user clicked.
                 */

                const {
                    lat,
                    lng,
                } = event.latlng;


                /*
                 * Create selected district object
                 */

                const district = {

                    id: districtId,

                    dist_lgd:
                        properties.dist_lgd,

                    name:
                        districtName,

                    /*
                     * Exact mouse click position
                     */

                    latitude: lat,

                    longitude: lng,

                    properties,

                    feature,

                };


                console.log(
                    "Selected district:",
                    district
                );


                /*
                 * Send district + clicked
                 * coordinates to parent
                 */

                onDistrictSelect?.(
                    district
                );

            },

        });

    };


    /*
    |--------------------------------------------------------------------------
    | Loading
    |--------------------------------------------------------------------------
    */

    if (!districtData) {
        return null;
    }


    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (

        <GeoJSON

            key={
                selectedDistrict?.id ??
                "all-districts"
            }

            data={districtData}

            style={(feature) => {

                const districtId =
                    feature?.properties?.dist_lgd;


                const isSelected =
                    selectedDistrict &&
                    Number(
                        selectedDistrict.id
                    ) ===
                    Number(districtId);


                if (isSelected) {

                    return {
                        ...selectedDistrictStyle,

                        /*
                         * Keep the individual
                         * district color.
                         */

                        fillColor:
                            getDistrictColor(
                                districtId
                            ),
                    };

                }


                return getDistrictStyle(
                    districtId
                );

            }}

            onEachFeature={
                onEachDistrict
            }

        />

    );
}


export default DistrictLayer;