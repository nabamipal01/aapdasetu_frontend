import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    ClipboardList,
    Plus,
    X,
    RefreshCw,
    MapPin,
    Pencil,
    Eye,
    CalendarDays,
    AlertTriangle,
    Trash2,
    Play,
    Send,
    CheckCircle,
    Download,
    Ban,
    Upload,
    FileText,
} from "lucide-react";

import {
    listTasks,
    listCompletionSubmissions,
    getCompletionSubmission,
    getCompletionMedia,
    submitCompletion,
    reviewCompletion,
    getTask,
    createTask,
    updateTask,
    deleteTask,
} from "../../services";

import { useAuth } from "../../context/AuthContext";
import { listIncidents } from "../../services/incidentService";
import { listVolunteers } from "../../services/volunteerService";
import {
    listAgencies,
    listActiveEndUsers,
} from "../../services/agencyService";
import {
    isOperationalUser,
    isVolunteer as isVolunteerUser,
} from "../../utils/roles";
import { listDistricts } from "../../services/districtService";

const EMPTY_FORM = {
    title: "",
    description: "",
    incident_id: "",
    district_id: "",
    assignee_type: "",
    assigned_to: "",
    priority: "medium",
    due_at: "",
    district_name: "",
};

const PRIORITIES = ["low", "medium", "high", "critical"];

const STATUS_STYLES = {
    pending: "bg-slate-100 text-slate-700",
    assigned: "bg-blue-100 text-blue-700",
    in_progress: "bg-indigo-100 text-indigo-700",
    completion_requested: "bg-amber-100 text-amber-800",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

const PRIORITY_STYLES = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
};

const extractRecords = (response, key) => {
    const candidates = [
        response?.data?.data?.records,
        response?.data?.records,
        response?.data?.data?.[key],
        response?.data?.[`${key}s`],
        response?.data?.[key],
        response?.data?.data?.end_users,
        response?.data?.end_users,
        response?.data?.data?.users,
        response?.data?.users,
        response?.data?.items,
        response?.data?.data?.items,
        response?.[key],
        response?.data?.data,
        response?.data,
    ];

    return candidates.find(Array.isArray) || [];
};

const getId = (value) => {
    if (value && typeof value === "object") {
        return value.id ?? value.user_id ?? value.account_id ?? "";
    }
    return value ?? "";
};

const getAssigneeId = (record) =>
    record?.id ??
    record?.user_id ??
    record?.userId ??
    record?.profile_id ??
    record?.account_id ??
    "";

const getDistrictId = (record) =>
    record?.district_id ??
    record?.districtId ??
    record?.region_id ??
    record?.regionId ??
    record?.linked_id ??
    record?.district?.id ??
    record?.region?.id ??
    record?.user?.district_id ??
    record?.user?.region_id ??
    "";

const getIncidentDistrictName = (incident) =>
    incident?.district_name ??
    incident?.districtName ??
    incident?.region_name ??
    incident?.regionName ??
    incident?.district?.name ??
    incident?.region?.name ??
    "";

const normalizeTask = (task) => {
    const assignee =
        task.assigned_to && typeof task.assigned_to === "object"
            ? task.assigned_to
            : task.assigned_user && typeof task.assigned_user === "object"
              ? task.assigned_user
              : null;

    const incident =
        task.incident && typeof task.incident === "object"
            ? task.incident
            : null;

    const creator =
        task.created_by && typeof task.created_by === "object"
            ? task.created_by
            : null;

    const assignedToId = getId(assignee ?? task.assigned_to);

    return {
        ...task,
        id: task.id,
        title: task.title ?? "Untitled task",
        description: task.description ?? "",
        task_type: task.task_type ?? "manual",
        incident_id: getId(task.incident_id ?? incident?.id),
        incident_no: incident?.incident_no ?? task.incident_no ?? "",
        incident_title:
            task.incident_title ??
            incident?.title ??
            incident?.incident_no ??
            (task.incident_id ? `Incident #${task.incident_id}` : "Not linked"),
        incident_status: incident?.status ?? "",
        assigned_to: assignedToId,
        assigned_to_name:
            assignee?.name ??
            assignee?.full_name ??
            task.assigned_to_name ??
            task.assignee_name ??
            (assignedToId !== "" && assignedToId != null
                ? `User #${assignedToId}`
                : "Unassigned"),
        assigned_to_phone: assignee?.phone ?? task.assigned_to_phone ?? "",
        assigned_to_type:
            assignee?.type ??
            task.assigned_to_type ??
            task.assignee_type ??
            "",
        assigned_to_status:
            assignee?.status ?? assignee?.account_status ?? "",
        priority: String(task.priority ?? "medium").toLowerCase(),
        status: String(task.status ?? "pending")
            .toLowerCase()
            .replace(/^completion_request$/, "completion_requested"),
        completion_report:
            task.completion_report ??
            task.completion_notes ??
            task.report ??
            "",
        due_at: task.due_at ?? task.due_date ?? "",
        latitude: task.latitude ?? incident?.latitude ?? null,
        longitude: task.longitude ?? incident?.longitude ?? null,
        location:
            task.latitude != null &&
            task.longitude != null &&
            task.latitude !== "" &&
            task.longitude !== ""
                ? `Lat: ${task.latitude}, Lng: ${task.longitude}`
                : incident?.latitude != null && incident?.longitude != null
                  ? `Lat: ${incident.latitude}, Lng: ${incident.longitude}`
                  : task.location ||
                    task.incident_location ||
                    incident?.location ||
                    incident?.address ||
                    "",
        created_by_name:
            creator?.name ??
            task.created_by_name ??
            task.creator_name ??
            (task.created_by != null
                ? `#User ${getId(task.created_by)}`
                : "Department"),
    };
};

const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(
        String(value).includes("T") ? value : String(value).replace(" ", "T")
    );

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatLabel = (value) =>
    String(value || "—")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());

const normalizeRole = (value) =>
    String(value ?? "")
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase();

const getUserId = (user) =>
    user?.id ??
    user?.user_id ??
    user?.profile_id ??
    user?.volunteer_id ??
    "";

const normalizeAssignee = (record, type) => {
    const id = getAssigneeId(record);
    if (id === "" || id == null) return null;

    const name =
        type === "volunteer"
            ? record?.name ??
              record?.full_name ??
              record?.volunteer_name ??
              record?.user?.name ??
              "Unnamed volunteer"
            : record?.contact_person
              ? `${record.contact_person} — ${record?.name ?? "NGO"}`
              : record?.name ??
                record?.user?.name ??
                "Unnamed NGO";

    return { id: String(id), name };
};

export default function Task() {
    const { user } = useAuth();

    const role = normalizeRole(user?.role);
    const identityRoles = [user?.role, user?.user_role, user?.user_type]
        .map(normalizeRole);
    const isDistrictManager = identityRoles.some((identity) =>
        ["district", "district_user"].includes(identity)
    );
    const districtId = getDistrictId(user);
    const canManageTasks =
        ["super_admin", "admin"].includes(role) || isDistrictManager;
    const isTaskOnly = isOperationalUser(user);
    const isVolunteer =
        isVolunteerUser(user) ||
        ["volunteer", "volunteers", "volunteer_user"].includes(
            normalizeRole(user?.user_role)
        );

    const [tasks, setTasks] = useState([]);
    const [completionSubmissions, setCompletionSubmissions] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [districtsMap, setDistrictsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingTaskId, setDeletingTaskId] = useState(null);
    const [updatingTaskId, setUpdatingTaskId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [taskCompletionFeedback, setTaskCompletionFeedback] = useState(null);
    const [loadingTaskCompletionFeedback, setLoadingTaskCompletionFeedback] =
        useState(false);
    const [taskCompletionFeedbackError, setTaskCompletionFeedbackError] =
        useState("");
    const [form, setForm] = useState(EMPTY_FORM);

    const [assigneeType, setAssigneeType] = useState("");
    const [assigneeOptions, setAssigneeOptions] = useState([]);
    const [assigneeLoading, setAssigneeLoading] = useState(false);

    // Completion report modal (End Task)
    const [completionModalTask, setCompletionModalTask] = useState(null);
    const [completionReport, setCompletionReport] = useState("");
    const [completionFiles, setCompletionFiles] = useState([]);
    const [submittingCompletion, setSubmittingCompletion] = useState(false);
    const [selectedCompletionSubmission, setSelectedCompletionSubmission] =
        useState(null);
    const [completionSubmissionDetail, setCompletionSubmissionDetail] =
        useState(null);
    const [completionDetailLoading, setCompletionDetailLoading] =
        useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [reviewingSubmissionId, setReviewingSubmissionId] = useState(null);
    const [downloadingMediaId, setDownloadingMediaId] = useState(null);

    // Cancel confirmation
    const [cancelConfirmTask, setCancelConfirmTask] = useState(null);

    const incidentsRef = useRef(incidents);
    const districtsMapRef = useRef(districtsMap);
    const completionFileInputRef = useRef(null);

    const [loadingTaskDetails, setLoadingTaskDetails] = useState(false);

    const [taskDetailsError, setTaskDetailsError] = useState("");

    useEffect(() => {
        incidentsRef.current = incidents;
    }, [incidents]);

    useEffect(() => {
        districtsMapRef.current = districtsMap;
    }, [districtsMap]);

    const canManageDistrictTask = useCallback(
        (task) =>
            canManageTasks &&
            (!isDistrictManager ||
                incidents.some(
                    (incident) =>
                        String(incident.id) === String(task?.incident_id)
                )),
        [canManageTasks, incidents, isDistrictManager]
    );

    const isAssignedToCurrentVolunteer = (task) => {
        const volunteerId = getUserId(user);
        return (
            isVolunteer &&
            volunteerId !== "" &&
            volunteerId != null &&
            task?.assigned_to != null &&
            String(task.assigned_to) === String(volunteerId)
        );
    };

    const resolveDistrictName = useCallback((incident) => {
        if (!incident) return "";

        const embedded = getIncidentDistrictName(incident);
        if (embedded) return embedded;

        const regionId =
            incident.region_id ??
            incident.district_id ??
            incident.regionId ??
            incident.districtId;

        if (regionId != null) {
            return districtsMapRef.current[String(regionId)] ?? "";
        }

        return "";
    }, []);

    const getTaskDistrictName = (task) => {
        const incident = incidents.find(
            (item) => String(item.id) === String(task?.incident_id)
        );
        const districtRecord = incident ?? task;
        const districtId = getDistrictId(districtRecord);
        const districtName =
            getIncidentDistrictName(districtRecord) ||
            districtsMap[String(districtId)] ||
            task?.district_name ||
            task?.region_name;

        if (districtName) return districtName;

        if (
            isDistrictManager &&
            districtId !== "" &&
            String(districtId) === String(getDistrictId(user))
        ) {
            return (
                user?.district_name ??
                user?.region_name ??
                user?.district?.name ??
                user?.region?.name ??
                `District #${districtId}`
            );
        }

        return "—";
    };

    const availableDistricts = isDistrictManager
        ? districts.filter(
              (district) =>
                  String(district.id) === String(districtId)
          )
        : districts;
    const filteredIncidents = incidents.filter(
        (incident) =>
            form.district_id !== "" &&
            String(getDistrictId(incident)) === String(form.district_id)
    );

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            let districtIncidents = [];

            if (isDistrictManager) {
                if (districtId === "" || districtId == null) {
                    throw new Error("Your account is not linked to a district.");
                }

                const incidentResponse = await listIncidents({
                    region_id: Number(districtId),
                    page: 1,
                    per_page: 100,
                });

                districtIncidents = extractRecords(
                    incidentResponse,
                    "incidents"
                ).filter(
                    (incident) =>
                        String(getDistrictId(incident)) === String(districtId)
                );

                setIncidents(districtIncidents);

                const taskResponses = await Promise.all(
                    districtIncidents
                        .filter((incident) => incident.id != null)
                        .map((incident) =>
                            listTasks({
                                incident_id: Number(incident.id),
                                page: 1,
                                per_page: 100,
                            })
                        )
                );

                const districtIncidentIds = new Set(
                    districtIncidents.map((incident) => String(incident.id))
                );

                const uniqueTasks = Array.from(
                    new Map(
                        taskResponses
                            .flatMap((response) =>
                                extractRecords(response, "tasks")
                            )
                            .filter((task) =>
                                districtIncidentIds.has(
                                    String(
                                        task.incident_id ??
                                            task.incident?.id ??
                                            ""
                                    )
                                )
                            )
                            .map((task) => [String(task.id), task])
                    ).values()
                );

                setTasks(uniqueTasks.map(normalizeTask));
            } else {
                const listParams = {
                    page: 1,
                    per_page: isTaskOnly ? 50 : 100,
                };

                if (isTaskOnly) {
                    const assigneeId = getUserId(user);
                    if (assigneeId !== "" && assigneeId != null) {
                        listParams.assigned_to = Number(assigneeId);
                    }
                }

                const response = await listTasks(listParams);
                setTasks(
                    extractRecords(response, "tasks").map(normalizeTask)
                );
            }

            if (canManageTasks) {
                try {
                    const response = await listCompletionSubmissions({
                        status: "pending",
                        page: 1,
                        per_page: 100,
                    });
                    if (response?.success === false) {
                        throw new Error(
                            response.message ||
                                "Failed to load completion submissions."
                        );
                    }

                    let submissions = extractRecords(
                        response,
                        "submissions"
                    );
                    if (isDistrictManager) {
                        const districtIncidentIds = new Set(
                            districtIncidents.map((incident) =>
                                String(incident.id)
                            )
                        );
                        submissions = submissions.filter(
                            (submission) =>
                                String(submission.district_id) ===
                                    String(districtId) ||
                                districtIncidentIds.has(
                                    String(submission.incident_id)
                                )
                        );
                    }
                    setCompletionSubmissions(submissions);
                } catch (submissionError) {
                    console.error(
                        "[Tasks] Completion submissions fetch error:",
                        submissionError
                    );
                    setCompletionSubmissions([]);
                    setError(
                        submissionError?.message ||
                            "Tasks loaded, but completion submissions could not be loaded."
                    );
                }
            } else {
                setCompletionSubmissions([]);
            }

            if (!canManageTasks) {
                if (!isDistrictManager) setIncidents([]);
                return;
            }

            const results = await Promise.allSettled([
                isDistrictManager
                    ? Promise.resolve({
                          data: { incidents: districtIncidents },
                      })
                    : listIncidents({ page: 1, per_page: 100 }),
                listDistricts({ per_page: 100 }),
            ]);

            const [incidentResult, districtResult] = results;

            if (incidentResult.status === "fulfilled") {
                setIncidents(
                    extractRecords(incidentResult.value, "incidents")
                );
            } else {
                setIncidents([]);
            }

            if (districtResult.status === "fulfilled") {
                const distResponse = districtResult.value;
                const distList = [
                    distResponse?.data?.districts,
                    distResponse?.data?.items,
                    distResponse?.data?.data?.districts,
                    distResponse?.data?.data?.items,
                    distResponse?.data,
                ].find(Array.isArray) || [];

                const map = {};
                distList.forEach((district) => {
                    if (district?.id != null) {
                        map[String(district.id)] =
                            district.name ?? district.district_name ?? "";
                    }
                });
                setDistricts(distList);
                setDistrictsMap(map);
            }

            if (incidentResult.status === "rejected") {
                setError(
                    "Tasks loaded, but incident options could not be loaded."
                );
            }
        } catch (err) {
            console.error("[Tasks] Fetch error:", err);
            setTasks([]);
            setError(err?.message || "Failed to load tasks.");
        } finally {
            setLoading(false);
        }
    }, [canManageTasks, districtId, isDistrictManager, isTaskOnly, user]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    useEffect(() => {
        if (!canManageTasks || !showForm || !assigneeType) {
            setAssigneeOptions([]);
            setAssigneeLoading(false);
            return undefined;
        }

        let cancelled = false;

        const fetchAssignees = async () => {
            setAssigneeLoading(true);
            setAssigneeOptions([]);

            try {
                const response = await listActiveEndUsers(assigneeType);

                if (response?.success === false) {
                    throw new Error(
                        response.message || "Failed to load assignees."
                    );
                }

                const records = extractRecords(response, "records");

                const scopedRecords = isDistrictManager
                    ? records.filter(
                          (record) =>
                              String(getDistrictId(record)) ===
                              String(districtId)
                      )
                    : records;

                const normalized = scopedRecords
                    .map((record) => normalizeAssignee(record, assigneeType))
                    .filter(Boolean);

                const unique = Array.from(
                    new Map(
                        normalized.map((item) => [String(item.id), item])
                    ).values()
                );

                if (!cancelled) setAssigneeOptions(unique);
            } catch (err) {
                console.error("[Tasks] Active end-user fetch error:", err);
                if (!cancelled) {
                    setAssigneeOptions([]);
                    setError(
                        err?.message || "Failed to load active assignees."
                    );
                }
            } finally {
                if (!cancelled) setAssigneeLoading(false);
            }
        };

        fetchAssignees();

        return () => {
            cancelled = true;
        };
    }, [
        assigneeType,
        showForm,
        canManageTasks,
        districtId,
        isDistrictManager,
    ]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => {
            const next = { ...previous, [name]: value };

            if (name === "incident_id") {
                const selected = incidentsRef.current.find(
                    (incident) => String(incident.id) === String(value)
                );
                next.district_name = resolveDistrictName(selected ?? null);
                next.district_id = selected ? String(getDistrictId(selected)) : "";
            } else if (name === "district_id") {
                next.incident_id = "";
                next.district_name =
                    districtsMapRef.current[String(value)] ?? "";
            }

            return next;
        });
    };

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setAssigneeType("");
        setAssigneeOptions([]);
        setEditingTask(null);
        setShowForm(false);
    };

    const openCreateForm = () => {
        if (!canManageTasks) return;

        setError("");
        setSuccess("");
        setEditingTask(null);
        setAssigneeType("");
        setAssigneeOptions([]);
        setForm({
            ...EMPTY_FORM,
            district_id: isDistrictManager ? String(districtId) : "",
            district_name: isDistrictManager
                ? districtsMap[String(districtId)] ??
                  user?.district_name ??
                  user?.region_name ??
                  ""
                : "",
        });
        setShowForm(true);
    };

    const openEditForm = (task) => {
        if (!canManageDistrictTask(task)) {
            setError("You can only manage tasks from your district.");
            return;
        }
        if (["completed", "cancelled"].includes(task.status)) {
            setError("Completed or cancelled tasks cannot be edited.");
            return;
        }

        const existingType = String(
            task.assigned_to_type ?? task.assignee_type ?? ""
        ).toLowerCase();

        const selectedType =
            existingType === "volunteer" ? "volunteer" : "agency";

        setAssigneeType(selectedType);
        setAssigneeOptions([]);
        setError("");
        setSuccess("");
        setEditingTask(task);

        setForm({
            title: task.title ?? "",
            description: task.description ?? "",
            incident_id: task.incident_id
                ? String(task.incident_id)
                : "",
            assignee_type: selectedType,
            assigned_to:
                task.assigned_to !== "" && task.assigned_to != null
                    ? String(task.assigned_to)
                    : "",
            priority: task.priority ?? "medium",
            due_at: task.due_at
                ? String(task.due_at).replace(" ", "T").slice(0, 16)
                : "",
            district_name: (() => {
                const linked = incidentsRef.current.find(
                    (incident) =>
                        String(incident.id) === String(task.incident_id)
                );
                return linked
                    ? resolveDistrictName(linked)
                    : task.district_name ?? task.region_name ?? "";
            })(),
            district_id: (() => {
                const linked = incidentsRef.current.find(
                    (incident) =>
                        String(incident.id) === String(task.incident_id)
                );
                return String(
                    (linked ? getDistrictId(linked) : getDistrictId(task)) ??
                        ""
                );
            })(),
        });

        setShowForm(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!canManageTasks) return;

        if (!form.title.trim()) {
            setError("Task title is required.");
            return;
        }

        if (!form.incident_id) {
            setError("Please select an incident.");
            return;
        }

        if (
            isDistrictManager &&
            !incidents.some(
                (incident) =>
                    String(incident.id) === String(form.incident_id)
            )
        ) {
            setError("Select an incident from your district.");
            return;
        }

        if (editingTask && !canManageDistrictTask(editingTask)) {
            setError("You can only manage tasks from your district.");
            return;
        }

        if (!assigneeType) {
            setError("Please select Volunteer or NGO Contact Person.");
            return;
        }

        if (!form.assigned_to) {
            setError("Please select an active assignee.");
            return;
        }

        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const dueAtFormatted = form.due_at
                ? form.due_at.replace("T", " ") +
                  (form.due_at.length === 16 ? ":00" : "")
                : null;

            if (editingTask) {
                const updatePayload = {
                    title: form.title.trim(),
                    description: form.description.trim(),
                    assigned_to: Number(form.assigned_to),
                    priority: form.priority,
                    // Keep status under workflow control, not the edit form.
                    status: editingTask.status,
                    due_at: dueAtFormatted,
                };

                const result = await updateTask(
                    editingTask.id,
                    updatePayload
                );

                if (result?.success === false) {
                    throw new Error(result.message || "Failed to update task.");
                }

                setSuccess(result?.message || "Task updated successfully.");
            } else {
                const createPayload = {
                    incident_id: Number(form.incident_id),
                    title: form.title.trim(),
                    description: form.description.trim(),
                    task_type: "manual",
                    assigned_to: Number(form.assigned_to),
                    priority: form.priority || "medium",
                    status: "assigned",
                    ...(dueAtFormatted ? { due_at: dueAtFormatted } : {}),
                };

                console.log("[Task Create] Payload:", createPayload);
                const result = await createTask(createPayload);
                console.log("[Task Create] Response:", result);

                if (result?.success === false) {
                    throw new Error(result.message || "Failed to create task.");
                }

                setSuccess(result?.message || "Task created successfully.");
            }

            resetForm();
            await fetchTasks();
        } catch (err) {
            console.error("[Tasks] Save error:", err);
            const status = err?.status;
            const apiMessage = err?.message || "";

            if (status === 403) {
                setError(
                    apiMessage ||
                        "Access denied. You do not have permission for this task or district."
                );
            } else if (status === 404) {
                setError(apiMessage || "Task not found.");
            } else if (status === 409) {
                setError(
                    apiMessage ||
                        "Cannot assign task — the incident may be closed."
                );
            } else if (status === 422) {
                setError(
                    apiMessage ||
                        "Validation failed. Check assignee, incident, and required fields."
                );
            } else if (status === 500) {
                setError(apiMessage || "Server error. Please try again later.");
            } else {
                setError(apiMessage || "Failed to save task.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTask = async (task) => {
        if (!canManageDistrictTask(task) || task.id == null) return;
        if (["completed", "cancelled"].includes(task.status)) {
            setError("Completed or cancelled tasks cannot be deleted.");
            return;
        }
        if (!window.confirm(`Delete task "${task.title}"?`)) return;

        setDeletingTaskId(task.id);
        setError("");
        setSuccess("");

        try {
            const response = await deleteTask(task.id);
            if (response?.success === false) {
                throw new Error(response.message || "Failed to delete task.");
            }

            setTasks((current) =>
                current.filter(
                    (item) => String(item.id) !== String(task.id)
                )
            );
            setSelectedTask((current) =>
                String(current?.id) === String(task.id) ? null : current
            );
            setSuccess("Task deleted successfully.");
        } catch (err) {
            console.error("[Tasks] Delete error:", err);
            setError(err?.message || "Failed to delete task.");
        } finally {
            setDeletingTaskId(null);
        }
    };

    const handleWorkflowAction = async (task, nextStatus) => {
        // Volunteer can only Start (assigned → in_progress).
        const canVolunteerAdvance =
            isVolunteer &&
            task.status === "assigned" &&
            nextStatus === "in_progress";

        if (!canVolunteerAdvance) {
            setError("You are not allowed to perform this task action.");
            return;
        }

        setUpdatingTaskId(task.id);
        setError("");
        setSuccess("");

        try {
            const response = await updateTask(task.id, { status: nextStatus });

            if (response?.success === false) {
                throw new Error(
                    response.message || "Failed to update task status."
                );
            }

            setSuccess("Task started.");

            await fetchTasks();

            setSelectedTask((current) =>
                current && String(current.id) === String(task.id)
                    ? { ...current, status: nextStatus }
                    : current
            );
        } catch (err) {
            console.error("[Tasks] Workflow action error:", err);
            setError(err?.message || "Failed to update task status.");
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const openCompletionModal = (task) => {
        if (!isAssignedToCurrentVolunteer(task) || task.status !== "in_progress") {
            setError("Only the assigned volunteer can end an in-progress task.");
            return;
        }
        setCompletionModalTask(task);
        setCompletionReport("");
        setCompletionFiles([]);
        setError("");
        setSuccess("");
    };

    const closeCompletionModal = () => {
        setCompletionModalTask(null);
        setCompletionReport("");
        setCompletionFiles([]);
        if (completionFileInputRef.current) {
            completionFileInputRef.current.value = "";
        }
    };

    const handleCompletionSubmit = async (e) => {
        e?.preventDefault?.();
        const task = completionModalTask;
        if (!task) return;

        const report = completionReport.trim();
        if (!report) {
            setError("Please enter a completion report before ending the task.");
            return;
        }
        if (report.length < 10) {
            setError("Completion report must be at least 10 characters.");
            return;
        }

        setSubmittingCompletion(true);
        setError("");
        setSuccess("");

        try {
            const response = await submitCompletion(
                task.id,
                report,
                completionFiles
            );

            if (response?.success === false) {
                throw new Error(
                    response.message || "Failed to submit completion request."
                );
            }

            setSuccess(
                "Task completion request submitted with report. Awaiting approval."
            );
            closeCompletionModal();
            await fetchTasks();

            setSelectedTask((current) =>
                current && String(current.id) === String(task.id)
                    ? {
                          ...current,
                          status: "completion_requested",
                          completion_report: report,
                      }
                    : current
            );
        } catch (err) {
            console.error("[Tasks] Completion submit error:", err);
            setError(err?.message || "Failed to submit completion request.");
        } finally {
            setSubmittingCompletion(false);
        }
    };

    const openCompletionReview = async (submission) => {
        setSelectedCompletionSubmission(submission);
        setCompletionSubmissionDetail(null);
        setRejectionReason("");
        setCompletionDetailLoading(true);
        setError("");

        try {
            const response = await getCompletionSubmission(
                submission.submission_id
            );
            if (response?.success === false) {
                throw new Error(
                    response.message ||
                        "Failed to load the completion report."
                );
            }

            const data = response?.data?.data ?? response?.data ?? response;
            if (!data?.submission) {
                throw new Error("Completion report details were not returned.");
            }
            setCompletionSubmissionDetail({
                submission: data.submission,
                media: Array.isArray(data.media) ? data.media : [],
            });
        } catch (err) {
            console.error("[Tasks] Completion detail fetch error:", err);
            setError(err?.message || "Failed to load the completion report.");
        } finally {
            setCompletionDetailLoading(false);
        }
    };

    const handleCompletionReview = async (action) => {
        const submission = completionSubmissionDetail?.submission;
        if (!submission?.submission_id) return;

        const reason = rejectionReason.trim();
        if (action === "reject" && !reason) {
            setError("Please provide a reason for rejecting this completion report.");
            return;
        }

        setReviewingSubmissionId(submission.submission_id);
        setError("");
        setSuccess("");
        try {
            const response = await reviewCompletion(
                submission.submission_id,
                action,
                action === "reject" ? reason : undefined
            );
            if (response?.success === false) {
                throw new Error(
                    response.message || "Failed to review completion report."
                );
            }

            setSuccess(
                action === "approve"
                    ? "Completion report approved. Task marked as completed."
                    : "Completion report rejected. Task returned to in-progress."
            );
            setSelectedCompletionSubmission(null);
            setCompletionSubmissionDetail(null);
            setRejectionReason("");
            await fetchTasks();
        } catch (err) {
            console.error("[Tasks] Completion review error:", err);
            setError(err?.message || "Failed to review completion report.");
        } finally {
            setReviewingSubmissionId(null);
        }
    };

    const handleCompletionMediaDownload = async (media) => {
        setDownloadingMediaId(media.id);
        setError("");
        try {
            const blob = await getCompletionMedia(media.id);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = media.original_name || "completion-evidence";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            console.error("[Tasks] Completion media download error:", err);
            setError(err?.message || "Failed to download completion evidence.");
        } finally {
            setDownloadingMediaId(null);
        }
    };

    const openTaskDetails = async (task) => {

    setSelectedTask(task);

 

    setTaskCompletionFeedback(null);

    setTaskCompletionFeedbackError("");

    setTaskDetailsError("");

 

    setLoadingTaskDetails(true);

    setLoadingTaskCompletionFeedback(true);

 

    // 1. Fetch individual task details.

    try {

        const response = await getTask(task.id);

 

        if (response?.success === false) {

            throw new Error(

                response.message || "Could not load task details."

            );

        }

 

        if (!response?.data?.id) {

            throw new Error("Invalid task details received.");

        }

 

        setSelectedTask((previousTask) => ({

            ...previousTask,

            ...response.data,

        }));

    } catch (err) {

        console.error("[Tasks] Task details error:", err);

 

        setTaskDetailsError(

            err?.message || "Could not load task details."

        );

    } finally {

        setLoadingTaskDetails(false);

    }

 

    // 2. Fetch completion submissions and review status.

    try {

        const response = await listCompletionSubmissions({

            task_id: task.id,

            page: 1,

            per_page: 100,

        });

 

        if (response?.success === false) {

            throw new Error(

                response.message ||

                    "Could not load completion review information."

            );

        }

 

        const submissions = extractRecords(response, "submissions");

 

        const latestSubmission = submissions.reduce((latest, item) => {

            if (!latest) return item;

 

            const itemDate = new Date(

                String(item.submitted_at || "").replace(" ", "T")

            ).getTime();

 

            const latestDate = new Date(

                String(latest.submitted_at || "").replace(" ", "T")

            ).getTime();

 

            return itemDate > latestDate ? item : latest;

        }, null);

 

        setTaskCompletionFeedback(latestSubmission);

    } catch (err) {

        console.error(

            "[Tasks] Completion feedback error:",

            err

        );

 

        setTaskCompletionFeedbackError(

            err?.message ||

                "Could not load completion review information."

        );

    } finally {

        setLoadingTaskCompletionFeedback(false);

    }

};

    const canCancelTask = (task) => {
        if (!task || ["completed", "cancelled"].includes(task.status)) {
            return false;
        }
        // Managers can cancel any non-final task in their scope
        if (canManageTasks && canManageDistrictTask(task)) {
            return true;
        }
        // Assigned volunteer can cancel while assigned or in_progress
        if (
            isAssignedToCurrentVolunteer(task) &&
            ["assigned", "in_progress"].includes(task.status)
        ) {
            return true;
        }
        return false;
    };

    const handleCancelTask = async (task) => {
        if (!canCancelTask(task)) {
            setError("You are not allowed to cancel this task.");
            setCancelConfirmTask(null);
            return;
        }

        setUpdatingTaskId(task.id);
        setError("");
        setSuccess("");

        try {
            const response = await updateTask(task.id, { status: "cancelled" });

            if (response?.success === false) {
                throw new Error(
                    response.message || "Failed to cancel task."
                );
            }

            setSuccess("Task has been cancelled.");
            setCancelConfirmTask(null);
            await fetchTasks();

            setSelectedTask((current) =>
                current && String(current.id) === String(task.id)
                    ? { ...current, status: "cancelled" }
                    : current
            );
        } catch (err) {
            console.error("[Tasks] Cancel error:", err);
            setError(err?.message || "Failed to cancel task.");
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const renderWorkflowActions = (task) => (
        <div className="flex flex-wrap items-center gap-2">
            {isVolunteer && task.status === "assigned" && (
                <button
                    type="button"
                    onClick={() => handleWorkflowAction(task, "in_progress")}
                    disabled={updatingTaskId === task.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                    <Play size={14} />
                    Start
                </button>
            )}

            {isAssignedToCurrentVolunteer(task) &&
                task.status === "in_progress" && (
                    <button
                        type="button"
                        onClick={() => openCompletionModal(task)}
                        disabled={updatingTaskId === task.id || submittingCompletion}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                        <Send size={14} />
                        End Task
                    </button>
                )}

            {canCancelTask(task) && (
                <button
                    type="button"
                    onClick={() => setCancelConfirmTask(task)}
                    disabled={updatingTaskId === task.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                    <Ban size={14} />
                    Cancel
                </button>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <ClipboardList size={30} className="text-blue-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {isTaskOnly
                                    ? "My Assigned Tasks"
                                    : isDistrictManager
                                      ? "District Tasks"
                                      : canManageTasks
                                        ? "Task Management"
                                        : "Tasks"}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {isTaskOnly
                                    ? "View and update the tasks assigned to you."
                                    : isDistrictManager
                                      ? "View and manage tasks linked to your district incidents."
                                      : canManageTasks
                                        ? "Create, assign, and manage operational tasks."
                                        : "View tasks available to your role."}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={fetchTasks}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={16}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>

                        {canManageTasks && (
                            <button
                                type="button"
                                onClick={openCreateForm}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <Plus size={17} />
                                Create Task
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div
                        role="status"
                        className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                    >
                        {success}
                    </div>
                )}

                {canManageTasks && (
                    <div
                        className={`grid transition-all duration-300 ease-in-out ${
                            showForm
                                ? "mb-6 grid-rows-[1fr] opacity-100"
                                : "pointer-events-none grid-rows-[0fr] opacity-0"
                        }`}
                        aria-hidden={!showForm}
                    >
                        <div className="min-h-0 overflow-hidden">
                            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                                <div className="mb-5 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            {editingTask ? "Edit Task" : "Create Task"}
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {editingTask
                                                ? "Update task details without changing its workflow status."
                                                : "Create a task and assign it to an active volunteer or NGO contact person."}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
                                        aria-label="Cancel and close task form"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label htmlFor="task-title" className="mb-1.5 block text-sm font-medium text-slate-700">
                                                Task Title *
                                            </label>
                                            <input
                                                id="task-title"
                                                name="title"
                                                value={form.title}
                                                onChange={handleChange}
                                                required
                                                maxLength={255}
                                                placeholder="Enter task title"
                                                disabled={!showForm || submitting}
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="task-district" className="mb-1.5 block text-sm font-medium text-slate-700">
                                                District *
                                            </label>
                                            <select
                                                id="task-district"
                                                name="district_id"
                                                value={form.district_id}
                                                onChange={handleChange}
                                                required
                                                disabled={!showForm || submitting || Boolean(editingTask)}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            >
                                                <option value="">Select a district</option>
                                                {availableDistricts.map((district) => (
                                                    <option key={district.id} value={district.id}>
                                                        {district.name ?? district.district_name ?? `District #${district.id}`}
                                                    </option>
                                                ))}
                                            </select>
                                            {editingTask && (
                                                <p className="mt-1 text-xs text-slate-400">
                                                    The district cannot be changed after task creation.
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="task-incident" className="mb-1.5 block text-sm font-medium text-slate-700">
                                                Related Incident *
                                            </label>
                                            <select
                                                id="task-incident"
                                                name="incident_id"
                                                value={form.incident_id}
                                                onChange={handleChange}
                                                required
                                                disabled={!showForm || submitting || Boolean(editingTask) || !form.district_id}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            >
                                                <option value="">
                                                    {form.district_id
                                                        ? filteredIncidents.length
                                                            ? "Select an incident"
                                                            : "No incidents in this district"
                                                        : "Select a district first"}
                                                </option>
                                                {filteredIncidents.map((incident) => (
                                                    <option key={incident.id} value={incident.id}>
                                                        {incident.incident_no ? `${incident.incident_no} — ` : ""}
                                                        {incident.title ?? incident.name ?? `Incident #${incident.id}`}
                                                    </option>
                                                ))}
                                            </select>
                                            {editingTask && (
                                                <p className="mt-1 text-xs text-slate-400">
                                                    The linked incident cannot be changed after task creation.
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="task-assignee-type" className="mb-1.5 block text-sm font-medium text-slate-700">
                                                Assign User Type *
                                            </label>
                                            <select
                                                id="task-assignee-type"
                                                name="assignee_type"
                                                value={assigneeType}
                                                required
                                                disabled={!showForm || submitting}
                                                onChange={(event) => {
                                                    const type = event.target.value;
                                                    setAssigneeType(type);
                                                    setForm((previous) => ({
                                                        ...previous,
                                                        assignee_type: type,
                                                        assigned_to: "",
                                                    }));
                                                    setAssigneeOptions([]);
                                                    setError("");
                                                }}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            >
                                                <option value="">Select user type</option>
                                                <option value="volunteer">Volunteer</option>
                                                <option value="agency">NGO Contact Person</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="task-assignee" className="mb-1.5 block text-sm font-medium text-slate-700">
                                                Assign To *
                                            </label>
                                            <select
                                                id="task-assignee"
                                                name="assigned_to"
                                                value={form.assigned_to}
                                                onChange={handleChange}
                                                required
                                                disabled={!showForm || submitting || !assigneeType || assigneeLoading}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            >
                                                <option value="">
                                                    {!assigneeType
                                                        ? "Select user type first"
                                                        : assigneeLoading
                                                          ? "Loading active users..."
                                                          : assigneeOptions.length === 0
                                                            ? "No active users available"
                                                            : "Select an assignee"}
                                                </option>
                                                {assigneeOptions.map((assignee) => (
                                                    <option key={assignee.id} value={assignee.id}>
                                                        {assignee.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {assigneeType && !assigneeLoading && (
                                                <p className="mt-1 text-xs text-slate-400">
                                                    {assigneeOptions.length} active option{assigneeOptions.length === 1 ? "" : "s"} loaded.
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="task-priority" className="mb-1.5 block text-sm font-medium text-slate-700">
                                                Priority
                                            </label>
                                            <select
                                                id="task-priority"
                                                name="priority"
                                                value={form.priority}
                                                onChange={handleChange}
                                                disabled={!showForm || submitting}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            >
                                                {PRIORITIES.map((priority) => (
                                                    <option key={priority} value={priority}>
                                                        {formatLabel(priority)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="task-due" className="mb-1.5 block text-sm font-medium text-slate-700">
                                                Due Date
                                            </label>
                                            <input
                                                id="task-due"
                                                type="datetime-local"
                                                name="due_at"
                                                value={form.due_at}
                                                onChange={handleChange}
                                                disabled={!showForm || submitting}
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="task-description" className="mb-1.5 block text-sm font-medium text-slate-700">
                                            Task Description / Instructions
                                        </label>
                                        <textarea
                                            id="task-description"
                                            name="description"
                                            value={form.description}
                                            onChange={handleChange}
                                            rows={4}
                                            disabled={!showForm || submitting}
                                            placeholder="Describe the work and any important instructions..."
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                        />
                                    </div>

                                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            disabled={submitting}
                                            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting || assigneeLoading}
                                            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {submitting
                                                ? "Saving..."
                                                : editingTask
                                                  ? "Update Task"
                                                  : "Create Task"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {canManageTasks && (
                    <section className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
                            <div>
                                <h2 className="font-semibold text-slate-900">
                                    Completion Requests
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {completionSubmissions.length} pending review
                                    {completionSubmissions.length === 1 ? "" : "s"}
                                </p>
                            </div>
                        </div>
                        {completionSubmissions.length === 0 ? (
                            <p className="p-5 text-sm text-slate-500">
                                There are no completion reports awaiting review.
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {completionSubmissions.map((submission) => (
                                    <div
                                        key={submission.submission_id}
                                        className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {submission.task_title ||
                                                    `Task #${submission.task_id}`}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Submitted by{" "}
                                                {submission.submitted_by_name ||
                                                    `User #${submission.submitted_by}`}
                                                {" · "}
                                                {formatDate(submission.submitted_at)}
                                                {" · "}
                                                {submission.media_count ?? 0} attachment
                                                {(submission.media_count ?? 0) === 1
                                                    ? ""
                                                    : "s"}
                                            </p>
                                            {isDistrictManager && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {submission.district_name ||
                                                        `District #${submission.district_id}`}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openCompletionReview(submission)
                                            }
                                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
                                        >
                                            <Eye size={15} />
                                            Review report
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                {isTaskOnly
                                    ? "My Assigned Tasks"
                                    : isDistrictManager
                                      ? "District Tasks"
                                      : canManageTasks
                                        ? "All Tasks"
                                        : "Tasks"}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {loading
                                    ? "Loading tasks..."
                                    : `${tasks.length} task${tasks.length === 1 ? "" : "s"} found`}
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
                            <RefreshCw size={18} className="animate-spin" />
                            Loading tasks...
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="p-12 text-center">
                            <ClipboardList size={36} className="mx-auto mb-3 text-slate-300" />
                            <p className="font-medium text-slate-700">
                                {isTaskOnly ? "No tasks assigned to you" : "No tasks found"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                {isTaskOnly
                                    ? "Your assigned tasks will appear here."
                                    : canManageTasks
                                      ? "Create a task to get started."
                                      : "Tasks available to your role will appear here."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">SL.No</th>
                                        <th className="px-4 py-3 font-semibold">Task Title</th>
                                        <th className="px-4 py-3 font-semibold">Incident</th>
                                        {isDistrictManager && <th className="px-4 py-3 font-semibold">District</th>}
                                        {!isTaskOnly && <th className="px-4 py-3 font-semibold">Assigned To</th>}
                                        <th className="px-4 py-3 font-semibold">Priority</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold">Due Date</th>
                                        {!isTaskOnly && <th className="px-4 py-3 font-semibold">Created By</th>}
                                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tasks.map((task, index) => (
                                        <tr key={task.id} className="transition-colors hover:bg-slate-50">
                                            <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-600">{index + 1}</td>
                                            <td className="min-w-[180px] px-4 py-4">
                                                <p className="font-semibold text-slate-900">{task.title}</p>
                                                {task.description && (
                                                    <p className="mt-1 max-w-xs truncate text-xs text-slate-500">{task.description}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600">{task.incident_title}</td>
                                            {isDistrictManager && (
                                                <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                                                    {getTaskDistrictName(task)}
                                                </td>
                                            )}
                                            {!isTaskOnly && (
                                                <td className="px-4 py-4 text-slate-700">
                                                    <p>{task.assigned_to_name}</p>
                                                    {task.assigned_to_type && (
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {formatLabel(task.assigned_to_type)}
                                                            {task.assigned_to_phone ? ` · ${task.assigned_to_phone}` : ""}
                                                        </p>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_STYLES[task.priority] ?? "bg-slate-100 text-slate-700"}`}>
                                                    {formatLabel(task.priority)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[task.status] ?? "bg-slate-100 text-slate-700"}`}>
                                                    {formatLabel(task.status)}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <CalendarDays size={14} className="text-slate-400" />
                                                    {formatDate(task.due_at)}
                                                </span>
                                            </td>
                                            {!isTaskOnly && <td className="px-4 py-4 text-slate-600">{task.created_by_name}</td>}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {renderWorkflowActions(task)}
                                                    <button
                                                        type="button"
                                                        onClick={() => openTaskDetails(task)}
                                                        title="View task details"
                                                        aria-label={`View task ${task.id}`}
                                                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {canManageTasks &&
                                                        !["completed", "cancelled"].includes(task.status) && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditForm(task)}
                                                                title="Edit task"
                                                                aria-label={`Edit task ${task.id}`}
                                                                disabled={!canManageDistrictTask(task)}
                                                                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteTask(task)}
                                                                disabled={deletingTaskId === task.id || !canManageDistrictTask(task)}
                                                                title="Delete task"
                                                                aria-label={`Delete task ${task.id}`}
                                                                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {deletingTaskId === task.id
                                                                    ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                                                                    : <Trash2 size={16} />}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {selectedTask && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
                        onClick={() => setSelectedTask(null)}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="task-detail-title"
                            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-start justify-between border-b border-slate-200 p-5">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Task #{selectedTask.id}
                                    </p>
                                    <h2 id="task-detail-title" className="mt-1 text-xl font-bold text-slate-900">
                                        {selectedTask.title}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTask(null)}
                                    aria-label="Close task details"
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-5 p-5">
                                <div>
                                    <h3 className="mb-1 text-sm font-semibold text-slate-700">Description / Instructions</h3>
                                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                        {selectedTask.description || "No description provided."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs text-slate-500">Related Incident</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">
                                            {selectedTask.incident_title}
                                            {selectedTask.incident_no ? (
                                                <span className="ml-1 text-xs font-normal text-slate-500">({selectedTask.incident_no})</span>
                                            ) : null}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">District</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">
                                            {getTaskDistrictName(selectedTask) || "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Task Type</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">{formatLabel(selectedTask.task_type || "manual")}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Priority</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">{formatLabel(selectedTask.priority)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Status</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">{formatLabel(selectedTask.status)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Due Date</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(selectedTask.due_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Assigned To</p>
                                        <p className="mt-1 text-sm font-medium text-slate-800">
                                            {selectedTask.assigned_to_name}
                                            {selectedTask.assigned_to_type ? (
                                                <span className="ml-1 text-xs font-normal text-slate-500">({selectedTask.assigned_to_type})</span>
                                            ) : null}
                                        </p>
                                        {selectedTask.assigned_to_phone && (
                                            <p className="mt-0.5 text-xs text-slate-500">{selectedTask.assigned_to_phone}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Location</p>
                                        <p className="mt-1 inline-flex items-start gap-1 text-sm font-medium text-slate-800">
                                            <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                                            {selectedTask.location || "Not specified"}
                                        </p>
                                    </div>
                                    {!isTaskOnly && (
                                        <div>
                                            <p className="text-xs text-slate-500">Created By</p>
                                            <p className="mt-1 text-sm font-medium text-slate-800">{selectedTask.created_by_name}</p>
                                        </div>
                                    )}
                                </div>

                                {(loadingTaskCompletionFeedback ||
                                    taskCompletionFeedbackError ||
                                    taskCompletionFeedback) && (
                                    <section
                                        aria-live="polite"
                                        className={`rounded-lg border p-4 ${
                                            taskCompletionFeedback?.status ===
                                                "approved" ||
                                            taskCompletionFeedback?.submission_status ===
                                                "approved"
                                                ? "border-green-200 bg-green-50 text-green-900"
                                                : taskCompletionFeedback?.status ===
                                                    "rejected" ||
                                                  taskCompletionFeedback?.submission_status ===
                                                    "rejected"
                                                  ? "border-orange-200 bg-orange-50 text-orange-900"
                                                  : "border-amber-200 bg-amber-50 text-amber-900"
                                        }`}
                                    >
                                        {loadingTaskCompletionFeedback ? (
                                            <p className="text-sm">
                                                Loading completion review status...
                                            </p>
                                        ) : taskCompletionFeedbackError ? (
                                            <p role="alert" className="text-sm">
                                                {taskCompletionFeedbackError}
                                            </p>
                                        ) : (
                                            <>
                                                <h3 className="text-sm font-semibold">
                                                    {(
                                                        taskCompletionFeedback.status ??
                                                        taskCompletionFeedback.submission_status
                                                    ) === "approved"
                                                        ? "Completion approved"
                                                        : (
                                                              taskCompletionFeedback.status ??
                                                              taskCompletionFeedback.submission_status
                                                          ) === "rejected"
                                                          ? "Completion needs changes"
                                                          : "Completion awaiting review"}
                                                </h3>
                                                <p className="mt-1 whitespace-pre-wrap text-sm">
                                                    {(
                                                        taskCompletionFeedback.status ??
                                                        taskCompletionFeedback.submission_status
                                                    ) === "approved"
                                                        ? "Your completion report was approved by an administrator. This task is complete."
                                                        : (
                                                              taskCompletionFeedback.status ??
                                                              taskCompletionFeedback.submission_status
                                                          ) === "rejected"
                                                          ? taskCompletionFeedback.rejection_reason ||
                                                            "An administrator rejected the completion report. Please update the work and submit it again."
                                                          : "Your completion report has been received and is awaiting administrator review."}
                                                </p>
                                                {taskCompletionFeedback.reviewed_at && (
                                                    <p className="mt-2 text-xs opacity-80">
                                                        Reviewed{" "}
                                                        {formatDate(
                                                            taskCompletionFeedback.reviewed_at
                                                        )}
                                                        {taskCompletionFeedback.reviewed_by_name
                                                            ? ` by ${taskCompletionFeedback.reviewed_by_name}`
                                                            : ""}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </section>
                                )}

                                {selectedTask.completion_report && (
                                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                                        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                                            <FileText size={15} />
                                            Completion Report
                                        </h3>
                                        <p className="whitespace-pre-wrap text-sm leading-6 text-amber-900/90">
                                            {selectedTask.completion_report}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 p-5">
                                {renderWorkflowActions(selectedTask)}
                                {canManageTasks &&
                                    canManageDistrictTask(selectedTask) &&
                                    !["completed", "cancelled"].includes(selectedTask.status) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const task = selectedTask;
                                            setSelectedTask(null);
                                            openEditForm(task);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                        <Pencil size={15} />
                                        Edit Task
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedTask(null)}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedCompletionSubmission && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                        onClick={() => {
                            if (reviewingSubmissionId == null) {
                                setSelectedCompletionSubmission(null);
                                setCompletionSubmissionDetail(null);
                            }
                        }}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="completion-review-title"
                            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-start justify-between border-b border-slate-200 p-5">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                        Completion request #
                                        {selectedCompletionSubmission.submission_id}
                                    </p>
                                    <h2
                                        id="completion-review-title"
                                        className="mt-1 text-xl font-bold text-slate-900"
                                    >
                                        {completionSubmissionDetail?.submission
                                            ?.task_title ||
                                            selectedCompletionSubmission.task_title ||
                                            `Task #${selectedCompletionSubmission.task_id}`}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCompletionSubmission(null);
                                        setCompletionSubmissionDetail(null);
                                    }}
                                    disabled={reviewingSubmissionId != null}
                                    aria-label="Close completion review"
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {completionDetailLoading ? (
                                <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
                                    <RefreshCw size={18} className="animate-spin" />
                                    Loading completion report...
                                </div>
                            ) : completionSubmissionDetail ? (
                                <>
                                    <div className="space-y-5 p-5">
                                        {error && (
                                            <p
                                                role="alert"
                                                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                                            >
                                                {error}
                                            </p>
                                        )}
                                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                                            <p className="text-slate-600">
                                                <span className="font-medium text-slate-800">
                                                    Submitted by:
                                                </span>{" "}
                                                {completionSubmissionDetail.submission
                                                    .submitted_by_name ||
                                                    `User #${completionSubmissionDetail.submission.submitted_by}`}
                                            </p>
                                            <p className="text-slate-600">
                                                <span className="font-medium text-slate-800">
                                                    Submitted:
                                                </span>{" "}
                                                {formatDate(
                                                    completionSubmissionDetail.submission
                                                        .submitted_at
                                                )}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
                                                <FileText size={15} />
                                                Completion report
                                            </h3>
                                            <p className="whitespace-pre-wrap text-sm leading-6 text-amber-950">
                                                {completionSubmissionDetail.submission
                                                    .report || "No report provided."}
                                            </p>
                                        </div>

                                        {completionSubmissionDetail.media.length > 0 && (
                                            <div>
                                                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                                                    Submitted evidence
                                                </h3>
                                                <ul className="space-y-2">
                                                    {completionSubmissionDetail.media.map(
                                                        (media) => (
                                                            <li
                                                                key={media.id}
                                                                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"
                                                            >
                                                                <span className="min-w-0 truncate text-slate-700">
                                                                    {media.original_name}
                                                                </span>
                                                                <span className="shrink-0 text-xs text-slate-500">
                                                                    {formatLabel(
                                                                        media.media_type
                                                                    )}
                                                                    {" · "}
                                                                    {Math.ceil(
                                                                        (media.file_size ||
                                                                            0) / 1024
                                                                    )}{" "}
                                                                    KB
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleCompletionMediaDownload(
                                                                            media
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        downloadingMediaId ===
                                                                        media.id
                                                                    }
                                                                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                                                >
                                                                    <Download
                                                                        size={13}
                                                                    />
                                                                    {downloadingMediaId ===
                                                                    media.id
                                                                        ? "Downloading..."
                                                                        : "Download"}
                                                                </button>
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </div>
                                        )}

                                        <div>
                                            <label
                                                htmlFor="completion-rejection-reason"
                                                className="mb-1 block text-sm font-medium text-slate-700"
                                            >
                                                Rejection reason (required to reject)
                                            </label>
                                            <textarea
                                                id="completion-rejection-reason"
                                                rows={3}
                                                value={rejectionReason}
                                                onChange={(event) =>
                                                    setRejectionReason(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Explain what evidence or work needs to be corrected."
                                                disabled={
                                                    reviewingSubmissionId != null
                                                }
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 p-5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCompletionReview("reject")
                                            }
                                            disabled={
                                                reviewingSubmissionId != null
                                            }
                                            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                                        >
                                            <X size={15} />
                                            {reviewingSubmissionId != null
                                                ? "Reviewing..."
                                                : "Reject"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCompletionReview("approve")
                                            }
                                            disabled={
                                                reviewingSubmissionId != null
                                            }
                                            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                        >
                                            <CheckCircle size={15} />
                                            {reviewingSubmissionId != null
                                                ? "Reviewing..."
                                                : "Approve"}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="p-5">
                                    <p className="text-sm text-red-700">
                                        {error ||
                                            "Unable to load this completion report."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Completion Report Modal (End Task) ───────────────────────── */}
                {completionModalTask && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="completion-modal-title"
                            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
                        >
                            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                                <h2 id="completion-modal-title" className="text-lg font-semibold text-slate-800">
                                    End Task — Submit Report
                                </h2>
                                <button
                                    type="button"
                                    onClick={closeCompletionModal}
                                    disabled={submittingCompletion}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCompletionSubmit} className="space-y-4 p-5">
                                <p className="text-sm text-slate-600">
                                    You are ending{" "}
                                    <span className="font-medium text-slate-800">
                                        {completionModalTask.title}
                                    </span>
                                    . Please provide a completion report. Media upload is optional.
                                </p>

                                <div>
                                    <label
                                        htmlFor="completion-report"
                                        className="mb-1 block text-sm font-medium text-slate-700"
                                    >
                                        Completion Report <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        id="completion-report"
                                        rows={5}
                                        value={completionReport}
                                        onChange={(e) => setCompletionReport(e.target.value)}
                                        placeholder="Describe what was done, outcome, any issues encountered..."
                                        required
                                        minLength={10}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Minimum 10 characters. Required to request completion.
                                    </p>
                                </div>

                                <div>
                                    <label
                                        htmlFor="completion-media"
                                        className="mb-1 block text-sm font-medium text-slate-700"
                                    >
                                        Media / Attachments (optional)
                                    </label>
                                    <input
                                        ref={completionFileInputRef}
                                        id="completion-media"
                                        type="file"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={(e) =>
                                            setCompletionFiles(
                                                e.target.files ? Array.from(e.target.files) : []
                                            )
                                        }
                                        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                                    />
                                    {completionFiles.length > 0 && (
                                        <ul className="mt-2 space-y-1 text-xs text-slate-600">
                                            {completionFiles.map((f) => (
                                                <li key={f.name + f.size} className="flex items-center gap-1.5">
                                                    <Upload size={12} />
                                                    {f.name} ({Math.round(f.size / 1024)} KB)
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeCompletionModal}
                                        disabled={submittingCompletion}
                                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingCompletion || !completionReport.trim()}
                                        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                                    >
                                        {submittingCompletion ? (
                                            <>Submitting…</>
                                        ) : (
                                            <>
                                                <Send size={15} />
                                                Submit &amp; Request Completion
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── Cancel Confirmation Modal ────────────────────────────────── */}
                {cancelConfirmTask && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="cancel-modal-title"
                            className="w-full max-w-md rounded-xl bg-white shadow-xl"
                        >
                            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                                <h2 id="cancel-modal-title" className="text-lg font-semibold text-slate-800">
                                    Cancel Task
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setCancelConfirmTask(null)}
                                    disabled={updatingTaskId === cancelConfirmTask.id}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 p-5">
                                <p className="text-sm text-slate-600">
                                    Are you sure you want to cancel{" "}
                                    <span className="font-medium text-slate-800">
                                        {cancelConfirmTask.title}
                                    </span>
                                    ? This action sets the status to <strong>cancelled</strong> and
                                    cannot be undone from the UI.
                                </p>

                                <div className="flex flex-wrap justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCancelConfirmTask(null)}
                                        disabled={updatingTaskId === cancelConfirmTask.id}
                                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        Keep Task
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCancelTask(cancelConfirmTask)}
                                        disabled={updatingTaskId === cancelConfirmTask.id}
                                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        <Ban size={15} />
                                        {updatingTaskId === cancelConfirmTask.id
                                            ? "Cancelling…"
                                            : "Yes, Cancel Task"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
