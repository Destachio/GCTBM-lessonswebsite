# Turning on booking confirmation emails

Roughly 20 minutes, most of it waiting for DNS. Nothing here needs coding.

When it's done, anyone who books gets an email with their course details, their
check-in code, all their lesson dates, a calendar attachment, and a payment button.
People added to the waiting list get a different wording, and if you later promote
someone off the waiting list they get a "a place opened up" email.

**Never paste your API key into a chat, an email, or a file in this repo.**
It goes straight into Vercel's settings screen and nowhere else.

---

## Step 1 — Create a Resend account (3 min)

1. Go to **https://resend.com** → **Sign up** (GitHub login is fine).
2. Free plan: 3,000 emails a month, 100 a day. Plenty — you'd need ~100 bookings
   a day to exceed it.

---

## Step 2 — Verify gctbm.nl (5 min + DNS wait)

1. In Resend, go to **Domains** → **Add Domain**.
2. Enter **`gctbm.nl`**.
3. Region: choose **EU (Ireland)** — keeps trainee email addresses inside the EU,
   which is the right default for GDPR.
4. Resend shows a list of DNS records — usually three: one `MX` and two `TXT`
   (these are SPF and DKIM, which prove you're allowed to send as gctbm.nl).
5. Add those records wherever gctbm.nl's DNS is managed (the same place the
   website's domain is configured).
6. Back in Resend, press **Verify**. It's usually a few minutes; it can take a
   couple of hours. The domain shows **Verified** with a green tick when ready.

> Sending won't work until this says Verified. That's the whole point of the step —
> without it, mail from your site would land in spam.

---

## Step 3 — Create the API key (1 min)

1. In Resend: **API Keys** → **Create API Key**.
2. Name it `gctbm-website`, permission **Sending access**.
3. Copy the key (starts `re_`). **This is the one secret here — treat it like a
   password.** You'll paste it into Vercel in the next step and never need it again.

---

## Step 4 — Make up a webhook secret (1 min)

This is a password shared between Supabase and the website, so nobody else can
make your site send emails.

Invent a long random string — mash the keyboard, 30+ characters, letters and
numbers. Example shape: `k7Fq2mZx9pLw4rT8vN3sJ6hB1dY5cA0eGu`

Write it down; you'll paste it in twice (Step 5 and Step 6).

---

## Step 5 — Add the settings to Vercel (3 min)

1. Go to **https://vercel.com** → your **gctbm-lessonswebsite** project.
2. **Settings** → **Environment Variables**.
3. Add each of these, leaving all three environment boxes (Production, Preview,
   Development) ticked:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | the `re_...` key from Step 3 |
| `BOOKING_WEBHOOK_SECRET` | the random string from Step 4 |
| `EMAIL_FROM` | `GCTBM Lessons <noreply@gctbm.nl>` |
| `EMAIL_REPLY_TO` | an address you actually read, e.g. `info@gctbm.nl` |
| `EMAIL_BCC` | *(optional)* an address that gets a copy of every confirmation |

4. Go to the **Deployments** tab → the newest deployment → **⋯** → **Redeploy**.
   Environment variables only reach the site on the next deploy.

---

## Step 6 — Point Supabase at it (4 min)

1. Open your Supabase project → **Database** → **Webhooks** → **Create a new hook**.
2. Fill in:
   - **Name**: `booking-confirmation-email`
   - **Table**: `bookings`
   - **Events**: tick **Insert** *and* **Update**
   - **Type**: **HTTP Request**
   - **Method**: **POST**
   - **URL**: `https://gctbm-lessonswebsite.vercel.app/api/booking-email`
3. Under **HTTP Headers**, add one header:
   - Name: `x-webhook-secret`
   - Value: the same random string from Step 4
4. **Create webhook**.

Ticking Update as well as Insert is what makes the "a place opened up" email work
when you promote someone off the waiting list.

---

## Step 7 — Test it

Make a real booking on the site using your own email address.

The email should arrive within a few seconds. If it doesn't:

| Where to look | What it tells you |
|---|---|
| **Resend → Emails** | Whether the email was accepted, delivered, or bounced |
| **Supabase → Database → Webhooks → the hook → Logs** | Whether Supabase called the site, and the response it got |
| **Vercel → your project → Logs** | The error message from the sending code itself |

Common causes:

- **Nothing in Resend at all** → the webhook isn't firing, or the secret doesn't
  match. A `401` in the Supabase webhook log means the two secrets differ.
- **`403` or "domain not verified"** → Step 2 hasn't finished; check Resend → Domains.
- **`500 not-configured`** → a variable is missing in Vercel, or you didn't redeploy
  after adding them (Step 5.4).
- **Email in spam** → normal for the first few from a new domain; it settles as you
  send more. Make sure the DNS records from Step 2 are all present.

---

## Turning it off

Delete the webhook in Supabase (Step 6). Bookings keep working; only the emails stop.

## Changing what the email says

The wording and layout live in `api/booking-email.js`. Ask Claude to change it —
it's HTML, and easy to get subtly wrong in email clients by hand.
