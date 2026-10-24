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

  Send,

  Paperclip,

  Plus,

  LoaderCircle,

  CheckCircle2,

  AlertCircle,

} from "lucide-react";

import { sendEmergencyEmail } from "../../services";
import { useAuth } from "../../context/AuthContext";
import { getUserRole } from "../../utils/roles";

 

const emergencyDepartments = [

  {

    name: "Electricity Distribution",

    description: "Emergency electricity and power-related assistance.",

    icon: Zap,

    services: [

      {

        name: "WBSEDCL",

        phones: ["19121", "8900793100"],

        email: "crmcell@wbsedcl.in",

      },

      {

        name: "CESC",

        phones: ["1912", "7439001912"],

        email: "cesclimited@rpsg.in",

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

      },

    ],

  },

];

 

// Collect all available department email addresses without duplicates.

const departmentEmails = [

  ...new Set(

    emergencyDepartments.flatMap((department) =>

      department.services

        .map((service) => service.email?.trim().toLowerCase())

        .filter(Boolean)

    )

  ),

];

 

function Emergency() {
  const { user } = useAuth();
  const role = getUserRole(user);
  const canSendEmergencyEmail =
    role === "super_admin" || role === "admin";

  const [selectedDepartment, setSelectedDepartment] = useState(null);

 

  // Email dialog state

  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  const [subject, setSubject] = useState("");

  const [description, setDescription] = useState("");

  const [recipients, setRecipients] = useState(departmentEmails);

  const [attachments, setAttachments] = useState([]);

  const [isSending, setIsSending] = useState(false);

  const [emailMessage, setEmailMessage] = useState(null);

  const [customEmail, setCustomEmail] = useState("");

 

  const handleAddCustomEmail = () => {

    const email = customEmail.trim().toLowerCase();

    if (!email) return;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

      setEmailMessage({

        type: "error",

        text: "Please enter a valid email address."

      });

      return;

    }

    if (recipients.includes(email)) {

      setEmailMessage({

        type: "error",

        text: "This email address has already been added."

      });

      return;

    }

    setRecipients(current => [...current, email]);

    console.log(recipients);

    setCustomEmail("");

    setEmailMessage(null);

  };

 

  const openModal = (department) => {

    setSelectedDepartment(department);

  };

 

  const closeModal = () => {

    setSelectedDepartment(null);

  };

 

  const closeEmailDialog = () => {

    if (isSending) return;

    setIsEmailDialogOpen(false);

    setEmailMessage(null);

  };

 

  // Close the department modal with Escape and prevent background scrolling.

  useEffect(() => {

    if (!selectedDepartment) return;

 

    const handleKeyDown = (event) => {

      if (event.key === "Escape") closeModal();

    };

 

    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", handleKeyDown);

    document.body.style.overflow = "hidden";

 

    return () => {

      document.removeEventListener("keydown", handleKeyDown);

      document.body.style.overflow = previousOverflow;

    };

  }, [selectedDepartment]);

 

  // Remove one recipient.

  const removeRecipient = (email) => {

    setRecipients((current) => current.filter((item) => item !== email));

  };

 

  // Allow the user to re-add a removed department email.

  const addRecipient = (email) => {

    setRecipients((current) =>

      current.includes(email) ? current : [...current, email]

    );

  };

 

  // Support selecting multiple files and adding more files later.

  const handleFileChange = (event) => {

    const selectedFiles = Array.from(event.target.files || []);

 

    setAttachments((current) => {

      const next = [...current];

 

      selectedFiles.forEach((file) => {

        const alreadyAdded = next.some(

          (existing) =>

            existing.name === file.name &&

            existing.size === file.size &&

            existing.lastModified === file.lastModified

        );

 

        if (!alreadyAdded) next.push(file);

      });

 

      return next;

    });

 

    // Allow selecting the same file again after removing it.

    event.target.value = "";

  };

 

  const removeAttachment = (index) => {

    setAttachments((current) =>

      current.filter((_, fileIndex) => fileIndex !== index)

    );

  };

 

  const resetEmailForm = () => {

    setSubject("");

    setDescription("");

    setRecipients(departmentEmails);

    setAttachments([]);

  };

 

  // Send email details and files to the PHP API.

 

  const handleSendEmail = async (event) => {

    event.preventDefault();

    setEmailMessage(null);

 

    const cleanSubject = subject.trim();

    const cleanDescription = description.trim();

 

    if (!cleanSubject || !cleanDescription) {

      setEmailMessage({

        type: "error",

        text: "Please enter both the subject and description.",

      });

      return;

    }

 

    if (recipients.length === 0) {

      setEmailMessage({

        type: "error",

        text: "Please keep at least one recipient email address.",

      });

      return;

    }

 

    // Validate recipient email addresses

    const invalidEmail = recipients.some(

      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

    );

 

    if (invalidEmail) {

      setEmailMessage({

        type: "error",

        text: "One or more recipient email addresses are invalid.",

      });

      return;

    }

 

    try {

      setIsSending(true);

 

      const formData = new FormData();

 

      formData.append("subject", cleanSubject);

      formData.append("description", cleanDescription);

 

      // Add multiple recipients

      recipients.forEach((email) => {

        formData.append("recipients[]", email.trim());

      });

 

      // Add multiple attachments

      attachments.forEach((file) => {

        formData.append("attachments[]", file);

      });

 

      // Send using your existing API service

      const result = await sendEmergencyEmail(formData);

 

      if (result?.success === false) {

        throw new Error(

          "Failed to send emergency email."

        );

      }

 

      setEmailMessage({

        type: "success",

        text: "Emergency email sent successfully.",

      });

 

      resetEmailForm();

    } catch (error) {

      setEmailMessage({

        type: "error",

        text: error.message || "Unable to send the email. Please try again.",

      });

    } finally {

      setIsSending(false);

    }

  };

 

  const ServiceCard = ({ service }) => {

    const serviceName = service.name.toLowerCase();

 

    const ServiceIcon = serviceName.includes("fire")

      ? Flame

      : serviceName.includes("ambulance")

        ? HeartPulse

        : serviceName.includes("police")

          ? ShieldAlert

          : Zap;

 

    return (

      <div className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm">

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

 

        {service.phones?.length > 0 && (

          <div className="mb-3">

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

 

        {service.email && (

          <div className="mb-3 flex min-w-0 items-start gap-2">

            <Mail size={13} className="mt-0.5 shrink-0 text-blue-600" />

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

                Select a department to view its emergency contacts and

                available services.

              </p>

            </div>

          </div>

        </div>

 

        {/* Section Header + Email Button */}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

          <div>

            <h2 className="text-lg font-bold text-slate-900">

              Emergency Departments

            </h2>

            <p className="mt-1 text-sm text-slate-500">

              Quick access to essential emergency contacts.

            </p>

          </div>

 

          {canSendEmergencyEmail && (
            <button
              type="button"
              onClick={() => {
                setEmailMessage(null);
                setIsEmailDialogOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <Mail size={17} />
              Send Emergency Email
            </button>
          )}

        </div>

 

        {/* Department Cards */}

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

                  {department.services.length === 1 ? "Service" : "Services"}

                </span>

              </button>

            );

          })}

        </div>

      </main>

 

      {/* Top-right Emergency Email Dialog */}

      {isEmailDialogOpen && (

        <div

          className="fixed inset-0 z-[60] bg-slate-950/30 backdrop-blur-[2px]"

          onMouseDown={(event) => {

            if (

              event.target === event.currentTarget &&

              !isSending

            ) {

              closeEmailDialog();

            }

          }}

        >

          <section

            role="dialog"

            aria-modal="true"

            aria-labelledby="emergency-email-title"

            className="absolute right-3 top-3 flex max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl sm:right-5 sm:top-5 sm:w-[min(560px,calc(100%-40px))]"

          >

            {/* Dialog Header */}

            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-red-50 px-4 py-3">

              <div className="flex min-w-0 items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">

                  <Siren size={21} />

                </div>

 

                <div>

                  <h2

                    id="emergency-email-title"

                    className="text-base font-bold text-slate-900"

                  >

                    Emergency Email

                  </h2>

                  <p className="text-xs text-slate-600">

                    Send an alert to department contacts.

                  </p>

                </div>

              </div>

 

              <button

                type="button"

                onClick={closeEmailDialog}

                disabled={isSending}

                aria-label="Close email dialog"

                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-red-600 disabled:opacity-50"

              >

                <X size={19} />

              </button>

            </div>

 

            {/* Dialog Form */}

            <form

              onSubmit={handleSendEmail}

              className="flex min-h-0 flex-1 flex-col"

            >

              <div className="min-h-0 space-y-4 overflow-y-auto p-4">

                {/* Subject */}

                <div>

                  <label

                    htmlFor="emergency-subject"

                    className="mb-1.5 block text-sm font-semibold text-slate-700"

                  >

                    Subject <span className="text-red-600">*</span>

                  </label>

 

                  <input

                    id="emergency-subject"

                    type="text"

                    value={subject}

                    onChange={(event) => setSubject(event.target.value)}

                    placeholder="Enter emergency subject"

                    maxLength={200}

                    required

                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"

                  />

                </div>

 

                {/* Description */}

                <div>

                  <label

                    htmlFor="emergency-description"

                    className="mb-1.5 block text-sm font-semibold text-slate-700"

                  >

                    Description <span className="text-red-600">*</span>

                  </label>

 

                  <textarea

                    id="emergency-description"

                    value={description}

                    onChange={(event) => setDescription(event.target.value)}

                    placeholder="Describe the emergency, location and assistance required..."

                    rows={4}

                    maxLength={10000}

                    required

                    className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"

                  />

                </div>

 

                {/* Recipients */}

                <div>

                  <div className="mb-2 flex items-center justify-between gap-2">

                    <label className="text-sm font-semibold text-slate-700">

                      Department Emails

                    </label>

                    <span className="text-xs text-slate-500">

                      {recipients.length} recipient

                      {recipients.length !== 1 ? "s" : ""}

                    </span>

                  </div>

 

                  <div className="flex min-h-12 flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">

                    {recipients.length > 0 ? (

                      recipients.map((email) => (

                        <span

                          key={email}

                          className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 py-1 pl-2 pr-1 text-xs text-blue-800"

                        >

                          <Mail size={12} className="shrink-0" />

                          <span className="break-all">{email}</span>

                          <button

                            type="button"

                            onClick={() => removeRecipient(email)}

                            aria-label={`Remove ${email}`}

                            title={`Remove ${email}`}

                            className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-blue-700 hover:bg-red-100 hover:text-red-600"

                          >

                            <X size={13} />

                          </button>

                        </span>

                      ))

                    ) : (

                      <p className="self-center px-1 text-xs text-slate-500">

                        No recipients selected.

                      </p>

                    )}

                  </div>

 

                  {/* Add Custom Email */}

                  <div className="mt-3">

                    <label

                      htmlFor="custom-recipient-email"

                      className="mb-1.5 block text-sm font-semibold text-slate-700"

                    >

                      Add Custom Email

                    </label>

 

                    <div className="flex items-center gap-2">

                      <input

                        id="custom-recipient-email"

                        type="email"

                        value={customEmail}

                        onChange={(event) => setCustomEmail(event.target.value)}

                        onKeyDown={(event) => {

                          if (event.key === "Enter") {

                            event.preventDefault();

                            handleAddCustomEmail();

                          }

                        }}

                        placeholder="Enter an email address for testing"

                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                      />

 

                      <button

                        type="button"

                        onClick={handleAddCustomEmail}

                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"

                      >

                        <Plus size={16} />

                        Add

                      </button>

                    </div>

 

                    <p className="mt-1 text-xs text-slate-500">

                      Add a test email or another recipient. Remove any recipient

                      using the × icon above.

                    </p>

                  </div>

 

                  {/* Re-add removed department emails */}

                  {departmentEmails.some(

                    (email) => !recipients.includes(email)

                  ) && (

                      <div className="mt-2">

                        <p className="mb-1.5 text-xs text-slate-500">

                          Add a removed department email:

                        </p>

                        <div className="flex flex-wrap gap-2">

                          {departmentEmails

                            .filter((email) => !recipients.includes(email))

                            .map((email) => (

                              <button

                                key={email}

                                type="button"

                                onClick={() => addRecipient(email)}

                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700"

                              >

                                <Plus size={12} />

                                {email}

                              </button>

                            ))}

                        </div>

                      </div>

                    )}

                </div>

 

                {/* Multiple File Upload */}

                <div>

                  <label

                    htmlFor="emergency-attachments"

                    className="mb-1.5 block text-sm font-semibold text-slate-700"

                  >

                    Attachments

                  </label>

 

                  <label

                    htmlFor="emergency-attachments"

                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-blue-400 hover:bg-blue-50"

                  >

                    <Paperclip size={22} className="mb-2 text-slate-500" />

                    <span className="text-sm font-semibold text-slate-700">

                      Click to upload files

                    </span>

                    <span className="mt-1 text-xs text-slate-500">

                      You can select multiple files or add more later.

                    </span>

                  </label>

 

                  <input

                    id="emergency-attachments"

                    type="file"

                    multiple

                    onChange={handleFileChange}

                    className="sr-only"

                  />

 

                  {attachments.length > 0 && (

                    <div className="mt-3 space-y-2">

                      {attachments.map((file, index) => (

                        <div

                          key={`${file.name}-${file.size}-${file.lastModified}`}

                          className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"

                        >

                          <Paperclip

                            size={15}

                            className="shrink-0 text-slate-500"

                          />

 

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-xs font-medium text-slate-700">

                              {file.name}

                            </p>

                            <p className="text-[11px] text-slate-500">

                              {file.size < 1024 * 1024

                                ? `${(file.size / 1024).toFixed(1)} KB`

                                : `${(file.size / (1024 * 1024)).toFixed(2)} MB`}

                            </p>

                          </div>

 

                          <button

                            type="button"

                            onClick={() => removeAttachment(index)}

                            aria-label={`Remove ${file.name}`}

                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600"

                          >

                            <X size={15} />

                          </button>

                        </div>

                      ))}

                    </div>

                  )}

                </div>

 

                {/* Success / Error Feedback */}

                {emailMessage && (

                  <div

                    role="status"

                    aria-live="polite"

                    className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${emailMessage.type === "success"

                      ? "border-green-200 bg-green-50 text-green-800"

                      : "border-red-200 bg-red-50 text-red-800"

                      }`}

                  >

                    {emailMessage.type === "success" ? (

                      <CheckCircle2 size={17} className="mt-0.5 shrink-0" />

                    ) : (

                      <AlertCircle size={17} className="mt-0.5 shrink-0" />

                    )}

                    <p>{emailMessage.text}</p>

                  </div>

                )}

              </div>

 

              {/* Dialog Footer */}

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">

                <button

                  type="button"

                  onClick={closeEmailDialog}

                  disabled={isSending}

                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"

                >

                  Cancel

                </button>

 

                <button

                  type="submit"

                  disabled={isSending}

                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {isSending ? (

                    <>

                      <LoaderCircle size={16} className="animate-spin" />

                      Sending...

                    </>

                  ) : (

                    <>

                      <Send size={16} />

                      Send Email

                    </>

                  )}

                </button>

              </div>

            </form>

          </section>

        </div>

      )}

 

      {/* Existing Department Contact Modal */}

      {selectedDepartment && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) closeModal();

          }}

        >

          <div

            role="dialog"

            aria-modal="true"

            aria-labelledby="emergency-modal-title"

            className="my-auto w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"

          >

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

 

            <div className="max-h-[60vh] overflow-y-auto bg-slate-50 p-3">

              <p className="mb-3 text-xs leading-5 text-slate-600">

                {selectedDepartment.description}

              </p>

 

              <div

                className={`grid items-start gap-3 ${selectedDepartment.services.length > 1

                  ? "grid-cols-1 sm:grid-cols-2"

                  : "grid-cols-1"

                  }`}

              >

                {selectedDepartment.services.map((service) => (

                  <ServiceCard key={service.name} service={service} />

                ))}

              </div>

            </div>

 

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