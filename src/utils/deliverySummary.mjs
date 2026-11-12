// Turns per-guest send/resend outcomes into the message shown on the invitees page.
// "All" delivery (BOTH) reports each channel separately; guests with no usable contact come back as SKIPPED.
export function summarizeDelivery(results, verb, channel) {
  const sent = results.filter((r) => r.status === "SENT").length;
  const failed = results.filter((r) => r.status === "FAILED");
  const alreadyInvited = results.filter((r) => r.status === "SKIPPED" && r.failureReason === "Already invited").length;
  const skipped = results.filter((r) => r.status === "SKIPPED").length - alreadyInvited;
  // Guests who already have their invitation are left alone: send only reaches new guests, Resend is the explicit way to repeat
  const skippedNote = [
    alreadyInvited ? `${alreadyInvited} already invited (not sent again)` : "",
    skipped ? `${skipped} skipped (no email or WhatsApp number)` : "",
  ].filter(Boolean).map((t) => `, ${t}`).join("");
  if (results.length === 0) return { type: "error", message: `Nothing was ${verb}.` };
  if (channel === "BOTH") {
    const channelCounts = (key) => ({
      sent: results.filter((r) => r[key] === "SENT").length,
      failed: results.filter((r) => r[key] === "FAILED").length,
    });
    const email = channelCounts("emailStatus");
    const whatsapp = channelCounts("whatsappStatus");
    // A guest counts as "sent" as soon as one channel reached them; a channel that failed for some or all guests is still a failure the
    // organizer has to see, so it can never be reported as plain success
    const channelFailures = [email.failed ? `${email.failed} by email` : "", whatsapp.failed ? `${whatsapp.failed} on WhatsApp` : ""].filter(Boolean);
    const channelNote = channelFailures.length ? ` Not delivered: ${channelFailures.join(", ")}.` : "";
    return {
      type: failed.length ? (sent ? "info" : "error") : channelFailures.length || skipped || alreadyInvited ? "info" : "success",
      message: `${sent} ${verb}, ${failed.length} failed${skippedNote}.${channelNote}`,
      details: [
        `Email: ${email.sent} sent, ${email.failed} failed, ${Math.max(0, results.length - email.sent - email.failed)} skipped`,
        `WhatsApp: ${whatsapp.sent} sent, ${whatsapp.failed} failed, ${Math.max(0, results.length - whatsapp.sent - whatsapp.failed)} skipped`,
        ...new Set(failed.map((f) => f.failureReason).filter(Boolean)),
      ],
    };
  }
  if (failed.length === 0) return { type: skipped || alreadyInvited ? "info" : "success", message: `${sent} invitation(s) ${verb}${skippedNote}.` };
  return { type: "error", message: `${sent} ${verb}, ${failed.length} failed${skippedNote}.`, details: [...new Set(failed.map((f) => f.failureReason || "Unknown error"))] };
}
