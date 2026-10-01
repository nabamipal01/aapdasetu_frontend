import {
    MapContainer,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";


function LocationMap({
    children,
    center = [22.5726, 88.3639],
    zoom = 7,
}) {
    return (
        <div className="relative h-[600px] w-full">

            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                className="h-full w-full"
            >
                {children}
            </MapContainer>

        </div>
    );
}


export default LocationMap;