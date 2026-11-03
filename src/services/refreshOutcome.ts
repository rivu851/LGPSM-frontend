// What a failed token refresh means. Only an answer from the server that the session is over may sign someone out. A network failure, a
// server error or rate limiting says nothing about the session, and signing out on those would throw people out of the app during an outage.
export type RefreshOutcome = "ok" | "ended" | "unavailable";

export function refreshOutcome(httpStatus: number | null, hasAccessToken: boolean): RefreshOutcome {
  if (httpStatus === null) return "unavailable";
  if (httpStatus >= 200 && httpStatus < 300) return hasAccessToken ? "ok" : "unavailable";
  return httpStatus === 400 || httpStatus === 401 || httpStatus === 403 ? "ended" : "unavailable";
}
