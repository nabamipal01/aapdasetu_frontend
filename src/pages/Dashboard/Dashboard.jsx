import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Package,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { listIncidents, listTasks, listVolunteers } from "../../services";

function StatCard({ title, value, description, icon: Icon, color, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${loading ? "text-slate-300 animate-pulse" : "text-slate-900"}`}>
            {loading ? "—" : value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats]     = useState({ incidents: 0, tasks: 0, volunteers: 0, resolved: 0 });
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [recentTasks, setRecentTasks]         = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      try {
        const [incRes, taskRes, volRes] = await Promise.allSettled([
          listIncidents({ page: 1, per_page: 100 }),
          listTasks({ page: 1, per_page: 100 }),
          listVolunteers({ status: "active", page: 1, per_page: 1 }),
        ]);

        if (cancelled) return;

        const incidents  = incRes.status  === "fulfilled" ? (incRes.value?.data?.incidents  ?? incRes.value?.data?.items ?? incRes.value?.data  ?? []) : [];
        const tasks      = taskRes.status === "fulfilled" ? (taskRes.value?.data?.tasks     ?? taskRes.value?.data?.items ?? taskRes.value?.data ?? []) : [];
        const volTotal   = volRes.status  === "fulfilled"
          ? (volRes.value?.data?.pagination?.total ?? volRes.value?.data?.volunteers?.length ?? volRes.value?.data?.length ?? 0)
          : 0;

        const resolved   = incidents.filter((i) => i.status === "resolved" || i.status === "closed").length;
        const pending    = tasks.filter((t) => t.status === "pending" || t.status === "assigned").length;

        setStats({
          incidents: incidents.length,
          tasks:     pending,
          volunteers: volTotal,
          resolved,
        });

        setRecentIncidents(incidents.slice(0, 5));
        setRecentTasks(tasks.slice(0, 5));
      } catch {
        // fail silently — stat cards will show 0
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  const SEVERITY_STYLES = {
    low:      "bg-green-100 text-green-700",
    medium:   "bg-yellow-100 text-yellow-700",
    high:     "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  const STATUS_STYLES = {
    reported:     "bg-blue-100 text-blue-700",
    acknowledged: "bg-purple-100 text-purple-700",
    in_progress:  "bg-indigo-100 text-indigo-700",
    resolved:     "bg-green-100 text-green-700",
    closed:       "bg-slate-100 text-slate-600",
    pending:      "bg-yellow-100 text-yellow-700",
    assigned:     "bg-blue-100 text-blue-700",
    completed:    "bg-green-100 text-green-700",
    cancelled:    "bg-slate-100 text-slate-500",
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Page title */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Live overview of disaster response operations</p>
        </div>

        {/* Stat cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Incidents"
            value={stats.incidents}
            description="Total incidents reported"
            icon={AlertTriangle}
            color="bg-orange-500"
            loading={loading}
          />
          <StatCard
            title="Resolved"
            value={stats.resolved}
            description="Incidents resolved / closed"
            icon={CheckCircle2}
            color="bg-green-500"
            loading={loading}
          />
          <StatCard
            title="Pending Tasks"
            value={stats.tasks}
            description="Tasks awaiting action"
            icon={Clock}
            color="bg-indigo-500"
            loading={loading}
          />
          <StatCard
            title="Volunteers"
            value={stats.volunteers}
            description="Approved volunteers"
            icon={Users}
            color="bg-blue-500"
            loading={loading}
          />
        </div>

        {/* Two column panels */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Recent Incidents */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <AlertTriangle size={16} className="text-orange-500" />
                Recent Incidents
              </h2>
              <a href="/incident" className="text-xs font-medium text-blue-600 hover:underline">View all →</a>
            </div>

            {loading ? (
              <div className="px-5 py-4 space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : recentIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle size={32} className="mb-2 text-slate-200" />
                <p className="text-sm text-slate-500">No incidents yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentIncidents.map((inc) => (
                  <li key={inc.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{inc.title}</p>
                      <p className="text-xs text-slate-400">{inc.incident_no} · {inc.incident_type}</p>
                    </div>
                    <div className="ml-3 flex shrink-0 gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${SEVERITY_STYLES[inc.severity] ?? "bg-slate-100 text-slate-600"}`}>
                        {inc.severity}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inc.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {inc.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Tasks */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <ClipboardList size={16} className="text-indigo-500" />
                Recent Tasks
              </h2>
              <a href="/task" className="text-xs font-medium text-blue-600 hover:underline">View all →</a>
            </div>

            {loading ? (
              <div className="px-5 py-4 space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList size={32} className="mb-2 text-slate-200" />
                <p className="text-sm text-slate-500">No tasks yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{task.title}</p>
                      <p className="text-xs text-slate-400">Incident #{task.incident_id}</p>
                    </div>
                    <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[task.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {task.status || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;
