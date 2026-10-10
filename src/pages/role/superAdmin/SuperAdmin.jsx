
import React, { useState, useEffect, useCallback } from "react";
import {
  listUsers,
  createUser,
  deleteUser,
} from "../../../services";
import {
  ShieldCheck,
  Plus,
  X,
  RefreshCw,
  Trash2,
  ChevronDown,
  Eye,
} from "lucide-react";
import UserDetailsModal from "../../../components/common/UserDetailsModal";

const ROLE_STYLES = {
  super_admin: "bg-blue-100 text-blue-700",
  admin: "bg-green-100 text-green-700",
  district: "bg-purple-100 text-purple-700",
  subdivision: "bg-orange-100 text-orange-700",
  block: "bg-cyan-100 text-cyan-700",
};

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "admin",
};

function SuperAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [filterRole, setFilterRole] = useState("");
  const [viewingUser, setViewingUser] = useState(null);

  // --------------------------------------------------
  // Fetch users
  // --------------------------------------------------
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page: 1,
        per_page: 100,
      };

      if (filterRole) {
        params.role = filterRole;
      }

      const res = await listUsers(params);

      setUsers(
        res?.data?.users ??
        res?.data ??
        []
      );
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [filterRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --------------------------------------------------
  // Form
  // --------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  // --------------------------------------------------
  // Create user
  // --------------------------------------------------
  const handleCreate = async (e) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.password ||
      !form.role
    ) {
      setError(
        "Name, Email, Phone, Password and Role are required."
      );
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
        role: form.role,
      };

      const res = await createUser(payload);

      const createdUser = res?.data;

      if (createdUser) {
        setUsers((prev) => [createdUser, ...prev]);

        setSuccess(
          `User "${createdUser.name}" (${createdUser.role}) created successfully.`
        );
      } else {
        setSuccess("User created successfully.");
      }

      resetForm();
    } catch (err) {
      setError(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // Delete user
  // --------------------------------------------------
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"?`)) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await deleteUser(id);

      setUsers((prev) =>
        prev.filter((user) => user.id !== id)
      );

      setSuccess(`User "${name}" deleted.`);
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">
            <ShieldCheck
              className="text-blue-600"
              size={28}
            />

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Super Admin
              </h1>

              <p className="text-sm text-slate-500">
                Full system user management
              </p>
            </div>
          </div>

          <div className="flex gap-2">

            {/* Role Filter */}
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) =>
                  setFilterRole(e.target.value)
                }
                className="appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="">All Roles</option>
                <option value="super_admin">
                  Super Admin
                </option>
                <option value="admin">
                  Admin
                </option>
                <option value="district">
                  District
                </option>
                <option value="subdivision">
                  Subdivision
                </option>
                <option value="block">
                  Block
                </option>
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            {/* Add User */}
            <button
              onClick={() => {
                setShowForm(!showForm);
                setError("");
                setSuccess("");
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {showForm ? (
                <>
                  <X size={15} />
                  Cancel
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Add User
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

        {/* Create Form */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            showForm
              ? "mb-6 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

              <h2 className="mb-5 text-lg font-semibold text-slate-900">
                Create New User
              </h2>

              <form onSubmit={handleCreate}>
                <div className="grid gap-4 sm:grid-cols-2">

                  {/* Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Full Name *
                    </label>

                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                      placeholder="e.g. john@example.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Role *
                    </label>

                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="super_admin">
                        Super Admin
                      </option>

                      <option value="admin">
                        Admin
                      </option>

                      <option value="district">
                        District
                      </option>

                      <option value="subdivision">
                        Subdivision
                      </option>

                      <option value="block">
                        Block
                      </option>
                    </select>
                  </div>
                </div>

                {/* Buttons */}
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
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

        {/* Users Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              System Users{" "}
              {!loading && (
                <span className="ml-1 text-sm font-normal text-slate-500">
                  ({users.length})
                </span>
              )}
            </h2>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">
              Loading users…
            </div>
          ) : users.length === 0 ? (
            /* Empty */
            <div className="flex flex-col items-center justify-center py-20 text-center">

              <ShieldCheck
                size={40}
                className="mb-3 text-slate-300"
              />

              <p className="font-medium text-slate-700">
                No users found
              </p>

            </div>
          ) : (
            /* Table */
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
                      Role
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

                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-50"
                    >

                      {/* Name */}
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {user.name}
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3 text-slate-600">
                        {user.email}
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-3 text-slate-500">
                        {user.phone || "—"}
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3">

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            ROLE_STYLES[user.role] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {user.role?.replace("_", " ")}
                        </span>

                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            user.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {user.status || "active"}
                        </span>

                      </td>

                      {/* Delete */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingUser(user)}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="View"
                            aria-label={`View ${user.name}`}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(user.id, user.name)
                            }
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                            aria-label={`Delete ${user.name}`}
                          >
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
      {viewingUser && (
        <UserDetailsModal
          user={viewingUser}
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  );
}

export default SuperAdmin;
