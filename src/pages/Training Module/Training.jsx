import { useEffect, useState } from "react";

import {
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

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

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_items: 0,
    total_pages: 1,
    has_next_page: false,
    has_previous_page: false,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(initialForm);

  // ========================================
  // Date formatting
  // ========================================

  const formatDateForInput = (date) => {
    if (!date) return "";

    return date.substring(0, 16).replace(" ", "T");
  };

  const formatDateForApi = (date) => {
    if (!date) return "";

    return `${date.replace("T", " ")}:00`;
  };

  // ========================================
  // Fetch trainings
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
        response.data?.training_events || []
      );

      setPagination(
        response.data?.pagination || {}
      );
    } catch (err) {
      setError(
        err.message || "Failed to load trainings"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, [page]);

  // ========================================
  // Search
  // ========================================

  const handleSearch = async (e) => {
    e.preventDefault();

    if (page !== 1) {
      setPage(1);
      return;
    }

    fetchTrainings();
  };

  // ========================================
  // Form change
  // ========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ========================================
  // Add
  // ========================================

  const handleAdd = () => {
    setEditingId(null);
    setFormData(initialForm);

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  // ========================================
  // View
  // ========================================

  const handleView = async (id) => {
    try {
      setLoading(true);
      setError("");

      const response =
        await getTrainingById(id);

      const training = response.data;

      window.alert(
        `Training Details\n\n` +
          `ID: ${training.training_event_id}\n` +
          `Name: ${training.event_name}\n` +
          `Mode: ${training.event_mode}\n` +
          `Location: ${
            training.event_location || "N/A"
          }\n` +
          `Start: ${training.start_date}\n` +
          `End: ${training.end_date}\n` +
          `Organizer: ${training.event_organizer}`
      );
    } catch (err) {
      setError(
        err.message || "Failed to get training"
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // Edit
  // ========================================

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      setError("");

      const response =
        await getTrainingById(id);

      const training = response.data;

      setEditingId(id);

      setFormData({
        event_name: training.event_name || "",
        description: training.description || "",
        event_mode:
          training.event_mode || "offline",
        event_location:
          training.event_location || "",
        start_date: formatDateForInput(
          training.start_date
        ),
        end_date: formatDateForInput(
          training.end_date
        ),
        event_organizer:
          training.event_organizer || "",
      });

      setShowModal(true);
    } catch (err) {
      setError(
        err.message || "Failed to get training"
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // Create / Update
  // ========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        event_name: formData.event_name,
        description: formData.description,
        event_mode: formData.event_mode,
        event_location:
          formData.event_mode === "online"
            ? null
            : formData.event_location,
        start_date: formatDateForApi(
          formData.start_date
        ),
        end_date: formatDateForApi(
          formData.end_date
        ),
        event_organizer:
          formData.event_organizer,
      };

      let response;

      if (editingId) {
        response = await updateTraining(
          editingId,
          payload
        );
      } else {
        response =
          await createTraining(payload);
      }

      setSuccess(
        response.message ||
          "Training saved successfully."
      );

      setShowModal(false);
      setEditingId(null);
      setFormData(initialForm);

      await fetchTrainings();
    } catch (err) {
      setError(
        err.message || "Failed to save training"
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // Delete
  // ========================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
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
        response.message ||
          "Training deleted successfully."
      );

      await fetchTrainings();
    } catch (err) {
      setError(
        err.message || "Failed to delete training"
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // Close modal
  // ========================================

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingId(null);
    setFormData(initialForm);
  };

  // ========================================
  // UI
  // ========================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
            Training Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create and manage disaster response
            training events.
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Add Training
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-5 rounded-xl bg-white p-4 shadow-sm">

        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search training events..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-900"
          >
            Search
          </button>

          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Statistics */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Trainings
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {pagination.total_items || 0}
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
            {pagination.total_pages || 1}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] table-auto">

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

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Location
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

                <th className="sticky right-0 z-20 w-[180px] bg-slate-50 px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                trainings.map((training, index) => (
                  <tr
                    key={training.training_event_id}
                    className="transition hover:bg-slate-50"
                  >

                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                        {(page - 1) * pagination.limit + index + 1}

                    </td>

                    <td className="min-w-[260px] px-4 py-4">
                        <p className="font-semibold text-slate-800">
                          {training.event_name}
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {training.description}
                        </p>
                      </td>

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

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {training.event_location ||
                        "N/A"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {training.start_date}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {training.end_date}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {training.event_organizer}
                    </td>

                          <td className="sticky right-0 z-10 w-[150px] bg-white px-4 py-4">
                            <div className="flex items-center justify-center gap-2">

                              {/* View */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleView(training.training_event_id)
                                }
                                title="View Training"
                                aria-label="View Training"
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-800"
                              >
                                <Eye size={17} />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleEdit(training.training_event_id)
                                }
                                title="Edit Training"
                                aria-label="Edit Training"
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 transition hover:bg-amber-200 hover:text-amber-700"
                              >
                                <Pencil size={17} />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(training.training_event_id)
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
                ))
              )}

            </tbody>

          </table>

        </div>
      </div>

      {/* Pagination */}
      <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">

        <p className="text-sm text-slate-500">
          Showing{" "}
          {trainings.length} of{" "}
          {pagination.total_items || 0} trainings
        </p>

        <div className="flex items-center gap-2">

          <button
            disabled={
              !pagination.has_previous_page ||
              loading
            }
            onClick={() =>
              setPage((prev) => prev - 1)
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>

          <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            {pagination.page || 1} /{" "}
            {pagination.total_pages || 1}
          </span>

          <button
            disabled={
              !pagination.has_next_page ||
              loading
            }
            onClick={() =>
              setPage((prev) => prev + 1)
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>

        </div>
      </div>

      {/* ========================================
          ADD / EDIT MODAL
      ======================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">

              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId
                    ? "Edit Training"
                    : "Add Training"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingId
                    ? "Update training event details"
                    : "Create a new training event"}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Event Name
                </label>

                <input
                  type="text"
                  name="event_name"
                  value={formData.event_name}
                  onChange={handleChange}
                  placeholder="Advanced Flood Response Training"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Three-day practical training programme for disaster response volunteers"
                  rows={4}
                  required
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Mode */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Event Mode
                </label>

                <select
                  name="event_mode"
                  value={formData.event_mode}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

              {/* Location */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Event Location
                </label>

                <input
                  type="text"
                  name="event_location"
                  value={formData.event_location}
                  onChange={handleChange}
                  disabled={
                    formData.event_mode ===
                    "online"
                  }
                  placeholder="District Training Centre, Alipurduar"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />

                {formData.event_mode ===
                  "online" && (
                  <p className="mt-1 text-xs text-slate-500">
                    Location is not required for
                    online events.
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Start Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    End Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>

              {/* Organizer */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Event Organizer
                </label>

                <input
                  type="text"
                  name="event_organizer"
                  value={formData.event_organizer}
                  onChange={handleChange}
                  placeholder="District Disaster Management Authority"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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