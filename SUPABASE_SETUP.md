# Supabase setup — 10-minute walkthrough

The site stores trainee data (names, emails, phones) in Supabase instead of the browser. This guide walks you through the one-time setup.

You will not write any code. Every step is a click or a copy-paste.

---

## Step 1 — Create the Supabase project (3 min)

1. Go to **https://supabase.com** and sign in (Google or GitHub login works).
2. Click **New project**.
3. Fill in:
   - **Name**: `gctbm-lessons`
   - **Database password**: click the dice to generate a strong one. **Save this somewhere safe** — you may need it for backups, but the app itself doesn't use it.
   - **Region**: pick **West Europe (Ireland)** or **Central EU (Frankfurt)** — keeps trainee data in the EU for GDPR.
   - **Plan**: Free.
4. Click **Create new project**. Wait ~1 minute for it to provision.

---

## Step 2 — Run the database setup script (1 min)

1. In your new project, click the **SQL Editor** icon in the left sidebar (it looks like `</>`).
2. Click **+ New query**.
3. Open the file `supabase-schema.sql` from this repo. Copy its **entire contents**.
4. Paste into the Supabase SQL Editor.
5. Click the green **Run** button (bottom right) — or press `Ctrl+Enter`.
6. You should see "Success. No rows returned." That's good. The script created 4 tables, security rules, and seeded the demo data.

Quick check: still in the SQL Editor, run this to confirm:
```sql
select * from get_timeslot_availability('summer-2024');
```
You should see 7 rows — one per timeslot.

---

## Step 3 — Create the admin login (1 min)

1. In the left sidebar, click **Authentication** → **Users**.
2. Click **Add user** → **Create new user**.
3. Email: `admin@gctbm.nl` (or whatever you want — this is your admin login)
4. Password: pick a strong one. **Save it** — this is how you'll log into the admin panel.
5. Toggle **Auto Confirm User** to ON, then click **Create user**.

That's your only admin account. You can add more later the same way.

---

## Step 4 — Copy your project credentials (1 min)

1. Left sidebar → **Project Settings** (gear icon, bottom) → **API**.
2. You'll see two things to copy:
   - **Project URL** — looks like `https://xxxxxxxxxxxxxx.supabase.co`
   - **Project API keys → anon public** — a long string starting with `eyJ...`

   **The anon key is safe to publish.** It's designed to go in client code. The database is protected by the security rules in the SQL script, not by hiding this key.

   ⚠️ **Don't copy the `service_role` key.** That one is a master key and must never go into the website.

---

## Step 5 — Hand the credentials to Claude

Paste the **Project URL** and **anon key** back in chat. I'll plug them into `config.js`, push the change, and your app will be live on Supabase within minutes.

You can also paste them directly into `GCTBM-lessonswebsite/config.js` yourself — there's a placeholder there waiting.

---

## After it's live

- **Admin panel**: clicking the lock icon (top right) now prompts for the email + password from Step 3.
- **Existing localStorage data**: anyone who used the demo site before this migration has data in their own browser. That data is **not** migrated — it'll be ignored. New bookings flow into Supabase.
- **Daily backups**: Supabase backs up your database automatically on the free tier (7-day retention).
- **GDPR**: under "Authentication → Users" you can delete users; under "Table Editor → bookings" you can delete individual booking rows on request.
- **Quotas (free tier)**: 500 MB database, 50,000 monthly active users, 5 GB egress. Plenty for a golf school.

---

## If you get stuck

Common issues:
- **"relation does not exist"** when running the SQL → you're in the wrong project or pasted only part of the file. Re-paste the whole thing.
- **The site shows "Loading…" forever after Phase B** → the URL or anon key in `config.js` is wrong, or the Supabase project is paused (it pauses after 7 days of inactivity on free tier — click "Restore" in the dashboard).
- **Admin login fails** → check that Step 3's user has "email confirmed" — toggle it on under Auth → Users.
