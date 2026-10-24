import WestBengalBasemap from "./WestBengalBasemap";

 

export default function EsriWorldImageryBasemap({ onMapError }) {

    return <WestBengalBasemap onMapError={onMapError} satellite />;

}