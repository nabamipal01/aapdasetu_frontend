
import React, { useState, useEffect } from "react";
import {
  Phone,
  Mail,
  Clock,
  Siren,
  ShieldAlert,
  Flame,
  HeartPulse,
  Zap,
  ChevronDown,
  X,
} from "lucide-react";

const emergencyDepartments = [
  {
    name: "Electricity Distribution",
    description: "Emergency electricity and power-related assistance.",
    icon: Zap,
    services: [
      {
        name: "WBSEDCL",
        fullName:
          "West Bengal State Electricity Distribution Company Limited",
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
    description: "Emergency ambulance and patient transportation.",
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
    description: "Police assistance, crime reporting and public safety.",
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
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const openModal = (department) => {
    setSelectedDepartment(department);
  };

  const closeModal = () => {
    setSelectedDepartment(null);
  };

  // Close the modal with Escape and prevent background scrolling.
  useEffect(() => {
    if (!selectedDepartment) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedDepartment]);

  const ServiceCard = ({ service }) => {
    const ServiceIcon = service.name.toLowerCase().includes("fire")
      ? Flame
      : service.name.toLowerCase().includes("ambulance")
        ? HeartPulse
        : service.name.toLowerCase().includes("police")
          ? ShieldAlert
          : Zap;

    return (
      <div className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        {/* Service Heading */}
        <div className="mb-3 flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ServiceIcon size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold leading-5 text-slate-900">
              {service.name}
            </h4>

            {service.fullName && (
              <p className="mt-1 text-xs leading-4 text-slate-500">
                {service.fullName}
              </p>
            )}
          </div>
        </div>

        {/* Phone Numbers */}
        {service.phones?.length > 0 && (
          <div className="mb-3">
            <div className="mb-2 flex items-center gap-2">
              <Phone size={13} className="text-green-600" />

              <span className="text-xs font-semibold text-slate-600">
                Emergency Phone
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {service.phones.map((phone) => (
                <a
                  key={phone}
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1.5 text-xs font-bold text-green-700 transition hover:bg-green-100"
                >
                  <Phone size={12} />
                  {phone}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Email */}
        {service.email && (
          <div className="mb-3 flex min-w-0 items-start gap-2">
            <Mail
              size={13}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold text-slate-600">
                Email Address
              </p>

              <a
                href={`mailto:${service.email}`}
                className="break-all text-xs leading-5 text-blue-600 hover:underline"
              >
                {service.email}
              </a>
            </div>
          </div>
        )}

        {/* Availability */}
        {service.availability && (
          <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-2">
            <Clock size={13} className="text-orange-500" />

            <span className="text-xs text-slate-600">
              <span className="font-semibold">Availability:</span>{" "}
              {service.availability}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:px-6">
        {/* Emergency Banner */}
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
              <Siren size={21} />
            </div>

            <div>
              <h2 className="text-base font-bold text-red-800 sm:text-lg">
                Emergency Assistance
              </h2>

              <p className="mt-1 text-xs leading-5 text-red-700 sm:text-sm">
                Select a department to view its emergency contacts
                and available services.
              </p>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Emergency Departments
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Quick access to essential emergency contacts.
          </p>
        </div>

        {/* Compact Department Cards */}
        <div className="flex flex-wrap items-start gap-3">
          {emergencyDepartments.map((department) => {
            const Icon = department.icon;

            return (
              <button
                key={department.name}
                type="button"
                onClick={() => openModal(department)}
                aria-label={`View ${department.name} emergency contacts`}
                className="group flex w-full max-w-[220px] flex-col self-start rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="mb-2 flex w-full items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon size={18} />
                  </div>

                  <ChevronDown
                    size={16}
                    className="-rotate-90 text-slate-400 transition group-hover:text-blue-600"
                  />
                </div>

                <h3 className="text-sm font-bold leading-5 text-slate-900">
                  {department.name}
                </h3>

                <p className="mt-1 text-xs leading-4 text-slate-500">
                  {department.description}
                </p>

                <span className="mt-2 self-start rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  {department.services.length}{" "}
                  {department.services.length === 1
                    ? "Service"
                    : "Services"}
                </span>
              </button>
            );
          })}
        </div>
      </main>

      {/* Compact Department Overlay */}
      {selectedDepartment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-modal-title"
            className="my-auto w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white p-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  {React.createElement(selectedDepartment.icon, {
                    size: 19,
                  })}
                </div>

                <div className="min-w-0">
                  <h2
                    id="emergency-modal-title"
                    className="text-sm font-bold text-slate-900 sm:text-base"
                  >
                    {selectedDepartment.name}
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {selectedDepartment.services.length} available{" "}
                    {selectedDepartment.services.length === 1
                      ? "service"
                      : "services"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close emergency contacts"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto bg-slate-50 p-3">
              <p className="mb-3 text-xs leading-5 text-slate-600">
                {selectedDepartment.description}
              </p>

              {/* One or two service cards */}
              <div
                className={`grid items-start gap-3 ${
                  selectedDepartment.services.length > 1
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
                {selectedDepartment.services.map((service) => (
                  <ServiceCard
                    key={service.name}
                    service={service}
                  />
                ))}
              </div>

              {/* Emergency Note */}
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2">
                <Siren
                  size={15}
                  className="mt-0.5 shrink-0 text-orange-600"
                />

                <p className="text-xs leading-4 text-orange-800">
                  In an emergency, use the available phone contact
                  for immediate assistance.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-200 bg-white p-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Emergency;
