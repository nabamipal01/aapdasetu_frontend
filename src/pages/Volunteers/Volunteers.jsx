
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Users,
  Plus,
  X,
  RefreshCw,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  KeyRound,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Eye,
  Image as ImageIcon,
  UploadCloud,
  ExternalLink,
} from "lucide-react";
import * as XLSX from "xlsx";

import {
  listVolunteers,
  getVolunteer,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  approveVolunteer,
  rejectVolunteer,
  generateVolunteerCredentials,
} from "../../services";

import {
  downloadStyledPdf,
  downloadStyledXlsx,
} from "../../utils/tableExport";
import API_BASE_URL from "../../config/Config";

/* ---------------------------------------------------------
   CONSTANTS
--------------------------------------------------------- */

const STATUS_STYLES = {
  pending_approval: "bg-amber-50 text-amber-700 ring-amber-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  deployed: "bg-blue-50 text-blue-700 ring-blue-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
};

const STATUS_LABELS = {
  pending_approval: "Pending Approval",
  active: "Active",
  deployed: "Deployed",
  inactive: "Inactive",
};

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  aadhaar_no: "",
  volunteer_registration_no: "",
  registration_date: "",
  skills: "",
  address: "",
  id_card: null,
  supporting_documents: [],
};

const EMPTY_CRED = {
  email: "",
  password: "",
};

const getFileUrl = (path) => {
  if (!path) return "";

  if (/^(https?:|data:|blob:)/i.test(path)) {
    return path;
  }

  const apiBase = new URL(API_BASE_URL, window.location.origin);
  const basePath = apiBase.pathname.replace(/\/+$/, "");
  const normalizedPath = String(path)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const normalizedBasePath = basePath.replace(/^\/+/, "");
  const relativePath = normalizedPath.startsWith(`${normalizedBasePath}/`)
    ? normalizedPath.slice(normalizedBasePath.length + 1)
    : normalizedPath;

  return new URL(
    relativePath,
    `${apiBase.origin}${basePath}/`
  ).toString();
};

const requireApiSuccess = (response, fallbackMessage) => {
  if (response?.success !== true) {
    throw new Error(response?.message || fallbackMessage);
  }

  return response;
};

const formatFileSize = (bytes) => {
  if (!bytes) return "0 bytes";

  const units = ["bytes", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / 1024 ** index).toFixed(
    index === 0 ? 0 : 1
  )} ${units[index]}`;
};

const getStoredCredentials = (volunteer) => {
  try {
    const stored = localStorage.getItem(
      `volunteer-credentials-${volunteer.id}`
    );

    if (!stored) return null;
    if (stored === "issued") return { issued: true };

    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const hasVolunteerCredentials = (volunteer) => {
  return Boolean(
    volunteer.user_id ||
      volunteer.userId ||
      volunteer.credentials_issued ||
      getStoredCredentials(volunteer)
  );
};

/* ---------------------------------------------------------
   REUSABLE COMPONENTS
--------------------------------------------------------- */

function Field({ label, required, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {STATUS_LABELS[status] || status || "Unknown"}
    </span>
  );
}

function IconButton({ title, onClick, children, className = "", disabled }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-2 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------
   VOLUNTEERS PAGE
--------------------------------------------------------- */

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingVolunteerId, setEditingVolunteerId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [existingIdCard, setExistingIdCard] = useState("");
  const [existingSupportingDocuments, setExistingSupportingDocuments] =
    useState([]);

  const [filterStatus, setFilterStatus] = useState("");

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  const [viewModal, setViewModal] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const [credModal, setCredModal] = useState(null);
  const [cred, setCred] = useState(EMPTY_CRED);
  const [credSubmitting, setCredSubmitting] = useState(false);

  /* -------------------------------------------------------
     FETCH
  ------------------------------------------------------- */

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { page, per_page: 20 };

      if (filterStatus) {
        params.status = filterStatus;
      }

      const res = requireApiSuccess(
        await listVolunteers(params),
        "Failed to load volunteers."
      );
      const data = res.data;

      if (!Array.isArray(data?.volunteers)) {
        throw new Error("The volunteer list response has an invalid format.");
      }

      setVolunteers(data.volunteers);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err?.message || "Failed to load volunteers.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchVolunteers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchVolunteers]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(event.target)
      ) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* -------------------------------------------------------
     FORM
  ------------------------------------------------------- */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, supporting_documents: [] });
    setExistingIdCard("");
    setExistingSupportingDocuments([]);
    setEditingVolunteerId(null);
    setShowForm(false);
  };

  const openNewForm = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleEdit = async (volunteer) => {
    setError("");
    setSuccess("");

    try {
      const res = requireApiSuccess(
        await getVolunteer(volunteer.id),
        "Failed to load volunteer details."
      );
      const data = res?.data?.volunteer ?? res?.data;

      if (!data) {
        throw new Error("Volunteer details not found.");
      }

      setForm({
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        aadhaar_no: data.aadhaar_no || "",
        volunteer_registration_no: data.volunteer_registration_no || "",
        registration_date: data.registration_date
          ? String(data.registration_date).slice(0, 10)
          : "",
        skills: data.skills || "",
        address: data.address || "",
        id_card: null,
        supporting_documents: [],
      });

      setExistingIdCard(data.id_card || "");

      setExistingSupportingDocuments(
        Array.isArray(data.supporting_documents)
          ? data.supporting_documents
          : []
      );

      setEditingVolunteerId(data.id);
      setShowForm(true);
    } catch (err) {
      setError(err?.message || "Failed to load volunteer details.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!name || !phone) {
      setError("Full name and phone number are required.");
      return;
    }

    // A new volunteer must have an Aadhaar/ID card image.
    if (editingVolunteerId === null && !form.id_card) {
      setError("Please upload the mandatory Aadhaar / ID card image.");
      return;
    }

    // The current update API only supports profile fields.
    if (
      editingVolunteerId !== null &&
      (form.id_card || form.supporting_documents.length > 0)
    ) {
      setError(
        "Document uploads are available during registration. Your current update API does not support document uploads while editing."
      );
      return;
    }

    setSubmitting(true);

    try {
      const registrationPayload = new FormData();

      registrationPayload.append("name", name);
      registrationPayload.append("phone", phone);
      registrationPayload.append("email", email);
      registrationPayload.append("aadhaar_no", form.aadhaar_no.trim());
      registrationPayload.append(
        "volunteer_registration_no",
        form.volunteer_registration_no.trim()
      );
      registrationPayload.append(
        "registration_date",
        form.registration_date
      );
      registrationPayload.append("skills", form.skills.trim());
      registrationPayload.append("address", form.address.trim());

      if (form.id_card) {
        registrationPayload.append("id_card", form.id_card);
      }

      form.supporting_documents.forEach((file) => {
        registrationPayload.append("supporting_documents[]", file);
      });

      if (editingVolunteerId !== null) {
        requireApiSuccess(
          await updateVolunteer(editingVolunteerId, {
            name,
            phone,
            email,
            aadhaar_no: form.aadhaar_no.trim(),
            volunteer_registration_no: form.volunteer_registration_no.trim(),
            registration_date: form.registration_date,
            skills: form.skills.trim(),
            address: form.address.trim(),
          }),
          "Failed to update volunteer."
        );

        setSuccess(`Volunteer "${name}" updated successfully.`);
      } else {
        const res = requireApiSuccess(
          await createVolunteer(registrationPayload),
          "Failed to register volunteer."
        );
        if (!res.data) {
          throw new Error("The volunteer registration response is missing data.");
        }

        const registrationNo =
          res.data.volunteer_registration_no ||
          form.volunteer_registration_no ||
          "Not assigned";

        setSuccess(
          `Volunteer "${name}" registered successfully. Registration No: ${registrationNo}`
        );
      }

      resetForm();
      await fetchVolunteers();
    } catch (err) {
      console.error("Volunteer submit error:", err);
      setError(err?.message || "Failed to save volunteer.");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------
     APPROVE / REJECT / DEACTIVATE
  ------------------------------------------------------- */

  const handleApprove = async (id, name) => {
    if (!window.confirm(`Approve volunteer "${name}"?`)) return;

    setError("");
    setSuccess("");

    try {
      requireApiSuccess(
        await approveVolunteer(id),
        "Failed to approve volunteer."
      );
      setSuccess(`"${name}" approved successfully.`);
      await fetchVolunteers();
    } catch (err) {
      setError(err?.message || "Failed to approve volunteer.");
    }
  };

  const openRejectModal = (volunteer) => {
    setRejectModal({ id: volunteer.id, name: volunteer.name });
    setRejectNote("");
    setError("");
    setSuccess("");
  };

  const handleReject = async (event) => {
    event.preventDefault();

    if (!rejectModal) return;

    setRejectSubmitting(true);
    setError("");

    try {
      requireApiSuccess(
        await rejectVolunteer(rejectModal.id, rejectNote.trim()),
        "Failed to reject volunteer."
      );

      setSuccess(`"${rejectModal.name}" rejected successfully.`);
      setRejectModal(null);
      setRejectNote("");

      await fetchVolunteers();
    } catch (err) {
      setError(err?.message || "Failed to reject volunteer.");
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate volunteer "${name}"?`)) return;

    setError("");
    setSuccess("");

    try {
      requireApiSuccess(
        await deleteVolunteer(id),
        "Failed to deactivate volunteer."
      );
      setSuccess(`"${name}" deactivated successfully.`);
      await fetchVolunteers();
    } catch (err) {
      setError(err?.message || "Failed to deactivate volunteer.");
    }
  };

  /* -------------------------------------------------------
     VIEW DETAILS
  ------------------------------------------------------- */

  const handleView = async (id) => {
    setViewLoading(true);
    setViewModal(null);
    setError("");

    try {
      const res = requireApiSuccess(
        await getVolunteer(id),
        "Failed to load volunteer details."
      );
      const data = res?.data?.volunteer ?? res?.data;

      if (!data) {
        throw new Error("Volunteer details not found.");
      }

      setViewModal(data);
    } catch (err) {
      setError(err?.message || "Failed to load volunteer details.");
    } finally {
      setViewLoading(false);
    }
  };

  /* -------------------------------------------------------
     CREDENTIALS
  ------------------------------------------------------- */

  const openCredModal = (volunteer) => {
    const stored = getStoredCredentials(volunteer);

    setCredModal({
      id: volunteer.id,
      name: volunteer.name,
      assignedEmail: stored?.email || volunteer.email || "",
    });

    setCred({
      email: stored?.email || volunteer.email || "",
      password: "",
    });

    setError("");
    setSuccess("");
  };

  const handleIssueCredentials = async (event) => {
    event.preventDefault();

    if (!credModal) return;

    if (!cred.email.trim()) {
      setError("Email is required.");
      return;
    }

    if (cred.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setCredSubmitting(true);
    setError("");

    try {
      const res = requireApiSuccess(
        await generateVolunteerCredentials(credModal.id, {
          email: cred.email.trim(),
          password: cred.password,
        }),
        "Failed to issue volunteer credentials."
      );

      localStorage.setItem(
        `volunteer-credentials-${credModal.id}`,
        JSON.stringify({
          email: res.data?.email || cred.email.trim(),
          issued: true,
        })
      );

      setSuccess(`Login credentials issued to "${credModal.name}".`);
      setCredModal(null);
      setCred(EMPTY_CRED);

      await fetchVolunteers();
    } catch (err) {
      setError(err?.message || "Failed to issue credentials.");
    } finally {
      setCredSubmitting(false);
    }
  };

  /* -------------------------------------------------------
     DOWNLOAD: XLSX / CSV / PDF
  ------------------------------------------------------- */

  const getVolunteerExportData = () => {
    return volunteers.map((volunteer, index) => ({
      "S.No.": index + 1,
      // "Volunteer ID": volunteer.id ?? "",
      Name: volunteer.name || "",
      "Registration No.": volunteer.volunteer_registration_no || "",
      "Registration Date": volunteer.registration_date || "",
      Phone: volunteer.phone || "",
      Email: volunteer.email || "",
      "Aadhaar No.": volunteer.aadhaar_no || "",
      Skills: volunteer.skills || "",
      Address: volunteer.address || "",
      Status: STATUS_LABELS[volunteer.status] || volunteer.status || "",
    }));
  };

  const getExportFilenameDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const downloadVolunteerXLSX = () => {
    if (!volunteers.length) {
      setError("There are no volunteers to export.");
      return;
    }

    downloadStyledXlsx({
      records: getVolunteerExportData(),
      title: "Volunteer List",
      filename: `volunteers_${getExportFilenameDate()}.xlsx`,
      sheetName: "Volunteers",
    });

    setShowDownloadMenu(false);
  };

  const downloadVolunteerCSV = () => {
    if (!volunteers.length) {
      setError("There are no volunteers to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(getVolunteerExportData());
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `volunteers_${getExportFilenameDate()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const downloadVolunteerPDF = () => {
    if (!volunteers.length) {
      setError("There are no volunteers to export.");
      return;
    }

    downloadStyledPdf({
      records: getVolunteerExportData(),
      title: "Volunteer List",
      filename: `volunteers_${getExportFilenameDate()}.pdf`,
    });

    setShowDownloadMenu(false);
  };

  /* -------------------------------------------------------
     FILE SELECTION
  ------------------------------------------------------- */

  const handleSupportingDocuments = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const invalidFiles = selectedFiles.filter(
      (file) => !allowedTypes.includes(file.type)
    );

    if (invalidFiles.length) {
      setError("Supporting documents must be PDF, JPG, PNG, or WebP files.");
      event.target.value = "";
      return;
    }

    setError("");

    setForm((prev) => {
      const existing = prev.supporting_documents || [];

      const newFiles = selectedFiles.filter(
        (file) =>
          !existing.some(
            (oldFile) =>
              oldFile.name === file.name &&
              oldFile.size === file.size &&
              oldFile.lastModified === file.lastModified
          )
      );

      return {
        ...prev,
        supporting_documents: [...existing, ...newFiles],
      };
    });

    event.target.value = "";
  };

  const handleIdCardChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("The Aadhaar / ID card must be a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    setError("");

    setForm((prev) => ({
      ...prev,
      id_card: file,
    }));

    event.target.value = "";
  };

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* HEADER */}

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-600 p-2.5 text-white shadow-sm">
              <Users size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Volunteers
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Registrations, document verification and access management
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(event) => {
                  setFilterStatus(event.target.value);
                  setPage(1);
                }}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">All Statuses</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="active">Active</option>
                <option value="deployed">Deployed</option>
                <option value="inactive">Inactive</option>
              </select>

              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={fetchVolunteers}
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={showForm ? resetForm : openNewForm}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? "Cancel" : "Add Volunteer"}
            </button>
          </div>
        </header>

        {/* FEEDBACK */}

        {success && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800"
          >
            <span>{success}</span>
            <button onClick={() => setSuccess("")} aria-label="Dismiss success">
              <X size={15} />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
          >
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error">
              <X size={15} />
            </button>
          </div>
        )}

        {/* REGISTRATION FORM */}

        {showForm && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 md:px-5">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  {editingVolunteerId
                    ? "Edit Volunteer"
                    : "New Volunteer Registration"}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Fields marked * are mandatory.
                </p>
              </div>

              <IconButton title="Close form" onClick={resetForm}>
                <X size={17} />
              </IconButton>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-5">
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Full Name" required>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    maxLength={150}
                    placeholder="Enter full name"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Phone Number" required>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    maxLength={20}
                    placeholder="Enter phone number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Email Address">
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Aadhaar Number">
                  <input
                    name="aadhaar_no"
                    value={form.aadhaar_no}
                    onChange={handleChange}
                    inputMode="numeric"
                    maxLength={12}
                    pattern="[0-9]{12}"
                    title="Enter a 12-digit Aadhaar number"
                    placeholder="12-digit number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Registration Number">
                  <input
                    name="volunteer_registration_no"
                    value={form.volunteer_registration_no}
                    onChange={handleChange}
                    placeholder="Registration number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Registration Date">
                  <input
                    name="registration_date"
                    type="date"
                    value={form.registration_date}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Skills" className="sm:col-span-2 lg:col-span-3">
                  <input
                    name="skills"
                    value={form.skills}
                    onChange={handleChange}
                    placeholder="First Aid, Swimming, Driving..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                {/* MANDATORY ID IMAGE */}

                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3.5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {form.id_card ? (
                          <img
                            src={URL.createObjectURL(form.id_card)}
                            alt="Selected Aadhaar or ID card"
                            className="h-full w-full object-contain"
                          />
                        ) : existingIdCard ? (
                          <img
                            src={getFileUrl(existingIdCard)}
                            alt="Existing volunteer ID card"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="text-center text-slate-400">
                            <ImageIcon size={23} className="mx-auto" />
                            <p className="mt-1 text-[9px] font-semibold uppercase">
                              No image
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800">
                          Aadhaar / ID Card Image
                          {editingVolunteerId === null && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          Upload a clear JPG, PNG or WebP image.
                          {editingVolunteerId === null
                            ? " Required for new registration."
                            : " Existing image is retained."}
                        </p>

                        {existingIdCard && !form.id_card && (
                          <a
                            href={getFileUrl(existingIdCard)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline"
                          >
                            View current image <ExternalLink size={11} />
                          </a>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <label
                            htmlFor="volunteer-id-card"
                            className={`inline-flex items-center gap-1.5 rounded-md border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 ${
                              editingVolunteerId !== null
                                ? "cursor-not-allowed opacity-50"
                                : "cursor-pointer hover:bg-teal-50"
                            }`}
                          >
                            <UploadCloud size={14} />
                            {form.id_card ? "Change image" : "Upload image"}
                          </label>

                          <input
                            id="volunteer-id-card"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={editingVolunteerId !== null}
                            onChange={handleIdCardChange}
                          />

                          {form.id_card && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  id_card: null,
                                }))
                              }
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Remove selection
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SUPPORTING DOCUMENTS */}

                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="rounded-lg border border-slate-200 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                          <FileText size={17} />
                        </span>

                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Supporting Documents
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            PDF, JPG, PNG or WebP
                          </p>
                        </div>
                      </div>

                      <label
                        htmlFor="volunteer-supporting-documents"
                        className={`inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white ${
                          editingVolunteerId !== null
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer hover:bg-indigo-700"
                        }`}
                      >
                        <Plus size={14} /> Add files
                      </label>

                      <input
                        id="volunteer-supporting-documents"
                        type="file"
                        multiple
                        accept=".pdf,image/jpeg,image/png,image/webp"
                        disabled={editingVolunteerId !== null}
                        className="sr-only"
                        onChange={handleSupportingDocuments}
                      />
                    </div>

                    {existingSupportingDocuments.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Existing files
                        </p>

                        {existingSupportingDocuments.map((doc, index) => (
                          <div
                            key={
                              doc.document_id ||
                              doc.document_path ||
                              index
                            }
                            className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-2"
                          >
                            <FileText
                              size={15}
                              className="shrink-0 text-indigo-500"
                            />

                            <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
                              {doc.document_name || "Supporting document"}
                            </span>

                            <a
                              href={getFileUrl(doc.document_path)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-indigo-700 hover:underline"
                            >
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {form.supporting_documents.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Selected files ({form.supporting_documents.length})
                        </p>

                        {form.supporting_documents.map((file, index) => (
                          <div
                            key={`${file.name}-${file.lastModified}-${index}`}
                            className="flex items-center gap-2 rounded-md border border-slate-100 px-2.5 py-2"
                          >
                            <FileText
                              size={15}
                              className="shrink-0 text-indigo-500"
                            />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-slate-700">
                                {file.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formatFileSize(file.size)}
                              </p>
                            </div>

                            <IconButton
                              title={`Remove ${file.name}`}
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  supporting_documents:
                                    prev.supporting_documents.filter(
                                      (_, i) => i !== index
                                    ),
                                }))
                              }
                              className="text-red-500"
                            >
                              <X size={14} />
                            </IconButton>
                          </div>
                        ))}
                      </div>
                    )}

                    {editingVolunteerId !== null && (
                      <p className="mt-2 text-[10px] text-amber-700">
                        Document uploads are disabled during editing because
                        the current update API only accepts profile fields.
                      </p>
                    )}
                  </div>
                </div>

                <Field label="Address" className="sm:col-span-2 lg:col-span-3">
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Enter complete address"
                    className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>
              </div>

              <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting && (
                    <RefreshCw size={13} className="animate-spin" />
                  )}
                  {submitting
                    ? "Saving..."
                    : editingVolunteerId
                      ? "Save Changes"
                      : "Register Volunteer"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* VOLUNTEER TABLE */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Volunteer Directory
                {!loading && (
                  <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {pagination?.total ?? volunteers.length}
                  </span>
                )}
              </h2>

              <p className="mt-0.5 text-[11px] text-slate-400">
                View and manage registered volunteers
              </p>
            </div>

            {/* DOWNLOAD MENU */}

            <div ref={downloadMenuRef} className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowDownloadMenu((prev) => !prev)
                }
                disabled={loading || volunteers.length === 0}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={14} />
                Export
                <ChevronDown size={13} />
              </button>

              {showDownloadMenu && (
                <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={downloadVolunteerXLSX}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-emerald-50"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    <span>
                      <span className="block font-semibold">Excel (XLSX)</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        Spreadsheet workbook
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadVolunteerCSV}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-blue-50"
                  >
                    <FileDown size={16} className="text-blue-600" />
                    <span>
                      <span className="block font-semibold">CSV</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        Comma-separated data
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadVolunteerPDF}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-red-50"
                  >
                    <FileText size={16} className="text-red-600" />
                    <span>
                      <span className="block font-semibold">PDF Report</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        Printable document
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
              <RefreshCw size={16} className="animate-spin" />
              Loading volunteers...
            </div>
          ) : volunteers.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <div className="rounded-full bg-slate-100 p-3">
                <Users size={25} className="text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No volunteers found
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Change the status filter or register a new volunteer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Volunteer</th>
                    <th className="px-4 py-3 font-bold">Registration No.</th>
                    <th className="px-4 py-3 font-bold">Phone</th>
                    <th className="px-4 py-3 font-bold">Email</th>
                    <th className="px-4 py-3 font-bold">Skills</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 text-center font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {volunteers.map((volunteer) => (
                    <tr
                      key={volunteer.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          {volunteer.name || "—"}
                        </p>
                        {/* <p className="mt-0.5 text-[10px] text-slate-400">
                          ID #{volunteer.id}
                        </p> */}
                      </td>

                      <td className="px-4 py-3 font-medium text-teal-700">
                        {volunteer.volunteer_registration_no || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {volunteer.phone || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {volunteer.email || "—"}
                      </td>

                      <td className="max-w-[170px] px-4 py-3 text-slate-500">
                        <span
                          className="block truncate"
                          title={volunteer.skills || ""}
                        >
                          {volunteer.skills || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={volunteer.status} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-0.5">
                          <IconButton
                            title="View Details"
                            onClick={() => handleView(volunteer.id)}
                            className="text-slate-500 hover:text-teal-700"
                          >
                            <Eye size={15} />
                          </IconButton>

                          {volunteer.status === "pending_approval" && (
                            <>
                              <IconButton
                                title="Approve"
                                onClick={() =>
                                  handleApprove(volunteer.id, volunteer.name)
                                }
                                className="text-emerald-600 hover:bg-emerald-50"
                              >
                                <CheckCircle2 size={15} />
                              </IconButton>

                              <IconButton
                                title="Reject"
                                onClick={() => openRejectModal(volunteer)}
                                className="text-red-500 hover:bg-red-50"
                              >
                                <XCircle size={15} />
                              </IconButton>
                            </>
                          )}

                          {volunteer.status === "active" && (
                            <IconButton
                              title={
                                hasVolunteerCredentials(volunteer)
                                  ? "Credentials already issued"
                                  : "Issue Credentials"
                              }
                              disabled={hasVolunteerCredentials(volunteer)}
                              onClick={() => openCredModal(volunteer)}
                              className="text-indigo-600 hover:bg-indigo-50"
                            >
                              <KeyRound size={15} />
                            </IconButton>
                          )}

                          <IconButton
                            title="Edit"
                            onClick={() => handleEdit(volunteer)}
                            className="text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Pencil size={15} />
                          </IconButton>

                          {volunteer.status !== "inactive" && (
                            <IconButton
                              title="Deactivate"
                              onClick={() =>
                                handleDelete(volunteer.id, volunteer.name)
                              }
                              className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-slate-400">
              Showing {volunteers.length} of {pagination?.total ?? volunteers.length}{" "}
              volunteers
              {pagination?.total_pages
                ? ` · Page ${pagination.current_page ?? page} of ${pagination.total_pages}`
                : ""}
            </p>
            {Number(pagination?.total_pages) > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading || !pagination?.has_prev}
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={loading || !pagination?.has_next}
                  onClick={() =>
                    setPage((currentPage) =>
                      Math.min(Number(pagination.total_pages), currentPage + 1)
                    )
                  }
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* -----------------------------------------------------
          VIEW VOLUNTEER MODAL
      ----------------------------------------------------- */}

      {(viewLoading || viewModal) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !viewLoading) {
              setViewModal(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
            {viewLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <RefreshCw size={17} className="animate-spin" />
                Loading volunteer details...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Volunteer Details
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Complete registration information
                    </p>
                  </div>

                  <IconButton
                    title="Close"
                    onClick={() => setViewModal(null)}
                  >
                    <X size={17} />
                  </IconButton>
                </div>

                <div className="space-y-4 p-4">
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Name" value={viewModal.name} />
                    <Detail label="Phone" value={viewModal.phone} />
                    <Detail label="Email" value={viewModal.email} />
                    <Detail label="Aadhaar No." value={viewModal.aadhaar_no} />
                    <Detail
                      label="Registration No."
                      value={viewModal.volunteer_registration_no}
                    />
                    <Detail
                      label="Registration Date"
                      value={viewModal.registration_date}
                    />
                    <Detail label="Skills" value={viewModal.skills} />
                    <Detail
                      label="Status"
                      value={
                        STATUS_LABELS[viewModal.status] ||
                        viewModal.status
                      }
                    />
                    <Detail label="Created At" value={viewModal.created_at} />
                    <Detail label="Updated At" value={viewModal.updated_at} />
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Detail label="Address" value={viewModal.address} />
                    </div>
                  </div>

                  <section className="rounded-lg border border-teal-100 p-3">
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-800">
                      <ImageIcon size={15} className="text-teal-600" />
                      Aadhaar / ID Card Image
                    </h4>

                    {viewModal.id_card ? (
                      <a
                        href={getFileUrl(viewModal.id_card)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5 hover:bg-teal-50"
                      >
                        <img
                          src={getFileUrl(viewModal.id_card)}
                          alt="Volunteer Aadhaar or ID card"
                          className="h-16 w-24 rounded-md border border-slate-200 bg-white object-contain"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700">
                            View uploaded image
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            Open the original image in a new tab
                          </p>
                        </div>
                        <ExternalLink size={15} className="text-teal-600" />
                      </a>
                    ) : (
                      <p className="text-xs text-slate-400">
                        No ID image uploaded.
                      </p>
                    )}
                  </section>

                  <section className="rounded-lg border border-slate-200 p-3">
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-800">
                      <FileText size={15} className="text-indigo-600" />
                      Supporting Documents
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700">
                        {viewModal.supporting_documents?.length || 0}
                      </span>
                    </h4>

                    {viewModal.supporting_documents?.length ? (
                      <div className="space-y-1.5">
                        {viewModal.supporting_documents.map((doc, index) => (
                          <div
                            key={
                              doc.document_id ||
                              doc.document_path ||
                              index
                            }
                            className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-2"
                          >
                            <FileText
                              size={15}
                              className="shrink-0 text-indigo-500"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-slate-700">
                                {doc.document_name || "Supporting document"}
                              </p>
                              {doc.uploaded_at && (
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                  Uploaded: {doc.uploaded_at}
                                </p>
                              )}
                            </div>
                            <a
                              href={getFileUrl(doc.document_path)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        No supporting documents uploaded.
                      </p>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* -----------------------------------------------------
          REJECT MODAL
      ----------------------------------------------------- */}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px]">
          <form
            onSubmit={handleReject}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Reject Volunteer
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {rejectModal.name}
                </p>
              </div>

              <IconButton
                title="Close"
                onClick={() => setRejectModal(null)}
              >
                <X size={16} />
              </IconButton>
            </div>

            <label className="mb-1.5 mt-4 block text-xs font-semibold text-slate-600">
              Rejection Note (Optional)
            </label>

            <textarea
              rows={3}
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={rejectSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectSubmitting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -----------------------------------------------------
          CREDENTIAL MODAL
      ----------------------------------------------------- */}

      {credModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px]">
          <form
            onSubmit={handleIssueCredentials}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Issue Login Credentials
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Volunteer: {credModal.name}
                </p>
              </div>

              <IconButton
                title="Close"
                onClick={() => setCredModal(null)}
              >
                <X size={16} />
              </IconButton>
            </div>

            <div className="mt-4 space-y-3">
              <Field label="Email Address" required>
                <input
                  type="email"
                  value={cred.email}
                  onChange={(event) =>
                    setCred((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  required
                  autoComplete="email"
                  placeholder="volunteer@example.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
                />
              </Field>

              <Field label="Password (minimum 8 characters)" required>
                <input
                  type="password"
                  value={cred.password}
                  onChange={(event) =>
                    setCred((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Set a secure password"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
                />
              </Field>

              <p className="text-[10px] leading-4 text-slate-400">
                Credentials are submitted to the volunteer credentials API.
                Passwords are not saved in local storage.
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCredModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={credSubmitting}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {credSubmitting ? "Issuing..." : "Issue Credentials"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
