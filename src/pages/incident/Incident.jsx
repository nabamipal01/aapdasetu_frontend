import React, { useState, useEffect, useCallback } from "react";
import {
  listIncidents,
  createIncident,
  updateIncident,
  deleteIncident,
} from "../../services";
import {
  AlertTriangle,
  Plus,
  X,
  RefreshCw,
  Trash2,
  Eye,
  Pencil,
} from "lucide-react";

const SEVERITY_STYLES = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_STYLES = {
  reported: "bg-blue-100 text-blue-700",
  acknowledged: "bg-purple-100 text-purple-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-600",
};

const EMPTY_FORM = {
  title: "",
  incident_type: "",
  description: "",
  severity: "",
};

const getCreatedAt = (incident) =>
  incident?.created_at ??
  incident?.createdAt ??
  incident?.created_on ??
  incident?.created_date ??
  incident?.date_created;

function Incident() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Editing state
  const [editingIncident, setEditingIncident] = useState(null);

  // Overview state
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showOverview, setShowOverview] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // FETCH INCIDENTS
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await listIncidents({
        page: 1,
        per_page: 50,
      });

      setIncidents(res?.data?.incidents ?? res?.data ?? []);
    } catch (err) {
      setError(err.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // ─────────────────────────────────────────────────────────────────────────────
  // FORM HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingIncident(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // EDIT INCIDENT
  // ─────────────────────────────────────────────────────────────────────────────

  const handleEdit = (incident) => {
    setEditingIncident(incident);

    setForm({
      title: incident.title || "",
      incident_type: incident.incident_type || "",
      description: incident.description || "",
      severity: incident.severity || "",
    });

    setShowForm(true);
    setError("");
    setSuccess("");

    // Scroll to form
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE / UPDATE INCIDENT
  // ─────────────────────────────────────────────────────────────────────────────

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.incident_type) {
      setError("Title, Incident Type are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        incident_type: form.incident_type,

        ...(form.description && {
          description: form.description.trim(),
        }),

        ...(form.severity && {
          severity: form.severity,
        }),
      };

      // ───────────────────────────────────────────────────────────────────────
      // UPDATE
      // ───────────────────────────────────────────────────────────────────────

      if (editingIncident) {
        const res = await updateIncident(
          editingIncident.id,
          payload
        );

        const updatedIncident = {
          ...editingIncident,
          ...(res?.data || {}),
        };

        setIncidents((prev) =>
          prev.map((incident) =>
            incident.id === editingIncident.id
              ? updatedIncident
              : incident
          )
        );

        const loadIncident = async () => {
  try {
    const response = await getIncident(id);

    console.log("GET INCIDENT RESPONSE:", response);

    setIncident(response);
  } catch (error) {
    console.error("Failed to load incident:", error);
  }
};

        // Update overview if it is currently showing this incident
        if (
          selectedIncident &&
          selectedIncident.id === editingIncident.id
        ) {
          setSelectedIncident(updatedIncident);
        }

        setSuccess(
          `Incident ${
            updatedIncident.incident_no || ""
          } updated successfully.`
        );
      }

      // ───────────────────────────────────────────────────────────────────────
      // CREATE
      // ───────────────────────────────────────────────────────────────────────

      else {
        const res = await createIncident(payload);

        const createdIncident = {
          ...res.data,
          created_at:
            getCreatedAt(res.data) ??
            new Date().toISOString(),
        };

        setIncidents((prev) => [
          createdIncident,
          ...prev,
        ]);

        setSuccess(
          `Incident ${
            res.data.incident_no || ""
          } created successfully.`
        );
      }

      resetForm();
    } catch (err) {
      setError(
        err.message ||
          `Failed to ${
            editingIncident ? "update" : "create"
          } incident`
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE INCIDENT
  // ─────────────────────────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this incident?")) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await deleteIncident(id);

      setIncidents((prev) =>
        prev.filter((incident) => incident.id !== id)
      );

      // Close overview if deleted incident is open
      if (
        selectedIncident &&
        selectedIncident.id === id
      ) {
        closeOverview();
      }

      setSuccess("Incident deleted successfully.");
    } catch (err) {
      setError(
        err.message || "Failed to delete incident"
      );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // OVERVIEW
  // ─────────────────────────────────────────────────────────────────────────────

  const handleIncidentClick = (incident) => {
    setSelectedIncident(incident);
    setShowOverview(true);
  };

  const closeOverview = () => {
    setSelectedIncident(null);
    setShowOverview(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* ─────────────────────────────────────────────────────────────────────
            HEADER
        ───────────────────────────────────────────────────────────────────── */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle
              className="text-orange-500"
              size={28}
            />

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Incidents
              </h1>

              <p className="text-sm text-slate-500">
                Manage and report emergency incidents
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Refresh */}
            <button
              onClick={fetchIncidents}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={
                  loading ? "animate-spin" : ""
                }
              />

              Refresh
            </button>

            {/* Create / Cancel */}
            <button
              onClick={() => {
                if (showForm) {
                  resetForm();
                } else {
                  setShowForm(true);
                  setError("");
                  setSuccess("");
                  setEditingIncident(null);
                  setForm(EMPTY_FORM);
                }
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {showForm ? (
                <>
                  <X size={15} />
                  Cancel
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Create Incident
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            ALERTS
        ───────────────────────────────────────────────────────────────────── */}

        {success && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="ml-4 text-green-600 hover:text-green-800"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-4 text-red-600 hover:text-red-800"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            CREATE / EDIT FORM
        ───────────────────────────────────────────────────────────────────── */}

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            showForm
              ? "mb-6 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

              {/* Form Header */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {editingIncident
                      ? "Edit Incident"
                      : "Create New Incident"}
                  </h2>

                  {editingIncident && (
                    <p className="mt-1 text-sm text-slate-500">
                      Editing{" "}
                      <span className="font-semibold text-blue-600">
                        {editingIncident.incident_no ||
                          "incident"}
                      </span>
                    </p>
                  )}
                </div>

                {editingIncident && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title="Cancel editing"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <form onSubmit={handleCreate}>
                <div className="grid gap-4 sm:grid-cols-2">

                  {/* Title */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Title *
                    </label>

                    <input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="e.g. Severe Flooding in North Zone"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Incident Type */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Incident Type *
                    </label>

                    <select
                      name="incident_type"
                      value={form.incident_type}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">
                        Select type
                      </option>

                      <option value="flood">
                        Flood
                      </option>

                      <option value="fire">
                        Fire
                      </option>

                      <option value="earthquake">
                        Earthquake
                      </option>

                      <option value="cyclone">
                        Cyclone
                      </option>

                      <option value="landslide">
                        Landslide
                      </option>

                      <option value="accident">
                        Accident
                      </option>

                      <option value="other">
                        Other
                      </option>
                    </select>
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Severity
                    </label>

                    <select
                      name="severity"
                      value={form.severity}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">
                        Select severity
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

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Description
                    </label>

                    <textarea
                      name="description"
                      rows={3}
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Brief description of the incident..."
                      className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Form Buttons */}
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
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? editingIncident
                        ? "Updating…"
                        : "Creating…"
                      : editingIncident
                        ? "Update Incident"
                        : "Create Incident"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            INCIDENT TABLE
        ───────────────────────────────────────────────────────────────────── */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              All Incidents{" "}

              {!loading && (
                <span className="ml-1 text-sm font-normal text-slate-500">
                  ({incidents.length})
                </span>
              )}
            </h2>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">
              <RefreshCw
                size={16}
                className="mr-2 animate-spin"
              />
              Loading incidents…
            </div>
          ) : incidents.length === 0 ? (
            /* Empty */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertTriangle
                size={40}
                className="mb-3 text-slate-300"
              />

              <p className="font-medium text-slate-700">
                No incidents found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Click "Create Incident" to report a new
                emergency.
              </p>
            </div>
          ) : (
            /* Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">
                      Incident No.
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Title
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Type
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Severity
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Status
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {incidents.map((inc) => (
                    <tr
                      key={inc.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      {/* Incident No */}
                      <td className="whitespace-nowrap px-5 py-3 text-sm">
                        <button
                          type="button"
                          onClick={() =>
                            handleIncidentClick(inc)
                          }
                          className="rounded font-semibold text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                        >
                          {inc.incident_no || "—"}
                        </button>
                      </td>

                      {/* Title */}
                      <td className="max-w-xs truncate px-5 py-3 font-medium text-slate-800">
                        {inc.title}
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3 capitalize text-slate-600">
                        {inc.incident_type || "—"}
                      </td>

                      {/* Severity */}
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            SEVERITY_STYLES[
                              inc.severity
                            ] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {inc.severity || "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            STATUS_STYLES[
                              inc.status
                            ] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {(inc.status || "—").replaceAll(
                            "_",
                            " "
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">

                          {/* VIEW */}
                          <button
                            type="button"
                            onClick={() =>
                              handleIncidentClick(inc)
                            }
                            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            title="View incident"
                            aria-label={`View incident ${
                              inc.incident_no || ""
                            }`}
                          >
                            <Eye size={16} />
                          </button>

                          {/* EDIT */}
                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(inc)
                            }
                            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-yellow-50 hover:text-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                            title="Edit incident"
                            aria-label={`Edit incident ${
                              inc.incident_no || ""
                            }`}
                          >
                            <Pencil size={16} />
                          </button>

                          {/* DELETE */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(inc.id)
                            }
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                            title="Delete incident"
                            aria-label={`Delete incident ${
                              inc.incident_no || ""
                            }`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          INCIDENT OVERVIEW MODAL
      ───────────────────────────────────────────────────────────────────────── */}

      {showOverview && selectedIncident && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={closeOverview}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="incident-overview-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-6 py-5 sm:px-7">

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <AlertTriangle size={22} />
                </div>

                <div>
                  <h2
                    id="incident-overview-title"
                    className="text-xl font-bold tracking-tight text-slate-900"
                  >
                    Incident Overview
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Incident details and current status
                  </p>

                  <span className="mt-3 inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-700">
                    {selectedIncident.incident_no ||
                      "Incident"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeOverview}
                aria-label="Close incident overview"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6 sm:p-7">

              {/* Title */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Incident Title
                </p>

                <p className="mt-1 break-words text-lg font-semibold text-slate-900">
                  {selectedIncident.title || "—"}
                </p>
              </div>

              {/* Information Grid */}
              <div className="grid gap-3 sm:grid-cols-2">

                {/* Type */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Incident Type
                  </p>

                  <p className="mt-2 text-sm font-semibold capitalize text-slate-900">
                    {selectedIncident.incident_type ||
                      "—"}
                  </p>
                </div>

                {/* Severity */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Severity
                  </p>

                  <div className="mt-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                        SEVERITY_STYLES[
                          selectedIncident.severity
                        ] ??
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {selectedIncident.severity ||
                        "—"}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </p>

                  <div className="mt-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                        STATUS_STYLES[
                          selectedIncident.status
                        ] ??
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {(selectedIncident.status ||
                        "—").replaceAll("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Reported At */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reported At
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedIncident.reported_at ||
                    selectedIncident.created_at
                      ? new Date(
                          selectedIncident.reported_at ||
                            selectedIncident.created_at
                        ).toLocaleString()
                      : "—"}
                  </p>
                </div>

                {/* Created At */}
                {/* <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Created At
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {getCreatedAt(
                      selectedIncident
                    ) &&
                    !Number.isNaN(
                      new Date(
                        getCreatedAt(
                          selectedIncident
                        )
                      ).getTime()
                    )
                      ? new Date(
                          getCreatedAt(
                            selectedIncident
                          )
                        ).toLocaleString()
                      : "—"}
                  </p>
                </div> */}
              </div>

              {/* Description */}
              <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-800">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {incidents?.data?.description || "No description available."}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-7">

              {/* Edit from Overview */}
              <button
                type="button"
                onClick={() => {
                  const incident =
                    selectedIncident;

                  closeOverview();
                  handleEdit(incident);
                }}
                className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-5 py-2.5 text-sm font-semibold text-yellow-700 transition hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2"
              >
                <Pencil size={16} />
                Edit Incident
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={closeOverview}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Incident;
