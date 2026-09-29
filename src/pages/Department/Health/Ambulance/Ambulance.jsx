import React from "react";

const ambulanceServices = [
  {
    name: "Emergency Ambulance Service",
    service: "Ambulance",
    description:
      "Emergency ambulance assistance for patients requiring urgent medical transportation.",
    phone: "102",
    website: "https://www.wbhealth.gov.in/",
    availability: "24×7",
  },
];

const Ambulance = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-4xl">🚑</span>
            <h1 className="text-3xl font-bold text-slate-800">
              Ambulance Services
            </h1>
          </div>

          <p className="text-slate-600">
            Emergency ambulance services available across West Bengal.
          </p>
        </div>

        {/* Emergency Notice */}
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="mb-2 text-lg font-semibold text-red-800">
            🚨 Medical Emergency
          </h2>

          <p className="mb-4 text-sm text-red-700">
            For emergency ambulance assistance, call the ambulance helpline.
          </p>

          <a
            href="tel:102"
            className="inline-flex items-center rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            📞 Call 102
          </a>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Service
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Availability
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Website
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {ambulanceServices.map((item, index) => (
                  <tr
                    key={index}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-5 font-semibold text-slate-800">
                      {item.name}
                    </td>

                    <td className="px-6 text-sm py-5 text-slate-600">
                      {item.service}
                    </td>

                    <td className="max-w-md px-6 py-5 text-sm leading-6 text-slate-600">
                      {item.description}
                    </td>

                    <td className="px-6 py-5">
                      <a
                        href={`tel:${item.phone}`}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {item.phone}
                      </a>
                    </td>

                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                        {item.availability}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <a
                        href={item.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Link
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-5 text-sm text-slate-500">
          For immediate medical emergencies, call 102 or use the appropriate
          emergency response service.
        </p>
      </div>
    </div>
  );
};

export default Ambulance;