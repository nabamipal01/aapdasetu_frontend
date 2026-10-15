import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  X,
  RefreshCw,
  CheckCircle2,
  MapPin,
  Pencil,
} from "lucide-react";

import {
  listTasks,
  createTask,
  updateTask,
  listUsers,
} from "../../services";

import { useAuth } from "../../context/AuthContext";
import { listIncidents } from "../../services/incidentService";
import { listVolunteers } from "../../services/volunteerService";
import { listAgencies } from "../../services/agencyService";
import { isOperationalUser, isVolunteer } from "../../utils/roles";
import DownloadMenu from "../../components/common/DownloadMenu";
import { getUser } from "../../services/userService";

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const PRIORITY_STYLES = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const TASK_TYPE_STYLES = {
  sop: "bg-purple-100 text-purple-700",
  manual: "bg-blue-100 text-blue-700",
  field: "bg-indigo-100 text-indigo-700",
  logistics: "bg-cyan-100 text-cyan-700",
  medical: "bg-pink-100 text-pink-700",
  other: "bg-slate-100 text-slate-600",
};

const EMPTY_FORM = {
  incident_id: "",
  title: "",
  description: "",
  assigned_to: "",
  priority: "",
  task_type: "",
  due_at: "",
};

/**
 * Extract arrays from common API response formats.
 */
const extractRecords = (response, key) => {
  const candidates = [
    response?.data?.data?.[key],
    response?.data?.[key],
    response?.[key],
    response?.data?.items,
    response?.data?.data?.items,
    response?.data?.data,
    response?.data,
  ];

  return candidates.find(Array.isArray) ?? [];
};

/**
 * Verify active status when the API returns it.
 * If status is omitted, trust the API's status=active filter.
 */
const isActiveRecord = (record) => {
  const status =
    record?.status ??
    record?.account_status ??
    record?.user_status;

  return (
    status == null ||
    String(status).trim().toLowerCase() === "active"
  );
};

/**
 * Normalize different task API response formats.
 */
const normalizeTask = (task = {}) => {
  const incident = task.incident || {};

  const assignedUser =
    task.assigned_to &&
    typeof task.assigned_to === "object"
      ? task.assigned_to
      : {};

  const createdBy =
    task.created_by &&
    typeof task.created_by === "object"
      ? task.created_by
      : {};

  return {
    ...task,

    id: task.id,

    // Incident
    incident_id:
      task.incident_id ??
      incident.id ??
      null,

    incident_no:
      task.incident_no ??
      incident.incident_no ??
      "",

    incident_title:
      task.incident_title ??
      incident.title ??
      "",

    incident_type:
      task.incident_type ??
      incident.incident_type ??
      "",

    incident_status:
      task.incident_status ??
      incident.status ??
      "",

    incident_severity:
      task.incident_severity ??
      incident.severity ??
      "",

    latitude:
      task.latitude ??
      incident.latitude ??
      null,

    longitude:
      task.longitude ??
      incident.longitude ??
      null,

    // Assigned user
    assigned_to:
      typeof task.assigned_to === "object"
        ? task.assigned_to?.id ?? null
        : task.assigned_to ?? null,

    assigned_to_name:
      task.assigned_to_name ??
      assignedUser.name ??
      assignedUser.full_name ??
      "",

    assigned_to_email:
      task.assigned_to_email ??
      assignedUser.email ??
      "",

    assigned_to_phone:
      task.assigned_to_phone ??
      assignedUser.phone ??
      "",

    assigned_to_role:
      task.assigned_to_role ??
      assignedUser.role ??
      "",

    // Task creator
    created_by:
      typeof task.created_by === "object"
        ? task.created_by?.id ?? null
        : task.created_by ?? null,

    created_by_name:
      task.created_by_name ??
      createdBy.name ??
      createdBy.full_name ??
      "",

    created_by_email:
      task.created_by_email ??
      createdBy.email ??
      "",

    created_by_role:
      task.created_by_role ??
      createdBy.role ??
      "",

    // Task fields
    title: task.title ?? "",
    description: task.description ?? "",
    task_type: task.task_type ?? "",
    priority: task.priority ?? "",
    status: task.status ?? "",
    due_at: task.due_at ?? null,
    started_at: task.started_at ?? null,
    completed_at: task.completed_at ?? null,
    created_at: task.created_at ?? null,
    updated_at: task.updated_at ?? null,
  };
};

/**
 * Normalize volunteer records to login-user IDs.
 *
 * assigned_to must contain the users-table ID,
 * not the volunteer profile ID.
 */
const getVolunteerUserId = (volunteer) =>
  volunteer.user_id ??
  volunteer.account_id ??
  volunteer.user?.id ??
  volunteer.account?.id ??
  volunteer.login_user?.id ??
  null;

const getVolunteerProfileIdFromUser = (user) =>
  user?.linked_id ??
  user?.volunteer_id ??
  user?.volunteerId ??
  user?.volunteer_profile_id ??
  user?.volunteerProfileId ??
  user?.volunteer?.id ??
  null;

const normalizeVolunteer = (volunteer) => {
  const userId = getVolunteerUserId(volunteer);

  const name =
    volunteer.name ??
    volunteer.full_name ??
    volunteer.volunteer_name ??
    volunteer.user?.name ??
    volunteer.user?.full_name ??
    volunteer.email ??
    "Unnamed Volunteer";

  return {
    id: userId == null ? "" : String(userId),
    name,
    type: "volunteer",
    profileId: volunteer.id,
    profileStatus: volunteer.status,
    accountStatus:
      volunteer.user?.status ??
      volunteer.user?.account_status ??
      volunteer.account?.status ??
      volunteer.account?.account_status ??
      volunteer.account_status ??
      volunteer.user_status ??
      null,
  };
};


const isAssignableVolunteer = (volunteer) => {
  // The volunteer profile itself must be active.
  if (
    String(volunteer?.status ?? "")
      .trim()
      .toLowerCase() !== "active"
  ) {
    return false;
  }

  // Never substitute a volunteer profile ID for a user ID.
  const userId = getVolunteerUserId(volunteer);

  if (userId == null || String(userId).trim() === "") {
    return false;
  }

  // If account status is available, it must be active.
  const accountStatus =
    volunteer.user?.status ??
    volunteer.user?.account_status ??
    volunteer.user?.user_status ??
    volunteer.account?.status ??
    volunteer.account?.account_status ??
    volunteer.account_status ??
    volunteer.user_status;

  if (
    accountStatus != null &&
    String(accountStatus).trim().toLowerCase() !== "active"
  ) {
    return false;
  }

  // Account status isn't exposed by every volunteer-list API.
  // In that case, the backend must validate the account.
  return true;
};

/**
 * Normalize agency records to the NGO contact's login-user ID.
 */
const normalizeAgency = (agency) => {
  const userId =
    agency.contact_user_id ??
    agency.user_id ??
    agency.account_id ??
    agency.contact?.user_id ??
    agency.contact?.id ??
    agency.id;

  const contactName =
    agency.contact_person ??
    agency.contact_person_name ??
    agency.contact_name ??
    agency.contact?.name ??
    "";

  const agencyName =
    agency.name ??
    agency.agency_name ??
    agency.organization_name ??
    "Unnamed NGO";

  return {
    id: userId == null ? "" : String(userId),
    name: contactName
      ? `${contactName} — ${agencyName}`
      : agencyName,
    type: "ngo",
  };
};

function Task() {
  const { user } = useAuth();

  // Volunteers and NGO operational users can only view
  // their assigned tasks and cannot create or edit tasks.
  const isTaskOnly = isOperationalUser(user);
  const [volunteers, setVolunteers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [assignees, setAssignees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [creatorNames, setCreatorNames] = useState({});

useEffect(() => {
  const fetchCreatorNames = async () => {
    const creatorIds = [
      ...new Set(
        tasks
          .map((task) => task.created_by)
          .filter((id) => id != null && id !== "")
          .map(String)
      ),
    ];

    const missingIds = creatorIds.filter(
      (id) => !creatorNames[id]
    );

    if (missingIds.length === 0) return;

    try {
      const results = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const response = await getUser(id);

            const user =
              response?.data?.data?.user ??
              response?.data?.user ??
              response?.data?.data ??
              response?.data;

            return [
              id,
              user?.name ??
                user?.full_name ??
                user?.username ??
                `User #${id}`,
            ];
          } catch (error) {
            console.error(
              `Failed to fetch creator ${id}:`,
              error
            );
            return [id, `User #${id}`];
          }
        })
      );

      setCreatorNames((previous) => ({
        ...previous,
        ...Object.fromEntries(results),
      }));
    } catch (error) {
      console.error("Failed to load creator names:", error);
    }
  };

  fetchCreatorNames();
}, [tasks, creatorNames]);

const getCreatorName = (createdBy) => {
  if (createdBy == null || createdBy === "") {
    return "Unknown";
  }

  return creatorNames[String(createdBy)] ??
    `User #${createdBy}`;
};


  /**
   * Fetch tasks and form options.
   */
//   const fetchTasks = useCallback(async () => {
//     setLoading(true);
//     setError("");

//     try {
//       const taskParams = {
//         page: 1,
//         limit: 50,
//       };

//       let taskAssigneeId = user?.id;

//       if (isTaskOnly && isVolunteer(user)) {
//         let volunteerProfileId =
//           getVolunteerProfileIdFromUser(user);

//         if (
//           (volunteerProfileId == null ||
//             String(volunteerProfileId).trim() === "") &&
//           user?.id != null
//         ) {
//           const volunteerResponse = await listVolunteers({
//             page: 1,
//             per_page: 100,
//           });
//           const currentVolunteer = extractRecords(
//             volunteerResponse,
//             "volunteers"
//           ).find(
//             (volunteer) =>
//               String(getVolunteerUserId(volunteer)) ===
//               String(user.id)
//           );

//           volunteerProfileId = currentVolunteer?.id ?? null;
//         }

//         if (
//           volunteerProfileId == null ||
//           String(volunteerProfileId).trim() === ""
//         ) {
//           setTasks([]);
//           setError(
//             "Unable to identify your volunteer profile. Please contact an administrator."
//           );
//           return;
//         }

//         taskAssigneeId = volunteerProfileId;
//       }

//       // if (isTaskOnly) {
//       //   if (!user?.id) {
//       //     setTasks([]);
//       //     setError(
//       //       "Unable to identify the logged-in user."
//       //     );
//       //     return;
//       //   }
//       //   const volunteerProfileId = user.volunteer_id;
//       //   if (!volunteerProfileId) {
//       //     setTasks([]);
//       //     setError(
//       //       "Your volunteer profile ID is missing from your login details."
//       //     );
//       //     return;
//       //   }

//       //   taskParams.assigned_to = Number(volunteerProfileId);
//         // Ask the API for tasks assigned to this account.
//         // taskParams.assigned_to = Number(user.id);
//       // }

// //       const taskResponse = await listTasks(taskParams);
// //       const rawTasks = extractRecords(taskResponse, "tasks");

// //       console.log("Logged-in user:", user);
// // console.log("Task request params:", taskParams);
// // console.log("Task API response:", taskResponse);

// // console.log(
// //   "Task response JSON:",
// //   JSON.stringify(taskResponse, null, 2)
// // );

// // console.table(
// //   rawTasks.map((task) => ({
// //     taskId: task.id,
// //     title: task.title,
// //     createdBy: task.created_by,
// //     createdByName: task.created_by_name,
// //     createdByEmail: task.created_by_email,
// //     createdByRole: task.created_by_role,
// //     assignedTo:
// //       typeof task.assigned_to === "object"
// //         ? task.assigned_to?.id
// //         : task.assigned_to,
// //     status: task.status,
// //   }))
// // );


// //       const normalizedTasks = rawTasks.map(normalizeTask);

// //       const visibleTasks = isTaskOnly
// //   ? normalizedTasks.filter(
// //       (task) =>
// //         String(task.assigned_to ?? "") ===
// //         String(user.volunteer_id)
// //     )
// //   : normalizedTasks;

// // setTasks(visibleTasks);

//       // Supplementary frontend filtering.
//       // Backend authorization must also enforce this restriction.
// //       const currentVolunteer = volunteers.find(
// // (volunteer) =>
// // String(getVolunteerUserId(volunteer)) === String(user?.id)
// // );

// // const currentVolunteerId = currentVolunteer?.profileId;
// // const visibleTasks = isTaskOnly
// // ? normalizedTasks.filter(
// // (task) =>
// // String(task.assigned_to ?? "") === String(currentVolunteerId ?? "")
// // )
// // : normalizedTasks;
// // setTasks(visibleTasks);

//       // const visibleTasks = isTaskOnly
//       //   ? normalizedTasks.filter(
//       //       (task) =>
//       //         String(task.assigned_to ?? "") ===
//       //         String(user.id)
//       //     )
//       //   : normalizedTasks;

//       // setTasks(visibleTasks);

//       const taskResponse = await listTasks(taskParams);
// const rawTasks = extractRecords(taskResponse, "tasks");
// const normalizedTasks = rawTasks.map(normalizeTask);

// let visibleTasks = normalizedTasks;

// if (isTaskOnly) {
//   visibleTasks = normalizedTasks.filter(
//     (task) =>
//       String(task.assigned_to ?? "") ===
//       String(taskAssigneeId ?? "")
//   );
// }

// setTasks(visibleTasks);

//       // Operational users do not need admin form options.
//       if (isTaskOnly) {
//         setIncidents([]);
//         setAssignees([]);
//         return;
//       }

//       // Load incidents and active operational assignees.
//       const [
//         incidentResult,
//         volunteerResult,
//         agencyResult,
//       ] = await Promise.allSettled([
//         listIncidents({
//           page: 1,
//           per_page: 100,
//         }),

//         listVolunteers({
//           status: "active",
//           page: 1,
//           per_page: 100,
//         }),

//         listAgencies({
//           status: "active",
//           page: 1,
//           per_page: 100,
//         }),
//       ]);

//       const rawIncidents =
//         incidentResult.status === "fulfilled"
//           ? extractRecords(
//               incidentResult.value,
//               "incidents"
//             )
//           : [];

//       const rawVolunteers =
//         volunteerResult.status === "fulfilled"
//           ? extractRecords(
//               volunteerResult.value,
//               "volunteers"
//             )
//           : [];

//       const rawAgencies =
//         agencyResult.status === "fulfilled"
//           ? extractRecords(
//               agencyResult.value,
//               "agencies"
//             )
//           : [];

//       setIncidents(rawIncidents);

//       // Only active volunteers and active agencies are options.
//       const volunteerAssignees = rawVolunteers
//         .filter(
//           (volunteer) =>
//             String(volunteer.status ?? "").trim().toLowerCase() === "active"
//         )
//         .map((volunteer) => ({
//           id: String(volunteer.id),
//           name:
//             volunteer.name ??
//             volunteer.full_name ??
//             volunteer.volunteer_name ??
//             volunteer.email ??
//             "Unnamed Volunteer",
//           type: "volunteer",
//           profileId: volunteer.id,
//         }));

//       const agencyAssignees = rawAgencies
//         .filter(isActiveRecord)
//         .map(normalizeAgency);

//       // Deduplicate by login-account ID.
//       const uniqueAssignees = new Map();

//       [...volunteerAssignees, ...agencyAssignees].forEach(
//         (assignee) => {
//           if (
//             assignee.id &&
//             assignee.id !== "undefined" &&
//             assignee.id !== "null"
//           ) {
//             uniqueAssignees.set(
//               assignee.id,
//               assignee
//             );
//           }
//         }
//       );

//       setAssignees([...uniqueAssignees.values()]);

//       if (
//         incidentResult.status === "rejected" ||
//         volunteerResult.status === "rejected" ||
//         agencyResult.status === "rejected"
//       ) {
//         setError(
//           "Some task form options could not be loaded. Please refresh and try again."
//         );
//       }
//     } catch (err) {
//       setTasks([]);
//       setError(
//         err?.message || "Failed to load tasks."
//       );
//     } finally {
//       setLoading(false);
//     }
//   }, [isTaskOnly, user?.id]);

  
const fetchTasks = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const taskParams = {
      page: 1,
      limit: 50,
    };

    if (isTaskOnly) {
      // let assigneeId = user?.id;

      // if (isVolunteer(user)) {
      //   assigneeId = getVolunteerProfileIdFromUser(user);

      //   if (
      //     assigneeId == null ||
      //     String(assigneeId).trim() === ""
      //   ) {
      //     setTasks([]);
      //     setError(
      //       "Your volunteer profile ID is missing. " +
      //       "The task API requires the volunteer profile ID, " +
      //       "not your login user ID. Please contact an administrator."
      //     );
      //     return;
      //   }
      // }

      // taskParams.assigned_to = Number(assigneeId);
      
let assigneeId = user?.id;

if (isTaskOnly && isVolunteer(user)) {
  let volunteerProfileId =
    getVolunteerProfileIdFromUser(user);

  // Login data may not contain linked_id, so fetch user details.
  if (
    volunteerProfileId == null ||
    String(volunteerProfileId).trim() === ""
  ) {
    const userResponse = await getUser(user.id);

    const userDetails =
      userResponse?.data?.data?.user ??
      userResponse?.data?.user ??
      userResponse?.data?.data ??
      userResponse?.data;

    volunteerProfileId =
      getVolunteerProfileIdFromUser(userDetails);
  }

  if (
    volunteerProfileId == null ||
    String(volunteerProfileId).trim() === ""
  ) {
    setTasks([]);
    setError(
      "Unable to identify your volunteer profile. Please contact an administrator."
    );
    return;
  }

  assigneeId = volunteerProfileId;
}

taskParams.assigned_to = Number(assigneeId);

    }

    const response = await listTasks(taskParams);
    const rawTasks = extractRecords(response, "tasks");
    const normalizedTasks = rawTasks.map(normalizeTask);

    // Keep the frontend filter as an additional safeguard.
    const visibleTasks = isTaskOnly
      ? normalizedTasks.filter(
          (task) =>
            String(task.assigned_to ?? "") ===
            String(taskParams.assigned_to)
        )
      : normalizedTasks;

    setTasks(visibleTasks);

    if (isTaskOnly) {
      setIncidents([]);
      setAssignees([]);
      return;
    }

    const [
      incidentResult,
      volunteerResult,
      agencyResult,
    ] = await Promise.allSettled([
      listIncidents({ page: 1, per_page: 100 }),
      listVolunteers({
        status: "active",
        page: 1,
        per_page: 100,
      }),
      listAgencies({
        status: "active",
        page: 1,
        per_page: 100,
      }),
    ]);

    const rawIncidents =
      incidentResult.status === "fulfilled"
        ? extractRecords(incidentResult.value, "incidents")
        : [];

    const rawVolunteers =
      volunteerResult.status === "fulfilled"
        ? extractRecords(volunteerResult.value, "volunteers")
        : [];

    const rawAgencies =
      agencyResult.status === "fulfilled"
        ? extractRecords(agencyResult.value, "agencies")
        : [];

    setIncidents(rawIncidents);

    const volunteerAssignees = rawVolunteers
      .filter(isAssignableVolunteer)
      .map(normalizeVolunteer);

    const agencyAssignees = rawAgencies
      .filter(isActiveRecord)
      .map(normalizeAgency);

    const uniqueAssignees = new Map();

    [...volunteerAssignees, ...agencyAssignees].forEach(
      (assignee) => {
        if (assignee.id) {
          uniqueAssignees.set(assignee.id, assignee);
        }
      }
    );

    setAssignees([...uniqueAssignees.values()]);

    if (
      incidentResult.status === "rejected" ||
      volunteerResult.status === "rejected" ||
      agencyResult.status === "rejected"
    ) {
      setError(
        "Some task form options could not be loaded. Please refresh and try again."
      );
    }
  } catch (err) {
    setTasks([]);
    setError(err?.message || "Failed to load tasks.");
  } finally {
    setLoading(false);
  }
}, [isTaskOnly, user]);


  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /**
   * Form field changes.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Reset create/edit form.
   */
  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingTask(null);
    setShowForm(false);
  };

  /**
   * Create or update task.
   */
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!form.incident_id || !form.title.trim()) {
      setError("Incident and Title are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        incident_id: Number(form.incident_id),
        title: form.title.trim(),

        ...(form.description.trim() && {
          description: form.description.trim(),
        }),

        ...(form.assigned_to && {
          assigned_to: Number(form.assigned_to),
        }),

        ...(form.priority && {
          priority: form.priority,
        }),

        ...(form.task_type && {
          task_type: form.task_type,
        }),

        ...(form.due_at && {
          due_at: form.due_at.replace("T", " "),
        }),
      };

      if (editingTask) {
        await updateTask(editingTask.id, payload);
      } else {
        await createTask(payload);
      }

      setSuccess(
        editingTask
          ? "Task updated successfully."
          : "Task created successfully."
      );

      resetForm();

      // Reload complete server data after the operation.
      await fetchTasks();
    } catch (err) {
      setError(
        err?.message ||
          (editingTask
            ? "Failed to update task."
            : "Failed to create task.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Open the edit form.
   */
  const startEditingTask = (task) => {
    setEditingTask(task);

    setForm({
      incident_id: String(task.incident_id ?? ""),
      title: task.title ?? "",
      description: task.description ?? "",
      assigned_to:
        task.assigned_to != null
          ? String(task.assigned_to)
          : "",
      priority: task.priority ?? "",
      task_type: task.task_type ?? "",
      due_at: task.due_at
        ? String(task.due_at)
            .replace(" ", "T")
            .slice(0, 19)
        : "",
    });

    setShowForm(true);
    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-[1800px]">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList
              className="text-indigo-500"
              size={28}
            />

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Tasks
              </h1>

              <p className="text-sm text-slate-500">
                Track and manage response tasks
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchTasks}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={
                  loading ? "animate-spin" : ""
                }
              />
              Refresh
            </button>

            {!isTaskOnly && (
              <button
                type="button"
                onClick={() => {
                  if (editingTask) {
                    resetForm();
                  } else {
                    setShowForm((prev) => !prev);
                  }

                  setError("");
                  setSuccess("");
                }}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {showForm ? (
                  <>
                    <X size={15} />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Create Task
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ALERTS */}
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

        {/* CREATE / EDIT FORM */}
        {!isTaskOnly && (
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
                  {editingTask
                    ? "Edit Task"
                    : "Create New Task"}
                </h2>

                <form onSubmit={handleCreate}>
                  <div className="grid gap-4 sm:grid-cols-2">

                    {/* TITLE */}
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Title *
                      </label>

                      <input
                        name="title"
                        required
                        value={form.title}
                        onChange={handleChange}
                        placeholder="e.g. Deploy rescue team to Zone B"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    {/* INCIDENT */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Incident No *
                      </label>

                      <select
                        name="incident_id"
                        required
                        value={form.incident_id}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">
                          Select incident
                        </option>

                        {incidents.map((incident) => (
                          <option
                            key={incident.id}
                            value={incident.id}
                          >
                            {incident.incident_no ||
                              `Incident #${incident.id}`}
                            {incident.title
                              ? ` — ${incident.title}`
                              : ""}
                          </option>
                        ))}

                        {editingTask &&
                          form.incident_id &&
                          !incidents.some(
                            (incident) =>
                              String(incident.id) ===
                              form.incident_id
                          ) && (
                            <option value={form.incident_id}>
                              {editingTask.incident_no ||
                                `Incident #${form.incident_id}`}
                            </option>
                          )}
                      </select>
                    </div>

                    {/* ASSIGNEE */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Assign To
                      </label>

                      <select
                        name="assigned_to"
                        value={form.assigned_to}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">
                          Unassigned
                        </option>

                        {assignees.map((assignee) => (
                          <option
                            key={`${assignee.type}-${assignee.id}`}
                            value={assignee.id}
                          >
                            {assignee.name} (
                            {assignee.type === "volunteer"
                              ? "Volunteer"
                              : "NGO Contact"}
                            )
                          </option>
                        ))}

                        {/* Preserve the current assignee when
                            they are no longer in the active list. */}
                        {editingTask &&
                          form.assigned_to &&
                          !assignees.some(
                            (assignee) =>
                              String(assignee.id) ===
                              form.assigned_to
                          ) && (
                            <option value={form.assigned_to}>
                              {editingTask.assigned_to_name ||
                                `User #${form.assigned_to}`}
                            </option>
                          )}
                      </select>

                      <p className="mt-1 text-xs text-slate-500">
                        Only active volunteers and active NGO
                        contacts are listed for new assignments.
                      </p>
                    </div>

                    {/* PRIORITY */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Priority
                      </label>

                      <select
                        name="priority"
                        value={form.priority}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">
                          Select priority
                        </option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    {/* TASK TYPE */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Task Type
                      </label>

                      <select
                        name="task_type"
                        value={form.task_type}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">
                          Select type
                        </option>
                        <option value="sop">SOP</option>
                        <option value="manual">Manual</option>
                        {/* <option value="field">Field</option>
                        <option value="logistics">Logistics</option>
                        <option value="medical">Medical</option>
                        <option value="other">Other</option> */}
                      </select>
                    </div>

                    {/* DUE AT */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Due At
                      </label>

                      <input
                        name="due_at"
                        type="datetime-local"
                        step="1"
                        value={form.due_at}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    {/* DESCRIPTION */}
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Description
                      </label>

                      <textarea
                        name="description"
                        rows={3}
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Task details..."
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                      className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting
                        ? editingTask
                          ? "Saving..."
                          : "Creating..."
                        : editingTask
                          ? "Save Changes"
                          : "Create Task"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TASK TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* TABLE HEADER + DOWNLOAD MENU */}
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-slate-900">
              {isTaskOnly
                ? "My Assigned Tasks"
                : "All Tasks"}

              {!loading && (
                <span className="ml-1 text-sm font-normal text-slate-500">
                  ({tasks.length})
                </span>
              )}
            </h2>

            {/* Export only the records visible to this user. */}
            <DownloadMenu
              records={tasks}
              title={
                isTaskOnly
                  ? "My Assigned Tasks"
                  : "Tasks"
              }
              disabled={loading}
              onError={(err) => {
                setError(
                  err?.message ||
                    "Failed to download tasks."
                );
              }}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2
                size={40}
                className="mb-3 text-slate-300"
              />

              <p className="font-medium text-slate-700">
                {isTaskOnly
                  ? "No tasks assigned to you"
                  : "No tasks found"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {isTaskOnly
                  ? "Tasks assigned to your account will appear here."
                  : "Create a task linked to an incident to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1700px] text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">
                      Task
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Incident No
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Incident
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Assigned To
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Task Type
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Priority
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Status
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Created By
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Location
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="transition-colors hover:bg-slate-50"
                    >

                      {/* TASK */}
                      <td className="px-5 py-4">
                        <div className="max-w-xs font-semibold text-slate-800">
                          {task.title || "—"}
                        </div>
                      </td>

                      {/* INCIDENT NO */}
                      <td className="px-5 py-4">
                        <span className="whitespace-nowrap font-medium text-slate-700">
                          {task.incident_no ||
                            `#${task.incident_id ?? "—"}`}
                        </span>
                      </td>

                      {/* INCIDENT */}
                      <td className="px-5 py-4">
                        <div className="min-w-[180px]">
                          <div className="font-medium text-slate-700">
                            {task.incident_title || "—"}
                          </div>

                          {task.incident_type && (
                            <div className="mt-1 text-xs capitalize text-slate-400">
                              Type: {task.incident_type}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ASSIGNED TO */}
                      <td className="px-5 py-4">
                        <div className="min-w-[160px] font-medium text-slate-700">
                          {task.assigned_to_name ||
                            assignees.find(
                              (assignee) =>
                                String(assignee.id) ===
                                String(task.assigned_to)
                            )?.name ||
                            "Unassigned"} 
                        </div>
                      </td>

                      {/* TASK TYPE */}
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            TASK_TYPE_STYLES[task.task_type] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {task.task_type || "—"}
                        </span>
                      </td>

                      {/* PRIORITY */}
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            PRIORITY_STYLES[task.priority] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {task.priority || "—"}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            STATUS_STYLES[task.status] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {String(task.status || "—").replace(
                            "_",
                            " "
                          )}
                        </span>
                      </td>

                      {/* CREATED BY */}
                      <td className="px-5 py-4">
                        <div className="min-w-[150px] font-medium text-slate-700">
                          {getCreatorName(task.created_by)}
                        </div>
                      </td>

                      {/* LOCATION */}
                      <td className="px-5 py-4">
                        {task.latitude != null &&
                        task.longitude != null ? (
                          <div className="min-w-[150px]">
                            <div className="flex items-center gap-1 text-slate-700">
                              <MapPin
                                size={14}
                                className="text-red-500"
                              />
                              <span>Location</span>
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              Lat: {task.latitude}
                            </div>

                            <div className="text-xs text-slate-400">
                              Lng: {task.longitude}
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* ACTION */}
                      <td className="px-5 py-4">
                        <div className="flex min-w-[150px] items-start">
                          {!isTaskOnly && (
                            <button
                              type="button"
                              onClick={() =>
                                startEditingTask(task)
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                            >
                              <Pencil size={13} />
                              Edit
                            </button>
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
      </div>
    </div>
  );
}

export default Task;