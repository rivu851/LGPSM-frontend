import { sessionService } from "@/services/sessionService";
import { inviteeService } from "@/services/inviteeService";
import { DraftSession, EventDraft, sessionToRequest } from "./eventDraft";
import { SessionInviteeFile } from "./Step3Sessions";

function sessionChanged(a: DraftSession, b: DraftSession, isPrimary: boolean): boolean {
  return (
    a.name.trim() !== b.name.trim() ||
    new Date(a.start).getTime() !== new Date(b.start).getTime() ||
    new Date(a.end).getTime() !== new Date(b.end).getTime() ||
    a.accessControl !== b.accessControl ||
    (isPrimary && a.validateAgainstOtherSessions !== b.validateAgainstOtherSessions) ||
    a.inviteeSource !== b.inviteeSource ||
    a.sourceSessionKey !== b.sourceSessionKey
  );
}

// Saves sessions (in order, so sessions that are copied from exist before the sessions copying them)
// and then each session's invitee sheet. Returns human-readable problems so partial failures are reported.
export async function persistSessionsAndInvitees(
  eventId: string,
  draft: EventDraft,
  sessionFiles: Record<string, SessionInviteeFile | undefined>,
  originalSessions: DraftSession[] = []
): Promise<string[]> {
  const problems: string[] = [];
  const backendIds = new Map<string, string>();
  draft.sessions.forEach((s) => s.backendId && backendIds.set(s.key, s.backendId));
  const originalByBackendId = new Map(originalSessions.map((o) => [o.backendId, o]));
  // Source links on originals use the originals' keys; translate them through backend ids
  const originalKeyToBackend = new Map(originalSessions.map((o) => [o.key, o.backendId]));

  for (const [index, session] of draft.sessions.entries()) {
    const request = sessionToRequest(session, index === 0, (key) => backendIds.get(key));
    if (session.inviteeSource === "COPY_SESSION" && !request.sourceSessionId) {
      problems.push(`Session "${session.name}": the session it copies invitees from was not saved`);
    }
    if (session.backendId) {
      const original = originalByBackendId.get(session.backendId);
      const comparable = original && {
        ...original,
        sourceSessionKey: original.sourceSessionKey
          ? draft.sessions.find((s) => s.backendId === originalKeyToBackend.get(original.sourceSessionKey!))?.key ?? null
          : null,
      };
      if (comparable && !sessionChanged(comparable, session, index === 0)) continue;
      const res = await sessionService.updateSession(session.backendId, request);
      if (!res.success) problems.push(`Session "${session.name}": ${res.message || "could not be updated"}`);
    } else {
      const res = await sessionService.createSession(eventId, request);
      const createdId = res.data?._id || res.data?.id;
      if (res.success && createdId) backendIds.set(session.key, createdId);
      else problems.push(`Session "${session.name}": ${res.message || "could not be created"}`);
    }
  }

  if (draft.skipInvitees) return problems;

  for (const session of draft.sessions) {
    const fileInfo = sessionFiles[session.key];
    if (!fileInfo || session.inviteeSource === "COPY_SESSION") continue;
    const sessionId = backendIds.get(session.key);
    if (!sessionId) {
      problems.push(`Invitee file "${fileInfo.name}" was not imported because session "${session.name}" was not saved`);
      continue;
    }
    const res = await inviteeService.importExcel(eventId, fileInfo.file, sessionId);
    if (!res.success) {
      problems.push(`Invitee file "${fileInfo.name}": ${res.message || "import failed"}`);
    } else if (res.data && res.data.rejected > 0) {
      problems.push(`Invitee file "${fileInfo.name}": ${res.data.rejected} row(s) rejected`);
    }
  }

  return problems;
}
