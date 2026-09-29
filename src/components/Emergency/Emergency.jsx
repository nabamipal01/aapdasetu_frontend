import React, { useState } from "react";
import {
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  Siren,
  ShieldAlert,
  Flame,
  HeartPulse,
  Zap,
  Utensils,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/*
|--------------------------------------------------------------------------
| Emergency Department Groups
|--------------------------------------------------------------------------
| Only services having at least one emergency contact detail are included.
|
| Parent Department
|   └── Child Services
|         ├── Phone
|         ├── Email
|         └── Availability
|--------------------------------------------------------------------------
*/

const emergencyDepartments = [
  {
    name: "Electricity Distribution",
    description:
      "Emergency electricity distribution and power-related assistance.",
    icon: Zap,

    services: [
      {
        name: "WBSEDCL",
        fullName: "West Bengal State Electricity Distribution Company Limited",
        phones: ["19121", "8900793100"],
        email: "crmcell@wbsedcl.in",
        availability: "24×7",
      },
      {
        name: "CESC",
        fullName: "CESC Limited",
        phones: ["1912", "7439001912"],
        email: "cesclimited@rpsg.in",
        availability: "24×7",
      },
    ],
  },

  {
    name: "Fire & Rescue",
    description: "Fire, rescue and emergency response services.",
    icon: Flame,

    services: [
      {
        name: "West Bengal Fire & Emergency Services",
        phones: ["101", "112"],
        email: "firedepartment@rediffmail.com",
        availability: "24×7",
      },
    ],
  },

  {
    name: "Ambulance Service",
    description:
      "Emergency ambulance assistance for urgent patient transportation.",
    icon: HeartPulse,

    services: [
      {
        name: "Emergency Ambulance Service",
        phones: ["102"],
        availability: "24×7",
      },
    ],
  },

  {
    name: "Police & Law Enforcement",
    description:
      "Police assistance, crime reporting, law and order and public safety.",
    icon: ShieldAlert,

    services: [
      {
        name: "West Bengal Police",
        phones: ["100", "112"],
        email: "ersswb@policewb.gov.in",
        availability: "24×7",
      },
    ],
  },
];

function Emergency() {
  const navigate = useNavigate();

  // Multiple parent departments can remain expanded.
  const [expandedDepartments, setExpandedDepartments] = useState([]);

  const toggleDepartment = (index) => {
    setExpandedDepartments((previous) => {
      if (previous.includes(index)) {
        return previous.filter((item) => item !== index);
      }

      return [...previous, index];
    });
  };

  const expandAll = () => {
    setExpandedDepartments(emergencyDepartments.map((_, index) => index));
  };

  const collapseAll = () => {
    setExpandedDepartments([]);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =========================================================
          PAGE HEADER
      ========================================================== */}
      {/* <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm"> */}
        {/* <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8"> */}
          {/* Back */}
          {/* <button
            onClick={() => navigate(-1)}
            className="
              rounded-lg
              p-2
              text-slate-600
              transition
              hover:bg-slate-100
            "
            title="Go back"
          >
            <ArrowLeft size={22} />
          </button> */}

          {/* SOS Icon */}
          {/* <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-red-100
              text-red-600
            "
          >
            <Siren size={22} />
          </div> */}

          {/* Title */}
          {/* <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              SOS Emergency Contacts
            </h1>

            <p className="text-xs text-slate-500 sm:text-sm">
              West Bengal emergency services and essential contacts
            </p>
          </div> */}
        {/* </div> */}
      {/* </div> */}

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Emergency Banner */}
        <div
          className="
            mb-6
            rounded-2xl
            border
            border-red-200
            bg-red-50
            p-5
          "
        >
          <div className="flex items-start gap-4">
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-red-600
                text-white
              "
            >
              <Siren size={23} />
            </div>

            <div>
              <h2 className="text-base font-bold text-red-800 sm:text-lg">
                Emergency Assistance
              </h2>

              <p className="mt-1 text-sm leading-6 text-red-700">
                Select a department below to view the available emergency
                services and contact details.
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================
            SECTION HEADER
        ========================================================== */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Emergency Departments
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Emergency services are grouped by department.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="
                rounded-lg
                border
                border-slate-200
                bg-white
                px-3
                py-2
                text-xs
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
              "
            >
              Expand All
            </button>

            <button
              onClick={collapseAll}
              className="
                rounded-lg
                border
                border-slate-200
                bg-white
                px-3
                py-2
                text-xs
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
              "
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* =========================================================
            DEPARTMENT ACCORDIONS
        ========================================================== */}
        <div className="space-y-4">
          {emergencyDepartments.map((department, departmentIndex) => {
            const Icon = department.icon;

            const isExpanded = expandedDepartments.includes(departmentIndex);

            return (
              <div
                key={department.name}
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  shadow-sm
                "
              >
                {/* =================================================
                    PARENT DEPARTMENT HEADER
                ================================================== */}
                <button
                  type="button"
                  onClick={() => toggleDepartment(departmentIndex)}
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    gap-4
                    p-4
                    text-left
                    transition
                    hover:bg-slate-50
                    sm:p-5
                  "
                  aria-expanded={isExpanded}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    {/* Department Icon */}
                    <div
                      className="
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-blue-50
                        text-blue-700
                      "
                    >
                      <Icon size={23} />
                    </div>

                    {/* Department Info */}
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                        {department.name}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                        {department.description}
                      </p>

                      <p className="mt-2 text-xs font-medium text-slate-400">
                        {department.services.length}{" "}
                        {department.services.length === 1
                          ? "service"
                          : "services"}
                      </p>
                    </div>
                  </div>

                  {/* Chevron */}
                  <div
                    className={`
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-slate-100
                      text-slate-500
                      transition-transform
                      duration-200
                      ${isExpanded ? "rotate-180" : ""}
                    `}
                  >
                    <ChevronDown size={20} />
                  </div>
                </button>

                {/* =================================================
                    CHILD SERVICES
                ================================================== */}
                {isExpanded && (
                  <div
                    className="
                      border-t
                      border-slate-100
                      bg-slate-50
                      p-4
                      sm:p-5
                    "
                  >
                    {/*
                     * Grid makes children appear side-by-side.
                     *
                     * 1 child  -> full width
                     * 2+ child -> 2 columns on medium screens
                     */}
                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-4
                        md:grid-cols-2
                      "
                    >
                      {department.services.map((service) => (
                        <div
                          key={service.name}
                          className="
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            p-4
                            shadow-sm
                          "
                        >
                          {/* Child Service Name */}
                          <div className="mb-4">
                            <h4 className="font-bold text-slate-900">
                              {service.name}
                            </h4>

                            {service.fullName && (
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {service.fullName}
                              </p>
                            )}
                          </div>

                          {/* Contact Details */}
                          <div className="space-y-3">
                            {/* Phone */}
                            {service.phones?.length > 0 && (
                              <div>
                                <div className="mb-2 flex items-center gap-2">
                                  <Phone size={16} className="text-green-600" />

                                  <span className="text-xs font-semibold text-slate-600">
                                    Emergency Phone
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {service.phones.map((phone) => (
                                    <a
                                      key={phone}
                                      href={`tel:${phone}`}
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                      className="
                                          rounded-lg
                                          bg-green-50
                                          px-3
                                          py-1.5
                                          text-sm
                                          font-bold
                                          text-green-700
                                          transition
                                          hover:bg-green-100
                                        "
                                    >
                                      {phone}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Email */}
                            {service.email && (
                              <div className="flex items-start gap-2">
                                <Mail
                                  size={16}
                                  className="mt-0.5 shrink-0 text-blue-600"
                                />

                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-600">
                                    Email
                                  </p>

                                  <a
                                    href={`mailto:${service.email}`}
                                    onClick={(event) => event.stopPropagation()}
                                    className="
                                      break-all
                                      text-sm
                                      text-blue-600
                                      hover:underline
                                    "
                                  >
                                    {service.email}
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Availability */}
                            {service.availability && (
                              <div className="flex items-center gap-2">
                                <Clock size={16} className="text-orange-500" />

                                <div>
                                  <span className="text-xs font-semibold text-slate-600">
                                    Availability:{" "}
                                  </span>

                                  <span className="text-sm text-slate-700">
                                    {service.availability}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default Emergency;
