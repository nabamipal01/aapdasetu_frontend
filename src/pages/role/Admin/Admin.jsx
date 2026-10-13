
import React, { useState, useEffect, useCallback, useRef } from "react";

import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../../services";

import {
  UserCog,
  Plus,
  X,
  RefreshCw,
  Trash2,
  Pencil,
  Search,
  Eye,
  Download,
  ChevronDown,
  FileSpreadsheet,
  FileDown,
  FileText,
} from "lucide-react";

import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import UserDetailsModal from "../../../components/common/UserDetailsModal";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

const getUserRole = (user) => {
  if (user.role || user.user_role || user.user_type) {
    return user.role || user.user_role || user.user_type;
  }

  if (user.volunteer_id || user.volunteerId || user.volunteer) {
    return "volunteer";
  }

  if (user.agency_id || user.agencyId || user.agency) {
    return "NGO";
  }

  return "";
};

const getToday = () => new Date().toISOString().split("T")[0];

function Admin() {
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    total: 0,
    per_page: 5,
    current_page: 1,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  });

  // Search
  const [search, setSearch] = useState("");

  // Download menu
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Fetch users
  // ---------------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await listUsers({
        role: "admin",
        page,
        per_page: 5,
        status: "active",
      });

      const userList = Array.isArray(res?.data?.users)
        ? res.data.users
        : Array.isArray(res?.data)
          ? res.data
          : [];

      setUsers(userList);

      setPagination(
        res?.data?.pagination ?? {
          total: userList.length,
          per_page: 5,
          current_page: page,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        }
      );
    } catch (err) {
      setError(err.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(event.target)
      ) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingUserId(null);
    setShowForm(false);
  };

  // ---------------------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------------------

  const handleEdit = (user) => {
    setEditingUserId(user.id);

    setEditingUser({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    });

    setError("");
    setSuccess("");
  };

  const handleInlineChange = (e) => {
    const { name, value } = e.target;

    setEditingUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInlineUpdate = async (userId) => {
    if (!editingUser) return;

    if (
      !editingUser.name.trim() ||
      !editingUser.email.trim() ||
      !editingUser.phone.trim()
    ) {
      setError("Name, Email and Phone are required.");
      return;
    }

    setUpdatingUserId(userId);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: editingUser.name.trim(),
        email: editingUser.email.trim(),
        phone: editingUser.phone.trim(),
        role: "admin",
      };

      const res = await updateUser(userId, payload);

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, ...res.data }
            : user
        )
      );

      setSuccess(
        `User "${res.data?.name || editingUser.name}" updated successfully.`
      );

      setEditingUserId(null);
      setEditingUser(null);
    } catch (err) {
      setError(err.message || "Failed to update user");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleInlineCancel = () => {
    setEditingUserId(null);
    setEditingUser(null);
    setError("");
  };

  // ---------------------------------------------------------------------------
  // Create / Update
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      (!editingUserId && !form.password)
    ) {
      setError(
        `Name, Email, Phone${
          editingUserId ? "" : " and Password"
        } are required.`
      );
      return;
    }

    if (form.password) {
      if (!form.confirmPassword) {
        setError("Please confirm your password.");
        return;
      }

      if (form.password !== form.confirmPassword) {
        setError("Password and Confirm Password do not match.");
        return;
      }
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: "admin",
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (editingUserId) {
        const res = await updateUser(editingUserId, payload);

        setUsers((prev) =>
          prev.map((user) =>
            user.id === editingUserId
              ? { ...user, ...res.data }
              : user
          )
        );

        setSuccess(
          `User "${res.data?.name || form.name}" updated successfully.`
        );
      } else {
        const res = await createUser(payload);

        setUsers((prev) => [res.data, ...prev]);

        setSuccess(
          `User "${res.data?.name || form.name}" created successfully.`
        );
      }

      resetForm();
      fetchUsers();
    } catch (err) {
      setError(
        err.message ||
          `Failed to ${editingUserId ? "update" : "create"} user`
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate user "${name}"?`)) return;

    try {
      setError("");
      setSuccess("");

      await deleteUser(id);

      setSuccess(`User "${name}" deactivated successfully.`);

      if (users.length === 1 && page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        fetchUsers();
      }
    } catch (err) {
      setError(err.message || "Failed to deactivate user");
    }
  };

  // ---------------------------------------------------------------------------
  // Search and filtered users
  // ---------------------------------------------------------------------------

  const query = search.toLowerCase().trim();

  const systemUsers = users.filter(
    (user) => getUserRole(user).toLowerCase() === "admin"
  );

  const filteredUsers = systemUsers.filter((user) => {
    if (!query) return true;

    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query)
    );
  });

  // ---------------------------------------------------------------------------
  // Download helpers
  // ---------------------------------------------------------------------------

  // Exports the admin users currently loaded on this page,
  // respecting the search filter.
  const getUserExportData = () => {
    return filteredUsers.map((user, index) => ({
      "S.No.": index + 1,
      Name: user.name || "",
      Email: user.email || "",
      Phone: user.phone || "",
      Role: getUserRole(user) || "admin",
      Status: user.status || "active",
    }));
  };

  const handleEmptyExport = () => {
    setError("There are no admin users to export.");
  };

  // Excel
 const downloadUsersXLSX = () => {
  const data = getUserExportData();

  if (!data.length) {
    handleEmptyExport();
    return;
  }

  const headers = Object.keys(data[0]);

  const rows = data.map((record) =>
    headers.map((header) => String(record[header] ?? ""))
  );

  // Create worksheet with title and report information
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Admin Users Report"],
    [`Generated: ${new Date().toLocaleString()}`],
    [`Total Records: ${data.length}`],
    [],
    headers,
    ...rows,
  ]);

  // Merge title and information rows
  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: headers.length - 1 },
    },
    {
      s: { r: 1, c: 0 },
      e: { r: 1, c: headers.length - 1 },
    },
    {
      s: { r: 2, c: 0 },
      e: { r: 2, c: headers.length - 1 },
    },
  ];

  // Set column widths
  worksheet["!cols"] = [
    { wch: 10 },
    { wch: 26 },
    { wch: 35 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
  ];

  // Set row heights
  worksheet["!rows"] = [
    { hpt: 30 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 8 },
    { hpt: 25 },
    ...data.map(() => ({ hpt: 22 })),
  ];

  const border = {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "thin", color: { rgb: "D1D5DB" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } },
  };

  // Report title
  worksheet["A1"].s = {
    font: {
      bold: true,
      sz: 16,
      color: { rgb: "166534" },
    },
    alignment: {
      horizontal: "left",
      vertical: "center",
    },
  };

  // Report metadata
  ["A2", "A3"].forEach((cell) => {
    worksheet[cell].s = {
      font: {
        sz: 10,
        italic: true,
        color: { rgb: "64748B" },
      },
    };
  });

  // Header styling (Excel row 5)
  headers.forEach((_, colIndex) => {
    const cell = XLSX.utils.encode_cell({
      r: 4,
      c: colIndex,
    });

    worksheet[cell].s = {
      fill: {
        patternType: "solid",
        fgColor: { rgb: "166534" },
      },
      font: {
        bold: true,
        color: { rgb: "FFFFFF" },
        sz: 10,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border,
    };
  });

  // Style all data cells
  data.forEach((record, rowIndex) => {
    headers.forEach((header, colIndex) => {
      const cell = XLSX.utils.encode_cell({
        r: rowIndex + 5,
        c: colIndex,
      });

      const isStatus = header === "Status";
      const isActive =
        String(record[header]).toLowerCase() === "active";

      worksheet[cell].s = {
        font: {
          sz: 10,
          bold: isStatus,
          color: {
            rgb: isStatus
              ? isActive
                ? "15803D"
                : "64748B"
              : "1F2937",
          },
        },
        alignment: {
          horizontal: colIndex === 0 ? "center" : "left",
          vertical: "center",
          wrapText: true,
        },
        border,
      };
    });
  });

  // Enable filtering on the table
  worksheet["!autofilter"] = {
    ref: `A5:${XLSX.utils.encode_col(headers.length - 1)}${data.length + 5}`,
  };

  // Freeze title and table header rows
  worksheet["!freeze"] = {
    xSplit: 0,
    ySplit: 5,
  };

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Admin Users"
  );

  XLSX.writeFile(
    workbook,
    `admin_users_${getToday()}.xlsx`
  );

  setShowDownloadMenu(false);
};

  // CSV
  const downloadUsersCSV = () => {
    const data = getUserExportData();

    if (!data.length) {
      handleEmptyExport();
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `admin_users_${getToday()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  // PDF
  const downloadUsersPDF = () => {
  const data = getUserExportData();

  if (!data.length) {
    handleEmptyExport();
    return;
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const columns = Object.keys(data[0]);

  const rows = data.map((record) =>
    columns.map((column) => String(record[column] ?? ""))
  );

  // Report title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(22, 101, 52);

  doc.text("Admin Users Report", 14, 15);

  // Report metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    14,
    22
  );

  doc.text(`Total Records: ${data.length}`, 14, 27);

  // Generate a professional table
  autoTable(doc, {
    startY: 32,

    head: [columns],
    body: rows,

    theme: "grid",

    margin: {
      top: 12,
      right: 14,
      bottom: 14,
      left: 14,
    },

    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      overflow: "linebreak",
      lineColor: [209, 213, 219],
      lineWidth: 0.2,
      textColor: [31, 41, 55],
      valign: "middle",
    },

    // Green table header
    headStyles: {
      fillColor: [22, 101, 52],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      valign: "middle",
    },

    // Alternate row colors
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },

    // Column widths
    columnStyles: {
      0: {
        cellWidth: 18,
        halign: "center",
      },
      1: {
        cellWidth: 43,
      },
      2: {
        cellWidth: 68,
      },
      3: {
        cellWidth: 36,
      },
      4: {
        cellWidth: 30,
        halign: "center",
      },
      5: {
        cellWidth: 27,
        halign: "center",
      },
    },

    // Repeat header automatically on additional pages
    showHead: "everyPage",

    // Page numbers
    didDrawPage: () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);

      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
        pageWidth - 14,
        pageHeight - 6,
        { align: "right" }
      );
    },
  });

  // Download PDF
  doc.save(`admin_users_${getToday()}.pdf`);

  setShowDownloadMenu(false);
};

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <UserCog className="text-green-600" size={28} />

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                User Management
              </h1>

              <p className="text-sm text-slate-500">
                Create and manage system users
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            {/* Download dropdown */}
            <div ref={downloadMenuRef} className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowDownloadMenu((prev) => !prev)
                }
                disabled={loading || filteredUsers.length === 0}
                className="flex items-center justify-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={15} />
                Download
                <ChevronDown size={14} />
              </button>

              {showDownloadMenu && (
                <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">

                  <button
                    type="button"
                    onClick={downloadUsersXLSX}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-green-50"
                  >
                    <FileSpreadsheet
                      size={17}
                      className="text-green-600"
                    />

                    <div>
                      <p className="font-medium">Download XLSX</p>
                      <p className="text-xs text-slate-400">
                        Excel workbook
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={downloadUsersCSV}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-blue-50"
                  >
                    <FileDown
                      size={17}
                      className="text-blue-600"
                    />

                    <div>
                      <p className="font-medium">Download CSV</p>
                      <p className="text-xs text-slate-400">
                        Comma-separated data
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={downloadUsersPDF}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-red-50"
                  >
                    <FileText
                      size={17}
                      className="text-red-600"
                    />

                    <div>
                      <p className="font-medium">Download PDF</p>
                      <p className="text-xs text-slate-400">
                        Printable report
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Add User */}
            <button
              type="button"
              onClick={() => {
                setShowForm(!showForm);
                setError("");
                setSuccess("");

                if (showForm) {
                  setEditingUserId(null);
                  setForm({ ...EMPTY_FORM });
                }
              }}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
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

        {/* Alerts */}
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

        {/* Create User Form */}
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
                {editingUserId ? "Edit User" : "Create New User"}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Full Name *
                    </label>

                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="e.g. John Doe"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Email *
                    </label>

                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="e.g. john@example.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Password {editingUserId ? "" : "*"}
                    </label>

                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      required={!editingUserId}
                      placeholder={
                        editingUserId
                          ? "Leave blank to keep current"
                          : "Set a password"
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Confirm Password {editingUserId ? "" : "*"}
                    </label>

                    <input
                      name="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required={!editingUserId}
                      placeholder={
                        editingUserId
                          ? "Confirm new password"
                          : "Re-enter password"
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Phone *
                    </label>

                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
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
                    className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? editingUserId
                        ? "Updating…"
                        : "Creating…"
                      : editingUserId
                        ? "Update User"
                        : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Table Header + Search */}
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <h2 className="font-semibold text-slate-900">
                Admin Users{" "}
                {!loading && (
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    ({filteredUsers.length})
                  </span>
                )}
              </h2>

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
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Loading / Empty / Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">
              Loading users…
            </div>
          ) : systemUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <UserCog size={40} className="mb-3 text-slate-300" />

              <p className="font-medium text-slate-700">
                No users found
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
                className="mt-3 text-sm font-medium text-green-600 hover:text-green-700"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isEditing = editingUserId === user.id;
                    const isUpdating = updatingUserId === user.id;

                    return (
                      <tr
                        key={user.id}
                        className={`transition-colors ${
                          isEditing
                            ? "bg-green-50/40"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Name */}
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {isEditing ? (
                            <input
                              type="text"
                              name="name"
                              value={editingUser.name}
                              onChange={handleInlineChange}
                              className="w-full min-w-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                              autoFocus
                            />
                          ) : (
                            user.name
                          )}
                        </td>

                        {/* Email */}
                        <td className="px-5 py-3 text-slate-600">
                          {isEditing ? (
                            <input
                              type="email"
                              name="email"
                              value={editingUser.email}
                              onChange={handleInlineChange}
                              className="w-full min-w-[200px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                          ) : (
                            user.email
                          )}
                        </td>

                        {/* Phone */}
                        <td className="px-5 py-3 text-slate-500">
                          {isEditing ? (
                            <input
                              type="text"
                              name="phone"
                              value={editingUser.phone}
                              onChange={handleInlineChange}
                              className="w-full min-w-[130px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                          ) : (
                            user.phone || "—"
                          )}
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

                        {/* Actions */}
                        <td className="px-5 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleInlineUpdate(user.id)}
                                disabled={isUpdating}
                                className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-100 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Update"
                              >
                                {isUpdating ? (
                                  <RefreshCw
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <CheckIcon />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={handleInlineCancel}
                                disabled={isUpdating}
                                className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Cancel"
                              >
                                <X size={17} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingUser(user)}
                                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                                title="View"
                                aria-label={`View ${user.name}`}
                              >
                                <Eye size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEdit(user)}
                                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(user.id, user.name)
                                }
                                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.total_pages > 1 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {(pagination.current_page - 1) *
                    pagination.per_page +
                    1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-slate-700">
                  {Math.min(
                    pagination.current_page * pagination.per_page,
                    pagination.total
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-700">
                  {pagination.total}
                </span>{" "}
                users
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!pagination.has_prev}
                  onClick={() =>
                    setPage((prev) => Math.max(1, prev - 1))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                  Page {pagination.current_page} of{" "}
                  {pagination.total_pages}
                </span>

                <button
                  type="button"
                  disabled={!pagination.has_next}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {viewingUser && (
        <UserDetailsModal
          user={viewingUser}
          role="admin"
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default Admin;
