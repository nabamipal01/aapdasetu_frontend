
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BellRing,
  Eye,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config/Config";
import {
  createPostAlert,
  deletePostAlert,
  getPostAlerts,
  listDistricts,
} from "../../services";
import { addAlertNotification } from "../../utils/alertNotifications";
import DownloadMenu from "../../components/common/DownloadMenu";
import { useAuth } from "../../context/AuthContext";
import {
  canCreateAlerts,
  canManageAlerts,
  getUserDistrictId,
  isAlertVisibleToUser,
} from "../../utils/roles";

const RESPONSE_ACTIONS = [
  "Evacuation",
  "Rescue Operation",
  "Relief Distribution",
  "Medical Support",
  "Other",
];

const EMPTY_FORM = {
  title: "",
  location: "",
  incident_date: "",
  current_situation_summary: "",
  response_action_required: [],
  incident_photo: [],
  district_id: "",
};

const getResponseActions = (alert) => {
  const actions = alert?.response_action_required;

  if (Array.isArray(actions)) return actions;

  if (typeof actions === "string" && actions.trim()) {
    try {
      const parsed = JSON.parse(actions);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return actions.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return actions ? [actions] : [];
};

const getPostAlertKey = (alert) =>
  alert?.post_alert_id ??
  alert?.id ??
  alert?._notificationKey ??
  `${alert?.title ?? "alert"}-${alert?.incident_date ?? ""}`;

const samePostAlert = (first, second) => {
  const firstId = first?.post_alert_id ?? first?.id;
  const secondId = second?.post_alert_id ?? second?.id;

  if (firstId != null && secondId != null) {
    return String(firstId) === String(secondId);
  }

  return (
    first?.title === second?.title &&
    first?.incident_date === second?.incident_date
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

  try {
    const baseUrl = new URL(API_BASE_URL, window.location.origin);
    const normalizedPath = String(path)
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    const basePath = baseUrl.pathname.replace(/\/+$/, "");
    const normalizedBasePath = basePath.replace(/^\/+/, "");

    const relativePath = normalizedPath.startsWith(
      `${normalizedBasePath}/`
    )
      ? normalizedPath.slice(normalizedBasePath.length + 1)
      : normalizedPath;

    return new URL(
      relativePath,
      `${baseUrl.origin}${basePath}/`
    ).toString();
  } catch {
    return path;
  }
};

const extractAlertItems = (data) => {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.alerts)) return data.alerts;
  if (Array.isArray(data?.post_alerts)) return data.post_alerts;
  if (Array.isArray(data)) return data;
  return [];
};

function PostAlert() {
  const { user } = useAuth();

  const canCreate = canCreateAlerts(user);
  const canManage = canManageAlerts(user);

  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [alerts, setAlerts] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(canManage);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [viewingAlert, setViewingAlert] = useState(null);
  const [highlightedAlertKey, setHighlightedAlertKey] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const highlightedAlertRef = useRef(null);
  const pendingNotificationAlertRef = useRef(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getPostAlerts(page, 10);

      if (result?.success === false) {
        throw new Error(result.message || "Unable to load post alerts.");
      }

      const data = result?.data ?? result;
      const alertItems = extractAlertItems(data);

      const visibleAlerts = alertItems.filter((alert) =>
        isAlertVisibleToUser(alert, user)
      );

      const pendingAlert = pendingNotificationAlertRef.current;

      if (pendingAlert) {
        const existingAlert = visibleAlerts.find((alert) =>
          samePostAlert(alert, pendingAlert)
        );

        const alertToHighlight = existingAlert ?? pendingAlert;

        setAlerts(
          existingAlert
            ? visibleAlerts
            : [pendingAlert, ...visibleAlerts]
        );

        setHighlightedAlertKey(getPostAlertKey(alertToHighlight));
        pendingNotificationAlertRef.current = null;
      } else {
        setAlerts(visibleAlerts);
      }

      setPagination(data?.pagination ?? result?.pagination ?? null);
    } catch (err) {
      console.error("Failed to load post alerts:", err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Unable to load post alerts."
      );
    } finally {
      setLoading(false);
    }
  }, [page, user]);

  useEffect(() => {
    let active = true;

    setDistrictsLoading(canManage);

    if (!canManage) {
      setDistricts([]);
      return undefined;
    }

    listDistricts()
      .then((result) => {
        if (!active) return;

        const items = result?.data?.districts ?? result?.data ?? [];

        if (!Array.isArray(items)) {
          throw new Error("Unable to load districts.");
        }

        setDistricts(items);
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load districts.");
        }
      })
      .finally(() => {
        if (active) setDistrictsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canManage]);

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

    if (!isAlertVisibleToUser(notification.alert, user)) {
      navigate(location.pathname, {
        replace: true,
        state: null,
      });
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const alertId =
        notification.alert.post_alert_id ??
        notification.alert.id ??
        notification.alertId;

      const alert = {
        ...notification.alert,
        ...(alertId != null ? { post_alert_id: alertId } : {}),
        _notificationKey:
          notification.id ?? notification.alert._notificationKey,
      };

      pendingNotificationAlertRef.current = alert;

      setPage(1);

      setAlerts((currentAlerts) =>
        currentAlerts.some((item) => samePostAlert(item, alert))
          ? currentAlerts
          : [alert, ...currentAlerts]
      );

      setHighlightedAlertKey(getPostAlertKey(alert));

      navigate(location.pathname, {
        replace: true,
        state: null,
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    location.key,
    location.pathname,
    location.state,
    navigate,
    user,
  ]);

  useEffect(() => {
    if (!loading && highlightedAlertRef.current) {
      highlightedAlertRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [alerts, highlightedAlertKey, loading]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleActionChange = (event) => {
    const { checked, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      response_action_required: checked
        ? [...previous.response_action_required, value]
        : previous.response_action_required.filter(
            (action) => action !== value
          ),
    }));
  };

  const handleFileChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      incident_photo: Array.from(event.target.files || []),
    }));
  };

  const formatIncidentDate = (value) => {
    if (!value) return "";

    return value.length === 16
      ? `${value.replace("T", " ")}:00`
      : value.replace("T", " ");
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setShowForm(false);

    const fileInput = document.getElementById("incident_photo");

    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (event) => {
    if (!canCreate) return;

    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.title.trim()) {
      setError("Alert title is required.");
      return;
    }

    if (!formData.location.trim()) {
      setError("Location is required.");
      return;
    }

    if (!formData.incident_date) {
      setError("Incident date and time are required.");
      return;
    }

    if (!formData.current_situation_summary.trim()) {
      setError("Current situation summary is required.");
      return;
    }

    if (formData.response_action_required.length === 0) {
      setError("Select at least one response action.");
      return;
    }

    const districtId = canManage
      ? formData.district_id === ""
        ? null
        : formData.district_id
      : getUserDistrictId(user);

    if (!canManage && districtId == null) {
      setError("Your account is not associated with a district.");
      return;
    }

    setSubmitting(true);

    try {
      const data = new FormData();

      data.append("title", formData.title.trim());
      data.append("location", formData.location.trim());
      data.append(
        "incident_date",
        formatIncidentDate(formData.incident_date)
      );
      data.append(
        "current_situation_summary",
        formData.current_situation_summary.trim()
      );

      // FormData cannot transmit a JavaScript null directly.
      // Send the literal string "null" for global alerts.
      data.append("district_id", districtId == null ? "" : String(districtId));

      formData.response_action_required.forEach((action) => {
        data.append("response_action_required[]", action);
      });

      formData.incident_photo.forEach((file) => {
        data.append("incident_photo[]", file);
      });

      const result = await createPostAlert(data);

      if (result?.success === false) {
        throw new Error(
          result.message || "Unable to create post alert."
        );
      }

      const responseData = result?.data ?? result;

      const createdAlert =
        responseData?.alert ??
        responseData?.post_alert ??
        responseData ??
        {};

      const normalizedDistrictId =
        districtId == null ? null : Number(districtId);

      const scopedAlert = {
        ...createdAlert,
        district_id: normalizedDistrictId,
        title: formData.title.trim(),
        location: formData.location.trim(),
        incident_date: formatIncidentDate(formData.incident_date),
        current_situation_summary:
          formData.current_situation_summary.trim(),
        response_action_required: [
          ...formData.response_action_required,
        ],
        photos:
          createdAlert.photos ??
          createdAlert.incident_photos ??
          createdAlert.images ??
          createdAlert.incident_photo ??
          [],
      };

      const alertTitle = scopedAlert.title;

      addAlertNotification({
        type: "Post alert",
        title: alertTitle,
        description: `${scopedAlert.location} · ${scopedAlert.current_situation_summary}`,
        path: "/post-alerts",
        alert: scopedAlert,
        alertId:
          createdAlert.post_alert_id ?? createdAlert.id,
        districtId: normalizedDistrictId,
      });

      pendingNotificationAlertRef.current = scopedAlert;

      setAlerts((currentAlerts) =>
        currentAlerts.some((item) =>
          samePostAlert(item, scopedAlert)
        )
          ? currentAlerts
          : [scopedAlert, ...currentAlerts]
      );

      setHighlightedAlertKey(getPostAlertKey(scopedAlert));
      setPage(1);

      const selectedDistrict = districts.find(
        (district) =>
          String(district.id) === String(districtId)
      );

      setSuccess(
        `Post Alert created for ${
          districtId == null
            ? "all districts"
            : selectedDistrict?.name || "the selected district"
        }.`
      );

      resetForm();

      // Refresh the first page after creation. The pending alert ref
      // keeps the new alert visible if the API response omits it.
      if (page === 1) {
        await loadAlerts();
      }
    } catch (err) {
      console.error("Failed to create post alert:", err);

      setError(
        err?.response?.data?.message ||
          err.message ||
          "Something went wrong while creating the alert."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    const normalized = String(date).replace(" ", "T");
    const parsed = new Date(normalized);

    return Number.isNaN(parsed.getTime())
      ? String(date)
      : parsed.toLocaleString();
  };

  const handleView = (alert) => setViewingAlert(alert);

  const closeModal = () => setViewingAlert(null);

  const handleDelete = async (alert) => {
    if (!canManage) return;

    const id = alert.post_alert_id ?? alert.id;

    if (id == null) {
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
      const result = await deletePostAlert(id);

      if (result?.success === false) {
        throw new Error(
          result.message || "Unable to delete post alert."
        );
      }

      setAlerts((currentAlerts) =>
        currentAlerts.filter(
          (item) =>
            String(item.post_alert_id ?? item.id) !== String(id)
        )
      );

      if (
        viewingAlert &&
        String(viewingAlert.post_alert_id ?? viewingAlert.id) ===
          String(id)
      ) {
        setViewingAlert(null);
      }

      setSuccess("Post Alert deleted successfully.");

      if (alerts.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await loadAlerts();
      }
    } catch (err) {
      console.error("Failed to delete post alert:", err);

      const msg = err?.message || "";
      if (err?.status === 403 || msg.toLowerCase().includes("district") || msg.toLowerCase().includes("forbidden")) {
        setError("Cannot delete this post alert — it may not be assigned to a valid district, or you don't have permission to delete it.");
      } else {
        setError(
          err?.response?.data?.message ||
            msg ||
            "Unable to delete post alert."
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const exportRecords = alerts.map((alert, index) => ({
    "S.No.": index + 1,
    "Alert Title": alert.title ?? "",
    Location: alert.location ?? "",
    "Incident Date & Time": alert.incident_date ?? "",
    "Situation Summary": alert.current_situation_summary ?? "",
    "Required Response Actions": getResponseActions(alert).join(", "),
  }));

  const fieldClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-red-50/30 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BellRing className="text-red-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Post-Alerts
              </h1>
              <p className="text-sm text-slate-500">
                {canManage
                  ? "Create and manage emergency situation updates"
                  : canCreate
                    ? "Create emergency situation updates"
                    : "View emergency situation updates"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <DownloadMenu
              records={exportRecords}
              title="Post Alerts"
              disabled={loading}
              onError={(err) =>
                setError(
                  err.message || "Failed to download post alerts."
                )
              }
            />

            <button
              type="button"
              onClick={loadAlerts}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  if (showForm) {
                    resetForm();
                  } else {
                    setFormData({ ...EMPTY_FORM });
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
                  Issue New Post Alert
                </h2>

                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    {canManage && (
                      <div className="md:col-span-2">
                        <label className={labelClass}>District</label>

                        <select
                          name="district_id"
                          value={formData.district_id}
                          onChange={handleChange}
                          disabled={districtsLoading}
                          className={fieldClass}
                        >
                          <option value="">
                            {districtsLoading
                              ? "Loading districts..."
                              : "All Districts"}
                          </option>

                          {districts.map((district) => (
                            <option
                              key={district.id}
                              value={district.id}
                            >
                              {district.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className={labelClass}>
                        Alert Title *
                      </label>

                      <input
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Flood situation update"
                        className={fieldClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Location *</label>

                      <input
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        required
                        placeholder="District / area"
                        className={fieldClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Incident Date &amp; Time *
                      </label>

                      <input
                        type="datetime-local"
                        name="incident_date"
                        value={formData.incident_date}
                        onChange={handleChange}
                        required
                        className={fieldClass}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className={labelClass}>
                        Current Situation Summary *
                      </label>

                      <textarea
                        name="current_situation_summary"
                        rows={3}
                        value={formData.current_situation_summary}
                        onChange={handleChange}
                        required
                        placeholder="Describe the current situation in detail..."
                        className={`${fieldClass} resize-none`}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className={labelClass}>
                        Response Actions Required *
                      </label>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {RESPONSE_ACTIONS.map((action) => (
                          <label
                            key={action}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              value={action}
                              checked={formData.response_action_required.includes(
                                action
                              )}
                              onChange={handleActionChange}
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                            />
                            {action}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className={labelClass}>
                        Incident Photos
                      </label>

                      <input
                        id="incident_photo"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-red-700 hover:file:bg-red-100"
                      />

                      {formData.incident_photo.length > 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                          {formData.incident_photo.length} file(s) selected
                        </p>
                      )}
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
                      disabled={
                        submitting ||
                        (canManage && districtsLoading)
                      }
                      className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Sending..." : "Issue Alert"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <BellRing size={40} className="mb-3 text-slate-300" />
            <p className="font-medium text-slate-700">
              No post alerts found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {canCreate
                ? "Create an alert to publish an emergency update."
                : "Alerts published by authorized users will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {alerts.map((alert, index) => {
              const alertKey = getPostAlertKey(alert);
              const isHighlighted =
                String(alertKey) === String(highlightedAlertKey);
              const summary =
                alert.current_situation_summary ||
                alert.description ||
                "No situation summary available.";
              const photos = getAlertPhotos(alert);

              return (
                <article
                  key={alertKey ?? index}
                  ref={isHighlighted ? highlightedAlertRef : null}
                  className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-[0_12px_24px_-10px_rgba(15,23,42,0.15)] ${
                    isHighlighted
                      ? "border-red-300 ring-2 ring-red-100"
                      : "border-slate-200/80"
                  }`}
                >
                  <div className="border-b border-slate-100 bg-gradient-to-r from-red-50/80 to-white px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Post-Alert
                      </span>

                      <span className="text-[11px] text-slate-400">
                        {formatDate(alert.incident_date)}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                        {alert.district_id
                          ? districts.find(
                              (d) => String(d.id) === String(alert.district_id)
                            )?.name || `District #${alert.district_id}`
                          : "All Districts"}
                      </span>
                    </div>

                    <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-slate-900">
                      {alert.title || "Untitled Alert"}
                    </h3>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {alert.location || "Location not available"}
                    </p>
                  </div>

                  <div className="flex flex-1 flex-col px-4 py-3">
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {summary}
                    </p>

                    {photos.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-hidden">
                        {photos.slice(0, 3).map((photo, photoIndex) => {
                          const source = getPhotoSource(photo);

                          if (!source) return null;

                          return (
                            <div
                              key={`${alertKey}-photo-${photoIndex}`}
                              className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                            >
                              <img
                                src={source}
                                alt={`Incident photo ${photoIndex + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          );
                        })}

                        {photos.length > 3 && (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[11px] font-semibold text-slate-500">
                            +{photos.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => handleView(alert)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        title="View alert"
                      >
                        <Eye size={16} />
                      </button>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDelete(alert)}
                          disabled={deletingId === alertKey}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Delete alert"
                        >
                          {deletingId === alertKey ? (
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pagination && pagination.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>

            <p className="text-xs text-slate-500">
              Page {pagination.current_page ?? page} of{" "}
              {pagination.total_pages}
            </p>

            <button
              type="button"
              disabled={
                page >= pagination.total_pages || loading
              }
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {viewingAlert && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="post-alert-details-title"
              className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            >
              <div className="flex items-center justify-between gap-3">
                <h2
                  id="post-alert-details-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {viewingAlert.title || "Post-alert details"}
                </h2>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    District
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {viewingAlert.district_id
                      ? districts.find(
                          (d) => String(d.id) === String(viewingAlert.district_id)
                        )?.name || `District #${viewingAlert.district_id}`
                      : "All Districts"}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Location
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {viewingAlert.location || "—"}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Incident Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatDate(viewingAlert.incident_date)}
                  </p>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {viewingAlert.current_situation_summary ||
                  "No situation summary available."}
              </p>

              {getResponseActions(viewingAlert).length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Response Actions
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {getResponseActions(viewingAlert).map(
                      (action, index) => (
                        <span
                          key={`${action}-${index}`}
                          className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
                        >
                          {action}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {getAlertPhotos(viewingAlert).length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Photos
                  </p>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {getAlertPhotos(viewingAlert).map((photo, index) => {
                      const source = getPhotoSource(photo);

                      if (!source) return null;

                      return (
                        <div
                          key={photo?.id ?? `${source}-${index}`}
                          className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                        >
                          <img
                            src={source}
                            alt={`Incident photo ${index + 1}`}
                            className="h-28 w-full object-cover"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
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

export default PostAlert;
