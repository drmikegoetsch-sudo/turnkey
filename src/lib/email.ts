import "server-only";

// Transactional email via Resend. Plain fetch rather than the SDK — one
// endpoint, no dependency, works on any runtime.
//
// Nothing in here is allowed to break the thing that triggered it: a failed
// notification must never cost Turnkey the lead itself. Every function
// returns a result instead of throwing.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function notifyList(): string[] {
  return (process.env.LEAD_NOTIFY_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function send(input: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    return { ok: false, error: "Email is not configured (RESEND_API_KEY / RESEND_FROM)" };
  }
  if (input.to.length === 0) {
    return { ok: false, error: "No recipients configured (LEAD_NOTIFY_TO)" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        // Replying to the alert reaches the customer directly.
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: body?.message ?? `Resend returned ${res.status}`,
      };
    }
    return { ok: true, id: body?.id ?? "sent" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}

export type LeadNotification = {
  projectId: string;
  projectNumber: number | null;
  customerName: string;
  phone: string | null;
  email: string | null;
  address: string;
  projectType: string | null;
  budget: string | null;
  description: string | null;
  availability: string | null;
  referral: string | null;
  desiredStart: string | null;
  priorDeclineCount?: number;
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Everything needed to make the first phone call without opening the app.
export async function sendNewLeadNotification(
  lead: LeadNotification
): Promise<SendResult> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = `${base}/projects/${lead.projectId}`;
  const label = lead.projectType ? ` — ${lead.projectType}` : "";
  const subject = `🔔 New lead: ${lead.customerName}${label}`;

  const rows: [string, string | null][] = [
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["Address", lead.address],
    ["Project", lead.projectType],
    ["Budget", lead.budget],
    ["Wants to start", lead.desiredStart],
    ["Availability", lead.availability],
    ["Heard about us", lead.referral],
  ];

  const warning =
    lead.priorDeclineCount && lead.priorDeclineCount > 0
      ? `<p style="margin:0 0 16px;padding:12px 14px;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;color:#78350f;font-size:14px">
           ⚠ This customer has ${lead.priorDeclineCount} previously declined estimate${lead.priorDeclineCount === 1 ? "" : "s"} — check the history before scheduling a visit.
         </p>`
      : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#faf8f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f1d18">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;border:1px solid #e8e3d6">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a8578">New website lead</p>
    <h1 style="margin:0 0 6px;font-size:24px;line-height:1.25">${esc(lead.customerName)}</h1>
    ${lead.projectNumber ? `<p style="margin:0 0 18px;color:#8a8578;font-size:13px">TSN-${lead.projectNumber}</p>` : ""}
    ${warning}
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows
        .filter(([, v]) => !!v)
        .map(
          ([k, v]) => `<tr>
            <td style="padding:7px 0;color:#8a8578;width:130px;vertical-align:top">${k}</td>
            <td style="padding:7px 0;font-weight:500">${esc(v as string)}</td>
          </tr>`
        )
        .join("")}
    </table>
    ${
      lead.description
        ? `<div style="margin-top:18px;padding-top:16px;border-top:1px solid #eee">
             <p style="margin:0 0 6px;color:#8a8578;font-size:13px">In their words</p>
             <p style="margin:0;white-space:pre-wrap;font-size:14px;line-height:1.55">${esc(lead.description)}</p>
           </div>`
        : ""
    }
    <a href="${link}" style="display:inline-block;margin-top:22px;background:#b8a34a;color:#1f1d18;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;font-size:15px">Open in Command Center</a>
    <p style="margin:18px 0 0;color:#8a8578;font-size:12px">Reply to this email to respond to ${esc(lead.customerName)} directly. The website promises contact within 48 hours.</p>
  </div>
</body></html>`;

  const text = [
    `New website lead: ${lead.customerName}`,
    lead.projectNumber ? `TSN-${lead.projectNumber}` : null,
    lead.priorDeclineCount
      ? `WARNING: ${lead.priorDeclineCount} previously declined estimate(s)`
      : null,
    "",
    ...rows.filter(([, v]) => !!v).map(([k, v]) => `${k}: ${v}`),
    "",
    lead.description ? `In their words:\n${lead.description}` : null,
    "",
    link,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return send({
    to: notifyList(),
    subject,
    html,
    text,
    replyTo: lead.email ?? undefined,
  });
}
