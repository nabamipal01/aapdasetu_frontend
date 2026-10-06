import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Trash2, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config/Config";
import PostAlertService from "../../services/PostAlertService";
import { addAlertNotification } from "../../utils/alertNotifications";

const RESPONSE_ACTIONS = [
  "Evacuation",
  "Rescue Operation",
  "Relief Distribution",
  "Medical Support",
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
        ].find((value) => typeof value === "string" && value.length > 0);

  if (!path) return "";

  if (/^(https?:|data:|blob:)/i.test(path)) {
    return path;
  }

  if (typeof photo === "object" && (photo.photo || photo.image)) {
    return getPhotoSource(photo.photo || photo.image);
  }

  const baseUrl = new URL(API_BASE_URL, window.location.origin);

  const normalizedPath = String(path).replace(/\\/g, "/").replace(/^\/+/, "");

  const basePath = baseUrl.pathname.replace(/\/+$/, "");

  const normalizedBasePath = basePath.replace(/^\/+/, "");

  const relativePath = normalizedPath.startsWith(`${normalizedBasePath}/`)
    ? normalizedPath.slice(normalizedBasePath.length + 1)
    : normalizedPath;

  return new URL(relativePath, `${baseUrl.origin}${basePath}/`).toString();
};

function AlertPhoto({ source, index }) {
  const [loadError, setLoadError] = useState(false);

  if (loadError) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Photo {index + 1} could not be loaded.
          </p>
          <p className="mt-1 break-all text-xs text-amber-700">
            Check that the image URL is reachable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-slate-100">
        <img
          src={source}
          alt={`Incident photo ${index + 1}`}
          onError={() => setLoadError(true)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-8">
          <p className="text-xs font-semibold text-white">
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
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [viewingAlert, setViewingAlert] = useState(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [viewingError, setViewingError] = useState("");
  const [highlightedAlertKey, setHighlightedAlertKey] = useState(null);
  const highlightedAlertRef = useRef(null);
  const pendingNotificationAlertRef = useRef(null);

  const [deletingId, setDeletingId] = useState(null);

  /* =========================================================
     LOAD ALERTS
  ========================================================= */

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await PostAlertService.getPostAlerts(page, 10);

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
            samePostAlert(alert, pendingAlert)
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
          : [alert, ...currentAlerts]
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

  /* =========================================================
     FORM HANDLERS
  ========================================================= */

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

  /* =========================================================
     CREATE ALERT
  ========================================================= */

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

      data.append("incident_date", formatIncidentDate(formData.incident_date));

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

      const result = await PostAlertService.createPostAlert(data);

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
            incident_date: formatIncidentDate(formData.incident_date),
            current_situation_summary: formData.current_situation_summary,
            response_action_required: [...formData.response_action_required],
            photos:
              createdAlert.photos ??
              createdAlert.incident_photos ??
              createdAlert.incident_photo ??
              [],
          },
          alertId:
            createdAlert.post_alert_id ?? createdAlert.id,
        });

        setFormData({
          title: "",
          location: "",
          incident_date: "",
          current_situation_summary: "",
          response_action_required: [],
          incident_photo: [],
        });

        const fileInput = document.getElementById("incident_photo");

        if (fileInput) {
          fileInput.value = "";
        }

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

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date.replace(" ", "T")).toLocaleString();
  };

  /* =========================================================
     VIEW ALERT
  ========================================================= */

  const handleView = (alert) => {
    setViewingAlert(alert);
    setViewingError("");
    setViewingLoading(false);
  };

  /* =========================================================
     DELETE ALERT
  ========================================================= */

  const handleDelete = async (alert) => {
    const id = getPostAlertKey(alert);

    if (!id) {
      setError("Unable to delete this alert because its ID is missing.");
      return;
    }

    if (!window.confirm(`Delete alert "${alert.title}"?`)) {
      return;
    }

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      const result = await PostAlertService.deletePostAlert(id);

      if (result?.success === false) {
        throw new Error(result.message || "Unable to delete post alert.");
      }

      setAlerts((currentAlerts) =>
        currentAlerts.filter((item) => (item.post_alert_id ?? item.id) !== id),
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

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-200">
                <svg
                  className="h-6 w-6"
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

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Post Alert
              </h1>
            </div>

            <p className="text-sm text-slate-500 sm:text-base">
              Create and manage emergency alerts
            </p>
          </div>

          <div className="hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:block">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Total Alerts
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {pagination?.total_items ?? alerts.length}
            </p>
          </div>
        </div>

        {/* =====================================================
            SUCCESS MESSAGE
        ===================================================== */}

        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <svg
              className="h-5 w-5 shrink-0"
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

            {success}
          </div>
        )}

        {/* =====================================================
            ERROR MESSAGE
        ===================================================== */}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <svg
              className="h-5 w-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 1.73 1.73 3z"
              />
            </svg>

            {error}
          </div>
        )}

        {/* =====================================================
            CREATE ALERT CARD
        ===================================================== */}

        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Card Header */}

          <div className="border-b border-slate-200 bg-gradient-to-r from-red-50 to-white px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <svg
                  className="h-5 w-5"
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
                <h2 className="text-lg font-bold text-slate-900">
                  Create Post Alert
                </h2>

                <p className="text-sm text-slate-500">
                  Publish an emergency situation alert
                </p>
              </div>
            </div>
          </div>

          {/* ===================================================
              FORM
          =================================================== */}

          <form onSubmit={handleSubmit} className="p-5 sm:p-7">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Title */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Alert Title
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Flood Emergency"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </div>

              {/* Location */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Location
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17.657 16.657L13.414 21a2 2 0 01-2.828 0l-4.243-4.343a8 8 0 1111.314 0z"
                      />

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>

                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Enter incident location"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />
                </div>
              </div>

              {/* Incident Date */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Incident Date & Time
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  type="datetime-local"
                  name="incident_date"
                  value={formData.incident_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </div>

              {/* Response Action */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Response Action Required
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <div className="rounded-xl border border-slate-300 bg-white p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {RESPONSE_ACTIONS.map((action) => (
                      <label
                        key={action}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 transition hover:bg-red-50"
                      >
                        <input
                          type="checkbox"
                          value={action}
                          checked={formData.response_action_required.includes(
                            action,
                          )}
                          onChange={handleActionChange}
                          className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                        />

                        {action}
                      </label>
                    ))}
                  </div>

                  <p className="mt-1.5 text-xs text-slate-500">
                    Select one or more response actions.
                  </p>
                </div>
              </div>

              {/* Situation */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Current Situation Summary
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <textarea
                  name="current_situation_summary"
                  value={formData.current_situation_summary}
                  onChange={handleChange}
                  placeholder="Describe the current situation, affected areas, risks, or important instructions..."
                  rows={5}
                  required
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </div>

              {/* Photo Upload */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Incident Photo
                </label>

                <label
                  htmlFor="incident_photo"
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-red-400 hover:bg-red-50/40"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition group-hover:text-red-500">
                    <svg
                      className="h-6 w-6"
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
                  </div>

                  <p className="text-sm font-semibold text-slate-700">
                    Click to upload incident photos
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    PNG, JPG or JPEG • Multiple images supported
                  </p>

                  <input
                    id="incident_photo"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {formData.incident_photo.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.incident_photo.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                      >
                        <svg
                          className="h-4 w-4 text-red-500"
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

                        <span className="max-w-[200px] truncate">
                          {file.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating Alert...
                  </>
                ) : (
                  "Create Post Alert"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* =====================================================
            ALERT LIST
        ===================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Post Alerts
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Manage existing emergency alerts
                </p>
              </div>

              <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                {pagination?.total_items ?? alerts.length}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-red-100 border-t-red-600" />

                  <p className="mt-4 text-sm font-medium text-slate-600">
                    Loading alerts...
                  </p>
                </div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                  <svg
                    className="h-7 w-7"
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

                <p className="mt-4 text-sm font-semibold text-slate-700">
                  No post alerts found
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Create an alert using the form above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const id = alert.post_alert_id ?? alert.id;

                  return (
                    <div
                      key={id}
                      ref={
                        getPostAlertKey(alert) === highlightedAlertKey
                          ? highlightedAlertRef
                          : null
                      }
                      className={`group rounded-xl border bg-white p-4 transition hover:border-red-200 hover:shadow-md sm:p-5 ${
                        getPostAlertKey(alert) === highlightedAlertKey
                          ? "border-red-400 ring-2 ring-red-100"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-600">
                              Emergency
                            </span>

                            <span className="text-xs text-slate-400">
                              {formatDate(alert.incident_date)}
                            </span>
                          </div>

                          <h3 className="mt-2 truncate text-base font-bold text-slate-900 sm:text-lg">
                            {alert.title || "Untitled Alert"}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {alert.location || "Location not available"}
                          </p>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(alert)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <Eye size={17} />
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(alert)}
                            disabled={deletingId === id}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === id ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                            ) : (
                              <Trash2 size={17} />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            PAGINATION
        ===================================================== */}

        {pagination && pagination.total_pages > 1 && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm font-medium text-slate-500">
              Page {page} of {pagination.total_pages}
            </span>

            <button
              type="button"
              disabled={page >= pagination.total_pages}
              onClick={() =>
                setPage((currentPage) =>
                  Math.min(pagination.total_pages, currentPage + 1),
                )
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {/* =====================================================
            VIEW ALERT MODAL
            IMPORTANT: This is OUTSIDE the form.
        ===================================================== */}

        {viewingAlert && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
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
              aria-labelledby="post-alert-details-title"
              className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl"
            >
              {/* =================================================
                  MODAL HEADER
              ================================================= */}

              <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-red-700 via-red-600 to-red-500 px-5 py-5 text-white sm:px-7">
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />

                <div className="pointer-events-none absolute -bottom-20 right-20 h-48 w-48 rounded-full bg-white/5" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                      <svg
                        className="h-6 w-6"
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
                      <div className="mb-1 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-white/20">
                          Emergency Alert
                        </span>
                      </div>

                      <h2
                        id="post-alert-details-title"
                        className="truncate text-xl font-bold sm:text-2xl"
                      >
                        Alert Details
                      </h2>

                      <p className="mt-1 text-sm text-red-100">
                        Emergency situation information and response
                        requirements
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewingAlert(null)}
                    aria-label="Close alert details"
                    className="shrink-0 rounded-xl bg-white/10 p-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
                  >
                    <X size={21} />
                  </button>
                </div>
              </div>

              {/* =================================================
                  MODAL CONTENT
              ================================================= */}

              <div className="min-h-0 flex-1 overflow-y-auto">
                {viewingLoading ? (
                  <div className="flex min-h-[420px] flex-col items-center justify-center px-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-100 border-t-red-600" />
                    </div>

                    <p className="mt-5 text-base font-semibold text-slate-800">
                      Loading alert details
                    </p>

                    <p className="mt-1 text-center text-sm text-slate-500">
                      Please wait while we retrieve the emergency information.
                    </p>
                  </div>
                ) : viewingError ? (
                  <div className="flex min-h-[420px] items-center justify-center px-6">
                    <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 1.73 1.73 3z"
                          />
                        </svg>
                      </div>

                      <h3 className="mt-4 font-bold text-red-900">
                        Unable to load alert
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-red-700">
                        {viewingError}
                      </p>

                      <button
                        type="button"
                        onClick={() => setViewingAlert(null)}
                        className="mt-5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 p-4 sm:p-6 lg:p-7">
                    {/* =========================================
                        ALERT SUMMARY
                    ========================================= */}

                    <div className="overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
                      <div className="border-b border-red-100 bg-gradient-to-r from-red-50 to-white px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-600 shadow-sm shadow-red-300" />

                          <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                            Active Emergency
                          </span>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6">
                        <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                          {viewingAlert.title || "Untitled Alert"}
                        </h3>

                        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {/* Location */}

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-red-600 shadow-sm">
                                <svg
                                  className="h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M17.657 16.657L13.414 21a2 2 0 01-2.828 0l-4.243-4.343a8 8 0 1111.314 0z"
                                  />

                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Location
                                </p>

                                <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                                  {viewingAlert.location || "-"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Incident Date */}

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-red-600 shadow-sm">
                                <svg
                                  className="h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Incident Date & Time
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {formatDate(viewingAlert.incident_date)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* =========================================
                        CURRENT SITUATION
                    ========================================= */}

                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 1.73 1.73 3z"
                            />
                          </svg>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            Current Situation
                          </h4>

                          <p className="text-xs text-slate-400">
                            Situation summary and important information
                          </p>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                            {viewingAlert.current_situation_summary ||
                              "No situation summary available."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* =========================================
                        RESPONSE ACTIONS
                    ========================================= */}

                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            Response Actions Required
                          </h4>

                          <p className="text-xs text-slate-400">
                            Required emergency response activities
                          </p>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6">
                        {getResponseActions(viewingAlert).length > 0 ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {getResponseActions(viewingAlert).map(
                              (action, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3"
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
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
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </div>

                                  <span className="text-sm font-semibold text-red-800">
                                    {action}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
                            <p className="text-sm text-slate-500">
                              No response actions specified.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* =========================================
                        INCIDENT PHOTOS
                    ========================================= */}

                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <svg
                              className="h-5 w-5"
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
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              Incident Photos
                            </h4>

                            <p className="text-xs text-slate-400">
                              Supporting images from the incident
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {getAlertPhotos(viewingAlert).length}{" "}
                          {getAlertPhotos(viewingAlert).length === 1
                            ? "Photo"
                            : "Photos"}
                        </span>
                      </div>

                      <div className="p-5 sm:p-6">
                        {getAlertPhotos(viewingAlert).length > 0 ? (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {getAlertPhotos(viewingAlert).map(
                              (photo, index) => {
                                const source = getPhotoSource(photo);

                                if (!source) {
                                  return (
                                    <div
                                      key={index}
                                      className="flex min-h-48 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-4 text-center"
                                    >
                                      <div>
                                        <p className="text-sm font-semibold text-amber-800">
                                          Photo {index + 1}
                                        </p>

                                        <p className="mt-1 text-xs text-amber-700">
                                          No image URL available.
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <AlertPhoto
                                    key={photo?.id ?? source}
                                    source={source}
                                    index={index}
                                  />
                                );
                              },
                            )}
                          </div>
                        ) : (
                          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                              <svg
                                className="h-6 w-6"
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
                            </div>

                            <p className="mt-3 text-sm font-semibold text-slate-700">
                              No incident photos
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              No images were attached to this alert.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* =========================================
                        MODAL FOOTER
                    ========================================= */}

                    <div className="flex justify-end border-t border-slate-200 pt-1">
                      <button
                        type="button"
                        onClick={() => setViewingAlert(null)}
                        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default PostAlert;
