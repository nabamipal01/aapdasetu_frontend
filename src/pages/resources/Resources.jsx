import React, { useState, useEffect, useCallback } from "react";
import { listResources, createResource } from "../../services";
import { Package, Plus, X, RefreshCw } from "lucide-react";

const EMPTY_FORM = {
  incident_id: "",
  name: "",
  resource_type: "",
  quantity: "",
  unit: "",
  region_id: "",
  notes: "",
};

function Resources() {
  const [resources, setResources]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listResources({ page: 1, per_page: 50 });
      setResources(res?.data?.resources ?? res?.data ?? []);
    } catch (err) {
      setError(err.message || "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => { setForm(EMPTY_FORM); setShowForm(false); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.resource_type || !form.incident_id) {
      setError("Name, Resource Type and Incident ID are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        incident_id:   Number(form.incident_id),
        name:          form.name.trim(),
        resource_type: form.resource_type,
        ...(form.quantity  && { quantity:  Number(form.quantity) }),
        ...(form.unit      && { unit:      form.unit.trim() }),
        ...(form.region_id && { region_id: Number(form.region_id) }),
        ...(form.notes     && { notes:     form.notes.trim() }),
      };
      const res = await createResource(payload);
      setResources((prev) => [res.data, ...prev]);
      setSuccess("Resource allocated successfully.");
      resetForm();
    } catch (err) {
      setError(err.message || "Failed to create resource");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Package className="text-emerald-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Resources</h1>
              <p className="text-sm text-slate-500">Allocate and track response resources</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchResources}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <RefreshCw size={15} /> Refresh
            </button>
            <button onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add Resource</>}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {success && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
        {error   && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Create Form */}
        <div className={`grid transition-all duration-300 ease-in-out ${showForm ? "mb-6 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}>
          <div className="overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-semibold text-slate-900">Allocate Resource</h2>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Resource Name *</label>
                    <input name="name" value={form.name} onChange={handleChange}
                      placeholder="e.g. Water Tanker"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Resource Type *</label>
                    <select name="resource_type" value={form.resource_type} onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                      <option value="">Select type</option>
                      <option value="vehicle">Vehicle</option>
                      <option value="equipment">Equipment</option>
                      <option value="personnel">Personnel</option>
                      <option value="medical">Medical Supply</option>
                      <option value="food">Food & Water</option>
                      <option value="shelter">Shelter</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Incident ID *</label>
                    <input name="incident_id" type="number" value={form.incident_id} onChange={handleChange}
                      placeholder="e.g. 1"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Region ID</label>
                    <input name="region_id" type="number" value={form.region_id} onChange={handleChange}
                      placeholder="e.g. 3"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Quantity</label>
                    <input name="quantity" type="number" value={form.quantity} onChange={handleChange}
                      placeholder="e.g. 5"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Unit</label>
                    <input name="unit" value={form.unit} onChange={handleChange}
                      placeholder="e.g. trucks, kg, litres"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Notes</label>
                    <textarea name="notes" rows={2} value={form.notes} onChange={handleChange}
                      placeholder="Additional notes..."
                      className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={resetForm}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? "Allocating…" : "Allocate Resource"}
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
              All Resources {!loading && <span className="ml-1 text-sm font-normal text-slate-500">({resources.length})</span>}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">Loading resources…</div>
          ) : resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package size={40} className="mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">No resources allocated yet</p>
              <p className="mt-1 text-sm text-slate-500">Allocate a resource to an incident to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Incident</th>
                    <th className="px-5 py-3 font-semibold">Quantity</th>
                    <th className="px-5 py-3 font-semibold">Region</th>
                    <th className="px-5 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resources.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{r.name}</td>
                      <td className="px-5 py-3 capitalize text-slate-600">{r.resource_type}</td>
                      <td className="px-5 py-3 text-slate-500">{r.incident_id ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {r.quantity ? `${r.quantity}${r.unit ? " " + r.unit : ""}` : "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{r.region_id ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{r.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Resources;
