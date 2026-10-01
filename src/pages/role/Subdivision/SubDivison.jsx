import React, { useState, useEffect, useCallback } from "react";

import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listSubdivisions,
  listDistricts,
} from "../../../services";

import {
  Building2,
  Plus,
  X,
  RefreshCw,
  Trash2,
  Pencil,
  Check,
  Search,
} from "lucide-react";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  district_id: "",
  linked_id: "",
  password: "",
  confirmPassword: "",
};

function SubDivison() {
  const [users, setUsers] = useState([]);
  const [subdivisions, setSubdivisions] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [subdivisionsLoading, setSubdivisionsLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [editId, setEditId] = useState(null);

  const [editData, setEditData] = useState({
    name: "",
    email: "",
    phone: "",
    district_id: "",
    linked_id: "",
  });

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const [search, setSearch] = useState("");

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // ---------------------------------------------------------------------------
  // Fetch subdivision users
  // ---------------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await listUsers({
        role: "subdivision",
        page: 1,
        per_page: 50,
      });
      console.log("DISTRICT USERS RESPONSE:", res);
      setUsers(
        Array.isArray(res?.data?.users)
          ? res.data.users
          : Array.isArray(res?.data)
          ? res.data
          : []
      );
    } catch (err) {
      setError(err.message || "Failed to load subdivision users");
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch districts
  // ---------------------------------------------------------------------------

  const fetchDistricts = useCallback(async () => {
    setDistrictsLoading(true);

    try {
      const res = await listDistricts();

      const districtList = Array.isArray(res?.data?.districts)
        ? res.data.districts
        : Array.isArray(res?.data)
        ? res.data
        : [];

      setDistricts(districtList);
    } catch (err) {
      console.error("Failed to load districts:", err);

      setDistricts([]);

      setError(err.message || "Failed to load districts");
    } finally {
      setDistrictsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch subdivisions
  // ---------------------------------------------------------------------------

  const fetchSubdivisions = useCallback(async () => {
    setSubdivisionsLoading(true);

    try {
      const res = await listSubdivisions();

      const subdivisionList = Array.isArray(
        res?.data?.subdivisions
      )
        ? res.data.subdivisions
        : Array.isArray(res?.data)
        ? res.data
        : [];

      setSubdivisions(subdivisionList);
    } catch (err) {
      console.error("Failed to load subdivisions:", err);

      setSubdivisions([]);

      setError(err.message || "Failed to load subdivisions");
    } finally {
      setSubdivisionsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Initial fetch
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchUsers();
    fetchDistricts();
    fetchSubdivisions();
  }, [fetchUsers, fetchDistricts, fetchSubdivisions]);

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "district_id" ? { linked_id: "" } : {}),
    }));
  };

  const filteredSubdivisions = subdivisions.filter(
    (subdivision) =>
      Number(subdivision.district_id ?? subdivision.districtId) ===
      Number(form.district_id)
  );

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
  };

  // ---------------------------------------------------------------------------
  // Create subdivision user
  // ---------------------------------------------------------------------------

  const handleCreate = async (e) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.district_id ||
      !form.linked_id ||
      !form.password
    ) {
      setError("All fields are required.");
      return;
    }

    if (!form.confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,

        role: "subdivision",

        district_id: Number(form.district_id),
        linked_id: Number(form.linked_id),
      };

      const res = await createUser(payload);

      const createdUser = res?.data;

      if (createdUser) {
        setUsers((prev) => [createdUser, ...prev]);
      }

      setSuccess(
        `Subdivision user "${
          createdUser?.name || form.name
        }" created.`
      );

      setCurrentPage(1);

      resetForm();
    } catch (err) {
      setError(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------------------

  const startEdit = (u) => {
    setEditId(u.id);

    setEditData({
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      district_id:
        u.district_id ?? u.districtId ?? u.district?.id ?? "",
      linked_id:
        u.linked_id ??
        u.subdivision_id ??
        u.subdivisionId ??
        u.subdivision?.id ??
        "",
    });

    setError("");
    setSuccess("");
  };

  const handleUpdate = async (id) => {
    if (
      !editData.name.trim() ||
      !editData.email.trim() ||
      !editData.district_id ||
      !editData.linked_id
    ) {
      setError(
        "Name, email, district and subdivision are required."
      );

      return;
    }

    try {
      setError("");
      setSuccess("");

      const res = await updateUser(id, {
        name: editData.name.trim(),
        email: editData.email.trim(),
        phone: editData.phone.trim(),

        role: "subdivision",

        district_id: Number(editData.district_id),
        linked_id: Number(editData.linked_id),

        status: "active",
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                ...res.data,
              }
            : u
        )
      );

      setEditId(null);

      setSuccess("Subdivision user updated.");
    } catch (err) {
      setError(err.message || "Failed to update user");
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Delete subdivision user "${name}"?`
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await deleteUser(id);

      setUsers((prev) =>
        prev.filter((u) => u.id !== id)
      );

      // Reset pagination after deleting
      setCurrentPage(1);

      setSuccess("Subdivision user deleted.");
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  };

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const filteredUsers = users.filter((u) => {
    const query = search.toLowerCase().trim();

    if (!query) return true;

    const linkedSubdivision = subdivisions.find(
      (subdivision) =>
        Number(subdivision.id) ===
        Number(
          u.linked_id ??
          u.subdivision_id ??
          u.subdivisionId ??
          u.subdivision?.id
        )
    );

    const linkedDistrict = districts.find(
      (district) =>
        Number(district.id) ===
        Number(u.district_id ?? u.districtId ?? u.district?.id)
    );

    const districtName =
      linkedDistrict?.name ||
      u.district_name ||
      u.district?.name ||
      "";

    const subdivisionName =
      linkedSubdivision?.name ||
      u.subdivision_name ||
      u.subdivision?.name ||
      u.linked_name ||
      "";

    return (
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.phone?.toLowerCase().includes(query) ||
      districtName.toLowerCase().includes(query) ||
      subdivisionName.toLowerCase().includes(query)
    );
  });

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  const totalPages = Math.ceil(
    filteredUsers.length / itemsPerPage
  );

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ---------------------------------------------------------------------------
  // Reset pagination when search changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // ---------------------------------------------------------------------------
  // Keep current page valid
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (
      totalPages > 0 &&
      currentPage > totalPages
    ) {
      setCurrentPage(totalPages);
    }

    if (
      totalPages === 0 &&
      currentPage !== 1
    ) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <Building2
              className="text-orange-500"
              size={28}
            />

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Subdivision Users
              </h1>

              <p className="text-sm text-slate-500">
                Manage subdivisional office accounts
              </p>
            </div>

          </div>

          <div className="flex gap-2">

            {/* Refresh */}
            <button
              onClick={() => {
                fetchUsers();
                fetchDistricts();
                fetchSubdivisions();
                setCurrentPage(1);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            {/* Add */}
            <button
              onClick={() => {
                setShowForm(!showForm);
                setError("");
                setSuccess("");
              }}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              {showForm ? (
                <>
                  <X size={15} />
                  Cancel
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Add Subdivision User
                </>
              )}
            </button>

          </div>
        </div>

        {/* Messages */}

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

        {/* Create Form */}

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            showForm
              ? "mb-6 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Add Subdivision User
              </h2>

              <form onSubmit={handleCreate}>

                <div className="grid gap-4 sm:grid-cols-2">

                  {/* Full Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Full Name *
                    </label>

                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Shaun Doe"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Email *
                    </label>

                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="e.g. shaun@example.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  {/* District */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      District *
                    </label>

                    <select
                      name="district_id"
                      value={form.district_id}
                      onChange={handleChange}
                      disabled={districtsLoading}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        {districtsLoading
                          ? "Loading districts..."
                          : "Select District"}
                      </option>

                      {districts.map((district) => (
                        <option
                          key={district.id}
                          value={district.id}
                        >
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subdivision */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Subdivision *
                    </label>

                    <select
                      name="linked_id"
                      value={form.linked_id}
                      onChange={handleChange}
                      disabled={
                        !form.district_id ||
                        subdivisionsLoading ||
                        districtsLoading
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        {!form.district_id
                          ? "Select district first"
                          : subdivisionsLoading
                          ? "Loading subdivisions..."
                          : "Select Subdivision"}
                      </option>

                      {filteredSubdivisions.map(
                        (subdivision) => (
                          <option
                            key={subdivision.id}
                            value={subdivision.id}
                          >
                            {subdivision.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Phone *
                    </label>

                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="e.g. 9876554321"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Password *
                    </label>

                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Set a password"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Confirm Password *
                    </label>

                    <input
                      name="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                </div>

                <div className="mt-4 flex justify-end gap-3">

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
                    className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? "Creating…"
                      : "Create User"}
                  </button>

                </div>

              </form>
            </div>
          </div>
        </div>

        {/* Table */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Table Header + Search */}

          <div className="border-b border-slate-200 px-5 py-4">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <h2 className="font-semibold text-slate-900">
                Subdivision Users{" "}

                {!loading && (
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    ({filteredUsers.length})
                  </span>
                )}
              </h2>

              {/* Search */}

              <div className="relative w-full sm:w-72">

                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search name, email, phone..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X size={15} />
                  </button>
                )}

              </div>

            </div>
          </div>

          {/* Loading */}

          {loading ? (

            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              Loading…
            </div>

          ) : users.length === 0 ? (

            <div className="flex flex-col items-center justify-center py-16">

              <Building2
                size={36}
                className="mb-2 text-slate-200"
              />

              <p className="text-sm text-slate-500">
                No subdivision users yet. Add one above.
              </p>

            </div>

          ) : filteredUsers.length === 0 ? (

            <div className="flex flex-col items-center justify-center py-16">

              <Search
                size={36}
                className="mb-2 text-slate-200"
              />

              <p className="text-sm text-slate-500">
                No users found for "{search}".
              </p>

              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-3 text-sm font-medium text-orange-500 hover:text-orange-600"
              >
                Clear search
              </button>

            </div>

          ) : (

            <>
              {/* Table */}

              <div className="overflow-x-auto">

                <table className="w-full text-left text-sm">

                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">

                    <tr>

                      <th className="px-5 py-3 font-semibold">
                        Name
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Email
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Phone
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        District
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Subdivision
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Status
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Actions
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {paginatedUsers.map((u) => {

                      const linkedSubdivision =
                        subdivisions.find(
                          (subdivision) =>
                            Number(subdivision.id) ===
                                Number(
                                  u.linked_id ??
                                  u.subdivision_id ??
                                  u.subdivisionId ??
                                  u.subdivision?.id
                                )
                        );

                      const linkedDistrict =
                        districts.find(
                          (district) =>
                            Number(district.id) ===
                              Number(
                                u.district_id ??
                                u.districtId ??
                                u.district?.id
                              )
                        );

                      return (
                        <tr
                          key={u.id}
                          className="transition-colors hover:bg-slate-50"
                        >

                          {/* Name */}

                          <td className="px-5 py-3 font-medium text-slate-800">

                            {editId === u.id ? (
                              <input
                                value={editData.name}
                                onChange={(e) =>
                                  setEditData((p) => ({
                                    ...p,
                                    name: e.target.value,
                                  }))
                                }
                                className="w-36 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-orange-400"
                              />
                            ) : (
                              u.name
                            )}

                          </td>

                          {/* Email */}

                          <td className="px-5 py-3 text-slate-600">

                            {editId === u.id ? (
                              <input
                                value={editData.email}
                                onChange={(e) =>
                                  setEditData((p) => ({
                                    ...p,
                                    email: e.target.value,
                                  }))
                                }
                                className="w-44 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-orange-400"
                              />
                            ) : (
                              u.email
                            )}

                          </td>

                          {/* Phone */}

                          <td className="px-5 py-3 text-slate-500">

                            {editId === u.id ? (
                              <input
                                value={editData.phone}
                                onChange={(e) =>
                                  setEditData((p) => ({
                                    ...p,
                                    phone: e.target.value,
                                  }))
                                }
                                className="w-32 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-orange-400"
                              />
                            ) : (
                              u.phone || "—"
                            )}

                          </td>

                          {/* District */}

                          <td className="px-5 py-3 text-slate-600">

                            {editId === u.id ? (

                              <select
                                value={
                                  editData.district_id
                                }
                                onChange={(e) =>
                                  setEditData((p) => ({
                                    ...p,
                                    district_id:
                                      e.target.value,
                                  }))
                                }
                                className="w-44 rounded border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-orange-400"
                              >

                                <option value="">
                                  Select District
                                </option>

                                {districts.map(
                                  (district) => (
                                    <option
                                      key={district.id}
                                      value={district.id}
                                    >
                                      {district.name}
                                    </option>
                                  )
                                )}

                              </select>

                            ) : (

                              linkedDistrict?.name ||
                              u.district_name ||
                              u.district?.name ||
                              "—"

                            )}

                          </td>

                          {/* Subdivision */}

                          <td className="px-5 py-3 text-slate-600">

                            {editId === u.id ? (

                              <select
                                value={
                                  editData.linked_id
                                }
                                onChange={(e) =>
                                  setEditData((p) => ({
                                    ...p,
                                    linked_id:
                                      e.target.value,
                                  }))
                                }
                                className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-orange-400"
                              >

                                <option value="">
                                  Select Subdivision
                                </option>

                                {subdivisions.map(
                                  (subdivision) => (
                                    <option
                                      key={subdivision.id}
                                      value={subdivision.id}
                                    >
                                      {subdivision.name}
                                    </option>
                                  )
                                )}

                              </select>

                            ) : (

                              linkedSubdivision?.name ||
                              u.subdivision_name ||
                              u.subdivision?.name ||
                              u.linked_name ||
                              "—"

                            )}

                          </td>

                          {/* Status */}

                          <td className="px-5 py-3">

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                                u.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {u.status || "active"}
                            </span>

                          </td>

                          {/* Actions */}

                          <td className="px-5 py-3">

                            <div className="flex gap-1">

                              {editId === u.id ? (

                                <>

                                  <button
                                    onClick={() =>
                                      handleUpdate(u.id)
                                    }
                                    className="rounded p-1.5 text-green-600 transition-colors hover:bg-green-50"
                                    title="Save"
                                  >
                                    <Check size={14} />
                                  </button>

                                  <button
                                    onClick={() =>
                                      setEditId(null)
                                    }
                                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
                                    title="Cancel"
                                  >
                                    <X size={14} />
                                  </button>

                                </>

                              ) : (

                                <>

                                  <button
                                    onClick={() =>
                                      startEdit(u)
                                    }
                                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                                    title="Edit"
                                  >
                                    <Pencil size={14} />
                                  </button>

                                  <button
                                    onClick={() =>
                                      handleDelete(
                                        u.id,
                                        u.name
                                      )
                                    }
                                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>

                                </>

                              )}

                            </div>

                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>

              {/* Pagination */}

              {totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                  {/* Showing */}

                  <p className="text-sm text-slate-500">

                    Showing{" "}

                    <span className="font-medium text-slate-700">
                      {(currentPage - 1) *
                        itemsPerPage +
                        1}
                    </span>

                    {" "}to{" "}

                    <span className="font-medium text-slate-700">
                      {Math.min(
                        currentPage *
                          itemsPerPage,
                        filteredUsers.length
                      )}
                    </span>

                    {" "}of{" "}

                    <span className="font-medium text-slate-700">
                      {filteredUsers.length}
                    </span>

                  </p>

                  {/* Pagination Buttons */}

                  <div className="flex flex-wrap items-center gap-1">

                    {/* Previous */}

                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.max(prev - 1, 1)
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}

                    {Array.from(
                      {
                        length: totalPages,
                      },
                      (_, index) => index + 1
                    ).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() =>
                          setCurrentPage(page)
                        }
                        className={`min-w-9 rounded-lg px-3 py-2 text-sm font-medium ${
                          currentPage === page
                            ? "bg-orange-500 text-white"
                            : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    {/* Next */}

                    <button
                      type="button"
                      disabled={
                        currentPage === totalPages
                      }
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(
                            prev + 1,
                            totalPages
                          )
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>

                  </div>

                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default SubDivison;