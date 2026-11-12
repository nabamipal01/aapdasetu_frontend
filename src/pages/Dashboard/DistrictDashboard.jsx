import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Package,
  RefreshCw,
  Users,
  Clock,
  MapPin,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getUserDistrictId, getUserRole } from "../../utils/roles";
import {
  listIncidents,
  listTasks,
  listVolunteers,
  getInventoryOverview,
  getDistrict,
} from "../../services";

const EMPTY_SUMMARY = {
  incidents: [],
  tasks: [],
  volunteers: [],
  inventory: null,
};


function extractItems(response, resourceType) {
  if (Array.isArray(response)) {
    return response;
  }

  const data = response?.data;

  // Handle the actual API response format.
  const resourceKey = {
    incidents: "incidents",
    tasks: "tasks",
    volunteers: "volunteers",
  }[resourceType];

  if (resourceKey && Array.isArray(data?.[resourceKey])) {
    return data[resourceKey];
  }

  // Support other common response formats.
  const candidates = [
    response?.items,
    response?.results,
    response?.incidents,
    response?.tasks,
    response?.volunteers,
    data?.items,
    data?.results,
    data?.incidents,
    data?.tasks,
    data?.volunteers,
    data?.data,
    data,
  ];

  return candidates.find(Array.isArray) ?? [];
}

function extractObject(response) {
  if (!response || typeof response !== "object") return null;

  if (response.data && !Array.isArray(response.data)) {
    return response.data;
  }

  return response;
}

function getIncidentStatus(incident) {
  return String(incident?.status ?? "").toLowerCase();
}

function getTaskStatus(task) {
  return String(task?.status ?? "").toLowerCase();
}

function getIncidentDistrictId(incident) {
  return (
    incident?.district_id ??
    incident?.districtId ??
    incident?.district?.id ??
    incident?.region_id ??
    null
  );
}

function getTaskDistrictId(task) {
  return (
    task?.district_id ??
    task?.districtId ??
    task?.incident?.district_id ??
    task?.incident?.districtId ??
    task?.incident?.district?.id ??
    null
  );
}

function getVolunteerDistrictId(volunteer) {
  return (
    volunteer?.district_id ??
    volunteer?.districtId ??
    volunteer?.district?.id ??
    null
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("en-IN");
}

function StatusBadge({ status }) {
  const normalized = String(status || "unknown")
    .replaceAll("_", " ")
    .toLowerCase();

  const styles = {
    resolved: "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",
    closed: "bg-green-100 text-green-800",
    reported: "bg-red-100 text-red-800",
    critical: "bg-red-100 text-red-800",
    acknowledged: "bg-blue-100 text-blue-800",
    in_progress: "bg-blue-100 text-blue-800",
    assigned: "bg-amber-100 text-amber-800",
    pending: "bg-amber-100 text-amber-800",
    cancelled: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        styles[String(status || "").toLowerCase()] ||
        "bg-gray-100 text-gray-700"
      }`}
    >
      {normalized}
    </span>
  );
}

function StatCard({ title, value, description, icon: Icon, color }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatNumber(value)}
          </p>
          <p className="mt-2 text-xs text-gray-500">{description}</p>
        </div>

        <div className={`rounded-lg p-3 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description, href, linkText }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>

      {href && (
        <Link
          to={href}
          className="text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          {linkText || "View all"} →
        </Link>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

export default function DistrictDashboard() {
  const { user, isLoggedIn } = useAuth();

  const districtId = getUserDistrictId(user);
  const role = getUserRole(user);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
const [districtName, setDistrictName] = useState("");

useEffect(() => {
  if (!districtId) return;

  const fetchDistrict = async () => {
    try {
      const response = await getDistrict({id: districtId});
      const district =
        response?.data?.district ??
        response?.data?.data ??
        response?.data;

      setDistrictName(
        district?.district_name ??
        district?.name ??
        ""
      );
    } catch (error) {
      console.error("Failed to fetch district:", error);
    }
  };

  fetchDistrict();
}, [districtId]);

  const loadDashboard = useCallback(async () => {
    if (!isLoggedIn || !user) {
      setLoading(false);
      return;
    }

    if (role !== "district") {
      setError("This dashboard is only available to district users.");
      setLoading(false);
      return;
    }

    if (districtId == null || districtId === "") {
      setError(
        "Your account does not have a district ID. Please contact the administrator."
      );
      setLoading(false);
      return;
    }

    setError("");
    setRefreshing(true);

    try {
      /*
       * These calls use your existing service layer.
       *
       * district_id is sent as a filter, but the PHP endpoints must
       * independently authorize the user and enforce district scope.
       * Do not rely on client-side filtering for data security.
       */
      
const requests = [
  {
    name: "Incidents",
    promise: listIncidents({
      page: 1,
      per_page: 100,
      district_id: districtId,
    }),
  },
  {
    name: "Tasks",
    promise: listTasks({
      page: 1,
      per_page: 100,
      district_id: districtId,
    }),
  },
  {
    name: "Volunteers",
    promise: listVolunteers({
      page: 1,
      per_page: 100,
      district_id: districtId,
    }),
  },
  {
    name: "Inventory",
    promise: getInventoryOverview(),
  },
];

const results = await Promise.allSettled(
  requests.map(({ promise }) => promise)
);

results.forEach((result, index) => {
  if (result.status === "fulfilled") {
    console.log(
      `[District Dashboard] ${requests[index].name} response:`,
      result.value
    );
  } else {
    console.error(
      `[District Dashboard] ${requests[index].name} failed:`,
      result.reason?.response?.status,
      result.reason?.response?.data ?? result.reason?.message ?? result.reason
    );
  }
});

const [incidentsResult, tasksResult, volunteersResult, inventoryResult] =
  results;

const failures = results.filter(
  (result) => result.status === "rejected"
);


setSummary({
  incidents:
    incidentsResult.status === "fulfilled"
      ? extractItems(incidentsResult.value, "incidents")
      : [],

  tasks:
    tasksResult.status === "fulfilled"
      ? extractItems(tasksResult.value, "tasks")
      : [],

  volunteers:
    volunteersResult.status === "fulfilled"
      ? extractItems(volunteersResult.value, "volunteers")
      : [],

  inventory:
    inventoryResult.status === "fulfilled"
      ? extractObject(inventoryResult.value)
      : null,
});


if (failures.length === results.length) {
  setError(
    "Dashboard data could not be loaded. Check the API requests and your account permissions."
  );
} else if (failures.length > 0) {
  setError(
    "Some dashboard information could not be loaded. Check the browser console for the failing requests."
  );
} else {
  setError("");
}

    //   const results = await Promise.allSettled([
    //     listIncidents({
    //       page: 1,
    //       per_page: 100,
    //       district_id: districtId,
    //     }),
    //     listTasks({
    //       page: 1,
    //       per_page: 100,
    //       district_id: districtId,
    //     }),
    //     listVolunteers({
    //       page: 1,
    //       per_page: 100,
    //       district_id: districtId,
    //     }),
    //     getInventoryOverview(),
    //   ]);

    //   const [incidentsResult, tasksResult, volunteersResult, inventoryResult] =
    //     results;

    //   const failures = results.filter(
    //     (result) => result.status === "rejected"
    //   );

      setSummary({
        incidents:
          incidentsResult.status === "fulfilled"
            ? extractItems(incidentsResult.value)
            : [],
        tasks:
          tasksResult.status === "fulfilled"
            ? extractItems(tasksResult.value)
            : [],
        volunteers:
          volunteersResult.status === "fulfilled"
            ? extractItems(volunteersResult.value)
            : [],
        inventory:
          inventoryResult.status === "fulfilled"
            ? extractObject(inventoryResult.value)
            : null,
      });

      if (failures.length === results.length) {
        setError(
          "Dashboard data could not be loaded. Please try again or contact support."
        );
      } else if (failures.length > 0) {
        setError(
          "Some dashboard information could not be loaded. Available information is shown below."
        );
      }
    } catch (loadError) {
      console.error("District dashboard error:", loadError);
      setError("Unable to load district dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [districtId, isLoggedIn, role, user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /*
   * Filter the returned records only as a presentation safeguard.
   * Server-side authorization and filtering remain mandatory.
   */
  const incidents = useMemo(
    () =>
      summary.incidents.filter((incident) => {
        const recordDistrictId = getIncidentDistrictId(incident);
        return (
          recordDistrictId == null ||
          String(recordDistrictId) === String(districtId)
        );
      }),
    [districtId, summary.incidents]
  );

  const tasks = useMemo(
    () =>
      summary.tasks.filter((task) => {
        const recordDistrictId = getTaskDistrictId(task);
        return (
          recordDistrictId == null ||
          String(recordDistrictId) === String(districtId)
        );
      }),
    [districtId, summary.tasks]
  );

  const volunteers = useMemo(
    () =>
      summary.volunteers.filter((volunteer) => {
        const recordDistrictId = getVolunteerDistrictId(volunteer);
        return (
          recordDistrictId == null ||
          String(recordDistrictId) === String(districtId)
        );
      }),
    [districtId, summary.volunteers]
  );

  const incidentStats = useMemo(() => {
    const resolved = incidents.filter((incident) =>
      ["resolved", "closed"].includes(getIncidentStatus(incident))
    ).length;

    const active = incidents.filter(
      (incident) =>
        !["resolved", "closed", "cancelled"].includes(
          getIncidentStatus(incident)
        )
    ).length;

    const critical = incidents.filter(
      (incident) =>
        String(incident?.severity || "").toLowerCase() === "critical"
    ).length;

    return {
      total: incidents.length,
      active,
      resolved,
      critical,
    };
  }, [incidents]);

  const taskStats = useMemo(() => {
    const pending = tasks.filter((task) =>
      ["assigned", "in_progress", "completion_requested"].includes(
        getTaskStatus(task)
      )
    ).length;

    const completed = tasks.filter(
      (task) => getTaskStatus(task) === "completed"
    ).length;

    return { pending, completed };
  }, [tasks]);

  const activeVolunteers = volunteers.filter((volunteer) =>
    ["active", "deployed", "approved"].includes(
      String(volunteer?.status || "").toLowerCase()
    )
  ).length;

  const recentIncidents = [...incidents]
    .sort((a, b) => {
      const dateA = new Date(
        a?.reported_at || a?.created_at || a?.createdAt || 0
      ).getTime();
      const dateB = new Date(
        b?.reported_at || b?.created_at || b?.createdAt || 0
      ).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  const recentTasks = [...tasks]
    .sort((a, b) => {
      const dateA = new Date(a?.created_at || a?.createdAt || 0).getTime();
      const dateB = new Date(b?.created_at || b?.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  const inventoryQuantity = Number(
    summary.inventory?.total_quantity ??
      summary.inventory?.totalQuantity ??
      summary.inventory?.total_stock ??
      summary.inventory?.total_items ??
      0
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading district dashboard…
        </div>
      </div>
    );
  }

  if (role !== "district") {
    return (
      <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        This page is only available to district users.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              District Operations
            </div>

            <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            {districtName
                ? `${districtName} District Dashboard`
                : "District Dashboard"}
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              District incidents, response tasks, volunteers, and resources.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Incidents"
            value={incidentStats.total}
            description="Incidents returned by the API"
            icon={AlertTriangle}
            color="bg-red-100 text-red-700"
          />

          <StatCard
            title="Active Incidents"
            value={incidentStats.active}
            description="Not yet resolved or closed"
            icon={Clock}
            color="bg-amber-100 text-amber-700"
          />

          <StatCard
            title="Pending Tasks"
            value={taskStats.pending}
            description="Assigned or in progress"
            icon={ClipboardList}
            color="bg-blue-100 text-blue-700"
          />

          <StatCard
            title="Active Volunteers"
            value={activeVolunteers}
            description="Active, approved, or deployed"
            icon={Users}
            color="bg-green-100 text-green-700"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            title="Critical Incidents"
            value={incidentStats.critical}
            description="Incidents marked critical"
            icon={AlertTriangle}
            color="bg-red-100 text-red-700"
          />

          <StatCard
            title="Completed Tasks"
            value={taskStats.completed}
            description="Tasks marked completed"
            icon={CheckCircle2}
            color="bg-green-100 text-green-700"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader
              title="Recent Incidents"
              description="Latest incidents available to your district"
              href="/incident"
            />

            {recentIncidents.length === 0 ? (
              <EmptyState message="No incidents found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-gray-500">
                      <th className="px-3 py-3 font-medium">Incident</th>
                      <th className="px-3 py-3 font-medium">Severity</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Reported</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {recentIncidents.map((incident, index) => (
                      <tr
                        key={incident.id ?? incident.incident_id ?? index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-3 py-3">
                          <p className="font-medium text-gray-900">
                            {incident.title ||
                              incident.incident_type ||
                              `Incident ${incident.id ?? ""}`}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            ID: {incident.id ?? incident.incident_id ?? "—"}
                          </p>
                        </td>
                        <td className="px-3 py-3 capitalize">
                          {incident.severity || "—"}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={incident.status} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                          {formatDate(
                            incident.reported_at || incident.created_at
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <SectionHeader
              title="Recent Tasks"
              description="Latest response tasks"
              href="/task"
            />

            {recentTasks.length === 0 ? (
              <EmptyState message="No tasks found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-gray-500">
                      <th className="px-3 py-3 font-medium">Task</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Due date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {recentTasks.map((task, index) => (
                      <tr
                        key={task.id ?? task.task_id ?? index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-3 py-3">
                          <p className="font-medium text-gray-900">
                            {task.title || `Task ${task.id ?? ""}`}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            ID: {task.id ?? task.task_id ?? "—"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                          {formatDate(task.due_at || task.due_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-3 text-purple-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Volunteers</h2>
                <p className="text-sm text-gray-500">
                  Volunteers returned by the district query
                </p>
              </div>
            </div>

            <p className="mt-5 text-3xl font-bold text-gray-900">
              {formatNumber(volunteers.length)}
            </p>
            <p className="mt-1 text-sm text-gray-500">Total volunteers</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-3 text-orange-700">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Inventory</h2>
                <p className="text-sm text-gray-500">
                  Inventory overview returned by the API
                </p>
              </div>
            </div>

            <p className="mt-5 text-3xl font-bold text-gray-900">
              {formatNumber(inventoryQuantity)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Total quantity, if provided by the API
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}