import React, { useState, useEffect, useCallback } from "react";
import {
  listEquipmentTypes,
  createEquipmentType,
  updateEquipmentType,
  deleteEquipmentType,
  listUsers,
} from "../../../services";
import { Wrench, Plus, X, RefreshCw, Trash2, Pencil, Check } from "lucide-react";

function Equipment() {
  const [types, setTypes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [editId, setEditId]         = useState(null);
  const [editName, setEditName]     = useState("");
  const [users, setUsers]           = useState([]);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listEquipmentTypes();
      // API returns data as plain array
      setTypes(Array.isArray(res?.data) ? res.data : (res?.data?.types ?? []));
    } catch (err) {
      setError(err.message || "Failed to load equipment types");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await listUsers({ page: 1, per_page: 200 });
      const data = res?.data;
      const list = Array.isArray(data) ? data : (data?.users ?? data?.data ?? data?.items ?? []);
      setUsers(list);
    } catch {
      // silently ignore — "Added By" will fall back to the raw ID
    }
  }, []);

  // Helper: resolve a user id to a display name
 // Helper: resolve a user id to a display name
const resolveUser = (userId) => {
  if (userId == null) return "—";

  // Known system roles
  const roleNames = {
    1: "SuperAdmin",
    2: "Admin",
  };

  if (roleNames[userId]) {
    return roleNames[userId];
  }

  // Try resolving other users from API
  const found = users.find(
    (u) => Number(u.id ?? u.user_id) === Number(userId)
  );

  return found
    ? (found.name ?? found.username ?? String(userId))
    : String(userId);
};
  useEffect(() => { fetchTypes(); fetchUsers(); }, [fetchTypes, fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setError("Equipment type name is required."); return; }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await createEquipmentType({ equipment_type: newName.trim() });
      setTypes((prev) => [...prev, res.data]);
      setSuccess(`Equipment type "${res.data.equipment_type}" created.`);
      setNewName("");
      setShowForm(false);
    } catch (err) {
      setError(err.message || "Failed to create equipment type");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (t) => {
    setEditId(t.equipment_id);
    setEditName(t.equipment_type);
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      const res = await updateEquipmentType(id, { equipment_type: editName.trim() });
      setTypes((prev) =>
        prev.map((t) => (t.equipment_id === id ? { ...t, equipment_type: res.data.equipment_type } : t))
      );
      setSuccess("Equipment type updated.");
      setEditId(null);
    } catch (err) {
      setError(err.message || "Failed to update equipment type");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete equipment type "${name}"?`)) return;
    try {
      await deleteEquipmentType(id);
      setTypes((prev) => prev.filter((t) => t.equipment_id !== id));
      setSuccess(`"${name}" deleted.`);
    } catch (err) {
      setError(err.message || "Failed to delete equipment type");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="text-violet-600" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Category</h1>
              <p className="text-sm text-slate-500">Master categories for inventory classification</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchTypes}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <RefreshCw size={15} /> Refresh
            </button>
            <button onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
              {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add Type</>}
            </button>
          </div>
        </div>

        {success && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
        {error   && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Create form */}
        <div className={`grid transition-all duration-300 ease-in-out ${showForm ? "mb-6 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}>
          <div className="overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Add New Equipment Type</h2>
              <form onSubmit={handleCreate} className="flex gap-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Water Wing"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
                <button type="submit" disabled={submitting}
                  className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? "Saving…" : "Save"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              All Equipment Types {!loading && <span className="ml-1 text-sm font-normal text-slate-500">({types.length})</span>}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">Loading…</div>
          ) : types.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Wrench size={36} className="mb-2 text-slate-200" />
              <p className="text-sm text-slate-500">No equipment types yet. Add one above.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">ID</th>
                  <th className="px-5 py-3 font-semibold">Equipment Type</th>
                  <th className="px-5 py-3 font-semibold">Added By</th>
                  <th className="px-5 py-3 font-semibold">Created At</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {types.map((t) => (
                  <tr key={t.equipment_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-400">{t.equipment_id}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {editId === t.equipment_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-violet-400 w-48"
                          />
                          <button onClick={() => handleUpdate(t.equipment_id)}
                            className="rounded p-1 text-green-600 hover:bg-green-50"><Check size={14} /></button>
                          <button onClick={() => setEditId(null)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={14} /></button>
                        </div>
                      ) : t.equipment_type}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{resolveUser(t.added_by)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-400 text-xs">
                      {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(t)}
                          className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(t.equipment_id, t.equipment_type)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

export default Equipment;
