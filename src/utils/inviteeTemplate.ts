import { inviteeConfigFor, templateRow, type InviteeFieldConfig } from "@/utils/inviteeFields";

// Column layout accepted by POST /api/v1/events/:eventId/invitees/import.
// The columns come from the event's configuration (see inviteeFields.ts), the same list the manual Add Invitee form uses.
export type TemplateColumns = InviteeFieldConfig;
export const templateColumnsFor = inviteeConfigFor;

// Downloads an .xlsx template with the expected invitee columns; returns false if generation failed
export async function downloadInviteeTemplate(cols: TemplateColumns = {}): Promise<boolean> {
  try {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet([templateRow(cols)]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invitees");
    XLSX.writeFile(workbook, "LGPSM_Invitee_Sample_Template.xlsx");
    return true;
  } catch (err) {
    console.error("Error generating sample excel:", err);
    return false;
  }
}
