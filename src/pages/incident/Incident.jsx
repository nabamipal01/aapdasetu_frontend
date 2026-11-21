import React, { useState, useEffect, useCallback } from "react";

import {

  listIncidents,

  createIncident,

  getIncident,

  updateIncident,

  deleteIncident,

  listIncidentReports,

  getIncidentReport,

  createIncidentReport,

  updateIncidentReport,

  reviewIncidentReport,

} from "../../services";

import {

  AlertTriangle,

  Plus,

  X,

  RefreshCw,

  Trash2,

  Eye,

  Pencil,

  ChevronDown,

  Link2,

  Copy,

  Ban,

  FileText,

} from "lucide-react";

import DownloadMenu from "../../components/common/DownloadMenu";

import { useAuth } from "../../context/AuthContext";

import { canViewIncidents, canManageIncidents } from "../../utils/roles";

import { listDistricts } from "../../services/districtService";

 

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

  latitude: "",

  longitude: "",

  district_id: "",

};

 

const REPORT_STATUS_STYLES = {

  pending: "bg-amber-100 text-amber-800",

  verified: "bg-green-100 text-green-700",

  rejected: "bg-red-100 text-red-700",

  duplicate: "bg-slate-100 text-slate-600",

};

 

const EMPTY_REPORT_FORM = {

  title: "",

  incident_type: "",

  description: "",

  severity: "medium",

  latitude: "",

  longitude: "",

  district_id: "",

};

 

const normalizeRole = (value) =>

  String(value ?? "")

    .trim()

    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")

    .replace(/[\s-]+/g, "_")

    .toLowerCase();

 

const firstPresent = (...values) =>

  values.find((value) => value != null && String(value).trim() !== "") ?? "";

 

const getUserDistrictId = (user) =>

  firstPresent(

    user?.district_id,

    user?.districtId,

    user?.region_id,

    user?.regionId,

    user?.linked_id,

    user?.linkedId,

    user?.district?.id,

    user?.district?.district_id,

    user?.region?.id,

    user?.region?.region_id

  );

 

const getIncidentDistrictId = (incident) =>

  firstPresent(

    incident?.district_id,

    incident?.districtId,

    incident?.region_id,

    incident?.regionId,

    incident?.district?.id,

    incident?.district?.district_id,

    incident?.region?.id,

    incident?.region?.region_id,

    incident?.user?.district_id,

    incident?.user?.districtId,

    incident?.user?.region_id,

    incident?.user?.regionId,

    incident?.user?.linked_id,

    incident?.user?.linkedId

  );

 

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

  const isDistrictUser = [user?.role, user?.user_role, user?.user_type]

    .some((value) => ["district", "district_user"].includes(normalizeRole(value)));

  const userDistrictId = getUserDistrictId(user);

 

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

 

  const [districts, setDistricts] = useState([]);

  const [districtsLoading, setDistrictsLoading] = useState(false);

 

  const isVolunteerOrNgo = [user?.role, user?.user_role, user?.user_type].some(

    (value) => ["volunteer", "ngo_contact_person"].includes(normalizeRole(value))

  );

  const canCreateReport = isVolunteerOrNgo;

  const canReviewReports = canManage; // super admin / admins

 

  // existing state ...

  const [showReports, setShowReports] = useState(false);

  const [reports, setReports] = useState([]);

  const [reportsLoading, setReportsLoading] = useState(false);

  const [reportError, setReportError] = useState("");

  const [reportSuccess, setReportSuccess] = useState("");

 

  // create / edit report form

  const [showReportForm, setShowReportForm] = useState(false);

  const [reportForm, setReportForm] = useState(EMPTY_REPORT_FORM);

  const [editingReport, setEditingReport] = useState(null);

  const [reportSubmitting, setReportSubmitting] = useState(false);

 

  // review modal

  const [reviewReport, setReviewReport] = useState(null);

  const [reviewAction, setReviewAction] = useState(""); // linked_existing | created_new | marked_duplicate | rejected

  const [reviewIncidentId, setReviewIncidentId] = useState("");

  const [reviewDuplicateId, setReviewDuplicateId] = useState("");

  const [reviewRemarks, setReviewRemarks] = useState("");

  const [reviewSubmitting, setReviewSubmitting] = useState(false);

 

  const fetchReports = useCallback(async () => {

    if (!canView) return;

    setReportsLoading(true);

    setReportError("");

    try {

      const res = await listIncidentReports({

        ...(isDistrictUser && userDistrictId

          ? { district_id: Number(userDistrictId) }

          : {}),

        page: 1,

        per_page: 50,

      });

      const data =

        res?.data?.incident_reports ??

        res?.data?.reports ??

        res?.data?.items ??

        res?.data ??

        [];

      setReports(Array.isArray(data) ? data : []);

    } catch (err) {

      setReportError(err.message || "Failed to load incident reports");

    } finally {

      setReportsLoading(false);

    }

  }, [canView, isDistrictUser, userDistrictId]);

 

  useEffect(() => {

    if (showReports) fetchReports();

  }, [showReports, fetchReports]);

 

  const handleReportChange = (e) => {

    setReportForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  };

 

  const resetReportForm = () => {

    setReportForm(EMPTY_REPORT_FORM);

    setShowReportForm(false);

    setEditingReport(null);

  };

 

  const handleEditReport = async (report) => {

    if (!canCreateReport || report.status !== "pending") return;

    // optional ownership check if your API returns reported_by

    setEditingReport(report);

    setReportForm({

      title: report.title || "",

      incident_type: report.incident_type || "",

      description: report.description || "",

      severity: report.severity || "medium",

      latitude: report.latitude ?? "",

      longitude: report.longitude ?? "",

      district_id: report.district_id ? String(report.district_id) : "",

    });

    setShowReportForm(true);

    fetchDistricts();

  };

 

  const handleSubmitReport = async (e) => {

    e.preventDefault();

    if (!canCreateReport) return;

    if (!reportForm.title.trim() || !reportForm.incident_type) {

      setReportError("Title and Incident Type are required.");

      return;

    }

 

    const latitude = reportForm.latitude === "" ? null : Number(reportForm.latitude);

    const longitude = reportForm.longitude === "" ? null : Number(reportForm.longitude);

 

    setReportSubmitting(true);

    setReportError("");

    setReportSuccess("");

    try {

      const payload = {

        title: reportForm.title.trim(),

        incident_type: reportForm.incident_type,

        ...(reportForm.description.trim() && {

          description: reportForm.description.trim(),

        }),

        severity: reportForm.severity || "medium",

        ...(latitude !== null && { latitude }),

        ...(longitude !== null && { longitude }),

        ...(reportForm.district_id && {

          district_id: Number(reportForm.district_id),

        }),

      };

 

      if (editingReport) {

        const res = await updateIncidentReport(editingReport.id, payload);

        const updated = {

          ...editingReport,

          ...payload,

          ...(res?.data?.incident_report ?? res?.data ?? {}),

        };

        setReports((prev) =>

          prev.map((r) => (r.id === editingReport.id ? updated : r))

        );

        setReportSuccess("Report updated successfully.");

      } else {

        const res = await createIncidentReport(payload);

        const created = {

          ...payload,

          ...(res?.data?.incident_report ?? res?.data ?? {}),

          status: "pending",

          created_at: new Date().toISOString(),

        };

        setReports((prev) => [created, ...prev]);

        setReportSuccess(

          `Report ${created.report_no || ""} submitted successfully.`

        );

      }

      resetReportForm();

    } catch (err) {

      setReportError(

        err.message ||

        `Failed to ${editingReport ? "update" : "submit"} report`

      );

    } finally {

      setReportSubmitting(false);

    }

  };

 

  const openReview = async (report) => {

    if (!canReviewReports) return;

    setReviewReport(report);

    setReviewAction("");

    setReviewIncidentId("");

    setReviewDuplicateId("");

    setReviewRemarks("");

    // ensure we have full details

    try {

      const res = await getIncidentReport(report.id);

      const details = res?.data?.incident_report ?? res?.data ?? {};

      setReviewReport((prev) => ({ ...prev, ...details }));

    } catch {

      // keep list data

    }

  };

 

  const closeReview = () => {

    setReviewReport(null);

    setReviewAction("");

    setReviewIncidentId("");

    setReviewDuplicateId("");

    setReviewRemarks("");

  };

 

  const handleReviewSubmit = async (e) => {

    e.preventDefault();

    if (!canReviewReports || !reviewReport || !reviewAction) return;

 

    if (reviewAction === "linked_existing" && !reviewIncidentId) {

      setReportError("Select an existing incident to link.");

      return;

    }

    if (reviewAction === "marked_duplicate" && !reviewDuplicateId) {

      setReportError("Select the report this is a duplicate of.");

      return;

    }

 

    setReviewSubmitting(true);

    setReportError("");

    setReportSuccess("");

 

    try {

      const payload = {

        report_id: reviewReport.id,

        action: reviewAction,

        ...(reviewRemarks.trim() && { remarks: reviewRemarks.trim() }),

      };

 

      if (reviewAction === "linked_existing") {

        payload.incident_id = Number(reviewIncidentId);

      }

      if (reviewAction === "marked_duplicate") {

        payload.duplicate_of_report_id = Number(reviewDuplicateId);

      }

      // created_new and rejected need no extra fields

 

      const res = await reviewIncidentReport(payload);

      const updated =

        res?.data?.incident_report ??

        res?.data?.report ??

        res?.data ??

        {};

 

      // Optimistically update the list

      setReports((prev) =>

        prev.map((r) =>

          r.id === reviewReport.id

            ? {

              ...r,

              ...updated,

              status:

                updated.status ??

                (reviewAction === "rejected"

                  ? "rejected"

                  : reviewAction === "marked_duplicate"

                    ? "duplicate"

                    : "verified"),

              review_action: reviewAction,

              review_remarks: reviewRemarks.trim() || r.review_remarks,

            }

            : r

        )

      );

 

      // If backend created a new incident, refresh incidents list

      if (reviewAction === "created_new") {

        fetchIncidents();

      }

 

      setReportSuccess(

        `Report ${reviewReport.report_no || reviewReport.id} reviewed successfully.`

      );

      closeReview();

    } catch (err) {

      setReportError(err.message || "Failed to review report");

    } finally {

      setReviewSubmitting(false);

    }

  };

 

  const getReporterName = (report) => {

    // Nested user object from API

    if (report?.reported_by_user?.name) return report.reported_by_user.name;

    if (report?.reporter?.name) return report.reporter.name;

    if (report?.reported_by_name) return report.reported_by_name;

    if (report?.user?.name) return report.user.name;

 

    // Common name fields some APIs return

    const name = firstPresent(

      report?.reporter_name,

      report?.reported_by_user?.full_name,

      report?.reported_by_user?.username,

      report?.reporter?.full_name,

      report?.reporter?.username

    );

    if (name) return name;

 

    // Fallback to ID

    const id = firstPresent(

      report?.reported_by,

      report?.reported_by_id,

      report?.reportedBy

    );

    return id ? `User #${id}` : "—";

  };

 

  const fetchIncidents = useCallback(async () => {

    if (!canView) {

      setLoading(false);

      return;

    }

    setLoading(true);

    setError("");

    try {

      if (isDistrictUser && (userDistrictId === "" || userDistrictId == null)) {

        throw new Error("Your account is not linked to a district.");

      }

 

      const res = await listIncidents({

        ...(isDistrictUser ? { region_id: Number(userDistrictId) } : {}),

        page: 1,

        per_page: 50,

      });

      const data = res?.data?.incidents ?? res?.data?.items ?? res?.data ?? [];

      const records = Array.isArray(data) ? data : [];

      setIncidents(

        isDistrictUser

          ? records.filter(

            (incident) =>

              String(getIncidentDistrictId(incident)) ===

              String(userDistrictId)

          )

          : records

      );

    } catch (err) {

      setError(err.message || "Failed to load incidents");

    } finally {

      setLoading(false);

    }

  }, [canView, isDistrictUser, userDistrictId]);

 

  useEffect(() => {

    fetchIncidents();

  }, [fetchIncidents]);

 

  const fetchDistricts = useCallback(async () => {

    if (districts.length > 0) return;

    setDistrictsLoading(true);

    try {

      const res = await listDistricts({ per_page: 100 });

      const list =

        res?.data?.districts ??

        res?.data?.items ??

        res?.data ??

        [];

      setDistricts(Array.isArray(list) ? list : []);

    } catch {

      // non-fatal — dropdown stays empty

    } finally {

      setDistrictsLoading(false);

    }

  }, [districts.length]);

 

  useEffect(() => {

    fetchDistricts();

  }, [fetchDistricts]);

 

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

        latitude: incidentToEdit.latitude ?? "",

        longitude: incidentToEdit.longitude ?? "",

        district_id: incidentToEdit.district_id ? String(incidentToEdit.district_id) : "",

      });

      setShowForm(true);

      fetchDistricts();

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

 

    const latitude = form.latitude === "" ? null : Number(form.latitude);

    const longitude = form.longitude === "" ? null : Number(form.longitude);

 

    if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {

      setError("Latitude must be a number between -90 and 90.");

      return;

    }

    if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {

      setError("Longitude must be a number between -180 and 180.");

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

        ...(latitude !== null && { latitude }),

        ...(longitude !== null && { longitude }),

        ...(form.district_id && { district_id: Number(form.district_id) }),

      };

 

      if (editingIncident) {

        const res = await updateIncident(editingIncident.id, payload);

        const updatedIncident = {

          ...editingIncident,

          ...payload,

          ...(res?.data?.incident ?? res?.data ?? {}),

        };

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

          ...payload,

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

    fetchDistricts();

 

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

 

  const getReportDistrictName = (report) => {

    if (report?.district?.name) return report.district.name;

    if (report?.district_name) return report.district_name;

 

    const id = firstPresent(

      report?.district_id,

      report?.districtId,

      report?.district?.id

    );

    if (!id) return "—";

 

    const district = districts.find((d) => String(d.id) === String(id));

    if (district?.name || district?.district_name) {

      return district.name || district.district_name;

    }

    return `District #${id}`;

  };

 

  const getDistrictName = (incident) => {

    if (incident.district?.name) return incident.district.name;

    if (incident.district_name) return incident.district_name;

 

    const incidentDistrictId = getIncidentDistrictId(incident);

    const district = districts.find(

      (item) => String(item.id) === String(incidentDistrictId)

    );

 

    if (district?.name || district?.district_name) {

      return district.name || district.district_name;

    }

 

    if (

      isDistrictUser &&

      String(incidentDistrictId) === String(userDistrictId)

    ) {

      return (

        user?.district_name ??

        user?.region_name ??

        user?.district?.name ??

        user?.region?.name ??

        `District #${userDistrictId}`

      );

    }

 

    return "—";

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

    Latitude: incident.latitude ?? "",

    Longitude: incident.longitude ?? "",

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

            <button

              onClick={() => {

                setShowReports((v) => !v);

                if (!showReports) {

                  setReportError("");

                  setReportSuccess("");

                }

              }}

              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${showReports

                ? "border-orange-300 bg-orange-50 text-orange-700"

                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"

                }`}

            >

              <FileText size={15} />

              {showReports ? "Hide Reports" : "View Incident Reports"}

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

                    fetchDistricts();

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

 

        {/* Incident Reports section */}

        <div

          className={`grid transition-all duration-300 ease-in-out ${showReports

            ? "mb-6 grid-rows-[1fr] opacity-100"

            : "pointer-events-none grid-rows-[0fr] opacity-0"

            }`}

        >

          <div className="overflow-hidden">

            <div className="rounded-xl border border-orange-200 bg-white shadow-sm">

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 px-6 py-4">

                <div>

                  <h2 className="font-semibold text-slate-900">

                    Incident Reports

                    {!reportsLoading && (

                      <span className="ml-1 text-sm font-normal text-slate-500">

                        ({reports.length})

                      </span>

                    )}

                  </h2>

                  <p className="text-xs text-slate-500">

                    Reports submitted by volunteers & NGO contacts · Admins can

                    review

                  </p>

                </div>

                <div className="flex gap-2">

                  <button

                    type="button"

                    onClick={fetchReports}

                    disabled={reportsLoading}

                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"

                  >

                    <RefreshCw

                      size={13}

                      className={reportsLoading ? "animate-spin" : ""}

                    />

                    Refresh

                  </button>

                  {canCreateReport && (

                    <button

                      type="button"

                      onClick={() => {

                        if (showReportForm) resetReportForm();

                        else {

                          setShowReportForm(true);

                          setEditingReport(null);

                          setReportForm(EMPTY_REPORT_FORM);

                          fetchDistricts();

                        }

                      }}

                      className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"

                    >

                      {showReportForm ? (

                        <>

                          <X size={13} /> Cancel

                        </>

                      ) : (

                        <>

                          <Plus size={13} /> Submit Report

                        </>

                      )}

                    </button>

                  )}

                </div>

              </div>

 

              {(reportSuccess || reportError) && (

                <div className="px-6 pt-3">

                  {reportSuccess && (

                    <div className="mb-2 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">

                      <span>{reportSuccess}</span>

                      <button

                        type="button"

                        onClick={() => setReportSuccess("")}

                        className="text-green-600 hover:text-green-800"

                      >

                        <X size={14} />

                      </button>

                    </div>

                  )}

                  {reportError && (

                    <div className="mb-2 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">

                      <span>{reportError}</span>

                      <button

                        type="button"

                        onClick={() => setReportError("")}

                        className="text-red-600 hover:text-red-800"

                      >

                        <X size={14} />

                      </button>

                    </div>

                  )}

                </div>

              )}

 

              {/* Report create / edit form */}

              {canCreateReport && showReportForm && (

                <div className="border-b border-slate-100 px-6 py-4">

                  <h3 className="mb-3 text-sm font-semibold text-slate-800">

                    {editingReport ? "Edit Pending Report" : "Submit New Report"}

                  </h3>

                  <form onSubmit={handleSubmitReport}>

                    <div className="grid gap-3 sm:grid-cols-2">

                      <div className="sm:col-span-2">

                        <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">

                          Title *

                        </label>

                        <input

                          name="title"

                          value={reportForm.title}

                          onChange={handleReportChange}

                          required

                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"

                        />

                      </div>

                      <div>

                        <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">

                          Type *

                        </label>

                        <select

                          name="incident_type"

                          value={reportForm.incident_type}

                          onChange={handleReportChange}

                          required

                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"

                        >

                          <option value="">Select type</option>

                          <option value="flood">Flood</option>

                          <option value="fire">Fire</option>

                          <option value="earthquake">Earthquake</option>

                          <option value="cyclone">Cyclone</option>

                          <option value="accident">Accident</option>

                          <option value="medical_emergency">Medical Emergency</option>

                          <option value="building_collapse">Building Collapse</option>

                          <option value="other">Other</option>

                        </select>

                      </div>

                      <div>

                        <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">

                          Severity

                        </label>

                        <select

                          name="severity"

                          value={reportForm.severity}

                          onChange={handleReportChange}

                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"

                        >

                          <option value="low">Low</option>

                          <option value="medium">Medium</option>

                          <option value="high">High</option>

                          <option value="critical">Critical</option>

                        </select>

                      </div>

                      <div>

                        <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">

                          Latitude

                        </label>

                        <input

                          type="number"

                          name="latitude"

                          value={reportForm.latitude}

                          onChange={handleReportChange}

                          step="any"

                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"

                        />

                      </div>

                      <div>

                        <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">

                          Longitude

                        </label>

                        <input

                          type="number"

                          name="longitude"

                          value={reportForm.longitude}

                          onChange={handleReportChange}

                          step="any"

                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"

                        />

                      </div>

                      <div className="sm:col-span-2">

                        <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">

                          Description

                        </label>

                        <textarea

                          name="description"

                          rows={2}

                          value={reportForm.description}

                          onChange={handleReportChange}

                          className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"

                        />

                      </div>

                    </div>

                    <div className="mt-3 flex justify-end gap-2">

                      <button

                        type="button"

                        onClick={resetReportForm}

                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"

                      >

                        Cancel

                      </button>

                      <button

                        type="submit"

                        disabled={reportSubmitting}

                        className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-60"

                      >

                        {reportSubmitting

                          ? editingReport

                            ? "Updating…"

                            : "Submitting…"

                          : editingReport

                            ? "Update Report"

                            : "Submit Report"}

                      </button>

                    </div>

                  </form>

                </div>

              )}

 

              {/* Reports table */}

              {reportsLoading ? (

                <div className="flex items-center justify-center py-12 text-sm text-slate-500">

                  <RefreshCw size={14} className="mr-2 animate-spin" />

                  Loading reports…

                </div>

              ) : reports.length === 0 ? (

                <div className="py-12 text-center text-sm text-slate-500">

                  No incident reports found.

                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full text-left text-sm">

                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">

                      <tr>

                        <th className="px-5 py-3 font-semibold">Report No.</th>

                        <th className="px-5 py-3 font-semibold">Title</th>

                        <th className="px-5 py-3 font-semibold">Type</th>

                        <th className="px-5 py-3 font-semibold">District</th>

                        <th className="px-5 py-3 font-semibold">Reported By</th>

                        <th className="px-5 py-3 font-semibold">Severity</th>

                        <th className="px-5 py-3 font-semibold">Status</th>

                        <th className="px-5 py-3 font-semibold">Date</th>

                        <th className="px-5 py-3 font-semibold">Action</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {reports.map((r) => (

                        <tr key={r.id} className="hover:bg-slate-50">

                          <td className="whitespace-nowrap px-5 py-3 font-semibold text-orange-700">

                            {r.report_no || "—"}

                          </td>

                          <td className="max-w-xs truncate px-5 py-3 font-medium text-slate-800">

                            {r.title}

                          </td>

                          <td className="px-5 py-3 capitalize text-slate-600">

                            {r.incident_type || "—"}

                          </td>

                          <td className="whitespace-nowrap px-5 py-3 text-slate-600">

                            {getReportDistrictName(r)}

                          </td>

                          <td className="whitespace-nowrap px-5 py-3 text-slate-600">

                            {getReporterName(r)}

                          </td>

                          <td className="px-5 py-3">

                            <span

                              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${SEVERITY_STYLES[r.severity] ??

                                "bg-slate-100 text-slate-600"

                                }`}

                            >

                              {r.severity || "—"}

                            </span>

                          </td>

                          <td className="px-5 py-3">

                            <span

                              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${REPORT_STATUS_STYLES[r.status] ??

                                "bg-slate-100 text-slate-600"

                                }`}

                            >

                              {r.status || "—"}

                            </span>

                          </td>

                          <td className="whitespace-nowrap px-5 py-3 text-slate-600">

                            {formatDate(r.created_at || r.createdAt)}

                          </td>

                          <td className="px-5 py-3">

                            <div className="flex items-center gap-1">

                              {canCreateReport &&

                                r.status === "pending" && (

                                  <button

                                    type="button"

                                    onClick={() => handleEditReport(r)}

                                    className="rounded-lg p-2 text-slate-500 hover:bg-yellow-50 hover:text-yellow-700"

                                    title="Edit report"

                                  >

                                    <Pencil size={15} />

                                  </button>

                                )}

                              {canReviewReports &&

                                r.status === "pending" && (

                                  <button

                                    type="button"

                                    onClick={() => openReview(r)}

                                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50"

                                  >

                                    Review

                                  </button>

                                )}

                              {r.status !== "pending" && (

                                <span className="text-xs text-slate-400">

                                  {r.review_action

                                    ? r.review_action.replaceAll("_", " ")

                                    : "—"}

                                </span>

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

          </div>

        </div>

 

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

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Latitude</label>

                      <input type="number" name="latitude" value={form.latitude} onChange={handleChange} min="-90" max="90" step="any" placeholder="e.g. 22.5726" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />

                      <p className="mt-1 text-xs text-slate-500">Range: -90 to 90</p>

                    </div>

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Longitude</label>

                      <input type="number" name="longitude" value={form.longitude} onChange={handleChange} min="-180" max="180" step="any" placeholder="e.g. 88.3639" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />

                      <p className="mt-1 text-xs text-slate-500">Range: -180 to 180</p>

                    </div>

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">District</label>

                      <div className="relative">

                        <select

                          name="district_id"

                          value={form.district_id}

                          onChange={handleChange}

                          disabled={districtsLoading}

                          className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"

                        >

                          <option value="">

                            {districtsLoading ? "Loading districts…" : "Select district"}

                          </option>

                          {districts.map((d) => (

                            <option key={d.id} value={d.id}>

                              {d.name || d.district_name || `District #${d.id}`}

                            </option>

                          ))}

                        </select>

                        <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />

                      </div>

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

            <h2 className="font-semibold text-slate-900">{isDistrictUser ? "District Incidents" : "All Incidents"} {!loading && <span className="ml-1 text-sm font-normal text-slate-500">({incidents.length})</span>}</h2>

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

                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">

                  <tr>

                    <th className="px-5 py-3 font-semibold">Incident No.</th>

                    <th className="px-5 py-3 font-semibold">Title</th>

                    <th className="px-5 py-3 font-semibold">Type</th>

                    <th className="px-5 py-3 font-semibold">District</th>

                    <th className="px-5 py-3 font-semibold">Severity</th>

                    <th className="px-5 py-3 font-semibold">Status</th>

                    <th className="px-5 py-3 font-semibold">Action</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {incidents.map((inc) => (

                    <tr key={inc.id} className="transition-colors hover:bg-slate-50">

                      <td className="whitespace-nowrap px-5 py-3"><button type="button" onClick={() => handleIncidentClick(inc)} className="rounded font-semibold text-blue-600 hover:text-blue-800 hover:underline">{inc.incident_no || "—"}</button></td>

                      <td className="max-w-xs truncate px-5 py-3 font-medium text-slate-800">{inc.title}</td>

                      <td className="px-5 py-3 capitalize text-slate-600">{inc.incident_type || "—"}</td>

                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">{getDistrictName(inc)}</td>

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

 

      {/* Review Incident Report Modal */}

      {reviewReport && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"

          onClick={closeReview}

        >

          <div

            role="dialog"

            aria-modal="true"

            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"

            onClick={(e) => e.stopPropagation()}

          >

            <div className="flex items-start justify-between border-b border-slate-200 p-5">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">

                  {reviewReport.report_no || "Report"}

                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-900">

                  Review Incident Report

                </h2>

                <p className="mt-1 text-sm text-slate-600">

                  {reviewReport.title}

                </p>

              </div>

              <button

                type="button"

                onClick={closeReview}

                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"

              >

                <X size={18} />

              </button>

            </div>

 

            <form onSubmit={handleReviewSubmit} className="space-y-4 p-5">

              <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 space-y-2">

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">

                  <div>

                    <p className="text-xs text-slate-500">Type</p>

                    <p className="font-medium capitalize">{reviewReport.incident_type || "—"}</p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-500">Severity</p>

                    <p className="font-medium capitalize">{reviewReport.severity || "—"}</p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-500">District</p>

                    <p className="font-medium">{getReportDistrictName(reviewReport)}</p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-500">Reported</p>

                    <p className="font-medium">

                      {formatDate(reviewReport.created_at || reviewReport.createdAt)}{" "}

                      {formatTime(reviewReport.created_at || reviewReport.createdAt)}

                    </p>

                  </div>

                  {(reviewReport.latitude != null || reviewReport.longitude != null) && (

                    <>

                      <div>

                        <p className="text-xs text-slate-500">Latitude</p>

                        <p className="font-medium">{reviewReport.latitude ?? "—"}</p>

                      </div>

                      <div>

                        <p className="text-xs text-slate-500">Longitude</p>

                        <p className="font-medium">{reviewReport.longitude ?? "—"}</p>

                      </div>

                    </>

                  )}

                </div>

                {reviewReport.description && (

                  <div className="border-t border-slate-200 pt-2 mt-2">

                    <p className="text-xs text-slate-500 mb-1">Description</p>

                    <p className="whitespace-pre-wrap text-slate-600">

                      {reviewReport.description}

                    </p>

                  </div>

                )}

                <div>

                  <p className="text-xs text-slate-500">Reported By</p>

                  <p className="font-medium">{getReporterName(reviewReport)}</p>

                </div>

              </div>

 

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase text-slate-600">

                  Review Action *

                </label>

                <div className="grid gap-2 sm:grid-cols-2">

                  {[

                    {

                      value: "linked_existing",

                      label: "Link to existing incident",

                      icon: Link2,

                    },

                    {

                      value: "created_new",

                      label: "Create new incident",

                      icon: Plus,

                    },

                    {

                      value: "marked_duplicate",

                      label: "Mark as duplicate",

                      icon: Copy,

                    },

                    {

                      value: "rejected",

                      label: "Reject",

                      icon: Ban,

                    },

                  ].map(({ value, label, icon: Icon }) => (

                    <button

                      key={value}

                      type="button"

                      onClick={() => setReviewAction(value)}

                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${reviewAction === value

                        ? "border-orange-400 bg-orange-50 text-orange-800"

                        : "border-slate-200 hover:border-slate-300"

                        }`}

                    >

                      <Icon size={16} />

                      {label}

                    </button>

                  ))}

                </div>

              </div>

 

              {reviewAction === "linked_existing" && (

                <div>

                  <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">

                    Select Incident *

                  </label>

                  <select

                    value={reviewIncidentId}

                    onChange={(e) => setReviewIncidentId(e.target.value)}

                    required

                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"

                  >

                    <option value="">Choose incident…</option>

                    {incidents.map((inc) => (

                      <option key={inc.id} value={inc.id}>

                        {inc.incident_no || `#${inc.id}`} — {inc.title}

                        {inc.incident_type ? ` (${inc.incident_type})` : ""}

                        {" · "}

                        {getDistrictName(inc)}

                      </option>

                    ))}

                  </select>

                </div>

              )}

 

              {reviewAction === "marked_duplicate" && (

                <div>

                  <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">

                    Duplicate of Report *

                  </label>

                  <select

                    value={reviewDuplicateId}

                    onChange={(e) => setReviewDuplicateId(e.target.value)}

                    required

                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"

                  >

                    <option value="">Choose report…</option>

                    {reports

                      .filter((r) => r.id !== reviewReport.id)

                      .map((r) => (

                        <option key={r.id} value={r.id}>

                          {r.report_no || `#${r.id}`} — {r.title}

                          {r.incident_type ? ` (${r.incident_type})` : ""}

                          {" · "}

                          {getReportDistrictName(r)}

                        </option>

                      ))}

                  </select>

                </div>

              )}

 

              <div>

                <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">

                  Review Remarks

                </label>

                <textarea

                  rows={3}

                  value={reviewRemarks}

                  onChange={(e) => setReviewRemarks(e.target.value)}

                  placeholder="Optional notes for the reporter…"

                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"

                />

              </div>

 

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">

                <button

                  type="button"

                  onClick={closeReview}

                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={reviewSubmitting || !reviewAction}

                  className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {reviewSubmitting ? "Submitting…" : "Confirm Review"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

 

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

                <div><p className="text-xs text-slate-500">Latitude</p><p className="mt-1 break-words text-sm font-medium text-slate-800">{selectedIncident.latitude ?? "—"}</p></div>

                <div><p className="text-xs text-slate-500">Longitude</p><p className="mt-1 break-words text-sm font-medium text-slate-800">{selectedIncident.longitude ?? "—"}</p></div>

                <div>

                  <p className="text-xs text-slate-500">District</p>

                  <p className="mt-1 text-sm font-medium text-slate-800">

                    {getDistrictName(selectedIncident)}

                  </p>

                </div>

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