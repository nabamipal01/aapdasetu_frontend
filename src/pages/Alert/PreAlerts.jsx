import { useState, useEffect, useCallback } from "react";
import {
  createAlert,
  deleteAlert,
  listAlerts,
  listDistricts,
  updateAlert,
} from "../../services";
import { BellRing, Plus, X, RefreshCw, Trash2, Pencil, Check, Eye } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { addAlertNotification } from "../../utils/alertNotifications";
import DownloadMenu from "../../components/common/DownloadMenu";
import { useAuth } from "../../context/AuthContext";
import {
  canViewAlerts,
  canCreateAlerts,
  canManageAlerts,
  getUserDistrictId,
  isAlertVisibleToUser,
} from "../../utils/roles";

const EMPTY_FORM = {
  title: "",
  description: "",
  instruction: "",
  district_id: "",
};

function PreAlert() {
  const { user } = useAuth();
  const canView = canViewAlerts(user);
  const canCreate = canCreateAlerts(user);
  const canManage = canManageAlerts(user);

  const location = useLocation();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(canManage);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingAlert, setEditingAlert] = useState(null);
  const [viewingAlert, setViewingAlert] = useState(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listAlerts({ page: 1, limit: 50 });
      const items = res?.data?.items ?? res?.data?.alerts ?? res?.data ?? [];
      setAlerts(
        (Array.isArray(items) ? items : []).filter((alert) =>
          isAlertVisibleToUser(alert, user)
        )
      );
    } catch (err) {
      setError(err.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!canManage) return;

    listDistricts()
      .then((res) => {
        const items = res?.data?.districts ?? res?.data ?? [];
        if (!Array.isArray(items)) {
          throw new Error("Unable to load districts.");
        }
        setDistricts(items);
      })
      .catch((err) => setError(err.message || "Failed to load districts"))
      .finally(() => setDistrictsLoading(false));
  }, [canManage]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchAlerts();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchAlerts]);

  useEffect(() => {
    const notification = location.state?.alertNotification;
    if (
      !notification?.type?.toLowerCase().includes("pre") ||
      !notification.alert
    ) {
      return undefined;
    }
    if (!isAlertVisibleToUser(notification.alert, user)) {
      navigate(location.pathname, { replace: true, state: null });
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const alert = notification.alertId
        ? { ...notification.alert, alert_id: notification.alertId }
        : notification.alert;
      const alertId = alert.alert_id ?? alert.id;

      setAlerts((currentAlerts) =>
        currentAlerts.some((item) => (item.alert_id ?? item.id) === alertId)
          ? currentAlerts
          : [alert, ...currentAlerts]
      );
      navigate(location.pathname, { replace: true, state: null });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [location.key, location.pathname, location.state, navigate, user]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
  };

  const openEdit = (alert) => {
    if (!canManage) return;
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
    if (!canCreate) return;
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and Description are required.");
      return;
    }
    const districtId = canManage
      ? form.district_id || null
      : getUserDistrictId(user);
    if (!canManage && districtId == null) {
      setError("Your account is not associated with a district.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        district_id: districtId == null ? null : Number(districtId),
        ...(form.instruction && { instruction: form.instruction.trim() }),
      };
      const res = await createAlert(payload);
      const newAlert = {
        ...(res.data?.alert ?? res.data?.pre_alert ?? res.data ?? payload),
        district_id: districtId == null ? null : Number(districtId),
      };
      setAlerts((prev) => [newAlert, ...prev]);
      const alertTitle = newAlert?.title || payload.title;
      addAlertNotification({
        type: "Pre-alert",
        title: alertTitle,
        description: payload.description,
        path: "/pre-alerts",
        alert: {
          ...newAlert,
          title: alertTitle,
          description: payload.description,
          instruction: payload.instruction || "",
        },
        alertId: newAlert.alert_id ?? newAlert.id,
        districtId,
      });
      setSuccess(
        `Alert "${alertTitle}" created for ${
          districtId == null
            ? "all districts"
            : districts.find((district) => String(district.id) === String(districtId))?.name || "the selected district"
        }.`
      );
      resetForm();
    } catch (err) {
      setError(err.message || "Failed to create alert");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!canManage) return;
    if (!window.confirm(`Delete alert "${title}"?`)) return;
    try {
      await deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => (a.alert_id ?? a.id) !== id));
    } catch (err) {
      setError(err.message || "Failed to delete alert");
    }
  };

  const handleUpdate = async (e) => {
    if (!canManage) return;
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
      const res = await updateAlert(
        editingAlert.alert_id ?? editingAlert.id,
        payload
      );
      const updatedAlert = res.data;
      setAlerts((prev) =>
        prev.map((alert) =>
          (alert.alert_id ?? alert.id) ===
          (editingAlert.alert_id ?? editingAlert.id)
            ? { ...alert, ...updatedAlert }
            : alert
        )
      );
      setEditingAlert(null);
      setForm(EMPTY_FORM);
      setSuccess(
        `Alert "${updatedAlert?.title || payload.title}" updated successfully.`
      );
    } catch (err) {
      setError(err.message || "Failed to update alert");
    } finally {
      setSubmitting(false);
    }
  };

  const exportRecords = alerts.map((alert, index) => ({
    "S.No.": index + 1,
    Title: alert.title ?? "",
    Description: alert.description ?? "",
    Instruction: alert.instruction ?? "",
    "Created At": alert.created_at
      ? new Date(alert.created_at).toLocaleString("en-IN")
      : "",
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-red-50/30 px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
    <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BellRing className="text-red-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Pre-Alerts
              </h1>
              <p className="text-sm text-slate-500">
                Create emergency notices for all or selected districts
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <DownloadMenu
              records={exportRecords}
              title="Pre Alerts"
              disabled={loading}
              onError={(err) =>
                setError(err.message || "Failed to download pre-alerts.")
              }
            />
            <button
              onClick={fetchAlerts}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            {canCreate && (
              <button
                onClick={() => {
                  if (showForm) {
                    resetForm();
                  } else {
                    setForm({ ...EMPTY_FORM });
                    setShowForm(true);
                  }
                  setError("");
                  setSuccess("");
                }}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                {showForm ? (
                  <>
                    <X size={15} /> Cancel
                  </>
                ) : (
                  <>
                    <Plus size={15} /> Create Alert
                  </>
                )}
              </button>
            )}
          </div>
        </div>

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

        {/* Create form */}
        {canCreate && (
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              showForm
                ? "mb-6 grid-rows-[1fr] opacity-100"
                : "pointer-events-none grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-semibold text-slate-900">
                  Issue New Alert
                </h2>
                <form onSubmit={handleCreate}>
                  <div className="grid gap-4">
                    {canManage && (
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                          District
                        </label>
                        <select
                          name="district_id"
                          value={form.district_id}
                          onChange={handleChange}
                          disabled={districtsLoading}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        >
                          <option value="">
                            {districtsLoading ? "Loading districts..." : "All Districts"}
                          </option>
                          {districts.map((district) => (
                            <option key={district.id} value={district.id}>
                              {district.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Alert Title *
                      </label>
                      <input
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="e.g. Flood Warning"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Description *
                      </label>
                      <textarea
                        name="description"
                        rows={3}
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Describe the situation in detail…"
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Instructions
                      </label>
                      <textarea
                        name="instruction"
                        rows={2}
                        value={form.instruction}
                        onChange={handleChange}
                        placeholder="Action instructions for field teams…"
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
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
                      disabled={submitting || (canManage && districtsLoading)}
                      className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Sending…" : "Issue Alert"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Card grid */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <BellRing size={40} className="mb-3 text-slate-300" />
            <p className="font-medium text-slate-700">No active alerts</p>
            <p className="mt-1 text-sm text-slate-500">
              {canCreate
                ? "Create an alert to broadcast it to all users."
                : "Alerts published by authorized users will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {alerts.map((alert) => {
              const id = alert.alert_id ?? alert.id;
              const dated = alert.created_at
                ? new Date(alert.created_at).toLocaleString()
                : "";
              return (
                <article
                  key={id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-[0_12px_24px_-10px_rgba(15,23,42,0.15)]"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-red-50/80 to-white px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Pre-Alert
                        </span>
                        {dated ? (
                          <span className="text-[11px] text-slate-400">{dated}</span>
                        ) : null}
                      </div>
                      <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-slate-900">
                        {alert.title || "Untitled Alert"}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-4 py-3">
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {alert.description || "No description provided."}
                    </p>

                    {alert.instruction ? (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <span className="font-semibold">Instructions: </span>
                        <span className="line-clamp-2">{alert.instruction}</span>
                      </div>
                    ) : null}

                    <div className="mt-auto flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => setViewingAlert(alert)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        title="View alert"
                      >
                        <Eye size={16} />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(alert)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit alert"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(id, alert.title)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Delete alert"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Edit modal */}
        {canManage && editingAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Edit Alert</h2>
                <button
                  type="button"
                  onClick={() => setEditingAlert(null)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="mt-5 space-y-4">
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Alert title"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
                <textarea
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Description"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
                <textarea
                  name="instruction"
                  rows={3}
                  value={form.instruction}
                  onChange={handleChange}
                  placeholder="Instructions"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingAlert(null)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    <Check size={15} /> {submitting ? "Updating…" : "Update Alert"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View modal */}
        {viewingAlert && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setViewingAlert(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="pre-alert-details-title"
              className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h2
                  id="pre-alert-details-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {viewingAlert.title || "Pre-alert details"}
                </h2>
                <button
                  type="button"
                  onClick={() => setViewingAlert(null)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {viewingAlert.description || "No description provided."}
              </p>
              {viewingAlert.instruction && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <span className="font-semibold">Instructions: </span>
                  {viewingAlert.instruction}
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingAlert(null)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default PreAlert;