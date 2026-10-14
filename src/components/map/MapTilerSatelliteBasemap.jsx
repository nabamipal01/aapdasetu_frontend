import WestBengalBasemap from "./WestBengalBasemap";

export default function MapTilerSatelliteBasemap({ onMapError }) {
    return <WestBengalBasemap onMapError={onMapError} satellite />;
}