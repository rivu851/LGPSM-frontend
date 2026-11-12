// The server answers 403 "User account is inactive." (code ACCOUNT_INACTIVE) to every request of an account that has been switched off,
// for example an organizer an administrator has just deactivated while they had the app open. Nothing the person does can succeed
// then, so the session has to end with an explanation. A 403 for any other reason (not allowed to do this one thing) must not.
export const ACCOUNT_INACTIVE_CODE = "ACCOUNT_INACTIVE";
export const ACCOUNT_INACTIVE_NOTICE = "inactive";
export const ACCOUNT_INACTIVE_MESSAGE = "Your account has been deactivated. Please contact your administrator.";

export function isAccountInactiveResponse(status: number | undefined, body: { code?: unknown; message?: unknown } | null | undefined): boolean {
  if (status !== 403 || !body) return false;
  if (body.code === ACCOUNT_INACTIVE_CODE) return true;
  // a server that has not been updated yet gives the message only
  return typeof body.message === "string" && /^user account is inactive\.?$/i.test(body.message.trim());
}
