// Maps the current route to the sidebar entry that should be highlighted.
// Screens reached from inside an event (its sessions, invitees and system-user tabs) stay under
// "Events"; "Add Invitees" / "Assign System Users" only light up for their own standalone flows.
export function getActiveItemFromPathname(pathname: string): string {
  if (!pathname) return "dashboard";
  const within = (p: string) => pathname === p || pathname.startsWith(p + "/");

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
  if (within("/settings/business")) return "business-settings";
  if (within("/settings/account")) return "account-settings";
  if (within("/settings")) return "account-settings";
  if (within("/notification") || within("/notifications")) return "notification";
  return "dashboard";
}
