# SwingMaster — Golf Lesson Booking

A single-page web app for booking golf lessons at GCTBM. Built for a non-technical owner: just open `index.html` in any modern browser and it works — no build step, no server, no database.

## Features

- **5-step booking flow** matching the SwingMaster design (Level → Location → Timeslot → Confirm & Pay → Success)
- **3 levels** (Beginner / Intermediate / Advanced)
- **2 locations** with dedicated coaches (Tongelreep / Gendersteyn)
- **Configurable timeslots** per location, day, time, and level
- **Waitlist** — when a slot is full, trainees are added to a waiting list (admins can promote them)
- **Customizable 12-lesson schedule** — pick any dates per course
- **Two seasons** (Summer / Winter) with their own prices and timeslot configurations
- **Calendar overview** of the entire season
- **Add to Calendar** (.ics file) on booking — works with Google Calendar, Apple Calendar, Outlook
- **Pre-lesson check-in** — trainees enter their email and track attended lessons
- **Admin console**
  - Manage timeslots per location (different configs for Tongelreep vs Gendersteyn)
  - View trainees & attendance per timeslot
  - Manage seasons (active season, price, start date)
  - Manage locations & coaches
- **Glassmorphism purple theme** matching the provided designs

## Running it

Just open `index.html` in your browser. That's it.

Recommended: use **Chrome**, **Edge**, **Firefox** or **Safari**. All data is saved automatically in your browser's local storage.

### Optional: serve over HTTP

If you'd rather serve it (some browsers restrict `file://` for certain features):

```bash
# Python 3 (any OS with Python installed)
python -m http.server 8000

# Or with Node (if installed)
npx serve .
```

Then open `http://localhost:8000`.

## Deploy

Because it's a static site, you can drop it on:

- **GitHub Pages** (Settings → Pages → Source: `main` branch → save)
- **Netlify** (drag the folder onto netlify.com)
- **Vercel** (`vercel deploy`)
- Any static host

## File layout

```
GCTBM-lessonswebsite/
├── index.html      Bootstraps React via CDN
├── styles.css      All styling, including the glassmorphism look
├── app.js          The whole React app (booking + admin + calendar + check-in)
└── README.md       This file
```

## Resetting demo data

Open your browser's DevTools console and run:

```js
localStorage.removeItem("swingmaster.state.v1"); location.reload();
```

This resets seasons, locations, timeslots, and bookings to the defaults shown in the screenshots.

## Where to plug in payment

In `app.js`, search for "Go to Payment". The button currently shows a placeholder alert. Replace it with a redirect to your real payment URL:

```js
window.location.href = "https://yourgolfclub.example.com/pay?booking=" + draft.bookingId;
```
