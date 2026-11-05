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
  // "Configurations" renders permanently expanded with no collapse control, per the
  // Admin Figma flow-wise prototype — every screen in it shows the group pre-opened.
}

const BOTH: WebRole[] = ["ADMIN", "ORGANIZER"];

export const NAV_ENTRIES: NavEntry[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", href: "/dashboard", roles: BOTH },
  // ADMIN shell — Super Admin Figma: "Event" is its own expandable group with Add/List/Invitees/
  // Assign nested inside it, plus a separate standalone "Templates" link.
  {
    key: "event",
    label: "Event",
    icon: "event",
    roles: ["ADMIN"],
    children: [
      { key: "add-event", label: "Add New Event", href: "/events/add", roles: ["ADMIN"] },
      { key: "events-list", label: "Events", href: "/events", roles: ["ADMIN"] },
      { key: "add-invitees", label: "Add Invitees", href: "/events/select/invitees?from=sidebar", roles: ["ADMIN"] },
      { key: "assign-system-users", label: "Assign System Users", href: "/user-management/assign", roles: ["ADMIN"] },
      { key: "add-user", label: "Add User", href: "/user-management/add", roles: ["ADMIN"] },
      { key: "all-users", label: "All Users", href: "/user-management", roles: ["ADMIN"] },
    ],
  },
  { key: "templates", label: "Templates", icon: "templates", href: "/templates", roles: ["ADMIN"] },
  // ORGANIZER shell — Organiser Figma: "Configurations" is a collapsible group (chevron; collapsed on
  // pages outside it, e.g. Notification 222:34577) containing exactly Event Management / Invitees
  // Management / Templates. Reuses the existing event/invitee/template routes untouched.
  {
    key: "configurations",
    label: "Configurations",
    icon: "settings",
    roles: ["ORGANIZER"],
    children: [
      { key: "event-management", label: "Event Management", href: "/events", roles: ["ORGANIZER"] },
      { key: "invitees-management", label: "Invitees Management", href: "/events/select/invitees?from=sidebar", roles: ["ORGANIZER"] },
      // Hidden for now: organizers choose, upload and delete their templates in the template window while creating an event.
      // Uncomment to bring the page back.
      // { key: "org-templates", label: "Templates", href: "/templates", roles: ["ORGANIZER"] },
    ],
  },
  // ORGANIZER shell — flat top-level item (no chevron in Figma). The existing /user-management
  // page already has its own Add User button and Assign/Unassign modal, so the add/assign/
  // session-relationship flows are reached from inside that page, not as separate sidebar links.
  { key: "user-management", label: "User Management", icon: "account", href: "/user-management", roles: ["ORGANIZER"] },
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
  { key: "billing", label: "Billing", icon: "list-alt", href: "/billing", roles: ["ORGANIZER"] },
  { key: "reports", label: "Reports", icon: "chart", href: "/reports", roles: BOTH },
  // ADMIN shell — Super Admin Figma: Settings stays an expandable group.
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
    roles: ["ADMIN"],
    children: [
      { key: "template-settings", label: "Template Settings", href: "/settings/template", roles: ["ADMIN"] },
      { key: "event-settings", label: "Event Settings", href: "/settings/event", roles: ["ADMIN"] },
      { key: "price-rate-settings", label: "Price Rate Settings", href: "/settings/price-rate", roles: ["ADMIN"] },
      { key: "notification-settings", label: "Notification Settings", href: "/settings/notification", roles: ["ADMIN"] },
      { key: "account-settings", label: "Account Settings", href: "/settings/account", roles: ["ADMIN"] },
    ],
  },
  // ORGANIZER shell — Admin Figma: Settings is ONE flat item (no chevron). Points at the one
  // settings page that actually exists; the previous "Business Info" entry pointed at
  // /settings/business, which has no route or component in the codebase — not carried over
  // here (see chat report: flagged as a pending product requirement, not invented).
  // Organiser Figma "Settings" (222:34175) is the Logo Settings page; Account Settings stays reachable from the
  // header's account menu (/settings/account).
  { key: "settings", label: "Settings", icon: "settings-alert", href: "/settings/logo", roles: ["ORGANIZER"] },
];

export function navForRole(role: WebRole): NavEntry[] {
  return NAV_ENTRIES.filter((e) => e.roles.includes(role)).map((e) =>
    e.children ? { ...e, children: e.children.filter((c) => c.roles.includes(role)) } : e
  );
}

// Route prefixes each role must not open directly (deep links included).
// ORGANIZER now owns /user-management (User Management is a top-level Figma nav item, not an
// ADMIN-only route) — the existing /user-management/add and /user-management/assign sub-routes
// come along with it since they're reached from inside that page.
const BLOCKED: Record<WebRole, string[]> = {
  ADMIN: ["/billing", "/settings/logo"],
  ORGANIZER: [
    "/event-organizer",
    "/earnings",
    "/settings/price-rate",
    "/settings/template",
    "/settings/event",
    "/settings/notification",
  ],
};

export function canAccessRoute(role: string | undefined, pathname: string | null): boolean {
  if (role !== "ADMIN" && role !== "ORGANIZER") return false;
  const path = pathname || "";
  const within = (p: string) => path === p || path.startsWith(p + "/");
  return !BLOCKED[role].some(within);
}
