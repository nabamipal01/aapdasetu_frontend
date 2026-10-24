import React, { useState, useEffect, useCallback } from "react";
import {
  listIncidents,
  createIncident,
  getIncident,
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
import DownloadMenu from "../../components/common/DownloadMenu";
import { useAuth } from "../../context/AuthContext";
import { canViewIncidents, canManageIncidents } from "../../utils/roles";

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

const getIncidentDateTime = (incident) =>
  incident?.reported_at ||
  incident?.created_at ||
  incident?.createdAt ||
  incident?.created_on ||
  incident?.created_date ||
  incident?.date_created ||
  "";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

const formatTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

function Incident() {
  const { user } = useAuth();
  const canView = canViewIncidents(user);
  const canManage = canManageIncidents(user);

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingIncident, setEditingIncident] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showOverview, setShowOverview] = useState(false);

  const fetchIncidents = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await listIncidents({ page: 1, per_page: 50 });
      const data = res?.data?.incidents ?? res?.data?.items ?? res?.data ?? [];
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingIncident(null);
  };

  const handleEdit = async (incident) => {
    if (!canManage) return;

    setError("");
    setSuccess("");

    try {
      const res = await getIncident(incident.id);
      const details = res?.data?.incident ?? res?.data ?? {};
      const incidentToEdit = { ...incident, ...details };

      setEditingIncident(incidentToEdit);
      setForm({
        title: incidentToEdit.title || "",
        incident_type: incidentToEdit.incident_type || "",
        description:
          incidentToEdit.description ||
          incidentToEdit.current_situation_summary ||
          "",
        severity: incidentToEdit.severity || "",
      });
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Failed to load incident details for editing.");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    if (!form.title.trim() || !form.incident_type) {
      setError("Title and Incident Type are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        title: form.title.trim(),
        incident_type: form.incident_type,
        ...(form.description.trim() && { description: form.description.trim() }),
        ...(form.severity && { severity: form.severity }),
      };

      if (editingIncident) {
        const res = await updateIncident(editingIncident.id, payload);
        const updatedIncident = { ...editingIncident, ...(res?.data?.incident ?? res?.data ?? {}) };
        setIncidents((prev) =>
          prev.map((incident) =>
            incident.id === editingIncident.id ? updatedIncident : incident
          )
        );
        if (selectedIncident?.id === editingIncident.id) {
          setSelectedIncident(updatedIncident);
        }
        setSuccess(`Incident ${updatedIncident.incident_no || ""} updated successfully.`);
      } else {
        const res = await createIncident(payload);
        const responseData = res?.data?.incident ?? res?.data ?? {};
        const createdIncident = {
          ...responseData,
          created_at: getCreatedAt(responseData) ?? new Date().toISOString(),
        };
        setIncidents((prev) => [createdIncident, ...prev]);
        setSuccess(`Incident ${createdIncident.incident_no || ""} created successfully.`);
      }
      resetForm();
    } catch (err) {
      setError(err.message || `Failed to ${editingIncident ? "update" : "create"} incident`);
    } finally {
      setSubmitting(false);
    }
  };

  const closeOverview = () => {
    setSelectedIncident(null);
    setShowOverview(false);
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    if (!window.confirm("Delete this incident?")) return;
    try {
      setError("");
      setSuccess("");
      await deleteIncident(id);
      setIncidents((prev) => prev.filter((incident) => incident.id !== id));
      if (selectedIncident?.id === id) closeOverview();
      setSuccess("Incident deleted successfully.");
    } catch (err) {
      setError(err.message || "Failed to delete incident");
    }
  };

  const handleIncidentClick = async (incident) => {
    setSelectedIncident(incident);
    setShowOverview(true);
    try {
      const res = await getIncident(incident.id);
      const details = res?.data?.incident ?? res?.data ?? {};
      setSelectedIncident((prev) =>
        prev?.id === incident.id ? { ...prev, ...details } : prev
      );
    } catch (err) {
      console.error("Failed to load incident details:", err);
    }
  };

  if (!canView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 text-slate-400" size={32} />
          <h2 className="text-lg font-semibold text-slate-900">Access Denied</h2>
          <p className="mt-2 text-sm text-slate-600">You do not have permission to view incidents.</p>
        </div>
      </div>
    );
  }

  const exportRecords = incidents.map((incident, index) => ({
    "S.No.": index + 1,
    "Incident No.": incident.incident_no || "",
    "Incident Title": incident.title || "",
    "Incident Type": incident.incident_type || "",
    Severity: incident.severity || "",
    Status: (incident.status || "").replaceAll("_", " "),
    Date: formatDate(getIncidentDateTime(incident)),
    Time: formatTime(getIncidentDateTime(incident)),
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-orange-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Incidents</h1>
              <p className="text-sm text-slate-500">View and manage emergency incidents</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchIncidents}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            {canManage && (
              <button
                onClick={() => {
                  if (showForm) resetForm();
                  else {
                    setShowForm(true);
                    setError("");
                    setSuccess("");
                    setEditingIncident(null);
                    setForm(EMPTY_FORM);
                  }
                }}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Create Incident</>}
              </button>
            )}
          </div>
        </div>

        {success && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess("")} className="ml-4 text-green-600 hover:text-green-800"><X size={16} /></button>
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="ml-4 text-red-600 hover:text-red-800"><X size={16} /></button>
          </div>
        )}

        {canManage && (
          <div className={`grid transition-all duration-300 ease-in-out ${showForm ? "mb-6 grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{editingIncident ? "Edit Incident" : "Create New Incident"}</h2>
                    {editingIncident && <p className="mt-1 text-sm text-slate-500">Editing <span className="font-semibold text-blue-600">{editingIncident.incident_no || "incident"}</span></p>}
                  </div>
                  {editingIncident && <button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Cancel editing"><X size={18} /></button>}
                </div>
                <form onSubmit={handleCreate}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Title *</label>
                      <input name="title" value={form.title} onChange={handleChange} required placeholder="e.g. Severe Flooding in North Zone" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Incident Type *</label>
                      <select name="incident_type" value={form.incident_type} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                        <option value="">Select type</option><option value="flood">Flood</option><option value="fire">Fire</option><option value="earthquake">Earthquake</option><option value="cyclone">Cyclone</option><option value="landslide">Landslide</option><option value="accident">Accident</option><option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Severity</label>
                      <select name="severity" value={form.severity} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                        <option value="">Select severity</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Description</label>
                      <textarea name="description" rows={3} value={form.description} onChange={handleChange} placeholder="Brief description of the incident..." className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end gap-3">
                    <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? (editingIncident ? "Updating…" : "Creating…") : (editingIncident ? "Update Incident" : "Create Incident")}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">All Incidents {!loading && <span className="ml-1 text-sm font-normal text-slate-500">({incidents.length})</span>}</h2>
            <DownloadMenu records={exportRecords} title="Incidents" disabled={loading} onError={(err) => setError(err.message || "Failed to download incidents.")} />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500"><RefreshCw size={16} className="mr-2 animate-spin" />Loading incidents…</div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertTriangle size={40} className="mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">No incidents found</p>
              <p className="mt-1 text-sm text-slate-500">{canManage ? 'Click "Create Incident" to report a new emergency.' : "Incidents will appear here when available."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-semibold">Incident No.</th><th className="px-5 py-3 font-semibold">Title</th><th className="px-5 py-3 font-semibold">Type</th><th className="px-5 py-3 font-semibold">Severity</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {incidents.map((inc) => (
                    <tr key={inc.id} className="transition-colors hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3"><button type="button" onClick={() => handleIncidentClick(inc)} className="rounded font-semibold text-blue-600 hover:text-blue-800 hover:underline">{inc.incident_no || "—"}</button></td>
                      <td className="max-w-xs truncate px-5 py-3 font-medium text-slate-800">{inc.title}</td>
                      <td className="px-5 py-3 capitalize text-slate-600">{inc.incident_type || "—"}</td>
                      <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${SEVERITY_STYLES[inc.severity] ?? "bg-slate-100 text-slate-600"}`}>{inc.severity || "—"}</span></td>
                      <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[inc.status] ?? "bg-slate-100 text-slate-600"}`}>{(inc.status || "—").replaceAll("_", " ")}</span></td>
                      <td className="px-5 py-3"><div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleIncidentClick(inc)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700" title="View incident" aria-label={`View incident ${inc.incident_no || ""}`}><Eye size={16} /></button>
                        {canManage && <>
                          <button type="button" onClick={() => handleEdit(inc)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-yellow-50 hover:text-yellow-700" title="Edit incident" aria-label={`Edit incident ${inc.incident_no || ""}`}><Pencil size={16} /></button>
                          <button type="button" onClick={() => handleDelete(inc.id)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Delete incident" aria-label={`Delete incident ${inc.incident_no || ""}`}><Trash2 size={15} /></button>
                        </>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showOverview && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={closeOverview}>
          <div role="dialog" aria-modal="true" aria-labelledby="incident-overview-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600"><AlertTriangle size={22} /></div>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{selectedIncident.incident_no || "Incident"}</p><h2 id="incident-overview-title" className="mt-1 break-words text-xl font-bold text-slate-900">{selectedIncident.title || "Incident Details"}</h2><p className="mt-1 text-sm text-slate-500">Incident details and current status</p></div>
              </div>
              <button type="button" onClick={closeOverview} aria-label="Close incident overview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><p className="text-xs text-slate-500">Incident Type</p><p className="mt-1 text-sm font-medium capitalize text-slate-800">{selectedIncident.incident_type || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Severity</p><div className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${SEVERITY_STYLES[selectedIncident.severity] ?? "bg-slate-100 text-slate-600"}`}>{selectedIncident.severity || "—"}</span></div></div>
                <div><p className="text-xs text-slate-500">Status</p><div className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[selectedIncident.status] ?? "bg-slate-100 text-slate-600"}`}>{(selectedIncident.status || "—").replaceAll("_", " ")}</span></div></div>
                <div><p className="text-xs text-slate-500">Date</p><p className="mt-1 text-sm font-medium text-slate-800">{formatDate(getIncidentDateTime(selectedIncident))}</p></div>
                <div><p className="text-xs text-slate-500">Time</p><p className="mt-1 text-sm font-medium text-slate-800">{formatTime(getIncidentDateTime(selectedIncident))}</p></div>
              </div>
              <div className="border-t border-slate-100 pt-4"><h3 className="mb-1 text-sm font-semibold text-slate-700">Description</h3><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{selectedIncident.description || selectedIncident.current_situation_summary || "No description provided."}</p></div>
            </div>
            <div className="flex justify-end border-t border-slate-200 p-5"><button type="button" onClick={closeOverview} className="rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Incident;
