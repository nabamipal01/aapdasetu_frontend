import React, { useState, useEffect, useCallback } from "react";
import {
  listAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
  approveAgency,
  rejectAgency,
  generateAgencyCredentials,
} from "../../services";
import { Building, Plus, X, RefreshCw, Trash2, CheckCircle2, XCircle, KeyRound, ChevronDown, Pencil, Check } from "lucide-react";

const STATUS_STYLES = {
  pending_approval: "bg-yellow-100 text-yellow-700",
  active:           "bg-green-100 text-green-700",
  inactive:         "bg-slate-100 text-slate-500",
};

const EMPTY_FORM = {
  name: "", type: "ngo", contact_person: "", phone: "", email: "", address: "",
};

const EMPTY_CRED = { email: "", password: "" };

const hasAgencyCredentials = (agency) => {
  const storedCredential = localStorage.getItem(`agency-credentials-${agency.id}`);
  return Boolean(
    agency.user_id ||
    agency.userId ||
    agency.credentials_issued ||
    storedCredential
  );
};

function Ngo() {
  const [agencies, setAgencies]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState("");

  // Inline edit state
  const [editId, setEditId]           = useState(null);
  const [editData, setEditData]       = useState({});

  // Credential modal
  const [credModal, setCredModal]     = useState(null); // { id, name, email }
  const [cred, setCred]               = useState(EMPTY_CRED);
  const [credSubmitting, setCredSubmitting] = useState(false);

  // Reject modal
  const [rejectModal, setRejectModal] = useState(null); // { id, name }
  const [rejectNote, setRejectNote]   = useState("");

  const fetchAgencies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page: 1, per_page: 50 };
      if (filterStatus) params.status = filterStatus;
      const res = await listAgencies(params);
      setAgencies(res?.data?.agencies ?? res?.data ?? []);
    } catch (err) {
      setError(err.message || "Failed to load agencies");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchAgencies(); }, [fetchAgencies]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => { setForm(EMPTY_FORM); setShowForm(false); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact_person.trim() || !form.phone.trim()) {
      setError("Name, Contact Person and Phone are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        name:           form.name.trim(),
        type:           form.type,
        contact_person: form.contact_person.trim(),
        phone:          form.phone.trim(),
        ...(form.email   && { email:   form.email.trim() }),
        ...(form.address && { address: form.address.trim() }),
      };
      const res = await createAgency(payload);
      setAgencies((prev) => [res.data, ...prev]);
      setSuccess(`Agency "${res.data.name}" submitted. Pending Super Admin approval.`);
      resetForm();
    } catch (err) {
      setError(err.message || "Failed to create agency");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Approve ──────────────────────────────────────────────────────────────────
  const handleApprove = async (id, name) => {
    if (!window.confirm(`Approve agency "${name}"?`)) return;
    try {
      const res = await approveAgency(id);
      setAgencies((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: res.data?.status ?? "active" } : a))
      );
      setSuccess(`"${name}" approved successfully.`);
    } catch (err) {
      setError(err.message || "Failed to approve agency");
    }
  };

  // ── Reject modal ─────────────────────────────────────────────────────────────
  const openRejectModal = (a) => {
    setRejectModal({ id: a.id, name: a.name });
    setRejectNote("");
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      const res = await rejectAgency(rejectModal.id, rejectNote.trim());
      setAgencies((prev) =>
        prev.map((a) => (a.id === rejectModal.id ? { ...a, status: res.data?.status ?? "inactive" } : a))
      );
      setSuccess(`"${rejectModal.name}" rejected.`);
      setRejectModal(null);
    } catch (err) {
      setError(err.message || "Failed to reject agency");
    }
  };

  // ── Inline edit ───────────────────────────────────────────────────────────────
  const startEdit = (a) => {
    setEditId(a.id);
    setEditData({
      name:           a.name,
      contact_person: a.contact_person || "",
      phone:          a.phone || "",
      email:          a.email || "",
      address:        a.address || "",
    });
  };

  const handleUpdate = async (id) => {
    if (!editData.name?.trim()) return;
    try {
      const res = await updateAgency(id, editData);
      setAgencies((prev) => prev.map((a) => (a.id === id ? { ...a, ...res.data } : a)));
      setEditId(null);
      setSuccess("Agency updated.");
    } catch (err) {
      setError(err.message || "Failed to update agency");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate agency "${name}"?`)) return;
    try {
      await deleteAgency(id);
      setAgencies((prev) => prev.filter((a) => a.id !== id));
      setSuccess(`"${name}" deactivated.`);
    } catch (err) {
      setError(err.message || "Failed to delete agency");
    }
  };

  // ── Credentials modal ─────────────────────────────────────────────────────────
  const openCredModal = (a) => {
    let storedCredential = null;
    try {
      const storedValue = localStorage.getItem(`agency-credentials-${a.id}`);
      storedCredential = storedValue === "issued"
        ? { issued: true }
        : JSON.parse(storedValue);
    } catch {
      storedCredential = null;
    }
    setCredModal({
      id: a.id,
      name: a.name,
      alreadyIssued: Boolean(a.user_id || a.userId || a.credentials_issued || storedCredential),
      assignedEmail: storedCredential?.email || a.email || "",
    });
    setCred({ email: storedCredential?.email || a.email || "", password: "" });
  };

  const handleIssueCredentials = async (e) => {
    e.preventDefault();
    if (!cred.email.trim() || !cred.password) {
      setError("Email and password are required.");
      return;
    }
    setCredSubmitting(true);
    setError("");
    try {
      await generateAgencyCredentials(credModal.id, {
        email:    cred.email.trim(),
        password: cred.password,
      });
      localStorage.setItem(`agency-credentials-${credModal.id}`, JSON.stringify({
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

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Building className="text-rose-600" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">NGO / Agencies</h1>
              <p className="text-sm text-slate-500">Manage partner agencies and NGO registrations</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Status filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none focus:border-rose-400">
                <option value="">All Status</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <button onClick={fetchAgencies}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <RefreshCw size={15} /> Refresh
            </button>
            <button onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">
              {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add Agency</>}
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
              <h2 className="mb-5 text-lg font-semibold text-slate-900">Register New Agency</h2>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Agency Name *</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Hope Foundation"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Type *</label>
                    <select name="type" value={form.type} onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100">
                      <option value="ngo">NGO</option>
                      <option value="government">Government</option>
                      <option value="private">Private</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Contact Person *</label>
                    <input name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Phone *</label>
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. +919876543210"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="e.g. contact@hopefoundation.org"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Address</label>
                    <input name="address" value={form.address} onChange={handleChange} placeholder="e.g. 12 Park Street, Kolkata"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={resetForm}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? "Registering…" : "Register Agency"}
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
              Agencies {!loading && <span className="ml-1 text-sm font-normal text-slate-500">({agencies.length})</span>}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">Loading agencies…</div>
          ) : agencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Building size={40} className="mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">No agencies found</p>
              <p className="mt-1 text-sm text-slate-500">Register an agency or change the status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Contact Person</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agencies.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      {/* Name — editable */}
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {editId === a.id
                          ? <input value={editData.name}
                              onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                              className="rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-rose-400 w-36" />
                          : a.name}
                      </td>
                      <td className="px-5 py-3 capitalize text-slate-600">{a.type}</td>
                      {/* Contact person — editable */}
                      <td className="px-5 py-3 text-slate-600">
                        {editId === a.id
                          ? <input value={editData.contact_person}
                              onChange={(e) => setEditData((p) => ({ ...p, contact_person: e.target.value }))}
                              className="rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-rose-400 w-32" />
                          : (a.contact_person || "—")}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{a.phone}</td>
                      <td className="px-5 py-3 text-slate-500">{a.email || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {a.status?.replace("_", " ") || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {editId === a.id ? (
                            <>
                              <button onClick={() => handleUpdate(a.id)}
                                className="rounded p-1.5 text-green-600 hover:bg-green-50 transition-colors"><Check size={14} /></button>
                              <button onClick={() => setEditId(null)}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"><X size={14} /></button>
                            </>
                          ) : (
                            <>
                              {a.status === "pending_approval" && (
                                <>
                                  <button onClick={() => handleApprove(a.id, a.name)}
                                    title="Approve"
                                    className="rounded p-1.5 text-green-600 hover:bg-green-50 transition-colors">
                                    <CheckCircle2 size={15} />
                                  </button>
                                  <button onClick={() => openRejectModal(a)}
                                    title="Reject"
                                    className="rounded p-1.5 text-red-500 hover:bg-red-50 transition-colors">
                                    <XCircle size={15} />
                                  </button>
                                </>
                              )}
                              {(a.status === "active" || a.status === "inactive") && (
                                <button onClick={() => a.status === "active" && !hasAgencyCredentials(a) && openCredModal(a)}
                                  title={a.status === "inactive" ? "Credentials disabled for inactive agency" : hasAgencyCredentials(a) ? "Credentials already issued" : "Issue Credentials"}
                                  disabled={a.status === "inactive" || hasAgencyCredentials(a)}
                                  className={`rounded p-1.5 transition-colors ${a.status === "inactive" || hasAgencyCredentials(a) ? "cursor-not-allowed text-slate-300" : "text-indigo-600 hover:bg-indigo-50"}`}>
                                  <KeyRound size={15} />
                                </button>
                              )}
                              <button onClick={() => startEdit(a)}
                                title="Edit"
                                className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleDelete(a.id, a.name)}
                                title="Deactivate"
                                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
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

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Reject Agency</h3>
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
            <p className="mt-1 text-sm text-slate-500">For agency: <span className="font-medium text-slate-700">{credModal.name}</span></p>
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
                  placeholder="contact@agency.org"
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

export default Ngo;
