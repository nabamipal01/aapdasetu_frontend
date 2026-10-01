import { GeoJSON } from "react-leaflet";

import {
    filterFeaturesByDistrict,
    getDistrictId,
} from "../../utils/map";

import useGeoJSONData from "../../hooks/useGEOJsonData";

import { attachHoverEvents } from "../../utils/leaflet";

import { MAP_STYLES } from "../../constants/mapStyles";


export default function SubdivisionLayer({
    selectedDistrict,

    databaseDistricts = [],

    databaseSubdivisions = [],

    onSubdivisionSelect,

    requireDatabaseDistrict = true,

    requireDatabaseSubdivision = false,
}) {

    /*
     * -------------------------------------------------------
     * Load subdivision GeoJSON
     * -------------------------------------------------------
     */

    const {
        data: subdivisionData,
        loading,
        error,
    } = useGeoJSONData(
        "/gis/subdivisions.geojson",
        "Subdivision"
    );


    /*
     * -------------------------------------------------------
     * No district selected
     * -------------------------------------------------------
     *
     * Subdivisions should not be displayed until
     * a district has been selected.
     */

    if (!selectedDistrict) {
        return null;
    }


    /*
     * -------------------------------------------------------
     * Verify database district
     * -------------------------------------------------------
     */

    const databaseDistrict =
        databaseDistricts.find(
            (district) =>
                Number(district.id) ===
                Number(selectedDistrict.id)
        );


    /*
     * -------------------------------------------------------
     * If database district is required
     * and does not exist, don't show subdivisions.
     * -------------------------------------------------------
     */

    if (
        requireDatabaseDistrict &&
        !databaseDistrict
    ) {
        return null;
    }


    /*
     * -------------------------------------------------------
     * Filter subdivisions by district
     * -------------------------------------------------------
     *
     * IMPORTANT:
     *
     * This filtering uses the GEOJSON district ID.
     *
     * selectedDistrict.dist_lgd
     *
     * NOT selectedDistrict.id
     */

    const filteredData =
        filterFeaturesByDistrict(
            subdivisionData,
            selectedDistrict
        );


    /*
     * -------------------------------------------------------
     * Feature
     * -------------------------------------------------------
     */

    const onEachSubdivision = (
        feature,
        layer
    ) => {

        const properties =
            feature?.properties || {};


        /*
         * -----------------------------------------------------
         * GEOJSON SUBDIVISION ID
         * -----------------------------------------------------
         */

        const subdivisionLgd =
            properties.subdivision_id ??
            properties.subdist_lgd ??
            properties.subdt_lgd ??
            properties.subdist_code ??
            properties.subdist_id;


        /*
         * -----------------------------------------------------
         * SUBDIVISION NAME
         * -----------------------------------------------------
         */

        const subdivisionName =
            properties.subdivision_name ||
            properties.subdist_name ||
            properties.subdtname ||
            properties.name ||
            "Unknown Subdivision";


        /*
         * -----------------------------------------------------
         * GEOJSON DISTRICT ID
         * -----------------------------------------------------
         */

        const districtLgd =
            properties.dist_lgd;


        /*
         * -----------------------------------------------------
         * GEOJSON DISTRICT NAME
         * -----------------------------------------------------
         */

        const districtName =
            properties.dtname ||
            properties.district ||
            properties.district_name ||
            selectedDistrict?.name ||
            "";


        /*
         * -----------------------------------------------------
         * FIND EXISTING DATABASE SUBDIVISION
         * -----------------------------------------------------
         *
         * We use:
         *
         * database district ID
         * +
         * subdivision name
         *
         * because subdivision GeoJSON ID and DB ID
         * are different ID systems.
         */

        const databaseSubdivision =
            databaseSubdivisions.find(
                (item) => {

                    const sameDistrict =
                        Number(
                            item.district_id
                        ) ===
                        Number(
                            selectedDistrict.id
                        );


                    const sameName =
                        String(
                            item.name || ""
                        )
                            .trim()
                            .toLowerCase() ===
                        String(
                            subdivisionName || ""
                        )
                            .trim()
                            .toLowerCase();


                    return (
                        sameDistrict &&
                        sameName
                    );
                }
            );


        /*
         * -----------------------------------------------------
         * Tooltip
         * -----------------------------------------------------
         */

        layer.bindTooltip(
            subdivisionName,
            {
                sticky: true,
                direction: "top",
            }
        );


        /*
         * -----------------------------------------------------
         * Hover
         * -----------------------------------------------------
         */

        attachHoverEvents(
            layer,
            MAP_STYLES.subdivision.normal,
            MAP_STYLES.subdivision.hover
        );


        /*
         * -----------------------------------------------------
         * Click
         * -----------------------------------------------------
         */

        layer.on(
            "click",
            (event) => {

                const {
                    lat,
                    lng,
                } = event.latlng;


                /*
                 * -------------------------------------------------
                 * Parent district must exist
                 * -------------------------------------------------
                 */

                if (
                    requireDatabaseDistrict &&
                    !databaseDistrict
                ) {

                    alert(
                        `District "${districtName}" is not available in the database yet. Please create the district first.`
                    );

                    return;
                }


                /*
                 * -------------------------------------------------
                 * Existing subdivision check
                 * -------------------------------------------------
                 *
                 * This is OPTIONAL because a new subdivision
                 * can be created.
                 */

                if (
                    requireDatabaseSubdivision &&
                    !databaseSubdivision
                ) {

                    alert(
                        `Subdivision "${subdivisionName}" is not available in the database yet. Please choose only a created subdivision.`
                    );

                    return;
                }


                /*
                 * -------------------------------------------------
                 * FINAL SUBDIVISION OBJECT
                 * -------------------------------------------------
                 */

                const subdivision = {

                    /*
                     * DATABASE SUBDIVISION ID
                     *
                     * null = new subdivision
                     */

                    id:
                        databaseSubdivision?.id ??
                        null,


                    /*
                     * GEOJSON SUBDIVISION ID
                     */

                    subdivision_lgd:
                        subdivisionLgd,


                    /*
                     * DATABASE DISTRICT ID
                     */

                    districtId:
                        databaseDistrict?.id ??
                        selectedDistrict?.id ??
                        null,


                    /*
                     * GEOJSON DISTRICT ID
                     */

                    districtLgd:
                        districtLgd,


                    /*
                     * DISTRICT NAME
                     */

                    districtName:
                        databaseDistrict?.name ||
                        selectedDistrict?.name ||
                        districtName,


                    /*
                     * SUBDIVISION NAME
                     */

                    name:
                        databaseSubdivision?.name ||
                        subdivisionName,


                    /*
                     * Existing address
                     */

                    address:
                        databaseSubdivision?.address ||
                        "",


                    /*
                     * Click coordinates
                     */

                    latitude:
                        databaseSubdivision?.latitude ??
                        lat,

                    longitude:
                        databaseSubdivision?.longitude ??
                        lng,


                    /*
                     * Original GeoJSON
                     */

                    properties,

                    feature,


                    /*
                     * Existing database record
                     */

                    databaseSubdivision:
                        databaseSubdivision ||
                        null,
                };


                console.log(
                    "Selected subdivision:",
                    subdivision
                );


                onSubdivisionSelect?.(
                    subdivision
                );
            }
        );
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
     * -------------------------------------------------------
     * Loading
     * -------------------------------------------------------
     */

    if (
        loading ||
        !filteredData
    ) {
        return null;
    }


    /*
     * -------------------------------------------------------
     * No subdivision found
     * -------------------------------------------------------
     */

    if (
        !filteredData.features ||
        filteredData.features.length === 0
    ) {

        console.warn(
            "No subdivisions found for district:",
            getDistrictId(
                selectedDistrict
            )
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
            key={
                `subdivision-${selectedDistrict.dist_lgd}`
            }
            data={filteredData}
            style={
                MAP_STYLES.subdivision.normal
            }
            onEachFeature={
                onEachSubdivision
            }
        />
    );
}