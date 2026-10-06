import React from "react";

const fireServices = [
  {
    name: "West Bengal Fire & Emergency Services",
    service: "Fire & Rescue",
    phone: "101",
    emergency: "112",
    email: "firedepartment@rediffmail.com",
    website:
      "https://wb.gov.in/department-details.aspx?id=D171017183526213&page=Fire-and-Emergency-Services",
    availability: "24×7",
  },
];

export default function Fire() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-2xl">
          🔥
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
            Fire & Rescue
          </h1>

          <p className="text-sm text-slate-500">
            Fire, rescue and emergency response services
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-slate-100 text-sm font-semibold text-slate-700">
              <tr>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Service</th>
                <th className="px-5 py-4">Fire Emergency</th>
                <th className="px-5 py-4">Emergency Response</th>
                <th className="px-5 py-4">Availability</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Website</th>
              </tr>
            </thead>

            <tbody>
              {fireServices.map((service) => (
                <tr
                  key={service.name}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-semibold text-slate-800">
                    {service.name}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {service.service}
                  </td>

                  <td className="px-5 py-4">
                    <a
                      href={`tel:${service.phone}`}
                      className="font-semibold text-red-600"
                    >
                      📞 {service.phone}
                    </a>
                  </td>

                  <td className="px-5 py-4">
                    <a
                      href={`tel:${service.emergency}`}
                      className="font-semibold text-blue-600"
                    >
                      🆘 {service.emergency}
                    </a>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
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
                      className="text-sm font-medium text-blue-600 hover:underline"
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