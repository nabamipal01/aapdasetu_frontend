import { useCallback, useEffect, useMemo, useState } from "react";

import { Eye, Check, X, RefreshCw } from "lucide-react";

import { useAuth } from "../../../context/AuthContext";

 

import {

  getAssignedItems,

  getReturnRequests,

  getReturnDetails,

  returnStock,

  approveReturn,

  rejectReturn,

} from "../../../services/returnStockService";

 

import {

  listDistrictUsers,

  getUser,

} from "../../../services/userService";

 

function ReturnStock() {

  const { user } = useAuth();

 

  const role = String(

    user?.role ??

      user?.role_name ??

      user?.user_type ??

      user?.account_type ??

      ""

  )

    .trim()

    .toLowerCase()

    .replace(/[\s-]+/g, "_");

 

  const isAdmin = ["admin", "super_admin"].includes(role);

 

  const [items, setItems] = useState([]);

  const [requests, setRequests] = useState([]);

  const [districtUsers, setDistrictUsers] = useState([]);

 

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [processingId, setProcessingId] = useState(null);

 

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

 

  // District user return-request form

  const [selectedItem, setSelectedItem] = useState(null);

  const [returnQuantity, setReturnQuantity] = useState("1");

 

  // Rejection form

  const [rejectingId, setRejectingId] = useState(null);

  const [rejectionNote, setRejectionNote] = useState("");

 

  // Admin defaults to pending; District defaults to all.

  const [statusFilter, setStatusFilter] = useState(

    isAdmin ? "pending" : "all"

  );

 

  // View dialog

  const [viewingRequest, setViewingRequest] = useState(null);

  const [detailsLoading, setDetailsLoading] = useState(false);

  const [detailsError, setDetailsError] = useState("");

 

  // Map login user ID -> District user's name.

  const districtUserMap = useMemo(

    () =>

      new Map(

        districtUsers.map((districtUser) => [

          String(districtUser.id),

          districtUser.name,

        ])

      ),

    [districtUsers]

  );

 

  useEffect(() => {

    setStatusFilter(isAdmin ? "pending" : "all");

  }, [isAdmin]);

 

  // Load District users for the Admin/Super Admin view.

  useEffect(() => {

    let cancelled = false;

 

    const loadDistrictUsers = async () => {

      if (!isAdmin) {

        setDistrictUsers([]);

        return;

      }

 

      try {

        const response = await listDistrictUsers({

          page: 1,

          per_page: 100,

        });

 

        if (response?.success === false) {

          throw new Error(

            response.message || "Failed to fetch District users."

          );

        }

 

        // Support the common response shapes.

        const users = Array.isArray(response?.data)

          ? response.data

          : Array.isArray(response?.data?.users)

            ? response.data.users

            : Array.isArray(response?.users)

              ? response.users

              : [];

 

        if (!cancelled) {

          setDistrictUsers(users);

        }

      } catch (err) {

        console.error("Load District users error:", err);

 

        if (!cancelled) {

          setDistrictUsers([]);

        }

      }

    };

 

    loadDistrictUsers();

 

    return () => {

      cancelled = true;

    };

  }, [isAdmin]);

 

  // Load Admin requests or District user's assigned stock.

  const loadData = useCallback(

    async ({ silent = false } = {}) => {

      if (!role) {

        setLoading(false);

        return;

      }

 

      try {

        if (silent) {

          setRefreshing(true);

        } else {

          setLoading(true);

        }

 

        setError("");

 

        if (isAdmin) {

          const result = await getReturnRequests({

            status: statusFilter,

            page: 1,

            limit: 100,

          });

 

          const rows = Array.isArray(result?.items)

            ? result.items

            : [];

 

          // Admin table excludes not_returned records.

          setRequests(

            rows.filter((request) =>

              ["pending", "approved", "rejected"].includes(

                String(request.status || "").toLowerCase()

              )

            )

          );

        } else {

          const result = await getAssignedItems(

            statusFilter === "all" ? "" : statusFilter

          );

 

          setItems(Array.isArray(result) ? result : []);

        }

      } catch (err) {

        setError(err.message || "Failed to load return stock data.");

      } finally {

        setLoading(false);

        setRefreshing(false);

      }

    },

    [role, isAdmin, statusFilter]

  );

 

  useEffect(() => {

    loadData();

  }, [loadData]);

 

  // Resolve a District user's name from the existing users API.

  const getDistrictUserName = (request) => {

    const userId = request?.district_user_id;

 

    return (

      request?.district_user_name ||

      districtUserMap.get(String(userId)) ||

      (userId != null ? `User ID: ${userId}` : "Unknown User")

    );

  };

 

  const statusClass = (status) => {

    const classes = {

      not_returned: "bg-slate-100 text-slate-700",

      pending: "bg-amber-100 text-amber-800",

      approved: "bg-green-100 text-green-800",

      rejected: "bg-red-100 text-red-800",

    };

 

    return (

      classes[String(status || "").toLowerCase()] ||

      "bg-slate-100 text-slate-700"

    );

  };

 

  const formatStatus = (status) =>

    String(status || "unknown")

      .replaceAll("_", " ")

      .replace(/\b\w/g, (character) => character.toUpperCase());

 

  // Submit a return request as a District user.

  const handleRequestReturn = async (event) => {

    event.preventDefault();

 

    setError("");

    setSuccess("");

 

    if (!selectedItem) {

      setError("Please select an assigned stock item.");

      return;

    }

 

    const quantity = Number(returnQuantity);

 

    if (!Number.isInteger(quantity) || quantity <= 0) {

      setError("Return quantity must be a positive whole number.");

      return;

    }

 

    try {

      setSubmitting(true);

 

      const response = await returnStock({

        inventory_id: selectedItem.inventory_id,

        issue_id: selectedItem.issue_id,

        return_quantity: quantity,

      });

 

      setSuccess(

        response?.message || "Return request submitted for approval."

      );

 

      setSelectedItem(null);

      setReturnQuantity("1");

 

      await loadData({ silent: true });

    } catch (err) {

      setError(err.message || "Unable to submit return request.");

    } finally {

      setSubmitting(false);

    }

  };

 

  // Approve a pending request. This handler is shared by the table

  // and the View dialog.

  const handleApprove = async (request) => {

    if (

      String(request?.status || "").toLowerCase() !== "pending" ||

      processingId !== null

    ) {

      return;

    }

 

    const confirmed = window.confirm(

      `Approve return request ${

        request.return_no || request.return_history_id

      }?`

    );

 

    if (!confirmed) return;

 

    setError("");

    setSuccess("");

    setProcessingId(request.return_history_id);

 

    try {

      const response = await approveReturn(request);

 

      setSuccess(

        response?.message || "Return request approved successfully."

      );

 

      setViewingRequest(null);

      setRejectingId(null);

      setRejectionNote("");

 

      await loadData({ silent: true });

    } catch (err) {

      setError(err.message || "Unable to approve return request.");

    } finally {

      setProcessingId(null);

    }

  };

 

  const handleOpenReject = (request) => {

    if (

      String(request?.status || "").toLowerCase() !== "pending" ||

      processingId !== null

    ) {

      return;

    }

 

    setError("");

    setSuccess("");

    setRejectingId(request.return_history_id);

    setRejectionNote("");

  };

 

  // Reject a pending request with a reason.

  const handleReject = async (event, request) => {

    event.preventDefault();

 

    if (

      String(request?.status || "").toLowerCase() !== "pending" ||

      processingId !== null

    ) {

      return;

    }

 

    if (!rejectionNote.trim()) {

      setError("Please provide a reason for rejecting this request.");

      return;

    }

 

    setError("");

    setSuccess("");

    setProcessingId(request.return_history_id);

 

    try {

      const response = await rejectReturn(

        request.return_history_id,

        rejectionNote

      );

 

      setSuccess(

        response?.message || "Return request rejected successfully."

      );

 

      setViewingRequest(null);

      setRejectingId(null);

      setRejectionNote("");

 

      await loadData({ silent: true });

    } catch (err) {

      setError(err.message || "Unable to reject return request.");

    } finally {

      setProcessingId(null);

    }

  };

 

  // Load details and resolve the reviewer's name where possible.

  const handleViewDetails = async (request) => {

    setViewingRequest(null);

    setDetailsError("");

    setDetailsLoading(true);

    setRejectingId(null);

    setRejectionNote("");

 

    try {

      const details = await getReturnDetails(

        request.return_history_id

      );

 

      if (!details) {

        throw new Error("Return request details were not found.");

      }

 

      const status = String(

        details.status || request.status || ""

      ).toLowerCase();

 

      let reviewedByName =

        details.reviewed_by_name ||

        details.reviewer_name ||

        details.reviewed_by_user_name ||

        "";

 

      const reviewerId =

        details.reviewed_by_user_id ??

        details.reviewed_by_id ??

        details.reviewed_by;

 

      // Resolve the reviewer only after a decision has been made.

      if (

        ["approved", "rejected"].includes(status) &&

        !reviewedByName &&

        reviewerId != null &&

        /^\d+$/.test(String(reviewerId))

      ) {

        try {

          const userResponse = await getUser(reviewerId);

 

          const reviewer =

            userResponse?.data?.user ||

            userResponse?.data ||

            userResponse?.user;

 

          reviewedByName = reviewer?.name || "";

        } catch (userError) {

          console.error("Fetch reviewer name error:", userError);

        }

      }

 

      if (

        !reviewedByName &&

        typeof reviewerId === "string" &&

        reviewerId.trim() &&

        !/^\d+$/.test(reviewerId.trim())

      ) {

        reviewedByName = reviewerId;

      }

 

      setViewingRequest({

        ...request,

        ...details,

        status,

        reviewed_by_name: reviewedByName,

        district_user_name:

          details.district_user_name ||

          getDistrictUserName(request),

      });

    } catch (err) {

      setDetailsError(

        err.message || "Failed to load return request details."

      );

    } finally {

      setDetailsLoading(false);

    }

  };

 

  const closeDetails = () => {

    if (processingId !== null) return;

 

    setViewingRequest(null);

    setDetailsError("");

    setRejectingId(null);

    setRejectionNote("");

  };

 

  return (

    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">

      <div className="mx-auto max-w-7xl">

        {/* Page header */}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">

              Return Stock

            </h1>

 

            <p className="mt-1 text-sm text-slate-500">

              {isAdmin

                ? "Review and process stock return requests."

                : "View assigned stock, request returns, and track approval status."}

            </p>

          </div>

 

          <button

            type="button"

            onClick={() => loadData({ silent: true })}

            disabled={loading || refreshing}

            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"

          >

            <RefreshCw

              size={16}

              className={refreshing ? "animate-spin" : ""}

            />

            {refreshing ? "Refreshing..." : "Refresh"}

          </button>

        </div>

 

        {/* Feedback */}

        {error && (

          <div

            role="alert"

            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"

          >

            {error}

          </div>

        )}

 

        {success && (

          <div

            role="status"

            className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"

          >

            {success}

          </div>

        )}

 

        {loading ? (

          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">

            Loading return stock information...

          </div>

        ) : isAdmin ? (

          /* ==========================================

             ADMIN / SUPER ADMIN: RETURN REQUESTS

          ========================================== */

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="font-semibold text-slate-900">

                  {statusFilter === "all"

                    ? "All Return Requests"

                    : `${formatStatus(statusFilter)} Return Requests`}

                </h2>

 

                <p className="mt-1 text-sm text-slate-500">

                  Review each request before approving or rejecting it.

                </p>

              </div>

 

              <div className="flex shrink-0 items-center gap-3">

                <label

                  htmlFor="admin-return-status"

                  className="whitespace-nowrap text-sm font-medium text-slate-700"

                >

                  Status:

                </label>

 

                <select

                  id="admin-return-status"

                  value={statusFilter}

                  onChange={(event) =>

                    setStatusFilter(event.target.value)

                  }

                  className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"

                >

                  <option value="pending">Pending</option>

                  <option value="approved">Approved</option>

                  <option value="rejected">Rejected</option>

                  <option value="all">All Statuses</option>

                </select>

              </div>

            </div>

 

            {requests.length === 0 ? (

              <div className="p-10 text-center">

                <p className="font-medium text-slate-700">

                  No{" "}

                  {statusFilter === "all"

                    ? ""

                    : `${formatStatus(statusFilter).toLowerCase()} `}

                  return requests available.

                </p>

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full min-w-[1150px] text-left text-sm">

                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                    <tr>

                      <th className="px-4 py-3">Return No.</th>

                      <th className="px-4 py-3">Issue No.</th>

                      <th className="px-4 py-3">Product</th>

                      <th className="px-4 py-3">Equipment</th>

                      <th className="px-4 py-3">District User</th>

                      <th className="px-4 py-3">Return Qty.</th>

                      <th className="px-4 py-3">Requested At</th>

                      <th className="px-4 py-3">Status</th>

                      <th className="px-4 py-3">Actions</th>

                    </tr>

                  </thead>

 

                  <tbody className="divide-y divide-slate-100">

                    {requests.map((request) => {

                      const isPending =

                        String(request.status || "").toLowerCase() ===

                        "pending";

 

                      return (

                        <tr

                          key={request.return_history_id}

                          className="align-top hover:bg-slate-50"

                        >

                          <td className="px-4 py-4 font-medium text-slate-800">

                            {request.return_no || "-"}

                          </td>

 

                          <td className="px-4 py-4 text-slate-600">

                            {request.issue_no || "-"}

                          </td>

 

                          <td className="px-4 py-4">

                            <p className="font-medium text-slate-800">

                              {request.product_name || "-"}

                            </p>

                            <p className="mt-1 text-xs text-slate-500">

                              {request.brand_name || ""}

                            </p>

                          </td>

 

                          <td className="px-4 py-4 text-slate-600">

                            {request.equipment_type || "-"}

                          </td>

 

                          <td className="px-4 py-4 text-slate-700">

                            {getDistrictUserName(request)}

                          </td>

 

                          <td className="px-4 py-4 font-semibold text-slate-800">

                            {request.return_quantity ?? "-"}

                          </td>

 

                          <td className="px-4 py-4 text-slate-600">

                            {request.requested_at ||

                              request.return_requested_at ||

                              "-"}

                          </td>

 

                          <td className="px-4 py-4">

                            <span

                              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(

                                request.status

                              )}`}

                            >

                              {formatStatus(request.status)}

                            </span>

                          </td>

 

                          {/* Icon actions on the same line */}

                          <td className="px-4 py-4">

                            <div className="flex items-center gap-2 whitespace-nowrap">

                              <button

                                type="button"

                                onClick={() => handleViewDetails(request)}

                                disabled={detailsLoading}

                                title="View Details"

                                aria-label="View Details"

                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"

                              >

                                <Eye size={16} />

                              </button>

 

                              {isPending && (

                                <>

                                  <button

                                    type="button"

                                    onClick={() => handleApprove(request)}

                                    disabled={processingId !== null}

                                    title="Approve Return"

                                    aria-label="Approve Return"

                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600 transition hover:bg-green-100 disabled:opacity-50"

                                  >

                                    <Check size={16} />

                                  </button>

 

                                  <button

                                    type="button"

                                    onClick={() => handleOpenReject(request)}

                                    disabled={processingId !== null}

                                    title="Reject Return"

                                    aria-label="Reject Return"

                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"

                                  >

                                    <X size={16} />

                                  </button>

                                </>

                              )}

                            </div>

 

                            {/* Inline rejection form only when the dialog is closed */}

                            {isPending &&

                              rejectingId === request.return_history_id &&

                              !viewingRequest && (

                                <form

                                  onSubmit={(event) =>

                                    handleReject(event, request)

                                  }

                                  className="mt-3 min-w-64 space-y-2"

                                >

                                  <label className="block text-xs font-medium text-slate-700">

                                    Rejection reason

                                  </label>

 

                                  <textarea

                                    value={rejectionNote}

                                    onChange={(event) =>

                                      setRejectionNote(event.target.value)

                                    }

                                    rows={3}

                                    maxLength={1000}

                                    required

                                    placeholder="Explain why this request is rejected..."

                                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"

                                  />

 

                                  <div className="flex gap-2">

                                    <button

                                      type="submit"

                                      disabled={

                                        processingId !== null ||

                                        !rejectionNote.trim()

                                      }

                                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"

                                    >

                                      Confirm Reject

                                    </button>

 

                                    <button

                                      type="button"

                                      onClick={() => {

                                        setRejectingId(null);

                                        setRejectionNote("");

                                      }}

                                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"

                                    >

                                      Cancel

                                    </button>

                                  </div>

                                </form>

                              )}

                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        ) : (

          /* ==========================================

             DISTRICT USER: ASSIGNED STOCK

          ========================================== */

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="font-semibold text-slate-900">

                  My Assigned Stock

                </h2>

 

                <p className="mt-1 text-sm text-slate-500">

                  Submit return requests for eligible items and track their

                  status.

                </p>

              </div>

 

              <div className="flex shrink-0 items-center gap-3">

                <label

                  htmlFor="district-return-status"

                  className="whitespace-nowrap text-sm font-medium text-slate-700"

                >

                  Status:

                </label>

 

                <select

                  id="district-return-status"

                  value={statusFilter}

                  onChange={(event) =>

                    setStatusFilter(event.target.value)

                  }

                  className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"

                >

                  <option value="all">All Statuses</option>

                  <option value="not_returned">Not Returned</option>

                  <option value="pending">Pending</option>

                  <option value="approved">Approved</option>

                  <option value="rejected">Rejected</option>

                </select>

              </div>

            </div>

 

            {items.length === 0 ? (

              <div className="p-10 text-center text-sm text-slate-500">

                No assigned stock items available.

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full min-w-[1100px] text-left text-sm">

                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                    <tr>

                      <th className="px-4 py-3">Issue No.</th>

                      <th className="px-4 py-3">Product</th>

                      <th className="px-4 py-3">Equipment</th>

                      <th className="px-4 py-3">Issued Qty.</th>

                      <th className="px-4 py-3">Return Qty.</th>

                      <th className="px-4 py-3">Return No.</th>

                      <th className="px-4 py-3">Requested At</th>

                      <th className="px-4 py-3">Status</th>

                      <th className="px-4 py-3">Rejection Reason</th>

                      <th className="px-4 py-3">Action</th>

                    </tr>

                  </thead>

 

                  <tbody className="divide-y divide-slate-100">

                    {items.map((item) => {

                      const status = String(

                        item.status || "not_returned"

                      ).toLowerCase();

 

                      const canRequest =

                        status === "not_returned" ||

                        status === "rejected";

 

                      return (

                        <tr

                          key={`${item.inventory_id}-${item.issue_id}`}

                          className="align-top hover:bg-slate-50"

                        >

                          <td className="px-4 py-4 font-medium text-slate-800">

                            {item.issue_no || "-"}

                          </td>

 

                          <td className="px-4 py-4">

                            <p className="font-medium text-slate-800">

                              {item.product_name || "-"}

                            </p>

                            <p className="mt-1 text-xs text-slate-500">

                              {item.brand_name || ""}

                            </p>

                          </td>

 

                          <td className="px-4 py-4 text-slate-600">

                            {item.equipment_type || "-"}

                          </td>

 

                          <td className="px-4 py-4 text-slate-600">

                            {item.issued_quantity ?? "-"}

                          </td>

 

                          <td className="px-4 py-4 text-slate-600">

                            {item.return_quantity ?? "-"}

                          </td>

 

                          <td className="px-4 py-4 text-slate-600">

                            {item.return_no || "-"}

                          </td>

 

                          <td className="px-4 py-4 text-slate-600">

                            {item.return_requested_at || "-"}

                          </td>

 

                          <td className="px-4 py-4">

                            <span

                              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(

                                status

                              )}`}

                            >

                              {formatStatus(status)}

                            </span>

                          </td>

 

                          <td className="max-w-56 whitespace-normal px-4 py-4 text-sm text-red-700">

                            {status === "rejected"

                              ? item.rejection_note || "-"

                              : "-"}

                          </td>

 

                          <td className="px-4 py-4">

                            {canRequest ? (

                              <button

                                type="button"

                                onClick={() => {

                                  setError("");

                                  setSuccess("");

                                  setSelectedItem(item);

                                  setReturnQuantity("1");

                                }}

                                className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"

                              >

                                {status === "rejected"

                                  ? "Request Again"

                                  : "Request Return"}

                              </button>

                            ) : status === "pending" ? (

                              <span className="whitespace-nowrap text-xs font-medium text-amber-700">

                                Awaiting approval

                              </span>

                            ) : (

                              <span className="text-xs text-slate-400">

                                No action

                              </span>

                            )}

                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        )}

 

        {/* District user: request-return dialog */}

        {!isAdmin && selectedItem && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">

            <form

              onSubmit={handleRequestReturn}

              className="w-full max-w-lg rounded-xl bg-white shadow-xl"

            >

              <div className="border-b border-slate-100 px-5 py-4">

                <h2 className="text-lg font-semibold text-slate-900">

                  Request Stock Return

                </h2>

 

                <p className="mt-1 text-sm text-slate-500">

                  This request will be sent to Admin/Super Admin for approval.

                </p>

              </div>

 

              <div className="space-y-4 p-5">

                <div className="rounded-lg bg-slate-50 p-4">

                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">

                    Product

                  </p>

 

                  <p className="mt-1 font-semibold text-slate-800">

                    {selectedItem.product_name || "-"}

                  </p>

 

                  <p className="mt-2 text-sm text-slate-600">

                    Issue: {selectedItem.issue_no || "-"}

                  </p>

 

                  <p className="text-sm text-slate-600">

                    Issued quantity:{" "}

                    {selectedItem.issued_quantity ?? "-"}

                  </p>

                </div>

 

                <div>

                  <label

                    htmlFor="return-quantity"

                    className="mb-2 block text-sm font-medium text-slate-700"

                  >

                    Return Quantity

                  </label>

 

                  <input

                    id="return-quantity"

                    type="number"

                    min="1"

                    step="1"

                    required

                    value={returnQuantity}

                    onChange={(event) =>

                      setReturnQuantity(event.target.value)

                    }

                    className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"

                  />

 

                  <p className="mt-2 text-xs text-slate-500">

                    The backend should validate the quantity eligible for return.

                  </p>

                </div>

              </div>

 

              <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">

                <button

                  type="button"

                  onClick={() => {

                    setSelectedItem(null);

                    setReturnQuantity("1");

                  }}

                  disabled={submitting}

                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"

                >

                  Cancel

                </button>

 

                <button

                  type="submit"

                  disabled={

                    submitting ||

                    !Number.isInteger(Number(returnQuantity)) ||

                    Number(returnQuantity) <= 0

                  }

                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"

                >

                  {submitting ? "Submitting..." : "Submit Request"}

                </button>

              </div>

            </form>

          </div>

        )}

 

        {/* ==========================================

            VIEW RETURN REQUEST DETAILS DIALOG

        ========================================== */}

        {(detailsLoading || detailsError || viewingRequest) && (

          <div

            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"

            onClick={closeDetails}

          >

            <div

              role="dialog"

              aria-modal="true"

              aria-labelledby="return-details-title"

              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl"

              onClick={(event) => event.stopPropagation()}

            >

              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

                <div>

                  <h2

                    id="return-details-title"

                    className="text-lg font-semibold text-slate-900"

                  >

                    Return Request Details

                  </h2>

 

                  <p className="mt-1 text-sm text-slate-500">

                    Complete information about this stock return.

                  </p>

                </div>

 

                <button

                  type="button"

                  onClick={closeDetails}

                  disabled={processingId !== null}

                  aria-label="Close dialog"

                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"

                >

                  <X size={20} />

                </button>

              </div>

 

              <div className="p-5">

                {detailsLoading ? (

                  <div className="py-10 text-center text-sm text-slate-500">

                    Loading return request details...

                  </div>

                ) : detailsError ? (

                  <div

                    role="alert"

                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"

                  >

                    {detailsError}

                  </div>

                ) : viewingRequest ? (

                  <>

                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

                      <div>

                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">

                          Return Number

                        </p>

 

                        <p className="mt-1 font-semibold text-slate-900">

                          {viewingRequest.return_no || "-"}

                        </p>

                      </div>

 

                      <span

                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(

                          viewingRequest.status

                        )}`}

                      >

                        {formatStatus(viewingRequest.status)}

                      </span>

                    </div>

 

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                      {[

                        [

                          "Return History ID",

                          viewingRequest.return_history_id,

                        ],

                        [

                          "District User",

                          viewingRequest.district_user_name ||

                            getDistrictUserName(viewingRequest),

                        ],

                        [

                          "District User ID",

                          viewingRequest.district_user_id,

                        ],

                        ["Issue Number", viewingRequest.issue_no],

                        ["Issue ID", viewingRequest.issue_id],

                        ["Issue Date", viewingRequest.issue_date],

                        ["Product", viewingRequest.product_name],

                        ["Brand", viewingRequest.brand_name],

                        ["Equipment Type", viewingRequest.equipment_type],

                        ["Equipment ID", viewingRequest.equipment_id],

                        ["Inventory ID", viewingRequest.inventory_id],

                        ["Issued Quantity", viewingRequest.issued_quantity],

                        ["Return Quantity", viewingRequest.return_quantity],

                        ["Quantity Before", viewingRequest.quantity_before],

                        ["Quantity After", viewingRequest.quantity_after],

                        ["Storage Location", viewingRequest.storage_location],

                        ["Source Location", viewingRequest.source_location],

                        [

                          "Destination Location",

                          viewingRequest.destination_location,

                        ],

                        ["Issue Status", viewingRequest.issue_status],

                        [

                          "Requested At",

                          viewingRequest.requested_at ||

                            viewingRequest.return_requested_at,

                        ],

                      ].map(([label, value]) => (

                        <div

                          key={label}

                          className="rounded-lg border border-slate-200 p-3"

                        >

                          <p className="text-xs font-medium text-slate-500">

                            {label}

                          </p>

 

                          <p className="mt-1 break-words text-sm font-medium text-slate-800">

                            {value !== null &&

                            value !== undefined &&

                            value !== ""

                              ? String(value)

                              : "-"}

                          </p>

                        </div>

                      ))}

 

                      {/* Reviewer is only relevant after a decision. */}

                      {["approved", "rejected"].includes(

                        String(viewingRequest.status || "").toLowerCase()

                      ) && (

                        <div className="rounded-lg border border-slate-200 p-3">

                          <p className="text-xs font-medium text-slate-500">

                            Reviewed By

                          </p>

 

                          <p className="mt-1 break-words text-sm font-medium text-slate-800">

                            {viewingRequest.reviewed_by_name ||

                              "Name unavailable"}

                          </p>

                        </div>

                      )}

 

                      {/* Rejection reason is shown only for rejected requests. */}

                      {String(viewingRequest.status || "").toLowerCase() ===

                        "rejected" && (

                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 sm:col-span-2 lg:col-span-3">

                          <p className="text-xs font-semibold text-red-700">

                            Rejection Reason

                          </p>

 

                          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-red-800">

                            {viewingRequest.rejection_note ||

                              "No rejection reason was provided."}

                          </p>

                        </div>

                      )}

                    </div>

                  </>

                ) : null}

              </div>

 

              {/* Dialog actions */}

              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4">

                {viewingRequest &&

                  String(viewingRequest.status || "").toLowerCase() ===

                    "pending" && (

                    <>

                      {rejectingId ===

                        viewingRequest.return_history_id && (

                        <form

                          onSubmit={(event) =>

                            handleReject(event, viewingRequest)

                          }

                          className="space-y-2"

                        >

                          <label

                            htmlFor="dialog-rejection-reason"

                            className="block text-sm font-medium text-slate-700"

                          >

                            Rejection reason

                          </label>

 

                          <textarea

                            id="dialog-rejection-reason"

                            value={rejectionNote}

                            onChange={(event) =>

                              setRejectionNote(event.target.value)

                            }

                            rows={3}

                            maxLength={1000}

                            required

                            placeholder="Explain why this request is rejected..."

                            className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"

                          />

 

                          <button

                            type="submit"

                            disabled={

                              processingId !== null ||

                              !rejectionNote.trim()

                            }

                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"

                          >

                            {processingId ===

                            viewingRequest.return_history_id

                              ? "Rejecting..."

                              : "Confirm Rejection"}

                          </button>

                        </form>

                      )}

 

                      <div className="flex flex-wrap items-center justify-end gap-2">

                        <button

                          type="button"

                          onClick={() => handleApprove(viewingRequest)}

                          disabled={processingId !== null}

                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"

                        >

                          <Check size={16} />

                          Approve

                        </button>

 

                        <button

                          type="button"

                          onClick={() => handleOpenReject(viewingRequest)}

                          disabled={processingId !== null}

                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"

                        >

                          <X size={16} />

                          Reject

                        </button>

 

                        <button

                          type="button"

                          onClick={closeDetails}

                          disabled={processingId !== null}

                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"

                        >

                          Close

                        </button>

                      </div>

                    </>

                  )}

 

                {viewingRequest &&

                  String(viewingRequest.status || "").toLowerCase() !==

                    "pending" && (

                    <div className="flex justify-end">

                      <button

                        type="button"

                        onClick={closeDetails}

                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"

                      >

                        Close

                      </button>

                    </div>

                  )}

 

                {!viewingRequest && detailsError && (

                  <div className="flex justify-end">

                    <button

                      type="button"

                      onClick={closeDetails}

                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"

                    >

                      Close

                    </button>

                  </div>

                )}

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}

 

export default ReturnStock;