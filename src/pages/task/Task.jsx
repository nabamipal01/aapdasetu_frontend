import React, { useState, useEffect, useCallback } from "react";
import {
    ClipboardList,
    Plus,
    X,
    RefreshCw,
    MapPin,
    Pencil,
    Eye,
    CalendarDays,
    AlertTriangle,
    Trash2,
} from "lucide-react";

import {
    listTasks,
    createTask,
    updateTask,
    deleteTask,
} from "../../services";

import { useAuth } from "../../context/AuthContext";
import { listIncidents } from "../../services/incidentService";
import { listVolunteers } from "../../services/volunteerService";
import { listAgencies } from "../../services/agencyService";
import { isOperationalUser } from "../../utils/roles";
import { listActiveEndUsers } from "../../services/agencyService";

const EMPTY_FORM = {
    title: "",
    description: "",
    incident_id: "",
    assignee_type: "",
    assigned_to: "",
    priority: "medium",
    status: "assigned",
    due_at: "",
};

const PRIORITIES = ["low", "medium", "high", "critical"];

const STATUSES = [
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "cancelled",
];

const PRIORITY_STYLES = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
};

const STATUS_STYLES = {
    pending: "bg-slate-100 text-slate-700",
    assigned: "bg-blue-100 text-blue-700",
    in_progress: "bg-indigo-100 text-indigo-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

const extractRecords = (response, key) => {
    const candidates = [
        response?.data?.data?.records,
        response?.data?.records,
        response?.data?.data?.[key],
        response?.data?.[key],
        response?.[key],
        response?.data?.items,
        response?.data?.data?.items,
        response?.data?.data,
        response?.data,
    ];

    return candidates.find(Array.isArray) || [];
};

const getId = (value) => {
    if (value && typeof value === "object") {
        return value.id ?? value.user_id ?? value.account_id ?? "";
    }

    return value ?? "";
};

const normalizeTask = (task) => {
    const assignee =
        task.assigned_to && typeof task.assigned_to === "object"
            ? task.assigned_to
            : null;

    const incident =
        task.incident && typeof task.incident === "object"
            ? task.incident
            : null;

    const creator =
        task.created_by && typeof task.created_by === "object"
            ? task.created_by
            : null;

    return {
        ...task,
        id: task.id,
        title: task.title ?? "Untitled task",
        description: task.description ?? "",
        incident_id: getId(task.incident_id ?? incident?.id),
        incident_title:
            task.incident_title ??
            incident?.title ??
            incident?.incident_no ??
            (task.incident_id ? `Incident #${task.incident_id}` : "Not linked"),
        assigned_to: getId(task.assigned_to),
        assigned_to_name:
            assignee?.name ??
            task.assigned_to_name ??
            task.assignee_name ??
            "Unassigned",
        assigned_to_type:
            assignee?.type ??
            task.assigned_to_type ??
            task.assignee_type ??
            "",
        priority: String(task.priority ?? "medium").toLowerCase(),
        status: String(task.status ?? "pending").toLowerCase(),
        due_at: task.due_at ?? task.due_date ?? "",
        location:
            task.latitude != null &&
            task.longitude != null &&
            task.latitude !== "" &&
            task.longitude !== ""
                ? `Lat: ${task.latitude}, Lng: ${task.longitude}`
                : task.location ||
                  task.incident_location ||
                  incident?.location ||
                  incident?.address ||
                  "",
        created_by_name:
            creator?.name ??
            task.created_by_name ??
            task.creator_name ??
            (task.created_by != null ? `#User ${task.created_by}` : "Department"),
    };
};

const normalizeVolunteer = (volunteer) => ({
    // tasks.assigned_to stores the volunteer profile ID.
    id: String(volunteer.id),
    name:
        volunteer.name ??
        volunteer.full_name ??
        volunteer.volunteer_name ??
        "Unnamed volunteer",
    type: "volunteer",
});

const normalizeAgency = (agency) => ({
    // tasks.assigned_to stores the agency profile ID.
    id: String(agency.id),
    name: agency.contact_person
        ? `${agency.contact_person} — ${agency.name ?? "NGO"}`
        : agency.name ?? "Unnamed NGO",
    type: "ngo",
});

const isCredentialIssued = (record) => {
    const issuedValue = String(record?.credentials_issued ?? "")
        .trim()
        .toLowerCase();
    const hasIssuedFlag = ["1", "true", "yes", "issued"].includes(issuedValue);

    return Boolean(record?.user_id ?? record?.userId) || hasIssuedFlag;
};

const hasStoredCredentials = (storageKey) => {
    try {
        const stored = localStorage.getItem(storageKey);
        if (!stored) return false;
        if (stored === "issued") return true;

        const credentials = JSON.parse(stored);
        return credentials?.issued === true;
    } catch {
        return false;
    }
};

const hasVolunteerLogin = (volunteer) =>
    isCredentialIssued(volunteer) ||
    hasStoredCredentials(`volunteer-credentials-${volunteer.id}`);

const hasAgencyLogin = (agency) =>
    isCredentialIssued(agency) ||
    hasStoredCredentials(`agency-credentials-${agency.id}`);

const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(
        String(value).includes("T") ? value : String(value).replace(" ", "T")
    );

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatLabel = (value) =>
    String(value || "—")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());

const normalizeRole = (value) =>
    String(value ?? "")
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase();

export default function Task() {
    const { user } = useAuth();

    const role = normalizeRole(user?.role);
    const canManageTasks = ["super_admin", "admin"].includes(role);

    // Keep the existing volunteer and NGO assigned-task behavior.
    const isTaskOnly = isOperationalUser(user);

    const [tasks, setTasks] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [assignees, setAssignees] = useState([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingTaskId, setDeletingTaskId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const [assigneeType, setAssigneeType] = useState("");
    const [assigneeOptions, setAssigneeOptions] = useState([]);
    const [assigneeLoading, setAssigneeLoading] = useState(false);

    // Fetch tasks. Volunteers and NGO contacts retain their existing
    // assigned-task experience. Only managers load task-form options.
    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await listTasks({
                page: 1,
                limit: 50,
            });

            const records = extractRecords(response, "tasks");
            const normalized = records.map(normalizeTask);
            setTasks(normalized);

            if (!canManageTasks) {
                setIncidents([]);
                setAssignees([]);
                return;
            }

            const results = await Promise.allSettled([
                listIncidents({ page: 1, per_page: 100 }),
                listVolunteers({ status: "active", page: 1, per_page: 100 }),
                listAgencies({ status: "active", page: 1, per_page: 100 }),
            ]);

            const [incidentResult, volunteerResult, agencyResult] = results;

            if (incidentResult.status === "fulfilled") {
                setIncidents(extractRecords(incidentResult.value, "incidents"));
            } else {
                setIncidents([]);
            }

            const volunteers =
                volunteerResult.status === "fulfilled"
                    ? extractRecords(volunteerResult.value, "volunteers")
                    : [];

            const agencies =
                agencyResult.status === "fulfilled"
                    ? extractRecords(agencyResult.value, "agencies")
                    : [];

            const activeAssignees = [
                ...volunteers
                    .filter(hasVolunteerLogin)
                    .map(normalizeVolunteer),
                ...agencies
                    .filter(
                        (agency) =>
                            String(agency.type ?? "ngo").toLowerCase() === "ngo" &&
                            hasAgencyLogin(agency)
                    )
                    .map(normalizeAgency),
            ];

            const uniqueAssignees = Array.from(
                new Map(
                    activeAssignees.map((item) => [
                        `${item.type}:${item.id}`,
                        item,
                    ])
                ).values()
            );

            setAssignees(uniqueAssignees);

            if (
                incidentResult.status === "rejected" ||
                volunteerResult.status === "rejected" ||
                agencyResult.status === "rejected"
            ) {
                setError(
                    "Tasks loaded, but some incident or assignee options could not be loaded."
                );
            }
        } catch (err) {
            console.error("[Tasks] Fetch error:", err);
            setTasks([]);
            setError(err?.message || "Failed to load tasks.");
        } finally {
            setLoading(false);
        }
    }, [canManageTasks]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    useEffect(() => {
    if (!canManageTasks || !showForm || !assigneeType) {
        setAssigneeOptions([]);
        setAssigneeLoading(false);
        return;
    }

    let cancelled = false;

    const fetchAssignees = async () => {
        setAssigneeLoading(true);
        setAssigneeOptions([]);

        try {
            const response = await listActiveEndUsers(assigneeType);

            if (response?.success === false) {
                throw new Error(
                    response.message || "Failed to load assignees."
                );
            }

            const records = extractRecords(response, "records");

            const normalized = records.map((record) => {
                if (assigneeType === "volunteer") {
                    return {
                        id: String(record.id),
                        name:
                            record.name ??
                            record.full_name ??
                            record.volunteer_name ??
                            "Unnamed volunteer",
                    };
                }

                return {
                    id: String(record.id),
                    name: record.contact_person
                        ? `${record.contact_person} — ${record.name ?? "NGO"}`
                        : record.name ?? "Unnamed NGO",
                };
            });

            if (!cancelled) {
                setAssigneeOptions(normalized);
            }
        } catch (err) {
            if (!cancelled) {
                setAssigneeOptions([]);
                setError(
                    err?.message || "Failed to load active assignees."
                );
            }
        } finally {
            if (!cancelled) {
                setAssigneeLoading(false);
            }
        }
    };

    fetchAssignees();

    return () => {
        cancelled = true;
    };
}, [assigneeType, showForm, canManageTasks]);

    // Form helpers
    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const resetForm = () => {
    setForm(EMPTY_FORM);
    setAssigneeType("");
    setAssigneeOptions([]);
    setEditingTask(null);
    setShowForm(false);
};

    const openCreateForm = () => {
    if (!canManageTasks) return;

    setError("");
    setSuccess("");
    setEditingTask(null);
    setAssigneeType("");
    setAssigneeOptions([]);
    setForm(EMPTY_FORM);
    setShowForm(true);
};

    const openEditForm = (task) => {
        if (!canManageTasks) return;

        const existingType =
    String(task.assigned_to_type ?? "").toLowerCase();

const selectedType =
    existingType === "volunteer" ? "volunteer" : "agency";

setAssigneeType(selectedType);
setAssigneeOptions([]);

        setError("");
        setSuccess("");
        setEditingTask(task);

        setForm({
            title: task.title ?? "",
            description: task.description ?? "",
            incident_id: task.incident_id ? String(task.incident_id) : "",
            assigned_to: task.assigned_to ? String(task.assigned_to) : "",
            priority: task.priority ?? "medium",
            status: task.status ?? "assigned",
            due_at: task.due_at
                ? String(task.due_at).replace(" ", "T").slice(0, 16)
                : "",
        });

        setShowForm(true);
    };

    // Create / update
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!canManageTasks) return;

        if (!form.title.trim()) {
            setError("Task title is required.");
            return;
        }

        if (!form.assignee_type) {
    setError("Please select Volunteer or NGO Contact Person.");
    return;
}

        if (!form.assigned_to) {
            setError("Please select a volunteer or NGO.");
            return;
        }

        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    incident_id: form.incident_id
        ? Number(form.incident_id)
        : null,
    assigned_to: Number(form.assigned_to),
    assigned_to_type:
        form.assignee_type === "agency" ? "ngo" : "volunteer",
    priority: form.priority,
    status: form.status,
    due_at: form.due_at
        ? form.due_at.replace("T", " ") +
          (form.due_at.length === 16 ? ":00" : "")
        : null,
};

            if (editingTask) {
                await updateTask(editingTask.id, payload);
                setSuccess("Task updated successfully.");
            } else {
                await createTask(payload);
                setSuccess("Task created successfully.");
            }

            resetForm();
            await fetchTasks();
        } catch (err) {
            console.error("[Tasks] Save error:", err);
            setError(err?.message || "Failed to save task.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTask = async (task) => {
        if (!canManageTasks || task.id == null) return;
        if (!window.confirm(`Delete task "${task.title}"?`)) return;

        setDeletingTaskId(task.id);
        setError("");
        setSuccess("");

        try {
            const response = await deleteTask(task.id);
            if (response?.success === false) {
                throw new Error(response.message || "Failed to delete task.");
            }

            setTasks((currentTasks) =>
                currentTasks.filter((item) => String(item.id) !== String(task.id))
            );
            setSelectedTask((currentTask) =>
                currentTask?.id === task.id ? null : currentTask
            );
            setSuccess("Task deleted successfully.");
        } catch (err) {
            console.error("[Tasks] Delete error:", err);
            setError(err?.message || "Failed to delete task.");
        } finally {
            setDeletingTaskId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <ClipboardList size={30} className="text-blue-600" />

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {isTaskOnly
                                    ? "My Assigned Tasks"
                                    : canManageTasks
                                      ? "Task Management"
                                      : "Tasks"}
                            </h1>

                            <p className="mt-1 text-sm text-slate-500">
                                {isTaskOnly
                                    ? "View the tasks assigned to you."
                                    : canManageTasks
                                      ? "Create, assign, and manage operational tasks."
                                      : "View tasks available to your role."}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={fetchTasks}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={16}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>

                        {canManageTasks && (
                            <button
                                type="button"
                                onClick={openCreateForm}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <Plus size={17} />
                                Create Task
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div
                        role="status"
                        className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                    >
                        {success}
                    </div>
                )}

                {/* Create / edit form — super_admin and admin only */}
                {canManageTasks && (
                    <div
                        className={`grid transition-all duration-300 ease-in-out ${
                            showForm
                                ? "mb-6 grid-rows-[1fr] opacity-100"
                                : "pointer-events-none grid-rows-[0fr] opacity-0"
                        }`}
                        aria-hidden={!showForm}
                    >
                        <div className="min-h-0 overflow-hidden">
                            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                                <div className="mb-5 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            {editingTask ? "Edit Task" : "Create Task"}
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {editingTask
                                                ? "Update the task details below."
                                                : "Create and assign a new operational task."}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
                                        aria-label="Cancel and close task form"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label
                                                htmlFor="task-title"
                                                className="mb-1.5 block text-sm font-medium text-slate-700"
                                            >
                                                Task Title *
                                            </label>
                                            <input
                                                id="task-title"
                                                name="title"
                                                value={form.title}
                                                onChange={handleChange}
                                                required
                                                maxLength={255}
                                                placeholder="Enter task title"
                                                disabled={!showForm || submitting}
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            />
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="task-incident"
                                                className="mb-1.5 block text-sm font-medium text-slate-700"
                                            >
                                                Related Incident
                                            </label>
                                            <select
                                                id="task-incident"
                                                name="incident_id"
                                                value={form.incident_id}
                                                onChange={handleChange}
                                                disabled={!showForm || submitting}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            >
                                                <option value="">No linked incident</option>
                                                {incidents.map((incident) => (
                                                    <option key={incident.id} value={incident.id}>
                                                        {incident.incident_no
                                                            ? `${incident.incident_no} — `
                                                            : ""}
                                                        {incident.title ??
                                                            incident.name ??
                                                            `Incident #${incident.id}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        
<div>
  <label
    htmlFor="task-assignee-type"
    className="mb-1.5 block text-sm font-medium text-slate-700"
  >
    Assign User Type *
  </label>
  <select
    id="task-assignee-type"
    name="assignee_type"
    value={assigneeType}
    required
    disabled={!showForm || submitting}
    onChange={(event) => {
      const type = event.target.value;
      setAssigneeType(type);
      setForm((previous) => ({
        ...previous,
        assignee_type: type,
        assigned_to: "",
      }));
      setAssigneeOptions([]);
      setError("");
    }}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
  >
    <option value="">Select user type</option>
    <option value="volunteer">Volunteer</option>
    <option value="agency">NGO Contact Person</option>
  </select>
</div>

<div>
  <label
    htmlFor="task-assignee"
    className="mb-1.5 block text-sm font-medium text-slate-700"
  >
    Assign To *
  </label>
  <select
    id="task-assignee"
    name="assigned_to"
    value={form.assigned_to}
    onChange={handleChange}
    required
    disabled={
      !showForm ||
      submitting ||
      !assigneeType ||
      assigneeLoading
    }
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
  >
    <option value="">
      {!assigneeType
        ? "Select user type first"
        : assigneeLoading
          ? "Loading active users..."
          : assigneeOptions.length === 0
            ? "No active users available"
            : "Select an assignee"}
    </option>

    {assigneeOptions.map((assignee) => (
      <option key={assignee.id} value={assignee.id}>
        {assignee.name}
      </option>
    ))}
  </select>
</div>


                                        <div>
                                            <label
                                                htmlFor="task-priority"
                                                className="mb-1.5 block text-sm font-medium text-slate-700"
                                            >
                                                Priority
                                            </label>
                                            <select
                                                id="task-priority"
                                                name="priority"
                                                value={form.priority}
                                                onChange={handleChange}
                                                disabled={!showForm || submitting}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            >
                                                {PRIORITIES.map((priority) => (
                                                    <option key={priority} value={priority}>
                                                        {formatLabel(priority)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="task-status"
                                                className="mb-1.5 block text-sm font-medium text-slate-700"
                                            >
                                                Status
                                            </label>
                                            <select
                                                id="task-status"
                                                name="status"
                                                value={form.status}
                                                onChange={handleChange}
                                                disabled={!showForm || submitting}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            >
                                                {STATUSES.map((status) => (
                                                    <option key={status} value={status}>
                                                        {formatLabel(status)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="task-due"
                                                className="mb-1.5 block text-sm font-medium text-slate-700"
                                            >
                                                Due Date
                                            </label>
                                            <input
                                                id="task-due"
                                                type="datetime-local"
                                                name="due_at"
                                                value={form.due_at}
                                                onChange={handleChange}
                                                disabled={!showForm || submitting}
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="task-description"
                                            className="mb-1.5 block text-sm font-medium text-slate-700"
                                        >
                                            Task Description / Instructions
                                        </label>
                                        <textarea
                                            id="task-description"
                                            name="description"
                                            value={form.description}
                                            onChange={handleChange}
                                            rows={4}
                                            disabled={!showForm || submitting}
                                            placeholder="Describe the work and any important instructions..."
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                        />
                                    </div>

                                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            disabled={submitting}
                                            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {submitting
                                                ? "Saving..."
                                                : editingTask
                                                  ? "Update Task"
                                                  : "Create Task"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Task table */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                {isTaskOnly
                                    ? "My Assigned Tasks"
                                    : canManageTasks
                                      ? "All Tasks"
                                      : "Tasks"}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {loading
                                    ? "Loading tasks..."
                                    : `${tasks.length} task${tasks.length === 1 ? "" : "s"} found`}
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
                            <RefreshCw size={18} className="animate-spin" />
                            Loading tasks...
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="p-12 text-center">
                            <ClipboardList
                                size={36}
                                className="mx-auto mb-3 text-slate-300"
                            />

                            <p className="font-medium text-slate-700">
                                {isTaskOnly
                                    ? "No tasks assigned to you"
                                    : "No tasks found"}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                {isTaskOnly
                                    ? "Your assigned tasks will appear here."
                                    : canManageTasks
                                      ? "Create a task to get started."
                                      : "Tasks available to your role will appear here."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">SL.No</th>
                                        <th className="px-4 py-3 font-semibold">Task Title</th>
                                        <th className="px-4 py-3 font-semibold">Incident</th>

                                        {!isTaskOnly && (
                                            <th className="px-4 py-3 font-semibold">
                                                Assigned To
                                            </th>
                                        )}

                                        <th className="px-4 py-3 font-semibold">Priority</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold">Due Date</th>

                                        {!isTaskOnly && (
                                            <th className="px-4 py-3 font-semibold">Created By</th>
                                        )}

                                        <th className="px-4 py-3 text-right font-semibold">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {tasks.map((task, index) => (
                                        <tr
                                            key={task.id}
                                            className="transition-colors hover:bg-slate-50"
                                        >
                                            <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-600">
                                                {index + 1}
                                            </td>

                                            <td className="min-w-[180px] px-4 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {task.title}
                                                </p>

                                                {task.description && (
                                                    <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                                                        {task.description}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="px-4 py-4 text-slate-600">
                                                {task.incident_title}
                                            </td>

                                            {!isTaskOnly && (
                                                <td className="px-4 py-4 text-slate-700">
                                                    <p>{task.assigned_to_name}</p>
                                                    {task.assigned_to_type && (
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {formatLabel(task.assigned_to_type)}
                                                        </p>
                                                    )}
                                                </td>
                                            )}

                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                        PRIORITY_STYLES[task.priority] ??
                                                        "bg-slate-100 text-slate-700"
                                                    }`}
                                                >
                                                    {formatLabel(task.priority)}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                                                        STATUS_STYLES[task.status] ??
                                                        "bg-slate-100 text-slate-700"
                                                    }`}
                                                >
                                                    {formatLabel(task.status)}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <CalendarDays
                                                        size={14}
                                                        className="text-slate-400"
                                                    />
                                                    {formatDate(task.due_at)}
                                                </span>
                                            </td>

                                            {!isTaskOnly && (
                                                <td className="px-4 py-4 text-slate-600">
                                                    {task.created_by_name}
                                                </td>
                                            )}

                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedTask(task)}
                                                        title="View task details"
                                                        aria-label={`View task ${task.id}`}
                                                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {canManageTasks && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditForm(task)}
                                                                title="Edit task"
                                                                aria-label={`Edit task ${task.id}`}
                                                                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteTask(task)}
                                                                disabled={deletingTaskId === task.id}
                                                                title="Delete task"
                                                                aria-label={`Delete task ${task.id}`}
                                                                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {deletingTaskId === task.id ? (
                                                                    <span className="block h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                                                                ) : (
                                                                    <Trash2 size={16} />
                                                                )}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* View details — all roles that can view tasks */}
                {selectedTask && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
                        onClick={() => setSelectedTask(null)}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="task-detail-title"
                            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-start justify-between border-b border-slate-200 p-5">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Task #{selectedTask.id}
                                    </p>

                                    <h2
                                        id="task-detail-title"
                                        className="mt-1 text-xl font-bold text-slate-900"
                                    >
                                        {selectedTask.title}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedTask(null)}
                                    aria-label="Close task details"
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-5 p-5">
                                <div>
                                    <h3 className="mb-1 text-sm font-semibold text-slate-700">
                                        Description / Instructions
                                    </h3>

                                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                        {selectedTask.description || "No description provided."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs text-slate-500">Related Incident</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">
                                            {selectedTask.incident_title}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-500">Priority</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">
                                            {formatLabel(selectedTask.priority)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-500">Status</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">
                                            {formatLabel(selectedTask.status)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-500">Due Date</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">
                                            {formatDate(selectedTask.due_at)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-500">Assigned To</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">
                                            {selectedTask.assigned_to_name}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-500">Location</p>
                                        <p className="mt-1 inline-flex items-start gap-1 text-sm font-medium text-slate-800">
                                            <MapPin
                                                size={15}
                                                className="mt-0.5 shrink-0 text-slate-400"
                                            />
                                            {selectedTask.location || "Not specified"}
                                        </p>
                                    </div>

                                    {!isTaskOnly && (
                                        <div>
                                            <p className="text-xs text-slate-500">Created By</p>
                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                {selectedTask.created_by_name}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
                                {canManageTasks && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const task = selectedTask;
                                            setSelectedTask(null);
                                            openEditForm(task);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                        <Pencil size={15} />
                                        Edit Task
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setSelectedTask(null)}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
