import React, { useState, useEffect, useCallback } from "react";
import { listAlerts, createAlert, updateAlert, deleteAlert } from "../../services";
import { BellRing, Plus, X, RefreshCw, Trash2, Pencil, Check } from "lucide-react";

const EMPTY_FORM = { title: "", description: "", instruction: "" };

function PreAlert() {
  const [alerts, setAlerts]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editingAlert, setEditingAlert] = useState(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // API uses "limit" (not "per_page") and returns data.items (not data.alerts)
      const res = await listAlerts({ page: 1, limit: 50 });
      setAlerts(res?.data?.items ?? res?.data?.alerts ?? res?.data ?? []);
    } catch (err) {
      setError(err.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => { setForm(EMPTY_FORM); setShowForm(false); };

  const openEdit = (alert) => {
    setEditingAlert(alert);
    setForm({
      title: alert.title || "",
      description: alert.description || "",
      instruction: alert.instruction || "",
    });
    setError("");
    setSuccess("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and Description are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description.trim(),
        ...(form.instruction && { instruction: form.instruction.trim() }),
      };
      const res = await createAlert(payload);
      const newAlert = res.data;
      setAlerts((prev) => [newAlert, ...prev]);
      setSuccess(`Alert "${newAlert.title}" created and broadcast.`);
      resetForm();
    } catch (err) {
      setError(err.message || "Failed to create alert");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete alert "${title}"?`)) return;
    try {
      await deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => (a.alert_id ?? a.id) !== id));
    } catch (err) {
      setError(err.message || "Failed to delete alert");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and Description are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        instruction: form.instruction.trim(),
      };
      const res = await updateAlert(editingAlert.alert_id ?? editingAlert.id, payload);
      const updatedAlert = res.data;
      setAlerts((prev) => prev.map((alert) =>
        (alert.alert_id ?? alert.id) === (editingAlert.alert_id ?? editingAlert.id)
          ? { ...alert, ...updatedAlert }
          : alert
      ));
      setEditingAlert(null);
      setForm(EMPTY_FORM);
      setSuccess(`Alert "${updatedAlert?.title || payload.title}" updated successfully.`);
    } catch (err) {
      setError(err.message || "Failed to update alert");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BellRing className="text-red-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pre-Alerts</h1>
              <p className="text-sm text-slate-500">Broadcast emergency notices to all operational users</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAlerts}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <RefreshCw size={15} /> Refresh
            </button>
            <button onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
              {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Create Alert</>}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {success && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
        {error   && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Create Form */}
        <div className={`grid transition-all duration-300 ease-in-out ${showForm ? "mb-6 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}>
          <div className="overflow-hidden">
            <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-semibold text-slate-900">Issue New Alert</h2>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4">

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Alert Title *</label>
                    <input name="title" value={form.title} onChange={handleChange}
                      placeholder="e.g. Flood Warning"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Description *</label>
                    <textarea name="description" rows={3} value={form.description} onChange={handleChange}
                      placeholder="Describe the situation in detail…"
                      className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Instructions</label>
                    <textarea name="instruction" rows={2} value={form.instruction} onChange={handleChange}
                      placeholder="Action instructions for field teams…"
                      className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={resetForm}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? "Sending…" : "Issue Alert"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Alert cards */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <BellRing size={40} className="mb-3 text-slate-300" />
            <p className="font-medium text-slate-700">No active alerts</p>
            <p className="mt-1 text-sm text-slate-500">Create an alert to broadcast it to all users.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const id    = alert.alert_id ?? alert.id;
              const dated = alert.created_at ? new Date(alert.created_at).toLocaleString() : "";
              return (
                <div key={id}
                  className="rounded-xl border border-red-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                        <h3 className="font-semibold text-slate-900 truncate">{alert.title}</h3>
                        <span className="text-xs text-slate-400 shrink-0">{dated}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{alert.description}</p>
                      {alert.instruction && (
                        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                          <span className="font-semibold">Instructions: </span>{alert.instruction}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => openEdit(alert)}
                        className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Edit alert">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(id, alert.title)}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete alert">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {editingAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Edit Alert</h2>
                <button type="button" onClick={() => setEditingAlert(null)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100" title="Close">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="mt-5 space-y-4">
                <input name="title" value={form.title} onChange={handleChange} placeholder="Alert title"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                <textarea name="description" rows={4} value={form.description} onChange={handleChange} placeholder="Description"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                <textarea name="instruction" rows={3} value={form.instruction} onChange={handleChange} placeholder="Instructions"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingAlert(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    <Check size={15} /> {submitting ? "Updating…" : "Update Alert"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default PreAlert;
