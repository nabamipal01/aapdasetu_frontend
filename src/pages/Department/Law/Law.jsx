import React from "react";

const lawAndOrderServices = [
  {
    name: "West Bengal Police",
    service: "Police & Law Enforcement",
    description:
      "Police assistance, crime reporting, law and order and public safety.",
    phone: "100",
    emergency: "112",
    email: "ersswb@policewb.gov.in",
    website: "https://police.wb.gov.in/",
    availability: "24×7",
  },
];

export default function Law() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-2xl">
          👮
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
            Law & Order
          </h1>

          <p className="text-sm text-slate-500">
            Police, law enforcement and public safety services
          </p>
        </div>
      </div>

      {/* Emergency Notice */}
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">🚨</span>

          <div>
            <h2 className="font-semibold text-red-800">
              Police Emergency
            </h2>

            <p className="mt-1 text-sm text-red-700">
              For immediate police or emergency assistance, call 100 or
              the unified emergency number 112.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="tel:100"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                📞 Call 100
              </a>

              <a
                href="tel:112"
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                🆘 Call 112
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-100 text-sm font-semibold text-slate-700">
              <tr>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Service</th>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Police</th>
                <th className="px-5 py-4">Emergency</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Availability</th>
                <th className="px-5 py-4">Website</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {lawAndOrderServices.map((service) => (
                <tr
                  key={service.name}
                  className="transition hover:bg-slate-50"
                >
                  {/* Department */}
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800">
                      {service.name}
                    </div>
                  </td>

                  {/* Service */}
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {service.service}
                  </td>

                  {/* Description */}
                  <td className="max-w-xs px-5 py-4 text-sm text-slate-600">
                    {service.description}
                  </td>

                  {/* Police */}
                  <td className="px-5 py-4">
                    <a
                      href={`tel:${service.phone}`}
                      className="font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      {service.phone}
                    </a>
                  </td>

                  {/* Emergency */}
                  <td className="px-5 py-4">
                    <a
                      href={`tel:${service.emergency}`}
                      className="font-semibold text-red-600 hover:text-red-800"
                    >
                      {service.emergency}
                    </a>
                  </td>

                  {/* Email */}
                  <td className="px-5 py-4">
                    <a
                      href={`mailto:${service.email}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {service.email}
                    </a>
                  </td>

                  {/* Availability */}
                  <td className="px-5 py-4">
                    <span className="whitespace-nowrap rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      {service.availability}
                    </span>
                  </td>

                  {/* Website */}
                  <td className="px-5 py-4">
                    <a
                      href={service.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whitespace-nowrap rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
                    >
                      ↗️
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Note */}
      <p className="mt-4 text-xs text-slate-400">
        In an immediate emergency, use the official emergency numbers
        rather than relying on this directory.
      </p>
    </div>
  );
}