import React, { useState, useEffect, useCallback } from "react";

import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listSubdivisions,
} from "../../../services";

import { listBlocks } from "../../../services/blockService";
import { listDistricts } from "../../../services/districtService";

import {
  Layers,
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
  password: "",
  confirmPassword: "",
  district_id: "",
  subdivision_id: "",
  block_id: "",
};

function Block() {
  const [users, setUsers] = useState([]);

  const [districts, setDistricts] = useState([]);
  const [subdivisions, setSubdivisions] = useState([]);
  const [blocks, setBlocks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [subdivisionsLoading, setSubdivisionsLoading] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(false);

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
    subdivision_id: "",
    block_id: "",
  });

  const [search, setSearch] = useState("");

  // ---------------------------------------------------------------------------
  // Fetch block users
  // ---------------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await listUsers({
        role: "block",
        page: 1,
        per_page: 50,
        status: "active"
      });

      setUsers(
        Array.isArray(res?.data?.users)
          ? res.data.users
          : Array.isArray(res?.data)
            ? res.data
            : []
      );
    } catch (err) {
      setError(err.message || "Failed to load block users");
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

      const subdivisionList = Array.isArray(res?.data?.subdivisions)
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
  // Fetch blocks
  // ---------------------------------------------------------------------------

  const fetchBlocks = useCallback(async () => {
    setBlocksLoading(true);

    try {
      const res = await listBlocks();

      const blockList = Array.isArray(res?.data?.blocks)
        ? res.data.blocks
        : Array.isArray(res?.data)
          ? res.data
          : [];

      setBlocks(blockList);
    } catch (err) {
      console.error("Failed to load blocks:", err);
      setBlocks([]);
      setError(err.message || "Failed to load blocks");
    } finally {
      setBlocksLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchUsers();
    fetchDistricts();
    fetchSubdivisions();
    fetchBlocks();
  }, [
    fetchUsers,
    fetchDistricts,
    fetchSubdivisions,
    fetchBlocks,
  ]);

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "district_id"
        ? { subdivision_id: "", block_id: "" }
        : name === "subdivision_id"
          ? { block_id: "" }
          : {}),
    }));
  };

  const filteredSubdivisions = subdivisions.filter(
    (subdivision) =>
      Number(subdivision.district_id ?? subdivision.districtId) ===
      Number(form.district_id)
  );

  const filteredBlocks = blocks.filter(
    (block) =>
      Number(block.subdivision_id ?? block.subdivisionId) ===
      Number(form.subdivision_id)
  );
  const filteredEditBlocks = blocks.filter((block) => {
    const blockSubdivisionId =
      block.subdivision_id ??
      block.subdivisionId ??
      block.subdivision?.id ??
      block.subdivision?.subdivision_id ??
      block.subdivision?.subdivisionId;

    return Number(blockSubdivisionId) === Number(editData.subdivision_id);
  });
  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
  };

  // ---------------------------------------------------------------------------
  // Create block user
  // ---------------------------------------------------------------------------

  const handleCreate = async (e) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.district_id ||
      !form.subdivision_id ||
      !form.block_id ||
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

        role: "block",

        district_id: Number(form.district_id),
        subdivision_id: Number(form.subdivision_id),
        block_id: Number(form.block_id),

        // Keep linked_id if your backend uses it for the block.
        linked_id: Number(form.block_id),
      };

      const res = await createUser(payload);

      const createdUser = res?.data;

      if (createdUser) {
        setUsers((prev) => [createdUser, ...prev]);
      }

      setSuccess(
        `Block user "${createdUser?.name || form.name}" created.`
      );

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

    const linkedBlock = getLinkedBlock(u);

    const subdivisionId =
      u.subdivision_id ??
      u.subdivisionId ??
      u.subdivision?.id ??
      linkedBlock?.subdivision_id ??
      linkedBlock?.subdivisionId ??
      linkedBlock?.subdivision?.id ??
      "";

    const districtId =
      u.district_id ??
      u.districtId ??
      u.district?.id ??
      linkedBlock?.district_id ??
      linkedBlock?.districtId ??
      linkedBlock?.district?.id ??
      "";

    const blockId =
      u.block_id ??
      u.blockId ??
      u.linked_id ??
      u.linkedId ??
      u.block?.id ??
      u.linked_entity?.id ??
      "";

    setEditData({
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      district_id: districtId,
      subdivision_id: subdivisionId,
      block_id: blockId,
    });

    setError("");
    setSuccess("");
  };

  const handleUpdate = async (id) => {
    if (
      !editData.name.trim() ||
      !editData.email.trim() ||
      !editData.district_id ||
      !editData.subdivision_id ||
      !editData.block_id
    ) {
      setError(
        "Name, email, district, subdivision and block are required."
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

        role: "block",

        district_id: Number(editData.district_id),
        subdivision_id: Number(editData.subdivision_id),
        block_id: Number(editData.block_id),

        // Keep linked_id for existing backend compatibility.
        linked_id: Number(editData.block_id),

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
      setSuccess("Block user updated.");
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
        `Deactivate block user "${name}"?`
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await deleteUser(id);

      setSuccess(
        `Block user "${name}" deactivated successfully.`
      );

      // Reload only active block users
      await fetchUsers();
    } catch (err) {
      setError(
        err.message || "Failed to deactivate block user"
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const getLinkedBlock = (user) =>
    blocks.find(
      (block) =>
        Number(block.id) ===
        Number(
          user.block_id ??
          user.blockId ??
          user.linked_id ??
          user.linkedId ??
          user.block?.id ??
          user.linked_entity?.id
        )
    );

  const getLinkedSubdivision = (user, linkedBlock = getLinkedBlock(user)) =>
    subdivisions.find(
      (subdivision) =>
        Number(subdivision.id) ===
        Number(
          user.subdivision_id ??
          user.subdivisionId ??
          user.subdivision?.id ??
          linkedBlock?.subdivision_id ??
          linkedBlock?.subdivisionId ??
          linkedBlock?.subdivision?.id
        )
    );

  const getLinkedDistrict = (
    user,
    linkedBlock = getLinkedBlock(user),
    linkedSubdivision = getLinkedSubdivision(user, linkedBlock)
  ) =>
    districts.find(
      (district) =>
        Number(district.id) ===
        Number(
          user.district_id ??
          user.districtId ??
          user.district?.id ??
          linkedBlock?.district_id ??
          linkedBlock?.districtId ??
          linkedBlock?.district?.id ??
          linkedSubdivision?.district_id ??
          linkedSubdivision?.districtId ??
          linkedSubdivision?.district?.id
        )
    );

  const filteredUsers = users.filter((u) => {
    const query = search.toLowerCase().trim();

    if (!query) return true;

    const linkedBlock = getLinkedBlock(u);
    const linkedSubdivision = getLinkedSubdivision(u, linkedBlock);
    const linkedDistrict = getLinkedDistrict(
      u,
      linkedBlock,
      linkedSubdivision
    );

    const districtName =
      linkedDistrict?.name ||
      u.district_name ||
      u.district?.name ||
      linkedBlock?.district?.name ||
      linkedSubdivision?.district?.name ||
      "";

    const subdivisionName =
      linkedSubdivision?.name ||
      u.subdivision_name ||
      u.subdivision?.name ||
      linkedBlock?.subdivision?.name ||
      "";

    const blockName =
      linkedBlock?.name ||
      u.linked_entity?.name ||
      u.block_name ||
      u.linked_name ||
      "";

    return (
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.phone?.toLowerCase().includes(query) ||
      districtName.toLowerCase().includes(query) ||
      subdivisionName.toLowerCase().includes(query) ||
      blockName.toLowerCase().includes(query)
    );
  });

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Layers className="text-cyan-600" size={28} />

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Block Users
              </h1>

              <p className="text-sm text-slate-500">
                Manage block-level administration accounts
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                fetchUsers();
                fetchDistricts();
                fetchSubdivisions();
                fetchBlocks();
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <button
              onClick={() => {
                setShowForm(!showForm);
                setError("");
                setSuccess("");
              }}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              {showForm ? (
                <>
                  <X size={15} />
                  Cancel
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Add Block User
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
          className={`grid transition-all duration-300 ease-in-out ${showForm
            ? "mb-6 grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
            }`}
        >
          <div className="overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Add Block User
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
                      placeholder="e.g. Braun Doe"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
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
                      placeholder="e.g. braun@example.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
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
                      placeholder="e.g. 9876545321"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100"
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
                      name="subdivision_id"
                      value={form.subdivision_id}
                      onChange={handleChange}
                      disabled={!form.district_id || subdivisionsLoading}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        {!form.district_id
                          ? "Select district first"
                          : subdivisionsLoading
                            ? "Loading subdivisions..."
                            : "Select Subdivision"}
                      </option>

                      {filteredSubdivisions.map((subdivision) => (
                        <option
                          key={subdivision.id}
                          value={subdivision.id}
                        >
                          {subdivision.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Block */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Block *
                    </label>

                    <select
                      name="block_id"
                      value={form.block_id}
                      onChange={handleChange}
                      disabled={!form.subdivision_id || blocksLoading}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        {!form.subdivision_id
                          ? "Select subdivision first"
                          : blocksLoading
                            ? "Loading blocks..."
                            : "Select Block"}
                      </option>

                      {filteredBlocks.map((block) => (
                        <option
                          key={block.id}
                          value={block.id}
                        >
                          {block.name}
                        </option>
                      ))}
                    </select>
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
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
                    className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Creating…" : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Table Header */}
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <h2 className="font-semibold text-slate-900">
                Block Users{" "}
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
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, phone..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
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
              <Layers size={36} className="mb-2 text-slate-200" />

              <p className="text-sm text-slate-500">
                No block users yet. Add one above.
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Search size={36} className="mb-2 text-slate-200" />

              <p className="text-sm text-slate-500">
                No users found for "{search}".
              </p>

              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-3 text-sm font-medium text-cyan-600 hover:text-cyan-700"
              >
                Clear search
              </button>
            </div>
          ) : (
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
                      Block
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
                  {filteredUsers.map((u) => {
                    const linkedBlock = getLinkedBlock(u);
                    const linkedSubdivision = getLinkedSubdivision(
                      u,
                      linkedBlock
                    );
                    const linkedDistrict = getLinkedDistrict(
                      u,
                      linkedBlock,
                      linkedSubdivision
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
                              className="w-36 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-cyan-400"
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
                              className="w-44 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-cyan-400"
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
                              className="w-32 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-cyan-400"
                            />
                          ) : (
                            u.phone || "—"
                          )}
                        </td>

                        {/* District */}
                        <td className="px-5 py-3 text-slate-600">
                          {editId === u.id ? (
                            <div className="w-44 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-700">
                              {linkedDistrict?.name ||
                                u.district_name ||
                                u.district?.name ||
                                linkedBlock?.district?.name ||
                                linkedSubdivision?.district?.name ||
                                "—"}
                            </div>
                          ) : (
                            linkedDistrict?.name ||
                            u.district_name ||
                            u.district?.name ||
                            linkedBlock?.district?.name ||
                            linkedSubdivision?.district?.name ||
                            "—"
                          )}
                        </td>

                        {/* Subdivision */}
                        <td className="px-5 py-3 text-slate-600">
                          {editId === u.id ? (
                            <div className="w-48 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-700">
                              {linkedSubdivision?.name ||
                                u.subdivision_name ||
                                u.subdivision?.name ||
                                linkedBlock?.subdivision?.name ||
                                "—"}
                            </div>
                          ) : (
                            linkedSubdivision?.name ||
                            u.subdivision_name ||
                            u.subdivision?.name ||
                            linkedBlock?.subdivision?.name ||
                            "—"
                          )}
                        </td>

                        {/* Block */}
                        <td className="px-5 py-3 text-slate-600">
                          {editId === u.id ? (
                            <select
                              value={editData.block_id}
                              onChange={(e) =>
                                setEditData((p) => ({
                                  ...p,
                                  block_id: e.target.value,
                                }))
                              }
                              className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-cyan-400"
                            >
                              <option value="">
                                Select Block
                              </option>

                              {filteredEditBlocks.map((block) => (
                                <option
                                  key={block.id}
                                  value={block.id}
                                >
                                  {block.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            linkedBlock?.name ||
                            u.linked_entity?.name ||
                            u.block_name ||
                            u.linked_name ||
                            "—"
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${u.status === "active"
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
                                >
                                  <Check size={14} />
                                </button>

                                <button
                                  onClick={() =>
                                    setEditId(null)
                                  }
                                  className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
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
          )}
        </div>
      </div>
    </div>
  );
}

export default Block;