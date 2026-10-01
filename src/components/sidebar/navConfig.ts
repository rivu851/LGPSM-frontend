// Single source for the dashboard navigation and the client-side route guard.
// The backend remains authoritative for authorization; this only shapes what each web role sees.

export type WebRole = "ADMIN" | "ORGANIZER";

export interface NavLeaf {
  key: string;
  label: string;
  href: string;
  roles: WebRole[];
}

export interface NavEntry {
  key: string;
  label: string;
  icon: string; // file in /public/icons/nav
  roles: WebRole[];
  href?: string;
  children?: NavLeaf[];
}

const BOTH: WebRole[] = ["ADMIN", "ORGANIZER"];

export const NAV_ENTRIES: NavEntry[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", href: "/dashboard", roles: BOTH },
  {
    key: "event",
    label: "Event",
    icon: "event",
    roles: BOTH,
    children: [
      { key: "add-event", label: "Add New Event", href: "/events/add", roles: BOTH },
      { key: "events-list", label: "Events", href: "/events", roles: BOTH },
      { key: "add-invitees", label: "Add Invitees", href: "/events/select/invitees?from=sidebar", roles: BOTH },
      { key: "assign-system-users", label: "Assign System Users", href: "/user-management/assign", roles: BOTH },
      { key: "add-user", label: "Add User", href: "/user-management/add", roles: ["ADMIN"] },
      { key: "all-users", label: "All Users", href: "/user-management", roles: ["ADMIN"] },
    ],
  },
  { key: "templates", label: "Templates", icon: "templates", href: "/templates", roles: BOTH },
  {
    key: "event-organizer",
    label: "Event Organizer",
    icon: "account",
    roles: ["ADMIN"],
    children: [
      { key: "add-organizer", label: "Add New Organizer", href: "/event-organizer/add", roles: ["ADMIN"] },
      { key: "all-organizers", label: "All Organizers", href: "/event-organizer", roles: ["ADMIN"] },
    ],
  },
  { key: "earnings", label: "Earnings", icon: "wallet", href: "/earnings", roles: ["ADMIN"] },
  { key: "billing", label: "Billing", icon: "wallet", href: "/billing", roles: ["ORGANIZER"] },
  { key: "reports", label: "Reports", icon: "chart", href: "/reports", roles: BOTH },
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
    roles: BOTH,
    children: [
      { key: "template-settings", label: "Template Settings", href: "/settings/template", roles: ["ADMIN"] },
      { key: "event-settings", label: "Event Settings", href: "/settings/event", roles: ["ADMIN"] },
      { key: "price-rate-settings", label: "Price Rate Settings", href: "/settings/price-rate", roles: ["ADMIN"] },
      { key: "notification-settings", label: "Notifications Settings", href: "/settings/notification", roles: ["ADMIN"] },
      { key: "business-settings", label: "Business Info", href: "/settings/business", roles: ["ORGANIZER"] },
      { key: "account-settings", label: "Account Settings", href: "/settings/account", roles: BOTH },
    ],
  },
];

export function navForRole(role: WebRole): NavEntry[] {
  return NAV_ENTRIES.filter((e) => e.roles.includes(role)).map((e) =>
    e.children ? { ...e, children: e.children.filter((c) => c.roles.includes(role)) } : e
  );
}

// Route prefixes each role must not open directly (deep links included).
const BLOCKED: Record<WebRole, string[]> = {
  ADMIN: ["/billing", "/settings/business"],
  ORGANIZER: [
    "/user-management",
    "/event-organizer",
    "/earnings",
    "/settings/price-rate",
    "/settings/template",
    "/settings/event",
    "/settings/notification",
  ],
};
// Narrower exceptions inside a blocked prefix
const ALLOWED_EXCEPTIONS: Record<WebRole, string[]> = {
  ADMIN: [],
  ORGANIZER: ["/user-management/assign"],
};

export function canAccessRoute(role: string | undefined, pathname: string | null): boolean {
  if (role !== "ADMIN" && role !== "ORGANIZER") return false;
  const path = pathname || "";
  const within = (p: string) => path === p || path.startsWith(p + "/");
  if (ALLOWED_EXCEPTIONS[role].some(within)) return true;
  return !BLOCKED[role].some(within);
}
