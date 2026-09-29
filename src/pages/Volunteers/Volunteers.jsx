import React, { useState, useEffect, useCallback } from "react";
import {
  listVolunteers,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  approveVolunteer,
  rejectVolunteer,
  generateVolunteerCredentials,
} from "../../services";
import { Users, Plus, X, RefreshCw, Trash2, Pencil, CheckCircle2, XCircle, KeyRound, ChevronDown } from "lucide-react";

const STATUS_STYLES = {
  pending_approval: "bg-yellow-100 text-yellow-700",
  active:           "bg-green-100 text-green-700",
  deployed:         "bg-blue-100 text-blue-700",
  inactive:         "bg-slate-100 text-slate-500",
};

const EMPTY_FORM = {
  name: "", phone: "", email: "", aadhaar_no: "", skills: "", address: "",
};

const EMPTY_CRED = { email: "", password: "" };

const hasVolunteerCredentials = (volunteer) => {
  const storedCredential = localStorage.getItem(`volunteer-credentials-${volunteer.id}`);
  return Boolean(
    volunteer.user_id ||
    volunteer.userId ||
    volunteer.credentials_issued ||
    storedCredential
  );
};

function Volunteers() {
  const [volunteers, setVolunteers]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [editingVolunteerId, setEditingVolunteerId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");

  // Credential modal state
  const [credModal, setCredModal]     = useState(null); // { id, name, email }
  const [cred, setCred]               = useState(EMPTY_CRED);
  const [credSubmitting, setCredSubmitting] = useState(false);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState(null); // { id, name }
  const [rejectNote, setRejectNote]   = useState("");

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page: 1, per_page: 50 };
      if (filterStatus) params.status = filterStatus;
      const res = await listVolunteers(params);
      setVolunteers(res?.data?.volunteers ?? res?.data ?? []);
    } catch (err) {
      setError(err.message || "Failed to load volunteers");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchVolunteers(); }, [fetchVolunteers]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingVolunteerId(null);
    setShowForm(false);
  };

  const handleEdit = (volunteer) => {
    setForm({
      name: volunteer.name || "",
      phone: volunteer.phone || "",
      email: volunteer.email || "",
      aadhaar_no: volunteer.aadhaar_no || "",
      skills: volunteer.skills || "",
      address: volunteer.address || "",
    });
    setEditingVolunteerId(volunteer.id);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and Phone are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        name:  form.name.trim(),
        phone: form.phone.trim(),
        ...(form.email      && { email:      form.email.trim() }),
        ...(form.aadhaar_no && { aadhaar_no: form.aadhaar_no.trim() }),
        ...(form.skills     && { skills:     form.skills.trim() }),
        ...(form.address    && { address:    form.address.trim() }),
      };
      if (editingVolunteerId) {
        const res = await updateVolunteer(editingVolunteerId, payload);
        setVolunteers((prev) => prev.map((volunteer) =>
          volunteer.id === editingVolunteerId ? { ...volunteer, ...res.data } : volunteer
        ));
        setSuccess(`Volunteer "${res.data?.name || form.name}" updated successfully.`);
      } else {
        const res = await createVolunteer(payload);
        setVolunteers((prev) => [res.data, ...prev]);
        setSuccess(`Volunteer "${res.data.name}" submitted. Pending approval.`);
      }
      resetForm();
    } catch (err) {
      setError(err.message || `Failed to ${editingVolunteerId ? "update" : "create"} volunteer`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id, name) => {
    if (!window.confirm(`Approve volunteer "${name}"?`)) return;
    try {
      const res = await approveVolunteer(id);
      setVolunteers((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: res.data?.status ?? "active" } : v))
      );
      setSuccess(`"${name}" approved successfully.`);
    } catch (err) {
      setError(err.message || "Failed to approve volunteer");
    }
  };

  const openRejectModal = (v) => {
    setRejectModal({ id: v.id, name: v.name });
    setRejectNote("");
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      const res = await rejectVolunteer(rejectModal.id, rejectNote.trim());
      setVolunteers((prev) =>
        prev.map((v) => (v.id === rejectModal.id ? { ...v, status: res.data?.status ?? "inactive" } : v))
      );
      setSuccess(`"${rejectModal.name}" rejected.`);
      setRejectModal(null);
    } catch (err) {
      setError(err.message || "Failed to reject volunteer");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate volunteer "${name}"?`)) return;
    try {
      await deleteVolunteer(id);
      setVolunteers((prev) => prev.filter((v) => v.id !== id));
      setSuccess(`"${name}" deactivated.`);
    } catch (err) {
      setError(err.message || "Failed to delete volunteer");
    }
  };

  const openCredModal = (v) => {
    let storedCredential = null;
    try {
      const storedValue = localStorage.getItem(`volunteer-credentials-${v.id}`);
      storedCredential = storedValue === "issued"
        ? { issued: true }
        : JSON.parse(storedValue);
    } catch {
      storedCredential = null;
    }
    setCredModal({
      id: v.id,
      name: v.name,
      alreadyIssued: Boolean(v.user_id || v.userId || v.credentials_issued || storedCredential),
      assignedEmail: storedCredential?.email || v.email || "",
    });
    setCred({ email: storedCredential?.email || v.email || "", password: "" });
  };

  const handleIssueCredentials = async (e) => {
    e.preventDefault();
    if (!cred.email.trim() || !cred.password) {
      setError("Email and password are required for credentials.");
      return;
    }
    setCredSubmitting(true);
    setError("");
    try {
      await generateVolunteerCredentials(credModal.id, {
        email:    cred.email.trim(),
        password: cred.password,
      });
      localStorage.setItem(`volunteer-credentials-${credModal.id}`, JSON.stringify({
        email: cred.email.trim(),
        issued: true,
      }));
      setSuccess(`Login credentials issued to "${credModal.name}".`);
      setCredModal(null);
    } catch (err) {
      setError(err.message || "Failed to issue credentials");
    } finally {
      setCredSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Users className="text-teal-600" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Volunteers</h1>
              <p className="text-sm text-slate-500">Manage volunteer registrations and approvals</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Status filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none focus:border-teal-400">
                <option value="">All Status</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="active">Active</option>
                <option value="deployed">Deployed</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <button onClick={fetchVolunteers}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <RefreshCw size={15} /> Refresh
            </button>
            <button onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
              {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add Volunteer</>}
            </button>
          </div>
        </div>

        {/* Feedback */}
        {success && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
        {error   && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Create Form */}
        <div className={`grid transition-all duration-300 ease-in-out ${showForm ? "mb-6 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}>
          <div className="overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-semibold text-slate-900">{editingVolunteerId ? "Edit Volunteer" : "Register New Volunteer"}</h2>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Full Name *</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Rohit Sharma"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Phone *</label>
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. +919876543210"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="e.g. rohit@example.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Aadhaar No.</label>
                    <input name="aadhaar_no" value={form.aadhaar_no} onChange={handleChange} placeholder="12-digit Aadhaar number"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Skills</label>
                    <input name="skills" value={form.skills} onChange={handleChange} placeholder="e.g. First Aid, Swimming, Driving"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Address</label>
                    <input name="address" value={form.address} onChange={handleChange} placeholder="e.g. 144 Salt Lake, Kolkata"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={resetForm}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? (editingVolunteerId ? "Updating…" : "Registering…") : (editingVolunteerId ? "Update Volunteer" : "Register Volunteer")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              Volunteers {!loading && <span className="ml-1 text-sm font-normal text-slate-500">({volunteers.length})</span>}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">Loading volunteers…</div>
          ) : volunteers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users size={40} className="mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">No volunteers found</p>
              <p className="mt-1 text-sm text-slate-500">Register a volunteer or change the status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Skills</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {volunteers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{v.name}</td>
                      <td className="px-5 py-3 text-slate-600">{v.phone}</td>
                      <td className="px-5 py-3 text-slate-500">{v.email || "—"}</td>
                      <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{v.skills || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[v.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {v.status?.replace("_", " ") || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {v.status === "pending_approval" && (
                            <>
                              <button onClick={() => handleApprove(v.id, v.name)}
                                title="Approve"
                                className="rounded p-1.5 text-green-600 hover:bg-green-50 transition-colors">
                                <CheckCircle2 size={15} />
                              </button>
                              <button onClick={() => openRejectModal(v)}
                                title="Reject"
                                className="rounded p-1.5 text-red-500 hover:bg-red-50 transition-colors">
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                          {(v.status === "active" || v.status === "inactive") && (
                            <button onClick={() => v.status === "active" && !hasVolunteerCredentials(v) && openCredModal(v)}
                              title={v.status === "inactive" ? "Credentials disabled for inactive volunteer" : hasVolunteerCredentials(v) ? "Credentials already issued" : "Issue Credentials"}
                              disabled={v.status === "inactive" || hasVolunteerCredentials(v)}
                              className={`rounded p-1.5 transition-colors ${v.status === "inactive" || hasVolunteerCredentials(v) ? "cursor-not-allowed text-slate-300" : "text-indigo-600 hover:bg-indigo-50"}`}>
                              <KeyRound size={15} />
                            </button>
                          )}
                          <button onClick={() => handleEdit(v)}
                            title="Edit"
                            className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(v.id, v.name)}
                            title="Deactivate"
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                            <Trash2 size={15} />
                          </button>
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

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Reject Volunteer</h3>
            <p className="mt-1 text-sm text-slate-500">Rejecting: <span className="font-medium text-slate-700">{rejectModal.name}</span></p>
            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Rejection note (optional)"
              className="mt-4 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setRejectModal(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleReject}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Credentials Modal ── */}
      {credModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Issue Login Credentials</h3>
            <p className="mt-1 text-sm text-slate-500">For volunteer: <span className="font-medium text-slate-700">{credModal.name}</span></p>
            {credModal.alreadyIssued ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Assigned Email</label>
                  <input type="email" value={credModal.assignedEmail} readOnly disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Password</label>
                  <input type="text" value="******** (already assigned)" readOnly disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500" />
                </div>
                <p className="text-xs text-slate-500">The password is hidden for security.</p>
                <div className="flex justify-end pt-1">
                  <button type="button" onClick={() => setCredModal(null)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleIssueCredentials} className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Assigned Email *</label>
                <input
                  type="email" value={cred.email} readOnly={credModal.alreadyIssued}
                  onChange={(e) => setCred((p) => ({ ...p, email: e.target.value }))}
                  placeholder="volunteer@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Password * (8 chars min)</label>
                <input
                  type="password" value={cred.password}
                  onChange={(e) => setCred((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Set a secure password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setCredModal(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={credSubmitting}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed">
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

export default Volunteers;
