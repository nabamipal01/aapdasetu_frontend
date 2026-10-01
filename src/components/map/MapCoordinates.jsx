function MapCoordinates({
    latitude,
    longitude,
}) {
    return (
        <div className="grid grid-cols-2 border-t border-gray-200">

            <div className="px-5 py-4">

                <p className="text-xs text-gray-500">
                    Latitude
                </p>

                <p className="mt-1 text-sm font-medium text-gray-800">
                    {latitude || "--"}
                </p>

            </div>


            <div className="border-l border-gray-200 px-5 py-4">

                <p className="text-xs text-gray-500">
                    Longitude
                </p>

                <p className="mt-1 text-sm font-medium text-gray-800">
                    {longitude || "--"}
                </p>

            </div>

        </div>
    );
}

export default MapCoordinates;