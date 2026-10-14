import apiFetch from "./api";

const IMD_ALERT_ENDPOINTS = {
    districtWarnings: "/api/imd/district-warnings.php",
    cycloneWind: "/api/imd/cyclone-wind.php",
    cycloneTrack: "/api/imd/cyclone-track.php",
};

export async function getImdAlerts({ signal } = {}) {
    const entries = Object.entries(IMD_ALERT_ENDPOINTS);
    const results = await Promise.allSettled(
        entries.map(([, endpoint]) =>
            apiFetch(endpoint, { method: "GET", signal })
        )
    );

    return Object.fromEntries(
        entries.map(([name], index) => [
            name,
            results[index].status === "fulfilled"
                ? { data: results[index].value, error: "" }
                : {
                    data: null,
                    error:
                        results[index].reason?.message ||
                        `Unable to load IMD ${name.replace(/([A-Z])/g, " $1").toLowerCase()}.`,
                },
        ])
    );
}