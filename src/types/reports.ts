export interface InviteeLog {
  id: string;
  name: string;
  mobile: string;
  invitationStatus: "Sent" | "Pending" | "Failed";
  /** "Not requested" when the event does not use RSVP (shown as the "--" placeholder) */
  rsvpStatus: "Accepted" | "Pending" | "Declined" | "Not requested";
  checkInStatus: "Checked-in" | "Not Checked-in" | "Partially Checked-in";
  lastCheckInTime: string;
  // sessionId -> whether the invitee checked in to that session
  sessionCheckIns: Record<string, boolean>;
}

export interface ReportSessionColumn {
  id: string;
  name: string;
}

export interface AccessLog {
  id: string;
  userType: string;
  dateTime: string;
  action: string;
  status: "Successful" | "failed";
  /** the organizer the action belongs to: organisation name (or their name), and their ID */
  organizerName: string;
  organizerCode: string;
}

export interface SessionReport {
  id: number;
  name: string;
  dateTime: string;
  invitees: number;
  attendees: number;
  accessControl: string;
  systemUsers: string;
}
