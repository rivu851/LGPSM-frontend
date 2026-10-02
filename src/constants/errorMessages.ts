/**
 * Shared user-facing error messages and fallback error text for LGPSM Frontend.
 *
 * Centralizes standard UI validation messages, fallback network error strings,
 * and check-in/QR user-facing notices.
 *
 * Note: Meaningful backend business-logic error messages returned dynamically
 * from API responses are preserved and displayed directly.
 */
export const ERROR_MESSAGES = {
  auth: {
    passwordsDoNotMatch: "Passwords do not match. Please try again.",
    passwordTooShort: "Password must be at least 8 characters long.",
    passwordResetMinLength: "Password must be at least 10 characters long.",
    invalidCredentials: "Invalid credentials. Please check your email and password.",
    sessionExpired: "Session expired. Please log in again.",
    unauthorized: "You must be signed in to access this page.",
    forbidden: "You do not have permission to perform this action.",
  },
  validation: {
    requiredField: "This field is required.",
    invalidEmail: "Please enter a valid email address.",
    invalidPhone: "Please enter a valid phone number.",
    invalidDate: "Please select a valid date.",
    invalidTimeRange: "Event end time must be after start time.",
  },
  checkIn: {
    invalidPass: "Invalid or unsupported QR invitation pass.",
    decodeFailed: "Could not read QR code from the uploaded image.",
    alreadyCheckedIn: "Invitee has already checked in for this session.",
    checkInFailed: "Check-in processing failed. Please try again.",
  },
  invitee: {
    importFailed: "Failed to import invitees file. Please verify the format.",
    noFileSelected: "Please select an Excel or CSV file to upload.",
    noInviteesSelected: "Please select at least one invitee to perform this action.",
  },
  network: {
    genericFailure: "An unexpected error occurred. Please try again.",
    connectionError: "Network error. Please check backend server connection.",
    serverError: "Server error occurred. Please try again later.",
  },
} as const;
