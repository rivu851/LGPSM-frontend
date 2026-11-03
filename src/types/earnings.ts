export interface EarningsRecord {
  id: string;
  organizer: string;
  eventName: string;
  dateOfPayment: string;
  invites: number;
  /** null when no rate was in force for this event */
  rate: number | null;
  amount: number;
  // ISO start of the event, used for the date-range filter
  eventStart?: string;
}
