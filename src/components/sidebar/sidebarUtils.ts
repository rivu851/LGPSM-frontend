import { WebRole } from "./navConfig";

// Maps the current route to the sidebar entry that should be highlighted. ADMIN and ORGANIZER
// group the same underlying routes differently (Super Admin vs Admin Figma nav), so the mapping
// is role-aware: ADMIN keeps separate Add Event / Events / Add Invitees / Assign highlights,
// while ORGANIZER collapses those same routes into single Configurations children.
export function getActiveItemFromPathname(pathname: string, role: WebRole): string {
  if (!pathname) return "dashboard";
  const within = (p: string) => pathname === p || pathname.startsWith(p + "/");

  if (role === "ORGANIZER") {
    if (within("/events/select")) return "invitees-management";
    if (within("/events")) {
      if (pathname.includes("/invitees")) return "invitees-management";
      if (pathname.includes("/assign-users")) return "user-management";
      return "event-management";
    }
    if (within("/templates")) return "org-templates";
    if (within("/user-management")) return "user-management";
    if (within("/billing")) return "billing";
    if (within("/reports")) return "reports";
    if (within("/settings")) return "settings";
    if (within("/notification") || within("/notifications")) return "notification";
    return "dashboard";
  }

  // ADMIN
  if (within("/events/add")) return "add-event";
  if (within("/events/select")) return "add-invitees";
  if (within("/events")) return "events-list";
  if (within("/user-management/assign")) return "assign-system-users";
  if (within("/user-management/add")) return "add-user";
  if (within("/user-management")) return "all-users";
  if (within("/event-organizer/add")) return "add-organizer";
  if (within("/event-organizer")) return "all-organizers";
  if (within("/templates")) return "templates";
  if (within("/earnings")) return "earnings";
  if (within("/billing")) return "billing";
  if (within("/reports")) return "reports";
  if (within("/settings/template")) return "template-settings";
  if (within("/settings/event")) return "event-settings";
  if (within("/settings/price-rate")) return "price-rate-settings";
  if (within("/settings/notification")) return "notification-settings";
  if (within("/settings/account")) return "account-settings";
  if (within("/settings")) return "account-settings";
  if (within("/notification") || within("/notifications")) return "notification";
  return "dashboard";
}
