
import React, { useState, useEffect, useCallback } from "react";
import { listDistricts } from "../../services/districtService";
import {
  listAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
  approveAgency,
  rejectAgency,
  generateAgencyCredentials,
  getAgency,
} from "../../services";

import {
  Building,
  Plus,
  X,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  KeyRound,
  ChevronDown,
  Pencil,
  Check,
  FileSpreadsheet,
  FileText,
  FileType,
  Eye,
  Search,
} from "lucide-react";

import * as XLSX from "xlsx";
import {
  downloadStyledPdf,
  downloadStyledXlsx,
} from "../../utils/tableExport";

const STATUS_STYLES = {
  pending_approval: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-500",
};

const EMPTY_FORM = {
  name: "",
  type: "ngo",
  contact_person: "",
  phone: "",
  email: "",
  emergency_no: "",
  address: "",
  district_id: "",
};

const EMPTY_CRED = {
  email: "",
  password: "",
};

const hasAgencyCredentials = (agency) => {
  const storedCredential = localStorage.getItem(
    `agency-credentials-${agency.id}`
  );

  return Boolean(
    agency.user_id ||
      agency.userId ||
      agency.credentials_issued ||
      storedCredential
  );
};

function Ngo() {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [credModal, setCredModal] = useState(null);
  const [cred, setCred] = useState(EMPTY_CRED);
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [viewAgency, setViewAgency] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [districts, setDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);


  const fetchAgencies = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const res = await listAgencies();

    const list =
      res?.data?.agencies ??
      res?.data?.items ??
      res?.data?.data?.agencies ??
      res?.data?.data?.items ??
      res?.data?.data ??
      res?.data ??
      [];

    if (!Array.isArray(list)) {
      throw new Error("Invalid agencies response from server.");
    }

    setAgencies(list);
  } catch (err) {
    setError(err.message || "Failed to load agencies.");
  } finally {
    setLoading(false);
  }
}, []);

const fetchDistricts = useCallback(async () => {
  if (districts.length > 0) return;

  setDistrictsLoading(true);

  try {
    const res = await listDistricts({ page: 1, per_page: 100 });

    const list =
      res?.data?.districts ??
      res?.data?.items ??
      res?.data?.data?.districts ??
      res?.data?.data?.items ??
      res?.data?.data ??
      res?.data ??
      [];

    setDistricts(Array.isArray(list) ? list : []);
  } catch (err) {
    setError(err.message || "Failed to load districts.");
  } finally {
    setDistrictsLoading(false);
  }
}, [districts.length]);

const getDistrictName = (agency) => {
  if (agency.district?.name) return agency.district.name;
  if (agency.district?.district_name) return agency.district.district_name;
  if (agency.district_name) return agency.district_name;
  if (typeof agency.district === "string") return agency.district;

  const district = districts.find(
    (d) =>
      String(d.id) ===
      String(agency.district_id ?? agency.district?.id)
  );

  return district?.name || district?.district_name || "—";
};

 useEffect(() => {
  fetchAgencies();
}, [fetchAgencies]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredAgencies = agencies.filter((agency) =>
    [
      agency.name,
      agency.type,
      agency.contact_person,
      agency.phone,
      agency.email,
      agency.emergency_no,
      agency.address,
      agency.status,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedSearch)
      )
  );

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.contact_person.trim() ||
      !form.phone.trim()
    ) {
      setError(
        "Name, Contact Person and Phone are required."
      );
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        contact_person: form.contact_person.trim(),
        phone: form.phone.trim(),

        ...(form.email.trim() && {
          email: form.email.trim(),
        }),

        ...(form.emergency_no.trim() && {
          emergency_no: form.emergency_no.trim(),
        }),

        ...(form.address.trim() && {
          address: form.address.trim(),
        }),
        ...(form.district_id && {
          district_id: Number(form.district_id),
        }),
      };

      const res = await createAgency(payload);
      const createdAgency =
        res?.data?.agency ?? res?.data?.data ?? res?.data;

      if (!createdAgency || typeof createdAgency !== "object") {
        throw new Error("Agency was created but its details were not returned.");
      }

      setAgencies((prev) => [createdAgency, ...prev]);

      setSuccess(
        `Agency "${createdAgency.name}" submitted. Pending Super Admin approval.`
      );

      resetForm();
    } catch (err) {
      setError(err.message || "Failed to create agency");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id, name) => {
    if (!window.confirm(`Approve agency "${name}"?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const res = await approveAgency(id);

      setAgencies((prev) =>
        prev.map((agency) =>
          agency.id === id
            ? {
                ...agency,
                status: res.data?.status ?? "active",
              }
            : agency
        )
      );

      setSuccess(`"${name}" approved successfully.`);
    } catch (err) {
      setError(err.message || "Failed to approve agency");
    }
  };

  const openRejectModal = (agency) => {
    setRejectModal({
      id: agency.id,
      name: agency.name,
    });
    setRejectNote("");
    setError("");
  };

  const handleReject = async () => {
    if (!rejectModal) return;

    setError("");
    setSuccess("");

    try {
      const res = await rejectAgency(
        rejectModal.id,
        rejectNote.trim()
      );

      setAgencies((prev) =>
        prev.map((agency) =>
          agency.id === rejectModal.id
            ? {
                ...agency,
                status: res.data?.status ?? "inactive",
              }
            : agency
        )
      );

      setSuccess(`"${rejectModal.name}" rejected.`);
      setRejectModal(null);
    } catch (err) {
      setError(err.message || "Failed to reject agency");
    }
  };

  const startEdit = (agency) => {
    setEditId(agency.id);

    setEditData({
      name: agency.name || "",
      contact_person: agency.contact_person || "",
      district_id: agency.district_id
  ? String(agency.district_id)
  : agency.district?.id
    ? String(agency.district.id)
    : "",
      phone: agency.phone || "",
      email: agency.email || "",
      emergency_no: agency.emergency_no || "",
      address: agency.address || "",
    });
  };

  const handleUpdate = async (id) => {
    if (!editData.name?.trim()) {
      setError("Agency name is required.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const payload = {
        ...editData,
        name: editData.name.trim(),
        contact_person: editData.contact_person?.trim() || "",
        phone: editData.phone?.trim() || "",
        email: editData.email?.trim() || "",
        emergency_no: editData.emergency_no?.trim() || "",
        address: editData.address?.trim() || "",
        ...(editData.district_id && {
        district_id: Number(editData.district_id),
}),
      };

      const res = await updateAgency(id, payload);
      const updatedAgency =
        res?.data?.agency ?? res?.data?.data ?? res?.data;

      setAgencies((prev) =>
        prev.map((agency) =>
          agency.id === id
            ? { ...agency, ...(updatedAgency || payload) }
            : agency
        )
      );

      setEditId(null);
      setEditData({});
      setSuccess("Agency updated.");
    } catch (err) {
      setError(err.message || "Failed to update agency");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate agency "${name}"?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await deleteAgency(id);

      setAgencies((prev) =>
        prev.filter((agency) => agency.id !== id)
      );

      setSuccess(`"${name}" deactivated.`);
    } catch (err) {
      setError(err.message || "Failed to delete agency");
    }
  };

  const handleView = async (id) => {
    fetchDistricts();
    setViewLoading(true);
    setViewAgency({
  ...(listAgency || {}),
  ...agency,
  address:
    agency.address ||
    agency.full_address ||
    agency.office_address ||
    agency.registered_address ||
    agency.location ||
    agency.contact_address ||
    listAgency?.address ||
    listAgency?.full_address ||
    listAgency?.office_address ||
    listAgency?.registered_address ||
    listAgency?.location ||
    listAgency?.contact_address ||
    "",
});
    setError("");

    try {
      const res = await getAgency(id);

      const agency =
        res?.data?.agency ??
        res?.data?.data?.agency ??
        res?.data?.data ??
        res?.data;

      if (!agency || typeof agency !== "object") {
        throw new Error("Agency details not found.");
      }

      const listAgency = agencies.find(
        (item) => String(item.id) === String(id)
      );

      setViewAgency({
        ...(listAgency || {}),
        ...agency,
      });
    } catch (err) {
      setError(
        err.message || "Failed to load agency details."
      );
    } finally {
      setViewLoading(false);
    }
  };

  const openCredModal = (agency) => {
    let storedCredential = null;

    try {
      const storedValue = localStorage.getItem(
        `agency-credentials-${agency.id}`
      );

      storedCredential =
        storedValue === "issued"
          ? { issued: true }
          : JSON.parse(storedValue);
    } catch {
      storedCredential = null;
    }

    setCredModal({
      id: agency.id,
      name: agency.name,
      alreadyIssued: Boolean(
        agency.user_id ||
          agency.userId ||
          agency.credentials_issued ||
          storedCredential
      ),
      assignedEmail:
        storedCredential?.email || agency.email || "",
    });

    setCred({
      email: storedCredential?.email || agency.email || "",
      password: "",
    });

    setError("");
  };

  const handleIssueCredentials = async (e) => {
    e.preventDefault();

    if (!cred.email.trim() || !cred.password) {
      setError("Email and password are required.");
      return;
    }

    setCredSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await generateAgencyCredentials(credModal.id, {
        email: cred.email.trim(),
        password: cred.password,
      });

      localStorage.setItem(
        `agency-credentials-${credModal.id}`,
        JSON.stringify({
          email: cred.email.trim(),
          issued: true,
        })
      );

      setSuccess(
        `Login credentials issued to "${credModal.name}".`
      );

      setCredModal(null);
    } catch (err) {
      setError(
        err.message || "Failed to issue credentials"
      );
    } finally {
      setCredSubmitting(false);
    }
  };

  // Export data for XLSX, CSV and PDF.
  const getAgencyExportData = () => {
    return filteredAgencies.map((agency, index) => ({
      "S.No.": index + 1,
      "Agency Name": agency.name || "",
      Type: agency.type || "",
      "Contact Person": agency.contact_person || "",
      Phone: agency.phone || "",
      "Emergency No.": agency.emergency_no || "",
      Email: agency.email || "",
      Address: agency.address || "",
      Status: agency.status
        ? agency.status.replace(/_/g, " ")
        : "",
    }));
  };

  const handleDownloadXLSX = () => {
    if (!filteredAgencies.length) {
      setError("There are no agencies to export.");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];

      downloadStyledXlsx({
        records: getAgencyExportData(),
        title: "NGO / Agency List",
        filename: `agencies_${today}.xlsx`,
        sheetName: "Agencies",
      });

      setSuccess("Agency data exported as XLSX successfully.");
      setShowDownloadMenu(false);
    } catch (err) {
      console.error(err);
      setError("Failed to export XLSX file.");
    }
  };

  const handleDownloadCSV = () => {
    if (!filteredAgencies.length) {
      setError("There are no agencies to export.");
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(
        getAgencyExportData()
      );

      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `agencies_${new Date()
        .toISOString()
        .split("T")[0]}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess("Agency data exported as CSV successfully.");
      setShowDownloadMenu(false);
    } catch (err) {
      console.error(err);
      setError("Failed to export CSV file.");
    }
  };

  const handleDownloadPDF = () => {
    if (!filteredAgencies.length) {
      setError("There are no agencies to export.");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];

      downloadStyledPdf({
        records: getAgencyExportData(),
        title: "NGO / Agency List",
        filename: `agencies_${today}.pdf`,
      });

      setSuccess("Agency data exported as PDF successfully.");
      setShowDownloadMenu(false);
    } catch (err) {
      console.error(err);
      setError("Failed to export PDF file.");
    }
  };

  const updateInlineField = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Building className="text-rose-600" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                NGO / Organisation 
              </h1>
              <p className="text-sm text-slate-500">
                Manage partner agencies and NGO registrations
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none focus:border-rose-400"
              >
                <option value="">All Status</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={fetchAgencies}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                      setShowForm((prev) => {
                        const next = !prev;
                        if (next) fetchDistricts();
                        return next;
                      });

                      setError("");
                      setSuccess("");
                    }}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
            >
              {showForm ? (
                <>
                  <X size={15} />
                  Cancel
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Add Agency
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback */}
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
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            showForm
              ? "mb-6 grid-rows-[1fr] opacity-100"
              : "pointer-events-none grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-semibold text-slate-900">
                Register New Agency
              </h2>

              <form onSubmit={handleCreate}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Agency Name *
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Hope Foundation"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Type *
                    </label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    >
                      <option value="ngo">NGO</option>
                      <option value="government">Government</option>
                      <option value="private">Private</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Contact Person *
                    </label>
                    <input
                      name="contact_person"
                      value={form.contact_person}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Phone *
                    </label>
                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      required
                      placeholder="e.g. +919876543210"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="e.g. contact@hopefoundation.org"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Emergency No.
                    </label>
                    <input
                      name="emergency_no"
                      type="tel"
                      value={form.emergency_no}
                      onChange={handleChange}
                      placeholder="e.g. +919876543210"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Address
                    </label>
                    <input
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="e.g. 12 Park Street, Kolkata"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                </div>

                <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      District
                    </label>

                    <div className="relative">
                      <select
                        name="district_id"
                        value={form.district_id}
                        onChange={handleChange}
                        onFocus={fetchDistricts}
                        disabled={districtsLoading}
                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 disabled:opacity-60"
                      >
                        <option value="">
                          {districtsLoading ? "Loading districts..." : "Select district"}
                        </option>

                        {districts.map((district) => (
                          <option key={district.id} value={district.id}>
                            {district.name ||
                              district.district_name ||
                              `District #${district.id}`}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
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
                    className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Registering…" : "Register Agency"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Agencies table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold text-slate-900">
                Agencies{" "}
                {!loading && (
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    ({filteredAgencies.length}
                    {searchTerm ? ` of ${agencies.length}` : ""})
                  </span>
                )}
              </h2>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, contact, phone, email..."
                    aria-label="Search agencies"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Download menu */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setShowDownloadMenu((prev) => !prev)
                    }
                    disabled={loading || filteredAgencies.length === 0}
                    className="flex items-center justify-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={15} />
                    Download
                    <ChevronDown size={14} />
                  </button>

                  {showDownloadMenu && (
                    <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      <button
                        type="button"
                        onClick={handleDownloadXLSX}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <FileSpreadsheet size={16} className="text-green-600" />
                        Download XLSX
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadCSV}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <FileType size={16} className="text-blue-600" />
                        Download CSV
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <FileText size={16} className="text-red-600" />
                        Download PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">
              Loading agencies…
            </div>
          ) : filteredAgencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Building size={40} className="mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">
                {agencies.length === 0
                  ? "No agencies found"
                  : "No matching agencies"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {agencies.length === 0
                  ? "Register an NGO or change the status filter."
                  : "Try a different search term or change the status filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    {/* <th className="px-5 py-3 font-semibold">Type</th> */}
                    <th className="px-5 py-3 font-semibold">District</th>
                    <th className="px-5 py-3 font-semibold">Contact Person</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Emergency No.</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredAgencies.map((agency) => (
                    <tr
                      key={agency.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {editId === agency.id ? (
                          <input
                            value={editData.name || ""}
                            onChange={(e) =>
                              updateInlineField("name", e.target.value)
                            }
                            className="w-36 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-rose-400"
                          />
                        ) : (
                          agency.name
                        )}
                      </td>

                      {/* <td className="px-5 py-3 capitalize text-slate-600">
                        {agency.type || "—"}
                      </td> */}
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {getDistrictName(agency)}
                      </td>

                      <td className="px-5 py-3 text-slate-600">
                        {editId === agency.id ? (
                          <input
                            value={editData.contact_person || ""}
                            onChange={(e) =>
                              updateInlineField("contact_person", e.target.value)
                            }
                            className="w-32 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-rose-400"
                          />
                        ) : (
                          agency.contact_person || "—"
                        )}
                      </td>

                      <td className="px-5 py-3 text-slate-500">
                        {editId === agency.id ? (
                          <input
                            type="tel"
                            value={editData.phone || ""}
                            onChange={(e) =>
                              updateInlineField("phone", e.target.value)
                            }
                            className="w-32 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-rose-400"
                          />
                        ) : (
                          agency.phone || "—"
                        )}
                      </td>

                      <td className="px-5 py-3 text-slate-500">
                        {editId === agency.id ? (
                          <input
                            type="email"
                            value={editData.email || ""}
                            onChange={(e) =>
                              updateInlineField("email", e.target.value)
                            }
                            className="w-40 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-rose-400"
                          />
                        ) : (
                          agency.email || "—"
                        )}
                      </td>

                      <td className="px-5 py-3 text-slate-500">
                        {editId === agency.id ? (
                          <input
                            type="tel"
                            value={editData.emergency_no || ""}
                            onChange={(e) =>
                              updateInlineField("emergency_no", e.target.value)
                            }
                            placeholder="Emergency No."
                            className="w-36 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-rose-400"
                          />
                        ) : (
                          agency.emergency_no || "—"
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            STATUS_STYLES[agency.status] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {agency.status?.replace(/_/g, " ") || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {editId === agency.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdate(agency.id)}
                                title="Save"
                                className="rounded p-1.5 text-green-600 transition-colors hover:bg-green-50"
                              >
                                <Check size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditId(null);
                                  setEditData({});
                                }}
                                title="Cancel edit"
                                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleView(agency.id)}
                                title="View Details"
                                aria-label={`View ${agency.name}`}
                                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Eye size={15} />
                              </button>

                              {agency.status === "pending_approval" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleApprove(agency.id, agency.name)
                                    }
                                    title="Approve"
                                    className="rounded p-1.5 text-green-600 transition-colors hover:bg-green-50"
                                  >
                                    <CheckCircle2 size={15} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openRejectModal(agency)}
                                    title="Reject"
                                    className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50"
                                  >
                                    <XCircle size={15} />
                                  </button>
                                </>
                              )}

                              {(agency.status === "active" ||
                                agency.status === "inactive") && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    agency.status === "active" &&
                                    !hasAgencyCredentials(agency) &&
                                    openCredModal(agency)
                                  }
                                  title={
                                    agency.status === "inactive"
                                      ? "Credentials disabled for inactive agency"
                                      : hasAgencyCredentials(agency)
                                      ? "Credentials already issued"
                                      : "Issue Credentials"
                                  }
                                  disabled={
                                    agency.status === "inactive" ||
                                    hasAgencyCredentials(agency)
                                  }
                                  className={`rounded p-1.5 transition-colors ${
                                    agency.status === "inactive" ||
                                    hasAgencyCredentials(agency)
                                      ? "cursor-not-allowed text-slate-300"
                                      : "text-indigo-600 hover:bg-indigo-50"
                                  }`}
                                >
                                  <KeyRound size={15} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => startEdit(agency)}
                                title="Edit"
                                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(agency.id, agency.name)
                                }
                                title="Deactivate"
                                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
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

      {/* Agency details modal */}
      {(viewLoading || viewAgency) && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!viewLoading) setViewAgency(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="agency-details-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {viewLoading ? (
              <div className="flex items-center justify-center py-20 text-sm text-slate-500">
                <RefreshCw size={18} className="mr-2 animate-spin" />
                Loading NGO details…
              </div>
            ) : (
              <>
                <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 px-6 py-6 text-white sm:px-8">
                  <button
                    type="button"
                    onClick={() => setViewAgency(null)}
                    aria-label="Close NGO details"
                    className="absolute right-4 top-4 rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X size={20} />
                  </button>

                  <div className="flex items-center gap-4 pr-10">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                      <Building size={26} />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                        NGO profile
                      </p>
                      <h2
                        id="agency-details-title"
                        className="truncate text-xl font-semibold"
                      >
                        {viewAgency.name || "Agency"}
                      </h2>
                      <p className="mt-1 text-sm capitalize text-blue-100/80">
                        {viewAgency.type || "NGO"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 px-6 py-6 sm:px-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold capitalize text-rose-700">
                      {viewAgency.type || "NGO"}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                        STATUS_STYLES[viewAgency.status] ||
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {viewAgency.status?.replace(/_/g, " ") || "Unknown"}
                    </span>
                  </div>

                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      NGO information
                    </h3>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        
                        [
                          "Contact person",
                          viewAgency.contact_person ||
                            viewAgency.contactPerson,
                        ],
                        [
                          "Phone number",
                          viewAgency.phone ||
                            viewAgency.phone_number ||
                            viewAgency.mobile,
                        ],
                        [
                          "Emergency No.",
                          viewAgency.emergency_no ||
                            viewAgency.emergency_number ||
                            viewAgency.emergency_contact_number ||
                            viewAgency.emergency_phone ||
                            viewAgency.emergency_contact_phone ||
                            viewAgency.emergency_contact,
                        ],
                        ["Email address", viewAgency.email],
                        ["District", getDistrictName(viewAgency)],
                       
                        [
                          "Registered",
                          viewAgency.created_at ||
                            viewAgency.createdAt ||
                            viewAgency.registered_at,
                        ],
                         [
  "Address",
  viewAgency.address ||
    viewAgency.full_address ||
    viewAgency.office_address ||
    viewAgency.registered_address ||
    viewAgency.location ||
    viewAgency.contact_address ||
    "Not provided",
],
                      
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className={`min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 ${
                            label === "Address" ? "sm:col-span-2" : ""
                          }`}
                        >
                          <p className="text-xs font-medium text-slate-400">
                            {label}
                          </p>
                          <p className="mt-1 break-words text-sm font-medium text-slate-800">
                            {label === "Registered" &&
                            value &&
                            !Number.isNaN(Date.parse(value))
                              ? new Date(value).toLocaleDateString()
                              : value || "Not provided"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setViewAgency(null)}
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

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              Reject NGO
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Rejecting:{" "}
              <span className="font-medium text-slate-700">
                {rejectModal.name}
              </span>
            </p>

            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Rejection note (optional)"
              className="mt-4 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReject}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials modal */}
      {credModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              Issue Login Credentials
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              For NGO:{" "}
              <span className="font-medium text-slate-700">
                {credModal.name}
              </span>
            </p>

            {credModal.alreadyIssued ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Assigned Email
                  </label>
                  <input
                    type="email"
                    value={credModal.assignedEmail}
                    readOnly
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                  <input
                    type="text"
                    value="******** (already assigned)"
                    readOnly
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>

                <p className="text-xs text-slate-500">
                  The password is hidden for security.
                </p>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setCredModal(null)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleIssueCredentials}
                className="mt-4 space-y-3"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Assigned Email *
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
                    required
                    placeholder="contact@agency.org"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Password * (8 chars min)
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
                    required
                    minLength={8}
                    placeholder="Set a secure password"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-1">
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
                    {credSubmitting ? "Issuing…" : "Issue Credentials"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Ngo;
