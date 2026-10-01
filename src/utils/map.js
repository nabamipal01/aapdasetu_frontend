export const getDistrictId = (district) => {
    return Number(
        district?.dist_lgd ??
        district?.id
    );
};


export const getDistrictIdFromFeature = (feature) => {
    return Number(
        feature?.properties?.dist_lgd
    );
};


export const filterFeaturesByDistrict = (
    geoJson,
    selectedDistrict
) => {
    if (
        !geoJson ||
        !selectedDistrict
    ) {
        return null;
    }

    const districtId =
        getDistrictId(selectedDistrict);

    if (Number.isNaN(districtId)) {
        return null;
    }

    return {
        ...geoJson,

        features:
            geoJson.features.filter(
                (feature) =>
                    getDistrictIdFromFeature(
                        feature
                    ) === districtId
            ),
    };
};


export const getFeatureCenter = (layer) => {
    const bounds = layer.getBounds();

    return bounds.getCenter();
};


export const createLocationFromLayer = (
    layer
) => {
    const center =
        getFeatureCenter(layer);

    return {
        latitude: center.lat,
        longitude: center.lng,
        bounds: layer.getBounds(),
    };
};