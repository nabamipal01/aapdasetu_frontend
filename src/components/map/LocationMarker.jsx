import { Marker, Popup, useMapEvents } from "react-leaflet";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { point, polygon, multiPolygon } from "@turf/helpers";

function LocationMarker({
    position,
    setPosition,
    selectedDistrict,
}) {
    useMapEvents({
        click(event) {
            // No district selected
            if (!selectedDistrict?.feature?.geometry) {
                return;
            }

            const { lat, lng } = event.latlng;

            const geometry =
                selectedDistrict.feature.geometry;

            const clickedPoint = point([
                lng,
                lat,
            ]);

            let isInside = false;

            if (geometry.type === "Polygon") {
                isInside = booleanPointInPolygon(
                    clickedPoint,
                    polygon(
                        geometry.coordinates
                    )
                );
            }

            if (geometry.type === "MultiPolygon") {
                isInside = booleanPointInPolygon(
                    clickedPoint,
                    multiPolygon(
                        geometry.coordinates
                    )
                );
            }

            // Outside selected district
            if (!isInside) {
                console.log(
                    "Clicked outside selected district"
                );

                return;
            }

            // Inside selected district
            setPosition({
                lat,
                lng,
            });
        },
    });

    if (!position) {
        return null;
    }

    return (
        <Marker
            position={[
                position.lat,
                position.lng,
            ]}
        >
            <Popup>
                <div className="text-sm">
                    <p className="font-semibold">
                        Selected Location
                    </p>

                    <p>
                        Latitude:{" "}
                        {position.lat.toFixed(6)}
                    </p>

                    <p>
                        Longitude:{" "}
                        {position.lng.toFixed(6)}
                    </p>
                </div>
            </Popup>
        </Marker>
    );
}

export default LocationMarker;