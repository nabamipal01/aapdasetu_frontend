import { useEffect, useState } from "react";

function useGeoJSONData(url, label = "GeoJSON") {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(
                        `HTTP error: ${response.status}`
                    );
                }

                const result = await response.json();

                if (
                    !result ||
                    !Array.isArray(result.features)
                ) {
                    throw new Error(
                        `Invalid ${label} GeoJSON format.`
                    );
                }

                if (!cancelled) {
                    setData(result);
                }

            } catch (error) {
                console.error(
                    `${label} GeoJSON error:`,
                    error
                );

                if (!cancelled) {
                    setError(
                        `Unable to load ${label.toLowerCase()} map data.`
                    );
                }

            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            cancelled = true;
        };
    }, [url, label]);

    return {
        data,
        loading,
        error,
    };
}

export default useGeoJSONData;