import React, { useCallback, useEffect, useState } from "react";
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
  Eye,
  FileText,
  Image,
  UploadCloud,
} from "lucide-react";

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

const STATUS_STYLES = {
  pending_approval: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  deployed: "bg-blue-100 text-blue-700",
  inactive: "bg-slate-100 text-slate-500",
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

function Volunteers() {
  const [volunteers, setVolunteers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [existingIdCard, setExistingIdCard] = useState("");
  const [existingSupportingDocuments, setExistingSupportingDocuments] =
    useState([]);

  const [editingVolunteerId, setEditingVolunteerId] = useState(null);

  const [filterStatus, setFilterStatus] = useState("");

  const [viewModal, setViewModal] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const [credModal, setCredModal] = useState(null);
  const [cred, setCred] = useState(EMPTY_CRED);
  const [credSubmitting, setCredSubmitting] = useState(false);

  /*
   * ---------------------------------------------------------
   * FETCH VOLUNTEERS
   * ---------------------------------------------------------
   */

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page: 1,
        per_page: 50,
      };

      if (filterStatus) {
        params.status = filterStatus;
      }

      const res = await listVolunteers(params);

      const list = res?.data?.volunteers ?? res?.data ?? [];

      setVolunteers(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || "Failed to load volunteers.");
      setVolunteers([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  /*
   * ---------------------------------------------------------
   * FORM
   * ---------------------------------------------------------
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setExistingIdCard("");
    setExistingSupportingDocuments([]);
    setEditingVolunteerId(null);
    setShowForm(false);
  };

  /*
   * ---------------------------------------------------------
   * EDIT
   * ---------------------------------------------------------
   */

  const handleEdit = async (volunteer) => {
    setError("");
    setSuccess("");

    try {
      /*
       * Get complete volunteer details because
       * get.php returns the complete volunteer object.
       */
      const res = await getVolunteer(volunteer.id);

      const data = res?.data;

      if (!data) {
        throw new Error("Volunteer details not found.");
      }

      setForm({
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        aadhaar_no: data.aadhaar_no || "",
        volunteer_registration_no: data.volunteer_registration_no || "",
        registration_date: data.registration_date || "",
        skills: data.skills || "",
        address: data.address || "",
      });
      setExistingIdCard(data.id_card || "");
      setExistingSupportingDocuments(
        Array.isArray(data.supporting_documents) ? data.supporting_documents : [],
      );

      setEditingVolunteerId(data.id);
      setShowForm(true);
    } catch (err) {
      setError(err?.message || "Failed to load volunteer details.");
    }
  };

  /*
   * ---------------------------------------------------------
   * CREATE / UPDATE
   * ---------------------------------------------------------
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const name = String(form.name || "").trim();
    const phone = String(form.phone || "").trim();
    const email = String(form.email || "").trim();
    const aadhaar_no = String(form.aadhaar_no || "").trim();
    const volunteer_registration_no = String(
      form.volunteer_registration_no || "",
    ).trim();
    const registration_date = String(
  form.registration_date || ""
).trim();
    const skills = String(form.skills || "").trim();
    const address = String(form.address || "").trim();

    if (!name) {
      setError("Name is required.");
      return;
    }

    if (!phone) {
      setError("Phone is required.");
      return;
    }

    if (editingVolunteerId === null && !form.id_card) {
      setError("ID Card image is required.");
      return;
    }

    if (
      editingVolunteerId !== null &&
      (form.id_card || form.supporting_documents?.length)
    ) {
      setError(
        "Document uploads are not supported while editing a volunteer. Remove the selected files to save profile changes.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();

      payload.append("name", name);
      payload.append("phone", phone);
      payload.append("email", email);
      payload.append("aadhaar_no", aadhaar_no);
      payload.append("volunteer_registration_no", volunteer_registration_no);
      payload.append("registration_date", registration_date);

      payload.append("skills", skills);
      payload.append("address", address);

      if (form.id_card) {
        payload.append("id_card", form.id_card);
      }

      if (form.supporting_documents?.length) {
        form.supporting_documents.forEach((file) => {
          payload.append("supporting_documents[]", file);
        });
      }

      if (editingVolunteerId !== null) {
        const res = await updateVolunteer(editingVolunteerId, {
          name,
          phone,
          email,
          aadhaar_no,
          volunteer_registration_no,
          registration_date,
          skills,
          address,
        });

        if (!res?.success) {
          throw new Error(res?.message || "Failed to update volunteer.");
        }

        setSuccess(`Volunteer "${name}" updated successfully.`);
      } else {
        const res = await createVolunteer(payload);

        if (!res?.success) {
          throw new Error(res?.message || "Failed to create volunteer.");
        }

        const registrationNo =
          res?.data?.volunteer_registration_no || volunteer_registration_no;

        setSuccess(
          `Volunteer "${name}" registered successfully. Registration No: ${registrationNo}`,
        );
      }

      setForm({ ...EMPTY_FORM });
      setExistingIdCard("");
      setExistingSupportingDocuments([]);
      setEditingVolunteerId(null);
      setShowForm(false);

      await fetchVolunteers();
    } catch (err) {
      console.error("Volunteer submit error:", err);
      setError(err?.message || "Failed to save volunteer.");
    } finally {
      setSubmitting(false);
    }
  };
  /*
   * ---------------------------------------------------------
   * APPROVE
   * ---------------------------------------------------------
   */

  const handleApprove = async (id, name) => {
    const confirmed = window.confirm(`Approve volunteer "${name}"?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await approveVolunteer(id);

      setSuccess(`"${name}" approved successfully.`);

      await fetchVolunteers();
    } catch (err) {
      setError(err?.message || "Failed to approve volunteer.");
    }
  };

  /*
   * ---------------------------------------------------------
   * REJECT
   * ---------------------------------------------------------
   */

  const openRejectModal = (volunteer) => {
    setRejectModal({
      id: volunteer.id,
      name: volunteer.name,
    });

    setRejectNote("");
    setError("");
    setSuccess("");
  };

  const handleReject = async () => {
    if (!rejectModal) {
      return;
    }

    setRejectSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await rejectVolunteer(rejectModal.id, rejectNote.trim());

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

  /*
   * ---------------------------------------------------------
   * DELETE / DEACTIVATE
   * ---------------------------------------------------------
   */

  const handleDelete = async (id, name) => {
    const confirmed = window.confirm(`Deactivate volunteer "${name}"?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await deleteVolunteer(id);

      setSuccess(`"${name}" deactivated successfully.`);

      await fetchVolunteers();
    } catch (err) {
      setError(err?.message || "Failed to deactivate volunteer.");
    }
  };

  /*
   * ---------------------------------------------------------
   * VIEW DETAILS
   * ---------------------------------------------------------
   */

  const handleView = async (id) => {
    setViewLoading(true);
    setViewModal(null);
    setError("");

    try {
      const res = await getVolunteer(id);

      if (!res?.data) {
        throw new Error("Volunteer details not found.");
      }

      setViewModal(res.data);
    } catch (err) {
      setError(err?.message || "Failed to load volunteer details.");
    } finally {
      setViewLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * CREDENTIALS
   * ---------------------------------------------------------
   */

  const openCredentialModal = (volunteer) => {
    setCredModal({
      id: volunteer.id,
      name: volunteer.name,
    });

    setCred({
      email: volunteer.email || "",
      password: "",
    });

    setError("");
    setSuccess("");
  };

  const handleIssueCredentials = async (e) => {
    e.preventDefault();

    if (!credModal) {
      return;
    }

    if (!cred.email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!cred.password) {
      setError("Password is required.");
      return;
    }

    if (cred.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setCredSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await generateVolunteerCredentials(credModal.id, {
        email: cred.email.trim(),
        password: cred.password,
      });

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

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-100 p-3">
              <Users size={26} className="text-teal-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">Volunteers</h1>

              <p className="text-sm text-slate-500">
                Manage volunteer registrations, approvals and credentials
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* STATUS FILTER */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-9 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">All Status</option>

                <option value="pending_approval">Pending Approval</option>

                <option value="active">Active</option>

                <option value="deployed">Deployed</option>

                <option value="inactive">Inactive</option>
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* REFRESH */}
            <button
              onClick={fetchVolunteers}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            {/* ADD */}
            <button
              onClick={() => {
                if (showForm) {
                  resetForm();
                } else {
                  setShowForm(true);
                  setError("");
                  setSuccess("");
                }
              }}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              {showForm ? (
                <>
                  <X size={15} />
                  Cancel
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Add Volunteer
                </>
              )}
            </button>
          </div>
        </div>

        {/* SUCCESS */}
        {success && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span>{success}</span>

            <button onClick={() => setSuccess("")} className="text-green-700">
              <X size={16} />
            </button>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button onClick={() => setError("")} className="text-red-700">
              <X size={16} />
            </button>
          </div>
        )}

        {/* FORM */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingVolunteerId
                    ? "Edit Volunteer"
                    : "Register New Volunteer"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter the volunteer's basic information.
                </p>
              </div>

              <button
                onClick={resetForm}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* NAME */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Full Name *
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter volunteer name"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {/* PHONE */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Phone *
                  </label>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="e.g. +919876543210"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="volunteer@example.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {/* AADHAAR */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Aadhaar No.
                  </label>

                  <input
                    name="aadhaar_no"
                    value={form.aadhaar_no}
                    onChange={handleChange}
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="12-digit Aadhaar number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {/* REGISTRATION NO. */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Registration No. *
                  </label>

                  <input
                    type="text"
                    name="volunteer_registration_no"
                    value={form.volunteer_registration_no}
                    onChange={handleChange}
                    placeholder="Enter volunteer registration number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Enter the registration number manually.
                  </p>
                </div>

                {/* REGISTRATION DATE */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Registration Date
                    </label>

                    <input
                      type="date"
                      name="registration_date"
                      value={form.registration_date}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />

                    <p className="mt-1 text-xs text-slate-400">
                      Select the volunteer registration date.
                    </p>
                  </div>

                {/* SKILLS */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Skills
                  </label>

                  <input
                    name="skills"
                    value={form.skills}
                    onChange={handleChange}
                    placeholder="e.g. First Aid, Swimming, Driving"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {/* ID CARD */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="volunteer-id-card"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    ID Card Image {editingVolunteerId === null && "*"}
                  </label>

                  <div className="flex flex-col gap-4 rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-4 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-teal-600 shadow-sm">
                      {form.id_card ? (
                        <div className="px-3 text-center">
                          <Image size={24} className="mx-auto" />
                          <p className="mt-1 max-w-28 truncate text-xs font-medium text-slate-600">
                            {form.id_card.name}
                          </p>
                        </div>
                      ) : existingIdCard ? (
                        <img
                          src={getFileUrl(existingIdCard)}
                          alt="Volunteer ID card preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center">
                          <Image size={26} className="mx-auto" />
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            ID card preview
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        Upload volunteer ID card
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Choose a clear JPG, PNG, or WebP image.
                        {editingVolunteerId === null && " Required for registration."}
                      </p>
                      {existingIdCard && !form.id_card && (
                        <a
                          href={getFileUrl(existingIdCard)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-medium text-teal-700 underline underline-offset-2"
                        >
                          View current ID card
                        </a>
                      )}
                      <label
                        htmlFor="volunteer-id-card"
                        className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
                      >
                        <UploadCloud size={16} />
                        {form.id_card ? "Choose a different image" : "Choose image"}
                      </label>
                      {form.id_card && editingVolunteerId !== null && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, id_card: null }))
                          }
                          className="ml-2 mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X size={15} />
                          Remove selection
                        </button>
                      )}
                      <input
                        id="volunteer-id-card"
                        type="file"
                        name="id_card"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            id_card: e.target.files?.[0] || null,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* SUPPORTING DOCUMENTS */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="volunteer-supporting-documents"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Supporting Documents
                  </label>

                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/40">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                          <FileText size={18} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Add supporting documents
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Select multiple PDF or image files. You can add more files in another selection.
                          </p>
                        </div>
                      </div>
                      <label
                        htmlFor="volunteer-supporting-documents"
                        className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                      >
                        <UploadCloud size={16} />
                        Add files
                      </label>
                      <input
                        id="volunteer-supporting-documents"
                        type="file"
                        name="supporting_documents"
                        accept=".pdf,image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          const selectedFiles = Array.from(e.target.files || []);
                          if (selectedFiles.length) {
                            setForm((prev) => {
                              const existingFiles = prev.supporting_documents || [];
                              const newFiles = selectedFiles.filter(
                                (file) =>
                                  !existingFiles.some(
                                    (existingFile) =>
                                      existingFile.name === file.name &&
                                      existingFile.size === file.size &&
                                      existingFile.lastModified === file.lastModified,
                                  ),
                              );
                              return {
                                ...prev,
                                supporting_documents: [...existingFiles, ...newFiles],
                              };
                            });
                          }
                          e.target.value = "";
                        }}
                      />
                    </div>

                    {existingSupportingDocuments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Previously uploaded ({existingSupportingDocuments.length})
                        </p>
                        {existingSupportingDocuments.map((doc, index) => (
                          <div
                            key={
                              doc.document_id ||
                              doc.document_path ||
                              `${doc.document_name}-${index}`
                            }
                            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <span className="rounded-md bg-indigo-50 p-2 text-indigo-600">
                              <FileText size={16} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-700">
                                {doc.document_name || "Supporting document"}
                              </p>
                              {doc.uploaded_at && (
                                <p className="text-xs text-slate-400">
                                  Uploaded {doc.uploaded_at}
                                </p>
                              )}
                            </div>
                            <a
                              href={getFileUrl(doc.document_path)}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                            >
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {form.supporting_documents?.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Selected files ({form.supporting_documents.length})
                        </p>
                        {form.supporting_documents.map((file, index) => (
                          <div
                            key={`${file.name}-${file.lastModified}-${index}`}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                          >
                            <span className="rounded-md bg-slate-100 p-2 text-slate-600">
                              <FileText size={16} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-700">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  supporting_documents:
                                    prev.supporting_documents.filter(
                                      (_, fileIndex) => fileIndex !== index,
                                    ),
                                }))
                              }
                              aria-label={`Remove ${file.name}`}
                              className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ADDRESS */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Address
                  </label>

                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    placeholder="e.g. Salt Lake, Kolkata, West Bengal"
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
                  disabled={submitting}
                  className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? editingVolunteerId
                      ? "Updating..."
                      : "Registering..."
                    : editingVolunteerId
                      ? "Update Volunteer"
                      : "Register Volunteer"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">
                Volunteers
                {!loading && (
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({volunteers.length})
                  </span>
                )}
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">
              <RefreshCw size={18} className="mr-2 animate-spin" />
              Loading volunteers...
            </div>
          ) : volunteers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users size={42} className="mb-3 text-slate-300" />

              <p className="font-medium text-slate-700">No volunteers found</p>

              <p className="mt-1 text-sm text-slate-500">
                Try another status filter or register a new volunteer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>

                    <th className="px-4 py-3 text-left">Registration No.</th>

                    <th className="px-5 py-3 font-semibold">Phone</th>

                    <th className="px-5 py-3 font-semibold">Email</th>

                    <th className="px-5 py-3 font-semibold">Skills</th>

                    <th className="px-5 py-3 font-semibold">Status</th>

                    <th className="px-5 py-3 text-center font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {volunteers.map((v) => (
                    <tr
                      key={v.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      {/* NAME */}
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{v.name}</p>

                          
                        </div>
                      </td>
                      {/* REGISTRATION NO. */}
                      <td className="px-4 py-4">
                        <span className="font-medium text-teal-700">
                          {v.volunteer_registration_no || "—"}
                        </span>
                      </td>

                      {/* PHONE */}
                      <td className="px-5 py-4 text-slate-600">
                        {v.phone || "—"}
                      </td>

                      {/* EMAIL */}
                      <td className="px-5 py-4 text-slate-500">
                        {v.email || "—"}
                      </td>

                      {/* SKILLS */}
                      <td className="max-w-xs px-5 py-4 text-slate-500">
                        <div
                          className="max-w-[220px] truncate"
                          title={v.skills || ""}
                        >
                          {v.skills || "—"}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            STATUS_STYLES[v.status] ||
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {STATUS_LABELS[v.status] || v.status || "Unknown"}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* VIEW */}
                          <button
                            onClick={() => handleView(v.id)}
                            title="View Details"
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Eye size={16} />
                          </button>

                          {/* APPROVE */}
                          {v.status === "pending_approval" && (
                            <button
                              onClick={() => handleApprove(v.id, v.name)}
                              title="Approve"
                              className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-50"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}

                          {/* REJECT */}
                          {v.status === "pending_approval" && (
                            <button
                              onClick={() => openRejectModal(v)}
                              title="Reject"
                              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                            >
                              <XCircle size={16} />
                            </button>
                          )}

                          {/* CREDENTIALS */}
                          {v.status === "active" && (
                            <button
                              onClick={() => openCredentialModal(v)}
                              title="Issue Credentials"
                              className="rounded-lg p-1.5 text-indigo-600 transition-colors hover:bg-indigo-50"
                            >
                              <KeyRound size={16} />
                            </button>
                          )}

                          {/* EDIT */}
                          <button
                            onClick={() => handleEdit(v)}
                            title="Edit"
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Pencil size={16} />
                          </button>

                          {/* DEACTIVATE */}
                          {v.status !== "inactive" && (
                            <button
                              onClick={() => handleDelete(v.id, v.name)}
                              title="Deactivate"
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
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

      {/* =====================================================
          VIEW VOLUNTEER MODAL
      ===================================================== */}

     {/* =====================================================
    VIEW VOLUNTEER MODAL — NGO DESIGN
===================================================== */}

{(viewLoading || viewModal) && (
  <div
    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
    onClick={() => {
      if (!viewLoading) setViewModal(null);
    }}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="volunteer-details-title"
      className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      {viewLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <RefreshCw size={18} className="mr-2 animate-spin" />
          Loading volunteer details…
        </div>
      ) : (
        <>
          <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 px-6 py-6 text-white sm:px-8">
            <button
              type="button"
              onClick={() => setViewModal(null)}
              aria-label="Close volunteer details"
              className="absolute right-4 top-4 rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 pr-10">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <Users size={26} />
              </div>

              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                  Volunteer profile
                </p>

                <h2
                  id="volunteer-details-title"
                  className="truncate text-xl font-semibold"
                >
                  {viewModal.name || "Volunteer"}
                </h2>

                <p className="mt-1 text-sm text-blue-100/80">
                  {viewModal.volunteer_registration_no ||
                    "Volunteer details"}
                </p>
              </div>
            </div>
          </div>

          {/* Modal body */}
          <div className="space-y-5 px-6 py-6 sm:px-8">
            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700">
                Volunteer
              </span>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  {
                    approved: "bg-green-100 text-green-700",
                    active: "bg-green-100 text-green-700",
                    pending: "bg-amber-100 text-amber-700",
                    pending_approval: "bg-amber-100 text-amber-700",
                    rejected: "bg-red-100 text-red-700",
                    inactive: "bg-slate-100 text-slate-600",
                  }[viewModal.status] || "bg-slate-100 text-slate-600"
                }`}
              >
                {STATUS_LABELS?.[viewModal.status] ||
                  viewModal.status?.replaceAll("_", " ") ||
                  "Unknown"}
              </span>
            </div>

            {/* Volunteer information */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Volunteer information
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Name", viewModal.name],
                  ["Phone number", viewModal.phone],
                  ["Email address", viewModal.email],
                  ["Aadhaar No.", viewModal.aadhaar_no],
                  [
                    "Registration No.",
                    viewModal.volunteer_registration_no,
                  ],
                  ["Registration Date", viewModal.registration_date],
                  ["Skills", viewModal.skills],
                  ["Address", viewModal.address],
                ]
                  .filter(
                    ([, value]) =>
                      value !== null &&
                      value !== undefined &&
                      String(value).trim() !== ""
                  )
                  .map(([label, value]) => (
                    <div
                      key={label}
                      className={`min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 ${
                        label === "Address" || label === "Skills"
                          ? "sm:col-span-2"
                          : ""
                      }`}
                    >
                      <p className="text-xs font-medium text-slate-400">
                        {label}
                      </p>

                      <p className="mt-1 break-words text-sm font-medium capitalize text-slate-800">
                        {value}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Volunteer ID card */}
            <section className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Image size={17} className="text-rose-600" />
               
              </h3>

              {viewModal.id_card ? (
                <a
                  href={getFileUrl(viewModal.id_card)}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md sm:flex-row"
                >
                  <img
                    src={getFileUrl(viewModal.id_card)}
                    alt={`${viewModal.name || "Volunteer"} ID card`}
                    className="h-48 w-full bg-slate-100 object-contain sm:h-36 sm:w-40"
                  />

                  <div className="flex flex-1 items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        ID card image
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Open the original image
                      </p>
                    </div>

                    <Eye
                      size={18}
                      className="shrink-0 text-rose-600 transition group-hover:scale-110"
                    />
                  </div>
                </a>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  No ID card has been uploaded.
                </p>
              )}
            </section>

            {/* Supporting documents */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <FileText size={17} className="text-rose-600" />
                Supporting documents

                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  {viewModal.supporting_documents?.length || 0}
                </span>
              </h3>

              {viewModal.supporting_documents?.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {viewModal.supporting_documents.map((doc, index) => (
                    <div
                      key={
                        doc.document_id ||
                        doc.document_path ||
                        index
                      }
                      className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5"
                    >
                      <span className="rounded-lg bg-rose-100 p-2 text-rose-600">
                        <FileText size={17} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {doc.document_name || "Supporting document"}
                        </p>

                        {doc.uploaded_at && (
                          <p className="mt-1 text-xs text-slate-400">
                            Uploaded: {doc.uploaded_at}
                          </p>
                        )}
                      </div>

                      <a
                        href={getFileUrl(doc.document_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-slate-200 transition hover:bg-rose-50"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                  No supporting documents have been uploaded.
                </p>
              )}
            </section>

            {/* Footer — same style as NGO modal */}
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setViewModal(null)}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  </div>
)}

      {/* =====================================================
          REJECT MODAL
      ===================================================== */}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Reject Volunteer
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Rejecting{" "}
                  <span className="font-medium text-slate-700">
                    {rejectModal.name}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setRejectModal(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              rows={4}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Rejection note (optional)"
              className="mt-5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={handleReject}
                disabled={rejectSubmitting}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rejectSubmitting ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CREDENTIAL MODAL
      ===================================================== */}

      {credModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Issue Login Credentials
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Volunteer:{" "}
                  <span className="font-medium text-slate-700">
                    {credModal.name}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setCredModal(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleIssueCredentials} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Email *
                </label>

                <input
                  type="email"
                  value={cred.email}
                  onChange={(e) =>
                    setCred((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="volunteer@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Password *
                </label>

                <input
                  type="password"
                  value={cred.password}
                  onChange={(e) =>
                    setCred((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <p className="text-xs text-slate-500">
                Credentials will be created using the volunteer credentials API.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCredModal(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={credSubmitting}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {credSubmitting ? "Issuing..." : "Issue Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * ---------------------------------------------------------
 * DETAIL COMPONENT
 * ---------------------------------------------------------
 */

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}



function getFileUrl(path) {
  if (!path) {
    return "#";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `http://192.168.0.8/AapdaSetu/backend/${path}`;
}

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 bytes";
  }

  const units = ["bytes", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const size = bytes / 1024 ** unitIndex;

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default Volunteers;
