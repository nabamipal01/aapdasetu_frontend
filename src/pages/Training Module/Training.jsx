
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  CalendarDays,
  Clock3,
  Eye,
  Link2,
  MapPin,
  Monitor,
  Pencil,
  Trash2,
  UserRound,
  Users,
  Map,
  X,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  createTraining,
  getTrainings,
  getTrainingById,
  updateTraining,
  deleteTraining,
} from "../../services/trainingService";

import { listDistricts } from "../../services/districtService";
import { addTrainingNotification } from "../../utils/trainingNotifications";

const TRAINING_AUDIENCES = ["NGO", "Volunteer"];

const initialForm = {
  event_name: "",
  description: "",
  event_mode: "offline",

  allocated_districts: [],
  allocated_audience: [],

  event_location: "",
  meeting_link: "",

  start_date: "",
  end_date: "",

  event_organizer: "",
};

function Training() {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [highlightedTrainingId, setHighlightedTrainingId] = useState(null);
  const highlightedTrainingRef = useRef(null);

  const [formData, setFormData] = useState({
    ...initialForm,
  });

  const [districtInput, setDistrictInput] = useState("");
  const [audienceInput, setAudienceInput] = useState("");

  const [districtOptions, setDistrictOptions] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_items: 0,
    total_pages: 1,
    has_next_page: false,
    has_previous_page: false,
  });

  /* ============================================================
     DATE HELPERS
  ============================================================ */

  const formatDateForInput = (date, time = "") => {
    if (!date) return "";

    const value = String(date).replace(" ", "T");

    const datePart = value.substring(0, 10);

    let timePart = time;

    if (!timePart && value.includes("T")) {
      timePart = value.substring(11, 16);
    }

    if (!timePart) {
      timePart = "00:00";
    }

    return `${datePart}T${String(timePart).substring(0, 5)}`;
  };

  const formatDateForApi = (value) => {
    if (!value) return "";

    const stringValue = String(value);

    if (stringValue.includes("T")) {
      const [date, time] = stringValue.split("T");
      return `${date} ${time}:00`;
    }

    if (stringValue.length === 10) {
      return `${stringValue} 00:00:00`;
    }

    return stringValue;
  };

  const formatTimeForApi = (value) => {
    if (!value) return "";

    const stringValue = String(value);

    if (stringValue.includes("T")) {
      const time = stringValue.split("T")[1];

      return time.length === 5
        ? `${time}:00`
        : time.substring(0, 8);
    }

    if (stringValue.length === 5) {
      return `${stringValue}:00`;
    }

    return stringValue.substring(0, 8);
  };

  const formatDisplayDate = (date, time) => {
    if (!date) return "N/A";

    const stringValue = String(date);

    const datePart = stringValue
      .replace("T", " ")
      .substring(0, 10);

    let timePart = "";

    if (time) {
      timePart = String(time).substring(0, 5);
    } else if (stringValue.includes(" ")) {
      timePart = stringValue.substring(11, 16);
    } else if (stringValue.includes("T")) {
      timePart = stringValue.substring(11, 16);
    }

    if (!timePart || timePart === "00:00") {
      return datePart;
    }

    return `${datePart} ${timePart}`;
  };

  const getDatePart = (date) => {
    if (!date) return "N/A";

    return String(date)
      .replace("T", " ")
      .substring(0, 10);
  };

  const getTimePart = (date, time) => {
    if (time) {
      return String(time).substring(0, 5);
    }

    const value = String(date || "");

    if (value.includes(" ")) {
      return value.substring(11, 16);
    }

    if (value.includes("T")) {
      return value.substring(11, 16);
    }

    return "";
  };

  /* ============================================================
     RESPONSE NORMALIZER
  ============================================================ */

  const normalizeTraining = (response) => {
    const training =
      response?.data?.data ??
      response?.data?.training_event ??
      response?.data ??
      null;

    if (!training || typeof training !== "object") {
      return null;
    }

    return {
      training_event_id:
        training.training_event_id ?? null,

      event_name:
        training.event_name ?? "",

      description:
        training.description ?? "",

      event_mode:
        training.event_mode === "online" ? "online" : "offline",

      allocated_districts:
        Array.isArray(training.allocated_districts)
          ? training.allocated_districts
          : [],

      allocated_audience:
        Array.isArray(training.allocated_audience)
          ? training.allocated_audience
          : [],

      event_location:
        training.event_location ?? "",

      meeting_link:
        training.meeting_link ?? "",

      start_date:
        training.start_date ?? "",

      start_time:
        training.start_time ?? "",

      end_time:
        training.end_time ?? "",

      end_date:
        training.end_date ?? "",

      event_organizer:
        training.event_organizer ?? "",

      created_at:
        training.created_at ?? null,

      updated_at:
        training.updated_at ?? null,

      deleted_at:
        training.deleted_at ?? null,
    };
  };

  const normalizeArray = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item).trim())
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  /* ============================================================
     DISTRICT / AUDIENCE
  ============================================================ */

  const addDistrict = () => {
    const value = districtInput.trim();

    if (!value) return;

    setFormData((prev) => {
      if (prev.allocated_districts.includes(value)) {
        return prev;
      }

      return {
        ...prev,
        allocated_districts: [
          ...prev.allocated_districts,
          value,
        ],
      };
    });

    setDistrictInput("");
  };

  const removeDistrict = (district) => {
    setFormData((prev) => ({
      ...prev,
      allocated_districts:
        prev.allocated_districts.filter(
          (item) => item !== district
        ),
    }));
  };

  const addAudience = () => {
    const value = audienceInput.trim();

    if (!value) return;

    setFormData((prev) => {
      if (prev.allocated_audience.includes(value)) {
        return prev;
      }

      return {
        ...prev,
        allocated_audience: [
          ...prev.allocated_audience,
          value,
        ],
      };
    });

    setAudienceInput("");
  };

  const removeAudience = (audience) => {
    setFormData((prev) => ({
      ...prev,
      allocated_audience:
        prev.allocated_audience.filter(
          (item) => item !== audience
        ),
    }));
  };

  /* ============================================================
     FETCH TRAININGS
  ============================================================ */

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getTrainings(
        page,
        10,
        search
      );

      const events =
        response?.data?.training_events ?? [];

      const normalizedEvents = events
        .map((item) =>
          normalizeTraining({
            data: item,
          })
        )
        .filter(Boolean);

      setTrainings(normalizedEvents);

      setPagination(
        response?.data?.pagination ?? {
          page: 1,
          limit: 10,
          total_items: 0,
          total_pages: 1,
          has_next_page: false,
          has_previous_page: false,
        }
      );
    } catch (err) {
      console.error(
        "FETCH TRAININGS ERROR:",
        err
      );

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

  useEffect(() => {
    const notification = location.state?.trainingNotification;
    if (!notification) return undefined;

    let isActive = true;

    const openTrainingNotification = async () => {
      try {
        if (notification.type === "deleted") {
          setSuccess(
            `${notification.title}. ${notification.description || ""}`.trim()
          );
          return;
        }

        if (notification.trainingId === undefined || notification.trainingId === null) {
          throw new Error("This training notification has no event ID.");
        }

        const response = await getTrainingById(notification.trainingId);
        const training = normalizeTraining(response);

        if (!training || !training.event_name) {
          throw new Error("Training event not found.");
        }

        if (isActive) {
          setHighlightedTrainingId(String(training.training_event_id));
          setViewTraining(training);
          setShowViewModal(true);
        }
      } catch (err) {
        if (isActive) {
          setError(err?.message || "Unable to open the training notification.");
        }
      } finally {
        if (isActive) {
          navigate(location.pathname, { replace: true, state: null });
        }
      }
    };

    openTrainingNotification();

    return () => {
      isActive = false;
    };
  }, [location.key, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (highlightedTrainingRef.current) {
      highlightedTrainingRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedTrainingId, trainings]);

  /* ============================================================
     FETCH DISTRICTS
  ============================================================ */

  useEffect(() => {
    let isMounted = true;

    const fetchDistrictOptions = async () => {
      setDistrictsLoading(true);

      try {
        const response = await listDistricts();

        const districts = Array.isArray(
          response?.data?.districts
        )
          ? response.data.districts
          : Array.isArray(response?.data)
            ? response.data
            : [];

        const names = districts
          .map((district) =>
            typeof district === "string"
              ? district
              : district?.name ??
                district?.district_name
          )
          .filter(Boolean);

        if (isMounted) {
          setDistrictOptions(names);
        }
      } catch (err) {
        console.error(
          "FETCH DISTRICTS ERROR:",
          err
        );

        if (isMounted) {
          setError(
            err?.message ||
              "Failed to load districts"
          );
        }
      } finally {
        if (isMounted) {
          setDistrictsLoading(false);
        }
      }
    };

    fetchDistrictOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  /* ============================================================
     SEARCH
  ============================================================ */

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

  /* ============================================================
     FORM
  ============================================================ */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ============================================================
     ADD
  ============================================================ */

  const handleAdd = () => {
    setEditingId(null);

    setFormData({
      ...initialForm,
    });

    setDistrictInput("");
    setAudienceInput("");

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  /* ============================================================
     VIEW
  ============================================================ */

  const handleView = async (id) => {
    try {
      setLoading(true);
      setError("");

      const response =
        await getTrainingById(id);

      const training =
        normalizeTraining(response);

      if (!training || !training.event_name) {
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

  /* ============================================================
     EDIT
  ============================================================ */

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response =
        await getTrainingById(id);

      const training =
        normalizeTraining(response);

      if (!training) {
        throw new Error(
          "Training data not found"
        );
      }

      setEditingId(
        training.training_event_id
      );

      setFormData({
        event_name:
          training.event_name,

        description:
          training.description,

        event_mode:
          training.event_mode,

        allocated_districts:
          training.allocated_districts,

        allocated_audience:
          training.allocated_audience,

        event_location:
          training.event_location,

        meeting_link:
          training.meeting_link,

        start_date:
          formatDateForInput(
            training.start_date,
            training.start_time
          ),

        end_date:
          formatDateForInput(
            training.end_date,
            training.end_time
          ),

        event_organizer:
          training.event_organizer,
      });

      setDistrictInput("");
      setAudienceInput("");

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

  /* ============================================================
     CREATE / UPDATE
  ============================================================ */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!formData.event_name.trim()) {
        throw new Error(
          "Event name is required."
        );
      }

      if (!formData.start_date) {
        throw new Error(
          "Start date and time are required."
        );
      }

      if (!formData.end_date) {
        throw new Error(
          "End date and time are required."
        );
      }

      if (
        formData.event_mode === "offline" &&
        !formData.event_location.trim()
      ) {
        throw new Error(
          "Location is required for offline training."
        );
      }

      if (
        formData.event_mode === "online" &&
        !formData.meeting_link.trim()
      ) {
        throw new Error(
          "Meeting link is required for online training."
        );
      }

      const payload = {
        event_name:
          formData.event_name.trim(),

        description:
          formData.description.trim(),

        event_mode:
          formData.event_mode,

        allocated_districts:
          normalizeArray(
            formData.allocated_districts
          ),

        allocated_audience:
          normalizeArray(
            formData.allocated_audience
          ),

        event_location:
          formData.event_mode === "online"
            ? null
            : formData.event_location.trim(),

        meeting_link:
          formData.event_mode === "offline"
            ? null
            : formData.meeting_link.trim(),

        start_date:
          formatDateForApi(
            formData.start_date
          ),

        start_time:
          formatTimeForApi(
            formData.start_date
          ),

        end_time:
          formatTimeForApi(
            formData.end_date
          ),

        end_date:
          formatDateForApi(
            formData.end_date
          ),

        event_organizer:
          formData.event_organizer.trim(),
      };

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

      if (
        response?.success === false
      ) {
        throw new Error(
          response?.message ||
            "Failed to save training"
        );
      }

      setSuccess(
        response?.message ||
          "Training saved successfully."
      );

      const savedTraining =
        normalizeTraining(response);

      const savedId =
        savedTraining?.training_event_id ??
        editingId;

      // addTrainingNotification({
      //   type: editingId
      //     ? "updated"
      //     : "created",

      //   title: editingId
      //     ? `Training updated: ${formData.event_name.trim()}`
      //     : `New training created: ${formData.event_name.trim()}`,

      //   description:
      //     formData.description.trim() ||
      //     undefined,

      //   trainingId: savedId,
      // });

      setShowModal(false);
      setEditingId(null);

      setFormData({
        ...initialForm,
      });

      setDistrictInput("");
      setAudienceInput("");

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

  /* ============================================================
     DELETE
  ============================================================ */

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

      if (
        response?.success === false
      ) {
        throw new Error(
          response?.message ||
            "Failed to delete training"
        );
      }

      setSuccess(
        response?.message ||
          "Training deleted successfully."
      );

      addTrainingNotification({
        type: "deleted",

        title:
          "Training event deleted",

        description:
          `Training ID ${id} has been removed.`,

        trainingId: id,
      });

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

  /* ============================================================
     CLOSE MODALS
  ============================================================ */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingId(null);

    setFormData({
      ...initialForm,
    });

    setDistrictInput("");
    setAudienceInput("");
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewTraining(null);
  };

  /* ============================================================
     UI HELPERS
  ============================================================ */

  const getModeStyle = (mode) => {
    switch (mode) {
      case "online":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const getModeIcon = (mode) => {
    if (mode === "offline") {
      return <MapPin size={14} />;
    }

    return <Monitor size={14} />;
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">

      {/* ========================================================
          PAGE HEADER
      ======================================================== */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <CalendarDays size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Training Management
              </h1>

              <p className="mt-0.5 text-sm text-slate-500">
                Create and manage disaster response training events.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus size={18} />
          Add Training
        </button>
      </div>

      {/* ========================================================
          ALERTS
      ======================================================== */}

      {success && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-600 hover:text-red-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================
          SEARCH
      ======================================================== */}

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 md:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search by training name, description or organizer..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-7 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Search
          </button>

          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* ========================================================
          STATISTICS
      ======================================================== */}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Trainings
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {pagination.total_items || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Current Page
          </p>

          <p className="mt-2 text-2xl font-bold text-blue-600">
            {pagination.page || 1}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Pages
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {pagination.total_pages || 1}
          </p>
        </div>

      </div>

      {/* ========================================================
          TRAINING TABLE
      ======================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* TABLE HEADER */}
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Training Events
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {pagination.total_items || 0} training events found
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
              Loading...
            </div>
          )}
        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1250px] border-collapse">

            {/* ==================================================
                TABLE HEAD
            ================================================== */}

            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">

                <th className="w-16 px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  #
                </th>

                <th className="min-w-[270px] px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Training Event
                </th>

                <th className="w-[125px] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Mode
                </th>

                <th className="min-w-[220px] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Venue / Meeting
                </th>

                <th className="w-[150px] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Start
                </th>

                <th className="w-[150px] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  End
                </th>

                <th className="min-w-[170px] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Districts
                </th>

                <th className="min-w-[150px] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Audience
                </th>

                <th className="min-w-[190px] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Organizer
                </th>

                <th className="sticky right-0 z-20 w-[150px] bg-slate-50 px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Actions
                </th>

              </tr>
            </thead>

            {/* ==================================================
                TABLE BODY
            ================================================== */}

            <tbody className="divide-y divide-slate-100">

              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-16 text-center"
                  >
                    <div className="flex flex-col items-center justify-center">

                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

                      <p className="mt-3 text-sm font-medium text-slate-600">
                        Loading training events...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : trainings.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-16 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <CalendarDays size={26} />
                      </div>

                      <h3 className="mt-4 text-sm font-bold text-slate-800">
                        No training events found
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Try changing your search or create a new training event.
                      </p>

                      <button
                        type="button"
                        onClick={handleAdd}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <Plus size={15} />
                        Add Training
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                trainings.map((training, index) => {

                  const startDate =
                    getDatePart(
                      training.start_date
                    );

                  const startTime =
                    getTimePart(
                      training.start_date,
                      training.start_time
                    );

                  const endDate =
                    getDatePart(
                      training.end_date
                    );

                  const endTime =
                    getTimePart(
                      training.end_date,
                      training.end_time
                    );

                  return (
                    <tr
                      key={
                        training.training_event_id
                      }
                      ref={
                        String(training.training_event_id) === highlightedTrainingId
                          ? highlightedTrainingRef
                          : null
                      }
                      className={`group transition ${
                        String(training.training_event_id) === highlightedTrainingId
                          ? "bg-blue-50 ring-2 ring-inset ring-blue-300"
                          : "hover:bg-slate-50/80"
                      }`}
                    >

                      {/* SERIAL */}
                      <td className="px-4 py-5 text-center align-top">
                        <span className="text-xs font-bold text-slate-400">
                          {((page - 1) *
                            pagination.limit) +
                            index +
                            1}
                        </span>
                      </td>

                      {/* TRAINING */}
                      <td className="px-5 py-5 align-top">

                        <div className="max-w-[300px]">

                          <div className="flex items-start gap-3">

                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <CalendarDays size={17} />
                            </div>

                            <div className="min-w-0">

                              <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                                {training.event_name ||
                                  "Untitled Training"}
                              </p>

                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                {training.description ||
                                  "No description available"}
                              </p>

                            </div>
                          </div>

                        </div>

                      </td>

                      {/* MODE */}
                      <td className="px-4 py-5 align-top">

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold capitalize ${getModeStyle(
                            training.event_mode
                          )}`}
                        >
                          {getModeIcon(
                            training.event_mode
                          )}

                          {training.event_mode ||
                            "N/A"}
                        </span>

                      </td>

                      {/* VENUE / MEETING */}
                      <td className="px-4 py-5 align-top">

                        {training.event_mode ===
                        "online" ? (
                          <div className="max-w-[220px]">

                            <div className="flex items-start gap-2">

                              <div className="mt-0.5 text-emerald-600">
                                <Monitor size={16} />
                              </div>

                              <div className="min-w-0">

                                <p className="text-xs font-semibold text-slate-800">
                                  Online Training
                                </p>

                                {training.meeting_link ? (
                                  <a
                                    href={
                                      training.meeting_link
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                  >
                                    Join Meeting
                                    <Link2
                                      size={12}
                                    />
                                  </a>
                                ) : (
                                  <p className="mt-1 text-xs text-slate-400">
                                    Meeting link unavailable
                                  </p>
                                )}

                              </div>
                            </div>

                          </div>
                        ) : (
                          <div className="flex max-w-[220px] items-start gap-2">

                            <MapPin
                              size={16}
                              className="mt-0.5 shrink-0 text-blue-600"
                            />

                            <span className="text-xs leading-5 text-slate-600">
                              {training.event_location ||
                                "Location not specified"}
                            </span>

                          </div>
                        )}

                      </td>

                      {/* START */}
                      <td className="px-4 py-5 align-top">

                        <div className="rounded-lg bg-slate-50 px-3 py-2">

                          <div className="flex items-center gap-1.5">
                            <CalendarDays
                              size={13}
                              className="text-slate-400"
                            />

                            <span className="text-xs font-semibold text-slate-700">
                              {startDate}
                            </span>
                          </div>

                          {startTime &&
                            startTime !==
                              "00:00" && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <Clock3
                                  size={12}
                                  className="text-slate-400"
                                />

                                <span className="text-[11px] text-slate-500">
                                  {startTime}
                                </span>
                              </div>
                            )}

                        </div>

                      </td>

                      {/* END */}
                      <td className="px-4 py-5 align-top">

                        <div className="rounded-lg bg-slate-50 px-3 py-2">

                          <div className="flex items-center gap-1.5">
                            <CalendarDays
                              size={13}
                              className="text-slate-400"
                            />

                            <span className="text-xs font-semibold text-slate-700">
                              {endDate}
                            </span>
                          </div>

                          {endTime &&
                            endTime !==
                              "00:00" && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <Clock3
                                  size={12}
                                  className="text-slate-400"
                                />

                                <span className="text-[11px] text-slate-500">
                                  {endTime}
                                </span>
                              </div>
                            )}

                        </div>

                      </td>

                      {/* DISTRICTS */}
                      <td className="px-4 py-5 align-top">

                        {training
                          .allocated_districts
                          ?.length > 0 ? (
                          <div className="flex max-w-[180px] flex-wrap gap-1.5">

                            {training
                              .allocated_districts
                              .slice(0, 3)
                              .map(
                                (district) => (
                                  <span
                                    key={
                                      district
                                    }
                                    className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700"
                                  >
                                    {district}
                                  </span>
                                )
                              )}

                            {training
                              .allocated_districts
                              .length > 3 && (
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                                +
                                {training
                                  .allocated_districts
                                  .length -
                                  3}
                              </span>
                            )}

                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Not allocated
                          </span>
                        )}

                      </td>

                      {/* AUDIENCE */}
                      <td className="px-4 py-5 align-top">

                        {training
                          .allocated_audience
                          ?.length > 0 ? (
                          <div className="flex max-w-[160px] flex-wrap gap-1.5">

                            {training
                              .allocated_audience
                              .map(
                                (audience) => (
                                  <span
                                    key={
                                      audience
                                    }
                                    className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"
                                  >
                                    {audience}
                                  </span>
                                )
                              )}

                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Not allocated
                          </span>
                        )}

                      </td>

                      {/* ORGANIZER */}
                      <td className="px-4 py-5 align-top">

                        <div className="flex max-w-[200px] items-start gap-2">

                          <UserRound
                            size={15}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />

                          <span className="text-xs leading-5 text-slate-600">
                            {training.event_organizer ||
                              "Not specified"}
                          </span>

                        </div>

                      </td>

                      {/* ACTIONS */}
                      <td className="sticky right-0 z-10 border-l border-slate-100 bg-white px-4 py-5 align-top group-hover:bg-slate-50">

                        <div className="flex items-center justify-center gap-1.5">

                          <button
                            type="button"
                            onClick={() =>
                              handleView(
                                training.training_event_id
                              )
                            }
                            title="View Training"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                training.training_event_id
                              )
                            }
                            title="Edit Training"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                training.training_event_id
                              )
                            }
                            title="Delete Training"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                })
              )}

            </tbody>

          </table>

        </div>

        {/* ======================================================
            PAGINATION
        ====================================================== */}

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs font-medium text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-700">
              {trainings.length}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-700">
              {pagination.total_items || 0}
            </span>{" "}
            training events
          </p>

          <div className="flex items-center gap-2">

            <button
              type="button"
              disabled={
                !pagination.has_previous_page ||
                loading
              }
              onClick={() =>
                setPage(
                  (prev) => prev - 1
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
              Previous
            </button>

            <span className="min-w-[70px] rounded-lg bg-white px-3 py-2 text-center text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
              {pagination.page || 1} /{" "}
              {pagination.total_pages || 1}
            </span>

            <button
              type="button"
              disabled={
                !pagination.has_next_page ||
                loading
              }
              onClick={() =>
                setPage(
                  (prev) => prev + 1
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={15} />
            </button>

          </div>

        </div>

      </div>

      {/* ========================================================
          VIEW MODAL
      ======================================================== */}

      {showViewModal &&
        viewTraining && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={closeViewModal}
          >

            <div
              role="dialog"
              aria-modal="true"
              className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              {/* MODAL HEADER */}
              <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">

                <div className="flex items-start gap-4">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <CalendarDays size={22} />
                  </div>

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Training Details
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      {viewTraining.event_name}
                    </h2>

                    <span
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold capitalize ${getModeStyle(
                        viewTraining.event_mode
                      )}`}
                    >
                      {getModeIcon(
                        viewTraining.event_mode
                      )}

                      {viewTraining.event_mode}
                    </span>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={closeViewModal}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
                >
                  <X size={19} />
                </button>

              </div>

              {/* MODAL BODY */}
              <div className="min-h-0 flex-1 overflow-y-auto p-6">

                {/* DATE / TIME */}
                <div className="grid gap-4 md:grid-cols-2">

                  <div className="rounded-xl border border-slate-200 bg-white p-4">

                    <div className="flex items-center gap-2 text-slate-400">
                      <CalendarDays size={16} />

                      <p className="text-[11px] font-bold uppercase tracking-wider">
                        Start
                      </p>
                    </div>

                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {formatDisplayDate(
                        viewTraining.start_date,
                        viewTraining.start_time
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">

                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock3 size={16} />

                      <p className="text-[11px] font-bold uppercase tracking-wider">
                        End
                      </p>
                    </div>

                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {formatDisplayDate(
                        viewTraining.end_date,
                        viewTraining.end_time
                      )}
                    </p>

                  </div>

                </div>

                {/* LOCATION */}
                {viewTraining.event_mode === "offline" && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">

                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin size={16} />

                      <p className="text-[11px] font-bold uppercase tracking-wider">
                        Location
                      </p>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {viewTraining.event_location ||
                        "Not specified"}
                    </p>

                  </div>
                )}

                {/* MEETING */}
                {viewTraining.event_mode === "online" && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">

                    <div className="flex items-center gap-2 text-slate-400">
                      <Link2 size={16} />

                      <p className="text-[11px] font-bold uppercase tracking-wider">
                        Meeting Link
                      </p>
                    </div>

                    {viewTraining.meeting_link ? (
                      <a
                        href={
                          viewTraining.meeting_link
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block break-all text-sm font-semibold text-blue-600 underline hover:text-blue-700"
                      >
                        {
                          viewTraining.meeting_link
                        }
                      </a>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        No meeting link provided.
                      </p>
                    )}

                  </div>
                )}

                {/* DISTRICT / AUDIENCE */}
                <div className="mt-4 grid gap-4 md:grid-cols-2">

                  <div className="rounded-xl border border-slate-200 bg-white p-4">

                    <div className="flex items-center gap-2 text-slate-400">
                      <Map size={16} />

                      <p className="text-[11px] font-bold uppercase tracking-wider">
                        Allocated Districts
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">

                      {viewTraining
                        .allocated_districts
                        ?.length > 0 ? (
                        viewTraining.allocated_districts.map(
                          (district) => (
                            <span
                              key={district}
                              className="rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700"
                            >
                              {district}
                            </span>
                          )
                        )
                      ) : (
                        <span className="text-xs text-slate-400">
                          No districts allocated
                        </span>
                      )}

                    </div>

                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">

                    <div className="flex items-center gap-2 text-slate-400">
                      <Users size={16} />

                      <p className="text-[11px] font-bold uppercase tracking-wider">
                        Allocated Audience
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">

                      {viewTraining
                        .allocated_audience
                        ?.length > 0 ? (
                        viewTraining.allocated_audience.map(
                          (audience) => (
                            <span
                              key={audience}
                              className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700"
                            >
                              {audience}
                            </span>
                          )
                        )
                      ) : (
                        <span className="text-xs text-slate-400">
                          No audience allocated
                        </span>
                      )}

                    </div>

                  </div>

                </div>

                {/* ORGANIZER */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">

                  <div className="flex items-center gap-2 text-slate-400">
                    <UserRound size={16} />

                    <p className="text-[11px] font-bold uppercase tracking-wider">
                      Organizer
                    </p>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {viewTraining.event_organizer ||
                      "Not specified"}
                  </p>

                </div>

                {/* DESCRIPTION */}
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">

                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Description
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {viewTraining.description ||
                      "No description provided."}
                  </p>

                </div>

                {/* META */}
                <div className="mt-4 grid gap-4 md:grid-cols-2">

                  {/* <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Created At
                    </p>

                    <p className="mt-2 text-xs font-medium text-slate-700">
                      {viewTraining.created_at ||
                        "N/A"}
                    </p>
                  </div> */}

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Updated At
                    </p>

                    <p className="mt-2 text-xs font-medium text-slate-700">
                      {viewTraining.updated_at ||
                        "N/A"}
                    </p>
                  </div>

                </div>

              </div>

              {/* FOOTER */}
              <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

                <button
                  type="button"
                  onClick={closeViewModal}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Close
                </button>

              </div>

            </div>

          </div>
        )}

      {/* ========================================================
          ADD / EDIT MODAL
      ======================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
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
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>

            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              {/* EVENT NAME */}
              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>

              {/* DESCRIPTION */}
              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>

              {/* MODE */}
              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="offline">
                    Offline
                  </option>

                  <option value="online">
                    Online
                  </option>

                </select>

              </div>

              {/* DISTRICTS */}
              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Allocated Districts
                </label>

                <div className="flex gap-2">

                  <select
                    value={
                      districtInput
                    }
                    onChange={(e) =>
                      setDistrictInput(
                        e.target.value
                      )
                    }
                    disabled={
                      districtsLoading
                    }
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100"
                  >

                    <option value="">
                      {districtsLoading
                        ? "Loading districts..."
                        : districtOptions.length
                          ? "Select a district"
                          : "No districts available"}
                    </option>

                    {districtOptions
                      .filter(
                        (district) =>
                          !formData.allocated_districts.includes(
                            district
                          )
                      )
                      .map(
                        (district) => (
                          <option
                            key={
                              district
                            }
                            value={
                              district
                            }
                          >
                            {
                              district
                            }
                          </option>
                        )
                      )}

                  </select>

                  <button
                    type="button"
                    onClick={
                      addDistrict
                    }
                    disabled={
                      !districtInput ||
                      districtsLoading
                    }
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add
                  </button>

                </div>

                <div className="mt-3 flex flex-wrap gap-2">

                  {formData
                    .allocated_districts
                    .length > 0 ? (
                    formData.allocated_districts.map(
                      (district) => (
                        <span
                          key={
                            district
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                        >
                          {
                            district
                          }

                          <button
                            type="button"
                            onClick={() =>
                              removeDistrict(
                                district
                              )
                            }
                            className="text-blue-400 hover:text-blue-700"
                          >
                            <X
                              size={
                                13
                              }
                            />
                          </button>

                        </span>
                      )
                    )
                  ) : (
                    <span className="text-xs text-slate-400">
                      No districts selected
                    </span>
                  )}

                </div>

              </div>

              {/* AUDIENCE */}
              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Allocated Audience
                </label>

                <div className="flex gap-2">

                  <select
                    value={
                      audienceInput
                    }
                    onChange={(e) =>
                      setAudienceInput(
                        e.target.value
                      )
                    }
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  >

                    <option value="">
                      Select an audience
                    </option>

                    {TRAINING_AUDIENCES
                      .filter(
                        (audience) =>
                          !formData.allocated_audience.includes(
                            audience
                          )
                      )
                      .map(
                        (audience) => (
                          <option
                            key={
                              audience
                            }
                            value={
                              audience
                            }
                          >
                            {
                              audience
                            }
                          </option>
                        )
                      )}

                  </select>

                  <button
                    type="button"
                    onClick={
                      addAudience
                    }
                    disabled={
                      !audienceInput
                    }
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add
                  </button>

                </div>

                <div className="mt-3 flex flex-wrap gap-2">

                  {formData
                    .allocated_audience
                    .length > 0 ? (
                    formData.allocated_audience.map(
                      (audience) => (
                        <span
                          key={
                            audience
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                        >
                          {
                            audience
                          }

                          <button
                            type="button"
                            onClick={() =>
                              removeAudience(
                                audience
                              )
                            }
                            className="text-emerald-400 hover:text-emerald-700"
                          >
                            <X
                              size={
                                13
                              }
                            />
                          </button>

                        </span>
                      )
                    )
                  ) : (
                    <span className="text-xs text-slate-400">
                      No audience selected
                    </span>
                  )}

                </div>

              </div>

              {/* LOCATION */}
              {formData.event_mode === "offline" && (
                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                </div>
              )}

              {/* MEETING LINK */}
              {formData.event_mode === "online" && (
                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                </div>
              )}

              {/* DATES */}
              <div className="grid gap-5 md:grid-cols-2">

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Start Date & Time
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                </div>

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    End Date & Time
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                </div>

              </div>

              {/* ORGANIZER */}
              <div>

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

              </div>

              {/* FOOTER */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
