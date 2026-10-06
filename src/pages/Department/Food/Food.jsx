import React from "react";

const foodServices = [
  {
    name: "Food & Supplies Department",
    service: "Food & Civil Supplies",
    description:
      "Food supply, ration, public distribution system and essential commodity services.",
    email: "food.wb@gov.in",
    website: "https://food.wb.gov.in/",
  },
];

export default function Food() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-2xl">
          🍚
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
            Food & Civil Supplies
          </h1>

          <p className="text-sm text-slate-500">
            Food, ration and public distribution services
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
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Website</th>
              </tr>
            </thead>

            <tbody>
              {foodServices.map((service) => (
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

                  <td className="max-w-md px-5 py-4 text-sm text-slate-600">
                    {service.description}
                  </td>

                  <td className="px-5 py-4">
                    <a
                      href={`mailto:${service.email}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
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