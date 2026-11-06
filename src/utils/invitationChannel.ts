/** How an organizer sends invitations: asked at signup (and when an admin adds an organizer); the send screen starts with it. */
export type InvitationChannel = "EMAIL" | "WHATSAPP" | "BOTH";

export const INVITATION_CHANNEL_OPTIONS: { value: InvitationChannel; label: string; hint: string }[] = [
  { value: "BOTH", label: "Email & WhatsApp", hint: "Each guest gets both" },
  { value: "EMAIL", label: "Email", hint: "Invitations by email only" },
  { value: "WHATSAPP", label: "WhatsApp", hint: "Invitations on WhatsApp only" },
];

export const asInvitationChannel = (v: unknown): InvitationChannel => (v === "EMAIL" || v === "WHATSAPP" || v === "BOTH" ? v : "BOTH");
