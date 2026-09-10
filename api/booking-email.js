/**
 * Sends the booking confirmation email.
 *
 * This is called by a Supabase Database Webhook whenever a row is written to
 * "bookings" — not by the browser. That matters: the trainee's browser never
 * holds the Resend API key, and a stranger cannot make the site send email,
 * because every request must carry the shared secret below.
 *
 * Required environment variables (set in Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY           your Resend key (starts "re_")
 *   BOOKING_WEBHOOK_SECRET   any long random string; must match the webhook header
 *   EMAIL_FROM               e.g.  GCTBM Lessons <noreply@gctbm.nl>
 *   EMAIL_BCC                optional — copy every confirmation to the club
 *
 * Public values, safe to fall back on:
 *   SUPABASE_URL / SUPABASE_ANON_KEY are only used to read course details,
 *   which are public anyway. No service-role key is used here on purpose.
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://apwdspqqgnxyvpcicfdp.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || "sb_publishable_-afSdJI7imtYCJIHhEgQoA_cy61cIMZ";

const PAYMENT_URL = process.env.PAYMENT_URL || "https://www.gctbm.nl/event.php?id=335";

const LEVEL_NAMES = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
const DAY_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

/* ------------------------------- helpers -------------------------------- */

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const fmtDate = (iso) => {
  const d = new Date(String(iso).slice(0, 10) + "T00:00:00Z");
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
};

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Supabase ${path} -> ${res.status}`);
  return res.json();
}

/* Calendar invite covering every lesson in the course. */
function buildICS({ summary, location, description, dates, time }) {
  const [start, end] = String(time || "18:00-19:00").split("-");
  const stamp = (dateISO, hm) =>
    String(dateISO).slice(0, 10).replace(/-/g, "") + "T" + String(hm).replace(":", "") + "00";

  let ics =
    "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GCTBM Lessons//Golf//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";
  for (const date of dates) {
    const uid = `${String(date).slice(0, 10)}-${Math.random().toString(36).slice(2, 10)}@gctbm-lessons`;
    ics +=
      "BEGIN:VEVENT\r\n" +
      `UID:${uid}\r\n` +
      `DTSTAMP:${stamp(date, "00:00")}\r\n` +
      `DTSTART:${stamp(date, start)}\r\n` +
      `DTEND:${stamp(date, end)}\r\n` +
      `SUMMARY:${summary}\r\n` +
      `LOCATION:${location}\r\n` +
      `DESCRIPTION:${description}\r\n` +
      "END:VEVENT\r\n";
  }
  return ics + "END:VCALENDAR\r\n";
}

/* ------------------------------ the email ------------------------------- */

function renderEmail({ booking, timeslot, location, isWaitlist, promoted }) {
  const level = LEVEL_NAMES[timeslot.level] || timeslot.level;
  const dates = timeslot.lesson_dates || [];
  const price = booking.price != null ? Number(booking.price).toFixed(2) : null;

  const heading = promoted
    ? "A place has opened up — you're in!"
    : isWaitlist
    ? "You're on the waiting list"
    : "Your booking is confirmed";

  const intro = promoted
    ? "Someone released their spot, so you've been moved off the waiting list and onto the course. The details are below."
    : isWaitlist
    ? "Thanks for signing up. The course is currently full, so we've added you to the waiting list and will email you the moment a place frees up. You don't need to pay anything yet."
    : "Thanks for booking with us. Everything you need is below — including your check-in code, which you'll use to track your attendance.";

  const row = (label, value) => `
    <tr>
      <td style="padding:9px 0;color:#64748b;font-size:14px;">${esc(label)}</td>
      <td style="padding:9px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right;">${esc(value)}</td>
    </tr>`;

  const lessonList = dates
    .map((d, i) => `<li style="margin:0 0 4px;">Lesson ${i + 1} — ${esc(fmtDate(d))}</li>`)
    .join("");

  const payButton =
    isWaitlist || promoted
      ? ""
      : `<tr><td align="center" style="padding:8px 0 26px;">
           <a href="${esc(PAYMENT_URL)}" style="display:inline-block;background:#2563EB;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:12px;">Complete your payment →</a>
           <div style="color:#94a3b8;font-size:12px;margin-top:10px;">Your place is held once payment is received.</div>
         </td></tr>`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#eff6ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 4px 18px rgba(29,78,216,0.10);">

        <tr><td style="background:linear-gradient(135deg,#2563EB,#0EA5E9);padding:26px 30px;">
          <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.02em;">⛳ GCTBM Lessons</div>
        </td></tr>

        <tr><td style="padding:30px 30px 6px;">
          <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#0f172a;">${esc(heading)}</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#475569;">Hi ${esc(booking.full_name)},<br>${esc(intro)}</p>
        </td></tr>

        <tr><td style="padding:0 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:6px 18px;">
            ${row("Course", level + " Golf")}
            ${row("Location", location.name)}
            ${row("Address", location.address)}
            ${row("Coach", location.coach)}
            ${row("Schedule", `${DAY_PLURAL[timeslot.day_of_week]} at ${timeslot.time_block}`)}
            ${dates.length ? row("Starts", fmtDate(dates[0])) : ""}
            ${row("Lessons", `${dates.length} in total`)}
            ${booking.handicap ? row("Handicap", booking.handicap) : ""}
            ${booking.invitee_name ? row("Bringing", booking.invitee_name) : ""}
            ${price ? row(booking.is_member ? "Total (member rate)" : "Total (non-member rate)", "€" + price) : ""}
          </table>
        </td></tr>

        ${
          booking.checkin_code
            ? `<tr><td style="padding:22px 30px 0;">
                 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(14,165,233,0.08);border:1px dashed #60A5FA;border-radius:12px;">
                   <tr><td align="center" style="padding:16px;">
                     <div style="font-size:11px;font-weight:800;letter-spacing:0.09em;text-transform:uppercase;color:#2563EB;">Your check-in code</div>
                     <div style="font-size:30px;font-weight:800;letter-spacing:0.24em;color:#1D4ED8;font-family:'Courier New',monospace;padding:6px 0 2px;">${esc(booking.checkin_code)}</div>
                     <div style="font-size:12px;color:#64748b;">Keep this safe — you'll need it with your email address to check in to lessons.</div>
                   </td></tr>
                 </table>
               </td></tr>`
            : ""
        }

        <tr><td style="padding:24px 30px 0;">
          <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#2563EB;margin-bottom:8px;">Your lesson dates</div>
          <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.6;">${lessonList}</ul>
          <p style="margin:14px 0 0;font-size:13px;color:#64748b;">A calendar file is attached — open it to add every lesson to your calendar in one go.</p>
        </td></tr>

        <tr><td style="padding:24px 30px 0;"></td></tr>
        ${payButton}

        <tr><td style="padding:18px 30px 28px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
            Questions about your lessons? Just reply to this email.<br>
            GCTBM Lessons · ${esc(location.name)} · ${esc(location.address)}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    heading,
    "",
    `Hi ${booking.full_name},`,
    intro,
    "",
    `Course:   ${level} Golf`,
    `Location: ${location.name}, ${location.address}`,
    `Coach:    ${location.coach}`,
    `Schedule: ${DAY_PLURAL[timeslot.day_of_week]} at ${timeslot.time_block}`,
    dates.length ? `Starts:   ${fmtDate(dates[0])}` : "",
    `Lessons:  ${dates.length}`,
    price ? `Total:    EUR ${price} (${booking.is_member ? "member" : "non-member"} rate)` : "",
    booking.checkin_code ? `\nYour check-in code: ${booking.checkin_code}` : "",
    "",
    "Lesson dates:",
    ...dates.map((d, i) => `  ${i + 1}. ${fmtDate(d)}`),
    isWaitlist || promoted ? "" : `\nComplete your payment: ${PAYMENT_URL}`,
  ]
    .filter(Boolean)
    .join("\n");

  const subject = promoted
    ? `A place opened up — ${level} Golf at ${location.name}`
    : isWaitlist
    ? `Waiting list confirmed — ${level} Golf at ${location.name}`
    : `Booking confirmed — ${level} Golf at ${location.name}`;

  return { subject, html, text };
}

/* ------------------------------- handler -------------------------------- */

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, reason: "method-not-allowed" });
  }

  const expected = process.env.BOOKING_WEBHOOK_SECRET;
  if (!expected) {
    console.error("BOOKING_WEBHOOK_SECRET is not configured");
    return res.status(500).json({ ok: false, reason: "not-configured" });
  }
  if (req.headers["x-webhook-secret"] !== expected) {
    console.warn("Rejected booking-email call with bad or missing secret");
    return res.status(401).json({ ok: false, reason: "unauthorised" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error("RESEND_API_KEY or EMAIL_FROM missing");
    return res.status(500).json({ ok: false, reason: "not-configured" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const booking = body.record;
    const before = body.old_record;

    if (!booking || !booking.email || !booking.timeslot_id) {
      return res.status(400).json({ ok: false, reason: "no-booking-in-payload" });
    }

    // Never email about a cancelled booking.
    if (booking.status === "cancelled") {
      return res.status(200).json({ ok: true, skipped: "cancelled" });
    }

    // On UPDATE, only email when someone is promoted off the waiting list.
    const promoted =
      body.type === "UPDATE" &&
      before &&
      before.status === "waitlist" &&
      booking.status === "booked";
    if (body.type === "UPDATE" && !promoted) {
      return res.status(200).json({ ok: true, skipped: "update-not-a-promotion" });
    }

    const [timeslots, locations] = await Promise.all([
      sb(`timeslots?id=eq.${encodeURIComponent(booking.timeslot_id)}&select=*`),
      sb(`locations?select=*`),
    ]);
    const timeslot = timeslots && timeslots[0];
    if (!timeslot) return res.status(404).json({ ok: false, reason: "timeslot-not-found" });

    const location =
      (locations || []).find((l) => l.id === timeslot.location_id) ||
      { name: "GCTBM", address: "", coach: "" };

    const isWaitlist = booking.status === "waitlist";
    const { subject, html, text } = renderEmail({ booking, timeslot, location, isWaitlist, promoted });

    const ics = buildICS({
      summary: `${LEVEL_NAMES[timeslot.level] || timeslot.level} Golf @ ${location.name}`,
      location: `${location.name} — ${location.address}`,
      description: `Coach: ${location.coach}. ${(timeslot.lesson_dates || []).length} lessons.`,
      dates: timeslot.lesson_dates || [],
      time: timeslot.time_block,
    });

    const payload = {
      from,
      to: [booking.email],
      subject,
      html,
      text,
      attachments: [
        { filename: "gctbm-lessons.ics", content: Buffer.from(ics, "utf8").toString("base64") },
      ],
    };
    if (process.env.EMAIL_BCC) payload.bcc = [process.env.EMAIL_BCC];
    if (process.env.EMAIL_REPLY_TO) payload.reply_to = process.env.EMAIL_REPLY_TO;

    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const result = await send.json().catch(() => ({}));
    if (!send.ok) {
      // Non-2xx tells Supabase the webhook failed, so it shows up in its log.
      console.error("Resend rejected the email:", send.status, JSON.stringify(result));
      return res.status(502).json({ ok: false, reason: "resend-error", status: send.status, detail: result });
    }

    console.log(`Sent ${promoted ? "promotion" : isWaitlist ? "waitlist" : "confirmation"} email to ${booking.email} (${result.id || "no id"})`);
    return res.status(200).json({ ok: true, id: result.id, kind: promoted ? "promoted" : isWaitlist ? "waitlist" : "confirmation" });
  } catch (err) {
    console.error("booking-email failed:", err && err.message);
    return res.status(500).json({ ok: false, reason: "exception", detail: String(err && err.message).slice(0, 200) });
  }
};
