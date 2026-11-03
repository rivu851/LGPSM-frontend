// The invitee Excel has columns that depend on the event (Additional Information, custom titles), so before choosing a file the
// organizer is reminded to start from this event's sample. Once reminded for a given set of columns it is not asked again in the
// same browser session; if the columns change, it asks again.
const key = (eventId: string, columns: string[]) => `lgpsm_sample_ok:${eventId}:${columns.join("|")}`;

export const sampleReminderAcknowledged = (eventId: string, columns: string[]): boolean => {
  try { return sessionStorage.getItem(key(eventId, columns)) === "1"; } catch { return false; }
};

export const acknowledgeSampleReminder = (eventId: string, columns: string[]): void => {
  try { sessionStorage.setItem(key(eventId, columns), "1"); } catch { /* the reminder simply shows again */ }
};
