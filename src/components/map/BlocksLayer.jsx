import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";

import { MAP_STYLES } from "../../constants/mapStyles";


export default function BlocksLayer({
    selectedDistrict,
    selectedSubdivision,
    databaseBlocks = [],
    onBlockSelect,
}) {

    const [blockData, setBlockData] =
        useState(null);

    const [error, setError] =
        useState("");


    /*
     * -------------------------------------------------------
     * Load Block GeoJSON
     * -------------------------------------------------------
     */

    useEffect(() => {

        const loadBlocks = async () => {

            try {

                setError("");

                const response =
                    await fetch(
                        "/gis/blocks.geojson"
                    );


                if (!response.ok) {

                    throw new Error(
                        `HTTP error: ${response.status}`
                    );

                }


                const data =
                    await response.json();


                if (
                    !data ||
                    !Array.isArray(data.features)
                ) {

                    throw new Error(
                        "Invalid blocks GeoJSON format."
                    );

                }


                console.log(
                    "Blocks GeoJSON loaded:",
                    data
                );


                setBlockData(data);

            } catch (error) {

                console.error(
                    "Blocks GeoJSON error:",
                    error
                );


                setError(
                    "Unable to load block map data."
                );

            }

        };


        loadBlocks();

    }, []);


    /*
     * -------------------------------------------------------
     * District selection required
     * -------------------------------------------------------
     */

    if (!selectedDistrict) {
        return null;
    }


    /*
     * -------------------------------------------------------
     * Subdivision selection required
     * -------------------------------------------------------
     */

    if (!selectedSubdivision) {
        return null;
    }


    /*
     * -------------------------------------------------------
     * Database district required
     * -------------------------------------------------------
     *
     * A district selected only from GeoJSON is NOT enough.
     *
     * Example:
     *
     * {
     *     id: null,
     *     dist_lgd: 309,
     *     name: "Darjeeling"
     * }
     *
     * Therefore blocks must not be displayed.
     */

    const hasDatabaseDistrict =
        selectedDistrict.id !== null &&
        selectedDistrict.id !== undefined;


    if (!hasDatabaseDistrict) {
        return null;
    }


    /*
     * -------------------------------------------------------
     * Database subdivision required
     * -------------------------------------------------------
     *
     * A subdivision selected from GeoJSON is also NOT enough.
     *
     * It must already exist in the database.
     */

    const hasDatabaseSubdivision =
        selectedSubdivision.id !== null &&
        selectedSubdivision.id !== undefined;


    if (!hasDatabaseSubdivision) {
        return null;
    }


    /*
     * -------------------------------------------------------
     * Loading
     * -------------------------------------------------------
     */

    if (!blockData) {
        return null;
    }


    /*
     * -------------------------------------------------------
     * Filter blocks
     * -------------------------------------------------------
     *
     * IMPORTANT:
     *
     * GeoJSON uses:
     *
     *     dist_lgd
     *     subdivision_id
     *
     * Database uses:
     *
     *     district.id
     *     subdivision.id
     *
     * NEVER mix these two ID systems.
     */

    const filteredBlockData = {

        ...blockData,

        features:
            blockData.features.filter(
                (feature) => {

                    const properties =
                        feature?.properties || {};


                    /*
                     * -------------------------------------------------
                     * GEOJSON DISTRICT ID
                     * -------------------------------------------------
                     */

                    const districtLgd =
                        properties.dist_lgd;


                    /*
                     * -------------------------------------------------
                     * GEOJSON SUBDIVISION ID
                     * -------------------------------------------------
                     */

                    const subdivisionLgd =
                        properties.subdivision_id;


                    /*
                     * -------------------------------------------------
                     * District match
                     * -------------------------------------------------
                     */

                    const districtMatches =
                        Number(districtLgd) ===
                        Number(
                            selectedDistrict.dist_lgd
                        );


                    /*
                     * -------------------------------------------------
                     * Subdivision match
                     * -------------------------------------------------
                     */

                    const subdivisionMatches =
                        String(
                            subdivisionLgd ?? ""
                        ).trim() ===
                        String(
                            selectedSubdivision
                                .subdivision_lgd ?? ""
                        ).trim();


                    return (
                        districtMatches &&
                        subdivisionMatches
                    );
                }
            ),
    };


    /*
     * -------------------------------------------------------
     * Block Feature
     * -------------------------------------------------------
     */

    const onEachBlock = (
        feature,
        layer
    ) => {

        const properties =
            feature?.properties || {};


        /*
         * -----------------------------------------------------
         * GEOJSON BLOCK ID
         * -----------------------------------------------------
         */

        const blockLgd =
            properties.block_lgd;


        /*
         * -----------------------------------------------------
         * GEOJSON DISTRICT ID
         * -----------------------------------------------------
         */

        const districtLgd =
            properties.dist_lgd;


        /*
         * -----------------------------------------------------
         * GEOJSON SUBDIVISION ID
         * -----------------------------------------------------
         */

        const subdivisionLgd =
            properties.subdivision_id;


        /*
         * -----------------------------------------------------
         * BLOCK NAME
         * -----------------------------------------------------
         */

        const blockName =
            properties.block_name ||
            "Unknown Block";


        /*
         * -----------------------------------------------------
         * DISTRICT NAME
         * -----------------------------------------------------
         */

        const districtName =
            properties.district ||
            selectedDistrict.name ||
            "";


        /*
         * -----------------------------------------------------
         * SUBDIVISION NAME
         * -----------------------------------------------------
         */

        const subdivisionName =
            properties.subdivision_name ||
            selectedSubdivision.name ||
            "";


        /*
         * -----------------------------------------------------
         * FIND EXISTING DATABASE BLOCK
         * -----------------------------------------------------
         *
         * Database relationship:
         *
         * district_id
         * subdivision_id
         * name
         *
         * GeoJSON block_lgd is NOT used to find
         * the database record because the two ID
         * systems are different.
         */

        const databaseBlock =
            databaseBlocks.find(
                (item) => {

                    const sameDistrict =
                        Number(
                            item.district_id
                        ) ===
                        Number(
                            selectedDistrict.id
                        );


                    const sameSubdivision =
                        Number(
                            item.subdivision_id
                        ) ===
                        Number(
                            selectedSubdivision.id
                        );


                    const sameName =
                        String(
                            item.name || ""
                        )
                            .trim()
                            .toLowerCase() ===
                        String(
                            blockName || ""
                        )
                            .trim()
                            .toLowerCase();


                    return (
                        sameDistrict &&
                        sameSubdivision &&
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
            blockName,
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

        layer.on({

            mouseover: (event) => {

                event.target.setStyle(
                    MAP_STYLES.block.hover
                );

                event.target.bringToFront();
            },


            mouseout: (event) => {

                event.target.setStyle(
                    MAP_STYLES.block.normal
                );
            },


            /*
             * -------------------------------------------------
             * Click
             * -------------------------------------------------
             */

            click: (event) => {

                const {
                    lat,
                    lng,
                } = event.latlng;


                /*
                 * -------------------------------------------------
                 * Parent district validation
                 * -------------------------------------------------
                 */

                if (
                    selectedDistrict.id === null ||
                    selectedDistrict.id === undefined
                ) {

                    alert(
                        "Please select an existing district first."
                    );

                    return;
                }


                /*
                 * -------------------------------------------------
                 * Parent subdivision validation
                 * -------------------------------------------------
                 */

                if (
                    selectedSubdivision.id === null ||
                    selectedSubdivision.id === undefined
                ) {

                    alert(
                        "Please select an existing subdivision first."
                    );

                    return;
                }


                /*
                 * -------------------------------------------------
                 * FINAL BLOCK OBJECT
                 * -------------------------------------------------
                 */

                const block = {

                    /*
                     * DATABASE BLOCK ID
                     *
                     * null = new block
                     */

                    id:
                        databaseBlock?.id ??
                        null,


                    /*
                     * GEOJSON BLOCK ID
                     */

                    block_lgd:
                        blockLgd,


                    /*
                     * DATABASE DISTRICT ID
                     */

                    districtId:
                        selectedDistrict.id,


                    /*
                     * GEOJSON DISTRICT ID
                     */

                    districtLgd:
                        districtLgd,


                    /*
                     * DISTRICT NAME
                     */

                    districtName:
                        selectedDistrict.name ||
                        districtName,


                    /*
                     * DATABASE SUBDIVISION ID
                     */

                    subdivisionId:
                        selectedSubdivision.id,


                    /*
                     * GEOJSON SUBDIVISION ID
                     */

                    subdivisionLgd:
                        subdivisionLgd,


                    /*
                     * SUBDIVISION NAME
                     */

                    subdivisionName:
                        selectedSubdivision.name ||
                        subdivisionName,


                    /*
                     * BLOCK NAME
                     */

                    name:
                        databaseBlock?.name ||
                        blockName,


                    /*
                     * ADDRESS
                     */

                    address:
                        databaseBlock?.address ||
                        "",


                    /*
                     * COORDINATES
                     */

                    latitude:
                        databaseBlock?.latitude ??
                        lat,

                    longitude:
                        databaseBlock?.longitude ??
                        lng,


                    /*
                     * ORIGINAL GEOJSON
                     */

                    properties,

                    feature,


                    /*
                     * EXISTING DATABASE RECORD
                     *
                     * null = block has not been
                     * created in database yet.
                     */

                    databaseBlock:
                        databaseBlock ||
                        null,
                };


                console.log(
                    "Selected block:",
                    block
                );


                onBlockSelect?.(
                    block
                );
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
     * -------------------------------------------------------
     * No blocks found
     * -------------------------------------------------------
     */

    if (
        filteredBlockData.features.length === 0
    ) {

        console.warn(
            "No blocks found for:",
            {
                district:
                    selectedDistrict.name,

                districtLgd:
                    selectedDistrict.dist_lgd,

                subdivision:
                    selectedSubdivision.name,

                subdivisionLgd:
                    selectedSubdivision.subdivision_lgd,
            }
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
                `blocks-${selectedDistrict.dist_lgd}-${selectedSubdivision.subdivision_lgd}`
            }
            data={
                filteredBlockData
            }
            style={
                MAP_STYLES.block.normal
            }
            onEachFeature={
                onEachBlock
            }
        />
    );
}