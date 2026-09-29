import React, { useState, useEffect } from "react";
import { createInventoryItem, listEquipmentTypes } from "../../../services";
import { PackagePlus, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EMPTY_FORM = {
  equipment_id: "",
  product_name: "",
  brand_name: "",
  oem: "",
  location: "",
  quantity: "",
  purchase_date: "",
  expiry_date: "",
};

function AddStock() {
  const navigate   = useNavigate();
  const [form, setForm]               = useState(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(null); // holds created item on success
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [typesLoading, setTypesLoading]     = useState(true);

  // Fetch live equipment types from API
  useEffect(() => {
    listEquipmentTypes()
      .then((res) => {
        const types = Array.isArray(res?.data) ? res.data : (res?.data?.types ?? []);
        setEquipmentTypes(types);
      })
      .catch(() => setEquipmentTypes([]))
      .finally(() => setTypesLoading(false));
  }, []);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipment_id || !form.product_name.trim() || !form.quantity) {
      setError("Equipment type, product name and quantity are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        equipment_id: Number(form.equipment_id),
        product_name: form.product_name.trim(),
        quantity:     Number(form.quantity),
        ...(form.brand_name    && { brand_name:    form.brand_name.trim() }),
        ...(form.oem           && { oem:           form.oem.trim() }),
        ...(form.location      && { location:      form.location.trim() }),
        ...(form.purchase_date && { purchase_date: form.purchase_date }),
        ...(form.expiry_date   && { expiry_date:   form.expiry_date }),
      };
      const res = await createInventoryItem(payload);
      setSuccess(res.data);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message || "Failed to add stock item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate("/inventory/overview")}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <PackagePlus className="text-emerald-600" size={26} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Stock</h1>
            <p className="text-sm text-slate-500">Register a new inventory item</p>
          </div>
        </div>

        {/* Success banner */}
        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <CheckCircle2 size={18} />
              Item added successfully!
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-sm text-green-800">
              <span className="font-medium">Product:</span>  <span>{success.product_name}</span>
              <span className="font-medium">Type:</span>     <span>{success.equipment_type}</span>
              <span className="font-medium">Quantity:</span> <span>{success.quantity}</span>
              <span className="font-medium">Location:</span> <span>{success.location || "—"}</span>
            </div>
            <div className="mt-3 flex gap-3">
              <button onClick={() => setSuccess(null)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                Add Another
              </button>
              <button onClick={() => navigate("/inventory/overview")}
                className="rounded-lg border border-green-300 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100">
                View Overview
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">

              {/* Equipment type */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Equipment Type *
                </label>
                <select name="equipment_id" value={form.equipment_id} onChange={handleChange}
                  disabled={typesLoading}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60">
                  <option value="">{typesLoading ? "Loading types…" : "Select equipment type"}</option>
                  {equipmentTypes.map((t) => (
                    <option key={t.equipment_id} value={t.equipment_id}>{t.equipment_type}</option>
                  ))}
                </select>
              </div>

              {/* Product name */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Product Name *
                </label>
                <input name="product_name" value={form.product_name} onChange={handleChange}
                  placeholder="e.g. FWR Helmet"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>

              {/* Brand */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Brand Name
                </label>
                <input name="brand_name" value={form.brand_name} onChange={handleChange}
                  placeholder="e.g. Viking"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>

              {/* OEM */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  OEM (Manufacturer)
                </label>
                <input name="oem" value={form.oem} onChange={handleChange}
                  placeholder="e.g. Viking Life-Saving Equipment"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>

              {/* Quantity */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Quantity *
                </label>
                <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange}
                  placeholder="e.g. 10"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>

              {/* Location */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Storage Location
                </label>
                <input name="location" value={form.location} onChange={handleChange}
                  placeholder="e.g. District Flood & Water Rescue Store"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>

              {/* Purchase date */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Purchase Date
                </label>
                <input name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>

              {/* Expiry date */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Expiry Date
                </label>
                <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => navigate("/inventory/overview")}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? "Saving…" : "Add to Inventory"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

export default AddStock;
