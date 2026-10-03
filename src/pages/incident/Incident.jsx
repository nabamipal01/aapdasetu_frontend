import React, { useState, useEffect, useCallback } from "react";
import { listIncidents, createIncident, deleteIncident } from "../../services";
import { AlertTriangle, Plus, X, RefreshCw, Trash2 } from "lucide-react";

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
  // region_id: "",
  description: "",
  severity: "",
  // latitude: "",
  // longitude: "",
  // reported_at: "",
};

function Incident() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showOverview, setShowOverview] = useState(false);

  // ── fetch list ──────────────────────────────────────────────────────────────
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listIncidents({ page: 1, per_page: 50 });
      setIncidents(res?.data?.incidents ?? res?.data ?? []);
    } catch (err) {
      setError(err.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  // ── form helpers ─────────────────────────────────────────────────────────────
  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => { setForm(EMPTY_FORM); setShowForm(false); };

  // ── create ───────────────────────────────────────────────────────────────────
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
        // region_id:     Number(form.region_id),
        ...(form.description && { description: form.description.trim() }),
        ...(form.severity && { severity: form.severity }),
        // ...(form.latitude     && { latitude:      Number(form.latitude) }),
        // ...(form.longitude    && { longitude:     Number(form.longitude) }),
        // ...(form.reported_at && { reported_at: `${form.reported_at.replace("T", " ")}:00` }),
      };
      const res = await createIncident(payload);
      setIncidents((prev) => [res.data, ...prev]);
      setSuccess(`Incident ${res.data.incident_no} created successfully.`);
      resetForm();
    } catch (err) {
      setError(err.message || "Failed to create incident");
    } finally {
      setSubmitting(false);
    }
  };

  // ── delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this incident?")) return;
    try {
      await deleteIncident(id);
      setIncidents((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete incident");
    }
  };

  const handleIncidentClick = (incident) => {
    setSelectedIncident(incident);
    setShowOverview(true);
  };

  const closeOverview = () => {
    setSelectedIncident(null);
    setShowOverview(false);
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-orange-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Incidents</h1>
              <p className="text-sm text-slate-500">Manage and report emergency incidents</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchIncidents}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Create Incident</>}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Create Form */}
        <div className={`grid transition-all duration-300 ease-in-out ${showForm ? "mb-6 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}>
          <div className="overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-semibold text-slate-900">Create New Incident</h2>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 sm:grid-cols-2">

                  {/* Title */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Title *</label>
                    <input name="title" value={form.title} onChange={handleChange}
                      placeholder="e.g. Severe Flooding in North Zone"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Incident Type *</label>
                    <select name="incident_type" value={form.incident_type} onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                      <option value="">Select type</option>
                      <option value="flood">Flood</option>
                      <option value="fire">Fire</option>
                      <option value="earthquake">Earthquake</option>
                      <option value="cyclone">Cyclone</option>
                      <option value="landslide">Landslide</option>
                      <option value="accident">Accident</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Severity</label>
                    <select name="severity" value={form.severity} onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                      <option value="">Select severity</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  {/* Region ID */}
                  {/* <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Region ID *</label>
                    <input name="region_id" type="number" value={form.region_id} onChange={handleChange}
                      placeholder="e.g. 3"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div> */}

                  {/* Reported At
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Reported At
                    </label>

                    <input
                      name="reported_at"
                      type="datetime-local"
                      step="1"
                      value={form.reported_at}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div> */}


                  {/* Latitude */}
                  {/* <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Latitude</label>
                    <input name="latitude" type="number" step="any" value={form.latitude} onChange={handleChange}
                      placeholder="e.g. 22.5726"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div> */}

                  {/* Longitude */}
                  {/* <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Longitude</label>
                    <input name="longitude" type="number" step="any" value={form.longitude} onChange={handleChange}
                      placeholder="e.g. 88.3639"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div> */}

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Description</label>
                    <textarea name="description" rows={3} value={form.description} onChange={handleChange}
                      placeholder="Brief description of the incident..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none" />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={resetForm}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? "Creating…" : "Create Incident"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              All Incidents {!loading && <span className="ml-1 text-sm font-normal text-slate-500">({incidents.length})</span>}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 text-sm">Loading incidents…</div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertTriangle size={40} className="mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">No incidents found</p>
              <p className="mt-1 text-sm text-slate-500">Click "Create Incident" to report a new emergency.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Incident No.</th>
                    <th className="px-5 py-3 font-semibold">Title</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Severity</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Reported At</th>
                    <th className="px-5 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                      {/* <td className="whitespace-nowrap px-5 py-3 font-semibold text-blue-600">{inc.incident_no}</td> */}
                      <td className="px-4 py-3 text-sm">
                        <button
                          type="button"
                          onClick={() => handleIncidentClick(inc)}
                          className="font-semibold cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {inc.incident_no}
                        </button>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800 max-w-xs truncate">{inc.title}</td>
                      <td className="px-5 py-3 capitalize text-slate-600">{inc.incident_type}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${SEVERITY_STYLES[inc.severity] ?? "bg-slate-100 text-slate-600"}`}>
                          {inc.severity || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[inc.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {inc.status || "—"}
                        </span>
                      </td>
                      {/* <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                        {inc.reported_at ? new Date(inc.reported_at).toLocaleString() : "—"}
                      </td> */}
                      <td className="px-5 py-3">
                        <button onClick={() => handleDelete(inc.id)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {showOverview && selectedIncident && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={closeOverview}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Incident Overview
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedIncident.incident_no}
                </p>
              </div>

              <button
                type="button"
                onClick={closeOverview}
                className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* Incident No */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Incident No.
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    {selectedIncident.incident_no || "—"}
                  </p>
                </div>

                {/* Title */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Title
                  </p>

                  <p className="mt-1 text-sm text-gray-800">
                    {selectedIncident.title || "—"}
                  </p>
                </div>

                {/* Incident Type */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Incident Type
                  </p>

                  <p className="mt-1 text-sm text-gray-800">
                    {selectedIncident.incident_type || "—"}
                  </p>
                </div>

                {/* Severity */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Severity
                  </p>

                  <p className="mt-1 text-sm text-gray-800">
                    {selectedIncident.severity || "—"}
                  </p>
                </div>

                {/* Reported At */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Reported At
                  </p>

                  {/* <p className="mt-1 text-sm text-gray-800">
                    {selectedIncident.reported_at
                      ? new Date(selectedIncident.reported_at).toLocaleString()
                      : "—"}
                  </p> */}
                </div>

                {/* Created At */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Created At
                  </p>

                  <p className="mt-1 text-sm text-gray-800">
                    {selectedIncident.created_at
                      ? new Date(selectedIncident.created_at).toLocaleString()
                      : "—"}
                  </p>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Description
                  </p>

                  <div className="mt-2 rounded-lg bg-gray-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {selectedIncident.description || "No description available."}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t px-6 py-4">
              <button
                type="button"
                onClick={closeOverview}
                className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700"
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