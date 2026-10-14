import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { WEST_BENGAL_BOUNDS } from "../../constants/mapBounds";
 
export default function FitWestBengalBounds() {
  const map = useMap();
 
  useEffect(() => {
    map.fitBounds(WEST_BENGAL_BOUNDS, {
      padding: [20, 20],
    });
  }, [map]);
 
  return null;
}