import React from "react";

const electricityServices = [
  {
    name: "WBSEDCL",
    fullName: "West Bengal State Electricity Distribution Company Limited",
    service: "Electricity Distribution",
    phone: "19121",
    whatsapp: "8900793100",
    email: "crmcell@wbsedcl.in",
    website: "https://www.wbsedcl.in/",
    availability: "24×7",
  },
  {
    name: "CESC",
    fullName: "CESC Limited",
    service: "Electricity Distribution",
    phone: "1912",
    whatsapp: "7439001912",
    email: "cesclimited@rpsg.in",
    website: "https://www.cesc.co.in/",
    availability: "24×7",
  },
];

export default function Electricity() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-2xl">
            ⚡
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
              Electricity
            </h1>

            <p className="text-sm text-slate-500">
              Electricity supply and emergency services
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-100 text-sm font-semibold text-slate-700">
              <tr>
                <th className="px-5 py-4">Department / Provider</th>
                <th className="px-5 py-4">Service</th>
                <th className="px-5 py-4">Helpline</th>
                <th className="px-5 py-4">WhatsApp</th>
                <th className="px-5 py-4">Availability</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Website</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {electricityServices.map((service) => (
                <tr
                  key={service.name}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800">
                      {service.name}
                    </div>

                    <div className="mt-1 max-w-xs text-xs text-slate-500">
                      {service.fullName}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {service.service}
                  </td>

                  <td className="px-5 py-4">
                    <a
                      href={`tel:${service.phone}`}
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {service.phone}
                    </a>
                  </td>

                  <td className="px-5 py-4">
                    <a
                      href={`https://wa.me/91${service.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-sm text-green-600 hover:text-green-800"
                    >
                      {service.whatsapp}
                    </a>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      {service.availability}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <a
                      href={`mailto:${service.email}`}
                      className="font-medium text-sm text-blue-600 hover:text-blue-800"
                    >
                      {service.email}
                    </a>
                  </td>

                  <td className="px-5 py-4">
                    <a
                      href={service.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
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
    </div>
  );
}