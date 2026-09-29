const emergencyServices = [
  {
    id: "police",
    category: "Law & Order",
    icon: "👮",
    description: "Police and law & order emergency assistance",
    services: [
      {
        id: "police-emergency",
        name: "West Bengal Police",
        description: "Police emergency and law & order assistance",
        phone: "100",
        website: "https://police.wb.gov.in/",
        available: "24×7",
        actions: ["call", "website"],
      },
      {
        id: "emergency-response",
        name: "Emergency Response Support System",
        description:
          "Single emergency number for police, fire and medical emergencies",
        phone: "112",
        website: "https://wb.gov.in/",
        available: "24×7",
        actions: ["call", "website"],
      },
    ],
  },
  {
    id: "fire",
    category: "Fire & Rescue",
    icon: "🔥",
    description: "Fire, rescue and emergency response",
    services: [
      {
        id: "fire-emergency",
        name: "West Bengal Fire & Emergency Services",
        description:
          "Fire incidents, rescue operations, building collapse and other emergencies",
        phone: "101",
        website:
          "https://wb.gov.in/department-details.aspx?id=D171017183526213&page=Fire-and-Emergency-Services",
        available: "24×7",
        actions: ["call", "website"],
      },
    ],
  },
  {
    id: "health",
    category: "Health & Ambulance",
    icon: "🚑",
    description: "Emergency medical and ambulance assistance",
    services: [
      {
        id: "ambulance",
        name: "Ambulance Emergency Service",
        description: "Emergency ambulance and medical assistance",
        phone: "102",
        website: "https://wb.gov.in/",
        available: "24×7",
        actions: ["call", "website"],
      },
    ],
  },
  {
    id: "electricity",
    category: "Electricity",
    icon: "⚡",
    description: "Electricity supply and electrical emergencies",
    services: [
      {
        id: "wbsedcl",
        name: "WBSEDCL",
        fullName: "West Bengal State Electricity Distribution Company Limited",
        description:
          "Electricity distribution and emergency assistance across most of West Bengal",
        phone: "19121",
        website: "https://www.wbsedcl.in/",
        available: "24×7",
        actions: ["call", "website"],
      },
      {
        id: "cesc",
        name: "CESC",
        fullName: "CESC Limited",
        description:
          "Electricity distribution and emergency assistance in CESC service areas",
        phone: "1912",
        alternatePhones: ["033-35011912", "033-44031912", "18605001912"],
        whatsapp: "7439001912",
        website: "https://www.cesc.co.in/",
        available: "24×7",
        actions: ["call", "whatsapp", "website"],
      },
    ],
  },
  {
    id: "disaster-management",
    category: "Disaster Management",
    icon: "🆘",
    description: "Disaster response, relief and civil defence",
    services: [
      {
        id: "disaster-management-department",
        name: "Disaster Management & Civil Defence",
        description:
          "State disaster management, relief, rescue coordination and civil defence",
        phone: "2214-3674",
        website: "https://wb.gov.in/",
        email: "ps.dmd-wb@nic.in",
        available: "Government Department",
        actions: ["call", "email", "website"],
      },
    ],
  },
];
export default emergencyServices;
