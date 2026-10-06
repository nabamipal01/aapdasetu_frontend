import React from "react";

const healthServices = [
  {
    name: "West Bengal Health & Family Welfare Department",
    service: "State Health Administration",
    description:
      "Government health programs, hospitals, public health services and healthcare information.",
    phone: "1800-313-444-222",
    website: "https://www.wbhealth.gov.in/",
    availability: "Government Service",
  },
  {
    name: "Primary Health Centres (PHC)",
    service: "Primary Healthcare",
    description:
      "First-level government healthcare facilities providing basic treatment, vaccination, maternal care and preventive healthcare.",
    phone: "Contact nearest PHC",
    website: "https://www.wbhealth.gov.in/",
    availability: "Local Facility",
  },
  {
    name: "Government Hospitals",
    service: "Emergency & Medical Treatment",
    description:
      "Government hospitals and medical colleges providing emergency treatment and specialist healthcare.",
    phone: "112",
    website: "https://www.wbhealth.gov.in/",
    availability: "24×7 Emergency",
  },
  {
    name: "Emergency Ambulance",
    service: "Ambulance Service",
    description:
      "Emergency ambulance assistance for patient transportation.",
    phone: "102",
    website: "https://www.wbhealth.gov.in/",
    availability: "24×7",
  },
];

export default function PrimaryHealthCare() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
          🏥
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
            Primary Health
          </h1>

          <p className="text-sm text-slate-500">
            Government primary healthcare services
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-slate-100 text-sm font-semibold text-slate-700">
              <tr>
                <th className="px-5 py-4">Department / Facility</th>
                <th className="px-5 py-4">Service</th>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Website</th>
              </tr>
            </thead>

            <tbody>
              {healthServices.map((service) => (
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