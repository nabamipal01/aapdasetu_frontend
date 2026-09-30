import React, { useState, useEffect, useCallback } from "react";
import {
  listTasks,
  createTask,
  updateTask,
} from "../../services";
import {
  ClipboardList,
  Plus,
  X,
  RefreshCw,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// const TASK_ONLY_ROLES = new Set([
//   "volunteer",
//   "ngo_contact",
//   "ngo",
// ]);

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const PRIORITY_STYLES = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const TASK_TYPE_STYLES = {
  sop: "bg-purple-100 text-purple-700",
  manual: "bg-blue-100 text-blue-700",
  field: "bg-indigo-100 text-indigo-700",
  logistics: "bg-cyan-100 text-cyan-700",
  medical: "bg-pink-100 text-pink-700",
  other: "bg-slate-100 text-slate-600",
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
    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    return user?.id ? String(user.id) : "";
  } catch {
    return "";
  }
};

/**
 * Converts different API response formats into one
 * consistent frontend task object.
 *
 * list.php:
 *   incident_id
 *   incident_no
 *   incident_title
 *   assigned_to
 *   assigned_to_name
 *   created_by
 *   created_by_name
 *
 * get.php / update.php:
 *   incident: {}
 *   assigned_to: {}
 *   created_by: {}
 */
const normalizeTask = (task = {}) => {
  const incident = task.incident || {};
  const assignedUser =
    typeof task.assigned_to === "object"
      ? task.assigned_to
      : {};

  const createdBy =
    typeof task.created_by === "object"
      ? task.created_by
      : {};

  return {
    ...task,

    id: task.id,

    // Incident
    incident_id:
      task.incident_id ??
      incident.id ??
      null,

    incident_no:
      task.incident_no ??
      incident.incident_no ??
      "",

    incident_title:
      task.incident_title ??
      incident.title ??
      "",

    incident_type:
      task.incident_type ??
      incident.incident_type ??
      "",

    incident_status:
      task.incident_status ??
      incident.status ??
      "",

    incident_severity:
      task.incident_severity ??
      incident.severity ??
      "",

    latitude:
      task.latitude ??
      incident.latitude ??
      null,

    longitude:
      task.longitude ??
      incident.longitude ??
      null,

    // Assigned user
    assigned_to:
      typeof task.assigned_to === "object"
        ? task.assigned_to.id
        : task.assigned_to ?? null,

    assigned_to_name:
      task.assigned_to_name ??
      assignedUser.name ??
      "",

    assigned_to_email:
      task.assigned_to_email ??
      assignedUser.email ??
      "",

    assigned_to_phone:
      task.assigned_to_phone ??
      assignedUser.phone ??
      "",

    assigned_to_role:
      task.assigned_to_role ??
      assignedUser.role ??
      "",

    // Created by
    created_by:
      typeof task.created_by === "object"
        ? task.created_by.id
        : task.created_by ?? null,

    created_by_name:
      task.created_by_name ??
      createdBy.name ??
      "",

    created_by_email:
      task.created_by_email ??
      createdBy.email ??
      "",

    created_by_role:
      task.created_by_role ??
      createdBy.role ??
      "",

    // Task fields
    title: task.title ?? "",
    description: task.description ?? "",
    task_type: task.task_type ?? "",
    priority: task.priority ?? "",
    status: task.status ?? "",
    due_at: task.due_at ?? null,
    started_at: task.started_at ?? null,
    completed_at: task.completed_at ?? null,
    created_at: task.created_at ?? null,
    updated_at: task.updated_at ?? null,
  };
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(
    String(value).replace(" ", "T")
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const formatDateOnly = (value) => {
  if (!value) return "—";

  const date = new Date(
    String(value).replace(" ", "T")
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
};

function Task() {
  const { user } = useAuth();

  const isTaskOnly =
  user?.user_type === "volunteer" ||
  user?.user_type === "ngo_contact_person";

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    assigned_to: getDefaultAssignedUser(),
  }));

  /**
   * Fetch tasks.
   *
   * list.php response:
   *
   * {
   *   success: true,
   *   data: {
   *     tasks: [],
   *     pagination: {}
   *   }
   * }
   */
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await listTasks({
        page: 1,
        per_page: 50,
      });

      const rawTasks =
        response?.data?.tasks ??
        response?.tasks ??
        response?.data ??
        [];

      const normalizedTasks = Array.isArray(rawTasks)
        ? rawTasks.map(normalizeTask)
        : [];

      setTasks(normalizedTasks);
    } catch (err) {
      setError(
        err?.message || "Failed to load tasks"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      assigned_to: getDefaultAssignedUser(),
    });

    setShowForm(false);
  };

  /**
   * CREATE TASK
   */
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!form.incident_id || !form.title.trim()) {
      setError(
        "Incident and Title are required."
      );
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        incident_id: Number(form.incident_id),
        title: form.title.trim(),

        ...(form.description?.trim() && {
          description: form.description.trim(),
        }),

        ...(form.assigned_to && {
          assigned_to: Number(form.assigned_to),
        }),

        ...(form.priority && {
          priority: form.priority,
        }),

        ...(form.task_type && {
          task_type: form.task_type,
        }),

        ...(form.due_at && {
          due_at: form.due_at.replace("T", " "),
        }),
      };

      const response = await createTask(payload);

      /**
       * create.php returns:
       *
       * {
       *   success: true,
       *   data: {...}
       * }
       */
      const createdTask =
        response?.data?.data ??
        response?.data ??
        {};

      const normalizedTask =
        normalizeTask(createdTask);

      /**
       * The create response can be less detailed
       * than list.php. Refresh after creation so
       * the table gets the complete list format.
       */
      setTasks((prev) => [
        normalizedTask,
        ...prev.filter(
          (task) => task.id !== normalizedTask.id
        ),
      ]);

      setSuccess(
        "Task created successfully."
      );

      resetForm();

      // Get complete server representation.
      fetchTasks();
    } catch (err) {
      setError(
        err?.message ||
          "Failed to create task"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * UPDATE TASK STATUS
   */
  const handleStatusChange = async (
    id,
    newStatus
  ) => {
    const currentTask = tasks.find(
      (task) => task.id === id
    );

    if (!currentTask) return;

    // Don't send an unnecessary request.
    if (currentTask.status === newStatus) {
      return;
    }

    /**
     * Volunteers / NGO users can only move
     * their task to in_progress.
     */
    if (
      isTaskOnly &&
      newStatus !== "in_progress"
    ) {
      setError(
        "You can only change the task status to In Progress."
      );
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await updateTask(
        id,
        {
          status: newStatus,
        }
      );

      /**
       * update.php returns nested objects:
       *
       * {
       *   data: {
       *     incident: {},
       *     assigned_to: {},
       *     created_by: {}
       *   }
       * }
       */
      const updatedTask =
        response?.data?.data ??
        response?.data ??
        {};

      const normalizedTask =
        normalizeTask(updatedTask);

      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? {
                ...task,
                ...normalizedTask,
              }
            : task
        )
      );

      setSuccess(
        "Task status updated successfully."
      );
    } catch (err) {
      setError(
        err?.message ||
          "Failed to update task status"
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-[1800px]">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">
            <ClipboardList
              className="text-indigo-500"
              size={28}
            />

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Tasks
              </h1>

              <p className="text-sm text-slate-500">
                Track and manage response tasks
              </p>
            </div>
          </div>

          <div className="flex gap-2">

            <button
              type="button"
              onClick={fetchTasks}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            {!isTaskOnly && (
              <button
                type="button"
                onClick={() => {
                  setShowForm(!showForm);
                  setError("");
                  setSuccess("");
                }}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {showForm ? (
                  <>
                    <X size={15} />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Create Task
                  </>
                )}
              </button>
            )}

          </div>
        </div>

        {/* ALERTS */}

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CREATE FORM */}

        {!isTaskOnly && (
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              showForm
                ? "mb-6 grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0 pointer-events-none"
            }`}
          >
            <div className="overflow-hidden">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

                <h2 className="mb-5 text-lg font-semibold text-slate-900">
                  Create New Task
                </h2>

                <form onSubmit={handleCreate}>

                  <div className="grid gap-4 sm:grid-cols-2">

                    {/* TITLE */}

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Title *
                      </label>

                      <input
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="e.g. Deploy rescue team to Zone B"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    {/* INCIDENT ID */}

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Incident No *
                      </label>

                      <input
                        name="incident_id"
                        type="number"
                        value={form.incident_id}
                        onChange={handleChange}
                        placeholder="e.g. 1"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    {/* ASSIGNED USER */}

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Assign To (User ID)
                      </label>

                      <input
                        name="assigned_to"
                        type="number"
                        value={form.assigned_to}
                        onChange={handleChange}
                        placeholder="e.g. 5"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    {/* PRIORITY */}

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Priority
                      </label>

                      <select
                        name="priority"
                        value={form.priority}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">
                          Select priority
                        </option>

                        <option value="low">
                          Low
                        </option>

                        <option value="medium">
                          Medium
                        </option>

                        <option value="high">
                          High
                        </option>

                        <option value="critical">
                          Critical
                        </option>
                      </select>
                    </div>

                    {/* TASK TYPE */}

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Task Type
                      </label>

                      <select
                        name="task_type"
                        value={form.task_type}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">
                          Select type
                        </option>

                        <option value="sop">
                          SOP
                        </option>

                        <option value="manual">
                          Manual
                        </option>

                       
                      </select>
                    </div>

                    {/* DUE AT */}

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Due At
                      </label>

                      <input
                        name="due_at"
                        type="datetime-local"
                        step="1"
                        value={form.due_at}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    {/* DESCRIPTION */}

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Description
                      </label>

                      <textarea
                        name="description"
                        rows={3}
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Task details..."
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                  </div>

                  <div className="mt-5 flex justify-end gap-3">

                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting
                        ? "Creating..."
                        : "Create Task"}
                    </button>

                  </div>
                </form>

              </div>
            </div>
          </div>
        )}

        {/* TASK TABLE */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              All Tasks

              {!loading && (
                <span className="ml-1 text-sm font-normal text-slate-500">
                  ({tasks.length})
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">

              <CheckCircle2
                size={40}
                className="mb-3 text-slate-300"
              />

              <p className="font-medium text-slate-700">
                No tasks found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create a task linked to an incident to get started.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1700px] text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">

                  <tr>

                    <th className="px-5 py-3 font-semibold">
                      Task
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Incident
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Assigned To
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Task Type
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Priority
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Status
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Due At
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Started
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Completed
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Created By
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Created At
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Updated At
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Location
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Change Status
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {tasks.map((task) => (

                    <tr
                      key={task.id}
                      className="transition-colors hover:bg-slate-50"
                    >

                      {/* TASK */}

                      <td className="px-5 py-4">

                        <div className="max-w-xs">

                          <div className="font-semibold text-slate-800">
                            {task.title || "—"}
                          </div>

                          {task.description && (
                            <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {task.description}
                            </div>
                          )}

                          <div className="mt-1 text-xs text-slate-400">
                            ID: #{task.id}
                          </div>

                        </div>

                      </td>

                      {/* INCIDENT */}

                      <td className="px-5 py-4">

                        <div className="min-w-[180px]">

                          <div className="font-medium text-slate-700">
                            {task.incident_title ||
                              "—"}
                          </div>

                          <div className="text-xs text-slate-500">
                            {task.incident_no ||
                              `Incident #${task.incident_id}`}
                          </div>

                          {task.incident_type && (
                            <div className="mt-1 text-xs capitalize text-slate-400">
                              Type:{" "}
                              {task.incident_type}
                            </div>
                          )}

                          {task.incident_status && (
                            <div className="text-xs capitalize text-slate-400">
                              Status:{" "}
                              {task.incident_status}
                            </div>
                          )}

                        </div>

                      </td>

                      {/* ASSIGNED TO */}

                      <td className="px-5 py-4">

                        <div className="min-w-[160px]">

                          <div className="font-medium text-slate-700">
                            {task.assigned_to_name ||
                              "Unassigned"}
                          </div>

                          {task.assigned_to && (
                            <div className="text-xs text-slate-400">
                              User ID:{" "}
                              {task.assigned_to}
                            </div>
                          )}

                          {task.assigned_to_email && (
                            <div className="text-xs text-slate-400">
                              {task.assigned_to_email}
                            </div>
                          )}

                        </div>

                      </td>

                      {/* TASK TYPE */}

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            TASK_TYPE_STYLES[
                              task.task_type
                            ] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {task.task_type || "—"}
                        </span>

                      </td>

                      {/* PRIORITY */}

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            PRIORITY_STYLES[
                              task.priority
                            ] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {task.priority || "—"}
                        </span>

                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            STATUS_STYLES[
                              task.status
                            ] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {String(
                            task.status || "—"
                          ).replace(
                            "_",
                            " "
                          )}
                        </span>

                      </td>

                      {/* DUE AT */}

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {formatDateTime(
                          task.due_at
                        )}
                      </td>

                      {/* STARTED */}

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {formatDateTime(
                          task.started_at
                        )}
                      </td>

                      {/* COMPLETED */}

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {formatDateTime(
                          task.completed_at
                        )}
                      </td>

                      {/* CREATED BY */}

                      <td className="px-5 py-4">

                        <div className="min-w-[150px]">

                          <div className="font-medium text-slate-700">
                            {task.created_by_name ||
                              "—"}
                          </div>

                          {task.created_by && (
                            <div className="text-xs text-slate-400">
                              User ID:{" "}
                              {task.created_by}
                            </div>
                          )}

                        </div>

                      </td>

                      {/* CREATED AT */}

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {formatDateTime(
                          task.created_at
                        )}
                      </td>

                      {/* UPDATED AT */}

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {formatDateTime(
                          task.updated_at
                        )}
                      </td>

                      {/* LOCATION */}

                      <td className="px-5 py-4">

                        {task.latitude &&
                        task.longitude ? (
                          <div className="min-w-[150px]">

                            <div className="flex items-center gap-1 text-slate-700">
                              <MapPin
                                size={14}
                                className="text-red-500"
                              />

                              <span>
                                Location
                              </span>
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              Lat:{" "}
                              {task.latitude}
                            </div>

                            <div className="text-xs text-slate-400">
                              Lng:{" "}
                              {task.longitude}
                            </div>

                          </div>
                        ) : (
                          "—"
                        )}

                      </td>

                      {/* CHANGE STATUS */}

                      <td className="px-5 py-4">

                        <select
                          value={
                            task.status || ""
                          }
                          onChange={(e) =>
                            handleStatusChange(
                              task.id,
                              e.target.value
                            )
                          }
                          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        >

                          {isTaskOnly ? (
                            <>
                              <option
                                value="pending"
                                disabled
                              >
                                Pending
                              </option>

                              <option
                                value="assigned"
                                disabled
                              >
                                Assigned
                              </option>

                              <option value="in_progress">
                                In Progress
                              </option>

                              <option
                                value="completed"
                                disabled
                              >
                                Completed
                              </option>

                              <option
                                value="cancelled"
                                disabled
                              >
                                Cancelled
                              </option>
                            </>
                          ) : (
                            <>
                              <option value="pending">
                                Pending
                              </option>

                              <option value="assigned">
                                Assigned
                              </option>

                              <option value="in_progress">
                                In Progress
                              </option>

                              <option value="completed">
                                Completed
                              </option>

                              <option value="cancelled">
                                Cancelled
                              </option>
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



