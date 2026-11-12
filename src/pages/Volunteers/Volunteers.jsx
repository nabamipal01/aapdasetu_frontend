import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Users, Search, Plus, X, RefreshCw, Trash2, Pencil, CheckCircle2,
  KeyRound, RotateCcw, ChevronDown, Download, FileSpreadsheet, FileText,
  FileDown, Eye, Image as ImageIcon, UploadCloud, ExternalLink,
} from "lucide-react";
import * as XLSX from "xlsx";

import {
  listVolunteers,
  getVolunteer,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  approveVolunteer,
  generateVolunteerCredentials,
} from "../../services";

import { listDistricts } from "../../services/districtService";
import {
  downloadStyledPdf,
  downloadStyledXlsx,
} from "../../utils/tableExport";
import API_BASE_URL from "../../config/Config";

/* ---------------------------------------------------------
   CONSTANTS AND HELPERS
--------------------------------------------------------- */

const STATUS_STYLES = {
  pending_approval: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-violet-50 text-violet-700 ring-violet-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  deployed: "bg-blue-50 text-blue-700 ring-blue-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
};

const STATUS_LABELS = {
  pending_approval: "Pending Approval",
  approved: "Approved",
  active: "Active",
  deployed: "Deployed",
  inactive: "Inactive",
};

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  dob: "",
  emergency_no: "",
  aadhaar_no: "",
  volunteer_registration_no: "",
  registration_date: "",
  district_id: "",
  skills: "",
  house_no: "",
  address_line1: "",
  address_line2: "",
  police_station: "",
  pin_code: "",
  id_card: null,
  supporting_documents: [],
};

const EMPTY_CRED = { email: "", password: "", confirmPassword: "" };

const getFileUrl = (path) => {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  const apiBase = new URL(API_BASE_URL, window.location.origin);
  const basePath = apiBase.pathname.replace(/\/+$/, "");
  const normalizedPath = String(path)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const normalizedBasePath = basePath.replace(/^\/+/, "");
  const relativePath = normalizedPath.startsWith(`${normalizedBasePath}/`)
    ? normalizedPath.slice(normalizedBasePath.length + 1)
    : normalizedPath;

  return new URL(relativePath, `${apiBase.origin}${basePath}/`).toString();
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
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
};

const isImageFile = (fileName) =>
  /\.(jpe?g|png|webp)(?:[?#]|$)/i.test(String(fileName || ""));

const isPdfFile = (fileName) =>
  /\.pdf(?:[?#]|$)/i.test(String(fileName || ""));

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
  const credentialStatus = String(volunteer.credential_status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (credentialStatus === "issued") return true;
  if (credentialStatus === "not_issued") return false;

  if (volunteer.credentials_issued != null) {
    return (
      volunteer.credentials_issued === true ||
      volunteer.credentials_issued === 1 ||
      ["1", "true"].includes(
        String(volunteer.credentials_issued).toLowerCase()
      )
    );
  }

  if (volunteer.password_created != null) {
    return (
      volunteer.password_created === true ||
      volunteer.password_created === 1 ||
      ["1", "true"].includes(
        String(volunteer.password_created).toLowerCase()
      )
    );
  }

  return Boolean(getStoredCredentials(volunteer)?.issued);
};

/*
 * District helper functions.
 * Different APIs may use id, district_id, districtId, or nested district data.
 */

const getDistrictId = (district) => {
  if (district == null) return "";

  const value =
    district.id ??
    district.district_id ??
    district.districtId ??
    district.value;

  return value == null ? "" : String(value);
};

const getVolunteerDistrictId = (volunteer) => {
  if (!volunteer) return "";

  const value =
    volunteer.district_id ??
    volunteer.districtId ??
    (typeof volunteer.district === "number" ||
    (typeof volunteer.district === "string" && /^\d+$/.test(volunteer.district))
      ? volunteer.district
      : undefined) ??
    volunteer.district?.id ??
    volunteer.district?.district_id ??
    volunteer.district?.districtId ??
    volunteer.district?.value;

  return value == null ? "" : String(value);
};

const getDistrictLabel = (district) =>
  district?.name ??
  district?.district_name ??
  district?.districtName ??
  district?.title ??
  "";

const extractDistrictList = (response) => {
  const candidates = [
    response?.data?.districts,
    response?.data?.items,
    response?.data?.data?.districts,
    response?.data?.data?.items,
    response?.data?.data,
    response?.districts,
    response?.items,
    response?.data,
    response,
  ];

  return candidates.find(Array.isArray) || [];
};

const getVolunteerDistrictName = (volunteer, districtList = []) => {
  if (!volunteer) return "—";

  const nestedDistrict = volunteer.district;
  const nestedObjectName =
    nestedDistrict && typeof nestedDistrict === "object"
      ? getDistrictLabel(nestedDistrict)
      : "";

  if (nestedObjectName) return nestedObjectName;

  const directName =
    volunteer.district_name ??
    volunteer.districtName ??
    volunteer.district?.district_name ??
    volunteer.district?.districtName ??
    "";

  if (directName) return directName;

  // Some APIs return district as a numeric ID string (for example, "3").
  // Resolve that ID against the districts list instead of displaying the ID.
  const volunteerDistrictId = getVolunteerDistrictId(volunteer);
  if (volunteerDistrictId) {
    const matchedDistrict = districtList.find(
      (district) => getDistrictId(district) === volunteerDistrictId
    );
    if (matchedDistrict) return getDistrictLabel(matchedDistrict) || "—";
  }

  // A non-numeric string in `district` is most likely already the district name.
  if (typeof nestedDistrict === "string" && nestedDistrict.trim()) {
    return nestedDistrict;
  }

  return "—";
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
        STATUS_STYLES[status] ||
        "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {STATUS_LABELS[status] || status || "Unknown"}
    </span>
  );
}

function IconButton({
  title,
  onClick,
  children,
  className = "",
  disabled,
}) {
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

  const [districts, setDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const [existingIdCard, setExistingIdCard] = useState("");
  const [existingSupportingDocuments, setExistingSupportingDocuments] =
    useState([]);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterCredentialStatus, setFilterCredentialStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  const [viewModal, setViewModal] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [isIdCardDragging, setIsIdCardDragging] = useState(false);
  const [isSupportingDocumentsDragging, setIsSupportingDocumentsDragging] =
    useState(false);

  const selectedIdCardPreviewUrl = useMemo(
    () => (form.id_card ? URL.createObjectURL(form.id_card) : ""),
    [form.id_card]
  );

  const filteredVolunteers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return volunteers;

    return volunteers.filter((volunteer) =>
      [
        volunteer.name,
        volunteer.volunteer_registration_no,
        volunteer.phone,
        volunteer.email,
        volunteer.aadhaar_no,
        volunteer.skills,
        volunteer.house_no,
        volunteer.address_line1,
        volunteer.address_line2,
        volunteer.police_station,
        volunteer.pin_code,
        volunteer.address,
      ].some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [volunteers, searchTerm]);

  const [credModal, setCredModal] = useState(null);
  const [cred, setCred] = useState(EMPTY_CRED);
  const [credSubmitting, setCredSubmitting] = useState(false);

  useEffect(() => {
    const modalIsOpen = Boolean(
      filePreview || viewLoading || viewModal || credModal
    );
    if (!modalIsOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [filePreview, viewLoading, viewModal, credModal]);

  useEffect(() => {
    return () => {
      if (filePreview?.revokeUrl) {
        URL.revokeObjectURL(filePreview.url);
      }
    };
  }, [filePreview]);

  useEffect(() => {
    return () => {
      if (selectedIdCardPreviewUrl) {
        URL.revokeObjectURL(selectedIdCardPreviewUrl);
      }
    };
  }, [selectedIdCardPreviewUrl]);

  const openFilePreview = (url, name, isImage, revokeUrl = false) => {
    setFilePreview({ url, name, isImage, revokeUrl });
  };

  /* -------------------------------------------------------
     FETCH VOLUNTEERS
  ------------------------------------------------------- */

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { page, per_page: 20 };
      if (filterStatus) params.status = filterStatus;
      if (filterCredentialStatus) {
        params.credential_status = filterCredentialStatus;
      }
      if (searchTerm.trim()) params.search = searchTerm.trim();

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
  }, [filterCredentialStatus, filterStatus, page, searchTerm]);

  /* -------------------------------------------------------
     FETCH DISTRICTS
  ------------------------------------------------------- */

  const fetchDistricts = useCallback(
    async (forceRefresh = false) => {
      if (districts.length > 0 && !forceRefresh) {
        return districts;
      }

      setDistrictsLoading(true);

      try {
        const response = await listDistricts({ per_page: 100 });
        const list = extractDistrictList(response);

        // Normalize IDs so the select can consistently match them as strings.
        const normalizedList = list.filter(Boolean).map((district) => ({
          ...district,
          id: getDistrictId(district),
          name: getDistrictLabel(district),
        }));

        setDistricts(normalizedList);
        return normalizedList;
      } catch (err) {
        console.error("Failed to load districts:", err);
        return districts;
      } finally {
        setDistrictsLoading(false);
      }
    },
    [districts]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchVolunteers();
    }, searchTerm.trim() ? 300 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchVolunteers, searchTerm]);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* -------------------------------------------------------
     FORM
  ------------------------------------------------------- */

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, supporting_documents: [] });
    setExistingIdCard("");
    setExistingSupportingDocuments([]);
    setEditingVolunteerId(null);
    setShowForm(false);
  };

  const openNewForm = async () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
    await fetchDistricts();
  };

  const handleEdit = async (volunteer) => {
    setError("");
    setSuccess("");

    try {
      // Load districts before opening the form, so the selected option exists.
      await fetchDistricts();

      const res = requireApiSuccess(
        await getVolunteer(volunteer.id),
        "Failed to load volunteer details."
      );

      const data = res?.data?.volunteer ?? res?.data;

      if (!data) {
        throw new Error("Volunteer details not found.");
      }

      const districtId = getVolunteerDistrictId(data);

      setForm({
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        dob: data.dob ? String(data.dob).slice(0, 10) : "",
        emergency_no: data.emergency_no || "",
        aadhaar_no: data.aadhaar_no || "",
        volunteer_registration_no: data.volunteer_registration_no || "",
        registration_date: data.registration_date
          ? String(data.registration_date).slice(0, 10)
          : "",
        district_id: districtId,
        skills: data.skills || "",
        house_no: data.house_no || "",
        address_line1: data.address_line1 || "",
        address_line2: data.address_line2 || "",
        police_station: data.police_station || "",
        pin_code: data.pin_code || "",
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

    if (
      !form.house_no.trim() ||
      !form.address_line1.trim() ||
      !form.police_station.trim() ||
      !form.pin_code.trim()
    ) {
      setError(
        "House no., address line 1, police station and PIN code are required."
      );
      return;
    }

    if (editingVolunteerId === null && !form.id_card) {
      setError("Please upload the mandatory Aadhaar / ID card image.");
      return;
    }

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
      registrationPayload.append("dob", form.dob);
      registrationPayload.append("phone", phone);
      registrationPayload.append("emergency_no", form.emergency_no.trim());
      registrationPayload.append("email", email);
      registrationPayload.append("aadhaar_no", form.aadhaar_no.trim());
      registrationPayload.append(
        "volunteer_registration_no",
        form.volunteer_registration_no.trim()
      );
      registrationPayload.append("registration_date", form.registration_date);
      registrationPayload.append("skills", form.skills.trim());
      registrationPayload.append("house_no", form.house_no.trim());
      registrationPayload.append("address_line1", form.address_line1.trim());
      registrationPayload.append("address_line2", form.address_line2.trim());
      registrationPayload.append("police_station", form.police_station.trim());
      registrationPayload.append("pin_code", form.pin_code.trim());

      if (form.district_id) {
        registrationPayload.append("district_id", form.district_id);
      }

      if (form.id_card) {
        registrationPayload.append("id_card", form.id_card);
      }

      form.supporting_documents.forEach((file) => {
        registrationPayload.append("supporting_documents[]", file);
      });

      if (editingVolunteerId !== null) {
        const updatePayload = {
          name,
          phone,
          email,
          dob: form.dob || null,
          emergency_no: form.emergency_no.trim(),
          aadhaar_no: form.aadhaar_no.trim(),
          volunteer_registration_no:
            form.volunteer_registration_no.trim(),
          registration_date: form.registration_date,
          // Send a numeric ID if the backend expects an integer.
          district_id: form.district_id
            ? Number(form.district_id)
            : null,
          skills: form.skills.trim(),
          house_no: form.house_no.trim(),
          address_line1: form.address_line1.trim(),
          address_line2: form.address_line2.trim(),
          police_station: form.police_station.trim(),
          pin_code: form.pin_code.trim(),
        };

        requireApiSuccess(
          await updateVolunteer(editingVolunteerId, updatePayload),
          "Failed to update volunteer."
        );
        console.log('updatePayload:', updatePayload);
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
        const createdStatus =
          res.data.status ??
          res.data.volunteer?.status ??
          "pending_approval";

        setSuccess(
          `Volunteer "${name}" registered successfully with status ${
            STATUS_LABELS[createdStatus] || createdStatus
          }. Registration No: ${registrationNo}`
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate volunteer "${name}"?`)) return;

    setError("");
    setSuccess("");

    try {
      requireApiSuccess(
        await deleteVolunteer(id),
        "Failed to set volunteer status to inactive."
      );
      setSuccess(`"${name}" marked as inactive.`);
      await fetchVolunteers();
    } catch (err) {
      setError(err?.message || "Failed to deactivate volunteer.");
    }
  };

  /* -------------------------------------------------------
     VIEW DETAILS
  ------------------------------------------------------- */

  const handleView = async (id, volunteerFromList = {}) => {
    setViewLoading(true);
    setViewModal(null);
    setError("");

    try {
      // Load districts so an ID-only response can still show its name.
      const districtList = await fetchDistricts();

      const res = requireApiSuccess(
        await getVolunteer(id),
        "Failed to load volunteer details."
      );

      const responseData = res?.data?.volunteer ?? res?.data;
      if (!responseData) {
        throw new Error("Volunteer details not found.");
      }

      // Some detail endpoints omit district fields that are present in the list.
      // Merge list data first and let the full detail response override it.
      const data = { ...volunteerFromList, ...responseData };
      console.log("Volunteer from table:", volunteerFromList);
console.log("Volunteer detail API:", responseData);
console.log("District list:", districtList);
console.log("Resolved district ID:", getVolunteerDistrictId(data));
console.log("Resolved district name:", getVolunteerDistrictName(data, districtList));
      const districtName = getVolunteerDistrictName(data, districtList);

      setViewModal({
        ...data,
        district_name: districtName,
      });
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
    const alreadyIssued = hasVolunteerCredentials(volunteer);
    const assignedEmail = stored?.email || volunteer.email || "";

    setCredModal({
      id: volunteer.id,
      name: volunteer.name,
      assignedEmail,
      isReset: alreadyIssued,
    });

    setCred({
      email: assignedEmail,
      password: "",
      confirmPassword: "",
    });

    setError("");
    setSuccess("");
  };

  const handleIssueCredentials = async (event) => {
    event.preventDefault();
    if (!credModal) return;

    if (!credModal.assignedEmail.trim()) {
      setError("This volunteer does not have an email address. Add an email to the volunteer profile first.");
      return;
    }

    if (cred.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (cred.password !== cred.confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    setCredSubmitting(true);
    setError("");

    try {
      const res = requireApiSuccess(
        await generateVolunteerCredentials(credModal.id, {
          email: credModal.assignedEmail.trim(),
          password: cred.password,
        }, credModal.isReset),
        credModal.isReset
          ? "Failed to reset volunteer password."
          : "Failed to issue volunteer credentials."
      );

      localStorage.setItem(
        `volunteer-credentials-${credModal.id}`,
        JSON.stringify({
          email: res.data?.email || credModal.assignedEmail.trim(),
          issued: true,
        })
      );

      setSuccess(
        credModal.isReset
          ? `Password reset successfully for "${credModal.name}".`
          : `Login credentials issued to "${credModal.name}".`
      );
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

  const getVolunteerExportData = () =>
    filteredVolunteers.map((volunteer, index) => ({
      "S.No.": index + 1,
      Name: volunteer.name || "",
      "Registration No.": volunteer.volunteer_registration_no || "",
      "Registration Date": volunteer.registration_date || "",
      DOB: volunteer.dob || "",
      Phone: volunteer.phone || "",
      "Emergency Contact No.": volunteer.emergency_no || "",
      Email: volunteer.email || "",
      "Aadhaar No.": volunteer.aadhaar_no || "",
      Skills: volunteer.skills || "",
      "House No.": volunteer.house_no || "",
      "Address Line 1": volunteer.address_line1 || "",
      "Address Line 2": volunteer.address_line2 || "",
      "Police Station": volunteer.police_station || "",
      "PIN Code": volunteer.pin_code || "",
      District: getVolunteerDistrictName(volunteer, districts) === "—"
        ? ""
        : getVolunteerDistrictName(volunteer, districts),
      Status: STATUS_LABELS[volunteer.status] || volunteer.status || "",
    }));

  const getExportFilenameDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;
  };

  const downloadVolunteerXLSX = () => {
    if (!filteredVolunteers.length) {
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
    if (!filteredVolunteers.length) {
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
    if (!filteredVolunteers.length) {
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

  const isAllowedVolunteerDocument = (file) =>
    ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
      file.type
    ) ||
    /\.(pdf|jpe?g|png|webp)$/i.test(file.name);

  const handleSupportingDocuments = (files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    const invalidFiles = selectedFiles.filter(
      (file) => !isAllowedVolunteerDocument(file)
    );

    if (invalidFiles.length) {
      setError("Supporting documents must be PDF, JPG, PNG, or WebP files.");
      return;
    }

    setError("");

    setForm((previous) => {
      const existing = previous.supporting_documents || [];
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
        ...previous,
        supporting_documents: [...existing, ...newFiles],
      };
    });
  };

  const handleIdCardFiles = (files) => {
    const file = files?.[0];
    if (!file) return;

    if (!isAllowedVolunteerDocument(file)) {
      setError("The ID card must be a PDF, JPG, PNG, or WebP file.");
      return;
    }

    setError("");
    setForm((previous) => ({ ...previous, id_card: file }));
  };

  const handleSupportingDocumentsChange = (event) => {
    handleSupportingDocuments(event.target.files);
    event.target.value = "";
  };

  const handleIdCardChange = (event) => {
    handleIdCardFiles(event.target.files);
    event.target.value = "";
  };

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
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
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="deployed">Deployed</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative">
              <select
                value={filterCredentialStatus}
                onChange={(event) => {
                  setFilterCredentialStatus(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by credential status"
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">All Credentials</option>
                <option value="issued">Credentials Issued</option>
                <option value="not_issued">Credentials Not Issued</option>
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
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
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
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success"
            >
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
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* REGISTRATION / EDIT FORM */}
        {showForm && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 md:px-5">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  {editingVolunteerId ? "Edit Volunteer" : "New Volunteer Registration"}
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

                <Field label="Date of Birth" required>
                  <input
                    name="dob"
                    type="date"
                    value={form.dob}
                    onChange={handleChange}
                    max={new Date().toISOString().slice(0, 10)}
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

                <Field label="Emergency Contact Number" required>
                  <input
                    name="emergency_no"
                    type="tel"
                    value={form.emergency_no}
                    onChange={handleChange}
                    maxLength={20}
                    placeholder="Enter emergency contact number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Email Address" required>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Aadhaar Number" required>
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

                <Field label="Registration Number" required>
                  <input
                    name="volunteer_registration_no"
                    value={form.volunteer_registration_no}
                    onChange={handleChange}
                    placeholder="Registration number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Registration Date" required>
                  <input
                    name="registration_date"
                    type="date"
                    value={form.registration_date}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                {/* FIXED DISTRICT DROPDOWN */}
                <Field label="District" required>
                  <div className="relative">
                    <select
                      name="district_id"
                      value={String(form.district_id ?? "")}
                      onChange={handleChange}
                      disabled={districtsLoading}
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50 disabled:opacity-60"
                    >
                      <option value="">
                        {districtsLoading ? "Loading districts…" : "Select district"}
                      </option>

                      {districts.map((district) => {
                        const districtId = getDistrictId(district);
                        const districtName = getDistrictLabel(district);

                        if (!districtId) return null;

                        return (
                          <option key={districtId} value={districtId}>
                            {districtName || `District #${districtId}`}
                          </option>
                        );
                      })}
                    </select>

                    <ChevronDown
                      size={13}
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </Field>

                <Field label="Skills" required className="sm:col-span-2 lg:col-span-3">
                  <input
                    name="skills" 
                    value={form.skills}
                    onChange={handleChange}
                    placeholder="First Aid, Swimming, Driving..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="House No." required>
                  <input
                    name="house_no"
                    value={form.house_no}
                    onChange={handleChange}
                    required
                    placeholder="e.g. 12A"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Address Line 1" required className="sm:col-span-2">
                  <input
                    name="address_line1"
                    value={form.address_line1}
                    onChange={handleChange}
                    required
                    placeholder="e.g. MG Road"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Address Line 2" className="sm:col-span-2 lg:col-span-3">
                  <input
                    name="address_line2"
                    value={form.address_line2}
                    onChange={handleChange}
                    placeholder="e.g. Near City Hospital"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="Police Station" required className="sm:col-span-2">
                  <input
                    name="police_station"
                    value={form.police_station}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Central Police Station"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                <Field label="PIN Code" required>
                  <input
                    name="pin_code"
                    value={form.pin_code}
                    onChange={handleChange}
                    required
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 700001"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"
                  />
                </Field>

                {/* ID CARD */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <div
                    onDragEnter={(event) => {
                      event.preventDefault();
                      if (editingVolunteerId === null) {
                        setIsIdCardDragging(true);
                      }
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setIsIdCardDragging(false);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsIdCardDragging(false);
                      if (editingVolunteerId === null) {
                        handleIdCardFiles(event.dataTransfer.files);
                      }
                    }}
                    className={`rounded-lg border bg-teal-50/40 p-3.5 transition-colors ${
                      isIdCardDragging
                        ? "border-teal-500 bg-teal-100/70"
                        : "border-teal-100"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {form.id_card ? (
                          isImageFile(form.id_card.name) ? (
                            <button
                              type="button"
                              onClick={() =>
                                openFilePreview(
                                  selectedIdCardPreviewUrl,
                                  form.id_card.name,
                                  true
                                )
                              }
                              className="h-full w-full"
                              aria-label="Preview selected ID card"
                            >
                              <img
                                src={selectedIdCardPreviewUrl}
                                alt="Selected ID card"
                                className="h-full w-full object-contain"
                              />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openFilePreview(
                                  selectedIdCardPreviewUrl,
                                  form.id_card.name,
                                  false
                                )
                              }
                              className="flex h-full w-full flex-col items-center justify-center gap-1 text-red-600"
                              aria-label="Preview selected ID card PDF"
                            >
                              <FileText size={28} />
                              <span className="text-[9px] font-bold uppercase">
                                PDF
                              </span>
                            </button>
                          )
                        ) : existingIdCard ? (
                          <button
                            type="button"
                            onClick={() =>
                              openFilePreview(
                                getFileUrl(existingIdCard),
                                "Volunteer ID card",
                                isImageFile(existingIdCard)
                              )
                            }
                            className={`h-full w-full ${
                              isPdfFile(existingIdCard)
                                ? "flex flex-col items-center justify-center gap-1 text-red-600"
                                : ""
                            }`}
                            aria-label="Preview existing ID card"
                          >
                            {isImageFile(existingIdCard) ? (
                              <img
                                src={getFileUrl(existingIdCard)}
                                alt="Existing ID card"
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <>
                                <FileText size={28} />
                                <span className="text-[9px] font-bold uppercase">
                                  PDF
                                </span>
                              </>
                            )}
                          </button>
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
                           ID Card / Photo
                          {editingVolunteerId === null && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          Upload a clear JPG, PNG, PDF or WebP file.
                          {editingVolunteerId === null
                            ? " Required for new registration."
                            : " Existing image is retained."}
                        </p>

                        {existingIdCard && !form.id_card && (
                          <button
                            type="button"
                            onClick={() =>
                              openFilePreview(
                                getFileUrl(existingIdCard),
                                "Volunteer ID card",
                                true
                              )
                            }
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline"
                          >
                            View current image <ExternalLink size={11} />
                          </button>
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
                            {form.id_card ? "Change file" : "Upload image"}
                          </label>

                          <input
                            id="volunteer-id-card"
                            type="file"
                            accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={editingVolunteerId !== null}
                            onChange={handleIdCardChange}
                          />

                          {form.id_card && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm((previous) => ({
                                  ...previous,
                                  id_card: null,
                                }))
                              }
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Remove selection
                            </button>
                          )}
                        </div>
                        {editingVolunteerId === null && (
                          <p className="mt-2 text-[10px] text-slate-400">
                            Drag and drop an image or PDF here.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SUPPORTING DOCUMENTS */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <div
                    onDragEnter={(event) => {
                      event.preventDefault();
                      if (editingVolunteerId === null) {
                        setIsSupportingDocumentsDragging(true);
                      }
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setIsSupportingDocumentsDragging(false);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsSupportingDocumentsDragging(false);
                      if (editingVolunteerId === null) {
                        handleSupportingDocuments(event.dataTransfer.files);
                      }
                    }}
                    className={`rounded-lg border p-3.5 transition-colors ${
                      isSupportingDocumentsDragging
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                          <FileText size={17} />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Supporting Documents <span className="text-[12px] font-normal text-slate-500">(Aadhar, Ration Card, Driving License,voter ID, PAN etc.)</span> 
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
                        accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                        disabled={editingVolunteerId !== null}
                        className="sr-only"
                        onChange={handleSupportingDocumentsChange}
                      />
                    </div>
                    {editingVolunteerId === null && (
                      <p className="mt-2 text-[10px] text-slate-400">
                        Or drag and drop PDF, JPG, PNG, or WebP files here.
                      </p>
                    )}

                    {existingSupportingDocuments.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Existing files
                        </p>

                        {existingSupportingDocuments.map((doc, index) => (
                          <div
                            key={doc.document_id || doc.document_path || index}
                            className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-2"
                          >
                            <FileText size={15} className="shrink-0 text-indigo-500" />
                            <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
                              {doc.document_name || "Supporting document"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                openFilePreview(
                                  getFileUrl(doc.document_path),
                                  doc.document_name || "Supporting document",
                                  isImageFile(
                                    `${doc.document_name || ""} ${doc.document_path || ""}`
                                  )
                                )
                              }
                              className="text-xs font-semibold text-indigo-700 hover:underline"
                            >
                              View
                            </button>
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
                            <FileText size={15} className="shrink-0 text-indigo-500" />
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
                                setForm((previous) => ({
                                  ...previous,
                                  supporting_documents:
                                    previous.supporting_documents.filter(
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
                    : editingVolunteerId !== null
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

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, Aadhaar, phone, email..."
                  aria-label="Search volunteers"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setPage(1);
                    }}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div ref={downloadMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDownloadMenu((previous) => !previous)}
                  disabled={loading || filteredVolunteers.length === 0}
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
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
              <RefreshCw size={16} className="animate-spin" />
              Loading volunteers...
            </div>
          ) : filteredVolunteers.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <div className="rounded-full bg-slate-100 p-3">
                <Users size={25} className="text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {searchTerm ? "No matching volunteers" : "No volunteers found"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {searchTerm
                  ? "Try a different search term or clear the search."
                  : "Change the status filter or register a new volunteer."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">S.No.</th>
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
                  {filteredVolunteers.map((volunteer, index) => (
                    <tr
                      key={volunteer.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 text-slate-500">
                        {(page - 1) * 20 + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          {volunteer.name || "—"}
                        </p>
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
                            onClick={() => handleView(volunteer.id, volunteer)}
                            className="text-slate-500 hover:text-teal-700"
                          >
                            <Eye size={15} />
                          </IconButton>

                          {volunteer.status === "pending_approval" && (
                            <IconButton
                              title="Approve"
                              onClick={() =>
                                handleApprove(volunteer.id, volunteer.name)
                              }
                              className="text-emerald-600 hover:bg-emerald-50"
                            >
                              <CheckCircle2 size={15} />
                            </IconButton>
                          )}

                          {["approved", "active", "deployed"].includes(
                            volunteer.status
                          ) && (
                            <IconButton
                              title={
                                hasVolunteerCredentials(volunteer)
                                  ? "Reset Password"
                                  : "Issue Credentials"
                              }
                              onClick={() => openCredModal(volunteer)}
                              className="text-indigo-600 hover:bg-indigo-50"
                            >
                              {hasVolunteerCredentials(volunteer) ? (
                                <RotateCcw size={15} aria-hidden="true" />
                              ) : (
                                <KeyRound size={15} aria-hidden="true" />
                              )}
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
              Showing {filteredVolunteers.length} matching on this page, out of{" "}
              {pagination?.total ?? volunteers.length} volunteers
              {pagination?.total_pages
                ? ` · Page ${pagination.current_page ?? page} of ${pagination.total_pages}`
                : ""}
            </p>

            {Number(pagination?.total_pages) > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading || !pagination?.has_prev}
                  onClick={() =>
                    setPage((currentPage) => Math.max(1, currentPage - 1))
                  }
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

      {/* FILE PREVIEW MODAL */}
      {filePreview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFilePreview(null);
          }}
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={filePreview.name}
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 className="min-w-0 truncate text-sm font-semibold text-slate-800">
                {filePreview.name}
              </h2>
              <IconButton title="Close preview" onClick={() => setFilePreview(null)}>
                <X size={17} />
              </IconButton>
            </header>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
              {filePreview.isImage ? (
                <img
                  src={filePreview.url}
                  alt={filePreview.name}
                  className="mx-auto max-h-[78vh] max-w-full object-contain"
                />
              ) : (
                <iframe
                  src={filePreview.url}
                  title={filePreview.name}
                  className="h-[78vh] w-full rounded-lg border border-slate-200 bg-white"
                />
              )}
            </div>
          </section>
        </div>
      )}

      {/* VIEW VOLUNTEER MODAL */}
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
                  <IconButton title="Close" onClick={() => setViewModal(null)}>
                    <X size={17} />
                  </IconButton>
                </div>

                <div className="space-y-4 p-4">
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Name" value={viewModal.name} />
                    <Detail label="Date of Birth" value={viewModal.dob} />
                    <Detail label="Phone" value={viewModal.phone} />
                    <Detail
                      label="Emergency Contact Number"
                      value={viewModal.emergency_no}
                    />
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

                    {/* FIXED: DISTRICT IS NOW DISPLAYED */}
                    <Detail
                      label="District"
                      value={viewModal.district_name || getVolunteerDistrictName(viewModal, districts)}
                    />

                    <Detail label="Skills" value={viewModal.skills} />
                    <Detail label="House No." value={viewModal.house_no} />
                    <Detail
                      label="Address Line 1"
                      value={viewModal.address_line1}
                    />
                    <Detail
                      label="Address Line 2"
                      value={viewModal.address_line2}
                    />
                    <Detail
                      label="Police Station"
                      value={viewModal.police_station}
                    />
                    <Detail label="PIN Code" value={viewModal.pin_code} />
                    <Detail
                      label="Status"
                      value={
                        STATUS_LABELS[viewModal.status] || viewModal.status
                      }
                    />
                  </div>

                  <section className="rounded-lg border border-teal-100 p-3">
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-800">
                      <ImageIcon size={15} className="text-teal-600" />
                      Aadhaar / ID Card Image
                    </h4>

                    {viewModal.id_card ? (
                      <button
                        type="button"
                        onClick={() =>
                          openFilePreview(
                            getFileUrl(viewModal.id_card),
                            "Volunteer ID card",
                            true
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-lg bg-slate-50 p-2.5 text-left hover:bg-teal-50"
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
                            Open image preview
                          </p>
                        </div>
                        <ExternalLink size={15} className="text-teal-600" />
                      </button>
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
                            key={doc.document_id || doc.document_path || index}
                            className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-2"
                          >
                            <FileText size={15} className="shrink-0 text-indigo-500" />
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
                            <button
                              type="button"
                              onClick={() =>
                                openFilePreview(
                                  getFileUrl(doc.document_path),
                                  doc.document_name || "Supporting document",
                                  isImageFile(
                                    `${doc.document_name || ""} ${doc.document_path || ""}`
                                  )
                                )
                              }
                              className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              View
                            </button>
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

      {/* CREDENTIAL MODAL */}
      {credModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px]">
          <form
            onSubmit={handleIssueCredentials}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {credModal.isReset ? "Reset Password" : "Issue Login Credentials"}
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
              {!credModal.isReset && (
                <Field label="Email Address" required>
                  <input
                    type="email"
                    value={cred.email}
                    onChange={(event) =>
                      setCred((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                    required
                    autoComplete="email"
                    placeholder="volunteer@example.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
                  />
                </Field>
              )}

              <Field label="Password (minimum 8 characters)" required>
                <input
                  type="password"
                  value={cred.password}
                  onChange={(event) =>
                    setCred((previous) => ({
                      ...previous,
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

              <Field label="Confirm Password" required>
                <input
                  type="password"
                  value={cred.confirmPassword}
                  onChange={(event) =>
                    setCred((previous) => ({
                      ...previous,
                      confirmPassword: event.target.value,
                    }))
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
                />
              </Field>

              <p className="text-[10px] leading-4 text-slate-400">
                {credModal.isReset
                  ? "Enter and confirm the new password. The email address is kept hidden."
                  : "Confirm the password before issuing login credentials. Passwords are not saved in local storage."}
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
                {credSubmitting
                  ? credModal.isReset ? "Resetting..." : "Issuing..."
                  : credModal.isReset ? "Reset Password" : "Issue Credentials"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}