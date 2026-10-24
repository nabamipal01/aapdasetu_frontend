import { useEffect } from "react";

import { useMap } from "react-leaflet";

import { WEST_BENGAL_BOUNDS } from "../../constants/mapBounds";

 

export default function FitWestBengalBounds({ satellite = false }) {

  const map = useMap();

 

  useEffect(() => {

    map.setMaxZoom(satellite ? 19 : 12);

    map.fitBounds(WEST_BENGAL_BOUNDS, {

      padding: [20, 20],

      maxZoom: satellite ? 9 : 12,

    });

  }, [map, satellite]);

 

  return null;

}