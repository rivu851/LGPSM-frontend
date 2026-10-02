/**
 * Shared input placeholder constants for LGPSM Frontend components.
 *
 * Centralizes UI input placeholder strings for consistent form presentation
 * across authentication, event management, invitee imports, user assignments,
 * and search fields.
 */
export const INPUT_PLACEHOLDERS = {
  auth: {
    name: "Enter your name",
    email: "hello@example.com",
    phone: "Enter phone number",
    password: "Type your password",
    confirmPassword: "Type password again",
    resetCode: "Paste the code from your email",
  },
  event: {
    title: "e.g., Annual International Tech Conference 2026",
    description: "Briefly describe your event schedule, highlights, or instructions...",
    location: "Enter venue address or online link",
    contactNumber: "Enter contact phone number",
    search: "Search events by title or location...",
  },
  invitee: {
    name: "Enter guest full name",
    email: "guest@example.com",
    phone: "Enter guest phone number",
    companyName: "Enter company name",
    search: "Search invitees by name, email, or mobile...",
  },
  user: {
    fullName: "Enter user full name",
    email: "user@example.com",
    phone: "Enter user phone number",
    search: "Search users by name or email...",
  },
  session: {
    name: "e.g., Morning Keynote & Welcome Session",
    search: "Search sessions...",
  },
  template: {
    search: "Search templates by name...",
  },
} as const;
