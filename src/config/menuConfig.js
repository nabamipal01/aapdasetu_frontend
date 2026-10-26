import {
  LayoutDashboard,
  Users,
  HandHelping,
  MapPinned,
  ShieldCheck,
  Building2,
  Map,
  Layers,
  Flame,
  HeartPulse,
  Ambulance,
  Hospital,
  Utensils,
  Zap,
  Scale,
  PackagePlus,
  PackageMinus,
  History,
  Siren,
  BellRing,
  Radio,
  ClipboardCheck,
  Wrench,
  GraduationCap,
  FileBarChart,
  Boxes,
  BarChart3,
  PackageCheck,
  ClipboardMinus,
} from "lucide-react";

import {
  getUserRole,
  isOperationalUser,
} from "../utils/roles";

const commonMenus = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },

  {
    label: "Department",
    icon: Building2,
    children: [
      {
        label: "Electricity",
        icon: Zap,
        path: "/department/electricity",
      },
      {
        label: "Fire",
        icon: Flame,
        path: "/department/fire",
      },
      {
        label: "Health",
        icon: HeartPulse,
        children: [
          {
            label: "Ambulance",
            icon: Ambulance,
            path: "/department/health/ambulance",
          },
          {
            label: "Primary Health Care",
            icon: Hospital,
            path: "/department/health/primary-health-care",
          },
        ],
      },
      {
        label: "Food Dept.",
        icon: Utensils,
        path: "/department/food",
      },
      {
        label: "Law & Order",
        icon: Scale,
        path: "/department/law&order",
      },
    ],
  },

  {
    label: "Inventory",
    icon: Boxes,
    children: [
      {
        label: "Equipment Inventory",
        icon: BarChart3,
        path: "/inventory/overview",
      },
      {
        label: "Equipment Category",
        icon: Wrench,
        path: "/inventory/equipmentCategory",
      },
      {
        label: "Add Stock",
        icon: PackagePlus,
        path: "/inventory/add",
      },
      {
        label: "Issue Stock",
        icon: PackageMinus,
        path: "/inventory/issue",
      },
      {
        label: "Return Stock",
        icon: PackageCheck,
        path: "/inventory/return",
      },
      {
        label: "Stock History",
        icon: History,
        children: [
          {
            label: "Stock Issue History",
            icon: ClipboardMinus,
            path: "/inventory/history/issue",
          },
          {
            label: "Stock Return History",
            icon: ClipboardCheck,
            path: "/inventory/history/return",
          },
        ],
      },
    ],
  },

  {
    label: "Alerts",
    icon: BellRing,
    children: [
      {
        label: "Pre-Alerts",
        icon: Radio,
        path: "/pre-alerts",
      },
      {
        label: "Post-Alerts",
        icon: FileBarChart,
        path: "/post-alerts",
      },
      {
        label: "Incident",
        icon: Siren,
        path: "/incident",
      },
      {
        label: "Task",
        icon: ClipboardCheck,
        path: "/task",
      },
    ],
  },

  {
    label: "Training",
    icon: GraduationCap,
    path: "/training",
  },

  {
    label: "MIS Reports",
    icon: FileBarChart,
    path: "/reports",
  },
];

const locationMenus = {
  super_admin: {
    label: "Location",
    icon: MapPinned,
    children: [
      {
        label: "Districts",
        icon: Map,
        path: "/location/district",
      },
      {
        label: "Subdivisions",
        icon: Building2,
        path: "/location/subdivision",
      },
      {
        label: "Blocks",
        icon: Layers,
        path: "/location/block",
      },
    ],
  },

  admin: {
    label: "Location",
    icon: MapPinned,
    children: [
      {
        label: "Districts",
        icon: Map,
        path: "/location/district",
      },
      {
        label: "Subdivisions",
        icon: Building2,
        path: "/location/subdivision",
      },
      {
        label: "Blocks",
        icon: Layers,
        path: "/location/block",
      },
    ],
  },
};

const userMenus = {
  super_admin: {
    label: "Users",
    icon: Users,
    children: [
      {
        label: "Admin",
        icon: ShieldCheck,
        path: "/users/admin",
      },
      {
        label: "District",
        icon: Map,
        path: "/users/district",
      },
      {
        label: "Subdivision",
        icon: Building2,
        path: "/users/subdivision",
      },
      {
        label: "Block",
        icon: Layers,
        path: "/users/block",
      },
      {
        label: "Volunteers",
        icon: Users,
        path: "/volunteers",
      },
      {
        label: "NGO",
        icon: HandHelping,
        path: "/ngo",
      },
    ],
  },

  admin: {
    label: "Users",
    icon: MapPinned,
    children: [
      {
        label: "District",
        icon: Map,
        path: "/users/district",
      },
      {
        label: "Subdivision",
        icon: Building2,
        path: "/users/subdivision",
      },
      {
        label: "Block",
        icon: Layers,
        path: "/users/block",
      },
      {
        label: "Volunteers",
        icon: Users,
        path: "/volunteers",
      },
      {
        label: "NGO",
        icon: HandHelping,
        path: "/ngo",
      },
    ],
  },

  district: {
    label: "Users",
    icon: MapPinned,
    children: [
      {
        label: "Subdivision",
        icon: Building2,
        path: "/users/subdivision",
      },
      {
        label: "Block",
        icon: Layers,
        path: "/users/block",
      },
      {
        label: "Volunteers",
        icon: Users,
        path: "/volunteers",
      },
      {
        label: "NGO",
        icon: HandHelping,
        path: "/ngo",
      },
    ],
  },

  subdivision: {
    label: "Users",
    icon: MapPinned,
    children: [
      {
        label: "Block",
        icon: Layers,
        path: "/users/block",
      },
      {
        label: "Volunteers",
        icon: Users,
        path: "/volunteers",
      },
      {
        label: "NGO",
        icon: HandHelping,
        path: "/ngo",
      },
    ],
  },

  block: {
    label: "Users",
    icon: MapPinned,
    children: [
      {
        label: "Volunteers",
        icon: Users,
        path: "/volunteers",
      },
      {
        label: "NGO",
        icon: HandHelping,
        path: "/ngo",
      },
    ],
  },
};

// Menus available to NGO and Volunteer users.
const getOperationalMenus = () => {
  const alertsMenu = commonMenus.find(
    (menu) => menu.label === "Alerts"
  );

  const trainingMenu = commonMenus.find(
    (menu) => menu.label === "Training"
  );

  const allowedAlertPaths = [
    "/pre-alerts",
    "/post-alerts",
    "/incident",
    "/task",
  ];

  const sosMenu = {
    label: "SOS",
    icon: Siren,
    path: "/emergency",
  };

  return [
    ...(alertsMenu?.children || []).filter((item) =>
      allowedAlertPaths.includes(item.path)
    ),
    ...(trainingMenu ? [trainingMenu] : []),
    sosMenu,
  ];
};

export const getMenuForUser = (user) => {
  if (!user) return [];

  const role = getUserRole(user);

  // NGO and Volunteer users get operational menus plus Training.
  if (isOperationalUser(user)) {
    return getOperationalMenus();
  }

  // Only recognized staff roles get the staff menu.
  const staffRoles = [
    "super_admin",
    "admin",
    "district",
    "subdivision",
    "block",
  ];

  if (!role || !staffRoles.includes(role)) {
    return [];
  }

  const menus = commonMenus.filter((menu) => {
  if (
    menu.label === "Dashboard" &&
    role !== "super_admin" &&
    role !== "admin" &&
    role !== "district"
  ) {
    return false;
  }

  if (
    menu.label === "Inventory" &&
    role !== "super_admin" &&
    role !== "admin"
  ) {
    return false;
  }

  if (
    menu.label === "MIS Reports" &&
    role !== "super_admin" &&
    role !== "admin"
  ) {
    return false;
  }

  return true;
});

  const locationMenu = locationMenus[role];
  const userMenu = userMenus[role];

  if (locationMenu) {
    menus.splice(1, 0, locationMenu);
  }

  if (userMenu) {
    menus.splice(locationMenu ? 2 : 1, 0, userMenu);
  }

  return menus;
};

// Backward compatibility for components using this function.
export const getMenuForRole = (role) => {
  if (!role) return [];

  return getMenuForUser({
    role,
    user_type: "staff",
  });
};