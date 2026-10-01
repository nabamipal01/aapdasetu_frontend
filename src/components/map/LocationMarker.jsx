import {
    Marker,
    Popup,
} from "react-leaflet";


function LocationMarker({
    position,
    title,
    districtName,
}) {
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

                    {title && (
                        <p className="font-semibold">
                            {title}
                        </p>
                    )}

                    {districtName && (
                        <p>
                            District:{" "}
                            {districtName}
                        </p>
                    )}

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