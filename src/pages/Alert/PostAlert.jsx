
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Plus, Trash2, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config/Config";
import {
  createPostAlert,
  deletePostAlert,
  getPostAlerts,
} from "../../services";
import { addAlertNotification } from "../../utils/alertNotifications";
import DownloadMenu from "../../components/common/DownloadMenu";

const RESPONSE_ACTIONS = [
  "Evacuation",
  "Rescue Operation",
  "Relief Distribution",
  "Medical Support",
  "Other",
];

const getResponseActions = (alert) => {
  const actions = alert?.response_action_required;
  if (Array.isArray(actions)) return actions;
  return actions ? [actions] : [];
};

const getPostAlertKey = (alert) =>
  alert.post_alert_id ??
  alert.id ??
  alert._notificationKey ??
  `${alert.title ?? "alert"}-${alert.incident_date ?? ""}`;

const samePostAlert = (first, second) => {
  const firstId = first.post_alert_id ?? first.id;
  const secondId = second.post_alert_id ?? second.id;

  if (firstId != null && secondId != null) {
    return String(firstId) === String(secondId);
  }

  return (
    first.title === second.title &&
    first.incident_date === second.incident_date
  );
};

const getAlertPhotos = (alert) => {
  let photos =
    alert?.photos ??
    alert?.incident_photos ??
    alert?.images ??
    alert?.incident_photo ??
    alert?.photo ??
    [];

  if (typeof photos === "string") {
    try {
      photos = JSON.parse(photos);
    } catch {
      photos = [photos];
    }
  }

  if (
    photos &&
    !Array.isArray(photos) &&
    typeof photos === "object" &&
    Array.isArray(photos.data)
  ) {
    photos = photos.data;
  }

  return Array.isArray(photos) ? photos : photos ? [photos] : [];
};

const getPhotoSource = (photo) => {
  const path =
    typeof photo === "string"
      ? photo
      : [
          photo?.photo_url,
          photo?.image_url,
          photo?.photo_path,
          photo?.image_path,
          photo?.incident_photo,
          photo?.url,
          photo?.file_path,
          photo?.file_name,
          photo?.filename,
          photo?.path,
        ].find(
          (value) => typeof value === "string" && value.length > 0,
        );

  if (!path) return "";

  if (/^(https?:|data:|blob:)/i.test(path)) {
    return path;
  }

  if (typeof photo === "object" && (photo.photo || photo.image)) {
    return getPhotoSource(photo.photo || photo.image);
  }

  const baseUrl = new URL(API_BASE_URL, window.location.origin);
  const normalizedPath = String(path)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  const normalizedBasePath = basePath.replace(/^\/+/, "");

  const relativePath = normalizedPath.startsWith(
    `${normalizedBasePath}/`,
  )
    ? normalizedPath.slice(normalizedBasePath.length + 1)
    : normalizedPath;

  return new URL(
    relativePath,
    `${baseUrl.origin}${basePath}/`,
  ).toString();
};

function AlertPhoto({ source, index }) {
  const [loadError, setLoadError] = useState(false);

  if (loadError) {
    return (
      <div className="flex min-h-24 items-center justify-center rounded-md border border-amber-200 bg-amber-50 p-2.5 text-center">
        <div>
          <p className="text-xs font-semibold text-amber-800">
            Photo {index + 1} could not be loaded.
          </p>
          <p className="mt-1 text-[10px] text-amber-700">
            Check that the image URL is reachable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="relative flex h-24 items-center justify-center overflow-hidden bg-slate-100">
        <img
          src={source}
          alt={`Incident photo ${index + 1}`}
          onError={() => setLoadError(true)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2 pt-5">
          <p className="text-[10px] font-semibold text-white">
            Incident Photo {index + 1}
          </p>
        </div>
      </div>
    </div>
  );
}

function PostAlert() {
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    incident_date: "",
    current_situation_summary: "",
    response_action_required: [],
    incident_photo: [],
  });

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [viewingAlert, setViewingAlert] = useState(null);
  const [highlightedAlertKey, setHighlightedAlertKey] = useState(null);

  const highlightedAlertRef = useRef(null);
  const pendingNotificationAlertRef = useRef(null);

  const [deletingId, setDeletingId] = useState(null);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getPostAlerts(page, 10);

      if (result?.success) {
        const data = result.data;

        const alertItems = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.alerts)
            ? data.alerts
            : Array.isArray(data)
              ? data
              : [];

        const pendingAlert = pendingNotificationAlertRef.current;

        if (pendingAlert) {
          const existingAlert = alertItems.find((alert) =>
            samePostAlert(alert, pendingAlert),
          );

          const visibleAlert = existingAlert ?? pendingAlert;
          const nextAlerts = existingAlert
            ? alertItems
            : [pendingAlert, ...alertItems];

          setAlerts(nextAlerts);
          setHighlightedAlertKey(getPostAlertKey(visibleAlert));
          pendingNotificationAlertRef.current = null;
        } else {
          setAlerts(alertItems);
        }

        setPagination(data?.pagination || null);
      } else {
        setError(result.message || "Unable to load post alerts.");
      }
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Unable to load post alerts.",
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadAlerts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAlerts]);

  useEffect(() => {
    const notification = location.state?.alertNotification;

    if (
      !notification?.type?.toLowerCase().includes("post") ||
      !notification.alert
    ) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const alertId =
        notification.alert.post_alert_id ??
        notification.alert.id ??
        notification.alertId;

      const alert = {
        ...notification.alert,
        ...(alertId ? { post_alert_id: alertId } : {}),
        _notificationKey: notification.id,
      };

      pendingNotificationAlertRef.current = alert;
      setPage(1);

      setAlerts((currentAlerts) =>
        currentAlerts.some((item) => samePostAlert(item, alert))
          ? currentAlerts
          : [alert, ...currentAlerts],
      );

      setHighlightedAlertKey(getPostAlertKey(alert));
      navigate(location.pathname, { replace: true, state: null });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [location.key, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!loading && highlightedAlertRef.current) {
      highlightedAlertRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [alerts, highlightedAlertKey, loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleActionChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      response_action_required: e.target.checked
        ? [...prev.response_action_required, e.target.value]
        : prev.response_action_required.filter(
            (action) => action !== e.target.value,
          ),
    }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      incident_photo: Array.from(e.target.files || []),
    }));
  };

  const formatIncidentDate = (value) => {
    if (!value) return "";

    return value.length === 16
      ? value.replace("T", " ") + ":00"
      : value.replace("T", " ");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.response_action_required.length === 0) {
      setError("Select at least one response action.");
      setSuccess("");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const data = new FormData();

      data.append("title", formData.title);
      data.append("location", formData.location);
      data.append(
        "incident_date",
        formatIncidentDate(formData.incident_date),
      );
      data.append(
        "current_situation_summary",
        formData.current_situation_summary,
      );

      formData.response_action_required.forEach((action) => {
        data.append("response_action_required[]", action);
      });

      formData.incident_photo.forEach((file) => {
        data.append("incident_photo[]", file);
      });

      const result = await createPostAlert(data);

      if (result.success) {
        setSuccess("Post Alert created successfully.");

        const createdAlert =
          result.data?.alert ??
          result.data?.post_alert ??
          result.data ??
          {};

        addAlertNotification({
          type: "Post alert",
          title: formData.title,
          description: `${formData.location} · ${formData.current_situation_summary}`,
          path: "/alerts/post-alerts",
          alert: {
            ...createdAlert,
            title: formData.title,
            location: formData.location,
            incident_date: formatIncidentDate(
              formData.incident_date,
            ),
            current_situation_summary:
              formData.current_situation_summary,
            response_action_required: [
              ...formData.response_action_required,
            ],
            photos:
              createdAlert.photos ??
              createdAlert.incident_photos ??
              createdAlert.incident_photo ??
              [],
          },
          alertId: createdAlert.post_alert_id ?? createdAlert.id,
        });

        setFormData({
          title: "",
          location: "",
          incident_date: "",
          current_situation_summary: "",
          response_action_required: [],
          incident_photo: [],
        });
        setShowForm(false);

        const fileInput = document.getElementById("incident_photo");
        if (fileInput) fileInput.value = "";

        await loadAlerts();
      } else {
        setError(result.message || "Unable to create post alert.");
      }
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Something went wrong while creating the alert.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date.replace(" ", "T")).toLocaleString();
  };

  const handleView = (alert) => {
    setViewingAlert(alert);
  };

  const closeModal = () => setViewingAlert(null);

  const handleDelete = async (alert) => {
    const id = getPostAlertKey(alert);

    if (!id) {
      setError("Unable to delete this alert because its ID is missing.");
      return;
    }

    if (!window.confirm(`Delete alert "${alert.title}"?`)) return;

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      const result = await deletePostAlert(id);

      if (result?.success === false) {
        throw new Error(result.message || "Unable to delete post alert.");
      }

      setAlerts((currentAlerts) =>
        currentAlerts.filter(
          (item) => String(item.post_alert_id ?? item.id) !== String(id),
        ),
      );

      setSuccess("Post Alert deleted successfully.");

      if (alerts.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await loadAlerts();
      }
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err.message ||
          "Unable to delete post alert.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100";

  const labelClass =
    "mb-1 block text-xs font-semibold text-slate-700";

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
      <div className="mx-auto max-w-4xl">
        {/* Page header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white shadow-sm">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                  />
                </svg>
              </div>

              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Post Alert
              </h1>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Create and manage emergency alerts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm((visible) => !visible);
                setError("");
                setSuccess("");
              }}
              aria-expanded={showForm}
              aria-controls="post-alert-form"
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

            <div className="flex w-fit items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-600">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                  />
                </svg>
              </div>

              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  Total Alerts
                </p>
                <p className="text-lg font-bold leading-tight text-slate-900">
                  {pagination?.total_items ?? alerts.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status messages */}
        {success && (
          <div
            role="status"
            className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"
          >
            <span className="text-sm">✓</span>
            {success}
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
              className="ml-auto rounded p-1 hover:bg-emerald-100"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          >
            <span className="text-sm font-bold">!</span>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error message"
              className="ml-auto shrink-0 rounded p-1 hover:bg-red-100"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Create alert */}
        <div
          id="post-alert-form"
          className={`grid transition-all duration-300 ease-in-out ${
            showForm
              ? "mb-4 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-200 px-3 py-2.5 sm:px-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50 text-red-600">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Create Post Alert
              </h2>
              <p className="text-[11px] text-slate-500">
                Publish an emergency situation alert
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Alert title */}
              <div>
                <label htmlFor="alert_title" className={labelClass}>
                  Alert Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="alert_title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Flood Emergency"
                  required
                  className={inputClass}
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="alert_location" className={labelClass}>
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  id="alert_location"
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Enter incident location"
                  required
                  className={inputClass}
                />
              </div>

              {/* Incident date */}
              <div>
                <label htmlFor="incident_date" className={labelClass}>
                  Incident Date &amp; Time{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="incident_date"
                  type="datetime-local"
                  name="incident_date"
                  value={formData.incident_date}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>

              {/* Response actions */}
              <div>
                <label className={labelClass}>
                  Response Action Required{" "}
                  <span className="text-red-500">*</span>
                </label>

                <div className="rounded-md border border-slate-200 p-2">
                  <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                    {RESPONSE_ACTIONS.map((action) => (
                      <label
                        key={action}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-700 transition hover:bg-red-50"
                      >
                        <input
                          type="checkbox"
                          value={action}
                          checked={formData.response_action_required.includes(
                            action,
                          )}
                          onChange={handleActionChange}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                        />
                        {action}
                      </label>
                    ))}
                  </div>

                  <p className="mt-1 px-2 text-[10px] text-slate-400">
                    Select one or more response actions.
                  </p>
                </div>
              </div>

              {/* Summary and photos: side by side on desktop */}
              <div className="grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2">
                {/* Current situation summary */}
                <div className="flex min-w-0 flex-col">
                  <label
                    htmlFor="situation_summary"
                    className={labelClass}
                  >
                    Current Situation Summary{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <textarea
                    id="situation_summary"
                    name="current_situation_summary"
                    value={formData.current_situation_summary}
                    onChange={handleChange}
                    placeholder="Describe the situation, affected areas, risks, or important instructions..."
                    rows={4}
                    required
                    className={`${inputClass} min-h-[120px] flex-1 resize-y leading-5`}
                  />
                </div>

                {/* Incident photos */}
                <div className="flex min-w-0 flex-col">
                  <label
                    htmlFor="incident_photo"
                    className={labelClass}
                  >
                    Incident Photos{" "}
                    <span className="font-normal text-slate-400">
                      (Optional)
                    </span>
                  </label>

                  <label
                    htmlFor="incident_photo"
                    className="group flex min-h-[120px] flex-1 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center transition hover:border-red-400 hover:bg-red-50/40"
                  >
                    <svg
                      className="mb-1.5 h-5 w-5 text-slate-400 transition group-hover:text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-10h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>

                    <p className="text-xs font-semibold text-slate-700">
                      Click to upload incident photos
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      PNG, JPG, JPEG or WebP · Multiple images supported
                    </p>

                    <input
                      id="incident_photo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>

                  {formData.incident_photo.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {formData.incident_photo.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-600"
                        >
                          <span className="text-red-500">▧</span>
                          <span className="max-w-[200px] truncate">
                            {file.name}
                          </span>
                          <span className="text-slate-400">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {submitting ? "Creating Alert..." : "Create Post Alert"}
              </button>
            </div>
          </form>
        </section>
          </div>
        </div>

        {/* Alert list */}
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2.5 sm:px-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Post Alerts
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Manage existing emergency alerts
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                {pagination?.total_items ?? alerts.length}
              </span>
              <DownloadMenu
                records={alerts}
                title="Post Alerts"
                disabled={loading}
                onError={(err) =>
                  setError(
                    err.message || "Failed to download post alerts.",
                  )
                }
              />
            </div>
          </div>

          <div className="p-2.5 sm:p-3">
            {loading ? (
              <div className="flex min-h-20 items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-red-100 border-t-red-600" />
                  <p className="mt-2 text-xs text-slate-500">
                    Loading alerts...
                  </p>
                </div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex min-h-28 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v3m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                    />
                  </svg>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  No post alerts found
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Select Create Alert to publish an emergency update.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert, index) => {
                  const isHighlighted =
                    getPostAlertKey(alert) === highlightedAlertKey;

                  return (
                    <article
                      key={getPostAlertKey(alert) ?? index}
                      ref={isHighlighted ? highlightedAlertRef : null}
                      className={`rounded-md border p-2.5 transition hover:border-slate-300 hover:shadow-sm sm:p-3 ${
                        isHighlighted
                          ? "border-red-300 bg-red-50/40 ring-1 ring-red-100"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-600">
                              Emergency
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatDate(alert.incident_date)}
                            </span>
                          </div>

                          <h3 className="mt-1 truncate text-sm font-semibold text-slate-900">
                            {alert.title || "Untitled Alert"}
                          </h3>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            <svg
                              className="mr-1 inline h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {alert.location || "Location not available"}
                          </p>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(alert)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <Eye size={13} />
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(alert)}
                            disabled={
                              deletingId === getPostAlertKey(alert)
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === getPostAlertKey(alert) ? (
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-[11px] font-medium text-slate-500">
              Page {page} of {pagination.total_pages}
            </span>

            <button
              type="button"
              disabled={page >= pagination.total_pages || loading}
              onClick={() =>
                setPage((currentPage) =>
                  Math.min(pagination.total_pages, currentPage + 1),
                )
              }
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {/* View alert modal */}
        {viewingAlert && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-[2px] sm:p-3"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="post-alert-details-title"
              className="relative flex max-h-[75vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-2xl"
            >
              {/* Modal header */}
              <header className="flex shrink-0 items-center justify-between gap-3 bg-red-600 px-3 py-2.5 text-white sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                      />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-red-100">
                      Emergency Alert
                    </p>
                    <h2
                      id="post-alert-details-title"
                      className="truncate text-sm font-bold"
                    >
                      Alert Details
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close alert details"
                  className="shrink-0 rounded-md p-1.5 transition hover:bg-white/15"
                >
                  <X size={17} />
                </button>
              </header>

              {/* Modal body */}
              <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-2.5">
                <div className="space-y-1.5">
                  {/* Emergency information */}
                  <section className="rounded-md border border-slate-200 bg-white p-2.5">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-red-600">
                        Emergency Information
                      </span>
                    </div>

                    <h3 className="break-words text-sm font-bold text-slate-900 sm:text-base">
                      {viewingAlert.title || "Untitled Alert"}
                    </h3>

                    <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      <div className="rounded-md bg-slate-50 p-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                          Location
                        </p>
                        <p className="mt-1 break-words text-xs font-semibold text-slate-800">
                          {viewingAlert.location || "-"}
                        </p>
                      </div>

                      <div className="rounded-md bg-slate-50 p-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                          Incident Date &amp; Time
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-800">
                          {formatDate(viewingAlert.incident_date)}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Current situation */}
                  <section className="rounded-md border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <h4 className="text-xs font-bold text-slate-900">
                        Current Situation
                      </h4>
                    </div>
                    <div className="p-2.5">
                      <p className="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 text-xs leading-4 text-slate-700">
                        {viewingAlert.current_situation_summary ||
                          "No situation summary available."}
                      </p>
                    </div>
                  </section>

                  {/* Response actions */}
                  <section className="rounded-md border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <h4 className="text-xs font-bold text-slate-900">
                        Response Actions Required
                      </h4>
                    </div>

                    <div className="p-2.5">
                      {getResponseActions(viewingAlert).length > 0 ? (
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          {getResponseActions(viewingAlert).map(
                            (action, index) => (
                              <div
                                key={`${action}-${index}`}
                                className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50/60 px-2.5 py-2"
                              >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </span>
                                <span className="break-words text-xs font-semibold text-red-800">
                                  {action}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-500">
                          No response actions specified.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Incident photos */}
                  <section className="rounded-md border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                      <h4 className="text-xs font-bold text-slate-900">
                        Incident Photos
                      </h4>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">
                        {getAlertPhotos(viewingAlert).length}{" "}
                        {getAlertPhotos(viewingAlert).length === 1
                          ? "Photo"
                          : "Photos"}
                      </span>
                    </div>

                    <div className="p-2.5">
                      {getAlertPhotos(viewingAlert).length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {getAlertPhotos(viewingAlert).map(
                            (photo, index) => {
                              const source = getPhotoSource(photo);

                              if (!source) {
                                return (
                                  <div
                                    key={photo?.id ?? index}
                                    className="flex min-h-24 items-center justify-center rounded-md border border-amber-200 bg-amber-50 p-2.5 text-center"
                                  >
                                    <div>
                                      <p className="text-xs font-semibold text-amber-800">
                                        Photo {index + 1}
                                      </p>
                                      <p className="mt-1 text-[10px] text-amber-700">
                                        No image URL available.
                                      </p>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <AlertPhoto
                                  key={photo?.id ?? `${source}-${index}`}
                                  source={source}
                                  index={index}
                                />
                              );
                            },
                          )}
                        </div>
                      ) : (
                        <div className="flex min-h-20 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 text-center">
                          <p className="text-xs font-semibold text-slate-700">
                            No incident photos
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            No images were attached to this alert.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              {/* Modal footer */}
              <footer className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-3 py-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  Close
                </button>
              </footer>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default PostAlert;
