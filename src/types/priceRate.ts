export interface PriceHistoryRecord {
  id: string;
  dateTime: string;
  previousRate: number | null;
  newRate: number;
  changeType: "Increase" | "Decrease";
  status: "Active" | "Suspended";
}
