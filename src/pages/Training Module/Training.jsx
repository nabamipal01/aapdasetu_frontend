
import { useEffect, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";

import {
  createTraining,
  getTrainings,
  getTrainingById,
  updateTraining,
  deleteTraining,
} from "../../services/trainingService";

const initialForm = {
  event_name: "",
  description: "",
  event_mode: "offline",
  event_location: "",
  meeting_link: "",
  start_date: "",
  end_date: "",
  event_organizer: "",
};

function Training() {
  const [trainings, setTrainings] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [viewTraining, setViewTraining] = useState(null);

  const [formData, setFormData] = useState({
    ...initialForm,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_items: 0,
    total_pages: 1,
    has_next_page: false,
    has_previous_page: false,
  });

  // ========================================
  // DATE FORMATTING
  // ========================================

  const formatDateForInput = (date) => {
    if (!date) return "";

    return String(date)
      .replace(" ", "T")
      .substring(0, 16);
  };

  const formatDateForApi = (date) => {
    if (!date) return "";

    const value = String(date);

    if (value.includes("T")) {
      return `${value.replace("T", " ")}:00`;
    }

    return value;
  };

  // ========================================
  // FETCH TRAININGS
  // ========================================

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getTrainings(
        page,
        10,
        search
      );

      setTrainings(
        response?.data?.training_events || []
      );

      setPagination(
        response?.data?.pagination || {
          page: 1,
          limit: 10,
          total_items: 0,
          total_pages: 1,
          has_next_page: false,
          has_previous_page: false,
        }
      );
    } catch (err) {
      console.error("FETCH TRAININGS ERROR:", err);

      setError(
        err?.message ||
          "Failed to load training events"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, [page]);

  // ========================================
  // SEARCH
  // ========================================

  const handleSearch = async (e) => {
    e.preventDefault();

    if (page !== 1) {
      setPage(1);
      return;
    }

    await fetchTrainings();
  };

  const handleClearSearch = () => {
    setSearch("");

    if (page !== 1) {
      setPage(1);
    } else {
      fetchTrainings();
    }
  };

  // ========================================
  // FORM CHANGE
  // ========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ========================================
  // ADD
  // ========================================

  const handleAdd = () => {
    setEditingId(null);

    setFormData({
      ...initialForm,
    });

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  // ========================================
  // VIEW
  // ========================================

  const handleView = async (id) => {
    try {
      setLoading(true);
      setError("");

      console.log("VIEW ID:", id);

      const response = await getTrainingById(id);

      console.log("VIEW RESPONSE:", response);

      /*
        API response:

        {
          success: true,
          message: "...",
          data: {
            training_event_id: 1,
            event_name: "...",
            ...
          }
        }

        Therefore training = response.data
      */

      const training =
        response?.data?.data ??
        response?.data?.training_event ??
        response?.data;

      console.log(
        "TRAINING TO DISPLAY:",
        training
      );

      if (
        !training ||
        !training.event_name
      ) {
        throw new Error(
          "Training data not found"
        );
      }

      setViewTraining(training);
      setShowViewModal(true);
    } catch (err) {
      console.error(
        "VIEW TRAINING ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to get training"
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // EDIT
  // ========================================

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      console.log("EDIT ID:", id);

      const response =
        await getTrainingById(id);

      console.log(
        "EDIT RESPONSE:",
        response
      );

      const training =
        response?.data?.data ??
        response?.data?.training_event ??
        response?.data;

      console.log(
        "EDIT TRAINING:",
        training
      );

      if (!training) {
        throw new Error(
          "Training data not found"
        );
      }

      setEditingId(id);

      setFormData({
        event_name:
          training.event_name ?? "",

        description:
          training.description ?? "",

        event_mode:
          training.event_mode ??
          "offline",

        event_location:
          training.event_location ?? "",

        meeting_link:
          training.meeting_link ?? "",

        start_date:
          formatDateForInput(
            training.start_date
          ),

        end_date:
          formatDateForInput(
            training.end_date
          ),

        event_organizer:
          training.event_organizer ?? "",
      });

      setShowModal(true);
    } catch (err) {
      console.error(
        "EDIT TRAINING ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to get training"
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // CREATE / UPDATE
  // ========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // -----------------------------
      // VALIDATION
      // -----------------------------

      if (
        !formData.event_name.trim()
      ) {
        throw new Error(
          "Event name is required."
        );
      }

      if (
        formData.event_mode ===
          "offline" &&
        !formData.event_location.trim()
      ) {
        throw new Error(
          "Location is required for offline training."
        );
      }

      if (
        formData.event_mode ===
          "online" &&
        !formData.meeting_link.trim()
      ) {
        throw new Error(
          "Meeting link is required for online training."
        );
      }

      if (
        formData.event_mode ===
          "hybrid" &&
        !formData.event_location.trim()
      ) {
        throw new Error(
          "Location is required for hybrid training."
        );
      }

      if (
        formData.event_mode ===
          "hybrid" &&
        !formData.meeting_link.trim()
      ) {
        throw new Error(
          "Meeting link is required for hybrid training."
        );
      }

      // -----------------------------
      // PAYLOAD
      // -----------------------------

      const payload = {
        event_name:
          formData.event_name.trim(),

        description:
          formData.description.trim(),

        event_mode:
          formData.event_mode,

        /*
          OFFLINE:
          location = value
          meeting_link = null

          ONLINE:
          location = null
          meeting_link = value

          HYBRID:
          location = value
          meeting_link = value
        */

        event_location:
          formData.event_mode ===
            "online"
            ? null
            : formData.event_location.trim(),

        meeting_link:
          formData.event_mode ===
            "offline"
            ? null
            : formData.meeting_link.trim(),

        start_date:
          formatDateForApi(
            formData.start_date
          ),

        end_date:
          formatDateForApi(
            formData.end_date
          ),

        event_organizer:
          formData.event_organizer.trim(),
      };

      console.log(
        "TRAINING PAYLOAD:",
        payload
      );

      let response;

      if (editingId) {
        response =
          await updateTraining(
            editingId,
            payload
          );
      } else {
        response =
          await createTraining(
            payload
          );
      }

      console.log(
        "SAVE RESPONSE:",
        response
      );

      setSuccess(
        response?.message ||
          "Training saved successfully."
      );

      setShowModal(false);
      setEditingId(null);

      setFormData({
        ...initialForm,
      });

      await fetchTrainings();
    } catch (err) {
      console.error(
        "SAVE TRAINING ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to save training"
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // DELETE
  // ========================================

  const handleDelete = async (id) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this training event?"
      );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response =
        await deleteTraining(id);

      setSuccess(
        response?.message ||
          "Training deleted successfully."
      );

      await fetchTrainings();
    } catch (err) {
      console.error(
        "DELETE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to delete training"
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // CLOSE ADD / EDIT MODAL
  // ========================================

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingId(null);

    setFormData({
      ...initialForm,
    });
  };

  // ========================================
  // CLOSE VIEW MODAL
  // ========================================

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewTraining(null);
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">

      {/* =====================================
          HEADER
      ====================================== */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
            Training Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create and manage disaster response training events.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Add Training
        </button>

      </div>

      {/* =====================================
          SUCCESS
      ====================================== */}

      {success && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* =====================================
          ERROR
      ====================================== */}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =====================================
          SEARCH
      ====================================== */}

      <div className="mb-5 rounded-xl bg-white p-4 shadow-sm">

        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 sm:flex-row"
        >

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search training events..."
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <button
            type="submit"
            className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-900"
          >
            Search
          </button>

          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          )}

        </form>

      </div>

      {/* =====================================
          STATISTICS
      ====================================== */}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Trainings
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {pagination.total_items ||
              0}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Current Page
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-600">
            {pagination.page || 1}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Pages
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {pagination.total_pages ||
              1}
          </p>
        </div>

      </div>

      {/* =====================================
          TABLE
      ====================================== */}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">

        <div className="w-full overflow-x-auto">

          <table className="w-full min-w-[1000px] table-auto">

            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">

                <th className="w-[70px] px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  S.No.
                </th>

                <th className="min-w-[260px] px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Training
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mode
                </th>

                <th className="min-w-[230px] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Location / Meeting
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Start
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  End
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Organizer
                </th>

                <th className="sticky right-0 z-20 w-[150px] bg-slate-50 px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    Loading training events...
                  </td>
                </tr>
              ) : trainings.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    No training events found.
                  </td>
                </tr>
              ) : (
                trainings.map(
                  (training, index) => (
                    <tr
                      key={
                        training.training_event_id
                      }
                      className="transition hover:bg-slate-50"
                    >

                      {/* S.No */}
                      <td className="px-5 py-4 text-sm font-medium text-slate-700">
                        {(page - 1) *
                          pagination.limit +
                          index +
                          1}
                      </td>

                      {/* Training */}
                      <td className="min-w-[260px] px-4 py-4">

                        <p className="font-semibold text-slate-800">
                          {training.event_name}
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {training.description ||
                            "No description"}
                        </p>

                      </td>

                      {/* Mode */}
                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            training.event_mode ===
                            "online"
                              ? "bg-green-100 text-green-700"
                              : training.event_mode ===
                                  "hybrid"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {training.event_mode}
                        </span>

                      </td>

                      {/* LOCATION / MEETING */}
                      <td className="px-5 py-4 text-sm text-slate-600">

                        {/* OFFLINE */}
                        {training.event_mode ===
                          "offline" && (
                          <div>
                            <p className="font-medium text-slate-700">
                              Location
                            </p>

                            <p className="mt-1">
                              {training.event_location ||
                                "N/A"}
                            </p>
                          </div>
                        )}

                        {/* ONLINE */}
                        {training.event_mode ===
                          "online" && (
                          <div>
                            <p className="font-medium text-slate-700">
                              Online
                            </p>

                            {training.meeting_link ? (
                              <a
                                href={
                                  training.meeting_link
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block text-blue-600 hover:underline"
                              >
                                Join Meeting
                              </a>
                            ) : (
                              <p className="mt-1 text-slate-400">
                                No meeting link
                              </p>
                            )}
                          </div>
                        )}

                        {/* HYBRID */}
                        {training.event_mode ===
                          "hybrid" && (
                          <div className="space-y-1">

                            <div>
                              <span className="font-medium">
                                Location:
                              </span>{" "}
                              {training.event_location ||
                                "N/A"}
                            </div>

                            {training.meeting_link ? (
                              <a
                                href={
                                  training.meeting_link
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block text-blue-600 hover:underline"
                              >
                                Join Meeting
                              </a>
                            ) : (
                              <span className="text-slate-400">
                                No meeting link
                              </span>
                            )}

                          </div>
                        )}

                      </td>

                      {/* Start */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {training.start_date}
                      </td>

                      {/* End */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {training.end_date}
                      </td>

                      {/* Organizer */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {training.event_organizer}
                      </td>

                      {/* Actions */}
                      <td className="sticky right-0 z-10 w-[150px] bg-white px-4 py-4">

                        <div className="flex items-center justify-center gap-2">

                          {/* VIEW */}
                          <button
                            type="button"
                            onClick={() =>
                              handleView(
                                training.training_event_id
                              )
                            }
                            title="View Training"
                            aria-label="View Training"
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-800"
                          >
                            <Eye size={17} />
                          </button>

                          {/* EDIT */}
                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                training.training_event_id
                              )
                            }
                            title="Edit Training"
                            aria-label="Edit Training"
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 transition hover:bg-amber-200 hover:text-amber-700"
                          >
                            <Pencil size={17} />
                          </button>

                          {/* DELETE */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                training.training_event_id
                              )
                            }
                            title="Delete Training"
                            aria-label="Delete Training"
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 transition hover:bg-red-200 hover:text-red-700"
                          >
                            <Trash2 size={17} />
                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* =====================================
          PAGINATION
      ====================================== */}

      <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">

        <p className="text-sm text-slate-500">
          Showing{" "}
          {trainings.length} of{" "}
          {pagination.total_items ||
            0}{" "}
          trainings
        </p>

        <div className="flex items-center gap-2">

          <button
            disabled={
              !pagination.has_previous_page ||
              loading
            }
            onClick={() =>
              setPage(
                (prev) => prev - 1
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>

          <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            {pagination.page || 1} /{" "}
            {pagination.total_pages ||
              1}
          </span>

          <button
            disabled={
              !pagination.has_next_page ||
              loading
            }
            onClick={() =>
              setPage(
                (prev) => prev + 1
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>

        </div>

      </div>

      {/* =====================================
          VIEW MODAL
      ====================================== */}

      {showViewModal &&
        viewTraining && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

            <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Training Details
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    View training event information
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeViewModal
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  ×
                </button>

              </div>

              {/* Details */}
              <div className="space-y-5 p-6">

                {/* Event Name */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Event Name
                  </p>

                  <p className="mt-1 text-base font-semibold text-slate-800">
                    {viewTraining.event_name ||
                      "N/A"}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Description
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {viewTraining.description ||
                      "N/A"}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  {/* Mode */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Event Mode
                    </p>

                    <p className="mt-1 text-sm font-medium capitalize text-slate-800">
                      {viewTraining.event_mode ||
                        "N/A"}
                    </p>
                  </div>

                  {/* Location */}
                  {(viewTraining.event_mode ===
                    "offline" ||
                    viewTraining.event_mode ===
                      "hybrid") && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Location
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {viewTraining.event_location ||
                          "N/A"}
                      </p>
                    </div>
                  )}

                  {/* Meeting Link */}
                  {(viewTraining.event_mode ===
                    "online" ||
                    viewTraining.event_mode ===
                      "hybrid") && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Meeting Link
                      </p>

                      {viewTraining.meeting_link ? (
                        <a
                          href={
                            viewTraining.meeting_link
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block break-all text-sm font-medium text-blue-600 hover:underline"
                        >
                          {
                            viewTraining.meeting_link
                          }
                        </a>
                      ) : (
                        <p className="mt-1 text-sm text-slate-400">
                          No meeting link
                        </p>
                      )}
                    </div>
                  )}

                  {/* Start */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Start Date
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {viewTraining.start_date ||
                        "N/A"}
                    </p>
                  </div>

                  {/* End */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      End Date
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {viewTraining.end_date ||
                        "N/A"}
                    </p>
                  </div>

                </div>

                {/* Organizer */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Organizer
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {viewTraining.event_organizer ||
                      "N/A"}
                  </p>
                </div>

                {/* Training ID */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Training ID
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {viewTraining.training_event_id ||
                      "N/A"}
                  </p>
                </div>

                {/* Close */}
                <div className="flex justify-end border-t border-slate-200 pt-5">

                  <button
                    type="button"
                    onClick={
                      closeViewModal
                    }
                    className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-900"
                  >
                    Close
                  </button>

                </div>

              </div>

            </div>

          </div>
        )}

      {/* =====================================
          ADD / EDIT MODAL
      ====================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <div>

                <h2 className="text-xl font-bold text-slate-800">
                  {editingId
                    ? "Edit Training"
                    : "Add Training"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingId
                    ? "Update training event information"
                    : "Create a new training event"}
                </p>

              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                ×
              </button>

            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              {/* Event Name */}
              <div>

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Event Name
                </label>

                <input
                  type="text"
                  name="event_name"
                  value={
                    formData.event_name
                  }
                  onChange={
                    handleChange
                  }
                  required
                  placeholder="Enter event name"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

              {/* Description */}
              <div>

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    formData.description
                  }
                  onChange={
                    handleChange
                  }
                  rows={4}
                  placeholder="Enter training description"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

              {/* Event Mode */}
              <div>

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Event Mode
                </label>

                <select
                  name="event_mode"
                  value={
                    formData.event_mode
                  }
                  onChange={
                    handleChange
                  }
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >

                  <option value="offline">
                    Offline
                  </option>

                  <option value="online">
                    Online
                  </option>

                  <option value="hybrid">
                    Hybrid
                  </option>

                </select>

              </div>

              {/* =================================
                  OFFLINE / HYBRID LOCATION
              ================================== */}

              {(formData.event_mode ===
                "offline" ||
                formData.event_mode ===
                  "hybrid") && (
                <div>

                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Location
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    name="event_location"
                    value={
                      formData.event_location
                    }
                    onChange={
                      handleChange
                    }
                    required
                    placeholder="Enter physical event location"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Enter the physical venue where the training will take place.
                  </p>

                </div>
              )}

              {/* =================================
                  ONLINE / HYBRID MEETING LINK
              ================================== */}

              {(formData.event_mode ===
                "online" ||
                formData.event_mode ===
                  "hybrid") && (
                <div>

                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Meeting Link
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="url"
                    name="meeting_link"
                    value={
                      formData.meeting_link
                    }
                    onChange={
                      handleChange
                    }
                    required
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Enter the online meeting URL.
                  </p>

                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* Start */}
                <div>

                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Start Date
                  </label>

                  <input
                    type="datetime-local"
                    name="start_date"
                    value={
                      formData.start_date
                    }
                    onChange={
                      handleChange
                    }
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                {/* End */}
                <div>

                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    End Date
                  </label>

                  <input
                    type="datetime-local"
                    name="end_date"
                    value={
                      formData.end_date
                    }
                    onChange={
                      handleChange
                    }
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

              </div>

              {/* Organizer */}
              <div>

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Organizer
                </label>

                <input
                  type="text"
                  name="event_organizer"
                  value={
                    formData.event_organizer
                  }
                  onChange={
                    handleChange
                  }
                  required
                  placeholder="Enter organizer name"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Training"
                      : "Create Training"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default Training;
