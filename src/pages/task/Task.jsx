import React, { useState, useEffect, useCallback } from "react";
import { listTasks, createTask, updateTask, listIncidents } from "../../services";
import { ClipboardList, Plus, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const TASK_ONLY_ROLES = new Set(["volunteer", "ngo_contact", "ngo"]);

const STATUS_STYLES = {
  pending:     "bg-yellow-100 text-yellow-700",
  assigned:    "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-slate-100 text-slate-500",
};

const PRIORITY_STYLES = {
  low:      "bg-slate-100 text-slate-600",
  medium:   "bg-yellow-100 text-yellow-700",
  high:     "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const EMPTY_FORM = {
  incident_id: "",
  title: "",
  description: "",
  assigned_to: "",
  priority: "",
  task_type: "",
  due_at: "",
};

const getDefaultAssignedUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.id ? String(user.id) : "";
  } catch {
    return "";
  }
};

function Task() {
  const { user } = useAuth();
  // Volunteers and NGO contacts can only update their task status to in_progress.
  // They cannot create tasks or use any other status transitions.
  const isTaskOnly = TASK_ONLY_ROLES.has(user?.role);

  const [tasks, setTasks]           = useState([]);
  const [incidents, setIncidents]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(() => ({
    ...EMPTY_FORM,
    assigned_to: getDefaultAssignedUser(),
  }));

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [taskRes, incRes] = await Promise.allSettled([
        listTasks({ page: 1, per_page: 50 }),
        listIncidents({ page: 1, per_page: 200 }),
      ]);
      setTasks(
        taskRes.status === "fulfilled"
          ? (taskRes.value?.data?.tasks ?? taskRes.value?.data ?? [])
          : []
      );
      setIncidents(
        incRes.status === "fulfilled"
          ? (incRes.value?.data?.incidents ?? incRes.value?.data ?? [])
          : []
      );
    } catch (err) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, assigned_to: getDefaultAssignedUser() });
    setShowForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.incident_id || !form.title.trim()) {
      setError("Incident and Title are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        incident_id: Number(form.incident_id),
        title: form.title.trim(),
        ...(form.description && { description: form.description.trim() }),
        ...(form.assigned_to && { assigned_to: Number(form.assigned_to) }),
        ...(form.priority    && { priority: form.priority }),
        ...(form.task_type   && { task_type: form.task_type }),
        ...(form.due_at      && { due_at: form.due_at.replace("T", " ") }),
      };
      const res = await createTask(payload);
      setTasks((prev) => [res.data, ...prev]);
      setSuccess("Task created successfully.");
      resetForm();
    } catch (err) {
      setError(err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await updateTask(id, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    } catch (err) {
      setError(err.message || "Failed to update task status");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-indigo-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tasks</h1>
              <p className="text-sm text-slate-500">Track and manage response tasks</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchTasks}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <RefreshCw size={15} /> Refresh
            </button>
            {!isTaskOnly && (
              <button onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Create Task</>}
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {success && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
        {error   && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Create Form — hidden for volunteer / NGO roles */}
        {!isTaskOnly && (
        <div className={`grid transition-all duration-300 ease-in-out ${showForm ? "mb-6 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}>
          <div className="overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-semibold text-slate-900">Create New Task</h2>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Title *</label>
                    <input name="title" value={form.title} onChange={handleChange}
                      placeholder="e.g. Deploy rescue team to Zone B"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Incident *</label>
                    <select name="incident_id" value={form.incident_id} onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                      <option value="">
                        {incidents.length === 0 ? "No incidents available" : "Select incident"}
                      </option>
                      {incidents.map((inc) => (
                        <option key={inc.id} value={inc.id}>
                          {inc.incident_no ? `${inc.incident_no} — ` : ""}{inc.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Assign To (User ID)</label>
                    <input name="assigned_to" type="number" value={form.assigned_to} onChange={handleChange}
                      placeholder="e.g. 5"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Priority</label>
                    <select name="priority" value={form.priority} onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                      <option value="">Select priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Task Type</label>
                    <select name="task_type" value={form.task_type} onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                      <option value="">Select type</option>
                      <option value="sop">SOP</option>
                      <option value="operational">Operational</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Due At</label>
                    <input name="due_at" type="datetime-local" step="1" value={form.due_at} onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Description</label>
                    <textarea name="description" rows={3} value={form.description} onChange={handleChange}
                      placeholder="Task details..."
                      className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={resetForm}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? "Creating…" : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              All Tasks {!loading && <span className="ml-1 text-sm font-normal text-slate-500">({tasks.length})</span>}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">Loading tasks…</div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 size={40} className="mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">No tasks found</p>
              <p className="mt-1 text-sm text-slate-500">Create a task linked to an incident to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Title</th>
                    <th className="px-5 py-3 font-semibold">Incident</th>
                    <th className="px-5 py-3 font-semibold">Assigned To</th>
                    <th className="px-5 py-3 font-semibold">Task Type</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Due At</th>
                    <th className="px-5 py-3 font-semibold">Change Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800 max-w-xs truncate">{task.title}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {incidents.find((i) => i.id === task.incident_id)?.title
                          ? `${incidents.find((i) => i.id === task.incident_id)?.incident_no ?? ""} ${incidents.find((i) => i.id === task.incident_id)?.title}`.trim()
                          : (task.incident_id ?? "—")}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{task.assigned_to ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${PRIORITY_STYLES[task.priority] ?? "bg-slate-100 text-slate-600"}`}>
                          {task.task_type || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[task.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {task.status || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                        {task.due_at ? new Date(task.due_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={task.status || ""}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-400">
                          {isTaskOnly ? (
                            // Volunteers / NGO contacts may only mark a task as in_progress
                            <>
                              <option value="pending"     disabled>Pending</option>
                              <option value="assigned"    disabled>Assigned</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed"   disabled>Completed</option>
                              <option value="cancelled"   disabled>Cancelled</option>
                            </>
                          ) : (
                            <>
                              <option value="pending">Pending</option>
                              <option value="assigned">Assigned</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </>
                          )}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Task;
