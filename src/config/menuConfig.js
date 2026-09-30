import React from 'react'
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
  Package,
  Wrench,
  GraduationCap,
  FileBarChart,
} from "lucide-react";

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
    icon: Package,
    children: [
      {
        label: "Stock Overview",
        icon: Package,
        path: "/inventory/overview",
      },
       {
        label: "Equipment",
        icon: Wrench,
        path: "/inventory/equipment",
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
        label: "Stock History",
        icon: History,
        path: "/inventory/history",
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
        path: "/alerts/pre-alerts",
      },
       {
        label: "Post-Alerts",
        icon: FileBarChart,
        path: "/alerts/post-alerts",
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
  

  // // {
  //   label: "Resources",
  //   icon: Package,
  //   path: "/resources",
  // },
  {
    label: "Training",
    icon: GraduationCap,
    path: "/training",
  },
  

  //   {
  //   label: "Disaster Management",
  //   icon: Siren,
  //   children: [
  //     {
  //       label: "ERSS",
  //       icon: Radio,
  //       path: "/disaster/erss",
  //     },
  //     {
  //       label: "CCTNS",
  //       icon: ShieldCheck,
  //       path: "/disaster/cctns",
  //     },
  //   ],
  // },
  {
    label: "Reports",
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
    icon: HandHelping ,
    path: "/ngo",
  }
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
  }
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
  }
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
  }
    ],
  },

  block: null,
};

export const getMenuForRole = (role) => {
    if (!role) {
    return [
      {
        label: "Task",
        icon: ClipboardCheck,
        path: "/task",
      },
    ];
  }
  const normalizedRole = String(role).trim().toLowerCase();

  // if (isTaskOnlyRole(normalizedRole)) {
  //   return commonMenus.filter((menu) => menu.path === "/task");
  // }

  const menus = [...commonMenus];

  const locationMenu = locationMenus[normalizedRole];
  const userMenu = userMenus[normalizedRole];

  // Add Location Management first
  if (locationMenu) {
    menus.splice(1, 0, locationMenu);
  }

  // Add Users immediately after Location Management
  if (userMenu) {
    menus.splice(2, 0, userMenu);
  }

  return menus;
};